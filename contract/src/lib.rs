//! Cachet: sealed envelopes for stablecoin invoices.
//!
//! An earner derives a one-time key for each invoice and publishes a link.
//! The client pays a fungible token into this contract against that key and
//! a `seal`, which is a salted hash of the invoice details. The contract
//! never learns who the earner is: it holds the money under the envelope id
//! `sha256(claim_public_key || seal)`
//! and releases it to whoever can produce a signature by the matching key
//! over a message that names the destination account.
//!
//! The contract has no owner, no upgrade method and no pause. Its
//! configuration is fixed when it is deployed.

use near_sdk::json_types::{U128, U64};
use near_sdk::store::LookupMap;
use near_sdk::{
    env, ext_contract, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise,
    PromiseError, PromiseOrValue,
};

/// Domain separator. It is part of every signed withdrawal message so a
/// signature made for Cachet cannot mean anything anywhere else.
const WITHDRAW_DOMAIN: &[u8] = b"cachet/v1/withdraw";

const GAS_FT_TRANSFER: Gas = Gas::from_tgas(10);
const GAS_SETTLE: Gas = Gas::from_tgas(10);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[near(serializers = [borsh])]
pub struct Envelope {
    /// Salted hash of the invoice details. Nothing readable, by design.
    seal: [u8; 32],
    /// The token this envelope holds. An envelope never mixes tokens.
    token: AccountId,
    /// Everything paid in so far. This is kept after opening, because a
    /// proof refers to the amount that was received.
    amount: u128,
    /// The account that made the first payment.
    payer: AccountId,
    /// Block timestamp of the first payment, in nanoseconds.
    paid_at: u64,
    /// How many separate payments arrived.
    payments: u32,
    /// True once the funds have been released.
    opened: bool,
}

/// What a reader gets back. `seal` is lowercase hex.
#[near(serializers = [json])]
pub struct EnvelopeView {
    pub seal: String,
    pub token: AccountId,
    pub amount: U128,
    pub payer: AccountId,
    pub paid_at: U64,
    pub payments: u32,
    pub opened: bool,
}

#[near(serializers = [json])]
pub struct Config {
    pub allowed_tokens: Vec<AccountId>,
    pub min_amount: U128,
    pub version: String,
}

/// The message a payer puts in `ft_transfer_call`.
#[near(serializers = [json])]
pub struct PayMessage {
    /// Claim public key, 32 bytes as lowercase hex.
    pub claim: String,
    /// Seal, 32 bytes as lowercase hex.
    pub seal: String,
}

#[ext_contract(ext_ft)]
trait FungibleToken {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Cachet {
    envelopes: LookupMap<[u8; 32], Envelope>,
    allowed_tokens: Vec<AccountId>,
    min_amount: u128,
}

#[near]
impl Cachet {
    /// Fixed at deployment. There is no method to change any of it.
    #[init]
    pub fn new(allowed_tokens: Vec<AccountId>, min_amount: U128) -> Self {
        require!(!allowed_tokens.is_empty(), "At least one token must be allowed");
        Self {
            envelopes: LookupMap::new(b"e"),
            allowed_tokens,
            min_amount: min_amount.0,
        }
    }

    /// Called by a token contract when someone pays an envelope.
    ///
    /// Returns the amount to refund: zero when the payment is accepted, the
    /// whole amount when it is not.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let token = env::predecessor_account_id();
        if !self.allowed_tokens.contains(&token) {
            env::log_str("cachet: refused, token not allowed");
            return PromiseOrValue::Value(amount);
        }
        if amount.0 < self.min_amount {
            env::log_str("cachet: refused, amount below the minimum");
            return PromiseOrValue::Value(amount);
        }

        let Ok(pay) = near_sdk::serde_json::from_str::<PayMessage>(&msg) else {
            env::log_str("cachet: refused, message is not a Cachet payment");
            return PromiseOrValue::Value(amount);
        };
        let (Some(claim), Some(seal)) = (decode_32(&pay.claim), decode_32(&pay.seal)) else {
            env::log_str("cachet: refused, claim or seal is not 32 bytes of hex");
            return PromiseOrValue::Value(amount);
        };

        let id = envelope_id(&claim, &seal);

        match self.envelopes.get_mut(&id) {
            Some(existing) => {
                if existing.opened {
                    env::log_str("cachet: refused, this envelope is already opened");
                    return PromiseOrValue::Value(amount);
                }
                if existing.token != token {
                    env::log_str("cachet: refused, this envelope holds a different token");
                    return PromiseOrValue::Value(amount);
                }
                existing.amount = existing
                    .amount
                    .checked_add(amount.0)
                    .unwrap_or_else(|| env::panic_str("amount overflow"));
                existing.payments += 1;
            }
            None => {
                self.envelopes.insert(
                    id,
                    Envelope {
                        seal,
                        token,
                        amount: amount.0,
                        payer: sender_id,
                        paid_at: env::block_timestamp(),
                        payments: 1,
                        opened: false,
                    },
                );
            }
        }

