# STRAITSX DOCS DIGEST — full guides-tree capture

> Complete digest of docs.straitsx.com (v1.6.0) compiled 2026-08-15 for AgentPay. Five parallel readers covered all 58 guide pages, key API-reference pages, and recent changelog entries; every load-bearing fact carries its source URL. Section F is the full machine-readable page index (llms.txt) including one-line descriptions of all ~150 API-reference endpoints.

Method: every docs page is fetchable as raw markdown by appending `.md` to its URL. All target pages returned HTTP 200 — nothing was unfetchable. Raw page copies live alongside the compiled sections in the session scratchpad (`straitsx-digest/`).

## Executive summary — the facts AgentPay's build depends on

**Auth & environments**
- Every API call needs header `X-XFERS-APP-API-KEY`. Hosts: sandbox `api-sandbox.straitsx.com`, production `api.straitsx.com` (legacy xfers.io hosts deprecated). [Section A]
- Optional HTTP request signing: Ed25519 over `METHOD\nPATH\nQUERY\nTIMESTAMP\nNONCE\nBODY`, headers `X-PUBLIC-KEY-ID` / `X-TIMESTAMP` / `X-NONCE` / `X-SIGNATURE`, ±300s clock tolerance, UUID nonce. [Section A]

**XSGD on Avalanche — confirmed live**
- `GET /blockchain_transfer/blockchains` (production-only) lists `xsgd_avax` / `XSGD_AVAX` as `enabled: true` (alongside XSGD_ERC20, XSGD_MATIC, USDC_ERC20, USDT_ERC20, XUSD_ERC20, XUSD_BEP20). [Section C]
- Blockchain callbacks identify the chain as `data.attributes.blockchain: "XSGD_AVAX"`. [Section D]
- Avalanche has the fastest confirmation time of the listed chains: 1–2 min (Ethereum 5–15, Polygon 2–5, BSC 1–3). [Section E]
- **Gap:** no page anywhere in the set states an XSGD contract address or a testnet name/chain-id. DevRel question.

**Getting test XSGD in sandbox (no faucet exists)**
1. `POST /sandbox/merchant/topup` credits **fiat SGD/USD only** — no direct XSGD top-up. [Section C]
2. Convert fiat→XSGD via the Swap API `XSGDSGD` pair (quote valid 1 hour; order size 10–200,000) or via the Cards Sub-Wallet's 1:1 `sgd→xsgd` conversion. [Sections C, E]
3. `POST /sandbox/blockchain_transfer/addresses` creates a per-token/per-network address record + sandbox mock verification. [Section C]
4. Withdraw on-chain via the blockchain-transfer-out flow with the matching `address_id`; `wallet_source` param (`XSGD`/`XUSD`/`USD`/`SGD`) chooses the funding wallet (mandatory-changes release: fiat deposits no longer auto-convert to stablecoin by default). [Sections C, E]
- **Unverified:** whether sandbox blockchain withdrawals actually broadcast on a testnet (Fuji) or are mock-settled. DevRel question.

**Cards Sub-Wallet (the card-funding leg)**
- `POST /sub-wallets/cards-settlement/transfers` — one-way main-wallet→cards-sub-wallet, params `amount`, `currency` (destination), optional `walletSource`, `idempotencyId`. 1:1 for same-currency stablecoin (`xsgd`/`usdc`/`xusd`) and fiat-to-stablecoin `sgd→xsgd` / `usd→xusd`. [Section C]

**Callbacks (the receipt/attribution layer)**
- Verify with header `Xfers-Signature`: HMAC-SHA256 hex digest over the raw body, keyed by the Signing Secret (Dashboard → Platform Tools → Callback URLs → Signing Key; one active secret at a time, rotate via inactive→activate→delete). [Section D]
- Blockchain events `stablecoinDepositStatusUpdated` / `stablecoinWithdrawalStatusUpdated` carry `data.attributes.transaction_hash` (may literally be `"pending"` before broadcast) and counterparty `transaction_source`; deposits can carry `blocked_reasons` (e.g. `travel_rule_check`). [Section D]
- Business-account level uses `userDepositStatusUpdated` / `userWithdrawalStatusUpdated`; customer level uses `paymentStatusUpdated` / `payoutStatusUpdated`; correlate via `idempotency_id`. [Section D]
- Retry policy: payment/payout guide pages say up to 20 retries at 5-minute intervals expecting `200 OK` [Section B]; the 13 callback pages themselves document no retry policy [Section D] — treat 20×5min as the documented figure, confirm with StraitsX.
- Webhook source IPs to allowlist: `52.221.59.197`, `52.77.136.252` (same for both environments). [Section A]

**Transaction mechanics**
- Idempotency: `referenceId` / `idempotency_id` field on transactional POSTs; safe retry, never mutates a completed result. [Section C]
- Errors: `{"errors":[{"error","error_code","error_handling"}]}` with `STXE-1000`…`STXE-9100` codes plus a legacy `XFE*` set still active. [Section C]
- Mandatory since 30 Jan 2026 (in force): SWIFT/ISO-20022 character-set + length validation on CP name/address fields (e.g. `customerName` ≤50 SWIFT chars). [Section E]
- PayNow: S$200k/transaction cap, SGD-only, near-instant. Virtual accounts: 1–2 business-day activation, 90-day lock-in. FX corridors: XUSD/USD→IDR live; XSGD→IDR and SGD→IDR "coming soon". [Section E]

**Integration models (who holds what)**
- First-party: user's own-name rail — deposits from and payouts to a bank account in the user's name only, auto-verified on first successful deposit. CP = basic profile (9 fields, no KYC, no stated limits); CP+ = full KYC/KYB (~21 fields incl. wealth/income bands) with per-profile transaction limits. [Section B]
- Third-party: pay external recipients via payout-recipient objects (`disbursementMethod`: `bankTransfer`/`paynow`/`swift`/`meps`; USD = swift only). [Section B]

## Contents

- **Section A — Platform basics:** hosts, auth, request signing, IPs, Postman
- **Section B — First/Third-party integration models:** CP vs CP+, profile/bank creation, payments, payouts
- **Section C — Money rails & mechanics:** Regular/PayNow/FX/Blockchain/Swap, supported chains, sandbox top-up, Cards Sub-Wallet, status/errors/idempotency/safety/compatibility
- **Section D — Callbacks/webhooks:** all 13 pages, verification scheme, payload fields
- **Section E — FAQs & changelog:** all 16 FAQ pages Q&A-complete, 5 changelog releases
- **Section F — Full page index (llms.txt):** every guide, API-reference endpoint (with descriptions), and changelog entry

---
# StraitsX API Docs — Section A: Platform Basics (Digest)

Compiled 2026-08-15 for AgentPay (StraitsX hackathon: AI-agent payments settling XSGD on Avalanche, wrapping StraitsX card-issuance MCP).

All 7 target URLs were fetched successfully via `curl` (HTTP 200) as raw `.md`. Fetch status:

| # | URL | Status |
|---|---|---|
| 1 | https://docs.straitsx.com/docs/introduction.md | FETCHED |
| 2 | https://docs.straitsx.com/docs/getting-started.md | FETCHED |
| 3 | https://docs.straitsx.com/docs/sandbox-production-environments.md | FETCHED |
| 4 | https://docs.straitsx.com/docs/authentication-methods.md | FETCHED |
| 5 | https://docs.straitsx.com/docs/download-postman-collection.md | FETCHED |
| 6 | https://docs.straitsx.com/docs/source-ip-addresses.md | FETCHED |
| 7 | https://docs.straitsx.com/docs/http-request-signing.md | FETCHED |

Note on XSGD/blockchain/testnet content: **none of these 7 "platform basics" pages mention XSGD, Avalanche, blockchain testnets, or test funds by name.** Page 1 (introduction.md) does mention a general "Blockchain API" and "Swap API" product category (on-chain deposits/withdrawals, stablecoin swaps) but gives no XSGD-specific or network-specific detail. This is an absence-is-a-finding: AgentPay's XSGD/Avalanche specifics will need to come from other doc sections (e.g., the dedicated Blockchain API / Swap API pages), not from this platform-basics set.

---

## 1. Introduction — https://docs.straitsx.com/docs/introduction.md

**Purpose:** Landing page for the StraitsX API Guides. Describes integration models and the six product API families.

