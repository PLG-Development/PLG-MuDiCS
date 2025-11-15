package pkg

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"plg-mudics/shared"
	"strings"
	"time"
)

var ErrFileTypePreviewNotSupported = errors.New("file type not supported for preview")
var ErrFilePreviewToolsMissing = errors.New("required tools for file preview are missing")

func GenerateFilePreview(inputPath string) (string, error) {
	var err error
	ext := strings.ToLower(filepath.Ext(inputPath))
	tempFilePath := filepath.Join(os.TempDir(), fmt.Sprintf("preview_%d.webp", time.Now().Unix()))

	switch ext {
	case ".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".webp":
		err = generateImagePreview(inputPath, tempFilePath)
	case ".pdf":
		err = generatePDFPreview(inputPath, tempFilePath)
	case ".mp4", ".mov":
		err = generateVideoPreview(inputPath, tempFilePath)
	default:
		return "", ErrFileTypePreviewNotSupported
	}
	if err != nil {
		return "", err
	}

	return tempFilePath, nil
}

func generateImagePreview(inputPath string, outputPath string) error {
	cmd := exec.Command("magick", inputPath, "-gravity", "center", "-crop", "1:1", "-thumbnail", "100", "-quality", "50", outputPath)
	result := shared.RunShellCommand(cmd)
	if result.ExitCode != 0 {
		if result.ExitCode == 127 {
			return ErrFilePreviewToolsMissing
		}
		return errors.New(result.Stderr)
	}
	return nil
}

func generatePDFPreview(inputPath string, outputPath string) error {
	testCmd := exec.Command("which", "gs")
	if result := shared.RunShellCommand(testCmd); result.ExitCode != 0 {
		return ErrFilePreviewToolsMissing
	}

	cmd := exec.Command("magick", fmt.Sprintf("%s[0]", inputPath), "-gravity", "center", "-crop", "1:1", "-thumbnail", "100x100", "-quality", "50", outputPath)
	result := shared.RunShellCommand(cmd)
	if result.ExitCode != 0 {
		if result.ExitCode == 127 {
			return ErrFilePreviewToolsMissing
		}
		return errors.New(result.Stderr)
	}
	return nil
}

func generateVideoPreview(inputPath string, outputPath string) error {
	tempFilePath := filepath.Join(os.TempDir(), fmt.Sprintf("preview_temp_%d.webp", time.Now().Unix()))

	ffmpegCmd := exec.Command("ffmpeg", "-i", inputPath, "-ss", "00:00:01.000", "-vframes", "1", tempFilePath)
	result := shared.RunShellCommand(ffmpegCmd)
	if result.ExitCode != 0 {
		if result.ExitCode == 127 {
			return ErrFilePreviewToolsMissing
		}
		return errors.New(result.Stderr)
	}

	err := generateImagePreview(tempFilePath, outputPath)
	if err != nil {
		return err
	}

	return nil
}
