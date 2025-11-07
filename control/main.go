package main

import (
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"plg-mudics/control/frontend"
	"plg-mudics/shared"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	// Serve the embedded SvelteKit frontend
	e.Use(middleware.StaticWithConfig(middleware.StaticConfig{
		Filesystem: http.FS(frontend.BuildDirFS),
		HTML5:      true,
	}))

	// Servers all API endpoints, e.g. our custom logic
	apiGroup := e.Group("/api")
	apiGroup.GET("/ping", pingRoute)

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
	err := shared.OpenBrowserWindow("http://localhost:"+port, false, false)
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

	cmd := exec.Command("ping", "-c", "1", "-w", "1", ip)
	result := shared.RunShellCommand(cmd)
	if result.ExitCode != 0 {
		return ctx.JSON(http.StatusOK, PingResponse{Status: "host_offline"})
	}

	conn, err := net.DialTimeout("tcp", ip+":1323", 1*time.Second)
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