        env::log_str(&format!("cachet: sealed payment into {}", hex(&id)));
        PromiseOrValue::Value(U128(0))
    }

    /// Release an envelope to `recipient_id`.
    ///
    /// Anyone may submit this call; only the holder of the envelope key can
    /// produce the signature. The recipient is inside the signed message, so
    /// a submitter cannot redirect the money.
    pub fn withdraw(
        &mut self,
        claim: String,
        seal: String,
        recipient_id: AccountId,
        signature: String,
    ) -> Promise {
        let claim = decode_32(&claim).unwrap_or_else(|| env::panic_str("claim must be 32 bytes of hex"));
        let seal = decode_32(&seal).unwrap_or_else(|| env::panic_str("seal must be 32 bytes of hex"));
        let signature =
            decode_64(&signature).unwrap_or_else(|| env::panic_str("signature must be 64 bytes of hex"));

        let id = envelope_id(&claim, &seal);
        let envelope = self
            .envelopes
            .get(&id)
            .unwrap_or_else(|| env::panic_str("no envelope with this claim and seal"));

        require!(!envelope.opened, "this envelope has already been opened");
        require!(envelope.amount > 0, "this envelope is empty");

        let message = env::sha256(
            &[
                WITHDRAW_DOMAIN,
                env::current_account_id().as_bytes(),
                &id,
                recipient_id.as_bytes(),
            ]
            .concat(),
        );
        require!(
            env::ed25519_verify(&signature, &message, &claim),
            "the signature does not match this envelope"
        );

        let token = envelope.token.clone();
        let amount = envelope.amount;

        /* Mark it opened before sending, so a second call cannot race the
           first one. The callback puts it back if the transfer fails. */
        self.envelopes.get_mut(&id).unwrap().opened = true;

        ext_ft::ext(token)
            .with_attached_deposit(ONE_YOCTO)
            .with_static_gas(GAS_FT_TRANSFER)
            .ft_transfer(recipient_id, U128(amount), Some("cachet".to_string()))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_SETTLE)
                    .on_withdraw_settled(hex(&id)),
            )
    }

    /// Reopens the envelope if the token transfer failed, so the money is
    /// never stranded.
    #[private]
    pub fn on_withdraw_settled(
        &mut self,
        id_hex: String,
        #[callback_result] result: Result<(), PromiseError>,
    ) -> bool {
        let id = decode_32(&id_hex).unwrap_or_else(|| env::panic_str("bad id"));
        if result.is_err() {
            if let Some(envelope) = self.envelopes.get_mut(&id) {
                envelope.opened = false;
            }
            env::log_str(&format!("cachet: transfer failed, {} is sealed again", id_hex));
            return false;
        }
        env::log_str(&format!("cachet: opened {}", id_hex));
        true
    }

    /* ---- Views ---- */

    pub fn get_envelope(&self, id: String) -> Option<EnvelopeView> {
        let id = decode_32(&id)?;
        self.envelopes.get(&id).map(view_of)
    }

    pub fn get_envelopes(&self, ids: Vec<String>) -> Vec<Option<EnvelopeView>> {
        ids.iter()
            .map(|id| decode_32(id).and_then(|id| self.envelopes.get(&id)).map(view_of))
            .collect()
    }

    pub fn get_config(&self) -> Config {
        Config {
            allowed_tokens: self.allowed_tokens.clone(),
            min_amount: U128(self.min_amount),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

fn view_of(envelope: &Envelope) -> EnvelopeView {
    EnvelopeView {
        seal: hex(&envelope.seal),
        token: envelope.token.clone(),
        amount: U128(envelope.amount),
        payer: envelope.payer.clone(),
        paid_at: U64(envelope.paid_at),
        payments: envelope.payments,
        opened: envelope.opened,
    }
}

fn envelope_id(claim: &[u8; 32], seal: &[u8; 32]) -> [u8; 32] {
    let digest = env::sha256(&[claim.as_slice(), seal.as_slice()].concat());
    let mut out = [0u8; 32];
    out.copy_from_slice(&digest);
    out
}

fn hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(char::from_digit((byte >> 4) as u32, 16).unwrap());
        out.push(char::from_digit((byte & 0x0f) as u32, 16).unwrap());
    }
    out
}

fn decode_hex<const N: usize>(text: &str) -> Option<[u8; N]> {
    let bytes = text.as_bytes();
    if bytes.len() != N * 2 {
        return None;
    }
    let mut out = [0u8; N];
    for i in 0..N {
        let hi = (bytes[i * 2] as char).to_digit(16)?;
        let lo = (bytes[i * 2 + 1] as char).to_digit(16)?;
        out[i] = ((hi << 4) | lo) as u8;
    }
    Some(out)
}

fn decode_32(text: &str) -> Option<[u8; 32]> {
    decode_hex::<32>(text)
}

