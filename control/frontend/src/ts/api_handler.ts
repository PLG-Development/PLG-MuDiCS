


export async function get_file_data(ip: string, path: string = './') {
    const options = {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: `{"command":"cd ${path} && find . -maxdepth 1 -mindepth 1 -print0 | while IFS= read -r -d \'\' f; do\n  typ=$(file -b --mime-type -- \"$f\")\n  size=$(stat -c \'%s\' -- \"$f\")\n  created=$(stat -c \'%w\' -- \"$f\")\n  [ \"$created\" = \"-\" ] && created=$(stat -c \'%y\' -- \"$f\")\n  jq -n --arg name \"$f\" --arg type \"$typ\" --arg size \"$size\" --arg created \"$created\" \'{name:$name, type:$type, size:($size|tonumber), created:$created}\' | tr -d \'\\n\'\n  echo\n done\n"}`
    };
    console.log(request(ip, '/shellCommand', options));
}




async function request(ip: string, api_route: string, options: { method: string, headers?: Record<string, string>, body?: string }) {
    try {
        const url = `http://${ip}:1323/api${api_route}`;
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}