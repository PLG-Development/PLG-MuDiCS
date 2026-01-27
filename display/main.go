package main

import (
	"log/slog"
	"os"
	"time"

	"plg-mudics/display/pkg"
	"plg-mudics/display/web"
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
	go web.StartWebServer(port)
	pkg.B.Init()
	pkg.OpenStartScreen()
	defer pkg.B.Cancel()

	time.Sleep(time.Second * 1000)
}
