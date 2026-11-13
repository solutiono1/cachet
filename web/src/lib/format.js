/* Turning machine values into something a person reads, and back. */

import { TOKEN } from './config.js';

/** "250000000" -> "250.00" */
export function formatAmount(raw, decimals = TOKEN.decimals) {
	const value = BigInt(raw ?? 0);
	const unit = 10n ** BigInt(decimals);
	const whole = value / unit;
	const fraction = (value % unit).toString().padStart(decimals, '0').slice(0, 2);
	return `${whole.toLocaleString('en-US')}.${fraction}`;
}

/** "250.5" -> "250500000". Throws on anything that is not a clean number. */
export function parseAmount(text, decimals = TOKEN.decimals) {
	const trimmed = String(text).trim().replace(/,/g, '');
	if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error('Enter an amount like 250 or 250.50');
	const [whole, fraction = ''] = trimmed.split('.');
	if (fraction.length > decimals) {
		throw new Error(`${TOKEN.symbol} has at most ${decimals} decimal places.`);
	}
	const raw = `${whole}${fraction.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '');
	if (BigInt(raw) <= 0n) throw new Error('Enter an amount greater than zero.');
	return raw;
}

/** Shorten a long identifier in the middle, keeping both ends readable. */
export function shorten(text, head = 8, tail = 6) {
	if (!text || text.length <= head + tail + 1) return text ?? '';
	return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

/** NEAR block timestamps are nanoseconds. */
export function formatTimestamp(nanoseconds) {
	if (!nanoseconds) return '';
	const ms = Number(BigInt(nanoseconds) / 1000000n);
	return new Date(ms).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatDate(value) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function today() {
	return new Date().toISOString().slice(0, 10);
}

/** A date some months ahead, for proof expiry defaults. */
export function monthsFromNow(months) {
	const date = new Date();
	date.setMonth(date.getMonth() + months);
	return date.toISOString().slice(0, 10);
}
