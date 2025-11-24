<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { StarterKit } from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import {
		Baseline,
		Bold,
		Code,
		Highlighter,
		Italic,
		PaintBucket,
		QrCode,
		Strikethrough
	} from 'lucide-svelte';
	import Button from './Button.svelte';
	import { run_on_all_selected_displays } from '../ts/stores/displays';
	import { show_html } from '../ts/api_handler';
	import { get_selectable_color_classes } from '../ts/stores/ui_behavior';
	import { TextStyle } from '@tiptap/extension-text-style';
	import { Color } from '@tiptap/extension-text-style';
	import Highlight from '@tiptap/extension-highlight';

	type TextEditOption = {
		onclick: () => void;
		is_selected: () => boolean;
		icon: typeof Bold;
		title: string;
		color?: ColorElement;
	};

	type ColorElement = {
		color_string: () => string;
		color_picker: () => void;
	};

	type ColorState = {
		el: HTMLInputElement | null;
		value: string;
	};

	let element = $state<HTMLElement>();
	let editor_state = $state<{ editor: Editor | null }>({ editor: null });

	let color_states: { text: ColorState; highlight: ColorState; bg: ColorState } = $state({
		text: { el: null, value: '#b91c1c' },
		highlight: { el: null, value: '#0c4a6e' },
		bg: { el: null, value: '#1c1917' }
	});

	const text_edit_options: TextEditOption[][] = [
		[
			{
				onclick: () => editor_state.editor?.chain().focus().toggleBold().run(),
				is_selected: () => editor_state.editor?.isActive('bold') ?? false,
				title: 'Fett (STRG+B)',
				icon: Bold
			},
			{
				onclick: () => editor_state.editor?.chain().focus().toggleItalic().run(),
				is_selected: () => editor_state.editor?.isActive('italic') ?? false,
				title: 'Kursiv (STRG+I)',
				icon: Italic
			},
			{
				onclick: () => editor_state.editor?.chain().focus().toggleStrike().run(),
				is_selected: () => editor_state.editor?.isActive('strike') ?? false,
				title: 'Durchgestrichen',
				icon: Strikethrough
			},
			{
				onclick: () => {},
				is_selected: () => false,
				title: 'QR-Code anfügen',
				icon: QrCode
			}
		],
		[
			{
				onclick: () => editor_state.editor?.chain().focus().setColor(color_states.text.value).run(),
				is_selected: () =>
					editor_state.editor?.isActive('textStyle', { color: color_states.text.value }) ?? false,
				icon: Baseline,
				title: 'Textfarbe',
				color: get_color_element(color_states.text)
			},
			{
				onclick: () =>
					editor_state.editor
						?.chain()
						.focus()
						.toggleHighlight({ color: color_states.highlight.value })
						.run(),
				is_selected: () =>
					editor_state.editor?.isActive('highlight', { color: color_states.highlight.value }) ??
					false,
				icon: Highlighter,
				title: 'Markierungsfarbe',
				color: get_color_element(color_states.highlight)
			},
			{
				onclick: () => color_states.bg.el?.click(),
				is_selected: () => false,
				title: 'Hintergrundfarbe',
				icon: PaintBucket
			}
		]
	];

	function get_color_element(color_state: ColorState) {
		return {
			color_string: () => color_state.value,
			color_picker: () => color_state.el?.click()
		};
	}

	function show_text() {
		const html =
			editor_state.editor?.getHTML() +
			`<style>:root {--background-color: ${color_states.bg.value} !important;}</style>`;
		run_on_all_selected_displays(show_html, true, html);
	}

	onMount(() => {
		editor_state.editor = new Editor({
			element: element,
			extensions: [
				StarterKit,
				Placeholder.configure({
					placeholder: 'Text hier eingeben ...'
				}),
				TextStyle,
				Color,
				Highlight.configure({
					multicolor: true
				})
			],
			content: '',
			onTransaction: ({ editor }) => {
				// Increment the state signal to force a re-render
				editor_state = { editor };
			},
			autofocus: true
		});
	});
	onDestroy(() => {
		editor_state.editor?.destroy();
	});
</script>

{#each Object.values(color_states) as color_state}
	<input type="color" bind:this={color_state.el} bind:value={color_state.value} class="hidden" />
{/each}

<div class="flex flex-row gap-2 size-full">
	<div
		class="rounded-xl size-full flex-shrink min-w-0 flex"
		style="background-color: {color_states.bg.value};"
	>
		<div bind:this={element} class="size-full overflow-auto px-3 py-2"></div>
	</div>

	<div class="flex flex-col gap-2 justify-between">
		<div class="flex flex-col gap-2">
			{#each text_edit_options as edit_row}
				<div class="flex flex-row gap-1">
					{#each edit_row as option}
						<div class="flex flex-row">
							<button
								title={option.title}
								onclick={option.onclick}
								class="p-1 {option.color
									? 'rounded-l-xl'
									: 'rounded-xl'} cursor-pointer duration-200 transition-colors {get_selectable_color_classes(
									option.is_selected(),
									{
										bg: true,
										hover: true,
										active: true,
										text: true
									},
									-100,
									50
								)}"
							>
								{#if option.icon}
									{@const Icon = option.icon}
									<Icon class="h-7 w-7" />
								{/if}
							</button>
							{#if option.color}
								<button
									aria-label="Color"
									onclick={option.color.color_picker}
									title={option.title}
									class="flex p-1 rounded-r-xl cursor-pointer duration-200 transition-colors justify-center items-center {get_selectable_color_classes(
										option.is_selected(),
										{
											bg: true,
											hover: true,
											active: true,
											text: true
										},
										-100,
										50
									)}"
								>
									<span
										class="h-7 w-3 rounded-full"
										style="background-color: {option.color.color_string()};"
									></span>
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>

		<Button click_function={show_text} className="w-full font-bold">Text anzeigen</Button>
	</div>
</div>

<style>
	:global(.tiptap) {
		width: 100%;
		height: 100%;
		--tw-outline-style: none;
		outline-style: none;
	}

	:global(.tiptap ul),
	:global(.tiptap ol) {
		padding-left: 1.5rem;
	}

	:global(.tiptap ul) {
		list-style: disc;
	}

	:global(.tiptap ol) {
		list-style: decimal;
	}

	:global(.tiptap p) {
		margin-bottom: 0.5rem;
	}
	:global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		pointer-events: none;
		color: oklch(44.4% 0.011 73.639);
		float: left;
		height: 0;
		opacity: 0.7;
	}
</style>