**Doc metadata:** `updatedAt: 2025-07-09T11:38:31.000Z`. Page also instructs readers to fetch `https://docs.straitsx.com/llms.txt` for the full documentation index (this is baked into every page's header, not specific content).

**Integration Models** (choose based on approved use case — contact StraitsX to determine which applies):
- **First Party Transfer (Customer Profile)** — for partners (e.g. crypto exchanges) using APIs for first-party collections/payouts. Users can only deposit from / withdraw to their own bank account (no third-party transactions). Doc: `https://docs.straitsx.com/docs/first-party-transfer`
- **Third Party Transfer (Customer Profile)** — for partners (e.g. PSPs) making collections/payouts on behalf of their users; partner can send funds to users, merchants, or third parties. Doc: `https://docs.straitsx.com/docs/third-party-transfer`
- **Regular Transfer** — for partners needing general collection/payout functionality without first/third-party restrictions (e.g. corporate treasury). Funds can come from any of the partner's corporate bank accounts. Doc: `https://docs.straitsx.com/docs/regular-transfer`

**Product Guides — six API families** (availability depends on integration type/access granted):
1. **Customer Profiles API** — create/update/retrieve customer profiles; required for using Payment/Payout APIs; two variants exist (CP vs CP+, see `https://docs.straitsx.com/docs/customer-profilecp-vs-customer-profilecp`); KYC compliance; link bank accounts.
2. **Payment API** — one-time payments; PayNow / Bank Transfer methods; dynamic/persistent PayNow QR codes; real-time payment statuses.
3. **Payout API** — disburse funds to bank accounts; bulk payouts; payout status tracking/reporting.
4. **Swap API** — swap between supported cryptocurrency pairings; real-time swap quotes; execute swaps between stablecoins and supported digital assets; retrieve past swap transactions; monitor price/liquidity. (No XSGD-specific detail given here.)
5. **Blockchain API** — on-chain deposits/withdrawals for supported cryptocurrencies; whitelisting & security to prevent unauthorized transfers; estimate network fees; support for multiple blockchain networks. (No named networks — Avalanche not mentioned on this page.)
6. **Transaction Limit API** (CP+ merchants only) — retrieve transaction limits; request updates; retrieve update-request details.

Support contact link referenced throughout: `https://docs.straitsx.com/docs/support`.

---

## 2. Getting Started — https://docs.straitsx.com/docs/getting-started.md

**Purpose:** Step-by-step onboarding checklist for new integrators.

**Doc metadata:** `updatedAt: 2025-12-04T09:06:46.000Z`

**Prerequisites:**
- Sign up for a StraitsX Business Account: `https://www.straitsx.com/sg/sign-up`
- Have admin/developer role access for the Business Account
- Reference: "Signing up for a StraitsX Business Account" — `https://support.straitsx.com/hc/en-us/articles/4410453392409-Signing-up-for-a-StraitsX-business-account`

**Using API Keys:**
- Authentication is via API key — "a unique alphanumeric string that associates your StraitsX business account with your users, and with the specific API."
- Sandbox API keys are retrieved from the **Sandbox Developer Tools Page** in the StraitsX Business Dashboard.
- Callout: "Sandbox API keys are now available when you sign up for a StraitsX Business Account" (`https://www.straitsx.com/sg/sign-up`).
- Screenshots referenced (informational only, not fetched as images): "1. Access Sandbox Mode", "2. Access Sandbox API key".

**Sandbox & Production Environments (duplicated in page 3, see below for full table):**
> "we have officially moved to the latest API host since March 2024. If you are new to StraitsX API, please integrate using the latest host (`api-sandbox.straitsx.com` and `api.straitsx.com`)." Old host still supported for existing partners "until further notice" but migration is strongly encouraged.

| Environment | API Host (Latest) | API Host (Outdated) |
|---|---|---|
| Sandbox | `api-sandbox.straitsx.com` | `sandbox.xfers.io/api` |
| Production | `api.straitsx.com` | `xfers.io/api` |

**Integration Steps (exact sequence given):**
1. Sign up for a StraitsX Business Account — `https://www.straitsx.com/sg/sign-up`
2. Create a developer role under the Team tab — `https://support.straitsx.com/hc/en-us/articles/4410434330777-How-to-add-more-users-into-my-account-`
3. Switch to sandbox environment — `https://docs.straitsx.com/docs/sandbox-production-environments`
4. Get Sandbox API Keys — `https://docs.straitsx.com/docs/api-keys`
5. Test Customer Profile API on Sandbox — `https://docs.straitsx.com/docs/get-started`
6. Configure Callback URL via Developer Tools — `https://docs.straitsx.com/docs/callback-configuration`
7. Test Payment (`https://docs.straitsx.com/docs/get-started-with-payment-api`) / Payout (`https://docs.straitsx.com/docs/get-started-with-payout-api`) API on Sandbox
8. Test APIs on production environment

---

## 3. Sandbox & Production Environments — https://docs.straitsx.com/docs/sandbox-production-environments.md

**Purpose:** Explains how to switch environments on the dashboard and states the API hosts (authoritative version of the host table).

**Doc metadata:** `updatedAt: 2025-08-28T15:49:27.000Z`

**Switching environments:** Sign in at `https://straitsx-biz.xfers.com/`, then switch between sandbox/production by clicking the user profile menu. Sandbox mode is used "to simulate account creation and payments"; production mode is used "when you're ready to process live payments."

**API Host (authoritative, current):**

> Host Update callout (verbatim intent): officially moved to the latest API host since March 2024; new integrators should use `api-sandbox.straitsx.com` and `api.straitsx.com`; old host still supported for existing partners but migration encouraged.

| Environment | API Host |
|---|---|
| Sandbox | `api-sandbox.straitsx.com` |
| Production | `api.straitsx.com` |

(Note: this page's table omits the "outdated" host column that appears on the Getting Started page — the outdated hosts `sandbox.xfers.io/api` and `xfers.io/api` are documented on page 2 only.)

No XSGD, testnet, or test-fund details on this page — it is purely about dashboard/API host switching, not about blockchain testnets.

---

## 4. Authentication Methods — https://docs.straitsx.com/docs/authentication-methods.md

**Purpose:** Canonical page describing StraitsX's two supported authentication methods.

**Doc metadata:** `updatedAt: 2026-03-27T01:38:59.000Z`

**Both methods require the header `X-XFERS-APP-API-KEY`**, which identifies your business account. Security warning: "Your API keys and private keys carry many privileges... Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth."

### Method 1: API Key Authentication (Default)
- Token/bearer-style: the API key is included in the request header; "no additional signing or cryptographic steps are required."
- Header: **`X-XFERS-APP-API-KEY`** — "Your API key, retrieved from the StraitsX Business Dashboard > Platform Tools section."
- Location screenshot: "StraitsX Business Dashboard > Platform Tools > API Keys, Public Key and IP Whitelisting Section" (implies IP whitelisting, API keys, and public key management all live in this one dashboard section).
- All accounts have an "app" key for both Sandbox and Production:

| Environment | API Key (header name) | Location (steps) |
|---|---|---|
| Sandbox | `X-XFERS-APP-API-KEY` | 1. Log in to `https://straitsx-biz.xfers.com` → 2. Toggle to Sandbox Mode (see `https://docs.straitsx.com/docs/sandbox-production-environments#switching-between-environments`) → 3. Navigate to Dev Tools Tab |
| Production | `X-XFERS-APP-API-KEY` | 1. Log in to `https://straitsx-biz.xfers.com` → 2. Navigate to Dev Tools Tab |

- Suitable for "most integrations," requires "no additional setup beyond generating your API key from the StraitsX Dashboard."

### Method 2: HTTP Request Signing (Optional)
- "Enhanced authentication option that uses asymmetric cryptography (public/private key pairs) to sign each API request." Provides stronger security on top of the API key.
- In addition to `X-XFERS-APP-API-KEY`, these headers are required when enabled:

| Header | Description |
|---|---|
| `X-PUBLIC-KEY-ID` | The Key ID of the public key uploaded to your StraitsX Dashboard |
| `X-TIMESTAMP` | Current Unix epoch time in seconds. Must be within **±300 seconds** of server time |
| `X-NONCE` | A unique UUID string per request, used for replay protection. Must not be reused within the timestamp window |
| `X-SIGNATURE` | Base64-encoded digital signature of the canonical request string |

- Cross-reference: full implementation detail is in the "HTTP Request Signing FAQ section" — link given on this page as `https://docs.straitsx.com/v1.4.0/docs/http-request-signing` (note: this is a **versioned** URL, `v1.4.0`, distinct from the unversioned page 7 URL given in this task — see discrepancy note below).

**Getting Started with HTTP Request Signing (3 steps, verbatim):**
1. Keep your `private.pem` safe on your server — never share or expose it.
2. Upload your `public.pem` to the StraitsX Dashboard under the Public Key management section.
3. Test your signing flow in the Sandbox environment before enabling it in Production.

### Security Best Practices (applies to both methods)
Do: store private key in secure vault/env var; use descriptive key names; rotate keys every 6–12 months; test in Sandbox before Production.
Don't: commit private key to GitHub/VCS; send private key via email/messaging; reuse the same key for Production and Sandbox; hardcode API/private keys in source code.

---

## 5. Download Postman Collection — https://docs.straitsx.com/docs/download-postman-collection.md

**Purpose:** Single link to the Postman collection covering both environments.

**Doc metadata:** `updatedAt: 2025-07-09T11:38:34.000Z`

**Postman collection link (Production + Sandbox, both in one collection folder):**
`https://drive.google.com/drive/folders/1-2vaE1C1B2gH2Ncklam9hAEzASdrTm2E?usp=sharing`

**Support contact for Postman issues:** `straitsx-payments@fazzfinancial.com`

(Note: this is a Google Drive folder link, not a native Postman "Run in Postman" button/link — worth flagging for integrators who expect a direct Postman workspace import.)

---

## 6. Source IP Addresses — https://docs.straitsx.com/docs/source-ip-addresses.md

**Purpose:** Lists the outbound IPs StraitsX sends webhooks from, for allowlisting.

**Doc metadata:** `updatedAt: 2025-07-09T11:41:46.000Z`

**Context:** "Webhooks will be sent from these IP Addresses. You will need to whitelist these IP Addresses to receive webhooks for both production and sandbox environments." (Same IPs apply to both environments — no separate sandbox/production IP lists.)

**Webhook source IPs to allowlist:**
- `52.221.59.197`
- `52.77.136.252`

This page is specifically about **webhook-sending IPs**, not about IPs StraitsX requires integrators to allowlist for inbound API calls (i.e., this is StraitsX → you, not you → StraitsX). No other IP-related info (e.g. an inbound IP allowlist requirement for calling the StraitsX API) appears on this page.

---

## 7. HTTP Request Signing (FAQ) — https://docs.straitsx.com/docs/http-request-signing.md

**Purpose:** Full technical FAQ/spec for HTTP Request Signing — the authoritative detail page referenced by page 4.

**Doc metadata:** `updatedAt: 2026-08-10T01:52:27.000Z`

**Discrepancy note:** Page 4 (authentication-methods.md) links to this content at `https://docs.straitsx.com/v1.4.0/docs/http-request-signing` (versioned path), while the task's target URL is the unversioned `https://docs.straitsx.com/docs/http-request-signing.md`. Both were treated as the same underlying content; only the unversioned URL was fetched per the task's URL list. If integrating in the future, verify the versioned vs. unversioned page haven't diverged.

### 1. What is it?
Enhanced authentication using asymmetric cryptography (public/private key pairs). You sign each request with your private key; StraitsX verifies with your public key, ensuring integrity + authenticity of every request.

### 2. Is it mandatory?
No — optional upgrade. Existing `X-XFERS-APP-API-KEY` authentication "continues to work as before." Adopt at your own pace.

### 3. How to check if enabled
Log in to StraitsX Dashboard → Public Key management section → check activation toggle is On. Note: "The toggle can only be enabled if you have at least one active key in your account."

### 4. Signing algorithm
**Ed25519.** Rationale given: asymmetric (no shared secret), private key never leaves your server; deterministic signatures (same output for same input every time) — no secure RNG needed at signing time, reducing implementation-error risk.

### 5. Key pair generation
**Method 1 — OpenSSL (recommended):**
```
openssl genpkey -algorithm ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
```
**Method 2 — ssh-keygen:**
```
ssh-keygen -t ed25519 -N "" -f ./my_signing_key
ssh-keygen -p -m PEM -f ./my_signing_key   # convert to PEM if needed
```

### 6. Uploading the public key
StraitsX Dashboard → Public Key management section → upload/view/manage public keys.

### 7. Canonical string construction — THE critical spec detail

The signing string is **six components joined by `\n`** (literal newline characters):
```
METHOD\nPATH\nQUERY\nTIMESTAMP\nNONCE\nBODY
```

| Component | Description | Example |
|---|---|---|
| METHOD | HTTP method, uppercased | `POST`, `GET`, `DELETE` |
| PATH | Request path only (no query string, no host) | `/v1/fx/payouts` |
| QUERY | Normalized query string (see normalization rules below). Empty string if none | `page[number]=2&page[size]=20` |
| TIMESTAMP | Unix timestamp (seconds since epoch), same value sent in `X-TIMESTAMP` header | `1640000000` |
| NONCE | Unique random string per request, same value sent in `X-NONCE` header | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| BODY | Raw request body. Empty string for requests without a body (e.g. GET, DELETE) | `{"amount":"100"}` |

**Query String Normalization steps (verbatim):**
1. Take the raw query string from the URL (everything after `?`).
2. Split on `&` to get individual `key=value` pairs.
3. Sort the pairs alphabetically (lexicographic byte order on the full `key=value` string).
4. Rejoin with `&`.
5. If there are no query parameters, use an empty string `""`.
- "Do not decode or re-encode the pairs — sort them exactly as they appear in the URL."

**Worked examples (all verbatim from doc):**

*Example 1 — POST with JSON body, no query string:*
```
POST
/v1/fx/payouts

1640000000
f47ac10b-58cc-4372-a567-0e02b2c3d479
{"quoteId":"c4d1da72-111e-4d52-bdbf-2e74a2d803d5"}
```
(QUERY line is empty.)

*Example 2 — GET with simple query params:*
Request: `GET /v1/fx/payouts?sort=createdAt&page[size]=20`
Split → `["sort=createdAt", "page[size]=20"]`; sorted → `["page[size]=20", "sort=createdAt"]`; rejoined → `page[size]=20&sort=createdAt`
```
GET
/v1/fx/payouts
page[size]=20&sort=createdAt
1640000000
f47ac10b-58cc-4372-a567-0e02b2c3d479

```
(Trailing empty line = empty BODY component.)

*Example 3 — GET with bracket-style/nested params:*
Request: `GET /v1/fx/payouts?filter[status]=completed&filter[size]=20&page[number]=2`
Note: "Bracket-style parameters like `filter[status]` and `page[size]` are treated as plain strings. No special parsing is needed."
Sorted/rejoined → `filter[status]=completed&page[number]=2&page[size]=20`
```
GET
/v1/fx/payouts
filter[status]=completed&page[number]=2&page[size]=20
1640000000
f47ac10b-58cc-4372-a567-0e02b2c3d479

```

*Example 4 — GET with no query parameters:*
Request: `GET /v1/fx/quotes/c4d1da72-111e-4d52-bdbf-2e74a2d803d5`
```
GET
/v1/fx/quotes/c4d1da72-111e-4d52-bdbf-2e74a2d803d5

1640000000
f47ac10b-58cc-4372-a567-0e02b2c3d479

```
("The QUERY line is an empty string (resulting in two consecutive newlines between PATH and TIMESTAMP). The BODY is also an empty string (trailing empty line before the end marker).")

**Signing the string (steps, verbatim):**
1. Sign the canonical string using your Ed25519 private key.
2. Base64-encode the resulting signature (strict encoding, no line breaks).
3. Send the encoded signature in the `X-SIGNATURE` header.

**Required Headers (final table):**

| Header | Value |
|---|---|
| `X-XFERS-APP-API-KEY` | Your API key |
| `X-PUBLIC-KEY-ID` | ID of the registered public key |
| `X-TIMESTAMP` | Same timestamp used in the signing string |
| `X-NONCE` | Same nonce used in the signing string |
| `X-SIGNATURE` | Base64-encoded Ed25519 signature |

**Code samples provided for:** Python (using `nacl.signing.SigningKey`), JavaScript/Node.js (using `tweetnacl`'s `sign.detached`), Go (using `crypto/ed25519` + PKCS8 PEM parsing), Ruby (using `OpenSSL::PKey`). All four implement the identical GET example (`/v1/fx/payouts?sort=createdAt&page[size]=20`), splitting path/query, sorting query pairs, joining with `\n`, signing with Ed25519, and base64-encoding the signature.

**Important Notes (verbatim, critical edge cases):**
- Sort the *raw URL-encoded* pairs. If the URL contains `filter%5BpageSize%5D=20`, sort using that encoded form, not the decoded `filter[pageSize]=20`.
- PATH never includes the query string: `/v1/fx/transactions` only — no `?`.
- QUERY and BODY are separate components. GET requests always have empty BODY regardless of query parameters.
- Duplicate keys are allowed: if URL has `tag=a&tag=b`, both pairs are kept and sorted independently.
- Timestamp and nonce in headers must match exactly what was used in the signing string — any mismatch fails verification.
- Each nonce must be unique — reuse is rejected as a replay attack.
- Timestamp must be recent — expired timestamps are rejected.
- Body must be the exact raw string sent in the request — whitespace/key-ordering differences invalidate the signature.

### 8. Timestamp tolerance
**±300 seconds (5 minutes)** of server's current time. Outside this window → rejected with a `clock_skew` error. "Ensure your server clock is synchronized via NTP." Accepted format: Unix timestamp in seconds (e.g. `1640000000`).

### 9. Nonce
UUID string, unique per request, prevents replay attacks. Accepted regex (verbatim):
```
/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i
```

### 10. Error responses (full table, verbatim)

| Error | Error Code | HTTP Status | Description |
|---|---|---|---|
| Missing Required Signature Headers | `STXE-3000` | 400 | One or more required signing headers (`X-XFERS-APP-API-KEY`, `X-PUBLIC-KEY-ID`, `X-SIGNATURE`, `X-TIMESTAMP`, `X-NONCE`) are missing |
| Missing Public Key ID | `STXE-3000` | 400 | The `X-PUBLIC-KEY-ID` header is required when signature authentication is enabled for your account |
| Invalid Nonce Format | `STXE-3000` | 400 | The nonce must be a valid UUID format |
| Invalid Timestamp Format | `STXE-3000` | 400 | The provided timestamp format is invalid. Please use Unix timestamp (seconds since epoch) |
| Public Key Inactive | `STXE-4000` | 400 | The specified public key is inactive and cannot be used for signature verification |
| Invalid Request Signature | `STXE-1000` | 401 | The provided signature could not be verified. Ensure you are signing the canonical string correctly with your private key |
| Request Timestamp Expired | `STXE-1000` | 401 | The request timestamp is outside the acceptable time window (±5 minutes). Ensure your system clock is synchronized |
| Replay Attack Detected | `STXE-1000` | 401 | This nonce has already been used. Generate a new unique nonce for each request |
| Key Ownership Mismatch | `STXE-2000` | 403 | The API token and public key must belong to the same user |
| Public Key Not Found | `STXE-5000` | 404 | The specified public key could not be found or has been deactivated |

### 11. Key rotation
Supported — multiple public keys identified by `X-PUBLIC-KEY-ID`. Upload new key, start using it, then deactivate/delete old key → zero-downtime rotation.

### 12. Key limit
**Up to 5 active public keys per account.**

### 13. Switching back
Yes, reversible — HTTP Request Signing is a per-account toggle in the StraitsX Account Dashboard; existing API key authentication continues to work regardless.

---

## Cross-page consistency notes / inferences (NOT literal doc quotes — flagged as inference)

- *Inference:* Every fetched page carries an identical boilerplate line pointing to `https://docs.straitsx.com/llms.txt` as a documentation index. This was not separately fetched as part of this task (out of scope) but is worth noting as a way to discover further pages (e.g., the dedicated Blockchain API / Swap API / XSGD-specific pages needed for AgentPay's Avalanche integration).
- *Inference:* The dashboard login URL is consistently `https://straitsx-biz.xfers.com` (or `https://straitsx-biz.xfers.com/`) across pages 2 and 3 — legacy "xfers" branding persists in the login domain even though the API host has moved to `straitsx.com`.
- *Inference:* API Keys, Public Key management, and IP Whitelisting all appear to live under one StraitsX Business Dashboard section: "Platform Tools" per page 4's screenshot caption ("StraitsX Business Dashboard > Platform Tools > API Keys, Public Key and IP Whitelisting Section"). This suggests there may be an *inbound* IP whitelisting feature for API calls (distinct from the *outbound* webhook-source IPs on page 6), but no page in this set documents what that inbound whitelist is for or how to configure it — this is a gap for integrators to investigate directly in the dashboard.
- *Documented fact, not inference:* Nowhere in these 7 pages is XSGD named, nor is Avalanche, nor is any blockchain testnet or "test funds" mechanism described. AgentPay's team should expect to find this in the Blockchain API / Swap API doc sections (referenced only by name and link in page 1), not in platform-basics.
# StraitsX API Docs — First-Party & Third-Party Integration Models: Digest

Fetched via `curl` of the `.md` raw-markdown endpoints on 2026-08-15. All 10 pages fetched successfully (HTTP 200) — none NOT FETCHED.

Local source copies: `/private/tmp/claude-501/-Users-desmondchyezhihao-Documents-GitHub-agentpay/012fbfd0-fb2e-481f-a95d-9a00481523ec/scratchpad/straitsx-digest/01..10-*.md`

**Note on endpoint identifiers**: These guide pages link to API reference pages via ReadMe `ref:` anchors rather than printing literal REST paths (method + URL). The anchor slugs are the closest verbatim "endpoint name" given in these pages and are quoted below exactly as written; actual HTTP method/path would need to be pulled from the linked reference pages (not in scope of the 10 URLs fetched).

---

## 1. Source: `first-party-transfer.md`
https://docs.straitsx.com/docs/first-party-transfer.md

**Title:** "First Party Transfer (Customer Profile & Customer Profile+)"

- Purpose: for partners who **exclusively** use the StraitsX API to collect payment from their own users and pay out to their own users' external bank accounts.
- Constraint: "all incoming and outgoing transactions are restricted to first party only, i.e. your user must deposit from and withdraw to a bank account in their name." (own-name-only rail — no third-party bank accounts.)
- Regulatory note: "We will require information on your users as per regulations."
- Example partner type given: crypto exchanges.
- If unsure of category → contact StraitsX support (link to `docs/support`).

---

## 2. Source: `customer-profilecp-vs-customer-profilecp.md`
https://docs.straitsx.com/docs/customer-profilecp-vs-customer-profilecp.md

**Title:** "Customer Profile(CP) vs Customer Profile+(CP+)"

- Context: under the first-party transfer model, partners set up either **CP** or **CP+** accounts for their users, depending on business nature.

### CP vs CP+ comparison table (verbatim from source)

| Aspect | CP | CP+ |
|---|---|---|
| Named collections and payouts | Offer named collections and payouts | Offer named collections and payouts |
| KYC/KYB depth | "Require basic info which does not go through KYC/KYB verification" | "Require extensive info which needs to be fully KYC/KYB-ed" |
| Transaction limits | — (none stated) | "Transaction limit imposed for each customer profile" |
| Compliance notifications | — (none stated) | "Additional compliance requirements on transaction notifications" |

This is the entire content of this comparison page — it is short and does not enumerate specific dollar limits, only states that CP+ has a per-customer-profile transaction limit and extra compliance notification obligations, without quantifying either.

---

## 3. Source: `customer-profile-and-bank-account-creation.md`
https://docs.straitsx.com/docs/customer-profile-and-bank-account-creation.md

**Title:** "Customer Profile and Bank Account Creation" (regular CP, first-party model)

- Overview: under first-party transfer, must create a **customer profile** per user, and each profile must have a **verified customer profile bank account** attached "to ensure first party withdrawals." This is a **pre-requisite for accessing payment and payout APIs** under First Party Transfer.
- Sequence diagram referenced (image only, no step text extracted): `https://files.readme.io/1f1813c-image.png`

### Mandatory fields — regular CP (verbatim field names)

**Business:**
`customerName`, `registrationType` (business), `registrationId` (UEN), `registrationIdType`, `registrationIdCountry`, `address` (`street`, `city`, `state`, `country`), `placeofBiz`, `placeofBizCountry`, `countryOfIncorporation`, `dateOfIncorporation`

**Personal:**
`customerName`, `registrationType` (personal), `registrationId` (NRIC/Passport No.), `registrationIdType`, `registrationIdCountry`, `address` (`street`, `city`, `state`, `country`), `countryOfResidence`, `dateOfBirth`, `nationality`

### Bank account creation
- Get supported SG banks via ref `get-a-list-of-supported-banks`.
- Warning: some banks have multiple bank codes — e.g. HSBC Business Account = `HSBC`, HSBC Personal Account = `HBSC2`; Malayan Banking Berhad = `MBB`, Maybank Singapore = `MBB2`. Wrong code → payment/payout failures.
- **Verification mechanism**: "StraitsX will expect to receive funds from this bank account and will only allow withdrawals to the same bank account after it has been verified. Upon the first successful deposit, the sender's bank account will be automatically added and verified." Manual alternative: request proof of bank account from user.
- **Sandbox simulation**: ref `sandbox-update-customer-profile-bank-account-verification-status` — mock the verification status of a created bank account.

### Webhooks
- Verification status transitions to `rejected` or `verified` → callback fired to the configured callback URL.
- Details: see "Customer Profile Callbacks (Regular CP)" doc.

---

## 4. Source: `customer-profile-plus-and-bank-account-creation.md`
https://docs.straitsx.com/docs/customer-profile-plus-and-bank-account-creation.md

**Title:** "Customer Profile+ and Bank Account Creation" (CP+, first-party model)

- Overview: under first-party (CP+) model, must create a CP+ account per user with a verified bank account attached to enable first-party withdrawals. "CP+ requires extensive KYC/KYB information and goes through a verification process before the account is fully activated."
- Sequence diagram image: `CP_Plus_and_Bank_Account_Creation_Sequence_Diagram.png` (files.readme.io).
- CP+ supports both **Personal** and **Business** account types with different mandatory fields per type.

### Mandatory fields — Business CP+ (verbatim)

| Field | Description |
|---|---|
| `customerName` | Business legal name (50 alphanumeric with spaces) |
| `registrationType` | `business` |
| `registrationIdType` | `business_reg_no` |
| `registrationId` | Business Registration Number (UEN) |
| `entityLegalForm` | `PRIVATE_COMPANY` or `PUBLIC_COMPANY` |
| `businessContact` | Contact phone number |
| `countryOfIncorporation` | 2-digit ISO country code |
| `dateOfIncorporation` | `yyyy-MM-dd` format |
| `address` | Registered address (`street`, `city`, `state`, `country` required) |
| `operatingAddress` | Operating address (`street`, `city`, `state`, `country` required) |
| `natureOfBusiness` | Business activity type |
| `usOwnership` | `true` / `false` |
| `intermediaries` | `true` / `false` |
| `monthlyTransactionVolume` | Expected monthly volume range |
| `sourceOfFunds` | Array of fund sources |
| `directors` | Array of director details |
| `beneficialOwners` | Array of beneficial owner details |
| `trader` | Trader/authorized person details |
| `documents` | KYB documents |
| `purposeOfAccount` | Purpose of the account |

Full field/value list → ref `create-a-business-customer-profile-plus`.

### Mandatory fields — Personal CP+ (verbatim)

| Field | Description |
|---|---|
| `customerFirstName` | First name |
| `customerLastName` | Last name |
| `registrationType` | `personal` |
| `registrationId` | NRIC/Passport number |
| `registrationIdType` | `identity_card`, `passport`, etc. |
| `registrationIdCountry` | 2-digit ISO country code |
| `address` | Residential address (`street`, `city`, `state`, `country` required) |
| `countryOfResidence` | 2-digit ISO country code |
| `dateOfBirth` | `yyyy-MM-dd` format |
| `email` | Email address |
| `gender` | `MALE` or `FEMALE` |
| `nationality` | 2-digit ISO country code |
| `businessIndustry` | Industry classification |
| `occupation` | Occupation type |
| `expectedAnnualTransactionAmount` | Expected annual volume range |
| `expectedTransactionSize` | Expected per-transaction size range |
| `expectedTransactionFrequency` | Expected frequency |
| `annualIncome` | Annual income range |
| `totalWealth` | Total wealth range |
| `identityDocuments` | KYC identity documents |
| `ipAddresses` | Array of IP addresses |
| `purposeOfAccount` | Purpose of the account |

Full field/value list → ref `create-a-personal-customer-profile-plus`.

**Key CP vs CP+ field-level contrast** (derived by comparing pages 3 & 4): regular CP personal profile needs 9 basic identity fields; CP+ personal profile needs ~21 fields including income/wealth bands, transaction-volume/frequency expectations, occupation/industry, IP addresses, and full KYC identity documents — consistent with CP being non-KYC'd and CP+ being fully KYC/KYB'd per page 2.

### Bank account creation (CP+)
- Same supported-banks endpoint (ref `get-a-list-of-supported-banks`), same bank-code warning (HSBC `HSBC`/`HBSC2`, Maybank `MBB`/`MBB2`) as regular CP.
- Same auto-verification-on-first-deposit mechanism, same manual proof-of-bank-account alternative.
- Sandbox mock: ref `sandbox-update-customer-profile-bank-account-verification-status` (same endpoint as regular CP page).

### Webhooks
- Verification status `rejected` or `verified` → callback. Details in "Customer Profile+ Callbacks (CP+)" doc — a **separate** callback doc from regular CP's.

---

## 5. Source: `first-party-payment.md`
https://docs.straitsx.com/docs/first-party-payment.md

**Title:** "First Party Payment"

- Overview: "For each CP/CP+, you can generate a unique virtual bank account or PayNow QR for payment collections." Successful receipt → webhook callback to complete transaction / credit user top-up.

### Collection methods
- **Virtual Bank Account (VA)** — ref `create-virtual-bank-accounts`. Gives bank transfer details for the user to add as payee.
  - **SGD VA**: created instantly.
  - **USD VA**: activation "typically takes 1 day"; callback sent when status updates; additional info may be requested; application may be declined.
- **PayNow QR**:
  - **Persistent PayNow** — ref `create-a-persistent-paynow-payment-method`. Reusable QR for multiple payments. "Each user can have only one persistent PayNow payment method."
  - **Dynamic PayNow** — ref `create-a-dynamic-paynow-payment`. Unique QR per transaction; must specify amount and expiry date; single-use only.
  - Warning: user must not alter the auto-populated reference number on PayNow QR scans, or payment may be rejected.

### Accepting payment
- Callback fired to configured callback URL on successful payment.
- If payment blocked by StraitsX → callback with blocked code; supplementary info/proof may be required.
- **First-party-specific detail**: "Once the first payment is completed, the customer profile bank account will be verified automatically." (Confirms this is the same auto-verification trigger described in page 3/4.)
- If payment amount < transaction fees charged, "no amount will be credited to your account."

### Sandbox
- Mock bank transfer → ref `create-a-mock-bank-transfer-payment`.
- Mock PayNow payment → `https://docs.straitsx.com/reference/create-a-mock-paynow-payment`.
- Callbacks are also sent in sandbox.

### Webhooks (general mechanics — applies across pages 5,6,9,10)
- HTTP `POST`, expects `200 OK` response.
- Failed callback retried **up to 20 times** with a **5-minute interval**.
- Manual retrigger via ref `resend-callback-for-a-single-contract` (single or list of contracts).
- Details → "Payment Callbacks" doc.

---

## 6. Source: `first-party-payout.md`
https://docs.straitsx.com/docs/first-party-payout.md

**Title:** "First Party Payout"

- Overview: "Each CP/CP+ will only be allowed to withdraw to a **verified** customer profile bank account." — this is the fund-destination constraint that defines the first-party model (own-name bank account only).
- Processing time by currency: **SGD near-instant**; **USD up to 2 business days** depending on beneficiary bank/country.

### Flow
1. User submits withdrawal request on partner platform.
2. Partner calls ref `create-a-first-party-bank-transfer-payout` ("bank transfer payout endpoint"). Withdrawal request "can only be made to a verified customer profile bank account."
3. A **contract** (= transaction) is created in `pending` status, returned in response.
4. StraitsX processes payout, sends callback with updated status.
5. **USD via SWIFT**: may require Request for Information (RFI) before completion "due to our internal controls as well as our banking partners' controls" — StraitsX team reaches out directly.

### Sandbox
- Initiate withdrawal in sandbox, mock status via ref `update-status-of-mock-first-party-bank-transfer-payout`. Callbacks also fire in sandbox.

### Webhooks
- Same mechanics as page 5 (POST, 200 OK, 20 retries @ 5-min interval, resend via `resend-callback-for-a-single-contract`).
- Details → "Payout Callbacks" doc.

---

## 7. Source: `third-party-transfer.md`
https://docs.straitsx.com/docs/third-party-transfer.md

**Title:** "Third Party Transfer (Customer Profile)"

- Purpose: for partners who use StraitsX API "to collect payment and make payouts **on behalf of** their users" — i.e., transactions are NOT restricted to the user's own-name bank account (contrast with first-party model's own-name-only constraint).
- "We will require information on your users as per regulations before we are able to process transactions on behalf of them."
- Example partner type given: **payment service providers**.
- Note: title explicitly ties third-party transfer to "Customer Profile" only — no CP+ variant is mentioned for the third-party model in these pages (CP+ appears to be a first-party-only concept based on pages 1–6).
- If unsure of category → contact support.

---

## 8. Source: `customer-profile-creation.md`
https://docs.straitsx.com/docs/customer-profile-creation.md

**Title:** "Customer Profile Creation" (third-party model)

- Overview: under third-party transfer, must create a customer profile per user. This is the pre-requisite for third-party payment/payout APIs.
- Sequence diagram image: `https://files.readme.io/226741b-image.png` (distinct image from first-party CP creation page's diagram).
- **No bank-account-creation section on this page** — unlike the first-party CP/CP+ pages, third-party CP creation does not require attaching/verifying a customer's own bank account (consistent with third-party model paying out to recipients rather than the user's own account).
- Mandatory fields are stated to be "the **same for both SGD and USD rails**."

### Mandatory fields — third-party CP (verbatim)

**Business:**
`customerName`, `registrationType` (business), `registrationId` (UEN), `registrationIdType`, `registrationIdCountry`, `address` (`street`, `city`, `state`, `country`), `placeOfBiz`, `placeOfBizCountry`, `countryOfIncorporation`, `dateOfIncorporation`

**Personal:**
`customerName`, `registrationType` (personal), `registrationId` (NRIC/Passport No.), `registrationIdType`, `registrationIdCountry`, `address` (`street`, `city`, `state`, `country`), `countryOfResidence`, `dateOfBirth`, `nationality`

Note: field set is identical to first-party regular-CP fields (page 3) except casing differs on two field names: `placeofBiz`/`placeofBizCountry` (first-party doc) vs `placeOfBiz`/`placeOfBizCountry` (third-party doc) — quoted exactly as each source spells them; likely a docs typo rather than a real schema difference, but preserved verbatim since the task calls for exact strings.

---

## 9. Source: `third-party-payment.md`
https://docs.straitsx.com/docs/third-party-payment.md

**Title:** "Third Party Payment"

- Overview: "For each customer profile, you can generate a unique virtual bank account or PayNow QR for payment collections." Same webhook-on-success behavior as first-party payment.
- Sequence diagrams: "Payment Method Setup Flow" (`f0e85e2-image.png`) and "Payment Processing Flow" (`7516ac9-image.png`) — two separate diagrams, vs. first-party payment's two diagrams (New User Scenario / Payment Scenario).

### Collection methods (identical mechanics to first-party payment, page 5)
- **VA** — ref `create-a-virtual-bank-account` (note: singular "account" — differs slightly from first-party's ref `create-virtual-bank-accounts`, plural). SGD instant; USD ~1 day activation, callback on status update, possible additional info request or decline.
- **Persistent PayNow** — ref `create-a-persistent-paynow-payment-method`; one per user; reusable QR.
- **Dynamic PayNow** — ref `create-a-dynamic-paynow-payment`; single-use QR with amount + expiry date.
- Same reference-number-integrity warning for PayNow QR scans.

### Accepting payment
- Callback to configured callback URL on success.
- Blocked payment → callback with blocked code, possible supplementary info/proof request.
- **Difference from first-party**: this page has **no statement about automatic bank-account verification on first payment** (that sentence is present in the first-party-payment page but absent here) — consistent with third-party CP creation not requiring a verified customer bank account.
- Fee-shortfall rule identical to first-party: payment less than transaction fees → no credit.

### Sandbox
- Mock bank transfer → ref `create-a-mock-bank-transfer-payment`; mock PayNow → ref `create-a-mock-paynow-payment`. Callbacks sent in sandbox.

### Webhooks
- Same mechanics (POST, 200 OK, 20 retries @ 5 min, `resend-callback-for-a-single-contract`). Details → "Payment Callbacks" doc (shared doc with first-party payment).

---

## 10. Source: `third-party-payout.md`
https://docs.straitsx.com/docs/third-party-payout.md

**Title:** "Third Party Payout"

- Overview: "Payouts can be made to a **payout recipient** created." This is the key structural difference from first-party payout: third-party pays to a **recipient object** the partner creates (which can represent a third party), not to the user's own verified bank account.
- "Different recipient types and countries will have different data requirements for a payout recipient to be valid."
- Sequence diagram: `58cf2326...-image.png`.

### Payout recipients
- Partner must let users add/manage recipients; on add, call ref `create-a-customer-profile-payout-recipient` ("create payout recipient endpoint").

#### Required fields — all disbursement methods (verbatim)

| Field | Description |
|---|---|
| `recipientCountry` | Alpha-2 country code (e.g. `SG`) |
| `recipientInformation.disbursementMethod` | `bankTransfer`, `paynow`, `swift`, or `meps` |
| `recipientInformation.recipientName` | Name of the recipient |
| `recipientInformation.currency` | `SGD` or `USD` |
| `recipientInformation.entityType` | `individual` or `business` |

#### Additional fields by disbursement method (verbatim)

| Method | Currency | Required Fields | Optional Fields |
|---|---|---|---|
| `paynow` | SGD | `proxyType`, `proxyValue` | – |
| `bankTransfer` | SGD | `bankAccountNo`, `bankShortCode` | – |
| `swift` | SGD, USD | `swiftBic`, `bankAccountNo`, `recipientAddress` | `routingCode`, `intermediarySwiftBic`, `paymentReason` |
| `meps` | SGD | `swiftBic`, `bankAccountNo`, `recipientAddress` | `routingCode`, `intermediarySwiftBic`, `paymentReason` |

- **Currency/method compatibility rule**: "For SGD, all disbursement methods (`bankTransfer`, `paynow`, `swift`, `meps`) are supported. For USD, only `swift` is supported."

### Processing payouts
1. User submits payout request on partner platform to a selected recipient.
2. Partner calls ref `create-a-third-party-payout` ("third party payout endpoint").
3. A **contract** created in `pending` status, returned in response.
4. Callback fired on status update via configured callback URL.

### Sandbox
- Mock status via `https://docs.straitsx.com/reference/sandbox-update-status-of-mock-paynow-payout#/`.

### Webhooks
- Same mechanics (POST, 200 OK, 20 retries @ 5 min interval, `resend-callback-for-a-single-contract`). Details → "Payout Callbacks" doc (shared doc name with first-party payout, page 6).

---

## Synthesis: What determines fund/identity custody model (for AgentPay design)

| Dimension | First-Party (CP) | First-Party (CP+) | Third-Party (CP) |
|---|---|---|---|
| Who can receive payouts | User's own verified bank account only | User's own verified bank account only | Any registered "payout recipient" (can be a third party) |
| KYC/KYB depth | Basic info, no KYC/KYB | Full KYC/KYB | Basic info (same field set as first-party CP) |
| Transaction limits | Not stated | Per-customer-profile limit imposed | Not stated on these pages |
| Compliance notification overhead | Not stated | Additional compliance requirements on transaction notifications | Not stated |
| Bank account verification step | Required, auto-verifies on first deposit or manual proof | Required, auto-verifies on first deposit or manual proof | Not applicable — no bank-account-creation step in third-party CP creation page |
| Example partner type | Crypto exchanges (implied, from parent page 1) | Same parent model as CP | Payment service providers |
| Source URLs | docs/customer-profile-and-bank-account-creation, docs/first-party-payment, docs/first-party-payout | docs/customer-profile-plus-and-bank-account-creation | docs/third-party-transfer, docs/customer-profile-creation, docs/third-party-payment, docs/third-party-payout |

Relevance to AgentPay: since AgentPay settles XSGD on Avalanche on behalf of an end user while an AI agent spends, the "who legally holds/receives funds" question maps directly onto this StraitsX distinction — first-party model restricts all bank-rail movement to the end user's own named account (fits a model where the agent only ever moves the user's own fiat in/out under the user's own KYC'd identity), whereas third-party model lets the platform pay recipients on the user's behalf (fits a model where the agent disburses to third-party merchants/counterparties). CP+ is the only variant offering per-profile transaction limits and is first-party-only across the pages fetched; no CP+ analog exists for the third-party model in this doc set.

---

## NOT FETCHED
None — all 10 URLs returned HTTP 200 with content.
# StraitsX Money-Rail & Transaction-Mechanics Digest (Section C)

Fetched 2026-08-15 via `curl` against the `.md` raw-markdown endpoints of docs.straitsx.com. All 17 target URLs returned HTTP 200. None marked NOT FETCHED.

---

## TOP-LINE ANSWERS TO THE THREE OPEN QUESTIONS

### (a) Is XSGD on Avalanche listed as a supported blockchain/token?

**YES.** Source: `https://docs.straitsx.com/reference/get-a-list-of-supported-blockchains.md`

The `GET /blockchain_transfer/blockchains` endpoint (`[Available in Production environment only]`, base URL `https://api.straitsx.com/v1`) returns an example response array of supported token/blockchain combinations. The full list in the documented example:

| `id` | `blockchain` attribute | `enabled` |
|---|---|---|
| `xsgd_erc20` | `XSGD_ERC20` | true |
| `xsgd_matic` | `XSGD_MATIC` | true |
| `usdc_erc20` | `USDC_ERC20` | true |
| `usdt_erc20` | `USDT_ERC20` | true |
| `xusd_erc20` | `XUSD_ERC20` | true |
| **`xsgd_avax`** | **`XSGD_AVAX`** | **true** |
| `xusd_bep20` | `XUSD_BEP20` | true |

`XSGD_AVAX` (id `xsgd_avax`) is present and `enabled: true` — XSGD on Avalanche is a live, supported token/chain pair per this doc. Note this list endpoint is explicitly production-only; the sandbox address-creation example (see (b) below) only demonstrates Ethereum/Polygon in its sample payload, but that is just an illustrative example, not a stated restriction — no page explicitly limits sandbox blockchains to a subset of production's.

### (b) How does a developer get TEST XSGD in sandbox?

**The docs do not present one single end-to-end "get test XSGD" flow or faucet.** Stitching together what sandbox-only endpoints exist across the fetched pages, the inferred path (matching the hackathon team's hypothesis) is:

1. **Fund fiat sandbox balance** — `POST /sandbox/merchant/topup` (`https://docs.straitsx.com/reference/topup-merchant-account-sandbox.md`, `[Available in Sandbox environment only]`). Body: `{"data":{"attributes":{"currency":"SGD"|"USD","amount":"10000.00"}}}`. This credits a **fiat** SGD or USD balance — NOT an XSGD balance directly. Response returns `accountBalance` records per currency (example shows `sgd: 16092.22`, `usd: 6192.17`).
2. **Convert fiat → XSGD.** The docs do not show a sandbox-specific "mint XSGD" endpoint. Two documented conversion mechanisms exist that could bridge SGD fiat → XSGD stablecoin balance:
   - **Swap API** (`https://docs.straitsx.com/docs/swap-api.md`): supported swap pairs include `XSGDSGD`, so SGD can be swapped to XSGD via get-swap-pairs → request-swap-quote → execute-swap-quote.
   - **Cards Sub-Wallet add-funds endpoint** (`sub-wallets-cards-settlement-transfers.md`) does an `sgd → xsgd` fiat-to-stablecoin 1:1 conversion, but this credits the **Cards sub-wallet**, not general wallet balance, and transfers are explicitly one-way (main wallet → sub-wallet only).
3. **Create a sandbox blockchain address** — `POST /sandbox/blockchain_transfer/addresses` (`https://docs.straitsx.com/reference/sandbox-create-a-blockchain-address.md`, `[Available in Sandbox environment only]`). Body: `{"data":{"attributes":{"address": "...", "addressLabel": "..."}}}`. Response creates one record per token+network combination (example shows `xsgd`/`Ethereum`, `xsgd`/`Polygon`, `usdc`/`Ethereum`, each with its own `id`, `verification_status: "pending"`). Unlike production (see below), this sandbox endpoint does not describe a dashboard-whitelisting step — address + label is submitted directly via API.
4. **Withdraw (blockchain transfer out) to that address.** The general flow is documented in `https://docs.straitsx.com/docs/blockchain-transfer-out-guide.md`: (i) whitelist your blockchain address on the StraitsX Business Dashboard [production-only instruction — support article link], (ii) call `GET` the blockchain-addresses-list endpoint to obtain the `address_id` for the exact token+network pair (distinct IDs per token/network combo, e.g. XSGD/Ethereum vs XSGD/Polygon vs USDC/Ethereum are separate records), (iii) call the blockchain withdrawal endpoint (`create-a-blockchain-transfer-payout`, not one of the 17 pages fetched, only linked) with that `address_id`. **This page does not have a sandbox-specific variant in the set fetched**, and none of the 17 pages show a sandbox "mock blockchain withdrawal" endpoint (unlike regular-payout, which does document a sandbox mock-status endpoint).

**Conclusion:** the docs confirm the *shape* of the believed path — sandbox top-up (fiat) + sandbox blockchain-address creation + (implied) blockchain transfer-out using the matching `address_id` — but do **not** explicitly document a sandbox endpoint that mints/credits XSGD balance itself; that step is bridged only inferentially via the Swap API's `XSGDSGD` pair (or the Cards sub-wallet's fiat→stablecoin conversion, which is scoped to the Cards sub-wallet). No faucet endpoint appears anywhere in the 17 pages.

### (c) What is the Cards Sub-Wallet and how do funds reach it?

Source: `https://docs.straitsx.com/reference/sub-wallets-cards-settlement-transfers.md` (canonical page; see Fetch Notes below on URL #14 vs #15).

- **Endpoint:** `POST /sub-wallets/cards-settlement/transfers` — `[Available in Production/Sandbox environment]`. `operationId: sub-wallets-cards-settlement-transfers`.
- **Purpose:** "Transfer funds from the merchant's main wallet to their Cards sub-wallet." It is a dedicated sub-wallet used for card settlement.
- **Direction:** one-way only, main wallet → sub-wallet. "Reverse transfers are not supported via this endpoint."
- **Supported Transfer Pairs** (verbatim table):

| Source (`walletSource`) | Destination (`currency`) | Type | Rate |
|---|---|---|---|
| `xsgd` | `xsgd` | Same currency | 1:1 |
| `usdc` | `usdc` | Same currency | 1:1 |
| `xusd` | `xusd` | Same currency | 1:1 |
| `sgd` | `xsgd` | Fiat → Stablecoin | 1:1 |
| `usd` | `xusd` | Fiat → Stablecoin | 1:1 |

- **Request body params:** `amount` (string, required), `currency` (destination sub-wallet currency; enum `xsgd`/`usdc`/`xusd`, required), `walletSource` (source wallet currency; enum `xsgd`/`usdc`/`xusd`/`sgd`/`usd`; optional — "If omitted, defaults to the same value as `currency`"), `idempotencyId` (required, string, "Unique ID for deduplication").
- **Response:** `data.type: "subWalletTransaction"`, `attributes.transactionType: "add_funds"`, `attributes.status` enum `completed`/`pending`/`failed`, plus `amount`, `currency`, `createdAt`, `updatedAt`.
- This confirms the hackathon's assumption: the Cards Sub-Wallet is funded via fiat-to-stablecoin 1:1 conversion (`sgd`→`xsgd` or `usd`→`xusd`) or same-currency stablecoin transfer, moved one-way from the main wallet — this is the card-funding path.

---

## FETCH NOTES

All 17 URLs returned HTTP 200. Two items worth flagging (not failures, but content anomalies):

- **#13 `get-a-list-of-supported-blockchains.md`** is explicitly labeled `[Available in Production environment only]` — it describes the production base URL `https://api.straitsx.com/v1`, not sandbox. There is no equivalent "list supported blockchains" reference among the fetched sandbox pages.
- **#14 `sub-walletscards-settlementtransfers.md`** (no hyphens variant) is a near-empty stub (349 bytes): only the H1 "Cards Sub-Wallet" and a one-line description, no OpenAPI body, no request/response detail. **#15 `sub-wallets-cards-settlement-transfers.md`** (hyphenated variant) is the full, canonical reference page (9863 bytes) with the complete OpenAPI spec used for section (c) above. Both fetched successfully; #14 appears to be a legacy/duplicate slug pointing at a truncated version of the same topic.

---

## PER-PAGE DIGEST

### 1. Regular Transfer — `docs/regular-transfer.md`
Thin page. Defines "Regular Transfer" as the integration type for partners using the StraitsX API to collect payments/make payouts **for themselves** (not on behalf of another party — that's the "Third Party" variant covered elsewhere in the docs tree, e.g. `07-third-party-transfer.md`, not in our fetch set). No endpoints listed directly.

### 2. Regular Payment — `docs/regular-payment.md`
**Purpose:** Payment collection via virtual bank account (VA) or PayNow QR.
**Flow:**
- Create VA (`ref:create-virtual-bank-account`) — SGD VA created instantly; USD VA activation ~1 day with dashboard callback on status change (may require extra info or be declined).
- Create PayNow QR — Persistent (`ref:create-persistent-paynow-payment-method`, reusable, any payer, any amount) or Dynamic (`ref:create-dynamic-paynow-payment`, single-use, fixed amount + expiry, for checkout).
- On payment received: webhook callback to the URL configured on StraitsX Business Dashboard.
- If payment blocked, callback carries a **blocked code**; may need supplementary info.
- Note: if payment amount < transaction fees, no amount is credited.
- **Sandbox testing:** mock bank transfer (`ref:sandbox-create-mock-bank-transfer-payment`) or mock PayNow payment (`ref:sandbox-create-mock-paynow-payment`); callbacks fire in sandbox too.
- **Webhooks:** HTTP POST, expects `200 OK`; failed webhooks retried up to **20 times** at **5-minute intervals**; can be manually re-triggered via callback-event endpoints (`ref:resend-callback-for-a-single-contract`).

### 3. Regular Payout — `docs/regular-payout.md`
**Purpose:** Payouts to a created payout recipient.
**Flow:** create payout recipient (`ref:create-a-payout-recipient`) → create payout (`ref:create-a-regular-payout`).
**Recipient required fields (all methods):** `recipientCountry` (alpha-2, e.g. `SG`), `recipientInformation.disbursementMethod` (`bankTransfer`, `paynow`, `swift`, or `meps`), `recipientInformation.recipientName`, `recipientInformation.currency` (`SGD` or `USD`), `recipientInformation.entityType` (`individual` or `business`).
**Per-method extra fields:**
| Method | Currency | Required | Optional |
|---|---|---|---|
| `paynow` | SGD | `proxyType`, `proxyValue` | – |
| `bankTransfer` | SGD | `bankAccountNo`, `bankShortCode` | – |
| `swift` | SGD, USD | `swiftBic`, `bankAccountNo`, `recipientAddress` | `routingCode`, `intermediarySwiftBic`, `paymentReason` |
| `meps` | SGD | `swiftBic`, `bankAccountNo`, `recipientAddress` | `routingCode`, `intermediarySwiftBic`, `paymentReason` |

Note: for SGD, all 4 disbursement methods supported; for USD, only `swift`.
A contract (transaction) is created in `pending` status, then callback fires on update. **Sandbox testing:** mock its status via `ref:sandbox-update-status-of-mock-regular-payout` after initiating a withdrawal in sandbox. Same webhook retry policy (20x / 5-min) as Regular Payment.

### 4. PayNow Transfer Payments Guide — `docs/paynow-transfer-payments-guide.md`
**PayNow QR mechanics** — two types:
| Type | Use Case | Reusable? | Amount Fixed? |
|---|---|---|---|
| Persistent PayNow | Top-up wallets, recurring deposits | Yes — one QR per user | No — payer enters amount |
| Dynamic PayNow | Checkout, one-time invoices | No — single use, expires | Yes — pre-set |

Sender name screening performed as compliance check on incoming payments. Each user can have only **one** persistent PayNow method.
**Endpoints (verbatim):**
- `POST https://api-sandbox.straitsx.com/v1/payment_methods/paynow` — creates persistent or dynamic PayNow, header `X-XFERS-APP-API-KEY`. Persistent body: `{"data":{"attributes":{"referenceId":"..."},"relationships":{"customerProfile":{"data":{"id":"customer_profile_..."}}}}}`. Dynamic body adds `"amount":"50.00"` and `"expiresAt":"2025-12-31T23:59:59+08:00"`.
- **Sandbox mock PayNow payment:** `POST https://api-sandbox.straitsx.com/v1/sandbox/paynow_simulations` — body includes `id` (`paynow_...`), `amount`, `sourceBankAccountHolderName` (simulate sender name), `endToEndRef`, `customerProfile` relationship.
- Users should not alter QR-populated payment details or the payment may fail.
- On first successful deposit, sender's bank account is auto-added/verified on the customer profile, enabling first-party withdrawals to that account.
- On completed deposit: `paymentStatusUpdated` event callback fires.
- Callback signing: **HMAC-SHA256**.

### 5. FX Payout API — `docs/fx-payout-api.md`
**Purpose:** Convert funds currency A → B and disburse to recipient's bank account, without holding a balance in the target currency.
**Supported currency pairs (verbatim):**
| From | To |
|---|---|
| XUSD | IDR |
| USD | IDR |
| XSGD (coming soon) | IDR |
| SGD (coming soon) | IDR |

So today only XUSD→IDR and USD→IDR are live; XSGD→IDR and SGD→IDR are **not yet available** ("coming soon").
**Prerequisite:** create payout recipient (`ref:fx-create-payout-recipient`) with bank details → returns `recipientId`. `initiator.mode: onBehalfOf` + `customerProfileId` for on-behalf-of; omit `initiator` for direct/self mode. List existing recipients via `ref:fx-get-a-list-of-payout-recipients`.
**Flow (3 steps):**
1. **Quote:** `ref:create-an-fx-quote` — specify source currency, target currency, amount, tenor (`instant`). Exactly one of `from.amount` / `to.amount` provided (not both); if `to.amount` given, quote computed in reverse. Quote has expiry.
2. **Payout:** `ref:execute-an-fx-quote` (Create a Payout) — quote ID, payout type `fxPayout`, `recipientId`, optional `internalReference`/`externalReference`, optional `initiator`. Created in `pending`.
3. **Track:** poll `ref:get-an-fx-transaction` / `ref:list-fx-transactions`, or webhooks `cpFxPayoutStatusUpdated` (customer-profile payouts) / `userFxPayoutStatusUpdated` (direct user payouts).
**Transaction statuses:** `pending`, `completed` ("FX conversion completed successfully. Funds delivered to the recipient."), `failed` ("Transaction failed or was cancelled before completion."). Transitions: `pending`→`completed`, `pending`→`failed`.
**Sandbox:** manually update payout status via `ref:sandbox-update-fx-transaction-status` to simulate `completed`/`failed`.

### 6. Blockchain Transfer Out Guide — `docs/blockchain-transfer-out-guide.md`
**Flow:**
1. Whitelist blockchain address on StraitsX Business Dashboard (production instructions link to a support article).
2. `GET` blockchain-addresses-list endpoint (`ref:get-a-list-of-blockchain-addresses`) → distinct records per **token+network** combo (e.g., XSGD/Ethereum, XSGD/Polygon, USDC/Ethereum are all separate address records/IDs).
3. `POST` blockchain withdrawal endpoint (`ref:create-a-blockchain-transfer-payout`) with the correct `address_id` matching the intended token/network pair.
No sandbox-specific variant of this guide fetched; the general dashboard-whitelisting step is described as the production path.

### 7. Swap API — `docs/swap-api.md`
**Supported swap pairs (verbatim, all bidirectional per pair code):**
`XSGDUSDC`, `XSGDXUSD`, `USDCUSDT`, `XUSDUSDC`, `XUSDUSDT`, `XSGDUSDT`, `XSGDSGD`, `XSGDUSD`, `XUSDSGD`, `XUSDUSD`, `USDCSGD`, `USDCUSD`, `USDTSGD`, `USDTUSD`, `SGDUSD`
**Flow:**
1. `GET` supported swap pairs (`ref:get-supported-swap-pairs`).
2. `POST` request swap quote (`ref:create-a-swap-quote`) — currency pair, amount, fixed side → rate; quote has expiry.
3. `POST` execute swap quote (`ref:execute-a-swap-quote`) with quote ID while still valid → wallet balances update.
`XSGDSGD` is listed as a live pair — this is the mechanism by which SGD fiat balance can become XSGD stablecoin balance (relevant to question (b)).

### 8. Transaction Status — `docs/transaction-status.md`
Full status-lifecycle catalogue across contexts (verbatim status values):

**Payment Status:** `pending` (funds received, not yet credited; only sent if pending fund clearance internally), `completed` (received and credited), `refunded` (refunded to sender bank), `failed` (unsuccessful, reason may be returned), `expired` (one-off PayNow QR window lapsed without payment — **production only, not supported in Sandbox**).
**Pending blocked codes:** `FG-001` (internal risk-control hold), `NM-001` (name mismatch, first-party transfer only), `CR-001` (compliance hold) — each with suggested handling guidance.
**Payout Status:** `pending`, `failed`, `completed`.
**Dashboard Withdrawal Status:** `failed`, `completed`, `pending`.
**Dashboard Deposit Status:** `completed`, `refunded`, `failed`, `pending`.
**Blockchain Withdrawal Status:** `pending`, `completed` ("confirmed on the blockchain"), `failed`.
**Blockchain Deposit Status:** `pending` ("detected on blockchain but not yet credited"), `completed` ("confirmed on blockchain and credited"), `failed`. Delivered via webhook event `stablecoinDepositStatusUpdated`.

### 9. Error Responses — `docs/errors.md`
**Response shape (verbatim):**
```json
{"errors": [
  {"error": "string", "error_code": "string", "error_handling": "string"}
]}
```
**Error classes (current STX codes) by HTTP status:**
- 401 Authentication: `STXE-1000` (Missing/Invalid API Key, Missing/Invalid API Key Pair, Invalid IP Address)
- 403 Authorization: `STXE-2000` (Restricted API Access — permission denied / account locked / USD bank transfers blocked for Chinese Nationals in Mainland China per local regs)
- 400 Bad Request: `STXE-3000` (custom message, check parameters)
- 400 Conditions Not Met: `STXE-4000` — covers Resource Not Verified, Feature Unavailable For Region/Request, Threshold Exceeded, Invalid State Transition, Invalid OTP, **Insufficient Balance**, Customer Profile Not Verified/Insufficient Info, Amount Exceed Limit/Daily Limit/Annual Limit, Resubmission of Verification Info Not Allowed, Failure in contract processing.
- 404 Not Found: `STXE-5000` (Record Not Found, Configuration Not Found, Risk Rating Not Found)
- 405 Method Not Allowed: `STXE-6000` (Restricted Endpoints Access in Live Mode — i.e., endpoint sandbox-only)
- 422 Unprocessable Content: `STXE-7000` — **`Duplicated Idempotency Key`** ("has already been used in different request. Please use another idempotency key") and `Record Existed`.
- 424 Failed Dependency: `STXE-8XXX` (required operation failed; retry)
- 429 Too Many Requests: `STXE-9000` (Rate Limit reached; retry later)
- 500 Internal Server Error: `STXE-9100`
Legacy/deprecated codes retained for back-compat: `XFE1`–`XFE22`, `XFE501`–`XFE507`, `XFE601`–`XFE604` (old auth/permission/parameter/balance/USD-KYB/name-check/withdrawal-limit errors); a block of these (`XFE1,2,4,7,8,9,11,14,501,502,507`) are explicitly listed as fully deprecated with no replacement detail given beyond "deprecated."

### 10. Idempotent Requests — `docs/idempotent-requests.md`
All transactional `POST` requests accept **`referenceId`** or **`idempotency_id`** as the idempotency key. `GET`/`DELETE` are idempotent by definition and do not accept idempotency keys. Recommended key strategies: random high-entropy token, or reuse of platform-native IDs (`order_id`, `user_id`, `card_id`). Retrying with the same idempotency key on a request that already completed does **not** change the original result — mainly useful for recovering from network errors/disrupted calls.

### 11. Transaction Safety — `docs/transaction-safety.md`
Two rules:
1. **Check success via status** — only treat a transaction as successful when status is `completed` (in API response or callback).
2. **Handling failures** — on payout network failures/timeouts/5xx, do **not** auto-fail in your system; `GET` the transaction again to confirm true status. Only update local status on receiving `completed` or `failed` via callback. When retrying, **reuse the same `idempotency_id`** to prevent duplicate disbursement.

### 12. Backward Compatibility — `docs/backward-compatibility.md`
StraitsX defines these as backward-compatible API changes (won't break integrations): adding new API resources; adding new optional request parameters to existing methods; adding new properties to existing responses; changing property order in responses; changing length/format of opaque strings (object IDs, error messages, other human-readable strings). No explicit deprecation-policy timeline/process is stated on this page beyond this compatibility contract.

### 13. Get a List of Supported Blockchains — `reference/get-a-list-of-supported-blockchains.md`
See question (a) above for full detail. `GET /blockchain_transfer/blockchains`, production-only, base `https://api.straitsx.com/v1`. Auth via `X-XFERS-APP-API-KEY` header (mandatory for all auth modes); optional HTTP Request Signing headers `X-PUBLIC-KEY-ID`, `X-TIMESTAMP` (±300s of server time), `X-NONCE` (UUID regex `/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/i`), `X-SIGNATURE` (base64). Response schema: array of `{data:{id, type:"blockchain", attributes:{blockchain, enabled}}}`.

### 14 & 15. Cards Sub-Wallet Settlement Transfers — `reference/sub-walletscards-settlementtransfers.md` (#14, stub) and `reference/sub-wallets-cards-settlement-transfers.md` (#15, canonical)
See question (c) above for full detail — endpoint `POST /sub-wallets/cards-settlement/transfers`, base `https://api-sandbox.straitsx.com/v1` (per this doc's OpenAPI `servers` block; production/sandbox both supported per description), `operationId: sub-wallets-cards-settlement-transfers`. Same auth header set as above (`X-XFERS-APP-API-KEY` mandatory, HTTP Request Signing headers optional).

### 16. [Sandbox] Top up account balance — `reference/topup-merchant-account-sandbox.md`
`POST /sandbox/merchant/topup`, base `https://api-sandbox.straitsx.com/v1`, `[Available in Sandbox environment only]`, `operationId: topup-merchant-account-sandbox`.
Body: `{"data":{"attributes":{"currency":"SGD"|"USD","amount":"<string, up to 2dp, positive>"}}}`. Amount regex: `/^(?!0(\.0+)?$)([1-9]\d*(\.\d+)?|0\.\d*[1-9]\d*)$/`.
Response (200): array of `accountBalance` objects, one per currency, e.g. `{"id":"...","type":"accountBalance","attributes":{"amount":"16092.22","currency":"sgd"}}`. **Only SGD and USD fiat top-up is supported — no direct stablecoin (XSGD/XUSD/USDC) top-up endpoint exists in the fetched docs.**

### 17. [Sandbox] Create a Blockchain Address — `reference/sandbox-create-a-blockchain-address.md`
`POST /sandbox/blockchain_transfer/addresses`, base `https://api-sandbox.straitsx.com/v1`, `[Available in Sandbox environment only]`, `operationId: sandbox-create-a-blockchain-address`.
Body: `{"data":{"attributes":{"address":"...", "addressLabel":"..."}}}` (both required).
Doc note: "We create a unique record for each combination of supported token and network (XSGD/Ethereum, XSGD/Polygon, USDC/Ethereum)." — example response array only illustrates Ethereum/Polygon combos, not an exhaustive list of sandbox-available networks.
Response: array of `{id: "blockchain_address_<uuid>", type:"blockchain_address", attributes:{token, blockchain_address, network, address_label, verification_status:"pending", created_at}}`.

---

## OTHER NOTABLE FACTS (beyond the top-3 in report)

- **Webhook retry policy** is consistent across Regular Payment and Regular Payout: HTTP POST, expects `200 OK`, retried up to **20 times** at **5-minute intervals**, manually re-triggerable via callback-event endpoints.
- **HTTP Request Signing** is an optional auth mode layered on top of the mandatory `X-XFERS-APP-API-KEY`: requires `X-PUBLIC-KEY-ID`, `X-TIMESTAMP` (±300s window), `X-NONCE` (UUID v4-shaped, replay-protection, must not repeat within the timestamp window), `X-SIGNATURE` (base64 digital signature of canonical request string) — documented consistently across all `reference/*` OpenAPI pages fetched.
- **FX Payout XSGD/SGD→IDR corridor is explicitly "coming soon,"** not live — relevant if AgentPay's roadmap assumes XSGD can already FX-payout to IDR.
# StraitsX API Docs — Section D: Callbacks / Webhooks Digest

Compiled for AgentPay (StraitsX hackathon — AI-agent payments layer settling XSGD on Avalanche).
Purpose: reference material for the receipt/attribution flow that ties a card/agent authorization
to the on-chain XSGD settlement, via StraitsX callbacks.

All 13 target pages were fetched successfully via `curl <url>.md` on 2026-08-15. None failed.

## Fetch status

| # | Page | URL | Status |
|---|------|-----|--------|
| 1 | Securing Your Callback | https://docs.straitsx.com/docs/securing-your-callback.md | FETCHED |
| 2 | Callback Configuration | https://docs.straitsx.com/docs/callback-configuration.md | FETCHED |
| 3 | Payment Callbacks | https://docs.straitsx.com/docs/payment-callbacks.md | FETCHED |
| 4 | Payout Callbacks | https://docs.straitsx.com/docs/payout-callbacks.md | FETCHED |
| 5 | Customer Profile Callbacks (Regular CP) | https://docs.straitsx.com/docs/customer-profile-callbacks-regular-cp.md | FETCHED |
| 6 | Customer Profile+ Callbacks (CP+) | https://docs.straitsx.com/docs/customer-profile-callbacks-cp-plus.md | FETCHED |
| 7 | RFI Callback | https://docs.straitsx.com/docs/rfi-callback.md | FETCHED |
| 8 | Transaction Limit Callbacks | https://docs.straitsx.com/docs/transaction-limit-callbacks.md | FETCHED |
| 9 | Bank Account Callbacks | https://docs.straitsx.com/docs/bank-account-callbacks.md | FETCHED |
| 10 | Virtual Account Callbacks | https://docs.straitsx.com/docs/virtual-account-callbacks.md | FETCHED |
| 11 | Deposit and Withdrawal Callbacks | https://docs.straitsx.com/docs/deposit-and-withdrawal-callbacks.md | FETCHED |
| 12 | Blockchain Callbacks | https://docs.straitsx.com/docs/blockchain-callbacks.md | FETCHED |
| 13 | Swap Callback | https://docs.straitsx.com/docs/swap-callback.md | FETCHED |

Retry / redelivery policy: **not documented on any of the 13 pages above.** No page mentions retry
counts, backoff, redelivery windows, or what StraitsX does if your endpoint returns non-2xx. Treat
this as an open question to verify with StraitsX support / Postman collection — do not assume
at-least-once delivery without confirming. (Searched all 13 raw pages for "retry", "redeliver",
"timeout", "attempt" — the only hits were the unrelated `isRetryable` KYC field on CP/CP+ pages.)

---

## 1. Callback verification scheme (source: securing-your-callback.md)

This is the exact mechanism AgentPay's webhook receiver must implement to trust an inbound callback.

- **Header carrying the signature**: `Xfers-Signature` (exact header name, verbatim from the docs'
  Ruby and Node.js examples — note it is `Xfers-Signature`, a legacy naming holdover, not
  `StraitsX-Signature`).
- **Algorithm**: HMAC-SHA256 over the **raw request body** (not a parsed/re-serialized JSON — use
  the exact bytes received), keyed with your **Signing Secret**.
- **Signature encoding**: hex digest (`OpenSSL::HMAC.hexdigest("SHA256", secret, body)` in Ruby;
  `crypto.createHmac('sha256', secret).update(body).digest('hex')` in Node).
- **Comparison**: use a constant-time / secure compare (`Rack::Utils.secure_compare` in the Ruby
  example) — implies StraitsX expects you to guard against timing attacks; plain `===`/`!=` string
  compare (as shown in the Node example) is what the docs literally show, but secure-compare is the
  recommended practice per the Ruby example.
- **Key source**: StraitsX Dashboard → **Platform Tools → Callback URLs → Signing Key** section.
  A signing secret is auto-generated the first time you create an API Key.
- **Key rotation**: You can generate a new secret (created **Inactive**), then **Activate** it —
  activating a new secret automatically deactivates the old one. Only one secret is Active at a
  time. Recommended flow: generate new (inactive) → update your app to verify against both/new →
  Activate → delete the old inactive secret once cutover confirmed. This gives zero-downtime
  rotation.
- **Storage best practice**: store the secret as an environment variable; never commit it or share
  it (explicit StraitsX guidance).

Reference verification pseudocode (Node.js, verbatim from docs):
```javascript
const signature = req.headers["Xfers-Signature"];
const generatedSignature = crypto.createHmac('sha256', SIGNING_SECRET)
  .update(payloadBody)   // raw body, e.g. via bodyParser.text()
  .digest('hex');
if (signature !== generatedSignature) throw new Error("Invalid signature!");
```

---

## 2. Callback configuration (source: callback-configuration.md)

- **Where to configure**: StraitsX Business Dashboard → **Platform Tools → Callback URL**.
- **Two tabs / two event families** in the dashboard:
  - **Client Event** — triggered by *your own platform's* activity: deposits, withdrawals,
    blockchain actions, bank accounts, virtual accounts.
  - **End Customer Event** — triggered by *your customers'* activity: payments, payouts, CP
    verification, CP bank accounts, transaction limits, RFI.
- You can set a **different URL per event type**, or reuse one URL for multiple events. Leaving a
  field empty means no callback is sent for that event.
- **Configuring via API**: `PATCH /webhooks` endpoint registers callback URLs programmatically.
  Only the events included in the request body are updated; omitted events keep their existing URL.

### Client callback events (dashboard-listed)
Payments & Transactions: User Deposit Status Update, User Withdrawal Status Update, Blockchain
Withdrawal Status Update, Blockchain Deposit Status Update, Swap Status Update.
Accounts: User Bank Account Created, User Bank Account Verification Status Updated, Virtual Account
Status Update.

### End customer callback events (dashboard-listed)
Payments & Payout: Bank/PayNow Payout Status Update, Bank/PayNow Payment Status Update.
Accounts: Customer Profile Bank Account Created, Customer Profile Bank Account Verification Status
Updated.
Profile Verification & Limits: Customer Profile Verification Status Update, Customer Profile
Transaction Limit Update, Customer Profile Transaction Limit Update Request Status Update.
RFI: Request For Information (RFI).

---

## 3. Payment Callbacks — `paymentStatusUpdated` (source: payment-callbacks.md)

Fires when an **incoming** payment status changes (`pending`→`completed` or `completed`→`refunded`).
Covers: Bank Transfer (SGD/USD) into your Virtual Bank Account, and PayNow QR payments.

Statuses: `pending`, `completed`, `refunded`.

`type`/`currency` combos identify the payment: `"Direct bank transfer"` + `xsgd`/`sgd` = SGD bank
transfer; `"Direct bank transfer"` + `xusd`/`usd` = USD bank transfer; `"paynowTransaction"` +
`xsgd` = PayNow.

Top-level fields (flat JSON, not JSON:API-wrapped): `id`, `type`, `idempotency_id`, `amount`,
`fees`, `status`, `bank_account_no` (null for PayNow), `merchant_ref`, `blocked_reasons` (array),
`currency`, `end_to_end_ref`, `transaction_remarks`, `payment_method` (object, shape varies by
type/currency — common: `id`, `reference_id`, `account_no`, `bank_short_code`, `recipient_name`;
USD-only adds `bank_name`, `bank_address`, `bank_country`, `swift_bic`; PayNow-only adds
`base64_encoded_image`, `qr_code_data`, `expires_at`), `sender_information` (object: `account_holder_name`,
`account_number`, `bank_short_code`, `bank_name`, `end_to_end_ref`, `swift_bic`,
`transaction_remarks`), `customer_profile_id` (present only for First Party / Third Party
integration models — absent for Regular Transfer), `created_at`, `updated_at`.

Deprecated flat fields kept for backward compatibility (duplicate `sender_information`):
`sender_bank`, `sender_bank_account_no`, `sender_bank_account_holder_name`,
`sender_bank_swift_bic`.

---

## 4. Payout Callbacks — `payoutStatusUpdated` (source: payout-callbacks.md)

Fires when an **outgoing** payout status changes (`pending`→`completed`/`failed`). Covers Bank
Transfer (SGD, via FAST), Bank Transfer (USD wire), and FX Payout (cross-currency, e.g. XUSD→IDR).

Statuses: `pending`, `completed`, `failed` (check `failure_reason`).

**Two distinct payload shapes** for the same event — the handler must branch on structure:
- **Bank Transfer payouts (SGD/USD)**: flat JSON, `type` = `"Withdrawal on behalf"`. Fields:
  `id`, `type`, `idempotency_id`, `amount`, `fees`, `status`, `account_no`, `bank_abbrev`,
  `failure_reason`, `arrival` (human-readable string), `currency`, `payout_invoice_id`,
  `wallet_name`, `external_reference`, `created_at`, `updated_at`; SGD-only: `express` (`"FAST"`);
  USD-only: `bank_account_holder_name`, `swift_bic`, `beneficiary_address`, `routing_code`,
  `intermediary_swift_bic`, `description`, `charge_option` (`"SHA"` or `"OUR"` — affects net amount
  received by beneficiary).
- **FX Payout**: JSON:API-nested, `data.type` = `"fxPayout"`. Fields: `data.id`, `data.type`,
  `data.attributes.status`, `.quoteId`, `.recipientId`, `.rate`, `.from.{currency,amount}`,
  `.to.{currency,amount}`, `.fee.{currency,amount}`, `.initiator` (null for direct payouts; for
  on-behalf-of payouts: `{mode: "onBehalfOf", customerProfileId}`), `.references.{externalReference,
  internalReference}`, `.createdAt`, `.updatedAt`.

---

## 5–6. Customer Profile Callbacks — `cpVerificationStatusUpdated` (Regular CP + CP+)
Sources: customer-profile-callbacks-regular-cp.md, customer-profile-callbacks-cp-plus.md

Both tiers fire the **same event name** `cpVerificationStatusUpdated`; payload shape differs by
tier (Regular CP = Tier 1, CP+ = Tier 2). JSON:API-wrapped: `data.id`, `data.type` =
`"customer_profile"`, `data.attributes.*`.

Statuses: `pending`, `verified`, `rejected`.

Regular CP common fields: `customerName`, `merchantRef` (optional), `registrationType`
(`personal`/`business`), `registrationId`, `registrationIdType`, `registrationIdCountry`,
`verificationStatus`, `address{street,city,state,country,postalCode}`, `createdAt`, `updatedAt`.
Personal-only: `dateOfBirth`, `gender`, `nationality`, `email`, `phoneNo`. Business-only:
`tradingName`, `placeOfBiz`, `placeOfBizCountry`, `countryOfIncorporation`, `dateOfIncorporation`.

Rejection-only fields (when `verificationStatus`=`rejected`): `isRetryable` (bool — whether customer
can resubmit), `verificationRejectionSummary` (string), `riskRating{status, rejection_reason[]
(snake_case!), rejections[]{code,reason,message}}`.

CP+ adds many extra KYC/onboarding fields on top of Regular CP (occupation, income bands, source of
wealth/funds, directors/beneficialOwners/trader arrays, identityDocuments verification statuses,
licensing status, etc.) — see raw file `raw/callback-06-customer-profile-callbacks-cp-plus.md` for
full field list; low relevance to AgentPay's settlement/receipt flow so not fully reproduced here.

---

## 7. RFI Callback — `cpRfiStatusUpdated` (source: rfi-callback.md)

Fires when a Request for Information (compliance questions during onboarding) status changes: RFI
sent, a question's status changes (accepted/rejected), or RFI completed.

Payload: `data.id`, `data.type`=`"rfiRequest"`, `data.attributes.customerProfileId`,
`.activeRfiRequest{status, createdAt, rfiQuestions[]}`, `.rfiProgressSummary{expiryDate,
daysUntilExpiry, daysExpired, completionPercentage, totalQuestions, acceptedQuestions,
pendingQuestions, rejectedQuestions}`. Each `rfiQuestions[]` item: `id`, `question`, `optional`,
`replyType` (`TEXT`/`DOC`/`CHECKBOX`), `questionStatus`, `requiresAction`, `userReply` (omitted
until answered), `checkboxOptions[]` (CHECKBOX only), `rejectionReason` (only if rejected).

---

## 8. Transaction Limit Callbacks — CP+ only (source: transaction-limit-callbacks.md)

Two events (Regular CP has no configurable limits — CP+ only):
- **`cpTxnLimitsUpdated`** — limits changed (tier upgrade or approved request). Personal CP+ has
  **annual** limits: `data.id`, `data.attributes.{customerProfileId, transactionSizeLimit,
  totalAnnualPaymentLimit, availableAnnualPaymentLimit, totalAnnualPayoutLimit,
  availableAnnualPayoutLimit}`. Business CP+ has **daily** limits instead: `totalDailyPaymentLimit,
  availableDailyPaymentLimit, totalDailyPayoutLimit, availableDailyPayoutLimit`.
- **`cpTxnLimitsUpdateRequestStatusUpdated`** — a limit-increase request's status changed. Statuses:
  `pending`, `approved`, `rejected`. Fields: `data.id`, `data.type`=`"transactionLimitsUpdateRequest"`,
  `data.attributes.{status, customerProfileId, createdAt, updatedAt}`.

---

## 9. Bank Account Callbacks (source: bank-account-callbacks.md)

Four events, flat (non-JSON:API) payload, same field structure for all four:
`cpbaCreated`, `cpbaVerificationStatusUpdated` (Customer Profile Bank Account),
`ubaCreated`, `ubaVerificationStatusUpdated` (User Bank Account).

Lifecycle: create → `*Created` callback with `verification_status: "pending"` → verification
completes → `*VerificationStatusUpdated` callback with final status (`verified`/`rejected`).

Fields: `id`, `account_no`, `account_holder_name`, `bank_abbrev`, `disabled`, `verification_status`,
`bank_account_proof` (URL), `swift_bic` (if applicable), `intermediary_swift_bic` (if applicable),
`routing_code` (if applicable), `updated_at`; `payment_reason` is CPBA-only.

---

## 10. Virtual Account Callbacks — `virtualAccountStatusUpdated` (source: virtual-account-callbacks.md)

Fires when a Virtual Bank Account (VBA) is enabled or disabled. **Important asymmetry**: USD VBAs
go through async activation/review and always fire an enabled callback; **SGD VBAs are
auto-enabled synchronously on creation and typically do NOT fire an "enabled" callback** (a
`disabled` callback still fires if later deactivated) — relevant if AgentPay relies on this event
to detect VBA readiness for SGD flows.

Payload (JSON:API): `data.id`, `data.type`=`"virtual_bank_account"`, `data.attributes.referenceId`,
`.currency`, `.status` (`enabled`/`disabled`), `.instructions` (object, present only when
`enabled` — contains `recipientName`, `bankName`, `bankAddress`, `bankCountry`, `swiftBic`,
`accountNo`), `.createdAt`.

---

## 11. Deposit and Withdrawal Callbacks — HIGH PRIORITY (source: deposit-and-withdrawal-callbacks.md)

These track fund movement at the **StraitsX business-account level** (not customer-level — that's
Payment/Payout). Distinguishing table straight from the doc:

| Event | Direction | Scope |
|---|---|---|
| `paymentStatusUpdated` | Incoming | Funds to a Virtual Bank Account, on behalf of a customer profile |
| `payoutStatusUpdated` | Outgoing | Funds to an external bank account, on behalf of a customer |
| `userDepositStatusUpdated` | Incoming | Funds directly to your business account |
| `userWithdrawalStatusUpdated` | Outgoing | Funds directly from your business account |

Statuses (both events): `pending`, `completed`, `failed`.

### `userDepositStatusUpdated` — full field list
JSON:API-wrapped. `data.id` (unique deposit contract ID), `data.type` = `"bankTransfer"`,
`data.attributes.idempotencyId` (your external reference ID), `.currency`, `.amount`, `.fees`,
`.status`, `.createdAt` (ISO 8601), `.senderInformation{accountHolderName, accountNumber,
swiftBic, transactionRemarks, endToEndRef}`, `.blockedReasons` (array, empty if not held).

Example (verbatim):
```json
{
  "data": {
    "id": "contract_d4e5f6a7-b8c9-0123-def0-234567890123",
    "type": "bankTransfer",
    "attributes": {
      "idempotencyId": "deposit-external-ref-001",
      "currency": "xsgd",
      "amount": "2500.0",
      "fees": "0.0",
      "status": "completed",
      "createdAt": "2026-05-11T09:00:00+08:00",
      "senderInformation": {
        "accountHolderName": "John Doe",
        "accountNumber": "9876543210",
        "swiftBic": "OCBCSGSG",
        "transactionRemarks": "Invoice payment #1234",
        "endToEndRef": "20260511OCBCSGSGXXXX0002"
      },
      "blockedReasons": []
    }
  }
}
```

### `userWithdrawalStatusUpdated` — full field list
JSON:API-wrapped. `data.id` (unique withdrawal contract ID), `data.type` = `"withdrawal"`,
`data.attributes.amount`, `.fees`, `.transactionRemarks`, `.idempotencyId` (your idempotency key
from the withdrawal request), `.currency`, `.bankAccount{account_no, account_holder_name, bank
(short code), swift_bic, routing_code, intermediary_swift_bic}` (note: snake_case sub-object nested
inside camelCase `bankAccount` — inconsistent casing, verbatim from docs), `.status`, `.netAmount`
(amount + fees), `.createdAt`, `.updatedAt`.

---

## 12. Blockchain Callbacks — HIGHEST PRIORITY (source: blockchain-callbacks.md)

Covers on-chain movement of XSGD/XUSD tokens. Two events, **identical payload shape** except as
noted:

| Event | Meaning |
|---|---|
| `stablecoinWithdrawalStatusUpdated` | Sending tokens from StraitsX account to an external address — submitted or confirmed on-chain |
| `stablecoinDepositStatusUpdated` | Receiving tokens from an external address into StraitsX account — detected or confirmed on-chain |

Statuses: `pending` (submitted/detected, awaiting on-chain confirmation), `completed` (confirmed
on-chain), `failed`.

Differences between the two events:
| Field | Withdrawal | Deposit |
|---|---|---|
| `data.type` | `stablecoin_withdraw_contract` | `stablecoin_deposit_contract` |
| `blocked_reasons` | not present | present (array; compliance hold reasons, e.g. travel-rule) |
| `transaction_hash` when pending | may literally be the string `"pending"` (not yet broadcast) | always the real on-chain hash (already detected on-chain by the time you're notified) |

### Full field reference (standard JSON:API: `data.id`, `data.type`, `data.attributes.*`)

- `data.id` — unique contract ID (string)
- `data.type` — `stablecoin_withdraw_contract` | `stablecoin_deposit_contract`
- `data.attributes.transaction_hash` — **the on-chain tx hash** (this is the field AgentPay needs
  for receipts). String. For withdrawals may be `"pending"` before broadcast.
- `data.attributes.amount` — token amount sent (withdrawal) or received (deposit), string
- `data.attributes.network_fees` — gas/network fee, string; typically `"0.0"` for deposits since
  the sender pays gas
- `data.attributes.total_amount` — withdrawals: `amount` + `network_fees` deducted; deposits:
  amount credited
- `data.attributes.transaction_source` — **the counterparty blockchain address**: for deposits,
  the sender's address; for withdrawals, the destination address tokens were sent to
- `data.attributes.status` — contract status (`pending`/`completed`/`failed`)
- `data.attributes.idempotency_id` — your idempotency key (withdrawals) or external reference
  (deposits)
- `data.attributes.network` — human network name, e.g. `"Ethereum"`, `"Polygon"`
- `data.attributes.token` — `"xsgd"` or `"xusd"`
- `data.attributes.blockchain` — token-standard identifier, e.g. `XSGD_ERC20`, `XSGD_AVAX` (see
  table below)
- `data.attributes.created_at` — ISO 8601 timestamp
- `data.attributes.blocked_reasons` — **deposit only**, array of `{code}` objects, e.g.
  `[{"code": "travel_rule_check"}]`; empty array if not blocked

### `blockchain` value reference (verbatim mapping — this is what AgentPay needs for Avalanche)

| Token | Network | `blockchain` value |
|---|---|---|
| XSGD | Ethereum | `XSGD_ERC20` |
| XSGD | Polygon | `XSGD_MATIC` |
| XSGD | **Avalanche** | **`XSGD_AVAX`** |
| XSGD | Arbitrum | `XSGD_ARB` |
| XSGD | Hedera | `XSGD_HTS` |
| XSGD | Ripple | `XSGD_XRP` |
| XSGD | Zilliqa | `XSGD_ZRC2` |
| XSGD | Solana | `XSGD_SPL` |
| XUSD | Ethereum | `XUSD_ERC20` |
| XUSD | BNB Smart Chain | `XUSD_BEP20` |
| XUSD | Solana | `XUSD_SPL` |

Supported networks per token (from the "Supported networks and tokens" table): XSGD — Ethereum,
Polygon, **Avalanche**, Arbitrum, Hedera, Ripple, Zilliqa, Solana. XUSD — Ethereum, Bnbsmart (BSC),
Solana. (Confirms XSGD is live on Avalanche, matching AgentPay's chain choice.)

Example deposit payload (verbatim):
```json
{
  "data": {
    "attributes": {
      "amount": "1.0",
      "blockchain": "XSGD_ERC20",
      "created_at": "2026-01-23T11:07:45.693Z",
      "idempotency_id": "e8b7c6d5a4f3e2d1c0b9a8f7e6d5c4b3",
      "network": "Ethereum",
      "network_fees": "0.0",
      "status": "completed",
      "token": "xsgd",
      "total_amount": "1.0",
      "transaction_hash": "0x7f3e8b2a1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
      "transaction_source": "0x1234567890abcdef1234567890abcdef12345678"
    },
    "id": "contract_0d151e28146d42aabf9115ee3f6c6926",
    "type": "stablecoin_deposit_contract"
  }
}
```
Example withdrawal payload (verbatim, on Polygon in the doc's example — same shape would apply for
an `XSGD_AVAX` withdrawal):
```json
{
  "data": {
    "attributes": {
      "amount": "2.0",
      "blockchain": "XSGD_MATIC",
      "created_at": "2024-06-11T04:48:39.912Z",
      "idempotency_id": "testing",
      "network": "Polygon",
      "network_fees": "0.02",
      "status": "completed",
      "token": "xsgd",
      "total_amount": "2.02",
      "transaction_hash": "0x658043f80b1684cce02a0f4c0ed5449589eef495492bae5a849e47e80c46dd4d",
      "transaction_source": "0x4fd0f684dcf7c6c862114db8cebfe8bf6bb175c3"
    },
    "id": "contract_7afa75105cad43579f9589ebe30b6784",
    "type": "stablecoin_withdraw_contract"
  }
}
```

**AgentPay implication**: to build the receipt/attribution flow (card auth → on-chain XSGD debit),
key on `data.attributes.idempotency_id` (your correlation ID passed at withdrawal-request time) to
join the callback back to the originating agent transaction, then read `transaction_hash` for the
on-chain proof and `transaction_source` for the destination wallet address. Confirm `blockchain ==
"XSGD_AVAX"` and `status == "completed"` before treating the settlement as final; `pending` +
`transaction_hash: "pending"` means not yet broadcast.

---

## 13. Swap Callback — `swapUpdated` (source: swap-callback.md)

Fires on stablecoin currency-conversion status changes (e.g. XSGD ↔ XUSD). Statuses: `pending`,
`completed`, `failed`.

Payload (JSON:API): `data.id`, `data.type`=`"swapTransaction"`, `data.attributes.idempotencyId`,
`.quoteId`, `.status`, `.swapPair` (e.g. `XSGDXUSD`), `.sourceCurrency`, `.targetCurrency`,
`.fixedSide` (`source`|`target` — which side was locked at quote time), `.totalSourceCurrencyAmount`
(incl. fees), `.sourceCurrencyAmount` (excl. fees), `.targetCurrencyAmount`, `.rate`, `.fees[]`
(`{type, amount, currency}`), `.createdAt`, `.updatedAt`, `.customerProfileId` (null for direct
swaps).

Note event name mismatch: the doc text says "swap transaction status changes" and the page title is
"Swap Callback," but the actual event identifier given is `swapUpdated` (stated in the intro
sentence) while the dashboard config page (page 2) lists it as "Swap Status Update" — same event,
different display names in different docs.

---

## Raw source files

Full raw markdown for all 13 pages saved at:
`/private/tmp/claude-501/-Users-desmondchyezhihao-Documents-GitHub-agentpay/012fbfd0-fb2e-481f-a95d-9a00481523ec/scratchpad/straitsx-digest/raw/callback-01-securing-your-callback.md`
through
`.../raw/callback-13-swap-callback.md`
(numbered 01–13 in the order listed in the Fetch status table above).
# StraitsX API Docs Digest — Section E: FAQs & Changelog

Compiled 2026-08-15 for AgentPay (StraitsX hackathon: AI-agent payments settling XSGD on Avalanche).
All 21 source pages fetched successfully via `curl <url>.md` (HTTP 200). None missing.

**FLAG — Avalanche/XSGD contract/testnet coverage:** Across all 21 pages, the *only* explicit Avalanche mention is a confirmation-time row in the Blockchain FAQs (#14, Q3). **No page in this set states an XSGD contract address, a testnet name/chain-id, or a blockchain-specific min/max transfer amount.** The Blockchain FAQs page defers the list of supported chains to a live API call (`GET` supported blockchains) rather than naming them in text — see Q1 below. Contract addresses / testnet details, if published, live elsewhere in the docs (not in this FAQ/changelog set) and should be pulled from the API Reference or Getting Started guides in a separate pass if needed.

---

## FAQ 1 — Common/General FAQs
Source: https://docs.straitsx.com/docs/common-faqs.md

**Account Setup**
1. User account (Business Account, merchant-level, holds own funds) vs. Customer Profile (sub-account per end user, created via `POST /v1/customer_profiles`, tracks deposits/payouts/compliance per user). CPs have KYC requirement depending on CP type.
2. Use customer profiles when collecting/paying end users, assigning individual VAs/PayNow QR per user, per-user compliance, or per-user limit tracking. Works in both 1st- and 3rd-party integration models.
3. Yes — user account and customer profiles can be used simultaneously under one Business Account.

**API Access & Keys**
4. Sandbox: Developer Tools visible by default, most APIs available by default, specialized APIs need approval. Production: Developer Tools hidden by default, no default API access, requires KYC + approval, then generate key.
5. **API keys are valid for 6 months.**
6. Expiry reminder emails sent **14 and 30 days in advance** to Owner/Admin/Developer roles.
7. Major API updates are announced in the StraitsX Changelog.

**Payment Methods & Currencies**
8. API supports bank transfer via virtual bank account or PayNow (currency-dependent) — no cards/wallets directly.
9. **API supports USD and SGD as base currencies** for deposits/payouts. Additionally: Swap between stablecoins (e.g. USDT→XUSD) via Swap API; FX Payout to convert USD→other currencies (e.g. IDR) at disbursement via FX Payout API.
10. APIs are modular and combinable (e.g. First-Party Payment API + Third-Party Payout API). Contact sales if unsure.

**Pricing & Fees**
11–12. Pricing is customized by business needs/volume — contact sales for a quote.
13. No penalties for failed transactions, but frequent failures from bad inputs may trigger fraud checks.
14. No invoice issued for fees deducted per-transaction.

**Technical**
15. Rate limit handling: use batch requests, cache frequent responses.
16. **Callback retries: increasing intervals, up to a maximum of 20 attempts** if client endpoint is down.
17. **Supported file formats: PNG, JPG, PDF, max 10MB per HTTPS request.**

**User Roles & Permissions**
18. Roles doc: Owner/Admin/Developer/Viewer (external support link).
19. Permission matrix — Generate Key: Owner/Admin/Developer yes, Viewer no. Add Member: Owner/Admin yes. Initiate Transactions: Owner/Admin yes only.

**Compliance & Restrictions**
20. Country restrictions apply — see external restricted-countries list.
21. Restricted business types apply — see external restricted-businesses list.

**Contracts**
22. Internal contract-type taxonomy table (13 types) covering fiat deposit/withdraw/payment/payout/refund, stablecoin deposit/withdraw, swap, OTC, transfer, admin, and balance-migration contracts — useful for interpreting transaction/ledger records.

---

## FAQ 2 — Bank Account FAQs
Source: https://docs.straitsx.com/docs/bank-account-faqs.md

1. CP/CP+ bank account verification statuses: `pending`, `verified`, `rejected`.
2. Callbacks fire on: `cpbaCreated` (new bank account created), `cpbaVerificationStatusUpdated` (status change).
3. Verification timing: **Automatic activation** (deposit to assigned VA) = near-instant. **Manual/API activation**: Non-SWIFT (SG) bank accounts = **verified within T+1 working day**; SWIFT accounts = auto-verified immediately if account holder name matches KYC name, else routed to RFI for bank account proof.
4. No rejection reason given — status just shows "rejected".
5. Resubmission supported: update rejected account via `PUT /customer_profile/{customer_profile_id}/bank_accounts/{bank_account_id}` or submit new via `POST /customer_profile/{customer_profile_id}/bank_accounts`.
6. Bank account proof document types — see external Singapore Bank Account Verification Requirements link.
7. Verified accounts: only `account_no`, `swift_bic`, `intermediary_swift_bic`, `routing_code`, `bank_account_proof`, `payment_reason` can be updated. Updating `account_no`, `swift_bic`, or `bank_account_proof` resets status to `pending` (re-verification required).
8. Time between first deposit and verification enabling withdrawal: **near-instant**.

---

## FAQ 3 — Customer Profile FAQs
Source: https://docs.straitsx.com/docs/customer-profile-faqs.md

1. Field requirements differ per CP type (Business CP, Personal CP, Business CP+, Personal CP+) — see linked API references.
2. **CP vs CP+**: both offer named collections/payouts. CP = basic info, no KYC/KYB verification. CP+ = extensive info, full KYC/KYB required, **has per-CP transaction limits**, additional compliance/notification requirements, and **CP+ transactions are currently USD-only**.
3. Detailed field-by-field mandatory/optional matrix for Personal CP+ vs Personal CP (many fields e.g. `dateOfBirth`, `nationality`, `address` mandatory for CP+; things like `annualIncome`, `sourceOfWealth`, `identityDocuments` only apply to CP+).
4. Similar field matrix for Business CP+ vs Business CP (e.g. `beneficialOwners`, `directors`, `sourceOfFunds`, `monthlyTransactionVolume` only for CP+).
5. **CP+ review time: typically ≤30 minutes.** If rejected, a reason is provided; retry recommendation depends on rejection type — document-quality issues are retryable after remediation; internal-policy rejections (e.g. sanctioned user) should not be retried. See FAQ 5 (retryable reasons) for the full code list.
6. IP addresses submitted for CP+ are for record purposes only — not used to restrict deposit/withdrawal.

---

## FAQ 4 — Customer Profile Statuses
Source: https://docs.straitsx.com/docs/customer-profile-statuses.md

- **CP statuses**: `verified` (ready to use), `pending` (awaiting internal review), `rejected` (see rejection reasons list).
- **CP Bank Account (CPBA) statuses**: `verified` (ready for withdrawals), `pending`, `rejected`.
- **CP Virtual Account (CPVA) statuses**: `enabled` (ready for deposits), `pending`, `disabled` (rejected).

---

## FAQ 5 — Retryable Reasons for Resubmission
Source: https://docs.straitsx.com/docs/retryable-reasons-for-resubmission.md

Rejection codes are 3-digit, categorized by range:
- **101–199**: ID Document rejections (all retryable) — expired ID, name mismatch, photocopy, B&W image, missing front/back/page, unacceptable ID type, screenshot/not-original, digital copy, manipulated document (11 codes).
- **201–299**: Proof of Address rejections (all retryable) — outdated (>1 year), password-protected/corrupted, blurry, unacceptable doc type, missing info, mismatched info (6 codes).
- **301–399**: Selfie/Liveness rejections (all retryable) — ID used as selfie, multiple people, no face, face not fully visible, photocopy selfie, digital copy selfie (6 codes).
- **401–499**: General rejections (all retryable) — not a document, blurry, no document detected, other/custom reason, **405 = RFI Expired/No Response** (must reapply).
- **501–599**: Policy rejections — **non-retryable**: 501/502/503 = internal risk-policy violation (profile doesn't meet risk requirements, onboarding cannot proceed); 504 = client requested account closure (must submit new application to reopen).

Full code/message table preserved in raw fetch for exact wording; every code carries a specific "User Message" string that can be surfaced to end users.

---

## FAQ 6 — RFI FAQs
Source: https://docs.straitsx.com/docs/rfi-faqs.md

1. RFI triggers: watchlist matches, high-risk jurisdictions, unusual transaction patterns. Most users complete verification with **no RFI**.
2. RFI applies to both CP and CP+.
3. RFI flow diagrams for happy path, StraitsX-side outage, merchant-side outage (image references only, not reproduced here).
4. RFI statuses: `sent` (issued, merchant action needed, resubmittable no limit until expiry), `received` (StraitsX reviewing, resubmittable), `completed` (accepted, no further resubmission), `expired` (profile rejected, must resubmit fresh, no resubmission of same RFI).
5. **RFI response windows: 14 calendar days during Onboarding (Account Pending Verification); 30 calendar days Post-Onboarding (Account Verified).**
6. **A CP can only have 1 outstanding RFI at a time.**
7. RFI cannot be cancelled/withdrawn once sent — remains active until `completed` or `expired`.
8. Question types: `TEXT`, `CHECKBOX`, `DOC` (document URL upload).
9. **No partial RFI submissions** — all mandatory questions must be answered in one submission or a `400 Bad Request` is returned listing missing question IDs.
10. Checkbox option values are **case-sensitive** (e.g. "Yes" ≠ "yes"/"YES").
11. If RFI response rejected on review, status cycles back to `sent` for resubmission (repeatable until expiry/completion).
12. Cannot resubmit after expiry — must create a new CP+ profile.
13. CP+ status after RFI expiry: `rejected`.
14. Webhook event `cpRfiStatusUpdated` fires on: issued (`sent`), response received (`received`), rejected-and-returned-to-sent, `completed`, `expired`.
15. Example callback available at a linked reference page.
16. Error conditions: invalid RFI Question ID; RFI already `completed`/`expired`; missing mandatory question; submission when user has no RFI; invalid `replyType`; invalid checkbox option (case mismatch).

---

## FAQ 7 — Integration Model FAQs
Source: https://docs.straitsx.com/docs/integration-model-faqs.md

1. Unsure which integration model to use → contact sales.
2. Non-standard use cases can be customized.
3. Can switch integration models later, but **not automatic** — requires compliance approval since it changes fund flow.
4. **One integration model per Business Account at a time** (e.g. either CP or CP+); switching needs compliance approval.
5. No iOS/Android SDKs provided, but apps can call the REST APIs directly.
6. Webhooks supported for real-time transaction notifications (see "Securing Your Callback" guide).
7. **Webhook sender IPs to whitelist (both production and sandbox): `52.221.59.197` and `52.77.136.252`.**
8. Custom IP whitelisting requests can be made via sales.

---

## FAQ 8 — Payment FAQs
Source: https://docs.straitsx.com/docs/payment-faqs.md

1. Two payment collection methods: **Virtual Bank Accounts** (FAST/SWIFT/MEPS, SGD and USD) and **PayNow** (QR/VPA, SGD only, requires SG-registered entity with valid UEN).
2. StraitsX does **not** maintain a per-end-user balance ledger — deposits credit directly to the merchant account; merchants must track per-user balances themselves via callbacks.
3. Deposit currencies: SGD (Virtual Bank Account or PayNow), USD (Virtual Bank Account only). Deposits can be credited as fiat or **auto-converted to stablecoins (XSGD/XUSD)** depending on account configuration.
4. Deposit notification via `paymentStatusUpdated` webhook; configure callback URL in dashboard.
5. Reconciliation fields in deposit callback: account number, `endToEndRef` (sender's bank reference), amount/currency, StraitsX transaction ID.
6. Incoming transaction types: `bankTransferTransaction`/Direct bank transfer (SGD/USD), `paynowTransaction` (SGD only, PayNow).

---

## FAQ 9 — Virtual Account FAQs
Source: https://docs.straitsx.com/docs/virtual-account-faqs.md

1. Each virtual bank account is unique, identified by account number from the creation API.
2. **VA activation takes 1–2 business days** (bank-dependent); starts `pending`, moves to `enabled` via `virtualAccountStatusUpdated` webhook; cannot accept transfers while `pending`.
3. **90-day minimum lock-in period** from activation date; closure requests before 90 days are not processed.
4. **Dormant account fees may apply** for VAs with no activity for extended periods — contact account manager for fee schedule/thresholds.
5. To close a VA: wait out the 90-day lock-in, withdraw remaining funds, call `POST /payment_methods/virtual_bank_accounts/{id}/disable`. Closed account numbers are decommissioned/non-reusable; incoming transfers to closed accounts are returned to sender.
6. Customer profiles can have their own dedicated VAs via `POST /v1/payment_methods/virtual_bank_accounts`; same pending→enabled lifecycle.
7. VA statuses: `pending` (awaiting bank activation, no deposits), `enabled` (active), `disabled` (closed/rejected, no deposits). Status changes trigger webhook.
8. Deposits to `pending`/`disabled` VAs are rejected by the bank and returned to sender; **no callback triggered** on merchant side.
9. Crediting flexibility: SGD deposits → credit as SGD or convert to **XSGD**; USD deposits → credit as USD or convert to **XUSD**. Configured at account level via account manager.

---

## FAQ 10 — PayNow FAQs
Source: https://docs.straitsx.com/docs/paynow-faqs.md

1. QR code types: **Persistent** (no expiry, multi-use) vs **Dynamic** (expires **5 minutes to 30 days**, configurable, single-use).
2. **PayNow transaction limit: S$200,000 per transaction** (FAST network national cap, applies regardless of StraitsX account tier).
3. Payers see a Virtual Payment Address (VPA) assigned by StraitsX; exact format returned in QR code metadata.
4. **PayNow is SGD-only** — no USD support; use virtual bank account + SWIFT for USD.
5. **PayNow deposits credited near-instantly (typically within seconds)**, notified via `paymentStatusUpdated` webhook.
6. Customer profiles can receive PayNow payments via dedicated QR codes.
7. GrabPay PayNow senders may have account numbers with special characters (e.g. `12345678901234_1234567890123_R`) — valid for receiving but **cannot be used as payout recipients**. Workaround: contact StraitsX support for manual refund.

---

## FAQ 11 — Payout & Refund FAQs
Source: https://docs.straitsx.com/docs/payout-faqs.md

1. Bank accounts for end users can be added anytime via Create Customer Profile Bank Account API.
2. **No scheduled-payout support** in the API — must build a recurring job in your own backend.
3. **Payouts are processed instantly** via the API, but actual recipient receipt time depends on currency/size/banking network; some payouts may be held for fraud/compliance review.
4. **Payouts cannot be recalled/cancelled once initiated** — verify details before submission.
5. Required payout-recipient fields depend on integration model: **1st Party** = payout only to the same bank account used for the original payment; **3rd Party** and **Regular Transfer** models = see linked recipient-creation API refs.
6. **No refund/cancellation API** — workaround is using the incoming deposit's bank info + Payout API to manually refund.
7. If beneficiary bank rejects a payout **after** disbursement completed, the withdrawal status stays `completed` and returned funds appear as a new separate incoming deposit. If the disbursement fails **during** processing (before funds leave StraitsX), status becomes `failed`.
8. Chargeback flow: sender requests SWIFT reversal via their bank → forwarded to receiving bank → StraitsX approval required, subject to location/sufficiency of funds; if already credited to merchant, StraitsX rejects the reversal and sender is told to resolve directly with merchant.
9. Transaction types: **Withdrawal on behalf** (1st-party payouts, SGD), **bankTransferTransaction** (3rd-party/regular payouts, SGD), **paynowTransaction** (PayNow, SGD), **swiftTransaction** (USD).
10. SWIFT payout fees: controlled via `charge_option` — **SHA** (Shared: sender pays sending-bank fee, recipient pays intermediary/receiving-bank fees, recipient gets less than sent amount) vs **OUR** (sender pays all fees, recipient gets full amount — recommended).
11. Payout status webhook: `payoutStatusUpdated`, payload includes `status` (`pending`/`completed`/`failed`). Configurable via Update Webhooks API or dashboard.
12. GrabPay-sourced sender accounts (special-character account numbers) **cannot be used as payout recipients**; refund workaround = contact support for manual refund.

---

## FAQ 12 — Remittance Purpose Code
Source: https://docs.straitsx.com/docs/remittance-purpose-code.md

**SGD FAST payouts**: optional purpose code parameter; **46 codes** supported (e.g. `BEXP` Business Expenses, `SALA` Salary Payment, `LOAN` Loan, `IVPT` Invoice Payment, `SUPP` Supplier Payment, `TRAD` Trade Services, `OTHR` Other, `REFU` Refund, `RENT` Rent — full list of 46 in raw file `raw/12_remittance-purpose-code.md`).

**UAE payouts**: **Purpose Code is MANDATORY** — the UAE Central Bank requires a valid Purpose Code for all outbound payments; **payouts to UAE beneficiaries will be REJECTED by the receiving bank if omitted**. ~140-code list covering categories like Salary (`SAL`), Family Support/Workers' remittances (`FAM`), Goods sold/bought (`GDE`/`GDI`), Loan Interest Payments (`LIP`), Dividend Payouts (`DIV`), Charitable Contributions (`CHC`), etc. — full list in raw file.

(Per changelog v1.2.1 — see below — the `purpose_code` field in the Create First Party Bank Transfer Payout API validates as **alphanumeric, up to 6 characters**, applicable to both SGD FAST and UAE payouts.)

---

## FAQ 13 — Swap FAQs
Source: https://docs.straitsx.com/docs/swap-faqs.md

1. **Quote validity by pair**: XSGDUSDC 5min; XSGDXUSD 5min; USDCUSDT 1min; XUSDUSDC 5min; XUSDUSDT 1min; **XSGDUSDT 1min**; XSGDSGD **1 hour**; XSGDUSD 1min; XUSDSGD 1min; XUSDUSD 1min; USDCSGD 5min; USDCUSD 5min; USDTSGD 1min; USDTUSD 1min; SGDUSD 1min.
2. Three-endpoint flow: Request a Swap Quote (get rate) → Get a Swap Quote (retrieve by ID) → Execute a Swap Quote (confirm/execute).
3. Swaps **cannot be cancelled/reversed** once executed — settled immediately.
4. Expired quotes require requesting a new one; quotes are time-limited to reflect real-time rates.
5. **Swap API available 24/7**, including after bank hours and weekends.
6. **Min/max swap amount: 10 to 200,000** (source/target currency); invalid range returns an error.
7. Out-of-range amount → `400 Bad Request`.
8. `totalSourceCurrencyAmount` only differs from `sourceCurrencyAmount` if a transaction fee is charged on top of spread (**StraitsX typically doesn't charge swap transaction fees**).
9. Swap fees always follow the source currency.
10. Swap quotes **do not freeze funds**.
11. Swap execution statuses: `completed`, `failed`, `pending`.
12. **Swap completion is near-instant**, with a callback.
13. Swap completion webhook: `swapUpdated`.

---

## FAQ 14 — Blockchain FAQs (highest priority — Avalanche/XSGD relevance)
Source: https://docs.straitsx.com/docs/blockchain-faqs.md

1. **Supported blockchains for transfers are not named in this page** — must be retrieved dynamically via `GET` "list of supported blockchains" API (linked reference: `reference/get-a-list-of-supported-blockchains`). **No static chain list, no XSGD contract address, and no testnet info is given on this page.**
2. Whitelisting blockchain withdrawal addresses: **Custodial addresses** (exchange/platform wallets) — submit via dashboard for StraitsX review/approval. **Non-custodial addresses** (personal wallets) — submit via dashboard, then complete ownership verification via a **withdraw-and-redeposit cycle**. KYB/KYC may be required before an address can be whitelisted.
3. **Confirmation time table (verbatim):**

   | Blockchain | Estimated Confirmation Time | Factors |
   |---|---|---|
   | Ethereum (ERC-20) | **5 – 15 minutes** | Gas fees, network congestion |
   | Polygon (MATIC) | **2 – 5 minutes** | Validator processing speed |
   | **Avalanche (AVAX)** | **1 – 2 minutes** | Network congestion, validator confirmation |
   | Binance (BEP-20) | **1 – 3 minutes** | Validator speed, network congestion |

   Note: confirmation times are estimates, may vary with network conditions.
4. Gas fees vary by network/congestion; API provides a **network fee estimate** before executing a transfer.
5. Failed blockchain transactions may occur from low gas fees, network congestion, or invalid addresses — retry after adjusting parameters.
6. **StraitsX does not currently support direct smart contract interactions** (may be introduced in future).
7. Deposit addresses **can** be created via API in production (`reference/create-deposit-address`). **Whitelisted withdrawal addresses cannot be created via API in production** — must be added via the StraitsX dashboard.

**Gap flagged for AgentPay:** this page confirms Avalanche (AVAX) is a supported chain with 1–2 min confirmation, but gives no XSGD/Avalanche contract address, no chain ID, no testnet (e.g. Fuji) reference, and no blockchain-specific min/max transfer amount. That detail must come from elsewhere in the docs (not in this FAQ/changelog set) — recommend a follow-up fetch of the API Reference "supported blockchains" endpoint and any Guides/Getting-Started pages on blockchain deposits/withdrawals.

---

## FAQ 15 — Transaction Limit FAQs
Source: https://docs.straitsx.com/docs/transaction-limit-faqs.md

1. **CP: no transaction limits.** **CP+: has limits** — Daily Deposit Limit (business CP+ only), Daily Withdrawal Limit (business CP+ only), Per Transaction Limit (both personal & business CP+), Annual Deposit Limit (personal CP+ only, over 365 days), Annual Withdrawal Limit (personal CP+ only, over 365 days).
2. Limits viewable/updatable via Transaction Limit API. Two callback types: **Transaction Limit Update Request Status Updated** (status e.g. `approved`) and **Transaction Limit Updated** (new limit values). Sample payload shows Business CP+ fields (`totalDailyPaymentLimit`, `availableDailyPaymentLimit`, `totalDailyPayoutLimit`, `availableDailyPayoutLimit`, `transactionSizeLimit`) and Individual CP+ fields (`totalAnnualPaymentLimit`, `availableAnnualPaymentLimit`, `totalAnnualPayoutLimit`, `availableAnnualPayoutLimit`, `transactionSizeLimit`) — example values shown as `200000`.
3. **Limit-increase review takes up to 10 working days**, depending on document completeness.
4. Source-of-wealth doc requirement: only **at least one** relevant type needed (not all types) — Personal CP+ examples: `employmentIncome`, `businessOwnership`, `investmentReturns`; Business CP+ examples: `businessRevenue`, `investorFunds`, `businessLoans`.
5. Max deposit/withdrawal: **CP = no fixed limits; CP+ = subject to limits in Q1.** Large transactions may trigger compliance review and longer processing times.

---

## FAQ 16 — Support
Source: https://docs.straitsx.com/docs/support.md

- API support: StraitsX Customer Support ticket portal (support.straitsx.com).
- Business inquiries: Contact Sales (straitsx.com/contact-sales).

---

# CHANGELOG

## Changelog 17 — v1.5.0: Cross-Border FX Payouts and API Enhancements
Source: https://docs.straitsx.com/changelog/v150-cross-border-fx-payouts-and-api-enhancements.md

**New: FX Payout API** — first cross-border payout capability; convert + disburse to recipient bank account in a single flow, no need to pre-hold target-currency balance.
- **Supported currency pairs:** XUSD → IDR (live), USD → IDR (live), **XSGD → IDR (coming soon)**, **SGD → IDR (coming soon)**.
- Capabilities: real-time FX quotes, execute-quote-to-initiate-payout in one flow, status via polling or webhooks (`cpFxPayoutStatusUpdated` / `userFxPayoutStatusUpdated`), sandbox manual status override (`completed`/`cancelled`) for testing.
- New endpoints: Create an FX quote, Get an FX quote, Create a payout (execute FX quote), Get a payout, Get a list of payouts, Update payout status (Sandbox).
- New guide: "FX Payout API" under Guides > Integration Model.

**API Enhancements:**
1. New `transactionRemarks` field on user withdrawal (optional string, external reference visible to recipient). **Length rules by network: `fast` = max 35 chars; `swift` = max 105 chars.** Affects Create/Get user withdrawal + Dashboard Withdrawal Status Update callback.
2. New `tradingName` field for business customer profiles (optional, **1–50 chars**, regex `/\A[\x20-\x3B\x3D\x3F-\x7E]{1,50}\z/`). If provided, used for PayNow registration instead of `customerName`; falls back to `customerName` if absent.
3. "Get a list of supported banks" API now returns `swift_code` (string) per bank.

**Docs updates:** Transaction Status guide now covers blockchain activity statuses for blockchain deposit/withdrawal; added explanation of the `expired` payment status.

---

## Changelog 18 — v1.4.0: HTTP Request Signing and Webhook Key Management
Source: https://docs.straitsx.com/changelog/v140-http-request-signing-and-webhook-key-management.md

**Part 1 — New: HTTP Request Signing.** Uses **Ed25519** asymmetric key pairs to sign API requests for stronger integrity/origin verification on top of existing API key auth.
- New headers: `X-PUBLIC-KEY-ID`, `X-TIMESTAMP`, `X-NONCE`, `X-SIGNATURE`.
- Public key management via StraitsX Dashboard (upload/view/activate/deactivate/delete).
- **Replay protection: nonce uniqueness + timestamp validation with a ±300 second window.**
- **Opt-in only** — existing `X-XFERS-APP-API-KEY` auth still fully supported, no forced migration. Testable in Sandbox before Production.
- Docs updated: "Authentication Methods" guide, "HTTP Request Signing" FAQ (canonical string construction, code samples in Python/Go/Node.js/Ruby, error refs).

**Part 2 — Enhancement: Webhook Signing Key Management.** Merchants can now manage webhook signing secrets independently from the Dashboard (previously auto-created alongside API keys, not independently manageable): create new secrets, activate/deactivate, delete. Enables secret rotation independent of API keys.

---

## Changelog 19 — Payments v1.3.0: Multi-Currency and High-Value SGD Rail Enhancements
Source: https://docs.straitsx.com/changelog/payments-v130-multi-currency-and-high-value-sgd-rail-enhancements.md

**Part 1 — Multi-Currency Support:**
- `filter[currency]` on `GET /v1/payments` and `GET /v1/payouts` now accepts `xsgd`, `xusd`, `sgd`, or `usd`.
- `walletSource` on `POST /v1/withdrawal` and `POST /v1/payouts` now accepts, per account type: **Fiat Only Business User** = `sgd`, `usd`; **Default Business User** = `xsgd`, `xusd`, `sgd`, `usd`.
- **Swap API expanded by 9 new pairs**: `XSGDSGD`, `XSGDUSD`, `XUSDSGD`, `XUSDUSD`, `USDCSGD`, `USDCUSD`, `USDTSGD`, `USDTUSD`, `SGDUSD` — now returned by `GET /v1/swap/pairs`.

**Part 2 — SWIFT and MEPS Rail Access for API users** (following prior Dashboard-only rollout). **MEPS is SGD-only**; USD disbursement continues to use SWIFT unchanged.
- `disbursementMethod` on `POST /v1/payout-recipients`, `POST /v1/customer_profile/{id}/payout-recipients`, `POST /v1/payouts`, `POST /v1/customer_profile/{id}/payouts` now accepts `bankTransfer`, `paynow`, `swift`, or `meps`. **SGD supports all four; USD supports only `swift`.**
- New `disbursement_method` param on `POST /v1/customer_profile/{customer_profile_id}/withdrawals` (First Party Bank Transfer Payout), optional: `bank_transfer` (SGD FAST only, SGD default), `meps` (SGD only), `swift` (SGD & USD, USD default).
- New `network` param on `POST /v1/payment_methods/virtual_bank_accounts` (Create Virtual Bank Account), optional: `fast` (SGD only, SGD default), `meps` (SGD only), `swift` (SGD & USD, USD default).

---

## Changelog 20 — v1.2.1: New Payment Attributes and Documentation Improvements
Source: https://docs.straitsx.com/changelog/v121-new-payment-attributes-and-documentation-improvements.md

**New: `paymentReason` field** on Customer Profile Bank Account and Payout Recipient APIs — passes explicit instructions to the receiving bank as the payment description; **overrides Remittance Information (MT103 Field 70 / pacs.008 Remittance Information)** in the payment message. **Length: 1–150 chars (non-blank), regex `/^\s*.{1,150}\s*$/`.** Applies to 8 listed payout-recipient/bank-account endpoints (as `paymentReason` for recipients, `payment_reason` for bank accounts).

**Documentation improvements:**
- Bank Account FAQs Q2 updated to include `cpbaVerificationStatusUpdated` callback event.
- Swap FAQs Q1 updated to include `XSGDUSDT` pair.
- Deposit/Payment callback docs: added payload-structure description; added Blockchain Deposit Status Update callback sample; added Customer Profile Bank Account callback samples.
- Get Account Statement API: `filter[currency]` now allows `sgd`/`usd` filtering.
- Webhook APIs (`Get`/`Update webhooks`) gained new event types: `cpbaVerificationStatusUpdated`, `cpbaCreated`, `ubaCreated`, `ubaVerificationStatusUpdated`.
- Update Transaction Limit API response schema gained `customerProfileId`.
- Get Supported Swap Pairs API sample updated to include `XSGDUSDT`.
- **Create First Party Bank Transfer Payout API**: `purpose_code` description updated — applicable to **both SGD FAST payouts and UAE payments**; **validation: alphanumeric, up to 6 characters.**

---

## Changelog 21 — v1.2.0: MANDATORY CHANGES BY 30 JAN 2026 (now in force as of Aug 2026)
Source: https://docs.straitsx.com/changelog/mandatory-changes-30-jan-2026.md

**⚠ DEADLINE: 30 January 2026 — stricter SWIFT/ISO 20022 API validations became enforced on this date. Integrations not updated by then would fail.** Since today's date is 2026-08-15, these validations are now live/mandatory and must be assumed in force for any current integration.

**Part 1 — Validation & Compliance Updates.** Goal: reduce downstream rejections, meet ISO 20022 standards. Change: SWIFT-character regex patterns + reduced max field lengths, applied across `POST /v1/kyc/customer_profiles`, `PUT /v1/kyc/customer_profiles/:unique_id`, `PATCH /v1/sandbox/kyc/customer_profiles/:unique_id`:

| Profile type | Field | Old | New |
|---|---|---|---|
| Personal CP | `customerName` | Max 191, any chars, mandatory | **SWIFT chars, max 50**, regex `/^(?=.{1,50}$)[a-zA-Z0-9 ]+$/`, mandatory |
| Personal CP | `address.street` | Max 180, any chars, mandatory | **SWIFT chars, max 180**, regex `/^(?=.{1,180}$)[a-zA-Z0-9\-?:().,' +]+$/`, mandatory |
| Personal CP | `address.city` | Max 100, specific chars, optional | **SWIFT chars, max 20**, mandatory (now required) |
| Personal CP | `address.state` | Max 35 SWIFT chars, optional | **SWIFT chars, max 15**, optional |
| Business CP | `customerName` | Max 191 → | **Max 50 SWIFT chars**, mandatory |
| Business CP | `address.street/city/state` | same pattern as above | same new SWIFT-char/length limits (street 180, city 20 now mandatory, state 15) |
| Business CP | `placeOfBiz` | Max 255, any chars, mandatory | **SWIFT chars, max 255**, mandatory |
| Personal CP+ | `customerFirstName`, `customerLastName` | Max 191 each, any chars, mandatory | **SWIFT chars, max 50 each**, mandatory |
| Personal CP+ | `address.street/city/state` | as above | same new limits (city now mandatory) |
| Business CP+ | `customerName`, `address.*`, `operatingAddress.*`, `beneficialOwners[].address.*`, `trader.address.*` | Max 180–255, various | **All converted to SWIFT-char regex**, street=max180, city=max20 (mandatory), state=max15 — applies uniformly across business, operating address, each beneficial owner, and trader records |

(Full regex strings preserved in raw fetch `raw/21_mandatory-changes-30-jan-2026.md` — all "New Validation" columns use SWIFT character sets `[a-zA-Z0-9 ]` for names or `[a-zA-Z0-9\-?:().,' +]` for addresses.)

**Part 2 — New Features: Blockchain Withdrawal Improvements.** Goal: allow users to keep funds in fiat (SGD/USD) without auto-conversion.
- Endpoint: `POST /v1/blockchain_transfer/withdrawals/`.
- Dashboard VA deposits in SGD/USD now go to **SGD/USD balances instead of being auto-converted to XSGD/XUSD**.
- New optional field **`wallet_source`** lets you choose which balance to deduct per blockchain withdrawal. Accepted values: **`XSGD`, `XUSD`, `USD`, `SGD`**. If unspecified, XSGD/XUSD withdrawals default to deducting from XSGD/XUSD balances respectively.
- Note: after implementing changes, merchants must notify StraitsX's internal team to roll out corresponding dashboard updates.

---

## NOT FETCHED
None — all 21 URLs returned HTTP 200 and were fetched/read successfully. Raw markdown files retained at:
`/private/tmp/claude-501/-Users-desmondchyezhihao-Documents-GitHub-agentpay/012fbfd0-fb2e-481f-a95d-9a00481523ec/scratchpad/straitsx-digest/raw/`
# StraitsX Documentation

> Documentation for StraitsX

## Guides
- [StraitsX API Guides](https://docs.straitsx.com/docs/introduction.md)
- [Getting Started](https://docs.straitsx.com/docs/getting-started.md)
- [Sandbox & Production Environments](https://docs.straitsx.com/docs/sandbox-production-environments.md)
- [Authentication Methods](https://docs.straitsx.com/docs/authentication-methods.md): Learn about the authentication methods available to secure your API requests.
- [Download Postman Collection](https://docs.straitsx.com/docs/download-postman-collection.md)
- [First Party Transfer (Customer Profile & Customer Profile+)](https://docs.straitsx.com/docs/first-party-transfer.md)
- [Customer Profile(CP) vs Customer Profile+(CP+)](https://docs.straitsx.com/docs/customer-profilecp-vs-customer-profilecp.md)
- [Customer Profile and Bank Account Creation](https://docs.straitsx.com/docs/customer-profile-and-bank-account-creation.md)
- [Customer Profile+ and Bank Account Creation](https://docs.straitsx.com/docs/customer-profile-plus-and-bank-account-creation.md)
- [First Party Payment](https://docs.straitsx.com/docs/first-party-payment.md)
- [First Party Payout](https://docs.straitsx.com/docs/first-party-payout.md)
- [Third Party Transfer (Customer Profile)](https://docs.straitsx.com/docs/third-party-transfer.md)
- [Customer Profile Creation](https://docs.straitsx.com/docs/customer-profile-creation.md)
- [Third Party Payment](https://docs.straitsx.com/docs/third-party-payment.md)
- [Third Party Payout](https://docs.straitsx.com/docs/third-party-payout.md)
- [Regular Transfer](https://docs.straitsx.com/docs/regular-transfer.md)
- [Regular Payment](https://docs.straitsx.com/docs/regular-payment.md)
- [Regular Payout](https://docs.straitsx.com/docs/regular-payout.md)
- [PayNow Transfer Payments Guide](https://docs.straitsx.com/docs/paynow-transfer-payments-guide.md)
- [FX Payout API](https://docs.straitsx.com/docs/fx-payout-api.md)
- [Blockchain Transfer Out API](https://docs.straitsx.com/docs/blockchain-transfer-out-guide.md)
- [Swap API](https://docs.straitsx.com/docs/swap-api.md)
- [Source IP Addresses](https://docs.straitsx.com/docs/source-ip-addresses.md)
- [Securing Your Callback](https://docs.straitsx.com/docs/securing-your-callback.md)
- [Callback Configuration](https://docs.straitsx.com/docs/callback-configuration.md)
- [Payment Callbacks](https://docs.straitsx.com/docs/payment-callbacks.md)
- [Payout Callbacks](https://docs.straitsx.com/docs/payout-callbacks.md)
- [Customer Profile Callbacks (Regular CP)](https://docs.straitsx.com/docs/customer-profile-callbacks-regular-cp.md)
- [Customer Profile+ Callbacks (CP+)](https://docs.straitsx.com/docs/customer-profile-callbacks-cp-plus.md)
- [RFI Callback](https://docs.straitsx.com/docs/rfi-callback.md)
- [Transaction Limit Callbacks](https://docs.straitsx.com/docs/transaction-limit-callbacks.md)
- [Bank Account Callbacks](https://docs.straitsx.com/docs/bank-account-callbacks.md)
- [Virtual Account Callbacks](https://docs.straitsx.com/docs/virtual-account-callbacks.md)
- [Deposit and Withdrawal Callbacks](https://docs.straitsx.com/docs/deposit-and-withdrawal-callbacks.md)
- [Blockchain Callbacks](https://docs.straitsx.com/docs/blockchain-callbacks.md)
- [Swap Callback](https://docs.straitsx.com/docs/swap-callback.md)
- [Transaction Status](https://docs.straitsx.com/docs/transaction-status.md)
- [Error Responses](https://docs.straitsx.com/docs/errors.md)
- [Idempotent Requests](https://docs.straitsx.com/docs/idempotent-requests.md)
- [Transaction Safety](https://docs.straitsx.com/docs/transaction-safety.md)
- [API Upgrades and Backward Compatibility](https://docs.straitsx.com/docs/backward-compatibility.md)
- [General FAQs](https://docs.straitsx.com/docs/common-faqs.md)
- [HTTP Request Signing](https://docs.straitsx.com/docs/http-request-signing.md)
- [Recipient Bank Account FAQs](https://docs.straitsx.com/docs/bank-account-faqs.md)
- [Customer Profile FAQs](https://docs.straitsx.com/docs/customer-profile-faqs.md)
- [Customer Profile Statuses](https://docs.straitsx.com/docs/customer-profile-statuses.md)
- [Retryable Reason for CP Resubmission](https://docs.straitsx.com/docs/retryable-reasons-for-resubmission.md)
- [RFI FAQs](https://docs.straitsx.com/docs/rfi-faqs.md)
- [Integration Model FAQs](https://docs.straitsx.com/docs/integration-model-faqs.md)
- [Payment FAQs](https://docs.straitsx.com/docs/payment-faqs.md)
- [Virtual Account FAQs](https://docs.straitsx.com/docs/virtual-account-faqs.md)
- [PayNow FAQs](https://docs.straitsx.com/docs/paynow-faqs.md)
- [Payout & Refund FAQs](https://docs.straitsx.com/docs/payout-faqs.md)
- [Purpose Code](https://docs.straitsx.com/docs/remittance-purpose-code.md)
- [Swap FAQs](https://docs.straitsx.com/docs/swap-faqs.md)
- [Blockchain FAQs](https://docs.straitsx.com/docs/blockchain-faqs.md)
- [Transaction Limit FAQs](https://docs.straitsx.com/docs/transaction-limit-faqs.md)
- [Need help?](https://docs.straitsx.com/docs/support.md)

## API Reference
- [Say Hello](https://docs.straitsx.com/reference/say-hello.md): Test your connection with our server to start your integration
- [Customer Profile (CP)](https://docs.straitsx.com/reference/customer-profile.md)
- [Create a personal customer profile](https://docs.straitsx.com/reference/create-a-personal-customer-profile.md): [Available in Sandbox/Production environment] Create a personal customer profile on our platform.
- [Create a business customer profile](https://docs.straitsx.com/reference/create-a-business-customer-profile.md): [Available in Sandbox/Production environment] Create a business customer profile on our platform.
- [Get a customer profile](https://docs.straitsx.com/reference/get-a-customer-profile.md)
- [Get a list of customer profiles](https://docs.straitsx.com/reference/get-list-of-customer-profiles.md)
- [Update a personal customer profile](https://docs.straitsx.com/reference/update-a-personal-customer-profile.md): [Available in Sandbox/Production environment] Update a personal customer profile on our platform.
- [Update a business customer profile](https://docs.straitsx.com/reference/update-a-business-customer-profile.md): [Available in Sandbox/Production environment] Update a business customer profile on our platform.
- [[Sandbox] Update Customer Profile Verification Status](https://docs.straitsx.com/reference/sandbox-update-regular-customer-profile-verification-status.md): [Available in Sandbox environment only] Simulates updating a CP profile's verification status.
- [Customer Profile+ (CP+)](https://docs.straitsx.com/reference/customer-profile-plus.md)
- [Create a personal customer profile+ API](https://docs.straitsx.com/reference/create-a-personal-customer-profile-plus.md): [Available in Sandbox/Production environment] Create a personal CP+ profile on our platform.
- [Create a business customer profile+ API](https://docs.straitsx.com/reference/create-a-business-customer-profile-plus.md): [Available in Sandbox/Production environment] Create a business CP+ profile on our platform.
- [Get a customer profile+](https://docs.straitsx.com/reference/get-a-customer-profile-plus.md)
- [Get a list of CP+ profiles](https://docs.straitsx.com/reference/get-a-list-of-cp-plus.md)
- [Update a personal CP+](https://docs.straitsx.com/reference/update-a-personal-cp-plus.md)
- [[Sandbox] Update Customer Profile+ Verification Status](https://docs.straitsx.com/reference/sandbox-update-customer-profile-plus-verification-status.md): [Available in Sandbox environment only] Simulates updating a CP+ profile's verification status.
- [Get a list of outstanding RFIs](https://docs.straitsx.com/reference/get-a-list-of-outstanding-rfis.md): [Available in Sandbox/Production environment] Get a list of outstanding RFIs for a customer profile.
- [Get a single RFI Request](https://docs.straitsx.com/reference/get-a-single-rfi-request.md): [Available in Sandbox/Production environment] Get details of a specific RFI request for a customer profile.
- [Submit RFI](https://docs.straitsx.com/reference/submit-rfi.md): [Available in Sandbox/Production environment] Submit answers to an RFI request for a customer profile.
- [[Sandbox] Simulate RFI Questions](https://docs.straitsx.com/reference/sandbox-simulate-rfi-questions.md): [Available in Sandbox environment only] Simulates sending RFI questions to a customer profile.
- [[Sandbox] Transition RFI status](https://docs.straitsx.com/reference/sandbox-transition-rfi-status.md): [Available in Sandbox environment only] Simulate approving or expiring an RFI request.
- [CP/CP+ Bank Accounts](https://docs.straitsx.com/reference/customer-profile-bank-account.md)
- [Create a customer profile bank account](https://docs.straitsx.com/reference/create-customer-profile-bank-account.md): [Available in Sandbox/Production environment] Add a bank account for a customer profile
- [Get a list of customer profile bank accounts](https://docs.straitsx.com/reference/get-a-list-of-customer-profile-bank-accounts.md): [Available in Sandbox/Production environment] Retrieve list of bank accounts and their verification status for a customer profile.
- [[Sandbox] Update customer profile bank account verification status](https://docs.straitsx.com/reference/sandbox-update-customer-profile-bank-account-verification-status.md): [Available in Sandbox environment only] Simulates bank account verification for a given bank account
- [Update a customer profile bank account](https://docs.straitsx.com/reference/update-a-customer-profile-bank-account.md): [Available in Sandbox/Production environment] Updates the bank account information for a customer profile
- [Delete a customer profile bank account](https://docs.straitsx.com/reference/delete-a-customer-profile-bank-account.md): [Available in Sandbox/Production environment] Deletes the bank account information for a customer profile
- [First/Third Party Payments (Customer Profile)](https://docs.straitsx.com/reference/first-third-party-payments.md)
- [Create a virtual bank account](https://docs.straitsx.com/reference/create-a-virtual-bank-account.md): [Available in Production/Sandbox environment] Create a virtual bank account to accept payments.
- [Get a virtual bank account](https://docs.straitsx.com/reference/retrieve-virtual-bank-account.md): [Available in Production/Sandbox environment] Retrieve virtual bank account details
- [Delete a customer profile virtual account](https://docs.straitsx.com/reference/delete-a-customer-profile-virtual-account.md)
- [[Sandbox] Update virtual bank account status](https://docs.straitsx.com/reference/update-virtual-bank-account-status.md): [Available in Sandbox environment only] Simulates bank account verification for a given bank account
- [[Sandbox] Create a mock bank transfer payment](https://docs.straitsx.com/reference/create-a-mock-bank-transfer-payment.md): [Available in Sandbox environment only] Send test funds to your business account via bank transfer
- [[Sandbox] Update status of mock bank transfer payment](https://docs.straitsx.com/reference/update-status-of-mock-bank-transfer-payment.md): [Available in Sandbox environment only] Update status of mock bank transfer payment to completed or failed
- [PayNow Payments](https://docs.straitsx.com/reference/paynow-payments.md)
- [Create a persistent PayNow payment method](https://docs.straitsx.com/reference/create-a-persistent-paynow-payment-method.md): [Available in Production/Sandbox environment] Create a persistent PayNow payment method to accept payments from your customers.
- [Get a persistent PayNow](https://docs.straitsx.com/reference/get-a-persistent-paynow-payment-method.md): [Available in Production/Sandbox environment] Get a persistent PayNow payment method created
- [Create a dynamic PayNow payment](https://docs.straitsx.com/reference/create-a-dynamic-paynow-payment.md): [Available in Production/Sandbox environment] Create a dynamic (one-off) PayNow to accept payments from your customers.
- [Get a dynamic PayNow](https://docs.straitsx.com/reference/get-a-dynamic-paynow-payment.md): [Available in Production/Sandbox environment] Get a Dynamic PayNow created
- [[Sandbox] Create a mock PayNow payment](https://docs.straitsx.com/reference/create-a-mock-paynow-payment.md): [Available in Sandbox environment only] Send test funds to your business account via PayNow
- [[Sandbox] Update status of mock PayNow payment](https://docs.straitsx.com/reference/sandbox-update-status-of-mock-paynow-payment.md): [Available in Sandbox environment only] Update status of mock PayNow payment to completed or failed
- [General](https://docs.straitsx.com/reference/miscellaneous.md)
- [Get a list of payment methods for a customer profile](https://docs.straitsx.com/reference/get-a-list-of-payment-methods-for-a-customer-profile.md): [Available in Production/Sandbox environment] Get a list of available payment methods for a specific customer profile
- [Get a payment for a customer profile](https://docs.straitsx.com/reference/get-a-payment-customer-profile.md): [Available in Production/Sandbox environment] Retrieve a payment made via bank transfer or PayNow
- [Get a list of payments for a customer profile v2](https://docs.straitsx.com/reference/get-a-list-of-payments-for-a-customer-profile-v2.md): [Available in Production/Sandbox environment] Retrieve payments made via bank transfer or PayNow for a customer profile
- [Create a virtual bank account](https://docs.straitsx.com/reference/create-virtual-bank-account.md): [Available in Production/Sandbox environment] Create a virtual bank account to accept payments.
- [Get a virtual bank account](https://docs.straitsx.com/reference/get-virtual-bank-account.md): [Available in Production/Sandbox environment] Retrieve virtual bank account details
- [Delete a virtual account](https://docs.straitsx.com/reference/delete-a-virtual-account.md)
- [[Sandbox] Update virtual bank account status](https://docs.straitsx.com/reference/sandbox-update-virtual-account-status.md): [Available in Sandbox environment only] Simulates bank account verification for a given bank account
- [[Sandbox] Create a mock bank transfer payment](https://docs.straitsx.com/reference/sandbox-create-mock-bank-transfer-payment.md): [Available in Sandbox environment only] Send test funds to your business account via bank transfer
- [[Sandbox] Create a mock dashboard deposit](https://docs.straitsx.com/reference/sandbox-create-a-mock-dashboard-deposit.md): [Available in Sandbox environment only] Send test funds to your dashboard account via bank transfer
- [[Sandbox] Mock a deposit status](https://docs.straitsx.com/reference/sandbox-mock-a-deposit-status.md): [Available in Sandbox environment only] Mock the status of a deposit
- [Create a persistent PayNow payment method](https://docs.straitsx.com/reference/create-persistent-paynow-payment-method.md): [Available in Production/Sandbox environment] Create a persistent PayNow payment method to accept payments from your customers.
- [Get a persistent PayNow](https://docs.straitsx.com/reference/get-persistent-paynow.md): [Available in Production/Sandbox environment] Get a persistent PayNow payment method created
- [Create a dynamic PayNow payment](https://docs.straitsx.com/reference/create-dynamic-paynow-payment.md): [Available in Production/Sandbox environment] Create a dynamic (one-off) PayNow to accept payments from your customers.
- [Get a dynamic PayNow](https://docs.straitsx.com/reference/get-dynamic-paynow.md): [Available in Production/Sandbox environment] Get a Dynamic PayNow created
- [[Sandbox] Create a mock PayNow payment](https://docs.straitsx.com/reference/sandbox-create-mock-paynow-payment.md): [Available in Sandbox environment only] Send test funds to your business account via PayNow
- [[Sandbox] Update status of mock PayNow payment](https://docs.straitsx.com/reference/update-sandbox-regular-payment-mock-paynow-status.md): [Available in Sandbox environment only] Update status of mock PayNow payment to completed or failed
- [Get a payment](https://docs.straitsx.com/reference/get-a-payment.md): [Available in Production/Sandbox environment] Retrieve a payment made via bank transfer or PayNow
- [Get a list of payment methods](https://docs.straitsx.com/reference/get-a-list-of-payment-methods.md): [Available in Production/Sandbox environment] Retrieve payment methods created
- [Get a list of payments](https://docs.straitsx.com/reference/get-list-of-payments.md): [Available in Production/Sandbox environment] Retrieve payments made via bank transfer or PayNow
- [Create a first party bank transfer payout](https://docs.straitsx.com/reference/create-a-first-party-bank-transfer-payout.md): [Available in Production/Sandbox environment] Send funds back to your user's verified bank account
- [Get a first party bank transfer payout](https://docs.straitsx.com/reference/get-a-first-party-bank-transfer-payout.md)
- [Get a list of first party bank transfer payouts](https://docs.straitsx.com/reference/get-a-list-of-first-party-bank-transfer-payouts.md): [Available in Production/Sandbox environment] Retrieve bank transfer payouts for a customer profile
- [Get a list of outbound transfers](https://docs.straitsx.com/reference/get-a-list-of-outbound-transfers-1.md): [Available in Production/Sandbox environment] Retrieve withdrawal transaction records
- [[Sandbox] Update status of mock first party bank transfer payout](https://docs.straitsx.com/reference/update-status-of-mock-first-party-bank-transfer-payout.md): [Available in Sandbox environment only] Update status of created payout from `pending`
- [Get recipient requirements](https://docs.straitsx.com/reference/get-customer-profile-recipient-requirements.md)
- [Create a customer profile payout recipient](https://docs.straitsx.com/reference/create-a-customer-profile-payout-recipient.md)
- [Update a customer profile payout recipient](https://docs.straitsx.com/reference/update-a-customer-profile-payout-recipient.md)
- [Get a customer profile payout recipient](https://docs.straitsx.com/reference/get-a-customer-profile-payout-recipient.md)
- [Get a list of customer profile payout recipients](https://docs.straitsx.com/reference/get-a-list-of-customer-profile-payout-recipients.md)
- [Delete a customer profile payout recipient](https://docs.straitsx.com/reference/delete-a-customer-profile-payout-recipient.md)
- [Create a third party payout](https://docs.straitsx.com/reference/create-a-third-party-payout.md): [Available in Production/Sandbox environment] Create a third party payout for a customer profile
- [Get a third party payout](https://docs.straitsx.com/reference/get-a-third-party-payout-customer-profile.md): [Available in Production/Sandbox environment] Retrieve a third party payout for a customer profile
- [Get a list of third party payouts](https://docs.straitsx.com/reference/get-a-list-of-third-party-payouts-customer-profile.md): [Available in Production/Sandbox environment] Retrieve a list of third party payouts for a customer profile
- [[Sandbox] Update status of mock third party payout](https://docs.straitsx.com/reference/sandbox-update-status-of-mock-paynow-payout.md): [Available in Sandbox environment only] Update status of created third party payout from `pending` to either `completed` or `failed`
- [Get recipient requirements](https://docs.straitsx.com/reference/get-recipient-requirements.md)
- [Create a payout recipient](https://docs.straitsx.com/reference/create-a-payout-recipient.md)
- [Update a payout recipient](https://docs.straitsx.com/reference/update-a-payout-recipient.md)
- [Get a payout recipient](https://docs.straitsx.com/reference/get-a-payout-recipient.md)
- [Get a list of payout recipients](https://docs.straitsx.com/reference/get-a-list-of-payout-recipients.md)
- [Delete a payout recipient](https://docs.straitsx.com/reference/delete-a-payout-recipient.md)
- [Create a regular payout](https://docs.straitsx.com/reference/create-a-regular-payout.md): [Available in Production/Sandbox environment] Create a regular payout
- [Get a regular payout](https://docs.straitsx.com/reference/get-a-regular-payout.md): [Available in Production/Sandbox environment] Retrieve a regular payout
- [Get a list of regular payouts](https://docs.straitsx.com/reference/get-a-list-of-regular-payouts.md): [Available in Production/Sandbox environment] Retrieve a list of regular payouts
- [[Sandbox] Update status of mock regular payout](https://docs.straitsx.com/reference/sandbox-update-status-of-mock-regular-payout.md): [Available in Sandbox environment only] Update status of created regular payout from `pending` to either `completed` or `failed`
- [Swap Transactions](https://docs.straitsx.com/reference/swap-transactions.md)
- [Get supported swap pairs](https://docs.straitsx.com/reference/get-supported-swap-pairs.md): [Available in Production/Sandbox environment] Get a list of supported swap pairs
- [Request a swap quote](https://docs.straitsx.com/reference/create-a-swap-quote.md): [Available in Production/Sandbox environment] Request a swap quote for the selected swap pair.
- [Get a swap quote](https://docs.straitsx.com/reference/get-a-swap-quote.md): [Available in Production/Sandbox environment] Retrieve a requested swap quote.
- [Execute a swap quote](https://docs.straitsx.com/reference/execute-a-swap-quote.md): [Available in Production/Sandbox environment] Execute a requested swap quote.
- [Get a swap transaction](https://docs.straitsx.com/reference/get-a-swap-transaction.md): [Available in Production/Sandbox environment] Get a swap transaction by its contract id.
- [Get a list of swap transactions](https://docs.straitsx.com/reference/get-a-list-of-swap-transactions.md): [Available in Production/Sandbox environment] Get a list of swap transactions created using Swap API.
- [[Sandbox] Update swap status](https://docs.straitsx.com/reference/sandbox-update-swap-status.md): [Available in Sandbox environment only] Update status of a swap transaction to completed.
- [Foreign Exchange (FX)](https://docs.straitsx.com/reference/foreign-exchange-fx.md)
- [Create a FX quote](https://docs.straitsx.com/reference/create-an-fx-quote.md): [Available in Production/Sandbox environment] Request a quote for an FX conversion.
- [Get a FX quote](https://docs.straitsx.com/reference/get-an-fx-quote.md): [Available in Production/Sandbox environment] Retrieve an existing FX quote by ID.
- [Get payout recipient requirements](https://docs.straitsx.com/reference/fx-get-recipient-requirements.md): Retrieve the required fields and validation rules for creating a payout recipient.
- [Create payout recipient](https://docs.straitsx.com/reference/fx-create-payout-recipient.md): Create a new payout recipient for FX payouts.
- [Get a payout recipient](https://docs.straitsx.com/reference/fx-get-a-payout-recipient.md)
- [Get a list of payout recipients](https://docs.straitsx.com/reference/fx-get-a-list-of-payout-recipients.md): Retrieve a paginated list of payout recipients with optional filters.<br>To list recipients for a customer profile, include `initiator` query parameters. If omitted, defaults to the authenticated user.
- [Update a payout recipient](https://docs.straitsx.com/reference/fx-update-a-payout-recipient.md): Update an existing payout recipient. Only provided fields are updated.
- [Delete a payout recipient](https://docs.straitsx.com/reference/fx-delete-a-payout-recipient.md)
- [Create a payout with FX](https://docs.straitsx.com/reference/execute-an-fx-quote.md): [Available in Production/Sandbox environment] Execute a previously created FX quote to initiate a FX payout.
- [Get a payout with FX](https://docs.straitsx.com/reference/get-an-fx-transaction.md): [Available in Production/Sandbox environment] Retrieve a single FX payout by its transaction ID.
- [Get a list of payouts with FX](https://docs.straitsx.com/reference/list-fx-transactions.md): [Available in Production/Sandbox environment] Retrieve a paginated list of FX payouts with optional filters.<br>To list payouts for a customer profile, include `initiator` query parameters. If omitted, defaults to the authenticated user.
- [[Sandbox] Update payout status](https://docs.straitsx.com/reference/sandbox-update-fx-transaction-status.md): [Available in Sandbox environment only] Manually transition a payout's status in the sandbox environment. Not available in production.
- [Blockchain Address](https://docs.straitsx.com/reference/blockchain-address.md)
- [Get a list of blockchain addresses](https://docs.straitsx.com/reference/get-a-list-of-blockchain-addresses.md): [Available in Production environment] Returns a list of added blockchain addresses under your StraitsX Business Account
- [[Sandbox] Create a Blockchain Address](https://docs.straitsx.com/reference/sandbox-create-a-blockchain-address.md): [Available in Sandbox environment only] Create a blockchain address for your Sandbox account
- [[Sandbox] Mock verification status of a blockchain address](https://docs.straitsx.com/reference/sandbox-mock-verification-status-of-a-blockchain-address.md): [Available in Sandbox environment only] Verify the blockchain address created in Sandbox
- [Blockchain Withdrawal](https://docs.straitsx.com/reference/blockchain-transfer-payouts.md)
- [Get a list of supported blockchains](https://docs.straitsx.com/reference/get-a-list-of-supported-blockchains.md): [Available in Production environment only] This API allows you to retrieve a list of supported tokens and blockchains.
- [Estimate network fee](https://docs.straitsx.com/reference/estimate-network-fee.md)
- [Create a blockchain withdrawal](https://docs.straitsx.com/reference/create-a-blockchain-transfer-payout.md): [Available in Production environment] Send funds to your verified blockchain addresses with your StraitsX Business Account
- [Get a blockchain withdrawal](https://docs.straitsx.com/reference/get-a-blockchain-withdrawal.md): [Available in Production/Sandbox environment] Get a blockchain withdrawal
- [Get a list of blockchain withdrawals](https://docs.straitsx.com/reference/get-a-list-of-blockchain-withdrawals.md): [Available in Production/Sandbox environment] Get a list of blockchain withdrawals.
- [[Sandbox] Mock status of a blockchain withdrawal](https://docs.straitsx.com/reference/sandbox-mock-status-of-a-blockchain-withdrawal.md): [Available in Sandbox environment only] Update the status of a blockchain withdrawal to "failed" or "completed"
- [Create a deposit address](https://docs.straitsx.com/reference/create-deposit-address.md): [Available in Production environment only] Create a new blockchain deposit address for receiving tokens.
- [Get a list of deposit addresses](https://docs.straitsx.com/reference/get-deposit-addresses.md): [Available in Production environment only] Retrieve a list of blockchain deposit addresses for the authenticated user.
- [Transaction Limits](https://docs.straitsx.com/reference/transaction-limits.md)
- [Get Transaction Limit](https://docs.straitsx.com/reference/get-transaction-limit.md): Get the transaction limit for a specific CP+ account.
- [Update Transaction Limit](https://docs.straitsx.com/reference/update-transaction-limit.md): Request to update transaction limit for a specific CP+ profile.
- [Get Update Transaction Limit Request](https://docs.straitsx.com/reference/get-update-transaction-limit-request.md): Get details on an update transaction limit request.
- [Get a List of Update Transaction Limit Requests](https://docs.straitsx.com/reference/get-a-list-of-update-transaction-limit-requests.md): Get a list of update transaction limit requests.
- [[Sandbox] Mock Transaction Limit Update Request Status](https://docs.straitsx.com/reference/sandbox-mock-transaction-limit-update-request-status.md): [Available in Sandbox environment only] Update the status of Update Transaction Limit Request from `pending`.
- [Create a bank account](https://docs.straitsx.com/reference/create-a-bank-account.md): [Available in Production/Sandbox environment] Add a new bank account to the user's StraitsX account. Supports both Singapore and overseas bank accounts.
- [Get a bank account](https://docs.straitsx.com/reference/get-a-bank-account.md): [Available in Production/Sandbox environment] Get details of a specific bank account by ID
- [Get a list of bank accounts](https://docs.straitsx.com/reference/get-a-list-of-bank-accounts.md): [Available in Production/Sandbox environment] Get a list of bank accounts added on the user's StraitsX account
- [Update a bank account](https://docs.straitsx.com/reference/update-a-bank-account.md): [Available in Production environment] Update details of a specific bank account. Supports both Singapore and overseas bank accounts.
- [[Sandbox] Update bank account verification status](https://docs.straitsx.com/reference/update-bank-account-status-sandbox.md): [Available in Sandbox environment only] Simulates bank account verification for a given bank account
- [Delete a bank account](https://docs.straitsx.com/reference/delete-a-bank-account.md): [Available in Production environment] Delete a specific bank account by ID
- [Create a user withdrawal](https://docs.straitsx.com/reference/create-a-user-withdrawal.md): [Available in Production/Sandbox environment] Create a withdrawal from the user's StraitsX account
- [Get a user withdrawal](https://docs.straitsx.com/reference/get-a-user-withdrawal.md): [Available in Production/Sandbox environment] Get a withdrawal from the user's StraitsX account
- [[Sandbox] Mock a user withdrawal status](https://docs.straitsx.com/reference/simulate-withdrawal-status.md): [Available in Sandbox environment only] Mock the status of a user withdrawal
- [Account Balance](https://docs.straitsx.com/reference/get-account-balance-1.md)
- [[Sandbox] Top up account balance](https://docs.straitsx.com/reference/topup-merchant-account-sandbox.md): [Available in Sandbox environment only] Add funds to your sandbox account for testing purposes.
- [Get account balance v2](https://docs.straitsx.com/reference/get-account-balance-v2.md): [Available in Sandbox/Production environment] Retrieve your StraitsX business account's balance
- [Account Statement](https://docs.straitsx.com/reference/account-statement.md)
- [Get account statement](https://docs.straitsx.com/reference/get-account-statement.md): [Available in Sandbox/Production environment] Retrieve your StraitsX account statement
- [Webhooks](https://docs.straitsx.com/reference/webhooks.md)
- [Get webhooks](https://docs.straitsx.com/reference/get-webhooks.md): [Available in Sandbox/Production environment] Get the webhooks configured for different events
- [Update webhooks](https://docs.straitsx.com/reference/update-webhooks.md): [Available in Sandbox/Production environment] Get the webhooks configured for different events
- [Resend callback for a single contract](https://docs.straitsx.com/reference/resend-callback-for-a-single-contract.md): [Available in Production environment] Resend callback for a single contract.
- [Resend callback for a list of contracts](https://docs.straitsx.com/reference/resend-callback-for-a-list-of-contracts.md): [Available in Production environment] Resend callback for a list of contracts.
- [Resend callback by event type](https://docs.straitsx.com/reference/resend-webhook-by-event-type.md): [Available in Production environment] Resend callback for a specific event type and triggerable resource.
- [Supported Banks](https://docs.straitsx.com/reference/supported-banks.md)
- [Get a list of supported banks](https://docs.straitsx.com/reference/get-a-list-of-supported-banks.md): [Available in Production/Sandbox environment] Returns a list of supported banks with their bank code.
- [Cards Sub-Wallet](https://docs.straitsx.com/reference/sub-walletscards-settlementtransfers.md)
- [Add Funds to Cards Sub-Wallet](https://docs.straitsx.com/reference/sub-wallets-cards-settlement-transfers.md): [Available in Production/Sandbox environment] Transfer funds from the merchant's main wallet to their Cards sub-wallet. Supports same-currency transfers and fiat-to-stablecoin 1:1 conversions.

## Changelog
- [v1.5.0 - Cross-Border FX Payouts and API Enhancements](https://docs.straitsx.com/changelog/v150-cross-border-fx-payouts-and-api-enhancements.md)
- [v1.4.0 - HTTP Request Signing and Webhook Key Management](https://docs.straitsx.com/changelog/v140-http-request-signing-and-webhook-key-management.md)
- [v1.3.0 - Multi-Currency and High-Value SGD Rail Enhancements](https://docs.straitsx.com/changelog/payments-v130-multi-currency-and-high-value-sgd-rail-enhancements.md)
- [v1.2.1 - New Payment Attributes and Documentation Improvements](https://docs.straitsx.com/changelog/v121-new-payment-attributes-and-documentation-improvements.md)
- [v1.2.0 – Mandatory Changes by 30th Jan 2026](https://docs.straitsx.com/changelog/mandatory-changes-30-jan-2026.md)
- [New User Withdrawal API](https://docs.straitsx.com/changelog/new-user-withdrawal-api.md)
- [Charge Option for USD First Party Withdrawals](https://docs.straitsx.com/changelog/charge-option-for-usd-first-party-withdrawals.md)
- [Create Customer Profile Bank Account Update](https://docs.straitsx.com/changelog/create-customer-profile-bank-account-update.md)
- [Get Payout Recipient Requirements](https://docs.straitsx.com/changelog/get-payout-recipient-requirements.md)
- [Get and Update Webhooks](https://docs.straitsx.com/changelog/get-and-update-webhooks.md)
