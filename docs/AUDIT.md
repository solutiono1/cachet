# Security review

A review of Cachet against its own claims, carried out on 2026-11-14 before
submission. It is a careful read of the code by its author, not an independent
audit, and it is recorded here so a reader can check the reasoning rather than
take the result on trust.

Scope: `contract/src/lib.rs`, `web/src/lib/core/`, `web/src/lib/vault.svelte.js`,
`web/src/lib/wallet.svelte.js`, `web/src/lib/near.js`, and the pages that render
untrusted input.

## Findings

### 1. A proof could inflate its own total. Fixed

**Severity: high.** The whole purpose of a proof is to state truthfully what
someone earned.

Listing the same payment twice passed every check. Both copies carried the same
seal, matched the same record on chain, and carried the same valid signature,
because they were the same payment. `totalBy` then counted the amount twice. An
earner could have shown a landlord 500 USDC proven from a single 250 payment by
duplicating one line.

Fixed in `web/src/lib/core/proof.js`: verification accepts the first occurrence
of an envelope and refuses the rest with "This payment is listed more than once
in the proof." Covered by a test that asserts the total stays at 250.

### 2. The storage claim in SECURITY.md was false. Corrected

**Severity: medium**, as a documentation defect that would have misled a
reader about the threat model.

The file claimed the minimum payment made storage spam cost the sender real
tokens. It does not. An envelope is never removed, because a proof must stay
checkable after the money is collected, so the contract pays that storage for
good out of its own NEAR balance. The sender keeps the envelope key and can
take the payment straight back, and on this deployment the token is a testnet
fake that anyone can mint, so it costs nothing to begin with.

Corrected in `SECURITY.md`, including what the mainnet answer would be: a
refundable storage deposit from the payer, the way NEP-141 itself works.

### 3. A dishonest RPC endpoint can forge a verified result. Open, documented

**Severity: medium.** Not fixed, because fixing it properly needs light client
verification, which is out of scope for this release.

`verifyProof` reads the envelope through a single RPC endpoint and compares
what comes back against the locally recomputed seal. If that endpoint lies, and
returns a fabricated record whose seal, amount and token match a fabricated
proof, verification will report Verified.

The attacker must control the endpoint the reader uses, so this is a concern
for someone handed both a proof and an endpoint by the same party. A reader who
uses an endpoint they chose, or who checks the envelope id on a public
explorer, is not exposed. The command-line verifier takes `--rpc`, so a careful
reader can point it wherever they like.

## Checked and found sound

**The withdrawal signature.** The signed message is
`SHA-256("cachet/v1/withdraw" ‖ contract ‖ envelope id ‖ recipient)`. The
domain string stops the signature meaning anything elsewhere, the contract
account stops replay against another deployment, the envelope id stops reuse on
another envelope, and the recipient stops whoever submits the transaction from
redirecting the money. Verified on chain with `env::ed25519_verify`.

**Double spend on withdrawal.** `opened` is set before the cross-contract call,
so a second call cannot race the first. A failed token transfer restores it in
`on_withdraw_settled`, which carries `#[private]` and so can only be called by
the contract itself.

**Envelope integrity.** The envelope id is `SHA-256(claim ‖ seal)`, computed
identically in the browser and in the contract. A payment carrying a different
seal lands in a different envelope, so dust cannot corrupt an existing one.
Amounts accumulate through `checked_add`, and the crate is built with
`overflow-checks = true`.

**Token handling.** `ft_on_transfer` refunds in full when the token is not on
the allow list, when the amount is under the minimum, when the message is not a
Cachet payment, when the claim or seal is not 32 bytes of hex, when the
envelope is already opened, and when the envelope holds a different token.

**Vault encryption.** A fresh 16-byte salt and a fresh 12-byte IV are generated
on every write in `seal()`, so AES-GCM never reuses a nonce under one key.
PBKDF2-SHA256 runs at 310,000 iterations, in line with current OWASP guidance.
A wrong passphrase fails closed with a plain message.

**Cross-site scripting.** There is no `{@html}` anywhere in the application.
Invoice details arriving from a URL fragment, and proof contents arriving from
a pasted file, render as text through Svelte's default escaping.

**The footer's proof box.** It strips anything before `#` and navigates to
`/verify/`, so a pasted link cannot redirect the reader off-site.

**The faucet.** It calls `mint` only on the token named in `config.js`, which is
a testnet fake whose mint is open to everyone by design. The person signs the
transaction themselves; Cachet holds no key and fronts nothing.

## What this review is not

It is not an independent audit, it did not include fuzzing or formal analysis
of the contract, and the browser cryptography has not been reviewed by a
cryptographer. The contract has not been audited by a third party. This is
testnet software and the README says so.
