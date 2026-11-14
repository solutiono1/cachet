<div align="center">

# Cachet

**Get paid privately. Prove it when it counts.**

Every stablecoin invoice gets its own sealed envelope on NEAR. Clients pay
without seeing your wallet, your balance, or the other people who pay you.
Later you disclose only the payments you choose, as a proof anyone can check
against the chain with no wallet and no account.

[Live contract](https://testnet.nearblocks.io/address/cachetapp.testnet) ·
[Architecture](docs/ARCHITECTURE.md) ·
[Security review](docs/AUDIT.md) ·
[Threat model](SECURITY.md)

Built for the NEAR Hackathon, November 2026
Tracks: **Privacy and Private AI** · **Real-World Money** · **Open Innovation**

</div>

---

## The problem

A freelancer paid in USDC gives each client a wallet address. That address is a
public page. The client can look up every payment it has ever received: who
else pays this person, how much, and how often.

So the earner picks between two bad options. Use one address, and every client
sees every other client's rate. Use a fresh address per client, and now they
are managing keys by hand with no record of which is which.

And after all that exposure they still cannot answer the question that
actually matters: **prove you earn enough to rent this flat.** A block explorer
link is not a document a landlord, a lender or a tax office accepts, and it
reveals far more than was asked.

Cachet separates the two things an address wrongly fuses: **taking money** and
**surrendering your history**.

## Live on NEAR testnet

| | |
|---|---|
| Contract | [`cachetapp.testnet`](https://testnet.nearblocks.io/address/cachetapp.testnet) |
| Token | [`usdc.fakes.testnet`](https://testnet.nearblocks.io/address/usdc.fakes.testnet) · NEP-141 test USDC, 6 decimals |
| Deploy | [`589yY7g2x2fLdiNgcq3xsoJuLQFRXJxSMSad5qQQ1sH`](https://testnet.nearblocks.io/txns/589yY7g2x2fLdiNgcq3xsoJuLQFRXJxSMSad5qQQ1sH) |

A full round trip already on chain, made by `scripts/demo-testnet.sh`:

| Step | Transaction |
|---|---|
| Client pays 250 USDC into an envelope | [`E8hSaZn4MtTHRUodwyfG6ZtTomz85fSbgrsf3mqCdSa`](https://testnet.nearblocks.io/txns/E8hSaZn4MtTHRUodwyfG6ZtTomz85fSbgrsf3mqCdSa) |
| Earner opens it to another account | [`Aitu76p3saUoc7GZmZvsc6DS79oMAXwx2XrEtkatFj2U`](https://testnet.nearblocks.io/txns/Aitu76p3saUoc7GZmZvsc6DS79oMAXwx2XrEtkatFj2U) |

---

## Verify a real proof in two minutes

No wallet, no account, no test tokens. This checks the central claim of the
project against the live chain.

```bash
git clone https://github.com/solutiono1/cachet
cd cachet/web
npm install

node bin/cachet.mjs proof \
  --seed 00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff \
  --invoices ../examples/invoices.json \
  --audience "Harbour Lettings" \
  --purpose "Rental application" \
  --expires 2027-02-28 > proof.json

node bin/cachet.mjs verify proof.json
```

You will see:

```
VERIFIED

  payee     Demo Earner
  for       Harbour Lettings
  purpose   Rental application
  expires   2027-02-28
  contract  cachetapp.testnet

  ok                250 USDC  2026-11-13  Northwind Studio

  total              250 usdc.fakes.testnet
```

Now change one character and watch it fail honestly:

```bash
sed -i 's/Harbour Lettings/Someone Else/' proof.json
node bin/cachet.mjs verify proof.json
```

```
NOT VERIFIED
  FAILED            250 USDC  2026-11-13  Northwind Studio
         The signature does not come from the key that owns this payment.
```

`verify` exits `0` when verified and `1` when not, so it can be used in a
script.

> The seed above is published deliberately, for this demo only. A real
> earner's seed never leaves their browser.

---

## Try the whole product in a browser

Nothing to source and nobody to ask.

```bash
cd web
npm install
npm run dev     # http://localhost:5173
```

1. **Get an account.** The wallet button opens MyNearWallet, which creates a
   testnet account free. No browser extension needed.
2. **Get test money.** Settings has a faucet. `usdc.fakes.testnet` is a testnet
   token that lets any account mint, so the button is one transaction you sign
   yourself: it registers you with the token if needed and mints 500 USDC.
   Cachet holds no keys and runs no service to make that work. On mainnet there
   is nothing to mint and the button does not apply.
3. **Create a pay link**, open it in a private window, and pay it. That second
   browser never learns who the earner is.
4. **Open the envelope** to any account you choose.
5. **Build a proof** and check it on the verify page, which needs no wallet.

---

## How it works

One invoice becomes one **envelope**. Two of the four steps never touch the
chain.

```
envelope key, salt  =  HKDF(seed, "cachet/v1/claim/<n>"), HKDF(seed, "cachet/v1/salt/<n>")
seal                =  SHA-256(canonical invoice details ‖ salt)
envelope id         =  SHA-256(claim public key ‖ seal)
```

**1. Seal.** You fill in an invoice. The key and salt are derived in your
browser. Nothing is written anywhere and no transaction is made. The invoice
travels inside the pay link, in the fragment after `#`, which browsers never
send to a server.

**2. Pay.** Your client calls `ft_transfer_call` on the token, which hands the
money to the contract with the claim key and the seal. The contract files it
under the envelope id. The chain now holds a hash, an amount, a payer and a
timestamp. It does not hold your name, your account, or what the work was.

**3. Open.** You sign, with the envelope's own key:

```
SHA-256("cachet/v1/withdraw" ‖ contract ‖ envelope id ‖ recipient)
```

Anyone may submit that transaction, but only the key holder can produce the
signature, and because the recipient sits inside the signed bytes, even the
submitter cannot redirect the money.

**4. Prove.** You select payments and sign a statement naming the reader, the
purpose and an expiry. Each payment carries its own signature.

### What a verifier checks

1. Hash the disclosed details with the disclosed salt; it must equal the seal
   stored on chain.
2. Read the envelope from the contract: it must exist, with that amount and
   that token.
3. Check each payment's signature against the key that owns it, over the
   statement.

**Check 3 is the product.** A client who paid an invoice knows every detail of
it, and still cannot present it as their own income, because they never held
the envelope key. There is a test for exactly that.

---

## Why NEAR

The design depends on NEAR specifically, not incidentally.

| NEAR feature | How Cachet uses it |
|---|---|
| `env::ed25519_verify` | The contract verifies the withdrawal signature **on chain**. This is what makes a one-time key per invoice possible at all |
| `env::sha256` | Envelope ids computed on chain, identical to the browser |
| NEP-141 `ft_transfer_call` | How a payment arrives, handled in `ft_on_transfer` |
| Cross-contract calls and callbacks | Withdrawal marks `opened`, calls the token, and restores state in a `#[private]` callback if the transfer fails |
| Named accounts | You open an envelope to a readable account, not a hex string |
| Public RPC | The verifier reads envelopes with no key and no wallet, through three independent operators that must agree |
| NEAR Intents | Live cross-chain pricing on the pay screen, from the real 1Click API |

On a chain without on-chain Ed25519 verification, every envelope would need
its own account or a far more expensive scheme.

## Architecture

```
Browser  (everything secret lives here)
   seed → HKDF → one key and one salt per invoice
   encrypted at rest with the person's passphrase
         │
         │  the invoice rides in the link fragment, never sent to a server
         ▼
NEAR contract  cachetapp.testnet
   envelope id → { seal, token, amount, payer, time, opened }
         │
         ▼
Anyone holding a proof → reads the contract through three independent
                          RPC operators, two of which must agree → verified
```

**No backend, no database, no accounts, no cookies, no analytics.** The whole
application makes one kind of outbound request, a view call to public RPC. That
is the point rather than a shortcut: a privacy product with a server is asking
you to trust the server.

Nobody reads a blockchain directly; they read it through a server somebody
runs, and that server can answer with whatever it likes. So a verification asks
three operators (FastNEAR, the NEAR Foundation, and dRPC) and believes a
payment only when two agree. The verifier says how many confirmed it. If they
disagree, nothing is confirmed and the reader is told to check the envelope id
on a block explorer. The attack this defends against is reproducible:
`node scripts/attacks/rpc-forgery.mjs`.

## Repository

```
contract/        Rust contract (near-sdk 5). No owner, no upgrade path, no pause
  src/lib.rs     ft_on_transfer, withdraw, views, 11 unit tests
web/
  src/lib/core/  the cryptography: crypto.js, envelope.js, proof.js (+ tests)
  src/lib/       chain reads, wallet, faucet, vault, NEAR Intents, formatting
  src/routes/    landing, create, pay, envelopes, prove, verify, settings, privacy
  bin/cachet.mjs command line: envelope, sign, proof, verify
scripts/         the testnet round trip
docs/            ARCHITECTURE.md, AUDIT.md
examples/        a sample invoice list for the quick start
```

Seven screens. **Four need no wallet at all:** creating a pay link, reading
your envelopes, building a proof, and checking a proof. Only paying and opening
need a signature, and opening needs one only to pay the gas; the right to the
money comes from the envelope key.

## Running it

**Requirements.** Node 20 or newer, built on 26.13.1. For the contract, Rust
1.95 or newer with the `wasm32-unknown-unknown` target and a C toolchain. For
testnet transactions, the [`near` CLI](https://github.com/near/near-cli-rs).

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test         # 50 tests on keys, seals, links, proofs and palette contrast
npm run build    # static site in web/dist

cd ../contract
cargo test                                      # 11 unit tests
cargo near build non-reproducible-wasm --no-abi
```

Deploying your own copy:

```bash
near contract deploy YOUR.testnet use-file ./target/near/cachet.wasm \
  with-init-call new json-args '{"allowed_tokens":["usdc.fakes.testnet"],"min_amount":"10000"}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-legacy-keychain send
```

Then point `web/src/lib/config.js` at it.

## Who sees what

| Party | Can see | Cannot see |
|---|---|---|
| The client paying you | Their own invoice, the contract, one single use key | Your account, your balance, everyone else who pays you |
| Anyone reading the chain | That an envelope received an amount from an account | Which envelopes belong to one person, and every invoice detail |
| Whoever you hand a proof to | Exactly the payments you selected | Every payment you left out |

### Where the privacy stops

Stated plainly, because a privacy claim that oversells itself is worse than
none.

- Amounts, paying accounts and settlement times are **public** on NEAR.
- Opening two envelopes into the same account **links** those two payments.
- Cachet hides the earner from the people who pay them. It is **not a mixer**.
- Settling through NEAR Confidential Intents on mainnet, which would hide where
  the money lands as well, is on the roadmap and is **not** in this release.

### What the application sends anywhere

Audited from the source rather than asserted. One kind of outbound request, all
of it in `web/src/lib/near.js`: a view call to public RPC carrying an envelope
identifier, which is a hash. A verification sends that same call to three
endpoints instead of one, so that no single operator has to be trusted; none of
them learns anything the others do not, because all three receive the same
hash. Everything else is your wallet talking to NEAR
when you sign. No cookies, no analytics, no error reporting, no advertising.
Fonts are served from the app's own origin. The seed and invoice records live
in local storage, encrypted with your passphrase using PBKDF2 and AES-GCM.
`/privacy` lists all of it.

## Security

[`docs/AUDIT.md`](docs/AUDIT.md) records a review of the code against its own
claims, including two real defects found and fixed, and one limitation left
open and documented. [`SECURITY.md`](SECURITY.md) holds the threat model.

**This is testnet software and it has not been audited by a third party.** Do
not use it with funds you cannot afford to lose.

## Roadmap

1. Mainnet settlement through NEAR Confidential Intents, hiding the link
   between deposit and withdrawal. Cross-chain pricing is already live on the
   pay screen; execution is the next step.
2. Threshold proofs: "earned at least X a month over N months" without listing
   individual payments.
3. Tax-ready statements and an accountant view.
4. Payroll for small teams.
5. Bank cash-out, corridor by corridor.

## Built with

- [near-sdk](https://github.com/near/near-sdk-rs) 5.30 for the contract
- [SvelteKit](https://svelte.dev/docs/kit) 3 with `adapter-static`, plain
  JavaScript, no TypeScript
- [@noble/curves](https://github.com/paulmillr/noble-curves) for Ed25519 and
  [@scure/base](https://github.com/paulmillr/scure-base) for encodings
- [@near-wallet-selector](https://github.com/near/wallet-selector) with
  MyNearWallet, so a payer needs no browser extension
- Hashing, HKDF, PBKDF2 and AES-GCM come from the platform's own Web Crypto
- Fonts, self-hosted, under the SIL Open Font License: Fraunces, Plus Jakarta
  Sans, JetBrains Mono

Scaffolded with `sv create` and `cargo near new`. The code was written with
Claude Code working from the author's specification, and reviewed before each
commit.

## Licence

MIT. See [LICENSE](LICENSE).
