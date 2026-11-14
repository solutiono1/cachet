/* Presenting a long link, and drawing a QR code for it.
 *
 * A Cachet link carries its whole payload in the fragment, after the #,
 * because there is no server to keep it on. That makes links long. These are
 * the pure parts of showing one tidily, kept out of the component so they can
 * be tested without a browser.
 */

/**
 * Split a link into the part worth reading and the sealed part.
 * Everything up to and including the # is readable; the rest is the payload.
 */
export function splitLink(value) {
	const text = String(value ?? '');
	const at = text.indexOf('#');
	if (at === -1) return { head: text, tail: '' };
	return { head: text.slice(0, at + 1), tail: text.slice(at + 1) };
}

/** Drop the scheme, which nobody needs to read. */
export function readablePart(value) {
	return splitLink(value).head.replace(/^https?:\/\//, '');
}

/**
 * Shorten the payload to its first and last few characters.
 * Short payloads are left alone, because hiding nothing helps nobody.
 */
export function shortenPayload(tail, lead = 7, trail = 6) {
	const text = String(tail ?? '');
	if (text.length <= lead + trail + 3) return text;
	return `${text.slice(0, lead)}…${text.slice(-trail)}`;
}

/**
 * Turn a QR matrix into one SVG path.
 *
 * Each row of dark modules becomes a single horizontal bar rather than one
 * square per module, so a dense code is a few hundred path commands instead
 * of several thousand elements. Coordinates are whole module units; the
 * viewBox does the scaling, which keeps the edges sharp at any size.
 */
export function modulesToPath(matrix) {
	if (!Array.isArray(matrix) || !matrix.length) return '';
	const parts = [];
	for (let y = 0; y < matrix.length; y++) {
		const row = matrix[y];
		if (!Array.isArray(row)) continue;
		let run = 0;
		for (let x = 0; x <= row.length; x++) {
			if (row[x]) {
				run += 1;
				continue;
			}
			if (run) {
				parts.push(`M${x - run} ${y}h${run}v1h-${run}z`);
				run = 0;
			}
		}
	}
	return parts.join('');
}
