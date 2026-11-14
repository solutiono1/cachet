# Cachet architecture

Cachet lets a person get paid in stablecoins without exposing their wallet or
their other income, and later prove chosen payments to someone who needs to see
them. This document describes how the system is built and why.

## Components

| Component | Technology | Responsibility |
|---|---|---|
| Contract | Rust, `near-sdk`, compiled to WebAssembly | Holds each payment in a sealed envelope, releases it to whoever proves ownership of the envelope key, and serves receipts |
| Web app | SvelteKit, plain JavaScript, built as a static site | Creates pay links, pays, opens envelopes, builds proofs, verifies proofs |
| Core library | JavaScript module shared by the app and the command-line verifier | Key derivation, hashing, signing, proof encoding and verification |
| Command-line verifier | Node script | Verifies a proof file against the chain without the web app |

There is no application server and no database. The web app talks to NEAR RPC
directly. Nothing about a user's invoices leaves their browser unless they
share a pay link or a proof.

Verification reads the chain through several endpoints run by different
operators and believes a record only when enough of them agree, because an
endpoint is a party you would otherwise have to trust. The operators and the
number that must agree are set in `web/src/lib/config.js`; the agreement logic
is `viewAgreed` in `web/src/lib/near.js`, and what an agreement report means
is in `web/src/lib/core/agreement.js`.

## Vocabulary

- **Envelope**: one payment held by the contract under a one-time key.
- **Seal**: a hash that commits to the invoice details without revealing them.
- **Open**: withdrawing an envelope to an account the earner chooses.
- **Proof**: a signed disclosure of chosen envelopes.

## Keys and hashes

All derivation happens in the earner's browser with WebCrypto and an audited
Ed25519 implementation.

| Value | Derivation |
|---|---|
| Master seed | 32 random bytes from `crypto.getRandomValues` |
| Envelope key pair (invoice *i*) | Ed25519 key from `HKDF-SHA256(seed, info = "cachet/v1/claim/" + i)` |
| Salt (invoice *i*) | `HKDF-SHA256(seed, info = "cachet/v1/salt/" + i)`, 32 bytes |
| Seal | `SHA-256(canonical_json(details) ‖ salt)` |
| Envelope id | `SHA-256(claim_public_key ‖ seal)` |

`details` holds the payee name, client name, description, amount, token, and
issue date. `canonical_json` is UTF-8 JSON with a fixed key order and NFC
normalised strings.

The seed is stored in the browser encrypted with a key derived from the user's
passphrase (PBKDF2-SHA256, AES-256-GCM). The user can export an encrypted
backup file. Losing both the browser data and the backup loses access to
unopened envelopes.

## Flows

### 1. Create a pay link

The earner enters the invoice details. The app derives the next envelope key
and salt, computes the seal, and builds a link. The invoice details, claim
public key, and salt travel in the URL fragment, which browsers do not send to
any server. No transaction is made and nothing is written on chain.

### 2. Pay

The client opens the link. The app recomputes the seal from the details shown
on screen, then asks the client's NEAR wallet to sign one call:

```
usdc.ft_transfer_call(receiver_id = cachet, amount, msg = { claim_pk, seal })
```

The contract's `ft_on_transfer` checks the token is allowed and the amount
meets the minimum, then credits the envelope with that id and records the
payer, amount, and block time. Several payments to the same envelope add up.

The client sees the contract account and a one-time key. They do not see the
earner's account, and they cannot find the earner's other envelopes.

### 3. Open

The earner picks a destination account. The envelope key signs:

```
SHA-256("cachet/v1/withdraw" ‖ contract_id ‖ envelope_id ‖ recipient_id)
```

Any account can submit `withdraw(claim_pk, seal, recipient_id, signature)`.
The contract verifies the signature with `ed25519_verify`, marks the envelope
opened, and transfers the tokens. If the transfer fails, a callback restores
the envelope. Binding the recipient into the signed message means a submitter
cannot redirect the funds.

### 4. Prove

The earner selects envelopes and writes who the proof is for. For each
selected envelope the app includes the details, the salt, and the claim public
key. Each envelope key signs:

```
SHA-256("cachet/v1/disclose" ‖ contract_id ‖ statement_hash)
```

The statement names the payee, the recipient of the proof, the purpose, and an
expiry date. The bundle is shared as a link (in the URL fragment) or as a file.

### 5. Verify

The verifier's browser, or the command-line verifier, does four checks for
every disclosed envelope:

1. Recompute the seal from the disclosed details and salt.
2. Read the envelope from the contract and confirm it exists with that seal.
3. Compare the recorded amount, token, and payment time with the details.
4. Verify the envelope key's signature over the statement.

Check 4 is what stops a client from presenting an invoice they paid as their
own income: the client knows the details and salt, but not the envelope key.

## Contract interface

| Method | Kind | Purpose |
|---|---|---|
| `new(allowed_tokens, min_amount)` | init | Fixes configuration at deployment. There is no owner and no admin method |
| `ft_on_transfer(sender_id, amount, msg)` | call, from token | Credits an envelope |
| `withdraw(claim_pk, seal, recipient_id, signature)` | call | Opens an envelope |
| `on_withdraw_settled(...)` | private callback | Restores the envelope if the transfer failed |
| `get_envelope(envelope_id)` | view | One receipt |
| `get_envelopes(envelope_ids)` | view | Many receipts in one call |
| `get_config()` | view | Allowed tokens and minimum amount |

## What is private and what is not

| Observer | Can see | Cannot see |
|---|---|---|
| The paying client | Their own invoice, the contract, a one-time key | The earner's account, balance, or other envelopes |
| The public | That some envelope received some amount from some payer; where an opened envelope was sent | Which envelopes belong to the same earner, before they are opened; any invoice details |
| A proof recipient | Exactly the envelopes disclosed to them | Any envelope not disclosed |

Limits, stated plainly:

- Amounts, payer accounts, and timing are public on chain.
- Opening an envelope reveals its destination account. Opening several
  envelopes to the same account links them. Cachet reduces what a client learns
  when paying; it is not a mixer and does not hide withdrawals.
- The planned mainnet release settles through NEAR Confidential Intents, which
  hides the link between deposit and withdrawal. That path is not part of this
  release.

## Network

This release runs on NEAR testnet with test USDC. The contract address and the
token address are recorded in the README once deployed.
