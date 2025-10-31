import type { FolderElement } from "./types";
import { get_uuid } from "./utils";

interface FileInfo {
    name: string;
    type: string;
    size: string;
    created: string;
}

export async function get_file_data(ip: string, path: string): Promise<FolderElement[]> {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            command: `cd .${path} && find . -maxdepth 1 -mindepth 1 -print0 | while IFS= read -r -d '' f; do
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
    const raw_response = await request(ip, '/shellCommand', options);
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
                thumbnail: null,
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




async function request(ip: string, api_route: string, options: { method: string, headers?: Record<string, string>, body?: any }): Promise<any | null> {
    try {
        const url = `http://${ip}:1323/api${api_route}`;
        console.log(url)
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}