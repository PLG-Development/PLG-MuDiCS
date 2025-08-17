package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/micmonay/keybd_event"
)

type CommandRequest struct {
	Command string `json:"command"`
}

type CommandResponse struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
}

type KeyboardInputRequest struct {
	Key string `json:"key"`
}

type HTMLRequest struct {
	HTML string `json:"html"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

var storagePath string
var chromiumBin string
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

func main() {
	var err error

	if err := checkDependencies(); err != nil {
		slog.Error("Dependency check failed", "error", err)
		os.Exit(1)
	}

	// Ensure local config directory exists
	home, err := os.UserHomeDir()
	if err != nil {
		slog.Error("Unable to determine user home directory", "error", err)
		os.Exit(1)
	}
	storagePath = filepath.Join(home, ".local", "share", "plg-connect-display")
	if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
		slog.Error("Failed to create local config directory", "path", storagePath, "error", err)
		os.Exit(1)
	}

	// Open browser window
	go func() {
		args := fmt.Sprintf("%s --app='http://127.0.0.1:1323' --start-fullscreen --user-data-dir=$(mktemp -d) --autoplay-policy=no-user-gesture-required", chromiumBin)
		cmd := exec.Command("bash", "-c", args)
		_ = cmd.Run()
	}()

	// Webserver
	e := echo.New()

	e.GET("/", indexRoute)
	e.GET("/sse", sseRoute)

	apiGroup := e.Group("/api")
	apiGroup.PATCH("/shellCommand", shellCommandRoute)
	apiGroup.PATCH("/keyboardInput", keyboardInputRoute)
	apiGroup.PATCH("/showHTML", showHTMLRoute)

	fileGroup := apiGroup.Group("/file")
	fileGroup.Use(extractFilePathMiddleware)
	fileGroup.POST("/:path", uploadFileRoute)
	fileGroup.GET("/:path", downloadFileRoute)
	fileGroup.PATCH("/:path", openFileRoute)

	err = e.Start(":1323")
	if err != nil {
		slog.Error("Failed to start server", "error", err)
	}
}

func checkDependencies() error {
	// Detect available Chromium binary name
	for _, b := range []string{"chromium", "chromium-browser"} {
		if _, err := exec.LookPath(b); err == nil {
			chromiumBin = b
			break
		}
	}
	if chromiumBin == "" {
		return errors.New("chromium or chromium-browser not found in PATH")
	}

	// Check other dependencies
	deps := []string{
		"soffice", // LibreOffice
		"bash",
	}

	for _, dep := range deps {
		if _, err := exec.LookPath(dep); err != nil {
			return errors.New(dep + " not found in PATH")
		}
	}
	return nil
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
	ip, err := getDeviceIp()
	if err != nil {
		slog.Error("Failed to get device IP address", "error", err)
	}
	mac, err := getDeviceMac()
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

func getDeviceIp() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("failed to get network interfaces: %w", err)
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if ok && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
			return ipNet.IP.String(), nil
		}
	}

	return "", fmt.Errorf("no suitable IP address found")
}

func getDeviceMac() (string, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return "", fmt.Errorf("failed to get network interfaces: %w", err)
	}

	for _, interf := range interfaces {
		mac := interf.HardwareAddr.String()
		if mac != "" {
			return mac, nil
		}
	}

	return "", fmt.Errorf("no suitable MAC address found")
}

func extractFilePathMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		// Retrieve and clean the path parameter
		pathParam := ctx.Param("path")
		cleanPath := filepath.Clean(pathParam)
		fullPath := filepath.Join(storagePath, cleanPath)
		rel, err := filepath.Rel(storagePath, fullPath)
		if err != nil || strings.HasPrefix(rel, "..") {
			return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid file path"})
		}

		// Determine if the target path exists and is a file
		var exists bool
		info, statErr := os.Stat(fullPath)
		if statErr != nil {
			if os.IsNotExist(statErr) {
				exists = false
			} else {
				slog.Error("Failed to stat path", "path", fullPath, "error", statErr)
				return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Internal server error"})
			}
		} else {
			if info.IsDir() {
				return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Path is a directory"})
			}
			exists = true
		}

		ctx.Set("fullPath", fullPath)
		ctx.Set("fileExists", exists)
		return next(ctx)
	}
}

func shellCommandRoute(ctx echo.Context) error {
	var commandInput CommandRequest
	if err := ctx.Bind(&commandInput); err != nil {
		slog.Error("Failed to parse shell command", "error", err)
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid JSON request"})
	}

	var stdout, stderr bytes.Buffer
	cmd := exec.Command("bash", "-c", "-r", fmt.Sprintf("%s", commandInput.Command))
	cmd.Dir = storagePath
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()

	commandOutput := CommandResponse{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: cmd.ProcessState.ExitCode(),
	}
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			commandOutput.ExitCode = exitErr.ExitCode()
		} else {
			commandOutput.Stderr = err.Error()
		}

		slog.Error("Shell command execution error", "error", commandOutput.Stderr)
	}

	slog.Info("Shell command executed successfully", "command", commandInput.Command, "exitCode", commandOutput.ExitCode)
	return ctx.JSON(http.StatusOK, commandOutput)
}

func keyboardInputRoute(ctx echo.Context) error {
	var req KeyboardInputRequest
	if err := ctx.Bind(&req); err != nil {
		slog.Error("Failed to parse keyboard input", "error", err)
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid JSON request"})
	}

	code, ok := keyboardEvents[req.Key]
	if !ok {
		slog.Error("Unsupported key", "key", req.Key)
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Unsupported key: %s", req.Key)})
	}

	err := keyboardInput(code)
	if err != nil {
		slog.Error("Failed to send keyboard input", "key", req.Key, "error", err)
		return ctx.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to send keyboard input"})
	}

	slog.Info("Keyboard input sent", "key", req.Key)
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
		openPresentation(fullPath)
	default:
		return ctx.JSON(http.StatusBadRequest, ErrorResponse{Error: "Unsupported file type"})
	}

	slog.Info("Successfully run file", "file", pathParam)
	return ctx.NoContent(http.StatusOK)
}

func openPresentation(path string) {
	cmd := exec.Command("bash", "-c", "-r", fmt.Sprintf("soffice --show %s -nologo -norestore", path))
	_ = cmd.Run()
}

func keyboardInput(key int) error {
	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		return fmt.Errorf("failed to create key bonding: %w", err)
	}
	kb.SetKeys(key)

	if err := kb.Launching(); err != nil {
		return fmt.Errorf("failed to launch key event: %w", err)
	}

	return nil
}

func showHTMLRoute(ctx echo.Context) error {
	var request HTMLRequest
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

// Reset previous file views so they dont collide with the new one
func resetView() error {
	err := keyboardInput(keybd_event.VK_ESC)
	if err != nil {
		return fmt.Errorf("failed to send ESC key: %w", err)
	}
	sseConnection <- ""

	return nil
}
