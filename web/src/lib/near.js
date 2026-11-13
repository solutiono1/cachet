/* Reading NEAR.
 *
 * Cachet has no server, so the app and the command-line tool both read the
 * chain straight from a public RPC endpoint. Only view calls live here;
 * anything that signs is done by the person's wallet.
 */

import { CONTRACT_ID, RPC_URL } from './config.js';

let nextId = 1;

/** Call a view method and return its decoded JSON result. */
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

/**
 * Read several envelopes at once.
 * Returns Map(idHex -> record), leaving out the ones that do not exist.
 */
export async function fetchEnvelopes(idHexList, options = {}) {
	const found = new Map();
	if (!idHexList.length) return found;

	/* Keep each request a sensible size. */
	const chunks = [];
	for (let i = 0; i < idHexList.length; i += 50) chunks.push(idHexList.slice(i, i + 50));

	for (const chunk of chunks) {
		const results = await view('get_envelopes', { ids: chunk }, options);
		chunk.forEach((id, index) => {
			const record = results?.[index];
			if (record) found.set(id, record);
		});
	}
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

function base64(text) {
	const bytes = new TextEncoder().encode(text);
	if (typeof btoa === 'function') {
		let binary = '';
		for (const byte of bytes) binary += String.fromCharCode(byte);
		return btoa(binary);
	}
	return Buffer.from(bytes).toString('base64');
}
