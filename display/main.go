package main

import (
	"log/slog"
	"os"

	"plg-mudics/display/pkg"
	"plg-mudics/display/web"
	"plg-mudics/shared"
)

const VERSION = "0.1.0"

//go:generate go tool templ generate

func main() {
	var err error

	// Ensure local config directory exists
	_, err = pkg.GetStoragePath()
	if err != nil {
		slog.Error("Failed to get storage path", "error", err)
		os.Exit(1)
		return
	}
	port := "1323"
	go web.StartWebServer(VERSION, port)

	err = shared.OpenBrowserWindow("http://localhost:"+port, true, true)
	if err != nil {
		slog.Error("Failed to open browser window", "error", err)
		os.Exit(1)
	}
}
