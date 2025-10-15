package main

import (
	"log/slog"
	"os"

	"plg-mudics-display/pkg"
	"plg-mudics-display/web"
)

const VERSION = "0.1.0"

//go:generate go tool templ generate

func main() {
	// Ensure local config directory exists
	_, err := pkg.GetStoragePath()
	if err != nil {
		slog.Error("Failed to get storage path", "error", err)
		os.Exit(1)
		return
	}

	// Open browser window
	go pkg.OpenBrowserWindow("http://127.0.0.1:1323")

	web.StartWebServer(VERSION)
}
