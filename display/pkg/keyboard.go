package pkg

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/micmonay/keybd_event"
)

type KeyAction int

const (
	KeyPress KeyAction = iota
	KeyRelease
)

type Input struct {
	Key    string
	Action KeyAction
}

func KeyboardInput(inputs []Input) error {
	var err error

	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		return fmt.Errorf("failed to create key bonding: %w", err)
	}

	for _, input := range inputs {
		switch input.Key {
		case "Shift", "ShiftLeft", "ShiftRight":
			kb.HasSHIFT(true)
		case "Ctrl", "Control", "ControlLeft", "ControlRight":
			kb.HasCTRL(true)
		case "Alt", "AltLeft", "AltRight":
			kb.HasALT(true)
		case "Super", "Meta", "MetaLeft", "MetaRight":
			kb.HasSuper(true)
		default:
			keyCode, ok := KeyboardEvents[input.Key]
			if !ok {
				slog.Warn("Could not parse keyboard input", "key", input.Key)
				continue
			}
			kb.SetKeys(keyCode)
		}

		switch input.Action {
		case KeyPress:
			err = kb.Press()
		case KeyRelease:
			err = kb.Release()
		}

		if err != nil {
			return fmt.Errorf("failed to run key event: %w", err)
		}

		time.Sleep(time.Microsecond * 10)
	}

	return nil
}

var KeyboardEvents = map[string]int{
	"Escape":         keybd_event.VK_ESC,
	"Digit1":         keybd_event.VK_1,
	"Digit2":         keybd_event.VK_2,
	"Digit3":         keybd_event.VK_3,
	"Digit4":         keybd_event.VK_4,
	"Digit5":         keybd_event.VK_5,
	"Digit6":         keybd_event.VK_6,
	"Digit7":         keybd_event.VK_7,
	"Digit8":         keybd_event.VK_8,
	"Digit9":         keybd_event.VK_9,
	"Digit0":         keybd_event.VK_0,
	"KeyQ":           keybd_event.VK_Q,
	"KeyW":           keybd_event.VK_W,
	"KeyE":           keybd_event.VK_E,
	"KeyR":           keybd_event.VK_R,
	"KeyT":           keybd_event.VK_T,
	"KeyY":           keybd_event.VK_Y,
	"KeyU":           keybd_event.VK_U,
	"KeyI":           keybd_event.VK_I,
	"KeyO":           keybd_event.VK_O,
	"KeyP":           keybd_event.VK_P,
	"KeyA":           keybd_event.VK_A,
	"KeyS":           keybd_event.VK_S,
	"KeyD":           keybd_event.VK_D,
	"KeyF":           keybd_event.VK_F,
	"KeyG":           keybd_event.VK_G,
	"KeyH":           keybd_event.VK_H,
	"KeyJ":           keybd_event.VK_J,
	"KeyK":           keybd_event.VK_K,
	"KeyL":           keybd_event.VK_L,
	"KeyZ":           keybd_event.VK_Z,
	"KeyX":           keybd_event.VK_X,
	"KeyC":           keybd_event.VK_C,
	"KeyV":           keybd_event.VK_V,
	"KeyB":           keybd_event.VK_B,
	"KeyN":           keybd_event.VK_N,
	"KeyM":           keybd_event.VK_M,
	"F1":             keybd_event.VK_F1,
	"F2":             keybd_event.VK_F2,
	"F3":             keybd_event.VK_F3,
	"F4":             keybd_event.VK_F4,
	"F5":             keybd_event.VK_F5,
	"F6":             keybd_event.VK_F6,
	"F7":             keybd_event.VK_F7,
	"F8":             keybd_event.VK_F8,
	"F9":             keybd_event.VK_F9,
	"F10":            keybd_event.VK_F10,
	"F11":            keybd_event.VK_F11,
	"F12":            keybd_event.VK_F12,
	"F13":            keybd_event.VK_F13,
	"F14":            keybd_event.VK_F14,
	"F15":            keybd_event.VK_F15,
	"F16":            keybd_event.VK_F16,
	"F17":            keybd_event.VK_F17,
	"F18":            keybd_event.VK_F18,
	"F19":            keybd_event.VK_F19,
	"F20":            keybd_event.VK_F20,
	"F21":            keybd_event.VK_F21,
	"F22":            keybd_event.VK_F22,
	"F23":            keybd_event.VK_F23,
	"F24":            keybd_event.VK_F24,
	"NumLock":        keybd_event.VK_NUMLOCK,
	"ScrollLock":     keybd_event.VK_SCROLLLOCK,
	"CapsLock":       keybd_event.VK_CAPSLOCK,
	"Minus":          keybd_event.VK_SP2,
	"Equal":          keybd_event.VK_SP3,
	"Backspace":      keybd_event.VK_BACKSPACE,
	"Tab":            keybd_event.VK_TAB,
	"BracketLeft":    keybd_event.VK_SP4,
	"BracketRight":   keybd_event.VK_SP5,
	"Enter":          keybd_event.VK_ENTER,
	"Semicolon":      keybd_event.VK_SP6,
	"Quote":          keybd_event.VK_SP7,
	"Backquote":      keybd_event.VK_SP1,
	"Backslash":      keybd_event.VK_SP8,
	"Comma":          keybd_event.VK_SP9,
	"Period":         keybd_event.VK_SP10,
	"Slash":          keybd_event.VK_SP11,
	"IntlBackslash":  keybd_event.VK_SP12,
	"NumpadMultiply": keybd_event.VK_KPASTERISK,
	"NumpadAdd":      keybd_event.VK_KPPLUS,
	"NumpadSubtract": keybd_event.VK_KPMINUS,
	"NumpadDecimal":  keybd_event.VK_KPDOT,
	"Space":          keybd_event.VK_SPACE,
	"Numpad0":        keybd_event.VK_KP0,
	"Numpad1":        keybd_event.VK_KP1,
	"Numpad2":        keybd_event.VK_KP2,
	"Numpad3":        keybd_event.VK_KP3,
	"Numpad4":        keybd_event.VK_KP4,
	"Numpad5":        keybd_event.VK_KP5,
	"Numpad6":        keybd_event.VK_KP6,
	"Numpad7":        keybd_event.VK_KP7,
	"Numpad8":        keybd_event.VK_KP8,
	"Numpad9":        keybd_event.VK_KP9,
	"PageUp":         keybd_event.VK_PAGEUP,
	"PageDown":       keybd_event.VK_PAGEDOWN,
	"End":            keybd_event.VK_END,
	"Home":           keybd_event.VK_HOME,
	"ArrowLeft":      keybd_event.VK_LEFT,
	"ArrowUp":        keybd_event.VK_UP,
	"ArrowRight":     keybd_event.VK_RIGHT,
	"ArrowDown":      keybd_event.VK_DOWN,
	"PrintScreen":    keybd_event.VK_PRINT,
	"Insert":         keybd_event.VK_INSERT,
	"Delete":         keybd_event.VK_DELETE,
	"Help":           keybd_event.VK_HELP,
	"BrowserBack":    keybd_event.VK_BACK,
	"Pause":          keybd_event.VK_PAUSE,
	"Lang1":          keybd_event.VK_HANGUEL,
	"Lang2":          keybd_event.VK_HANJA,
}
