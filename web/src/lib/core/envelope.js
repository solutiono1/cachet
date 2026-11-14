/* Envelopes: the unit Cachet is built on.
 *
 * One invoice becomes one envelope. The envelope has its own key pair,
 * derived from the earner's seed, so a client who pays it learns nothing
 * about the earner or about any other invoice.
 *
 * Nothing readable goes on chain. The contract stores only the seal, which
 * is a salted hash of the invoice details.
 */

import {
	concat,
	fromB64,
	hkdf,
	publicKey,
	sha256,
	sign,
	toB64,
	toHex,
	utf8
} from './crypto.js';

export const VERSION = 1;

/* Domain separation strings. Changing any of these breaks compatibility
   with envelopes already created, so they are fixed for v1. */
const INFO_CLAIM = 'cachet/v1/claim/';
const INFO_SALT = 'cachet/v1/salt/';
const DOMAIN_WITHDRAW = 'cachet/v1/withdraw';
const DOMAIN_DISCLOSE = 'cachet/v1/disclose';

/** The fields that make up an invoice, in the exact order they are hashed. */
const DETAIL_FIELDS = ['v', 'payee', 'client', 'description', 'amount', 'token', 'issued'];

/**
 * Canonical form of the invoice details. Key order is fixed and strings are
 * normalised, so the same invoice always produces the same bytes on every
 * machine. This is what the seal commits to.
 */
export function canonicalDetails(details) {
	const out = {};
	for (const key of DETAIL_FIELDS) {
		const value = details[key];
		if (value === undefined || value === null) {
			throw new Error(`Invoice is missing the field "${key}".`);
		}
		out[key] = typeof value === 'string' ? value.normalize('NFC') : value;
	}
	return JSON.stringify(out);
}

/** Derive the key pair and salt belonging to invoice number `index`. */
export async function deriveEnvelope(seed, index) {
	const secret = await hkdf(seed, INFO_CLAIM + index, 32);
	const salt = await hkdf(seed, INFO_SALT + index, 32);
	return { index, secret, publicKey: publicKey(secret), salt };
}

/** seal = SHA-256(canonical details || salt) */
export async function sealOf(details, salt) {
	return sha256(utf8(canonicalDetails(details)), salt);
}

/** id = SHA-256(claim public key || seal). This is the contract's key. */
export async function envelopeIdOf(claimPublicKey, seal) {
	return sha256(claimPublicKey, seal);
}

/** Everything about one invoice, ready to use. */
export async function buildEnvelope(seed, index, details) {
	const env = await deriveEnvelope(seed, index);
	const seal = await sealOf(details, env.salt);
	const id = await envelopeIdOf(env.publicKey, seal);
	return { ...env, details, seal, id, idHex: toHex(id) };
}

/* ---- Withdrawal ---- */

/**
 * The message an envelope key signs to release its funds. The recipient is
 * inside the signed bytes, so whoever relays the transaction cannot send the
 * money anywhere else. The contract id is included so a signature made for
 * one deployment cannot be replayed against another.
 */
export async function withdrawMessage(contractId, envelopeId, recipientId) {
	return sha256(utf8(DOMAIN_WITHDRAW), utf8(contractId), envelopeId, utf8(recipientId));
}

export async function signWithdraw(envelope, contractId, recipientId) {
	const message = await withdrawMessage(contractId, envelope.id, recipientId);
	return sign(message, envelope.secret);
}

/* ---- Disclosure ---- */

/** The statement a proof is made under: who it is for, and for how long. */
const STATEMENT_FIELDS = ['v', 'payee', 'audience', 'purpose', 'expires'];

export function canonicalStatement(statement) {
	const out = {};
	for (const key of STATEMENT_FIELDS) {
		const value = statement[key];
		if (value === undefined || value === null) {
			throw new Error(`The proof statement is missing the field "${key}".`);
		}
		out[key] = typeof value === 'string' ? value.normalize('NFC') : value;
	}
	return JSON.stringify(out);
}

export async function statementHash(statement) {
	return sha256(utf8(canonicalStatement(statement)));
}

export async function discloseMessage(contractId, hash) {
	return sha256(utf8(DOMAIN_DISCLOSE), utf8(contractId), hash);
}

export async function signDisclosure(envelope, contractId, hash) {
	const message = await discloseMessage(contractId, hash);
	return sign(message, envelope.secret);
}

/* ---- Pay links ----
 *
 * A pay link carries the invoice, the salt and the claim public key. It
 * lives in the fragment of the URL, the part after '#', which browsers do
 * not send to any server. Whoever holds the link can read that one invoice
 * and nothing else.
 */

/* The link has to carry the whole invoice, because there is no server to
   fetch it from. So it is packed rather than pretty: one-letter keys, the
   details as a positional array, and gzip where the browser offers it. A
   leading 'z' marks a compressed payload. Together this roughly halves the
   link against plain JSON. */

const DETAIL_ORDER = ['payee', 'client', 'description', 'amount', 'token', 'issued'];

async function gzip(bytes) {
	if (typeof CompressionStream === 'undefined') return null;
	const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
	const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodePayload(object) {
	const raw = utf8(JSON.stringify(object));
	try {
		const packed = await gzip(raw);
		/* Only worth it if it actually came out smaller. */
		if (packed && packed.length < raw.length) return 'z' + toB64(packed);
	} catch {
		/* fall through to the plain form */
	}
	return toB64(raw);
}

export async function decodePayload(text) {
	const trimmed = text.trim();
	if (trimmed.startsWith('z')) {
		const raw = await gunzip(fromB64(trimmed.slice(1)));
		return JSON.parse(new TextDecoder().decode(raw));
	}
	return JSON.parse(new TextDecoder().decode(fromB64(trimmed)));
}

export function payLinkPayload(envelope, contractId) {
	return {
		v: VERSION,
		t: 'p',
		c: contractId,
		k: toB64(envelope.publicKey),
		s: toB64(envelope.salt),
		d: DETAIL_ORDER.map((key) => envelope.details[key])
	};
}

/** Expand the packed form back into the details the seal was taken over. */
function unpackDetails(list) {
	const details = { v: VERSION };
	DETAIL_ORDER.forEach((key, i) => {
		details[key] = list[i];
	});
	return details;
}

/**
 * Rebuild the seal and id from a pay link, without any secret. This is what
 * the paying client's browser does, so it can check that the link it was
 * given matches the invoice it displays.
 */
export async function readPayLink(payload) {
	if (payload?.t !== 'p') throw new Error('This is not a Cachet pay link.');
	if (payload.v !== VERSION) {
		throw new Error('This pay link was made by a different version of Cachet.');
	}
	const claim = fromB64(payload.k);
	const salt = fromB64(payload.s);
	const details = unpackDetails(payload.d);
	/* Recomputed here, not trusted from the link: this is what lets the payer
	   check that the invoice they are shown is the one that was sealed. */
	const seal = await sealOf(details, salt);
	const id = await envelopeIdOf(claim, seal);
	return {
		contractId: payload.c,
		claimPublicKey: claim,
		salt,
		details,
		seal,
		id,
		idHex: toHex(id)
	};
}

/** Used only to keep the two-argument form of concat honest in tests. */
export const _internals = { concat, DOMAIN_WITHDRAW, DOMAIN_DISCLOSE };
