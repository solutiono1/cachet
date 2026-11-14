import { describe, expect, it } from 'vitest';
import encodeQR from '@paulmillr/qr';
import decodeQR from '@paulmillr/qr/decode.js';
import { modulesToPath, readablePart, shortenPayload, splitLink } from './link.js';

const LINK = 'https://cachet.example/pay/#zH4sIAAAAAAAAA6tWKkktLsnMS1eyUjI0MjYxNTM3';

describe('showing a long link', () => {
	it('keeps the readable part whole and the payload separate', () => {
		const { head, tail } = splitLink(LINK);
		expect(head).toBe('https://cachet.example/pay/#');
		expect(tail).toBe('zH4sIAAAAAAAAA6tWKkktLsnMS1eyUjI0MjYxNTM3');
		expect(readablePart(LINK)).toBe('cachet.example/pay/#');
	});

	it('copes with a link that has no fragment at all', () => {
		expect(splitLink('https://cachet.example/pay/')).toEqual({
			head: 'https://cachet.example/pay/',
			tail: ''
		});
		expect(shortenPayload('')).toBe('');
	});

	it('shortens a long payload and leaves a short one alone', () => {
		expect(shortenPayload('zH4sIAAAAAAAAA6tWKkktLsnMS1eyUjI0MjYxNTM3')).toBe('zH4sIAA…YxNTM3');
		expect(shortenPayload('abcdef')).toBe('abcdef');
	});

	/* Shortening is for the eye only. The link that gets copied, shared and
	   encoded into the QR code is always the whole thing. */
	it('never claims to shorten the value that gets sent', () => {
		const shown = readablePart(LINK) + shortenPayload(splitLink(LINK).tail);
		expect(shown.length).toBeLessThan(LINK.length);
		expect(LINK).toContain(splitLink(LINK).tail);
	});
});

describe('drawing a QR code', () => {
	it('merges a run of dark modules into one bar', () => {
		const matrix = [[true, true, true]];
		expect(modulesToPath(matrix)).toBe('M0 0h3v1h-3z');
	});

	it('breaks a row at every gap and places each row at its own y', () => {
		const matrix = [
			[true, false, true, true],
			[false, true, false, false]
		];
		expect(modulesToPath(matrix)).toBe('M0 0h1v1h-1zM2 0h2v1h-2zM1 1h1v1h-1z');
	});

	it('closes a run that reaches the end of a row', () => {
		expect(modulesToPath([[false, true, true]])).toBe('M1 0h2v1h-2z');
	});

	it('draws nothing for an empty or absent matrix', () => {
		expect(modulesToPath([])).toBe('');
		expect(modulesToPath(null)).toBe('');
		expect(modulesToPath([[false, false]])).toBe('');
	});
});

describe('a pay link as a QR code', () => {
	/* A link the length of a real one: an origin plus a 347 character
	   fragment, which is longer than any invoice Cachet has produced. */
	const fragment =
		'z' +
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'.repeat(5) +
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const link = `https://cachet-app.pages.dev/pay/#${fragment}`;

	/* The settings the Qr component uses. */
	const options = { ecc: 'low', encoding: 'byte', border: 3 };

	it('encodes a full length link and reads back exactly the same link', () => {
		const matrix = encodeQR(link, 'raw', options);

		/* Blow the modules up the way a screen does, then read the pixels
		   back, so this tests what a phone camera would actually see. */
		const scale = 4;
		const side = matrix.length * scale;
		const data = new Uint8Array(side * side * 4);
		for (let y = 0; y < side; y++) {
			for (let x = 0; x < side; x++) {
				const value = matrix[(y / scale) | 0][(x / scale) | 0] ? 0 : 255;
				const at = (y * side + x) * 4;
				data[at] = data[at + 1] = data[at + 2] = value;
				data[at + 3] = 255;
			}
		}

		expect(decodeQR({ height: side, width: side, data })).toBe(link);
	});

	it('draws every dark module and nothing else', () => {
		const matrix = encodeQR(link, 'raw', options);
		const dark = matrix.flat().filter(Boolean).length;
		const covered = [...modulesToPath(matrix).matchAll(/h(\d+)v1/g)].reduce(
			(sum, match) => sum + Number(match[1]),
			0
		);
		expect(covered).toBe(dark);
	});

	/* Density is what decides whether a phone can lock on. Much past this and
	   the modules get too small to read on a screen. */
	it('stays under 80 modules across, so a camera can resolve it', () => {
		expect(encodeQR(link, 'raw', options).length).toBeLessThanOrEqual(79);
	});
});
