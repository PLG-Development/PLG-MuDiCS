package pkg

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"plg-mudics/shared"
)

var runningHelpProgram *exec.Cmd = nil

func OpenPresentation(path string) error {
	tempDirPath, err := os.MkdirTemp("", "plg-mudics-libreoffice-profile-")
	if err != nil {
		return fmt.Errorf("failed to create temporary profile directory: %w", err)
	}

	runningHelpProgram = exec.Command("soffice", "--show", path, "--nologo", "--norestore", fmt.Sprintf("-env:UserInstallation=file:///%s", tempDirPath))
	result := shared.RunShellCommand(runningHelpProgram)
	killedByParent := -1
	if result.ExitCode != 0 && result.ExitCode != killedByParent {
		return errors.New(result.Stderr)
	}
	return nil
}

func OpenPDF(path string) error {
	runningHelpProgram = exec.Command("xreader", path, "--presentation")
	result := shared.RunShellCommandNonBlocking(runningHelpProgram)
	killedByParent := -1
	if result.ExitCode != 0 && result.ExitCode != killedByParent {
		return fmt.Errorf("could not open pdf: %s (%d)", result.Stderr, result.ExitCode)
	}
	return nil
}

func CloseRunningProgram() error {
	if runningHelpProgram == nil {
		return nil
	}
	err := runningHelpProgram.Process.Kill()
	return err
}
