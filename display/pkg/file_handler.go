package pkg

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
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
		// yes, we need this weird workaround to delete lock files since libreoffice
		// doesn't expose an option to ignore them or prevent their creation
		// the --view argument for some reason doesn't work with --show
		parent := filepath.Dir(path)
		cmd := exec.Command("find", parent, "-name", ".~lock*", "-type", "f", "-delete")
		result := shared.RunShellCommand(cmd)
		if result.ExitCode != 0 {
			slog.Warn("could not remove lock files", "path", parent, "stderr", result.Stderr, "exitCode", result.ExitCode)
		}

		fh.runningProgram = exec.Command("soffice", "--show", path, "--nologo", "--norestore", fmt.Sprintf("-env:UserInstallation=file://%s", tempDirPath))
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
