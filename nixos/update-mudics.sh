#!/usr/bin/env nu

print "Checking for new version of PLG-MuDiCS Display..."
try {
    if (new_version_available) {
        print "New version available. Trying to update ..."

        let temp_file_path = get_new_file
        chmod +x $temp_file_path
        mv $temp_file_path plg-mudics-display
    }
} catch {
    print "Failed to check or update PLG-MuDiCS Display"
}

def get_new_file [] {
    let temp_file_path = (mktemp "plg-mudics-display-XXXXXX")
    http get https://github.com/PLG-Development/PLG-MuDiCS/releases/latest/download/plg-mudics-display --max-time 5sec | save -p -f $temp_file_path
    $temp_file_path
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