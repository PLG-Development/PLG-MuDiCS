package pkg

import "image"

func ResizeImage(img image.Image, newWidth, newHeight int) image.Image {
	srcBounds := img.Bounds()
	srcWidth := srcBounds.Dx()
	srcHeight := srcBounds.Dy()
	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	for y := range newHeight {
		for x := range newWidth {
			srcX := x * srcWidth / newWidth
			srcY := y * srcHeight / newHeight
			c := img.At(srcBounds.Min.X+srcX, srcBounds.Min.Y+srcY)
			dst.Set(x, y, c)
		}
	}
	return dst
}
