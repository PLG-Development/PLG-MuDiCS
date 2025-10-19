import type { Component } from "lucide-svelte";

export type Display = {
    id: string;
    ip: string;
    mac: string;
    name: string;
    status: string;
}

export type DisplayGroup = {
    id: string;
    data: Display[];
};


export type MenuOption = {
    icon?: Component;
    name: string;
    on_select?: () => void;
    disabled?: boolean;
}