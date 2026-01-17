package main

import (
	"log/slog"
	"os"

	"plg-mudics/display/pkg"
	"plg-mudics/display/web"
	"plg-mudics/shared"
)

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

	// the order is important, the open browser command exitsts as soon as the winodw is closed
	// and since its the last action in the main go func all other goroutines (e.g. the webserver) are killed
	go web.StartWebServer(shared.Version, port)
	err = shared.OpenBrowserWindow("http://localhost:"+port, true, "display")
	if err != nil {
		slog.Error("Failed to open browser window", "error", err)
		os.Exit(1)
	}
}
