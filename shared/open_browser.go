package shared

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
)


func OpenBrowserWindow(url string, fullscreen bool, temp bool) error {
	bins := []string{"chromium", "chromium-browser"}

	args := []string{fmt.Sprintf("--app=%s", url), "--autoplay-policy=no-user-gesture-required"}
	if fullscreen {
		args = append(args, "--start-fullscreen")
	}
	if temp {
		tempDirPath, err := os.MkdirTemp("", "plg-mudics-browser-")
		if err != nil {
			return err
		}
		arg := fmt.Sprintf("--user-data-dir=%s", tempDirPath)
		args = append(args, arg)
	}

	for _, bin := range bins {
		cmd := exec.Command(bin, args...)
		fmt.Println(cmd)
		commandOutput := RunShellCommand(cmd)
		if commandOutput.ExitCode == 0 {
			return nil
		}
	}

	return errors.New("chromium not found in PATH")
}
