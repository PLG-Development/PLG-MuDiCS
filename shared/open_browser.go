package shared

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
)

func OpenBrowserWindow(url string, fullscreen bool) error {
	bins := []string{"chromium", "chromium-browser"}

	tempDirPath, err := os.MkdirTemp("", "plg-mudics-browser-")
	if err != nil {
		return err
	}
	args := []string{fmt.Sprintf("--app=%s", url), "--autoplay-policy=no-user-gesture-required", fmt.Sprintf("--user-data-dir=%s", tempDirPath)}
	if fullscreen {
		args = append(args, "--start-fullscreen")
	}

	errs := []string{}
	for _, bin := range bins {
		cmd := exec.Command(bin, args...)
		commandOutput := RunShellCommand(cmd)
		if commandOutput.ExitCode == 0 {
			return nil
		}
		errs = append(errs, commandOutput.Stderr)
	}

	return errors.New("failed to open browser window: " + fmt.Sprint(errs))
}
