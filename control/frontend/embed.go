package frontend

import (
	"embed"
	"io/fs"
)

//go:embed all:build
var buildDir embed.FS

// BuildDirFS contains the embedded dist directory files (without the "build" prefix)
var BuildDirFS, _ = fs.Sub(buildDir, "build")
