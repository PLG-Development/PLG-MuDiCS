package web

import (
	"embed"
	"io/fs"
)

//go:embed all:static
var staticDir embed.FS

// BuildDirFS contains the embedded dist directory files (without the "build" prefix)
var StaticDirFS, _ = fs.Sub(staticDir, "static")
