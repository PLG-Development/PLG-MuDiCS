import { notifications } from "./stores/notification";
import { to_display_status, type DisplayStatus, type FolderElement, type RequestResponse, type ShellCommandResponse, type TreeElement } from "./types";
import { get_uuid } from "./utils";

export async function get_screenshot(ip: string): Promise<Blob | null> {
    const options = { method: 'PATCH' };
    const response = await request_display(ip, '/takeScreenshot', options);
    if (!response.ok || !response.blob) return null;
    return response.blob;
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
    await request_display(ip, '/keyboardInput', options);
}

export async function show_html(ip: string, html: string) {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            html: html
        })
    };
    await request_display(ip, '/showHTML', options);
}

export async function get_file_data(ip: string, path: string): Promise<FolderElement[] | null> {
    interface FileInfo {
        name: string;
        type: string;
        size: string;
        created: string;
    }
    const command = `cd ".${path}" && find . -maxdepth 1 -mindepth 1 -print0 | while IFS= read -r -d '' f; do
        typ=$(file -b --mime-type -- "$f")
        size=$(stat -c '%s' -- "$f")
        created=$(stat -c '%w' -- "$f")
        [ "$created" = "-" ] && created=$(stat -c '%y' -- "$f")
        jq -n --arg name "$f" --arg type "$typ" --arg size "$size" --arg created "$created" \
            '{name:$name, type:$type, size:($size|tostring), created:$created}' | tr -d '\n'
        echo
        done
    `
    const raw_response = await run_shell_command(ip, command);
    if (!raw_response.ok || !raw_response.json) return null;
    const json_response = raw_response.json as ShellCommandResponse;
    if (json_response.exitCode === 0 && json_response.stdout.trim() === '') return [];
    if (handle_shell_error(ip, json_response, command, true)) return null;

    const response: FileInfo[] = json_response.stdout.trim()
        .split("\n")
        .filter(Boolean)
        .map((line: string) => JSON.parse(line) as FileInfo);

    const folder_element_list: FolderElement[] = [];

    for (const response_element of response) {
        // filter hidden files (start with '.' -> './.config')
        if (response_element.name.charAt(2) !== '.') {
            const truncated = {
                ...response_element,
                created: response_element.created.slice(0, 16) // truncated to YYYY-MM-DD hh-mm -> no (milli)seconds
            };

            const folder_element: FolderElement = {
                id: get_uuid(),
                hash: JSON.stringify(truncated),
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
    const command = `cd ".${path}" && tree -Js`
    const raw_response = await run_shell_command(ip, command);

    if (!raw_response.ok || !raw_response.json) return null;
    const json_response = raw_response.json as ShellCommandResponse;
    if (handle_shell_error(ip, json_response, command, true)) return null;

    return (JSON.parse(json_response.stdout.trim()) as [TreeElement, any])[0].contents || null;
}

export async function create_folders(ip: string, path: string, folder_names: string[]): Promise<void> {
    let command = `cd ".${path}"`;

    for (const part of folder_names) {
        command += ` && mkdir "${part}" && cd "${part}/"`;
    }

    const raw_response = await run_shell_command(ip, command);
    if (!raw_response.ok || !raw_response.json) return;
    const json_response = raw_response.json as ShellCommandResponse;
    handle_shell_error(ip, json_response, command, true);
}

export async function delete_files(ip: string, current_path: string, file_names: string[]) {
    let command: string = `cd ".${current_path}"`;
    for (const file_name of file_names) {
        command += ` && rm -r "${file_name}"`;
    }
    await run_shell_command(ip, command);
    const raw_response = await run_shell_command(ip, command);
    if (!raw_response.ok || !raw_response.json) return;
    const json_response = raw_response.json as ShellCommandResponse;
    handle_shell_error(ip, json_response, command, true);
}


export async function show_blackscreen(ip: string): Promise<void> {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            html: ``
        })
    };
    await request_display(ip, '/showHTML', options);
}

export async function get_thumbnail_blob(ip: string, path_to_file: string): Promise<Blob | null> {
    const raw_response = await request_display(ip, `/file/preview${path_to_file}`, { method: 'GET' }, [415]);
    if (!raw_response.ok || !raw_response.blob) return null
    return raw_response.blob;
}

export async function ping_ip(ip: string): Promise<DisplayStatus> {
    const raw_response = await request_control(`/ping?ip=${ip}`, { method: 'GET' });
    if (!raw_response.ok || !raw_response.json) return null;
    return raw_response.json.status ? to_display_status(raw_response.json.status) : null;
}



async function request_display(ip: string, api_route: string, options: { method: string, headers?: Record<string, string>, body?: any }, supress_error_handling_http_codes: number[] = []): Promise<RequestResponse> {
    const url = `http://${ip}:1323/api${api_route}`;
    return await request(url, options, supress_error_handling_http_codes);
}

async function request_control(api_route: string, options: { method: string, headers?: Record<string, string>, body?: any }): Promise<RequestResponse> {
    const url = `${window.location.origin}/api${api_route}`;
    return await request(url, options);
}


async function request(url: string, options: { method: string, headers?: Record<string, string>, body?: any }, supress_error_handling_http_codes: number[] = []): Promise<RequestResponse> {
    try {
        const cache_buster = `${url.includes('?') ? '&' : '?'}=${Date.now()}`;
        console.log(url + cache_buster, options.body ?? null);
        const response = await fetch(url + cache_buster, options);
        if (response.ok || supress_error_handling_http_codes.includes(response.status)) {
            const contentType = response.headers.get("content-type") || "";
            let request_response: RequestResponse;
            if (!contentType.includes("application/json")) {
                const blob: Blob = await response.blob();
                request_response = { ok: response.ok, http_code: response.status, blob: blob };
            } else {
                const json: Object = await response.json();
                request_response = { ok: response.ok, http_code: response.status, json: json };
            }
            console.log(request_response);
            return request_response;
        }

        let error_description: string;
        try {
            const json: { description: string } = await response.json();
            error_description = json.description;
        } catch (error_on_json_parsing: any) {
            error_description = `unknown error: ${error_on_json_parsing}`;
        }
        console.error(url, error_description);
        notifications.push("error", `Fehler ${response.status} bei API-Anfrage`, `${url}\nFehler: ${error_description}`);
    } catch (error: any) {
        if (error instanceof TypeError && /fetch|NetworkError/i.test(error.message)) {
            console.log("Request failed - Is the targeted device online?")
        } else {
            console.error(url, error);
            notifications.push("error", `Fataler Fehler bei API-Anfrage`, `${url}\nFehler: ${error}`);
        }
    }
    return { ok: false };
}




function handle_shell_error(ip: string, shell_response: ShellCommandResponse, shell_command: string, command_includs_cd: boolean): boolean {
    if (shell_response.exitCode !== 0) {
        if (command_includs_cd && shell_response.stderr && /bash: line \d+: cd: .+: No such file or directory/.test(shell_response.stderr)) {
            console.log("current file_path does not exist on display:", ip);
            return true;
        }
        console.error(shell_response);
        notifications.push("error", `Fehler ${shell_response.exitCode} in API-Shell`, `${ip}\n${shell_command}\nFehler: ${shell_response.stderr}`);
        return true;
    }
    if (shell_response.stdout.trim() === '') return true;
    return false;
}

async function run_shell_command(ip: string, command: string): Promise<RequestResponse> {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            command: command
        })
    };
    return await request_display(ip, '/shellCommand', options);
}