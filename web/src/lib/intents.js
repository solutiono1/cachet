/* NEAR Intents, read only.
 *
 * Cachet's contract runs on testnet. NEAR Intents has no testnet and the
 * project says none is planned, so cross-chain settlement cannot be executed
 * from this build without moving real money.
 *
 * What is real and free is the quote. `dry: true` asks the live 1Click API
 * what a swap would cost right now, without creating a deposit address and
 * without anyone sending anything. No API key is needed; without a partner
 * key a 0.25% fee is quoted, which is the number a payer would really pay.
 *
 * So this file shows a payer the true price of paying from their chain, and
 * says plainly that executing it is the mainnet release.
 */

const QUOTE_URL = 'https://1click.chaindefuser.com/v0/quote';

/* The stablecoin on each chain, as 1Click lists it. Asset ids read from
   GET /v0/tokens on 2026-11-14. Each route below was checked against the
   live API and returns a price; Solana and Tron are left out because the API
   rejected the refund-address formats we tried, and a chain that cannot
   quote has no business being on the list. */
export const SOURCES = [
	{
		id: 'base-usdc',
		chain: 'Base',
		symbol: 'USDC',
		decimals: 6,
		asset: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near',
		refund: 'evm'
	},
	{
		id: 'eth-usdc',
		chain: 'Ethereum',
		symbol: 'USDC',
		decimals: 6,
		asset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
		refund: 'evm'
	},
	{
		id: 'arb-usdc',
		chain: 'Arbitrum',
		symbol: 'USDC',
		decimals: 6,
		asset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
		refund: 'evm'
	},
	{
		id: 'pol-usdc',
		chain: 'Polygon',
		symbol: 'USDC',
		decimals: 6,
		asset: 'nep141:pol-0x3c499c542cef5e3811e1192ce70d8cc03d5c3359.omdep.near',
		refund: 'evm'
	}
];

/** Mainnet USDC on NEAR, what the earner would receive. */
const NEAR_USDC = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';

/* The API validates these even for a dry quote, so they are real, well known
   mainnet addresses used purely to shape a valid request. Nothing is sent to
   them and no deposit address is created by a dry quote. */
const SAMPLE_REFUND = {
	evm: '0x2527D02599Ba641c19FEa793cD0F167589a0f10D'
};

/**
 * What would it cost to pay this invoice from another chain, right now.
 *
 * @param source one of SOURCES
 * @param amount the invoice amount, in the smallest unit of USDC
 * @returns { pays, receives, feeBps, source } or throws
 */
export async function quoteFor(source, amount, { signal } = {}) {
	const body = {
		dry: true,
		swapType: 'EXACT_OUTPUT',
		slippageTolerance: 100,
		originAsset: source.asset,
		depositType: 'ORIGIN_CHAIN',
		destinationAsset: NEAR_USDC,
		amount: String(amount),
		refundTo: SAMPLE_REFUND[source.refund],
		refundType: 'ORIGIN_CHAIN',
		/* An account that exists on mainnet; the API rejects one that does
		   not, even when nothing will be sent. */
		recipient: 'aurora',
		recipientType: 'DESTINATION_CHAIN',
		deadline: new Date(Date.now() + 10 * 60 * 1000).toISOString()
	};

	const response = await fetch(QUOTE_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal
	});

	if (!response.ok) {
		throw new Error(`NEAR Intents did not quote that route (${response.status})`);
	}

	const payload = await response.json();
	const quote = payload?.quote;
	if (!quote?.amountIn) throw new Error('NEAR Intents returned no price for that route');

	return {
		source,
		pays: quote.amountInFormatted ?? quote.amountIn,
		paysUsd: quote.amountInUsd ?? null,
		receives: quote.amountOutFormatted ?? quote.amountOut,
		minReceives: quote.minAmountOut ?? null,
		deadline: quote.deadline ?? null
	};
}
