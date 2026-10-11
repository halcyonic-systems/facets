//! Model self-identity — the stable name a whole model carries (bert-lenses#89
//! step 2.5), and its ONE canonical textual encoding.
//!
//! A [`WorldModel`](crate::WorldModel) that is referenced by another model (a
//! decomposed parent pointing at its child, `System::child_model`) needs an
//! identity that is stable across renames and restructures. The kernel already
//! has such a primitive — the `Uuid` its parameters carry — so [`ModelId`] is a
//! newtype over it, deliberately NOT the hierarchical [`Id`](crate::Id) (a
//! within-model coordinate that changes on restructure).
//!
//! ## Minting policy (the identity's life-cycle)
//!
//! - **New models:** a freshly authored model mints an id at creation via
//!   [`ModelId::mint`] / [`WorldModel::mint_id`](crate::WorldModel::mint_id).
//! - **Lazily, on demand:** a model that has no id yet mints one the moment an
//!   operation needs it (being referenced). [`WorldModel::mint_id`] is
//!   idempotent — it returns the existing id or mints once.
//! - **Never on plain load/save:** deserialization never injects an id, and
//!   `serde(skip_serializing_if = "Option::is_none")` means a model without one
//!   re-serializes byte-for-byte unchanged. Every model authored before this
//!   field existed stays identical on disk. This is the load-bearing invariant
//!   the round-trip goldens prove.
//! - **Save-as-copy mints a NEW id:** a copy is a distinct model and must not
//!   share its origin's identity — a copy path clones the `WorldModel`, clears
//!   `model_id` to `None`, and lets the next `mint_id` assign a fresh one. There
//!   is no save-as-copy code path in the kernel today (it lives in the store /
//!   web layer, foundations doc §7 step 5); this doc comment is that step's
//!   contract until it lands.
//!
//! ## The canonical textual encoding
//!
//! One encoding, used identically wherever a model id appears as text: the JSON
//! form now ([`ModelId`] and [`ModelRef`](crate::ModelRef) both serialize
//! through it) and the SL `decomposes` form later (step 4). It is **base58** of
//! the uuid's 16 bytes (Bitcoin alphabet) — ~22 characters, notably shorter and
//! friendlier than the 36-char hyphenated uuid, and alphanumeric-only so it
//! drops cleanly into an SL token with no quoting. Hand-rolled (no transitive
//! dependency) so the WASM build stays clean.

use std::fmt;
use std::str::FromStr;

use serde::de::{self, Visitor};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use uuid::Uuid;

/// The Bitcoin base58 alphabet: no `0`, `O`, `I`, or `l`, so an encoded id has
/// no visually ambiguous characters.
const ALPHABET: &[u8; 58] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/// Why a base58 string failed to decode back into a 16-byte model id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DecodeError {
    /// A character outside the base58 alphabet.
    InvalidChar(char),
    /// The digits decoded to a byte string that is not exactly 16 bytes — so it
    /// cannot be a uuid-backed model id.
    WrongLength(usize),
}

impl fmt::Display for DecodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DecodeError::InvalidChar(c) => write!(f, "'{c}' is not a base58 character"),
            DecodeError::WrongLength(n) => {
                write!(f, "decoded to {n} bytes, but a model id is 16 bytes")
            }
        }
    }
}

impl std::error::Error for DecodeError {}

/// Encode a uuid's 16 bytes as a base58 string (big-endian, leading zero bytes
/// preserved as leading `1`s).
pub fn encode_uuid(id: &Uuid) -> String {
    let input = id.as_bytes();
    let zeros = input.iter().take_while(|&&b| b == 0).count();

    // Base-256 → base-58 by repeated carry. `digits` holds base-58 digits,
    // least-significant first.
    let mut digits: Vec<u8> = Vec::with_capacity(22);
    for &byte in input.iter() {
        let mut carry = byte as u32;
        for d in digits.iter_mut() {
            carry += (*d as u32) << 8;
            *d = (carry % 58) as u8;
            carry /= 58;
        }
        while carry > 0 {
            digits.push((carry % 58) as u8);
            carry /= 58;
        }
    }

    let mut out = String::with_capacity(zeros + digits.len());
    for _ in 0..zeros {
        out.push('1');
    }
    for &d in digits.iter().rev() {
        out.push(ALPHABET[d as usize] as char);
    }
    out
}

