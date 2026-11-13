/* Where Cachet is deployed. These are testnet addresses; nothing here is
   secret, and the app reads the chain directly with them. */

export const NETWORK = 'testnet';
export const CONTRACT_ID = 'cachetapp.testnet';
export const RPC_URL = 'https://rpc.testnet.fastnear.com';
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
