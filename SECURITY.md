# Security

Cachet is testnet software. It has not been audited. Do not use it with funds
you cannot afford to lose.

## Reporting a problem

Open a private security advisory on the repository, or contact the maintainer
through the address listed on the repository profile. Please do not open a
public issue for a vulnerability.

## What the design protects

| Asset | Protection |
|---|---|
| Funds in an envelope | Only a signature from the envelope's one-time key releases them, and the signature names the recipient |
| The earner's identity and other income | Each invoice uses a fresh key; the earner makes no transaction until they open an envelope |
| Invoice details | Only a salted hash goes on chain; details stay in the browser and in links the earner shares |
| Proof integrity | Every disclosed envelope carries a signature from its key over the proof statement |

## Threats considered

| Threat | Outcome |
|---|---|
| A submitter changes the withdrawal recipient | Rejected: the recipient is inside the signed message |
| A withdrawal signature is replayed | Rejected: the envelope is marked opened; the message also binds the contract account |
| A client presents a paid invoice as their own income | Rejected: the client does not hold the envelope key and cannot sign the statement |
| Someone pays dust into an envelope to corrupt it | No effect: the envelope id includes the seal, so a wrong seal creates a different envelope, and correct payments add up |
| Token transfer fails during withdrawal | The callback restores the envelope |
| An unlisted token is sent | The transfer is refunded in full |
| Storage spam | A minimum payment makes each stored envelope cost the sender real tokens |
| Administrator abuse | The contract has no owner, no upgrade method, and no pause; configuration is fixed at deployment |
| Compromised web host serves altered code | The app is static and reproducible from source; the command-line verifier checks proofs without the web app |

## Known limits

- Amounts, payer accounts, and timing are public.
- Opening an envelope reveals the destination account; envelopes opened to the
  same account become linked.
- The master seed lives in the browser, encrypted with the user's passphrase.
  A weak passphrase or malware on the device can expose it.
- Losing the browser data and the backup file loses access to unopened
  envelopes. There is no recovery service.
- A pay link reveals that one invoice's details to anyone who obtains the link.
- The contract cannot be upgraded. A flaw requires deploying a new contract.

## Handling of secrets in this repository

No private keys, seed phrases, or environment files are committed. Deployment
keys stay in the operator's local NEAR credentials directory, which is ignored
by git.
