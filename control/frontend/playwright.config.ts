import { defineConfig } from '@playwright/test';

export default defineConfig({
	fullyParallel: true,
	webServer: {
		command: 'deno task build && deno task preview',
		port: 4173
	},
	testDir: 'e2e'
});
