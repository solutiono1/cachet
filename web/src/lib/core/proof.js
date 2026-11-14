/* Proofs: a signed, checkable disclosure of chosen payments.
 *
 * A proof names who it is for and when it expires, lists only the payments
 * the earner selected, and carries one signature per payment made by that
 * payment's own envelope key. Anyone can check it: the chain is the witness,
 * and no wallet or account is needed to read it.
 *
 * `verifyProof` takes the chain lookup as an argument so that it stays pure
 * and can be tested without a network.
 */

import { agreed, agreementProblem } from './agreement.js';
import { equalBytes, fromB64, fromHex, toB64, toHex, verify } from './crypto.js';
import {
	VERSION,
	discloseMessage,
	envelopeIdOf,
	sealOf,
	signDisclosure,
	statementHash
} from './envelope.js';

/** Build a proof over the given envelopes. */
export async function buildProof(envelopes, statement, contractId) {
	if (!envelopes.length) throw new Error('A proof needs at least one payment.');
	const hash = await statementHash(statement);
	const items = [];
	for (const envelope of envelopes) {
		const signature = await signDisclosure(envelope, contractId, hash);
		items.push({
			claim: toB64(envelope.publicKey),
			salt: toB64(envelope.salt),
			details: envelope.details,
			sig: toB64(signature)
		});
	}
	return { v: VERSION, t: 'proof', contract: contractId, statement, items };
}

/**
 * Check a proof.
 *
 * @param bundle the decoded proof
 * @param fetchEnvelopes async (idHexList) => Map(idHex -> record | null),
 *        where a record is what the contract stores for that envelope
 * @param now milliseconds, for the expiry check
 */
export async function verifyProof(bundle, fetchEnvelopes, now = Date.now()) {
	const problems = [];

	if (bundle?.t !== 'proof') {
		return fail('This file is not a Cachet proof.');
	}
	if (bundle.v !== VERSION) {
		return fail('This proof was made by a different version of Cachet.');
	}
	if (!Array.isArray(bundle.items) || bundle.items.length === 0) {
		return fail('This proof lists no payments.');
	}

	const expiry = Date.parse(bundle.statement?.expires ?? '');
	const expired = Number.isFinite(expiry) && expiry < now;

	let hash;
	try {
		hash = await statementHash(bundle.statement);
	} catch (error) {
		return fail(`The proof statement is incomplete. ${error.message}`);
	}
	const message = await discloseMessage(bundle.contract, hash);

	/* Recompute every identifier first, then read the chain once. */
	const prepared = [];
	for (const item of bundle.items) {
		try {
			const claim = fromB64(item.claim);
			const salt = fromB64(item.salt);
			const seal = await sealOf(item.details, salt);
			const id = await envelopeIdOf(claim, seal);
			prepared.push({
				item,
				claim,
				seal,
				idHex: toHex(id),
				signed: verify(fromB64(item.sig), message, claim)
			});
		} catch (error) {
			prepared.push({ item, error: error.message });
		}
	}

	let records = new Map();
	let chainError = null;
	try {
		records = await fetchEnvelopes(prepared.filter((p) => p.idHex).map((p) => p.idHex));
	} catch (error) {
		chainError = error.message || String(error);
	}

	/* How the chain was read matters as much as what it said. A reader who
	   trusts one endpoint trusts whoever runs it, so the lookup reports how
	   many independent operators agreed. Short of the quorum, or in open
	   disagreement, nothing is confirmed and the result says why. */
	const agreement = records?.agreement ?? null;
	const agreementIssue = chainError || agreed(agreement) ? null : agreementProblem(agreement);
	const unread = chainError || agreementIssue;

	/* One envelope may appear only once. Listing a payment twice would pass
	   every other check, because both copies carry the same seal, the same
	   chain record and the same valid signature, and the total would count it
	   twice. The first occurrence stands; the rest are refused. */
	const seen = new Set();

	const payments = prepared.map((p) => {
		if (p.error) {
			return { details: p.item.details, ok: false, checks: {}, reason: p.error };
		}
		if (seen.has(p.idHex)) {
			return {
				details: p.item.details,
				idHex: p.idHex,
				record: null,
				ok: false,
				checks: { duplicate: true },
				reason: 'This payment is listed more than once in the proof.'
			};
		}
		seen.add(p.idHex);
		/* An untrustworthy read is no read at all. Whatever came back is
		   discarded here rather than only in the lookup, so that a payment can
		   never be marked verified, or counted in a total, on the strength of a
		   record nobody independent stood behind. */
		const record = unread ? null : records.get(p.idHex) ?? null;
		const checks = {
			sealMatches: Boolean(record) && equalBytes(sealBytes(record.seal), p.seal),
			onChain: Boolean(record),
			amountMatches: Boolean(record) && String(record.amount) === String(p.item.details.amount),
			tokenMatches: Boolean(record) && record.token === p.item.details.token,
			signed: p.signed
		};
		const ok =
			checks.onChain &&
			checks.sealMatches &&
			checks.amountMatches &&
			checks.tokenMatches &&
			checks.signed;
		return {
			details: p.item.details,
			idHex: p.idHex,
			record,
			ok,
			checks,
			reason: ok ? null : explain(checks, unread)
		};
	});

	const allOk = payments.every((p) => p.ok);
	if (chainError) problems.push(`The chain could not be read: ${chainError}`);
	if (agreementIssue) problems.push(agreementIssue);
	if (expired) problems.push('This proof has expired.');

	return {
		verified: allOk && !expired && !unread,
		expired,
		statement: bundle.statement,
		contract: bundle.contract,
		payments,
		problems,
		agreement,
		total: totalBy(payments)
	};

	function fail(reason) {
		return {
			verified: false,
			expired: false,
			statement: bundle?.statement ?? null,
			contract: bundle?.contract ?? null,
			payments: [],
			problems: [reason],
			agreement: null,
			total: {}
		};
	}
}

/** The contract stores the seal as lowercase hex. */
function sealBytes(value) {
	try {
		return fromHex(value);
	} catch {
		return null;
	}
}

function explain(checks, unread) {
	if (unread) return 'Could not be checked against the chain.';
	if (!checks.onChain) return 'No payment with this seal exists in the contract.';
	if (!checks.sealMatches) return 'The invoice details do not match the seal recorded on chain.';
	if (!checks.amountMatches) return 'The amount does not match the payment recorded on chain.';
	if (!checks.tokenMatches) return 'The token does not match the payment recorded on chain.';
	if (!checks.signed) return 'The signature does not come from the key that owns this payment.';
	return 'This payment could not be verified.';
}

/** Sum the verified payments, kept per token because tokens differ. */
function totalBy(payments) {
	const totals = {};
	for (const p of payments) {
		if (!p.ok) continue;
		const token = p.details.token;
		totals[token] = (totals[token] ?? 0n) + BigInt(p.details.amount);
	}
	return totals;
}
