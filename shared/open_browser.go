package shared

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func OpenBrowserWindow(url string, fullscreen bool, profile string) error {
	bins := []string{"chromium", "chromium-browser"}

	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("unable to determine user home directory: %w", err)
	}
	browserProfileDirPath := filepath.Join(home, ".local", "share", "plg-mudics", fmt.Sprintf("browser-%s", profile))
	if err := os.MkdirAll(browserProfileDirPath, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create local config directory: %w", err)
	}

	args := []string{fmt.Sprintf("--app=%s", url), "--autoplay-policy=no-user-gesture-required", fmt.Sprintf("--user-data-dir=%s", browserProfileDirPath)}
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
