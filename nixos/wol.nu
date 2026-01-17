#!/usr/bin/env nu

ls /sys/class/net | get name | path basename  | where $it != "lo" | each {|iface|
    print $"Enabling WoL on ($iface)..."
    try {
        ethtool -s $iface wol g
        print $"Successfully enabled WoL on ($iface)"
    } catch {
        print $"Failed to enable WoL on ($iface). It might not be supported."
    }
}
