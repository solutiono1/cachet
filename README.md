# Cachet

**Get paid privately. Prove it when it counts.**

Cachet gives every stablecoin invoice its own sealed envelope on NEAR. A client
pays the envelope without ever seeing the earner's wallet, their balance, or the
other people who pay them. Later, when a landlord or a lender asks what the
earner makes, the earner discloses only the payments they choose, as a proof
anyone can check against the chain with no wallet and no account.

Built for the NEAR Hackathon, November 2026. Tracks: **Privacy & Private AI**,
**Real-World Money**, **Open Innovation**.

---

## The problem

A freelancer paid in USDC hands each client a wallet address. That address shows
the client everything: the balance, every other client, every amount, for ever.
And after all that exposure, the earner still has no document a landlord, a
lender or a tax office will accept — only an explorer link that reveals their
whole financial life.

Cachet separates the two things an address wrongly fuses: **receiving money** and
**revealing your history**.

## Live on NEAR testnet

| | |
|---|---|
| Contract | [`cachetapp.testnet`](https://testnet.nearblocks.io/address/cachetapp.testnet) |
| Token | [`usdc.fakes.testnet`](https://testnet.nearblocks.io/address/usdc.fakes.testnet) (NEP-141 test USDC, 6 decimals) |
| Network | NEAR testnet |
| Deploy transaction | [`589yY7g2x2fLdiNgcq3xsoJuLQFRXJxSMSad5qQQ1sH`](https://testnet.nearblocks.io/txns/589yY7g2x2fLdiNgcq3xsoJuLQFRXJxSMSad5qQQ1sH) |

A real round trip already on chain, made by `scripts/demo-testnet.sh`:

| Step | Transaction |
|---|---|
| Client pays 250 USDC into an envelope | [`E8hSaZn4MtTHRUodwyfG6ZtTomz85fSbgrsf3mqCdSa`](https://testnet.nearblocks.io/txns/E8hSaZn4MtTHRUodwyfG6ZtTomz85fSbgrsf3mqCdSa) |
| Earner opens it to another account | [`Aitu76p3saUoc7GZmZvsc6DS79oMAXwx2XrEtkatFj2U`](https://testnet.nearblocks.io/txns/Aitu76p3saUoc7GZmZvsc6DS79oMAXwx2XrEtkatFj2U) |

---

## Check a real proof in two minutes

This needs no wallet, no account and no testnet tokens. It proves the central
claim of the project against the live chain.

```bash
git clone https://github.com/solutionnau/cachet
cd cachet/web
npm install

# A proof over the payment that is already on chain, signed for a named reader.
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
# Edit the audience, which the signature covers.
sed -i 's/Harbour Lettings/Someone Else/' proof.json
node bin/cachet.mjs verify proof.json
```

```
NOT VERIFIED
  FAILED            250 USDC  2026-11-13  Northwind Studio
         The signature does not come from the key that owns this payment.
```

`verify` exits `0` when verified and `1` when not, so it can be used in a script.

> The seed above is published on purpose, for this demo only. A real earner's
> seed never leaves their browser.

---

## How it works

One invoice becomes one **envelope**.

```
envelope key, salt  =  HKDF(seed, "cachet/v1/claim/<n>"), HKDF(seed, "cachet/v1/salt/<n>")
seal                =  SHA-256(canonical invoice details || salt)
envelope id         =  SHA-256(claim public key || seal)
```

1. **Seal.** The earner fills in an invoice. Keys and salt are derived in their
   browser. Nothing is written anywhere, and no transaction is made. The invoice
   travels inside the pay link, in the URL fragment, which browsers never send
   to a server.
2. **Pay.** The client calls `ft_transfer_call` on the token, which hands the
   money to the Cachet contract along with the claim key and seal. The contract
   files it under the envelope id. The chain learns a hash, an amount and a
   payer — never who the earner is.
3. **Open.** The earner signs `SHA-256("cachet/v1/withdraw" ‖ contract ‖
   envelope id ‖ recipient)` with the envelope key. Anyone may submit that
   transaction; only the key holder can produce the signature, and because the
   recipient is inside the signed bytes, a submitter cannot redirect the money.
4. **Prove.** The earner selects payments and signs a statement naming the
   reader, the purpose and an expiry. Each payment carries its own signature.

### What a verifier checks

1. Hash the disclosed details with the disclosed salt; it must equal the seal
   stored on chain.
2. Read the envelope from the contract: it must exist, with that amount and
   that token.
3. Check each payment's signature against the key that owns it, over the
   statement.

Check 3 is the one that matters: **a client who paid an invoice knows every
detail of it, but never holds the envelope key**, so they cannot present the
earner's income as their own.

---

## Run it yourself

### What you need

- Node 20 or newer (built and tested on Node 26.13.1)
- For the contract: Rust 1.95 or newer with the `wasm32-unknown-unknown` target,
  plus a C toolchain (`build-essential` on Debian or Ubuntu)
- For testnet transactions: [`near` CLI](https://github.com/near/near-cli-rs)

### The web app

```bash
cd web
npm install
npm run dev     # http://localhost:5173
npm test        # 19 tests covering keys, seals, links and proofs
npm run build   # static site in web/build
```

There is no server and no database. The app talks to NEAR RPC from the browser.

### The contract

```bash
cd contract
cargo test                                     # 11 unit tests
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

### The full round trip on testnet

`scripts/demo-testnet.sh` seals an envelope, pays it, reads it back and opens
it. It needs three testnet accounts whose keys are in your legacy keychain:

```bash
for a in cachetapp cachetpayer cachetpayout; do
  near account create-account sponsor-by-faucet-service $a.testnet \
    autogenerate-new-keypair save-to-legacy-keychain \
    network-config testnet create
done

# Register each with the token, then mint yourself some test USDC.
near contract call-function as-transaction usdc.fakes.testnet mint \
  json-args '{"account_id":"cachetpayer.testnet","amount":"5000000000"}' \
  prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' \
  sign-as cachetpayer.testnet network-config testnet sign-with-legacy-keychain send

./scripts/demo-testnet.sh
```

---

## What is in here

```
contract/        Rust contract (near-sdk 5), no owner, no upgrade path
  src/lib.rs     ft_on_transfer, withdraw, views, and 11 unit tests
web/
  src/lib/core/  the cryptography: crypto.js, envelope.js, proof.js (+ tests)
  src/lib/       chain reading, wallet, vault, config, formatting
  src/routes/    landing, create, pay, envelopes, prove, verify, settings
  bin/cachet.mjs the command-line tool: envelope, sign, proof, verify
scripts/         the testnet round trip
docs/            ARCHITECTURE.md
examples/        a sample invoice list for the quick start
```

Six screens; four of them need no wallet at all. Creating a pay link, reading
your envelopes, building a proof and checking a proof are all wallet-free.
Only paying an invoice and opening an envelope need a signature, and opening
needs one only to pay the gas — the right to the money comes from the envelope
key.

---

## Who sees what

| Party | Can see | Cannot see |
|---|---|---|
| The client paying you | Their own invoice, the contract, one single-use key | Your account, your balance, anyone else who pays you |
| Anyone reading the chain | That an envelope received an amount from an account | Which envelopes belong to one person, and every invoice detail |
| Whoever you hand a proof to | Exactly the payments you selected | Any payment you left out |

### Where the privacy stops

Said plainly, because a privacy claim that oversells itself is worse than none:

- Amounts, paying accounts and settlement times are public on NEAR.
- Opening two envelopes into the same account links those two payments.
- Cachet hides the earner from the people who pay them. It is **not** a mixer.
- Settling through NEAR Confidential Intents on mainnet, which would also hide
  where the money lands, is on the roadmap and is **not** in this release.

See [SECURITY.md](SECURITY.md) for the threat model and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## Roadmap

1. Mainnet settlement through NEAR Confidential Intents, so the link between
   deposit and withdrawal is hidden too; pay from any chain through 1Click.
2. Threshold proofs: "earned at least X a month over N months" without listing
   individual payments.
3. Tax-ready statements and an accountant view.
4. Payroll for small teams.
5. Bank cash-out, corridor by corridor.

## Built with

- [near-sdk](https://github.com/near/near-sdk-rs) 5.30 — contract
- [SvelteKit](https://svelte.dev/docs/kit) 3 with `adapter-static`, plain
  JavaScript, no TypeScript
- [@noble/curves](https://github.com/paulmillr/noble-curves) — Ed25519
- [@scure/base](https://github.com/paulmillr/scure-base) — base58, base64url, hex
- [@near-wallet-selector](https://github.com/near/wallet-selector) with
  MyNearWallet, so a payer needs no browser extension
- Hashing, HKDF, PBKDF2 and AES-GCM come from the platform's own Web Crypto
- Fonts, self-hosted and under the SIL Open Font License: Fraunces, Plus Jakarta
  Sans, JetBrains Mono

The project was scaffolded with `sv create` and `cargo near new`. The code was
written with Claude Code (Claude, by Anthropic) working from the author's
specification, and every line was reviewed before it was committed.

## Licence

MIT. See [LICENSE](LICENSE).

**Testnet software. It has not been audited. Do not use it with funds you cannot
afford to lose.**
