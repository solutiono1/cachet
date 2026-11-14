/* Reading NEAR.
 *
 * Cachet has no server, so the app and the command-line tool both read the
 * chain straight from public RPC endpoints. Only view calls live here;
 * anything that signs is done by the person's wallet.
 *
 * A verification is read through several endpoints run by different
 * operators, and a record is believed only when they agree. One endpoint on
 * its own is a party you have to trust: it could answer with an envelope that
 * was never paid and make a forged proof look verified. Agreement between
 * independent operators removes that single point of trust.
 */

import { CONTRACT_ID, QUORUM, RPC_URL, RPC_URLS } from './config.js';

export { agreed, agreementNote, agreementProblem } from './core/agreement.js';

let nextId = 1;

/** Call a view method on one endpoint and return its decoded JSON result. */
export async function view(method, args = {}, { rpc = RPC_URL, contract = CONTRACT_ID } = {}) {
	const body = {
		jsonrpc: '2.0',
		id: nextId++,
		method: 'query',
		params: {
			request_type: 'call_function',
			finality: 'final',
			account_id: contract,
			method_name: method,
			args_base64: base64(JSON.stringify(args))
		}
	};

	const response = await fetch(rpc, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		throw new Error(`the NEAR endpoint answered with ${response.status}`);
	}

	const payload = await response.json();
	if (payload.error) {
		const cause = payload.error?.cause?.name ?? payload.error.message ?? 'unknown error';
		throw new Error(`the NEAR endpoint refused the request (${cause})`);
	}
	const bytes = payload.result?.result;
	if (!Array.isArray(bytes)) {
		throw new Error('the NEAR endpoint returned an unexpected answer');
	}
	const text = new TextDecoder().decode(Uint8Array.from(bytes));
	return text.length ? JSON.parse(text) : null;
}

/** Which endpoints to ask, from whatever the caller supplied. */
function endpointsFrom(options) {
	if (Array.isArray(options.rpcs) && options.rpcs.length) return [...options.rpcs];
	if (options.rpc) return [options.rpc];
	return [...RPC_URLS];
}

/**
 * Ask several endpoints the same question and keep the answer they agree on.
 *
 * Every endpoint is asked in parallel. Identical answers are grouped, the
 * largest group wins, and the result says how many operators stood behind it,
 * which ones disagreed, and which ones could not be reached. Nothing here
 * decides what to do about a shortfall; the caller does.
 */
export async function viewAgreed(method, args = {}, options = {}) {
	const rpcs = endpointsFrom(options);
	const quorum = Math.max(1, Math.min(options.quorum ?? QUORUM, rpcs.length));
	const contract = options.contract ?? CONTRACT_ID;

	const settled = await Promise.all(
		rpcs.map(async (rpc) => {
			try {
				return { rpc, value: await view(method, args, { rpc, contract }) };
			} catch (error) {
				return { rpc, error: error?.message || String(error) };
			}
		})
	);

	const failures = settled.filter((s) => s.error).map((s) => ({ rpc: s.rpc, error: s.error }));
	const answers = settled.filter((s) => !s.error);

	const groups = new Map();
	for (const answer of answers) {
		const key = canonical(answer.value);
		if (!groups.has(key)) groups.set(key, { value: answer.value, endpoints: [] });
		groups.get(key).endpoints.push(answer.rpc);
	}

	const ranked = [...groups.values()].sort((a, b) => b.endpoints.length - a.endpoints.length);
	const best = ranked[0] ?? null;
	const agreed = best ? best.endpoints.length : 0;

	return {
		value: best ? best.value : null,
		agreed,
		asked: rpcs.length,
		answered: answers.length,
		quorum,
		enough: agreed >= quorum,
		endpoints: best ? best.endpoints : [],
		/* Endpoints that answered something different from the winning group.
		   Even one of these means an operator is wrong or dishonest. */
		conflicting: ranked.slice(1).flatMap((group) => group.endpoints),
		failures
	};
}

/** The weaker of two agreement reports, so a run is judged by its worst read. */
function weaker(a, b) {
	if (!a) return b;
	if (!b) return a;
	if (a.enough !== b.enough) return a.enough ? b : a;
	if (a.conflicting.length !== b.conflicting.length) {
		return a.conflicting.length > b.conflicting.length ? a : b;
	}
	return a.agreed <= b.agreed ? a : b;
}

/**
 * Read several envelopes at once, through independent endpoints.
 *
 * Returns Map(idHex -> record), leaving out the ones that do not exist. The
 * map carries an `agreement` property describing how the read went. When the
 * endpoints did not reach the quorum, the map is left empty on purpose: an
 * unconfirmed record must not be mistaken for a confirmed one.
 */
export async function fetchEnvelopes(idHexList, options = {}) {
	const rpcs = endpointsFrom(options);
	const found = new Map();
	found.agreement = {
		asked: rpcs.length,
		answered: rpcs.length,
		quorum: Math.max(1, Math.min(options.quorum ?? QUORUM, rpcs.length)),
		agreed: rpcs.length,
		enough: true,
		endpoints: rpcs,
		conflicting: [],
		failures: []
	};
	if (!idHexList.length) return found;

	/* Keep each request a sensible size. */
	const chunks = [];
	for (let i = 0; i < idHexList.length; i += 50) chunks.push(idHexList.slice(i, i + 50));

	let report = null;
	const records = new Map();

	for (const chunk of chunks) {
		const answer = await viewAgreed('get_envelopes', { ids: chunk }, { ...options, rpcs });
		report = weaker(report, answer);
		if (!answer.enough) continue;
		chunk.forEach((id, index) => {
			const record = answer.value?.[index];
			if (record) records.set(id, record);
		});
	}

	if (report) {
		const { value, ...rest } = report;
		found.agreement = rest;
	}
	if (report?.enough) for (const [id, record] of records) found.set(id, record);
	return found;
}

export async function fetchConfig(options = {}) {
	return view('get_config', {}, options);
}

/** Token balance, used to tell a payer when they have nothing to pay with. */
export async function tokenBalance(tokenId, accountId, options = {}) {
	return view('ft_balance_of', { account_id: accountId }, { ...options, contract: tokenId });
}

/** Whether an account can receive this token yet. */
export async function isRegistered(tokenId, accountId, options = {}) {
	const result = await view(
		'storage_balance_of',
		{ account_id: accountId },
		{ ...options, contract: tokenId }
	);
	return result !== null;
}

/** A stable string for any JSON value, so two answers can be compared. */
function canonical(value) {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	const keys = Object.keys(value).sort();
	return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function base64(text) {
	const bytes = new TextEncoder().encode(text);
	if (typeof btoa === 'function') {
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return btoa(binary);
	}
	return Buffer.from(bytes).toString('base64');
}
