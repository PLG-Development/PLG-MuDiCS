package shared

import (
	_ "embed"
)

//go:embed splash_screen.html
var SplashScreenTemplate string

//go:embed version.txt
var VersionTxt string
