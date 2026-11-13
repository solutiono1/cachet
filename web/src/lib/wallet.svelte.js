/* Wallet access, used only where a NEAR transaction has to be signed:
 * paying an invoice, and opening an envelope.
 *
 * Four of Cachet's six screens never touch this file. Creating a pay link,
 * reading your envelopes, building a proof and checking a proof all work
 * with no wallet at all.
 *
 * MyNearWallet is used because it needs no browser extension, which keeps
 * the paying client's side of this as close to a normal web page as NEAR
 * allows.
 */

import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { CONTRACT_ID, NETWORK, TOKEN } from './config.js';

export const wallet = $state({
	accountId: null,
	connecting: false,
	error: ''
});

let selector = null;

async function getSelector() {
	if (selector) return selector;
	selector = await setupWalletSelector({
		network: NETWORK,
		modules: [setupMyNearWallet({ walletUrl: 'https://testnet.mynearwallet.com' })]
	});
	return selector;
}

/** Pick up an existing session, if the person already signed in. */
export async function restore() {
	try {
		const s = await getSelector();
		const accounts = s.store.getState().accounts;
		wallet.accountId = accounts.find((a) => a.active)?.accountId ?? accounts[0]?.accountId ?? null;
	} catch (problem) {
		wallet.error = problem.message;
	}
}

export async function signIn() {
	wallet.connecting = true;
	wallet.error = '';
	try {
		const s = await getSelector();
		const w = await s.wallet('my-near-wallet');
		/* The key is limited to the token contract. Anything carrying a
		   deposit still goes to the wallet for explicit approval. */
		await w.signIn({ contractId: TOKEN.id, methodNames: [] });
	} catch (problem) {
		wallet.error = problem.message;
	} finally {
		wallet.connecting = false;
	}
}

export async function signOut() {
	try {
		const s = await getSelector();
		const w = await s.wallet();
		await w.signOut();
		wallet.accountId = null;
	} catch (problem) {
		wallet.error = problem.message;
	}
}

async function send(transaction) {
	const s = await getSelector();
	const w = await s.wallet();
	return w.signAndSendTransaction(transaction);
}

/**
 * Pay an invoice: one call to the token contract, which hands the money to
 * Cachet along with the claim key and the seal.
 */
export async function payEnvelope({ claimHex, sealHex, amount }) {
	return send({
		receiverId: TOKEN.id,
		actions: [
			{
				type: 'FunctionCall',
				params: {
					methodName: 'ft_transfer_call',
					args: {
						receiver_id: CONTRACT_ID,
						amount,
						msg: JSON.stringify({ claim: claimHex, seal: sealHex })
					},
					gas: '100000000000000',
					deposit: '1'
				}
			}
		]
	});
}

/** Open an envelope to a chosen account. */
export async function openEnvelope({ claimHex, sealHex, recipientId, signatureHex }) {
	return send({
		receiverId: CONTRACT_ID,
		actions: [
			{
				type: 'FunctionCall',
				params: {
					methodName: 'withdraw',
					args: {
						claim: claimHex,
						seal: sealHex,
						recipient_id: recipientId,
						signature: signatureHex
					},
					gas: '100000000000000',
					deposit: '0'
				}
			}
		]
	});
}

/** Register an account with the token so it can receive. */
export async function registerWithToken(accountId) {
	return send({
		receiverId: TOKEN.id,
		actions: [
			{
				type: 'FunctionCall',
				params: {
					methodName: 'storage_deposit',
					args: { account_id: accountId, registration_only: true },
					gas: '30000000000000',
					deposit: '1250000000000000000000'
				}
			}
		]
	});
}
