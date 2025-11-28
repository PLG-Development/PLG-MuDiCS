package shared

import (
	"bytes"
	"context"
	"errors"
	"os/exec"
	"time"
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

	return parseCmdResult(cmd, stdout, stderr, err)

}

func RunShellCommandNonBlocking(cmd *exec.Cmd) CommandResponse {
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Start()

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	done := make(chan error, 1)

	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-ctx.Done():
		return CommandResponse{}
	case err := <-done:
		return parseCmdResult(cmd, stdout, stderr, err)
	}
}

func parseCmdResult(cmd *exec.Cmd, stdout, stderr bytes.Buffer, err error) CommandResponse {
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
