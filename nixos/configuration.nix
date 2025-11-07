{
  config,
  pkgs,
  ...
}: {
  imports = [
    ./hardware-configuration.nix
  ];

  ## System Config

  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  networking.networkmanager.enable = true;

  nix.settings.experimental-features = ["nix-command" "flakes"];

  time.timeZone = "Europe/Berlin";

  i18n.defaultLocale = "en_US.UTF-8";
  i18n.extraLocaleSettings = {
    LC_ADDRESS = "de_DE.UTF-8";
    LC_IDENTIFICATION = "de_DE.UTF-8";
    LC_MEASUREMENT = "de_DE.UTF-8";
    LC_MONETARY = "de_DE.UTF-8";
    LC_NAME = "de_DE.UTF-8";
    LC_NUMERIC = "de_DE.UTF-8";
    LC_PAPER = "de_DE.UTF-8";
    LC_TELEPHONE = "de_DE.UTF-8";
    LC_TIME = "de_DE.UTF-8";
  };

  services.xserver.enable = true;

  services.xserver.displayManager.lightdm.enable = true;
  services.xserver.desktopManager.xfce.enable = true;

  services.xserver.xkb = {
    layout = "de";
    variant = "";
  };

  console.keyMap = "de";

  services.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  users.users.mudics = {
    isNormalUser = true;
    description = "mudics";
    extraGroups = ["networkmanager" "wheel"];
  };

  nixpkgs.config.allowUnfree = true;

  system.stateVersion = "25.05"; # Don't change

  ## User Config

  programs.nix-ld = {
    enable = true;
    libraries = with pkgs; [
      stdenv.cc.cc
      zlib
    ];
  };

  services.displayManager.autoLogin = {
    enable = true;
    user = "mudics";
  };

  networking.hostName = "plg-mudics";

  environment.systemPackages = with pkgs; [
    # Programs
    libreoffice
    #rustdesk
    ungoogled-chromium
    xfce.thunar-archive-plugin
    git
    nushell
    unzip

    # Libraries
    imagemagick
    ffmpeg
    ghostscript
  ];

  systemd.services.update-mudics = {
    wantedBy = ["multi-user.target"];
    after = ["network-online.target"];
    script = "nu ${./update.sh}";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/plg-mudics";
      User = "mudics";
      Group = "mudics";
    };
  };

  systemd.services.run-mudics = {
    after = ["update-mudics.service" "graphical.target"];
    script = "./plg-mudics-display";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/plg-mudics";
      User = "mudics";
      Group = "mudics";
    };
  };

  systemd.services.build-system = {
    after = ["update-mudics.service"];
    script = "nixos-rebuild switch --flake .#plg-mudics";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/plg-mudics";
    };
  };

  systemd.tmpfiles.rules = [
    "d /home/mudics/plg-mudics/ 0755 -"
  ];
}
