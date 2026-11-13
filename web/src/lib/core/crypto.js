/* Cachet core cryptography.
 *
 * Everything here runs in the person's own browser. Nothing in this file
 * talks to a network. Signatures use @noble/curves (audited); hashing and
 * key derivation use the platform WebCrypto implementation.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { base58, base64urlnopad, hex } from '@scure/base';

const enc = new TextEncoder();

/** Web Crypto, in the browser and in Node. */
function subtle() {
	const c = globalThis.crypto;
	if (!c || !c.subtle) {
		throw new Error('This browser does not expose Web Crypto over a secure origin.');
	}
	return c.subtle;
}

export function randomBytes(n) {
	const out = new Uint8Array(n);
	globalThis.crypto.getRandomValues(out);
	return out;
}

export function utf8(s) {
	return enc.encode(s);
}

export function concat(...parts) {
	let total = 0;
	for (const p of parts) total += p.length;
	const out = new Uint8Array(total);
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

export async function sha256(...parts) {
	const digest = await subtle().digest('SHA-256', concat(...parts));
	return new Uint8Array(digest);
}

/**
 * HKDF-SHA256. `info` separates one derived value from another so that the
 * same seed can produce unrelated keys and salts.
 */
export async function hkdf(seed, info, length = 32) {
	const key = await subtle().importKey('raw', seed, 'HKDF', false, ['deriveBits']);
	const bits = await subtle().deriveBits(
		{ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(info) },
		key,
		length * 8
	);
	return new Uint8Array(bits);
}

/* Encodings. Hex for chain keys, base64url for links, base58 for NEAR keys. */

export const toHex = (b) => hex.encode(b);
export const fromHex = (s) => hex.decode(s.toLowerCase());
export const toB64 = (b) => base64urlnopad.encode(b);
export const fromB64 = (s) => base64urlnopad.decode(s);
export const toB58 = (b) => base58.encode(b);
export const fromB58 = (s) => base58.decode(s);

/** A NEAR-style public key string, e.g. ed25519:3Df9s... */
export const toNearKey = (pub) => `ed25519:${toB58(pub)}`;

export function fromNearKey(s) {
	const i = s.indexOf(':');
	const raw = i === -1 ? s : s.slice(i + 1);
	return fromB58(raw);
}

/* Ed25519 */

export function publicKey(secret) {
	return ed25519.getPublicKey(secret);
}

export function sign(message, secret) {
	return ed25519.sign(message, secret);
}

export function verify(signature, message, pub) {
	try {
		return ed25519.verify(signature, message, pub);
	} catch {
		return false;
	}
}

/** Constant-time comparison, so a check never leaks where it failed. */
export function equalBytes(a, b) {
	if (!a || !b || a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}