fn decode_64(text: &str) -> Option<[u8; 64]> {
    decode_hex::<64>(text)
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::testing_env;

    fn token() -> AccountId {
        "usdc.testnet".parse().unwrap()
    }

    fn setup(predecessor: AccountId) -> Cachet {
        let context = VMContextBuilder::new()
            .current_account_id("cachet.testnet".parse().unwrap())
            .predecessor_account_id(predecessor)
            .block_timestamp(1_763_000_000_000_000_000)
            .build();
        testing_env!(context);
        Cachet::new(vec![token()], U128(1))
    }

    fn pay_msg(claim: &str, seal: &str) -> String {
        format!("{{\"claim\":\"{claim}\",\"seal\":\"{seal}\"}}")
    }

    const CLAIM: &str = "11111111111111111111111111111111111111111111111111111111111111aa";
    const SEAL: &str = "22222222222222222222222222222222222222222222222222222222222222bb";

    fn id_hex() -> String {
        hex(&envelope_id(&decode_32(CLAIM).unwrap(), &decode_32(SEAL).unwrap()))
    }

    #[test]
    fn accepts_a_payment_and_stores_only_the_seal() {
        let mut contract = setup(token());
        let refund = contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL));
        match refund {
            PromiseOrValue::Value(v) => assert_eq!(v.0, 0, "the payment should be accepted"),
            _ => panic!("expected a value"),
        }
        let view = contract.get_envelope(id_hex()).expect("envelope exists");
        assert_eq!(view.amount.0, 250);
        assert_eq!(view.seal, SEAL);
        assert_eq!(view.payments, 1);
        assert!(!view.opened);
    }

    #[test]
    fn adds_up_repeated_payments() {
        let mut contract = setup(token());
        contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL));
        contract.ft_on_transfer(accounts(2), U128(150), pay_msg(CLAIM, SEAL));
        let view = contract.get_envelope(id_hex()).unwrap();
        assert_eq!(view.amount.0, 400);
        assert_eq!(view.payments, 2);
        assert_eq!(view.payer, accounts(1), "the first payer is kept");
    }

    #[test]
    fn refunds_a_token_that_is_not_allowed() {
        let mut contract = setup("fake.testnet".parse().unwrap());
        match contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL)) {
            PromiseOrValue::Value(v) => assert_eq!(v.0, 250, "the whole amount is refunded"),
            _ => panic!("expected a value"),
        }
        assert!(contract.get_envelope(id_hex()).is_none());
    }

    #[test]
    fn refunds_an_amount_below_the_minimum() {
        let context = VMContextBuilder::new()
            .current_account_id("cachet.testnet".parse().unwrap())
            .predecessor_account_id(token())
            .build();
        testing_env!(context);
        let mut contract = Cachet::new(vec![token()], U128(1_000));
        match contract.ft_on_transfer(accounts(1), U128(999), pay_msg(CLAIM, SEAL)) {
            PromiseOrValue::Value(v) => assert_eq!(v.0, 999),
            _ => panic!("expected a value"),
        }
    }

    #[test]
    fn refunds_a_message_that_is_not_a_cachet_payment() {
        let mut contract = setup(token());
        match contract.ft_on_transfer(accounts(1), U128(250), "hello".to_string()) {
            PromiseOrValue::Value(v) => assert_eq!(v.0, 250),
            _ => panic!("expected a value"),
        }
    }

    #[test]
    fn refunds_a_malformed_seal() {
        let mut contract = setup(token());
        match contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, "not-hex")) {
            PromiseOrValue::Value(v) => assert_eq!(v.0, 250),
            _ => panic!("expected a value"),
        }
    }

    #[test]
    #[should_panic(expected = "the signature does not match this envelope")]
    fn refuses_a_withdrawal_without_a_valid_signature() {
        let mut contract = setup(token());
        contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL));
        contract.withdraw(
            CLAIM.to_string(),
            SEAL.to_string(),
            accounts(3),
            "00".repeat(64),
        );
    }

    #[test]
    #[should_panic(expected = "no envelope with this claim and seal")]
    fn refuses_a_withdrawal_from_an_envelope_that_does_not_exist() {
        let mut contract = setup(token());
        contract.withdraw(
            CLAIM.to_string(),
            SEAL.to_string(),
            accounts(3),
            "00".repeat(64),
        );
    }

    #[test]
    fn a_different_seal_is_a_different_envelope() {
        let mut contract = setup(token());
        contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL));
        let other_seal = "33".repeat(32);
        contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, &other_seal));
        let first = contract.get_envelope(id_hex()).unwrap();
        assert_eq!(first.amount.0, 250, "dust under another seal cannot touch it");
    }

    #[test]
    fn reads_many_envelopes_at_once() {
        let mut contract = setup(token());
        contract.ft_on_transfer(accounts(1), U128(250), pay_msg(CLAIM, SEAL));
        let missing = "99".repeat(32);
        let found = contract.get_envelopes(vec![id_hex(), missing]);
        assert!(found[0].is_some());
        assert!(found[1].is_none());
    }

    #[test]
    fn config_is_readable_and_has_no_owner() {
        let contract = setup(token());
        let config = contract.get_config();
        assert_eq!(config.allowed_tokens, vec![token()]);
        assert_eq!(config.min_amount.0, 1);
    }
}
