package main

import (
	"log/slog"
	"net/http"
	"plg-mudics/control/frontend"

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
	apiGroup.GET("/ping", func(ctx echo.Context) error {
		return ctx.String(http.StatusOK, "pong")
	})

	err := e.Start(":1323")
	if err != nil {
		slog.Error("Failed to start Echo Webserver", "error", err)
	}
}
