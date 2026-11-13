# Cachet contract

Sealed envelopes for stablecoin invoices on NEAR. See the
[project README](../README.md) and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

```bash
cargo test                                      # 11 unit tests
cargo near build non-reproducible-wasm --no-abi # ./target/near/cachet.wasm
```

The contract has no owner, no upgrade method and no pause. `allowed_tokens` and
`min_amount` are fixed by the `new` call at deployment.
