package pkg

import (
	"fmt"
	"time"

	"github.com/micmonay/keybd_event"
)

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

var KeyboardEvents = map[string]int{
	"VK_SP1":        keybd_event.VK_SP1,
	"VK_SP2":        keybd_event.VK_SP2,
	"VK_SP3":        keybd_event.VK_SP3,
	"VK_SP4":        keybd_event.VK_SP4,
	"VK_SP5":        keybd_event.VK_SP5,
	"VK_SP6":        keybd_event.VK_SP6,
	"VK_SP7":        keybd_event.VK_SP7,
	"VK_SP8":        keybd_event.VK_SP8,
	"VK_SP9":        keybd_event.VK_SP9,
	"VK_SP10":       keybd_event.VK_SP10,
	"VK_SP11":       keybd_event.VK_SP11,
	"VK_SP12":       keybd_event.VK_SP12,
	"VK_ESC":        keybd_event.VK_ESC,
	"VK_1":          keybd_event.VK_1,
	"VK_2":          keybd_event.VK_2,
	"VK_3":          keybd_event.VK_3,
	"VK_4":          keybd_event.VK_4,
	"VK_5":          keybd_event.VK_5,
	"VK_6":          keybd_event.VK_6,
	"VK_7":          keybd_event.VK_7,
	"VK_8":          keybd_event.VK_8,
	"VK_9":          keybd_event.VK_9,
	"VK_0":          keybd_event.VK_0,
	"VK_Q":          keybd_event.VK_Q,
	"VK_W":          keybd_event.VK_W,
	"VK_E":          keybd_event.VK_E,
	"VK_R":          keybd_event.VK_R,
	"VK_T":          keybd_event.VK_T,
	"VK_Y":          keybd_event.VK_Y,
	"VK_U":          keybd_event.VK_U,
	"VK_I":          keybd_event.VK_I,
	"VK_O":          keybd_event.VK_O,
	"VK_P":          keybd_event.VK_P,
	"VK_A":          keybd_event.VK_A,
	"VK_S":          keybd_event.VK_S,
	"VK_D":          keybd_event.VK_D,
	"VK_F":          keybd_event.VK_F,
	"VK_G":          keybd_event.VK_G,
	"VK_H":          keybd_event.VK_H,
	"VK_J":          keybd_event.VK_J,
	"VK_K":          keybd_event.VK_K,
	"VK_L":          keybd_event.VK_L,
	"VK_Z":          keybd_event.VK_Z,
	"VK_X":          keybd_event.VK_X,
	"VK_C":          keybd_event.VK_C,
	"VK_V":          keybd_event.VK_V,
	"VK_B":          keybd_event.VK_B,
	"VK_N":          keybd_event.VK_N,
	"VK_M":          keybd_event.VK_M,
	"VK_F1":         keybd_event.VK_F1,
	"VK_F2":         keybd_event.VK_F2,
	"VK_F3":         keybd_event.VK_F3,
	"VK_F4":         keybd_event.VK_F4,
	"VK_F5":         keybd_event.VK_F5,
	"VK_F6":         keybd_event.VK_F6,
	"VK_F7":         keybd_event.VK_F7,
	"VK_F8":         keybd_event.VK_F8,
	"VK_F9":         keybd_event.VK_F9,
	"VK_F10":        keybd_event.VK_F10,
	"VK_F11":        keybd_event.VK_F11,
	"VK_F12":        keybd_event.VK_F12,
	"VK_F13":        keybd_event.VK_F13,
	"VK_F14":        keybd_event.VK_F14,
	"VK_F15":        keybd_event.VK_F15,
	"VK_F16":        keybd_event.VK_F16,
	"VK_F17":        keybd_event.VK_F17,
	"VK_F18":        keybd_event.VK_F18,
	"VK_F19":        keybd_event.VK_F19,
	"VK_F20":        keybd_event.VK_F20,
	"VK_F21":        keybd_event.VK_F21,
	"VK_F22":        keybd_event.VK_F22,
	"VK_F23":        keybd_event.VK_F23,
	"VK_F24":        keybd_event.VK_F24,
	"VK_NUMLOCK":    keybd_event.VK_NUMLOCK,
	"VK_SCROLLLOCK": keybd_event.VK_SCROLLLOCK,
	"VK_RESERVED":   keybd_event.VK_RESERVED,
	"VK_MINUS":      keybd_event.VK_MINUS,
	"VK_EQUAL":      keybd_event.VK_EQUAL,
	"VK_BACKSPACE":  keybd_event.VK_BACKSPACE,
	"VK_TAB":        keybd_event.VK_TAB,
	"VK_LEFTBRACE":  keybd_event.VK_LEFTBRACE,
	"VK_RIGHTBRACE": keybd_event.VK_RIGHTBRACE,
	"VK_ENTER":      keybd_event.VK_ENTER,
	"VK_SEMICOLON":  keybd_event.VK_SEMICOLON,
	"VK_APOSTROPHE": keybd_event.VK_APOSTROPHE,
	"VK_GRAVE":      keybd_event.VK_GRAVE,
	"VK_BACKSLASH":  keybd_event.VK_BACKSLASH,
	"VK_COMMA":      keybd_event.VK_COMMA,
	"VK_DOT":        keybd_event.VK_DOT,
	"VK_SLASH":      keybd_event.VK_SLASH,
	"VK_KPASTERISK": keybd_event.VK_KPASTERISK,
	"VK_SPACE":      keybd_event.VK_SPACE,
	"VK_CAPSLOCK":   keybd_event.VK_CAPSLOCK,
	"VK_KP0":        keybd_event.VK_KP0,
	"VK_KP1":        keybd_event.VK_KP1,
	"VK_KP2":        keybd_event.VK_KP2,
	"VK_KP3":        keybd_event.VK_KP3,
	"VK_KP4":        keybd_event.VK_KP4,
	"VK_KP5":        keybd_event.VK_KP5,
	"VK_KP6":        keybd_event.VK_KP6,
	"VK_KP7":        keybd_event.VK_KP7,
	"VK_KP8":        keybd_event.VK_KP8,
	"VK_KP9":        keybd_event.VK_KP9,
	"VK_KPMINUS":    keybd_event.VK_KPMINUS,
	"VK_KPPLUS":     keybd_event.VK_KPPLUS,
	"VK_KPDOT":      keybd_event.VK_KPDOT,
	"VK_CANCEL":     keybd_event.VK_CANCEL,
	"VK_BACK":       keybd_event.VK_BACK,
	"VK_PAUSE":      keybd_event.VK_PAUSE,
	"VK_HANGUEL":    keybd_event.VK_HANGUEL,
	"VK_HANJA":      keybd_event.VK_HANJA,
	"VK_PAGEUP":     keybd_event.VK_PAGEUP,
	"VK_PAGEDOWN":   keybd_event.VK_PAGEDOWN,
	"VK_END":        keybd_event.VK_END,
	"VK_HOME":       keybd_event.VK_HOME,
	"VK_LEFT":       keybd_event.VK_LEFT,
	"VK_UP":         keybd_event.VK_UP,
	"VK_RIGHT":      keybd_event.VK_RIGHT,
	"VK_DOWN":       keybd_event.VK_DOWN,
	"VK_PRINT":      keybd_event.VK_PRINT,
	"VK_INSERT":     keybd_event.VK_INSERT,
	"VK_DELETE":     keybd_event.VK_DELETE,
	"VK_HELP":       keybd_event.VK_HELP,
}
