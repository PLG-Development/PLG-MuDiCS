import { notifications } from "./stores/notification";
import { to_display_status, type DisplayStatus, type FolderElement, type TreeElement } from "./types";
import { get_uuid } from "./utils";

export async function get_screenshot(ip: string) {
    const options = { method: 'PATCH' };
    return await request_display(ip, '/takeScreenshot', options);
}

export async function open_file(ip: string, path_to_file: string): Promise<void> {
    const options = { method: 'PATCH', headers: { 'content-type': 'application/octet-stream' } };
    await request_display(ip, `/file${path_to_file}`, options);
}

export async function send_keyboard_input(ip: string, key: string): Promise<void> {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            key: key,
        }),
    };
    console.log(options)
    await request_display(ip, '/keyboardInput', options);
}

export async function get_file_data(ip: string, path: string): Promise<FolderElement[]> {
    interface FileInfo {
        name: string;
        type: string;
        size: string;
        created: string;
    }

    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            command: `cd ".${path}" && find . -maxdepth 1 -mindepth 1 -print0 | while IFS= read -r -d '' f; do
  typ=$(file -b --mime-type -- "$f")
  size=$(stat -c '%s' -- "$f")
  created=$(stat -c '%w' -- "$f")
  [ "$created" = "-" ] && created=$(stat -c '%y' -- "$f")
  jq -n --arg name "$f" --arg type "$typ" --arg size "$size" --arg created "$created" \
    '{name:$name, type:$type, size:($size|tostring), created:$created}' | tr -d '\n'
  echo
done
` })
    };
    const raw_response = await request_display(ip, '/shellCommand', options);
    if (!raw_response) return [];
    const response: FileInfo[] = raw_response.stdout.trim()
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line) as FileInfo);

    const folder_element_list: FolderElement[] = [];

    for (const response_element of response) {
        // filter hidden files (start with '.' -> './.config')
        if (response_element.name.charAt(2) !== '.') {
            const folder_element: FolderElement = {
                id: get_uuid(),
                hash: JSON.stringify(response),
                thumbnail_url: null,
                name: response_element.name.slice(2), // remove "./"
                type: response_element.type,
                date_created: new Date(response_element.created),
                size: Number(response_element.size),
            };
            folder_element_list.push(folder_element);
        }
    }
    return folder_element_list;
}

export async function get_file_tree_data(ip: string, path: string): Promise<TreeElement[] | null> {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            command: `cd ".${path}" && tree -Js`
        })
    };
    const raw_response = await request_display(ip, '/shellCommand', options);
    if (!raw_response) return null;
    const tree_structure: TreeElement[] | null = (JSON.parse(raw_response.stdout.trim()) as [TreeElement, any])[0].contents || null;
    return tree_structure;
}


export async function show_blackscreen(ip: string) {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            html: `<div style="width:100dvw; height:100dvh; background-color:black;"></div>`
        })
    };
    await request_display(ip, '/showHTML', options);
}


export async function ping_ip(ip: string): Promise<DisplayStatus> {
    const raw_response = await request_control(`/ping?ip=${ip}`, { method: 'GET' });
    if (!raw_response) return null;
    return raw_response.status ? to_display_status(raw_response.status) : null;
}




async function request_display(ip: string, api_route: string, options: { method: string, headers?: Record<string, string>, body?: any }): Promise<null | any> {
    const url = `http://${ip}:1323/api${api_route}`;
    return await raw_request(url, options);
}

async function request_control(api_route: string, options: { method: string, headers?: Record<string, string>, body?: any }): Promise<null | any> {
    const url = `${window.location.origin}/api${api_route}`;
    return await raw_request(url, options);
}


async function raw_request(url: string, options: { method: string, headers?: Record<string, string>, body?: any }): Promise<null | any> {
    try {
        const cache_buster = `${url.includes('?') ? '&' : '?'}=${Date.now()}`;
        console.log(url + cache_buster)
        const response = await fetch(url + cache_buster, options);
        if (!response.ok) {
            console.error(`HTTP error! Status: ${response.status}`);
            notifications.push("error", `HTTP-Fehler bei API-Anfrage`, `${url}\nHTTP-Status: ${response.status}`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
            return await response.blob();
        } else {
            const json = await response.json();
            if (json.error && json.error !== '') {
                notifications.push("error", `Interner Fehler bei API-Anfrage`, `${url}\nJSON: ${JSON.stringify(json)}`);
            }
            return json;
        }
    } catch (error: any) {
        if (error instanceof TypeError && /fetch|NetworkError/i.test(error.message)) {
            console.log("Request failed - Is the targeted device online?")
        } else {
            console.log(typeof error, error instanceof TypeError, error.message);
            console.error(error);
            notifications.push("error", `Fehler bei API-Anfrage`, `${url}\nFehler: ${error}`);
        }
        return null;
    }
}