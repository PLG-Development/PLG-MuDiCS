package web

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/micmonay/keybd_event"

	"plg-mudics/display/pkg"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

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

func StartWebServer(v string) {
	version = v

	e := echo.New()

	e.GET("/", indexRoute)
	e.GET("/sse", sseRoute)

	apiGroup := e.Group("/api")
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

	err := e.Start(":1323")
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
	var status bytes.Buffer
	deviceInfoTemplate(ip, mac).Render(context.Background(), &status)
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

func extractFilePathMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		pathParam := ctx.Param("path")
		fullPath, exists, err := pkg.ResolveStorageFilePath(pathParam)
		if err != nil {
			slog.Warn("Failed to validate file path", "path", pathParam, "error", err)
			return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid file path"})
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
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid JSON request"})
	}

	cmd := exec.Command("bash", "-c", "-r", commandInput.Command)
	storagePath, err := pkg.GetStoragePath()
	if err != nil {
		slog.Error("Failed to get storage path", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
	}
	cmd.Dir = storagePath

	commandOutput := pkg.RunShellCommand(cmd)
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
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid JSON request"})
	}

	code, ok := pkg.KeyboardEvents[request.Key]
	if !ok {
		slog.Error("Unsupported key", "key", request.Key)
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Unsupported key: %s", request.Key)})
	}

	err := pkg.KeyboardInput(code)
	if err != nil {
		slog.Error("Failed to send keyboard input", "key", request.Key, "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to send keyboard input"})
	}

	slog.Info("Keyboard input sent", "key", request.Key)
	return ctx.NoContent(http.StatusOK)
}

func uploadFileRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)

	// Ensure parent directories exist
	if err := os.MkdirAll(filepath.Dir(fullPath), os.ModePerm); err != nil {
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to prepare storage directory"})
	}

	if ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusConflict, ErrorResponse{Error: "File already exists"})
	}

	ext := strings.ToLower(filepath.Ext(fullPath))
	if !supportedExtensions[ext] {
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Unsupported file extension: %s", ext)})
	}

	data, err := io.ReadAll(ctx.Request().Body)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to read file body"})
	}

	if err := os.WriteFile(fullPath, data, os.ModePerm); err != nil {
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to save file"})
	}

	slog.Info("File uploaded successfully", "path", fullPath)
	return ctx.JSON(http.StatusCreated, struct{ Message string }{Message: "File uploaded successfully"})
}

func downloadFileRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)

	if !ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusNotFound, ErrorResponse{Error: "File not found"})
	}

	err := ctx.File(fullPath)
	if err != nil {
		slog.Error("Failed to serve file", "file", fullPath, "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
	}

	slog.Info("File downloaded successfully", "path", fullPath)
	return nil
}

func openFileRoute(ctx echo.Context) error {
	pathParam := ctx.Param("path")
	fullPath := ctx.Get("fullPath").(string)

	if !ctx.Get("fileExists").(bool) {
		return ctx.JSON(http.StatusNotFound, ErrorResponse{Error: "File not found"})
	}

	if sseConnection == nil {
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Cant connect to display browser client"})
	}

	err := resetView()
	if err != nil {
		slog.Error("Failed to reset view", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to reset view"})
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
			return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to open presentation"})
		}
	default:
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Unsupported file type"})
	}

	slog.Info("Successfully run file", "file", pathParam)
	return ctx.NoContent(http.StatusOK)
}

func showHTMLRoute(ctx echo.Context) error {
	var request struct {
		HTML string `json:"html"`
	}
	if err := ctx.Bind(&request); err != nil {
		slog.Error("Failed to parse request", "error", err)
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid JSON request"})
	}

	err := resetView()
	if err != nil {
		slog.Error("Failed to reset view", "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to reset view"})
	}

	sseConnection <- request.HTML

	slog.Info("HTML content sent to client")
	return ctx.NoContent(http.StatusOK)
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
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
	}

	err = ctx.File(screenshotPath)
	if err != nil {
		slog.Error("Failed to serve file", "file", screenshotPath, "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
	}

	return nil
}

func previewRoute(ctx echo.Context) error {
	fullPath := ctx.Get("fullPath").(string)
	exists := ctx.Get("fileExists").(bool)
	if !exists {
		return ctx.JSON(http.StatusNotFound, ErrorResponse{Error: "File not found"})
	}

	outputFilePath, err := pkg.GenerateFilePreview(fullPath)
	if err != nil {
		slog.Error("Failed to generate preview", "file", fullPath, "error", err)
		if errors.Is(err, pkg.ErrFileTypePreviewNotSupported) {
			return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "File type not supported for preview"})
		}
		if errors.Is(err, pkg.ErrFilePreviewToolsMissing) {
			return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Required tools for file preview are missing"})
		}
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to generate preview"})
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
