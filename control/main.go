package main

import (
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"plg-mudics/control/frontend"
	"plg-mudics/shared"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/mdlayher/wol"
)

var storageFile string

func main() {
	var err error

	path, err := getStoragePath()
	if err != nil {
		slog.Error("Failed to initialize storage path", "error", err)
		os.Exit(1)
	}
	storageFile = filepath.Join(path, "storage.json")
	// Ensure storage.json exists
	if _, err := os.Stat(storageFile); os.IsNotExist(err) {
		if err := os.WriteFile(storageFile, []byte("{}"), 0644); err != nil {
			slog.Error("Failed to initialize storage.json", "error", err)
			os.Exit(1)
		}
	}

	e := echo.New()

	// Allow requests from everywhere
	e.Use(middleware.CORS())

	// Serve the embedded SvelteKit frontend
	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Filesystem: http.FS(frontend.BuildDirFS),
		HTML5:      true,
	}))

	// Servers all API endpoints, e.g. our custom logic
	apiGroup := e.Group("/api")
	apiGroup.GET("/ping", pingRoute)
	apiGroup.POST("/wakeOnLan", wakeOnLanRoute)
	apiGroup.GET("/storage", getStorageRoute)
	apiGroup.POST("/storage", setStorageRoute)

	port := "8080"

	// the order is important, the open browser command exitsts as soon as the winodw is closed
	// and since its the last action in the main go func all other goroutines (e.g. the webserver) are killed
	go func() {
		err := e.Start(":" + port)
		if err != nil {
			slog.Error("Failed to start Echo Webserver", "error", err)
			os.Exit(1)
		}
	}()
	err = shared.OpenBrowserWindow("http://localhost:"+port, false, "control")
	if err != nil {
		slog.Error("Failed to open browser window", "error", err)
		os.Exit(1)
	}
}

func pingRoute(ctx echo.Context) error {
	ip := ctx.QueryParam("ip")
	if ip == "" {
		return ctx.JSON(http.StatusBadRequest, PingResponse{Error: "missing 'ip' query parameter"})
	}

	cmd := exec.Command("ping", "-c", "1", "-w", "5", ip)
	result := shared.RunShellCommand(cmd)
	if result.ExitCode != 0 {
		return ctx.JSON(http.StatusOK, PingResponse{Status: "host_offline"})
	}

	conn, err := net.DialTimeout("tcp", ip+":1323", 5*time.Second)
	if err != nil {
		return ctx.JSON(http.StatusOK, PingResponse{Status: "app_offline"})
	}
	conn.Close()

	return ctx.JSON(http.StatusOK, PingResponse{Status: "app_online"})
}

type PingResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

type WakeOnLanRequest struct {
	MACAddress string `json:"mac_address"`
}

func wakeOnLanRoute(ctx echo.Context) error {
	var data WakeOnLanRequest
	if err := ctx.Bind(&data); err != nil {
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: shared.BadRequestDescription})
	}
	mac, err := net.ParseMAC(data.MACAddress)
	if err != nil {
		slog.Warn("Invalid MAC address provided", "mac_address", data.MACAddress, "error", err)
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Description: "Invalid MAC address"})
	}

	client, err := wol.NewClient()
	if err != nil {
		slog.Error("Failed to create Wake-on-LAN client", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to create Wake-on-LAN client"})
	}
	if err := client.Wake("255.255.255.255:7", mac); err != nil {
		slog.Error("Failed to send Wake-on-LAN packet", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Description: "Failed to send Wake-on-LAN packet"})
	}

	return ctx.JSON(http.StatusOK, struct{}{})
}
