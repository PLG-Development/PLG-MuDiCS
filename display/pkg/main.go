package pkg

import (
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"plg-mudics/shared"

	"github.com/micmonay/keybd_event"
)

func GetDeviceIp() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", fmt.Errorf("failed to get network interfaces: %w", err)
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if ok && !ipNet.IP.IsLoopback() && ipNet.IP.To4() != nil {
			return ipNet.IP.String(), nil
		}
	}

	return "", fmt.Errorf("no suitable IP address found")
}

func GetDeviceMac() (string, error) {
	interfaces, err := net.Interfaces()
	if err != nil {
		return "", fmt.Errorf("failed to get network interfaces: %w", err)
	}

	for _, interf := range interfaces {
		mac := interf.HardwareAddr.String()
		if mac != "" {
			return mac, nil
		}
	}

	return "", fmt.Errorf("no suitable MAC address found")
}

type KeyAction int

const (
	KeyPress KeyAction = iota
	KeyRelease
)

type Input struct {
	Key    int
	Action KeyAction
}

func KeyboardInput(inputs []Input) error {
	var err error

	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		return fmt.Errorf("failed to create key bonding: %w", err)
	}

	for _, input := range inputs {
		kb.SetKeys(input.Key)

		switch input.Action {
		case KeyPress:
			err = kb.Press()
		case KeyRelease:
			err = kb.Release()
		}

		if err != nil {
			return fmt.Errorf("failed to run key event: %w", err)
		}

		time.Sleep(time.Microsecond * 100)
	}

	return nil
}

func TakeScreenshot() (string, error) {
	tempFilePath := filepath.Join(os.TempDir(), fmt.Sprintf("screenshot_%d.png", time.Now().Unix()))

	cmds := []*exec.Cmd{
		exec.Command("gnome-screenshot", "-f", tempFilePath),
		exec.Command("xfce4-screenshooter", "-f", "-s", tempFilePath),
		exec.Command("spectacle", "--fullscreen", "--nonotify", "--background", "--output", tempFilePath),
	}
	for _, cmd := range cmds {
		commandOutput := shared.RunShellCommand(cmd)
		if commandOutput.ExitCode == 0 {
			return tempFilePath, nil
		}
	}
	return "", errors.New("no screenshot utility found or all failed")
}

func GetStoragePath() (string, error) {
	var storagePath string

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("unable to determine user home directory: %w", err)
	}
	storagePath = filepath.Join(home, ".local", "share", "plg-mudics", "display")
	if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create local config directory: %w", err)
	}

	return storagePath, nil
}

// ResolveStorageFilePath validates and resolves a storage-relative file path.
// Returns the full path, whether the file exists, or an error.
func ResolveStorageFilePath(pathParam string) (string, bool, error) {
	storagePath, err := GetStoragePath()
	if err != nil {
		return "", false, fmt.Errorf("failed to get storage path: %w", err)
	}
	cleanPath := filepath.Clean(pathParam)
	fullPath := filepath.Join(storagePath, cleanPath)
	rel, err := filepath.Rel(storagePath, fullPath)

	if err != nil || strings.HasPrefix(rel, "..") {
		return "", false, fmt.Errorf("invalid file path")
	}

	info, statErr := os.Stat(fullPath)

	if statErr != nil {
		if os.IsNotExist(statErr) {
			return fullPath, false, nil
		}
		return "", false, fmt.Errorf("failed to stat path: %w", statErr)
	}

	if info.IsDir() {
		return "", false, fmt.Errorf("path is a directory")
	}

	return fullPath, true, nil
}
