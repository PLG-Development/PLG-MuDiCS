package web

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image/color"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	shared "plg-mudics/shared"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/micmonay/keybd_event"
	"github.com/skip2/go-qrcode"

	"plg-mudics/display/pkg"
)

var version string
var sseConnection chan string
var supportedExtensions = map[string]bool{
	".mp4":  true,
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".pptx": true,
	".odp":  true,
}
var badRequestDescription string = "Request uses invalid JSON syntax or does not follow request schema."

func StartWebServer(v string, port string) {
	version = v

	e := echo.New()

	e.GET("/", indexRoute)
	e.GET("/sse", sseRoute)
	e.GET("/splash", func(ctx echo.Context) error {
		return ctx.HTML(http.StatusOK, shared.SplashScreenTemplate)
	})
	e.GET("/qr", qrRoute)

	staticGroup := e.Group("/static")
	staticGroup.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Filesystem: http.FS(StaticDirFS),
		HTML5:      true,
	}))

	apiGroup := e.Group("/api")
	apiGroup.Use(middleware.CORS())
	apiGroup.GET("/ping", pingRoute)
	apiGroup.PATCH("/shellCommand", shellCommandRoute)
	apiGroup.PATCH("/keyboardInput", keyboardInputRoute)
	apiGroup.PATCH("/showHTML", showHTMLRoute)
	apiGroup.PATCH("/takeScreenshot", takeScreenshotRoute)

	fileGroup := apiGroup.Group("/file")
	fileGroup.Use(extractFilePathMiddleware)
	fileGroup.POST("/:path", uploadFileRoute)
	fileGroup.GET("/:path", downloadFileRoute)
	fileGroup.PATCH("/:path", openFileRoute)
	fileGroup.GET("/preview/:path", previewRoute)

	err := e.Start(":" + port)
	if err != nil {
		slog.Error("Failed to start server", "error", err)
	}
}

func indexRoute(ctx echo.Context) error {
	return indexTemplate().Render(ctx.Request().Context(), ctx.Response().Writer)
}

func sseRoute(ctx echo.Context) error {
	slog.Info("SSE client connected")

	w := ctx.Response()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher, _ := w.Writer.(http.Flusher)

	sseConnection = make(chan string)

	// init display
	ip, err := pkg.GetDeviceIp()
	if err != nil {
		slog.Error("Failed to get device IP address", "error", err)
	}
	mac, err := pkg.GetDeviceMac()
	if err != nil {
		slog.Error("Failed to get device MAC address", "error", err)
	}
	showQR := !isPortFree(8080)
	var status bytes.Buffer
	deviceInfoTemplate(ip, mac, showQR).Render(context.Background(), &status)
	connectedEvent := Event{
		Data: status.Bytes(),
	}
	connectedEvent.MarshalTo(w)
	flusher.Flush()

	for {
		select {
		case <-ctx.Request().Context().Done():
			slog.Info("SSE client disconnected")
			sseConnection = nil
			return nil

		case event := <-sseConnection:
			rawEvent := Event{
				Event: []byte(""),
				Data:  []byte(event),
			}

			if err := rawEvent.MarshalTo(w); err != nil {
				slog.Warn("Error writing to client", "error", err)
				return err
			}
			flusher.Flush()
		}
	}
}

func qrRoute(c echo.Context) error {
	data := c.QueryParam("data")
	if data == "" {
		return c.String(http.StatusBadRequest, "missing data")
	}

	qr, err := qrcode.New(data, qrcode.Medium)
	if err != nil {
		return c.String(http.StatusInternalServerError, "could not generate qr")
	}

	qr.DisableBorder = true
	qr.ForegroundColor = color.RGBA{R: 0x1c, G: 0x19, B: 0x17, A: 0xff}
	qr.BackgroundColor = color.RGBA{R: 0xe7, G: 0xe5, B: 0xe4, A: 0xff}

	png, err := qr.PNG(-1)
	if err != nil {
		return c.String(http.StatusInternalServerError, "could not encode png")
	}

	return c.Blob(http.StatusOK, "image/png", png)
}

func extractFilePathMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		pathParam := ctx.Param("path")
		fullPath, exists, err := pkg.ResolveStorageFilePath(pathParam)
		if err != nil {
			slog.Warn("Failed to validate file path", "path", pathParam, "error", err)
			return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: "Invalid file path"})
		}
		ctx.Set("fullPath", fullPath)
		ctx.Set("fileExists", exists)
		return next(ctx)
	}
}

func shellCommandRoute(ctx echo.Context) error {
	var commandInput struct {
		Command string `json:"command"`
	}
	if err := ctx.Bind(&commandInput); err != nil {
		slog.Error("Failed to parse shell command", "error", err)
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: badRequestDescription})
	}

	cmd := exec.Command("bash", "-c", commandInput.Command)
	storagePath, err := pkg.GetStoragePath()
	if err != nil {
		slog.Error("Failed to get storage path", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to get storage path"})
	}
	cmd.Dir = storagePath

	commandOutput := shared.RunShellCommand(cmd)
	if commandOutput.ExitCode != 0 {
		slog.Error("Shell command execution error", "error", commandOutput.Stderr)
	}

	slog.Info("Shell command executed successfully", "command", commandInput.Command, "exitCode", commandOutput.ExitCode)
	return ctx.JSON(http.StatusOK, commandOutput)
}

