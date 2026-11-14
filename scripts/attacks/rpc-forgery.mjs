/* Attack: a dishonest RPC endpoint tries to make a forged proof verify.
 *
 * Run it:  node scripts/attacks/rpc-forgery.mjs
 *
 * It builds a proof for an invoice nobody ever paid, then stands up a local
 * RPC server that answers with a fabricated record fitting that forgery. The
 * proof is checked twice: once through the attacker's endpoint alone, which
 * accepts it, and once through the attacker plus the independent endpoints in
 * config.js, which refuses it because the operators do not agree.
 *
 * The first result is the vulnerability this attack was written to find. The
 * second is the fix. Reading the chain through several operators and believing
 * a record only when enough of them agree is what makes the second outcome
 * possible; a reader who deliberately points the verifier at one endpoint is
 * still trusting whoever runs it, which is why the default is not one.
 *
 * Needs network access, because the honest endpoints are real.
 */
import { createServer } from 'node:http';
import { randomBytes, toHex } from '../../web/src/lib/core/crypto.js';
import { buildEnvelope } from '../../web/src/lib/core/envelope.js';
import { buildProof, verifyProof } from '../../web/src/lib/core/proof.js';
import { fetchEnvelopes } from '../../web/src/lib/near.js';
import { RPC_URLS } from '../../web/src/lib/config.js';

const CONTRACT = 'cachetapp.testnet';

/* An invoice that was never paid. Nobody ever sent these tokens. */
const details = {
  v: 1,
  payee: 'Solution Nau',
  client: 'Ghost Client Ltd',
  description: 'Work that was never paid for',
  amount: '9000000000',
  token: 'usdc.fakes.testnet',
  issued: '2026-11-01'
};

const seed = randomBytes(32);
const envelope = await buildEnvelope(seed, 0, details);
const proof = await buildProof([envelope], {
  v: 1, payee: details.payee, audience: 'Harbour Lettings',
  purpose: 'Rental application', expires: '2027-06-30'
}, CONTRACT);

/* The liar: answers every lookup with a record that fits the forgery. */
const fabricated = [{
  seal: toHex(envelope.seal),
  amount: details.amount,
  token: details.token,
  payer: 'ghost.testnet',
  paid_at: '1762000000000000000',
  opened: false
}];
const bytes = [...new TextEncoder().encode(JSON.stringify(fabricated))];
const liar = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ jsonrpc: '2.0', id: JSON.parse(body).id, result: { result: bytes } }));
  });
});
await new Promise((r) => liar.listen(0, '127.0.0.1', r));
const LIAR = `http://127.0.0.1:${liar.address().port}/`;

console.log('forged envelope', envelope.idHex);
console.log('claimed amount 9000 USDC, never paid\n');

const one = await verifyProof(proof, (ids) => fetchEnvelopes(ids, { rpcs: [LIAR] }));
console.log('[1] reader trusts the attacker\'s endpoint alone');
console.log('    verified:', one.verified, '| total:', Object.values(one.total).map(String).join());
console.log('    ->', one.verified ? 'FORGERY ACCEPTED' : 'rejected');

const many = await verifyProof(proof, (ids) => fetchEnvelopes(ids, { rpcs: [LIAR, ...RPC_URLS] }));
console.log('\n[2] same proof, read through the liar plus the independent set');
console.log('    verified:', many.verified);
console.log('    problems:', many.problems.join(' '));
console.log('    payment reason:', many.payments[0].reason);
console.log('    total:', JSON.stringify(Object.keys(many.total)));
console.log('    ->', many.verified ? 'FORGERY ACCEPTED' : 'FORGERY REJECTED');

liar.close();
