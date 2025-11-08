# Contributing

## Development

### Architecture

The software suite comprises two main components that are designed to work together on the same network.
The _Display Block_ is responsible for displaying content on a monitor.
The _Control Block_ controls multiple Display Blocks via a user interface. One Display Block can be controlled by multiple Control Blocks.

- `control/`: Go code for the Control Block.
  - `frontend/`: The actual frontend written in SvelteKit.
- `display/`: Go code for the Display Block.
- `nixos/`: NixOS configuration for a self-updating, ready-to-use Linux system for the Display Block. This is not necessary for using PLG-MuDiCS.
- `shared/`: Shared code and assets for the Control and Display Block.

### Technologies

- **Go** for the base code in both the Control and Display Block.
- **SvelteKit** in prerender mode for the frontend of the Control Block.
- **TailwindCSS** for styling the frontend of the Control Block.
- **Chromium** browser for handling most media display in the Display Block and serving the frontend of the Control Block.
- **LibreOffice** for handling more complex documents in the Display Block.

### Requirements

- Go v1.25 or higher
- Deno v2

### Running

1. open the wanted folder of the block inside a terminal
2. run `go generate ./..` to generate files required at build time
3. run `go run *.go` to compile and run the block