func keyboardInputRoute(ctx echo.Context) error {
	var request struct {
		Key string `json:"key"`
	}
	if err := ctx.Bind(&request); err != nil {
		slog.Error("Failed to parse keyboard input", "error", err)
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: badRequestDescription})
	}

	code, ok := pkg.KeyboardEvents[request.Key]
	if !ok {
		slog.Error("Unsupported key", "key", request.Key)
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: fmt.Sprintf("Unsupported key: %s", request.Key)})
	}

	err := pkg.KeyboardInput(code)
	if err != nil {
		slog.Error("Failed to send keyboard input", "key", request.Key, "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to send keyboard input"})
	}

	slog.Info("Keyboard input sent", "key", request.Key)
	return ctx.JSON(http.StatusOK, struct{}{})
}

func uploadFileRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)

	// Ensure parent directories exist
	if err := os.MkdirAll(filepath.Dir(fullPath), os.ModePerm); err != nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to prepare storage directory"})
	}

	if ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusConflict, shared.ErrorResponse{Description: "File already exists"})
	}

	data, err := io.ReadAll(ctx.Request().Body)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: badRequestDescription})
	}

	if err := os.WriteFile(fullPath, data, os.ModePerm); err != nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to save file"})
	}

	slog.Info("File uploaded successfully", "path", fullPath)
	return ctx.JSON(http.StatusOK, struct{}{})
}

func downloadFileRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)

	if !ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusNotFound, shared.ErrorResponse{Description: "File not found"})
	}

	err := ctx.File(fullPath)
	if err != nil {
		slog.Error("Failed to serve file", "file", fullPath, "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to serve file"})
	}

	slog.Info("File downloaded successfully", "path", fullPath)
	return nil
}

func openFileRoute(ctx echo.Context) error {
	pathParam := ctx.Param("path")
	fullPath := ctx.Get("fullPath").(string)

	if !ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusNotFound, shared.ErrorResponse{Description: "File not found"})
	}

	if sseConnection == nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Cant connect to display browser client"})
	}

	err := resetView()
	if err != nil {
		slog.Error("Failed to reset view", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to reset view"})
	}

	ext := strings.ToLower(filepath.Ext(fullPath))
	switch ext {
	case ".mp4":
		var templateBuffer bytes.Buffer
		videoTemplate(pathParam).Render(context.Background(), &templateBuffer)

		sseConnection <- templateBuffer.String()
	case ".jpg", ".jpeg", ".png", ".gif":
		var templateBuffer bytes.Buffer
		imageTemplate(pathParam).Render(context.Background(), &templateBuffer)
		sseConnection <- templateBuffer.String()
	case ".pptx", ".odp":
		err := pkg.OpenPresentation(fullPath)
		if err != nil {
			slog.Error("Failed to open presentation", "file", pathParam, "error", err)
			return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to open presentation"})
		}
	default:
		return ctx.JSON(http.StatusUnsupportedMediaType, shared.ErrorResponse{Description: "Unsupported file type"})
	}

	slog.Info("Successfully run file", "file", pathParam)
	return ctx.JSON(http.StatusOK, struct{}{})
}

func showHTMLRoute(ctx echo.Context) error {
	var request struct {
		HTML string `json:"html"`
	}
	if err := ctx.Bind(&request); err != nil {
		slog.Error("Failed to parse request", "error", err)
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: badRequestDescription})
	}

	err := resetView()
	if err != nil {
		slog.Error("Failed to reset view", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to reset view"})
	}

	sseConnection <- request.HTML

	slog.Info("HTML content sent to client")
	return ctx.JSON(http.StatusOK, struct{}{})
}

func pingRoute(ctx echo.Context) error {
	return ctx.JSON(http.StatusOK, struct {
		Version string `json:"version"`
	}{Version: version})
}

func takeScreenshotRoute(ctx echo.Context) error {
	var err error

	screenshotPath, err := pkg.TakeScreenshot()
	if err != nil {
		slog.Error("Failed to take screenshot", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to take screenshot"})
	}

	err = ctx.File(screenshotPath)
	if err != nil {
		slog.Error("Failed to serve file", "file", screenshotPath, "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to serve file"})
	}

	return nil
}

func previewRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)
	exists := ctx.Get("fileExists").(bool)
	if !exists {
		return ctx.JSON(http.StatusNotFound, shared.ErrorResponse{Description: "File not found"})
	}

	outputFilePath, err := pkg.GenerateFilePreview(fullPath)
	if err != nil {
		slog.Error("Failed to generate preview", "file", fullPath, "error", err)
		if errors.Is(err, pkg.ErrFileTypePreviewNotSupported) {
			return ctx.JSON(http.StatusUnsupportedMediaType, shared.ErrorResponse{Description: "File type not supported for preview"})
		}
		if errors.Is(err, pkg.ErrFilePreviewToolsMissing) {
			return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Required tools for file preview are missing"})
		}
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to generate preview"})
	}

	return ctx.File(outputFilePath)
}

// Reset previous file views so they dont collide with the new one
func resetView() error {
	err := pkg.KeyboardInput(keybd_event.VK_ESC)
	if err != nil {
		return fmt.Errorf("failed to send ESC key: %w", err)
	}
	sseConnection <- ""

	return nil
}

func isPortFree(port int) bool {
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return false
	}
	_ = l.Close()
	return true
}
