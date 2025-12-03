package pkg

import (
	"fmt"
	"os"
	"os/exec"
	"plg-mudics/shared"
	"syscall"

	"github.com/gabriel-vasile/mimetype"
)

var FileHandler fileHandler = fileHandler{}

type fileHandler struct {
	runningProgram *exec.Cmd
}

func (fh *fileHandler) OpenFile(path string) error {
	var err error

	mType, err := mimetype.DetectFile(path)
	if err != nil {
		return fmt.Errorf("failed to detect mime type: %w", err)
	}

	tempDirPath, err := os.MkdirTemp("", "plg-mudics-program-profile-")
	if err != nil {
		return fmt.Errorf("failed to create temporary profile directory: %w", err)
	}

	err = fh.CloseRunningProgram()
	if err != nil {
		return err
	}

	switch mType.String() {
	case "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.oasis.opendocument.presentation":
		fh.runningProgram = exec.Command("soffice", "--show", path, "--nologo", "--view", "--norestore", fmt.Sprintf("-env:UserInstallation=file://%s", tempDirPath))
	case "application/pdf":
		fh.runningProgram = exec.Command("xreader", path, "--presentation")
	default:
		return fmt.Errorf("unsupported file type: %s", mType.String())
	}

	fh.runningProgram.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	result := shared.RunShellCommandNonBlocking(fh.runningProgram)
	if result.ExitCode != 0 {
		return fmt.Errorf("could not open pdf: %s (%d)", result.Stderr, result.ExitCode)
	}

	return nil
}

func (fh *fileHandler) CloseRunningProgram() error {
	if fh.runningProgram == nil {
		return nil
	}
	err := syscall.Kill(-fh.runningProgram.Process.Pid, syscall.SIGTERM)
	fh.runningProgram = nil
	return err
}
