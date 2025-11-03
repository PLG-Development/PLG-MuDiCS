#!/usr/bin/env nu

let file_path = "version.json"
if not ($file_path | path exists) {
    { "version": ""} | to json | save version.json
}

let current_version = open $file_path | get version

let new_version = http get https://api.github.com/repos/PLG-Development/PLG-MuDICS/releases/latest | get tag_name
# { "version": $new_version} | to json | save version.json -f

if $current_version == $new_version {
    exit 0
}

let new_major_version = get_major_version $new_version
let current_major_version = get_major_version $current_version

if $new_major_version != $current_major_version {
    direct_update
} else {
    minor_update
}

def get_major_version [version: string] {
    $version | str trim --left --char "v" | split row "." | first
}

def direct_update [] {
    print "Direct update"
}

def minor_update [] {
    print "Minor update"
}