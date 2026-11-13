/* The vault: the earner's seed and their invoice records.
 *
 * The seed derives every envelope key. The invoice details cannot be derived
 * from anything, so they are kept here too, which makes this file the one
 * thing worth backing up.
 *
 * At rest it is encrypted with a key derived from the person's passphrase.
 * While a tab is open the decrypted copy is held in sessionStorage so a
 * reload does not ask again; closing the tab clears it. Nothing is ever sent
 * anywhere.
 */

import { fromHex, randomBytes, toHex } from './core/crypto.js';
import { buildEnvelope } from './core/envelope.js';

const VAULT_KEY = 'cachet.vault';
const SESSION_KEY = 'cachet.open';
const ITERATIONS = 310000;

export const vault = $state({
	/** 'empty' | 'locked' | 'unlocked' */
	status: 'empty',
	seed: null,
	invoices: [],
	ready: false
});

/* ---- storage, every access guarded ---- */

function get(store, key) {
	try {
		return store.getItem(key);
	} catch {
		return null;
	}
}

function put(store, key, value) {
	try {
		store.setItem(key, value);
	} catch {
		/* private window or blocked storage: the session still works */
	}
}

function drop(store, key) {
	try {
		store.removeItem(key);
	} catch {
		/* nothing to do */
	}
}

/** Read what is on this device. Call once, when the app starts. */
export function load() {
	const stored = get(localStorage, VAULT_KEY);
	if (!stored) {
		vault.status = 'empty';
		vault.ready = true;
		return;
	}
	const open = get(sessionStorage, SESSION_KEY);
	if (open) {
		try {
			const data = JSON.parse(open);
			vault.seed = fromHex(data.seed);
			vault.invoices = data.invoices ?? [];
			vault.status = 'unlocked';
			vault.ready = true;
			return;
		} catch {
			drop(sessionStorage, SESSION_KEY);
		}
	}
	vault.status = 'locked';
	vault.ready = true;
}

export function hasVault() {
	return Boolean(get(localStorage, VAULT_KEY));
}

/* ---- passphrase handling ---- */

async function deriveKey(passphrase, salt) {
	const base = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function seal(passphrase, payload) {
	const salt = randomBytes(16);
	const iv = randomBytes(12);
	const key = await deriveKey(passphrase, salt);
	const bytes = new TextEncoder().encode(JSON.stringify(payload));
	const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
	return JSON.stringify({
		v: 1,
		kdf: 'PBKDF2-SHA256',
		iterations: ITERATIONS,
		salt: toHex(salt),
		iv: toHex(iv),
		data: toHex(new Uint8Array(ct))
	});
}

async function open(passphrase, text) {
	const blob = JSON.parse(text);
	if (blob.v !== 1) throw new Error('This backup was made by a different version of Cachet.');
	const key = await deriveKey(passphrase, fromHex(blob.salt));
	let plain;
	try {
		plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromHex(blob.iv) },
			key,
			fromHex(blob.data)
		);
	} catch {
		throw new Error('That passphrase does not open this vault.');
	}
	return JSON.parse(new TextDecoder().decode(plain));
}

/* ---- lifecycle ---- */

async function persist(passphrase) {
	const payload = { seed: toHex(vault.seed), invoices: vault.invoices };
	put(localStorage, VAULT_KEY, await seal(passphrase, payload));
	put(sessionStorage, SESSION_KEY, JSON.stringify(payload));
}

/** The passphrase used for the current session, so edits can be re-sealed. */
let sessionPassphrase = null;

export async function create(passphrase) {
	if (passphrase.length < 8) throw new Error('Use at least 8 characters.');
	vault.seed = randomBytes(32);
	vault.invoices = [];
	sessionPassphrase = passphrase;
	await persist(passphrase);
	vault.status = 'unlocked';
}

export async function unlock(passphrase) {
	const text = get(localStorage, VAULT_KEY);
	if (!text) throw new Error('There is no vault on this device yet.');
	const payload = await open(passphrase, text);
	vault.seed = fromHex(payload.seed);
	vault.invoices = payload.invoices ?? [];
	sessionPassphrase = passphrase;
	put(sessionStorage, SESSION_KEY, JSON.stringify(payload));
	vault.status = 'unlocked';
}

export function lock() {
	vault.seed = null;
	vault.invoices = [];
	sessionPassphrase = null;
	drop(sessionStorage, SESSION_KEY);
	vault.status = hasVault() ? 'locked' : 'empty';
}

/** Needed after a reload, when the session copy exists but the passphrase does not. */
export function needsPassphrase() {
	return vault.status === 'unlocked' && sessionPassphrase === null;
}

export async function reseal(passphrase) {
	await open(passphrase, get(localStorage, VAULT_KEY));
	sessionPassphrase = passphrase;
	await persist(passphrase);
}

/* ---- invoices ---- */

export async function addInvoice(details) {
	const index = nextIndex();
	vault.invoices = [...vault.invoices, { index, details, createdAt: new Date().toISOString() }];
	if (sessionPassphrase) await persist(sessionPassphrase);
	else put(sessionStorage, SESSION_KEY, JSON.stringify({ seed: toHex(vault.seed), invoices: vault.invoices }));
	return buildEnvelope(vault.seed, index, details);
}

function nextIndex() {
	return vault.invoices.reduce((highest, row) => Math.max(highest, row.index + 1), 0);
}

/** Derive every envelope this vault knows about. */
export async function allEnvelopes() {
	const out = [];
	for (const row of vault.invoices) {
		out.push({ ...(await buildEnvelope(vault.seed, row.index, row.details)), createdAt: row.createdAt });
	}
	return out.sort((a, b) => b.index - a.index);
}

export async function envelopeAt(index) {
	const row = vault.invoices.find((r) => r.index === index);
	if (!row) throw new Error('No invoice with that number is stored on this device.');
	return buildEnvelope(vault.seed, row.index, row.details);
}

/* ---- backup ---- */

export function backupText() {
	const text = get(localStorage, VAULT_KEY);
	if (!text) throw new Error('There is nothing to back up yet.');
	return text;
}

export async function restore(text, passphrase) {
	const payload = await open(passphrase, text);
	vault.seed = fromHex(payload.seed);
	vault.invoices = payload.invoices ?? [];
	sessionPassphrase = passphrase;
	put(localStorage, VAULT_KEY, text);
	put(sessionStorage, SESSION_KEY, JSON.stringify(payload));
	vault.status = 'unlocked';
}

export function forget() {
	drop(localStorage, VAULT_KEY);
	lock();
	vault.status = 'empty';
}
