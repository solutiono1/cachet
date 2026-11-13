#!/usr/bin/env bash
# One full Cachet round trip on NEAR testnet: seal, pay, read, open.
#
# Needs: near CLI, node, and two testnet accounts whose keys are in your
# legacy keychain. See README.md for how to create them.
#
#   ./scripts/demo-testnet.sh
#
# The seed below is a demo seed and is published on purpose. Never use a
# published seed for real invoices.

set -euo pipefail

CONTRACT=${CONTRACT:-cachetapp.testnet}
TOKEN=${TOKEN:-usdc.fakes.testnet}
PAYER=${PAYER:-cachetpayer.testnet}
PAYOUT=${PAYOUT:-cachetpayout.testnet}
SEED=${SEED:-00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff}
INDEX=${INDEX:-0}

here=$(cd "$(dirname "$0")/.." && pwd)
cd "$here/web"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

cat > "$work/details.json" <<JSON
{
  "v": 1,
  "payee": "Demo Earner",
  "client": "Northwind Studio",
  "description": "Brand identity, phase one",
  "amount": "250000000",
  "token": "$TOKEN",
  "issued": "$(date -u +%Y-%m-%d)"
}
JSON

echo "1. Derive the envelope (no network, nothing written anywhere)"
node bin/cachet.mjs envelope --seed "$SEED" --index "$INDEX" --details "$work/details.json" > "$work/envelope.json"
CLAIM=$(node -e "console.log(require('$work/envelope.json').claim)")
SEAL=$(node -e "console.log(require('$work/envelope.json').seal)")
ID=$(node -e "console.log(require('$work/envelope.json').id)")
MSG=$(node -e "console.log(require('$work/envelope.json').ft_transfer_call_msg)")
echo "   envelope id: $ID"

echo
echo "2. The client pays 250 USDC into that envelope"
near contract call-function as-transaction "$TOKEN" ft_transfer_call \
  json-args "{\"receiver_id\":\"$CONTRACT\",\"amount\":\"250000000\",\"msg\":$(node -e "console.log(JSON.stringify(process.argv[1]))" "$MSG")}" \
  prepaid-gas '100.0 Tgas' attached-deposit '1 yoctoNEAR' \
  sign-as "$PAYER" network-config testnet sign-with-legacy-keychain send > "$work/pay.log" 2>&1
grep -iE 'transaction id' "$work/pay.log" | head -1 || true

echo
echo "3. Read the envelope back from the contract"
near contract call-function as-read-only "$CONTRACT" get_envelope \
  json-args "{\"id\":\"$ID\"}" network-config testnet now 2>&1 | sed -n '/{/,/}/p'

echo
echo "4. Sign a withdrawal to $PAYOUT and send it"
node bin/cachet.mjs sign --seed "$SEED" --index "$INDEX" --details "$work/details.json" --to "$PAYOUT" > "$work/sig.json"
SIG=$(node -e "console.log(require('$work/sig.json').signature)")
near contract call-function as-transaction "$CONTRACT" withdraw \
  json-args "{\"claim\":\"$CLAIM\",\"seal\":\"$SEAL\",\"recipient_id\":\"$PAYOUT\",\"signature\":\"$SIG\"}" \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  sign-as "$PAYER" network-config testnet sign-with-legacy-keychain send > "$work/withdraw.log" 2>&1
grep -iE 'transaction id' "$work/withdraw.log" | head -1 || true

echo
echo "5. The money is at $PAYOUT"
near contract call-function as-read-only "$TOKEN" ft_balance_of \
  json-args "{\"account_id\":\"$PAYOUT\"}" network-config testnet now 2>&1 | tail -3
