package shared

import (
	_ "embed"
	"strings"
)

//go:embed splash_screen.html
var RawSplashScreenTemplate string

//go:embed version.txt
var versionNotTrimmed string
var Version = strings.TrimSpace(versionNotTrimmed)
