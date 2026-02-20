{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11-small";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    pkgs = nixpkgs.legacyPackages."x86_64-linux";
  in {
    devShells."x86_64-linux".default = pkgs.mkShell {
      packages = with pkgs; [
        gcc
        libreoffice
        ungoogled-chromium
        imagemagick
        ffmpeg
        gnome-screenshot

        playwright-driver.browsers
      ];

      PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "true";
      PW_DISABLE_TS_ESM = "true";
    };
  };
}
