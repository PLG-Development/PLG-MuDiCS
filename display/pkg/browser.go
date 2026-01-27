package pkg

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/chromedp/chromedp"
)

var B browser = browser{}

type browser struct {
	ctx    context.Context
	Cancel context.CancelFunc
}

func (b *browser) Init() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("unable to determine user home directory: %w", err)
	}
	browserProfileDirPath := filepath.Join(home, ".local", "share", "plg-mudics", "browser-display")
	if err := os.MkdirAll(browserProfileDirPath, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create local config directory: %w", err)
	}

	opts := []chromedp.ExecAllocatorOption{
		chromedp.Flag("headless", false),
		chromedp.Flag("start-fullscreen", false),
		chromedp.Flag("hide-scrollbars", true),
		chromedp.Flag("allow-file-access-from-files", true),
		chromedp.Flag("user-data-dir", browserProfileDirPath),
		chromedp.Flag("autoplay-policy", "no-user-gesture-required"),
	}

	initCtx, _ := chromedp.NewExecAllocator(context.Background(), opts...)
	b.ctx, b.Cancel = chromedp.NewContext(initCtx)

	return nil
}

func (b *browser) OpenPage(url string) {
	chromedp.Run(b.ctx, chromedp.Navigate(url))
}

// Yes, we need that trick with creating a temp file and not directly sending html since
// chrome only allows us to access local files via other local files
func (b *browser) OpenHTML(html string) error {
	var err error

	tempFile, err := os.CreateTemp("", "mudics-*.html")
	if err != nil {
		return fmt.Errorf("could not create tempfile: %w", err)
	}
	defer tempFile.Close()

	_, err = tempFile.WriteString(html)
	if err != nil {
		return fmt.Errorf("could not write to tempfile: %w", err)
	}

	chromedp.Run(b.ctx, chromedp.Navigate("file://"+tempFile.Name()))

	return nil
}

func (b *browser) OpenPDF(path string) {
	b.OpenPage("file://" + path + "#toolbar=0&view=Fit")
}
