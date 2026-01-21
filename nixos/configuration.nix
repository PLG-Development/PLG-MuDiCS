{
  inputs,
  config,
  pkgs,
  ...
}: {
  imports = [
    inputs.home-manager.nixosModules.default
    ./hardware-configuration.nix
  ];

  ## System Config

  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  hardware.steam-hardware.enable = true;

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

  networking.hostName = "mudics";

  environment.systemPackages = with pkgs; [
    # Programs
    libreoffice
    ungoogled-chromium
    xfce.thunar-archive-plugin
    git
    nushell
    unzip
    iputils
    xreader
    tree
    jq

    # Libraries
    imagemagick
    ffmpeg
    ghostscript
  ];

  home-manager.users.mudics = {
    xfconf.settings = {
      xfce4-power-manager."xfce4-power-manager/dpms-enabled" = false;
      xfce4-screensaver."saver/enabled" = false;
      displays.Notify = 0; # disable popup when connecting new display
    };

    home.stateVersion = "25.05";
  };

  systemd.services.update-mudics = {
    wantedBy = ["multi-user.target"];
    after = ["network-online.target"];
    wants = ["network-online.target"];
    path = config.environment.systemPackages;
    script = "nu ${./update.nu}";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/mudics";
      User = "mudics";
      Type = "oneshot";
    };
  };

  systemd.services.run-mudics = {
    wantedBy = ["default.target"];
    after = ["update-mudics.service" "graphical.target"];
    wants = ["graphical.target"];
    path = config.environment.systemPackages;
    script = "./plg-mudics-display";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/mudics";
      User = "mudics";
      Type = "simple";
    };
    environment = {
      DISPLAY = ":0";
      XDG_RUNTIME_DIR = "/run/user/1000";
      XDG_DATA_DIRS = "/run/current-system/sw/share";
    };
  };

  systemd.services.build-mudics-system = {
    wantedBy = ["default.target"];
    after = ["update-mudics.service"];
    path = with pkgs; [nixos-rebuild];
    script = "nixos-rebuild boot --flake .#mudics";
    serviceConfig = {
      WorkingDirectory = "/home/mudics/mudics/nixos";
    };
  };

  systemd.services.enable-wol = {
    wantedBy = ["multi-user.target"];
    after = ["network.target"];
    path = with pkgs; [ethtool nushell];
    script = "nu ${./wol.nu}";
    serviceConfig = {
      Type = "oneshot";
      User = "root";
    };
  };

  systemd.tmpfiles.rules = [
    "d /home/mudics/mudics 0755 mudics - -"
  ];

  networking.firewall = {
    enable = true;
    allowedTCPPorts = [
      1323 # display
      8080 # control
    ];
  };
}