/// Decode a base58 string back into a uuid, or say why it cannot be one.
pub fn decode_uuid(s: &str) -> Result<Uuid, DecodeError> {
    // Base-58 → base-256 by repeated carry. `bytes` holds the result
    // least-significant first.
    let mut bytes: Vec<u8> = Vec::with_capacity(16);
    for ch in s.chars() {
        let val = ALPHABET
            .iter()
            .position(|&c| c as char == ch)
            .ok_or(DecodeError::InvalidChar(ch))? as u32;
        let mut carry = val;
        for b in bytes.iter_mut() {
            carry += (*b as u32) * 58;
            *b = (carry & 0xff) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            bytes.push((carry & 0xff) as u8);
            carry >>= 8;
        }
    }

    let zeros = s.chars().take_while(|&c| c == '1').count();
    bytes.resize(bytes.len() + zeros, 0);
    bytes.reverse();

    let arr: [u8; 16] = bytes
        .as_slice()
        .try_into()
        .map_err(|_| DecodeError::WrongLength(bytes.len()))?;
    Ok(Uuid::from_bytes(arr))
}

/// A model's stable self-identity — a uuid, presented and serialized in the
/// canonical base58 encoding. See the module docs for the minting policy and
/// why the encoding is what it is.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub struct ModelId(pub Uuid);

impl ModelId {
    /// Mint a fresh, random model id. Called at model creation and by the lazy
    /// [`WorldModel::mint_id`](crate::WorldModel::mint_id) path.
    pub fn mint() -> Self {
        ModelId(Uuid::new_v4())
    }

    /// Wrap an existing uuid as a model id.
    pub fn from_uuid(id: Uuid) -> Self {
        ModelId(id)
    }

    /// The underlying stable identity.
    pub fn as_uuid(&self) -> Uuid {
        self.0
    }

    /// The canonical base58 text form.
    pub fn to_base58(&self) -> String {
        encode_uuid(&self.0)
    }
}

impl fmt::Display for ModelId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.to_base58())
    }
}

impl FromStr for ModelId {
    type Err = DecodeError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        decode_uuid(s).map(ModelId)
    }
}

impl Serialize for ModelId {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_base58())
    }
}

impl<'de> Deserialize<'de> for ModelId {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserializer.deserialize_str(Base58Visitor).map(ModelId)
    }
}

/// Shared deserialization for the two base58-encoded id newtypes ([`ModelId`]
/// and [`ModelRef`](crate::ModelRef)): both are one base58 string → one uuid.
pub(crate) struct Base58Visitor;

impl Visitor<'_> for Base58Visitor {
    type Value = Uuid;

    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("a base58-encoded model id")
    }

    fn visit_str<E: de::Error>(self, v: &str) -> Result<Self::Value, E> {
        decode_uuid(v).map_err(de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base58_round_trips_a_uuid() {
        let id = Uuid::new_v4();
        assert_eq!(decode_uuid(&encode_uuid(&id)).unwrap(), id);
    }

    #[test]
    fn base58_is_shorter_than_the_hyphenated_uuid() {
        // The whole point of the encoding: friendlier than 36 chars.
        let id = Uuid::new_v4();
        let encoded = encode_uuid(&id);
        assert!(encoded.len() <= 22, "expected ≤22 chars, got {}", encoded.len());
        assert!(encoded.len() < id.hyphenated().to_string().len());
    }

    #[test]
    fn all_zero_uuid_encodes_to_leading_ones() {
        // Leading zero bytes must survive the round trip, not collapse.
        let id = Uuid::nil();
        let encoded = encode_uuid(&id);
        assert!(encoded.chars().all(|c| c == '1'));
        assert_eq!(decode_uuid(&encoded).unwrap(), id);
    }

    #[test]
    fn all_ones_uuid_round_trips() {
        let id = Uuid::from_bytes([0xff; 16]);
        assert_eq!(decode_uuid(&encode_uuid(&id)).unwrap(), id);
    }

    #[test]
    fn decode_rejects_a_non_base58_character() {
        // '0' is deliberately absent from the alphabet.
        assert_eq!(decode_uuid("0"), Err(DecodeError::InvalidChar('0')));
    }

    #[test]
    fn decode_rejects_a_string_of_the_wrong_length() {
        // A single digit decodes to one byte, not sixteen.
        assert!(matches!(decode_uuid("2"), Err(DecodeError::WrongLength(_))));
    }

    #[test]
    fn model_id_serializes_as_the_base58_string() {
        let id = ModelId::from_uuid(Uuid::from_bytes([0xff; 16]));
        let json = serde_json::to_string(&id).unwrap();
        assert_eq!(json, format!("\"{}\"", id.to_base58()));
        let back: ModelId = serde_json::from_str(&json).unwrap();
        assert_eq!(back, id);
    }

    #[test]
    fn mint_produces_distinct_ids() {
        assert_ne!(ModelId::mint(), ModelId::mint());
    }

    #[test]
    fn display_and_from_str_are_inverse() {
        let id = ModelId::mint();
        assert_eq!(ModelId::from_str(&id.to_string()).unwrap(), id);
    }
}
