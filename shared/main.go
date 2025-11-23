package shared

import (
	"bytes"
	"errors"
	"os/exec"
)

type CommandResponse struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
}

type ErrorResponse struct {
	Description string `json:"description"`
}

var BadRequestDescription string = "Request uses invalid JSON syntax or does not follow request schema."

func RunShellCommand(cmd *exec.Cmd) CommandResponse {
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()

	commandOutput := CommandResponse{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: cmd.ProcessState.ExitCode(),
	}
	if err != nil {
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			commandOutput.ExitCode = exitErr.ExitCode()
		} else {
			commandOutput.Stderr = err.Error()
		}
	}

	return commandOutput
}
