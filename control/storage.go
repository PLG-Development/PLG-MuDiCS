package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"plg-mudics/shared"

	"github.com/labstack/echo/v4"
)

func getStorageRoute(ctx echo.Context) error {
	data, err := os.ReadFile(storageFile)
	if err != nil {
		slog.Error("Could not read storage file", "error", err)
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Error: "Could not read storage file"})
	}

	var content interface{}
	if err := json.Unmarshal(data, &content); err != nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Error: "Could not parse storage file"})
	}

	return ctx.JSON(http.StatusOK, content)
}

func setStorageRoute(ctx echo.Context) error {
	var payload interface{}
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, shared.ErrorResponse{Error: "Invalid JSON payload"})
	}

	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Error: "Failed to marshal storage file"})
	}
	if err := os.WriteFile(storageFile, data, 0644); err != nil {
		return ctx.JSON(http.StatusInternalServerError, shared.ErrorResponse{Error: "Failed to write storage file"})
	}

	return ctx.JSON(http.StatusOK, map[string]interface{}{})
}

func getStoragePath() (string, error) {
	var storagePath string

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("unable to determine user home directory: %w", err)
	}
	storagePath = filepath.Join(home, ".local", "share", "plg-mudics", "control")
	if err := os.MkdirAll(storagePath, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create local config directory: %w", err)
	}

	return storagePath, nil
}
