/* The palette has to be legible, not just pleasant. These tests read the
 * real values out of app.css and check every text pairing we actually use
 * against WCAG AA, in both themes. If a colour changes and a pairing stops
 * being readable, this fails instead of shipping. */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

/** Pull the variables out of one CSS block, by the selector that opens it. */
function blockVars(selector) {
	const at = css.indexOf(selector);
	if (at === -1) throw new Error(`No block in app.css opens with ${selector}`);
	const open = css.indexOf('{', at);
	const close = css.indexOf('}', open);
	const body = css.slice(open + 1, close);
	const vars = {};
	for (const [, name, value] of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
		vars[name] = value.trim();
	}
	return vars;
}

const wax = blockVars(':root {');
const paper = { ...wax, ...blockVars(":root[data-theme='paper']") };
const ink = { ...wax, ...blockVars(":root[data-theme='ink']") };

function channel(value) {
	const srgb = value / 255;
	return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
	const clean = hex.trim().replace('#', '');
	const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean;
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(foreground, background) {
	const a = luminance(foreground);
	const b = luminance(background);
	const [light, dark] = a > b ? [a, b] : [b, a];
	return (light + 0.05) / (dark + 0.05);
}

/* Pairings the interface really uses. Body text needs 4.5:1; large text and
   UI borders need 3:1. */
const pairs = [
	{ name: 'body text on the page', fg: 'text', bg: 'bg', min: 4.5 },
	{ name: 'body text on a card', fg: 'text', bg: 'surface', min: 4.5 },
	{ name: 'body text on a panel', fg: 'text', bg: 'raised', min: 4.5 },
	{ name: 'secondary text on the page', fg: 'muted', bg: 'bg', min: 4.5 },
	{ name: 'secondary text on a card', fg: 'muted', bg: 'surface', min: 4.5 },
	{ name: 'secondary text on a panel', fg: 'muted', bg: 'raised', min: 4.5 },
	{ name: 'links on the page', fg: 'accent-text', bg: 'bg', min: 4.5 },
	{ name: 'links on a card', fg: 'accent-text', bg: 'surface', min: 4.5 },
	{ name: 'the verified result on a card', fg: 'verified', bg: 'surface', min: 4.5 },
	{ name: 'a caution message on a card', fg: 'caution', bg: 'surface', min: 4.5 },
	{ name: 'labels on a card', fg: 'faint', bg: 'surface', min: 3 },
	{ name: 'labels on the page', fg: 'faint', bg: 'bg', min: 3 }
];

describe.each([
	['Paper', paper],
	['Ink', ink]
])('%s theme', (themeName, theme) => {
	it('defines every colour the interface asks for', () => {
		for (const key of ['bg', 'surface', 'raised', 'text', 'muted', 'faint', 'border']) {
			expect(theme[key], `${themeName} is missing --${key}`).toMatch(/^#[0-9a-f]{3,8}$/i);
		}
	});

	it.each(pairs)('$name is readable', ({ fg, bg, min }) => {
		const contrast = ratio(theme[fg], theme[bg]);
		expect(
			Number(contrast.toFixed(2)),
			`${themeName}: --${fg} on --${bg} is ${contrast.toFixed(2)}:1, below ${min}:1`
		).toBeGreaterThanOrEqual(min);
	});

	it('keeps white readable on the wax button', () => {
		const contrast = ratio('#ffffff', theme.wax);
		expect(Number(contrast.toFixed(2))).toBeGreaterThanOrEqual(4.5);
	});

	it('separates a card from the page it sits on', () => {
		expect(theme.surface).not.toBe(theme.bg);
	});
});
