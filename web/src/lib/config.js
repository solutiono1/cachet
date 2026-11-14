/* Where Cachet is deployed. These are testnet addresses; nothing here is
   secret, and the app reads the chain directly with them. */

export const NETWORK = 'testnet';
export const CONTRACT_ID = 'cachetapp.testnet';
export const RPC_URL = 'https://rpc.testnet.fastnear.com';

/**
 * Independent endpoints, run by different operators.
 *
 * A proof is only as honest as the chain reader behind it. Asking one
 * endpoint means trusting whoever runs it: a dishonest one could invent an
 * envelope and make a forged proof look verified. So a verification asks
 * several operators and believes a record only when they agree.
 *
 * These are three separate parties: FastNEAR, the NEAR Foundation, and dRPC.
 */
export const RPC_URLS = [
	'https://rpc.testnet.fastnear.com',
	'https://rpc.testnet.near.org',
	'https://near-testnet.drpc.org'
];

/** How many independent operators must agree before a record is believed. */
export const QUORUM = 2;
export const EXPLORER = 'https://testnet.nearblocks.io';

/** The token this deployment accepts. Decimals are needed to show amounts. */
export const TOKEN = {
	id: 'usdc.fakes.testnet',
	symbol: 'USDC',
	decimals: 6
};

/** Smallest unit of the token that the contract will accept. */
export const MIN_AMOUNT = '10000';

export function explorerAccount(accountId) {
	return `${EXPLORER}/address/${accountId}`;
}

export function explorerTx(hash) {
	return `${EXPLORER}/txns/${hash}`;
}
