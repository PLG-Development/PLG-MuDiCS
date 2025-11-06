#!/usr/bin/env nu

print "Checking for new version of PLG-MuDiCS ..."
if (new_version_available) {
    print "New version available. Trying to update ..."

    try {
        get_new_display_file
        get_new_nixos_config
    } catch { |err|
        print "Failed to check or update PLG-MuDiCS"
        print $err.msg
    }
}

print "Done"

def get_new_nixos_config [] {
    let temp_folder_path = (mktemp -d "nixos-temp-XXXXXX")
    let temp_file_path = (mktemp "nixos-temp-XXXXXX")
    let nixos_config_path = "nixos"

    http get https://github.com/PLG-Development/PLG-MuDiCS/releases/latest/download/nixos.zip --max-time 5sec | save -p -f $temp_file_path

    unzip $temp_file_path -d $temp_folder_path
    rm -rf $nixos_config_path
    mv $temp_folder_path $nixos_config_path

    rm $temp_file_path
}

def get_new_display_file [] {
    let temp_file_path = (mktemp "display-temp-XXXXXX")

    http get https://github.com/PLG-Development/PLG-MuDiCS/releases/latest/download/plg-mudics-display --max-time 5sec | save -p -f $temp_file_path

    chmod +x $temp_file_path
    mv $temp_file_path plg-mudics-display
}

def new_version_available [] {
    let file_path = "version.json"
    if not ($file_path | path exists) {
        { "version": ""} | to json | save version.json
    }

    let current_version = open $file_path | get version

    let new_version = http get https://api.github.com/repos/PLG-Development/PLG-MuDICS/releases/latest --max-time 5sec | get tag_name
    { "version": $new_version} | to json | save version.json -f

    if $current_version == $new_version {
        false
    } else {
        true
    }
}