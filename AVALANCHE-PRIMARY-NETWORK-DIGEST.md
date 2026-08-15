# AVALANCHE PRIMARY NETWORK DIGEST — full section capture

> Complete digest of docs.avax.network (Builder Hub) → Primary Network section, compiled 2026-08-15 for AgentPay. Three parallel readers covered all 15 locatable pages (consensus, token, VMs, Helicon, C-Chain internals, exchange integration, P-Chain, staking) plus the AvalancheGo and Firewood GitHub READMEs. Every load-bearing fact carries its source URL.

Method: every Builder Hub page is fetchable as raw markdown by appending `.md`. All 15 confirmed pages fetched HTTP 200. The sidebar's "Contract Verification" tab was NOT locatable at any stable URL (legacy `/docs/dapps/verify-contract` 308-redirects to the section index) — recorded, not silently skipped. Two pages (`continuous-execution`, `firewood`) were interactive stubs; their linked deep-dive pages were fetched instead and documented in Section B.

## Executive summary — the facts AgentPay's build and pitch depend on

**Finality (the pitch claim)**
- Exchange-integration guidance, verbatim: "Avalanche consensus provides fast and irreversible finality with ~1 second… query… with the `latest` parameter" — on C-Chain today, `latest` IS finalized; **no confirmation-count logic is needed**. [Section B]
- The consensus page says "sub-second, immutable finality" as a headline, "~1 second acceptance latency" / "a few seconds" in the technical text. **No canonical "2s" figure on-page** — the "~2s Circle-verified" pitch line should cite Circle's material; these pages give qualitative backing. [Section A]
- Consensus parameters on Avalanche: Snowball k=20, α=14, β=20. [Section A]
- Future-proofing: if ACP-194 (continuous execution, status "Implementable") activates, `latest` becomes most-recently-executed and `safe`/`finalized` (τ=5s) become the settlement tags — AgentPay's receipt code should be ready to switch. [Section B]

**Chain facts**
- C-Chain mainnet: chain ID **43114** (0xA86A), RPC `https://api.avax.network/ext/bc/C/rpc`; Fuji: **43113** (0xA869), RPC `https://api.avax-test.network/ext/bc/C/rpc`; WS at `/ext/bc/C/ws`. Explorers subnets.avax.network / subnets-test.avax.network. [Sections A, B]
- Go SDK gotcha: standard go-ethereum mis-computes `block.Hash()` on Avalanche blocks (extra `ExtDataHash` field) — use AvalancheGo's own `ethclient` or raw JSON-RPC/web3.js. [Section B]
- AVAX: 720M supply cap (360M genesis), **all transaction fees burned**, validator rewards are the only inflation; 1 nAVAX = 10⁻⁹ AVAX. [Section A]

**Upgrade status (operationally load-bearing)**
- **Helicon upgrade: active on Fuji since 2026-07-28, NOT scheduled on mainnet** — mainnet keeps pre-Helicon gas pricing and staking rules; Fuji behavior may differ from mainnet during the hackathon. Helicon deltas: uptime requirement 80%→90%, min consumption rate 0.10→0.075, min stake duration →48h. [Sections A, C]
- Firewood (new database backend) is beta; ACP-194 reference implementation "under active development" — neither live on mainnet; no numeric throughput benchmarks appear in the docs. [Section B]

**Network security model (pitch depth)**
- Validator minimum 2,000 AVAX (max 3M), delegator minimum 25 AVAX, 2-week–1-year staking, >80% uptime for rewards (90% post-Helicon), minimum delegation fee 2%. [Section C]
- **No slashing:** "Your staked principal is never at risk" — clean institutional talking point. [Section C]
- Rewards formula quoted verbatim in Section C (consumption-rate 0.10–0.12, 1-year minting period).

**GitHub repos catalogued**
- `ava-labs/avalanchego` (node; C-Chain EVM lives in `graft/coreth`, P-Chain in `vms/platformvm`), `ava-labs/firewood` (beta DB), plus ACP/spec repos — full list with purposes inside the sections.

## Contents

- **Section A — Consensus / AVAX token / VMs / Helicon:** Snowman details, tokenomics, chain tables
- **Section B — C-Chain internals & exchange integration:** Coreth architecture, ACP-194, Firewood, the exchange ops guide (finality, address handling, SDK gotchas), GitHub READMEs
- **Section C — P-Chain & staking:** PlatformVM, stake minimums, rewards formula, no-slashing, Helicon deltas

---
# Avalanche Primary Network Digest — Consensus / Token / VM / Upgrade
Compiled for AgentPay (StraitsX hackathon — AI-agent payments settling XSGD on Avalanche C-Chain mainnet).
All facts below are attributed to their source URL. Numbers/parameter names/URLs are quoted verbatim from the fetched markdown.

Fetch status: ALL 5 URLs fetched successfully (HTTP 200).
1. https://build.avax.network/docs/primary-network.md — FETCHED
2. https://build.avax.network/docs/primary-network/avalanche-consensus.md — FETCHED
3. https://build.avax.network/docs/primary-network/avax-token.md — FETCHED
4. https://build.avax.network/docs/primary-network/virtual-machines.md — FETCHED
5. https://build.avax.network/docs/primary-network/helicon-upgrade.md — FETCHED

---

## 1. Primary Network Index
Source: https://build.avax.network/docs/primary-network.md

- "Avalanche is a heterogeneous network of blockchains. As opposed to homogeneous networks, where all applications reside in the same chain, heterogeneous networks allow separate chains to be created for different applications."
- "The Primary Network is a special [Avalanche L1](/docs/avalanche-l1s) that runs three blockchains": C-Chain, P-Chain, X-Chain.
- "Avalanche Mainnet is comprised of the Primary Network and all deployed Avalanche L1s."
- "A node can become a validator for the Primary Network by staking at least **2,000 AVAX**."

### C-Chain (Contract Chain)
- "The **C-Chain** is an implementation of the Ethereum Virtual Machine (EVM). The C-Chain's API supports Geth's API and supports the deployment and execution of smart contracts written in Solidity."
- "The C-Chain is an instance of the [Coreth](https://github.com/ava-labs/avalanchego/tree/master/graft/coreth) Virtual Machine."

| Property | Mainnet | Fuji Testnet |
|---|---|---|
| Network Name | Avalanche C-Chain | Avalanche Fuji C-Chain |
| Chain ID | **43114 (0xA86A)** | **43113 (0xA869)** |
| Currency | AVAX | AVAX |
| RPC URL | `https://api.avax.network/ext/bc/C/rpc` | `https://api.avax-test.network/ext/bc/C/rpc` |
| Explorer | `https://subnets.avax.network/c-chain` | `https://subnets-test.avax.network/c-chain` |
| Faucet | — | `/console/primary-network/faucet` (Get Test AVAX) |

^ This is the chain AgentPay settles XSGD on (mainnet chain ID 43114).

### P-Chain (Platform Chain)
- "The **P-Chain** is responsible for all validator and Avalanche L1-level operations." Supports creation of new blockchains/Avalanche L1s, adding validators, staking operations, platform-level ops.
- "The P-Chain is an instance of the [Platform Virtual Machine](https://github.com/ava-labs/avalanchego/tree/master/vms/platformvm)."
- RPC URL Mainnet: `https://api.avax.network/ext/bc/P`; Fuji: `https://api.avax-test.network/ext/bc/P`
- Explorer Mainnet: `https://subnets.avax.network/p-chain`; Fuji: `https://subnets-test.avax.network/p-chain`

### X-Chain (Exchange Chain)
- "The **X-Chain** is responsible for operations on digital smart assets known as **Avalanche Native Tokens**." A smart asset represents a real-world resource (e.g., equity, bond) with governing rules.
- "One asset traded on the X-Chain is AVAX. When you issue a transaction to a blockchain on Avalanche, you pay a fee denominated in AVAX."
- "The X-Chain is an instance of the Avalanche Virtual Machine (AVM)."
- RPC URL Mainnet: `https://api.avax.network/ext/bc/X`; Fuji: `https://api.avax-test.network/ext/bc/X`
- Explorer Mainnet: `https://subnets.avax.network/x-chain`; Fuji: `https://subnets-test.avax.network/x-chain`

---

## 2. Snowman Consensus (Avalanche Consensus)
Source: https://build.avax.network/docs/primary-network/avalanche-consensus.md

### What it is
- "Snowman Consensus is a consensus protocol that is scalable, robust, and decentralized. It combines features of both classical and Nakamoto consensus mechanisms to achieve high throughput, fast finality, and energy efficiency." Whitepaper link: https://www.avalabs.org/whitepapers (also linked directly: https://assets-global.website-files.com/5d80307810123f5ffbb34d6e/6009805681b416f34dcae012_Avalanche%20Consensus%20Whitepaper.pdf)

### Key Features (verbatim)
- **Speed**: "Snowman Consensus provides sub-second, immutable finality, ensuring that transactions are quickly confirmed and irreversible."
- **Scalability**: "enables high network throughput while ensuring low latency."
- **Energy Efficiency**: "participation in Snowman Consensus is neither computationally intensive nor expensive."
- **Adaptive Security**: resists sybil, DDoS, and collusion attacks; "probabilistic nature ensures that the consensus outcome converges to the desired state, even when the network is under attack."

### FINALITY — exact claims (load-bearing for AgentPay pitch)
- "In Nakamoto consensus protocol (as used in Bitcoin and Ethereum, for example), a block may be included in the chain but then be removed and not end up in the canonical chain. This means waiting an hour for transaction settlement. In Avalanche, acceptance/rejection are **final and irreversible** and only take a few seconds."
- "Avalanche is very performant. It can process thousands of transactions per second with **~1 second acceptance latency**."
- Summary line under Key Features: "**sub-second, immutable finality**."
- "Snowman Consensus is probabilistically safe up to a safety threshold. That is, the probability that a correct node accepts a transaction that another correct node rejects can be made arbitrarily low by adjusting system parameters."
- NOTE: the doc's own numbers are slightly inconsistent between sections — "sub-second... finality" (Key Features) vs. "only take a few seconds" (Finality section) vs. "~1 second acceptance latency" (Why Do We Care). No single-page number is given as one canonical "2 seconds" figure; the AgentPay "~2s, Circle-verified" claim is NOT directly stated verbatim on this page — it should be sourced/cross-checked against Circle's own material, using this page only for the qualitative "sub-second/few-seconds, final and irreversible" backing, not as the origin of the literal "2s" number.
- This page does not distinguish C-Chain vs. L1 finality — no explicit "C-Chain vs L1s" comparison of finality time appears anywhere in this document. It describes Snowman/Snowball generically as the Primary Network consensus (used by C-Chain, P-Chain, X-Chain, and by extension L1s built on the same stack), but does not give separate finality numbers per chain type.

### Snowball parameters (mechanism underlying Snowman)
- Conceptual: "repeated sub-sampled voting" — a node asks a small, random subset of validator nodes for their preference; if a sufficient majority reply the same, that becomes preferred; repeats until consecutive rounds agree.
- α (alpha) = "quorum size" — number of validators required for "sufficient majority", configurable.
- β (beta) = "Confidence Threshold" / "decision threshold" — number of consecutive rounds required, configurable.
- Snowball algorithm parameters: *n* = number of participants; *k* = sample size (1 ≤ k ≤ n); α = quorum size (1 ≤ α ≤ k); β = decision threshold (β ≥ 1).
- **Actual Avalanche Network constants (verbatim):** "The sample size, _k_, is `20`. So when a node asks a group of nodes their opinion, it only queries `20` nodes out of the whole network. The quorum size, α, is `14`. So if `14` or more nodes give the same response, that response is adopted as the querying node's preference. The decision threshold, β, is `20`. A node decides on choice after receiving `20` consecutive quorum (α majority) responses."
  - So: **k=20, α=14, β=20** (these are the exact operative Snowball parameters on Avalanche mainnet per this doc).
- "Snowball is very scalable as the number of nodes on the network, n, increases... the number of consensus messages sent remains the same because... a node only queries 20 nodes, even if there are thousands of nodes in the network."
- Blocks: "If a node receives a vote for a block, it also counts as a vote for all of the block's ancestors" — transitive voting.
- Validators: Proof-of-Stake weighting — "The more AVAX a node bonds, the more often that node is queried by other nodes." Sampling is weighted by stake amount, not uniform.
- **No slashing**: "Avalanche doesn't have slashing. If a node doesn't behave well while validating... its stake is still returned in whole, but with no reward."
- Big ideas: **subsampling** (constant message overhead regardless of validator count) and **transitive voting** (a vote for a block = vote for all ancestors, boosting throughput).
- Other notes: Avalanche has no leader — "Any node can propose a transaction and any node that has staked AVAX can vote on every transaction." Protocol quiesces (does nothing) when there's no undecided work — contrasted with PoW's constant work requirement.
- Transaction validity is pre-filtered: "Consensus will never include a transaction that is determined to be invalid" (e.g., insufficient balance).
- Implementation name: "Snowman is the name of Ava Labs' implementation of the Snowman Consensus protocol for linear chains."
- "Ethereum consensus protocol has been replaced with Snowman Consensus [on the C-Chain instance] to enable lower block latency and higher throughput" — direct confirmation Snowman/Snowball is what secures the C-Chain (relevant to the AgentPay pitch, since XSGD settlement happens there).

### GitHub / external links on this page
- AvalancheGo (full node): https://github.com/ava-labs/avalanchego — "Transactions are created by users which call an API on an AvalancheGo full node."
- AvalancheJS (library): https://github.com/ava-labs/avalanchejs — alternative to AvalancheGo API for creating transactions.
- Whitepaper (non-GitHub): https://www.avalabs.org/whitepapers and PDF https://assets-global.website-files.com/5d80307810123f5ffbb34d6e/6009805681b416f34dcae012_Avalanche%20Consensus%20Whitepaper.pdf
- Visualization demo (non-GitHub): https://tedyin.com/archive/snow-bft-demo/#/snow

---

## 3. AVAX Token Economics
Source: https://build.avax.network/docs/primary-network/avax-token.md

### What AVAX is
- "AVAX is the native utility token of Avalanche. It's a hard-capped, scarce asset that is used to pay for fees, secure the platform through staking, and provide a basic unit of account between the multiple Avalanche L1s created on Avalanche."
- "AVAX represents the weight that each node has in network decisions... each validator in the network is given a proportional weight in the network's decisions corresponding to the proportion of total stake that they own through proof of stake (PoS)."

### Denomination
- "`1 nAVAX` is equal to `0.000000001 AVAX`." (i.e., nAVAX is AVAX's "gwei"-equivalent, 1e-9 AVAX; the doc does not use the word "gwei" itself — only "nAVAX" is named). Unit converter tool referenced: `/console/primary-network/unit-converter`.

### Supply cap
- "AVAX is a capped-supply (up to **720M**) resource in the Avalanche ecosystem that's used to power the network."
- "A fixed amount of **360M AVAX was minted at genesis**, but a small amount of AVAX is constantly minted as a reward to validators."
- "Due to the capped-supply, the above function guarantees that AVAX will never exceed a total of $720M$ tokens, or $\lim_{j \to \infty} R(j) = 720M$."

### Fee burning / gas mechanics
- "Any entity trying to execute a transaction on Avalanche Primary Network pays a corresponding fee (commonly known as 'gas') to run it on the network. **The fees used to execute a transaction on Avalanche is burned, or permanently removed from circulating supply.**"
- Directly relevant to AgentPay: every C-Chain transaction (i.e., every XSGD settlement AgentPay initiates) burns its gas fee in AVAX, permanently reducing supply — this is deflationary pressure offsetting validator-reward inflation.

### Inflation / minting formula
- "The protocol rewards validators for good behavior by minting them AVAX rewards at the end of their staking period. The minting process offsets the AVAX burned by transactions fees. While AVAX is still far away from its supply cap, it will almost always remain an inflationary asset."
- "Avalanche does not take away any portion of a validator's already staked tokens (commonly known as 'slashing') for negligent/malicious staking periods" — consistent with consensus page's no-slashing statement.
- Minting formula (LaTeX, verbatim structure preserved):
  - $R_j = R_l + \sum_{\forall u} \rho(u.s_{amount}, u.s_{time}) \times \frac{c_j}{L} \times \left( \sum_{i=0}^{j}\frac{1}{\left(\gamma + \frac{1}{1 + i^\lambda}\right)^i} \right)$
  - where $L = \left(\sum_{i=0}^{\infty} \frac{1}{\left(\gamma + \frac{1}{1 + i^\lambda} \right)^i} \right)$
  - $R_j$ = total tokens at year $j$; $R_1 = 360M$; $R_l$ = total at last year params $\gamma,\lambda$ changed; $c_j$ = yet-unminted supply to reach 720M at year $j$ (≤360M); $u$ = a staker, $u.s_{amount}$ = stake amount, $u.s_{time}$ = staking duration.
  - At genesis, $c_1 = 360M$. $\gamma$ and $\lambda$ are governable parameters.
  - $\rho(u.s_{amount}, u.s_{time}) = (0.002 \times u.s_{time} + 0.896) \times \frac{u.s_{amount}}{R_j}$ — $u.s_{time}$ in weeks, $u.s_{amount}$ in AVAX.
- "If the entire supply of tokens at year j is staked for the maximum amount of staking time (one year, or 52 weeks), then $\sum \rho = 1$. If, instead, every token is staked continuously for the minimal stake duration of two weeks, then $\sum \rho = 0.9$. Therefore, staking for the maximum amount of time incurs an additional **11.11%** of tokens minted, incentivizing stakers to stake for longer periods."
  - Note: page states min staking duration of "two weeks" here — this is the pre-Helicon figure; see Helicon digest below where ACP-273 drops Primary Network validator minimum staking duration to 48 hours (Mainnet) / 12 hours (Fuji). This token page appears not yet updated to reflect ACP-273/Helicon.

### GitHub / external links on this page
- None found (no GitHub links on avax-token.md).

---

## 4. Virtual Machines
Source: https://build.avax.network/docs/primary-network/virtual-machines.md

### Definition
- "A **Virtual Machine** (VM) is the blueprint for a blockchain, meaning it defines a blockchain's complete application logic by specifying the blockchain's state, state transitions, transaction rules, and API interface."
- "Developers can use the same VM to create multiple blockchains, each of which follows identical rules but is independent of all others."

### The three mandatory Primary Network VMs (verbatim)
- "All Avalanche validators of the **Avalanche Primary Network** are required to run three VMs:"
  - **Coreth**: "Defines the Contract Chain (C-Chain); supports smart contract functionality and is EVM-compatible." → GitHub: https://github.com/ava-labs/avalanchego/tree/master/graft/coreth
  - **Platform VM**: "Defines the Platform Chain (P-Chain); supports operations on staking and Avalanche L1s."
  - **Avalanche VM (AVM)**: "Defines the Exchange Chain (X-Chain); supports operations on Avalanche Native Tokens."
- "All three can easily be run on any computer with [AvalancheGo](/docs/nodes)."
- Confirms mapping directly relevant to AgentPay: C-Chain (where XSGD/AVAX settlement happens) runs on **Coreth**, the EVM-compatible VM.

### Custom VMs
- Avalanche lets developers avoid building networking/consensus/infra from scratch by providing VMs as blueprints; supports any language via RPC (language-agnostic request-response protocol).
- "Validators can install additional VMs on their node to validate additional Avalanche L1s... In exchange, validators receive staking rewards in the form of a reward token determined by the Avalanche L1s."
- Two paths to build a custom VM: (1) ready-to-deploy Subnet-EVM for Solidity-based dev, or (2) custom VM in Golang/Rust/other.

### GitHub / external links on this page
- Coreth: https://github.com/ava-labs/avalanchego/tree/master/graft/coreth — "An implementation of EVM that powers the Avalanche C-Chain and supports Solidity smart contracts"
- TimestampVM (Golang): https://github.com/ava-labs/timestampvm — "A decentralized timestamp blockchain written in Golang (recommended for beginners)"
- Subnet-EVM: https://github.com/ava-labs/subnet-evm — "An implementation of EVM that can be deployed to a custom Avalanche L1"
- XSVM: https://github.com/ava-labs/xsvm — "An example of Interchain Messaging that implements Cross-Avalanche L1 asset transfers"
- TimestampVM RS (Rust): https://github.com/ava-labs/timestampvm-rs — "A Rust implementation of TimestampVM"

---

## 5. Helicon Upgrade
Source: https://build.avax.network/docs/primary-network/helicon-upgrade.md

### What it is
- "Helicon is a Primary Network upgrade that activates **six** Avalanche Community Proposals. It changes how the C-Chain executes blocks and prices gas, and it changes several Primary Network staking rules, including how long a validator can stake for, how much uptime it needs, and whether it has to re-stake at all."

### Activation Status (verbatim table)
| Network | Activation | Status |
|---|---|---|
| **Fuji** | July 28, 2026 at 15:00 UTC | **Active** |
| **Mainnet** | Not yet scheduled | **Pending** |
| Local and custom networks | Active from genesis | Active by default |

- IMPORTANT for AgentPay (mainnet C-Chain deployment): **Helicon is NOT yet active on Mainnet as of this doc** — "Not yet scheduled." Fuji testnet activated July 28, 2026 15:00 UTC.
- Warning: "Helicon activation on Fuji shipped in [AvalancheGo v1.15.0-fuji](https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0-fuji). That release is Fuji-only and refuses to start against a Mainnet configuration. It also does not support C-Chain state sync once Helicon is active; a release that does is expected before Mainnet activation is scheduled."

### The six ACPs (verbatim table)
| ACP | Change | Chain |
|---|---|---|
| ACP-194 (Continuous Execution) | "consensus and execution are decoupled through a queue, and state roots are recorded after a delay" | C-Chain |
| ACP-236 (Auto-renewed staking) | validators can renew automatically at cycle end instead of expiring | P-Chain |
| ACP-267 (Uptime requirement increase) | "Validator uptime requirement rises from 80% to 90%" | P-Chain |
| ACP-273 (Reduce minimum staking duration) | "Minimum validator staking duration drops to 48 hours on Mainnet and 12 hours on Fuji" | P-Chain |
| ACP-283 (Dynamic minimum gas price) | "The C-Chain minimum gas price becomes dynamic, set by stake-weighted validator preference" | C-Chain |
| ACP-285 (Reduce minimum consumption rate) | "`MinConsumptionRate` drops from 10% to 7.5%, ramped over 90 days" | P-Chain |

- Relevant to AgentPay gas-cost predictability: ACP-283 makes C-Chain minimum gas price dynamic/stake-weighted (currently fixed); ACP-194 decouples consensus from execution via a queue with delayed state-root recording — could affect assumptions about "instant" post-consensus state availability for downstream integrations, though finality/consensus itself (Snowman) is unchanged by this doc's description.

### Staking-change details (verbatim highlights)
- **ACP-236 Auto-Renewed Staking**: new txs `AddAutoRenewedValidatorTx`, `SetAutoRenewedValidatorConfigTx`, `RewardAutoRenewedValidatorTx` (last one issued by block builders). "Renewal is conditional on reward eligibility, so a cycle that misses the uptime requirement ends the validation rather than renewing it." Delegation cannot auto-renew.
- **ACP-267 Uptime**: "The 90% figure is applied when the network decides reward eligibility for any Primary Network validation whose **start time** is at or after Helicon activation" — grandfathers existing validations at 80%. "Every cycle of an auto-renewed validator starts after activation, so auto-renewed validators are always held to 90%." Avalanche L1 validators unaffected (use their own subnet's uptime rule). Reward model still "all or nothing... no slashing."
- **ACP-273 Minimum Staking Duration**: Primary Network validator minimum drops "from two weeks to 48 hours on Mainnet, and from 24 hours to 12 hours on Fuji." Custom networks default to one hour. Delegators unaffected. Max staking duration unchanged at one year.
- **ACP-285 MinConsumptionRate**: drops from 10% to 7.5%, "ramps linearly over the 90 days following activation, and the rate applied to a staking period is the one in effect at that period's **start time**. A stake starting 45 days after activation therefore uses roughly 8.75%." `MaxConsumptionRate` unchanged.

### What You Need to Do (verbatim action items)
- Fuji validators: upgrade to Helicon-capable release; check uptime clears 90% via `info.uptime` RPC (`/docs/rpcs/other/info-rpc#infouptime`) and cross-check against https://stats.avax.network/dashboard/validator-health-check/.
- Mainnet validators: "Nothing is required yet."
- C-Chain developers: "ACP-194 changes when state is available relative to block acceptance, and several C-Chain RPC namespaces are deprecated alongside it." Read `/docs/primary-network/streaming-async-execution` and the v1.15.0-fuji release notes before assuming existing behavior holds.
- Exchanges/custodians: staking minimums and uptime threshold move; "If you quote a two-week minimum staking period to users, that number becomes 48 hours on Mainnet at activation."

### GitHub / external links on this page
- AvalancheGo v1.15.0-fuji release: https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0-fuji (referenced twice — as the Helicon-capable Fuji release, and again as release notes to read)
- Internal doc links (non-GitHub, not fetched in this pass): `/docs/acps/194-continuous-execution`, `/docs/acps/236-auto-renewed-staking`, `/docs/acps/267-uptime-requirement-increase`, `/docs/acps/273-reduce-minimum-staking-duration`, `/docs/acps/283-dynamic-minimum-gas-price`, `/docs/acps/285-reduce-minimum-consumption-rate`, `/docs/primary-network/validate/staking-for-finance-professionals`, `/docs/primary-network/validate/rewards-formula`, `/docs/rpcs/other/info-rpc#infouptime`, `/docs/primary-network/streaming-async-execution`
- Dashboard (non-GitHub): https://stats.avax.network/dashboard/validator-health-check/

---

## Consolidated GitHub Repo List (org/name — what it is — source page)
1. **ava-labs/avalanchego** (path: `graft/coreth`) — Coreth VM, powers C-Chain, EVM-compatible, Solidity support — cited on page 1 (Primary Network index) and page 4 (Virtual Machines). URL: https://github.com/ava-labs/avalanchego/tree/master/graft/coreth
2. **ava-labs/avalanchego** (path: `vms/platformvm`) — Platform VM, defines P-Chain — cited on page 1. URL: https://github.com/ava-labs/avalanchego/tree/master/vms/platformvm
3. **ava-labs/avalanchego** (root) — full node software; run to create transactions via API; also runs all 3 mandatory Primary Network VMs — cited on page 2 (Consensus) and page 4 (Virtual Machines, via `/docs/nodes`). URL: https://github.com/ava-labs/avalanchego
4. **ava-labs/avalanchego** (release tag `v1.15.0-fuji`) — the Helicon-capable Fuji-only AvalancheGo release — cited on page 5 (Helicon). URL: https://github.com/ava-labs/avalanchego/releases/tag/v1.15.0-fuji
5. **ava-labs/avalanchejs** — JS library for creating Avalanche transactions — cited on page 2 (Consensus). URL: https://github.com/ava-labs/avalanchejs
6. **ava-labs/timestampvm** — decentralized timestamp blockchain in Golang, "recommended for beginners" custom-VM example — cited on page 4. URL: https://github.com/ava-labs/timestampvm
7. **ava-labs/subnet-evm** — deployable EVM implementation for custom Avalanche L1s — cited on page 4. URL: https://github.com/ava-labs/subnet-evm
8. **ava-labs/xsvm** — example VM implementing Interchain Messaging / cross-Avalanche-L1 asset transfers — cited on page 4. URL: https://github.com/ava-labs/xsvm
9. **ava-labs/timestampvm-rs** — Rust implementation of TimestampVM — cited on page 4. URL: https://github.com/ava-labs/timestampvm-rs

(avax-token.md page 3 contained no GitHub links.)

---

## Answers to specific extraction asks

**Finality — C-Chain vs. L1s**: The consensus page does NOT differentiate finality time between C-Chain and Avalanche L1s. It describes Snowman/Snowball as the general-purpose consensus engine used across the Primary Network (C/P/X-Chain); the "Why Do We Care?" section notes the C-Chain specifically replaced Ethereum's consensus with Snowman "to enable lower block latency and higher throughput," implying L1s built on the same VM/consensus stack inherit the same consensus properties, but no distinct numeric comparison is given in this document.

**Chain IDs / RPC (from index page)**:
- C-Chain Mainnet: chain ID 43114 (0xA86A), RPC `https://api.avax.network/ext/bc/C/rpc`
- C-Chain Fuji: chain ID 43113 (0xA869), RPC `https://api.avax-test.network/ext/bc/C/rpc`
- P-Chain Mainnet RPC: `https://api.avax.network/ext/bc/P`; Fuji: `https://api.avax-test.network/ext/bc/P`
- X-Chain Mainnet RPC: `https://api.avax.network/ext/bc/X`; Fuji: `https://api.avax-test.network/ext/bc/X`

**AVAX denominations**: only nAVAX is defined on these pages: 1 nAVAX = 0.000000001 AVAX (i.e., 1e-9 AVAX). No mention of "gwei" terminology in the AVAX token page itself (gwei is an Ethereum term the user analogized; not used in the source).

**Helicon activation status**: Fuji = Active since July 28, 2026 15:00 UTC; Mainnet = Pending, not yet scheduled; local/custom networks = active from genesis by default.
# Section B — C-Chain Internals & Exchange Integration (Avalanche Primary Network Docs)

Digest date: 2026-08-15. Built for AgentPay (StraitsX hackathon — AI-agent payments layer settling XSGD on Avalanche C-Chain mainnet).

## 0. Fetch status

| # | URL | Status | Note |
|---|---|---|---|
| 1 | `https://build.avax.network/docs/primary-network/coreth-architecture.md` | FETCHED (200) | Full prose content, 49 lines. |
| 2 | `https://build.avax.network/docs/primary-network/continuous-execution.md` | FETCHED (200) but **stub content** | Body is only `# Continuous Execution (/docs/primary-network/continuous-execution)` + `<TransactionLifecycle />` — an interactive visual component, no prose. See §0.1. |
| 3 | `https://build.avax.network/docs/primary-network/firewood.md` | FETCHED (200) but **stub content** | Body is only `# Firewood (/docs/primary-network/firewood)` + `<FirewoodPage />` — same pattern. See §0.1. |
| 4 | `https://build.avax.network/docs/primary-network/exchange-integration.md` | FETCHED (200) | Full prose content, 160 lines. |
| 5 | Contract Verification | **NOT LOCATABLE** | All 3 probe slugs returned 404: `/docs/primary-network/verify-contract.md`, `/docs/primary-network/contract-verification/overview.md`, `/docs/tooling/verify-contract.md`. Per task instructions, no further probing done. **Contract Verification page not locatable at a stable URL as of 2026-08-15.** |

### 0.1 Why #2 and #3 needed supplementary fetches

`/docs/primary-network/continuous-execution` and `/docs/primary-network/firewood` are client-rendered "visual landing pages" (React/MDX components `<TransactionLifecycle />` and `<FirewoodPage />`) — their `.md` export contains no substantive prose, only a one-line meta description and a link out to the real technical write-up. This was confirmed by inspecting the full HTML payload (Next.js RSC data), which revealed each landing page links to a deeper technical article under `/docs/nodes/architecture/execution/`. To honor the task's intent ("extract what changes, activation status, throughput numbers" / "what it is, status, performance claims"), I additionally fetched these **linked, in-scope pages** (all still `build.avax.network`, still Avalanche primary docs, one hop from the requested URLs):

- `https://build.avax.network/docs/nodes/architecture/execution/continuous-execution.md` (linked from the continuous-execution landing page) — FETCHED 200, 262 lines.
- `https://build.avax.network/docs/nodes/architecture/execution/firewood.md` (linked from the firewood landing page) — FETCHED 200, 364 lines.
- `https://build.avax.network/docs/acps/194-continuous-execution.md` (the "ACP-194 Spec" link on the continuous-execution landing page — the actual ACP text) — FETCHED 200, 454 lines.

All facts below are attributed to their exact source URL.

---

## 1. Coreth Architecture

**Source: `https://build.avax.network/docs/primary-network/coreth-architecture.md`**

- Coreth is the EVM implementation that powers the C-Chain. Shipped with AvalancheGo under [`graft/coreth`](https://github.com/ava-labs/avalanchego/tree/master/graft/coreth) and wrapped by Snowman++ ([`vms/proposervm`](https://github.com/ava-labs/avalanchego/tree/master/vms/proposervm)) for block production.
- **Consensus & block production**: Runs **Snowman++** via the ProposerVM wrapper; a stake-weighted proposer list gates each **5s slot**, and since the Durango upgrade there is no fallback that opens block-building to anyone.
- Blocks are built by Coreth's block builder ([`graft/coreth/plugin/evm/block_builder.go`](https://github.com/ava-labs/avalanchego/blob/master/graft/coreth/plugin/evm/block_builder.go)), applying EIP-1559 base fee rules and proposer-specific metadata.
- **Chain ID: Mainnet `43114`, Fuji (testnet) `43113`.**
- **JSON-RPC exposed at `/ext/bc/C/rpc`**, optional **WebSocket at `/ext/bc/C/ws`**.
- **Execution**: Standard go-ethereum VM with Avalanche-specific patches (fee handling, atomic tx support, bootstrapping/state sync), in `graft/coreth`.
- **State**: Uses PebbleDB/LevelDB via AvalancheGo's database interface; pruning and state-sync are configurable.
- **APIs**: Supports `eth`, `net`, `web3`, `debug` (optional), `txpool` (optional) namespaces, toggled via chain config.
- **Cross-chain (atomic) transfers**: Coreth supports atomic import/export to the X-Chain and P-Chain using shared UTXO memory ([`graft/coreth/plugin/evm/atomic`](https://github.com/ava-labs/avalanchego/tree/master/graft/coreth/plugin/evm/atomic)). Exports lock AVAX into an atomic UTXO set; imports consume those UTXOs to credit balance on the destination chain. On-chain these appear as `ImportTx`/`ExportTx` wrapping atomic inputs/outputs.
- **Chain config** lives at `~/.avalanchego/configs/chains/C/config.json`, example:
  ```json
  {
    "eth-apis": ["eth", "net", "web3", "eth-filter"],
    "pruning-enabled": true,
    "state-sync-enabled": true
  }
  ```
  Key knobs: `eth-apis` (RPC namespaces to serve), `pruning-enabled` (state trie pruning), `state-sync-enabled` (allow state-sync bootstrap instead of full replay). See [`graft/coreth/plugin/evm/config.go`](https://github.com/ava-labs/avalanchego/blob/master/graft/coreth/plugin/evm/config.go) for advanced options (incl. P-chain fee recipient).
- **Dev tips**: use chain configs instead of patching code; use `--chain-config-content` (base64) for local devnets; cross-chain AVAX moves go through P-Chain/X-Chain import/export endpoints — Coreth handles the atomic mempool internally.

---

## 2. ACP-194 — Continuous Execution

Primary landing page (`/docs/primary-network/continuous-execution.md`) has only this prose: **title + one-line description**: *"ACP-194 decouples consensus from execution, enabling parallel processing and dramatically improving C-Chain throughput."* No numeric throughput claims appear on that page itself (it is a purely interactive visual). The only other content on that stub page is two outbound links: an "ACP-194 Spec" button (→ `/docs/acps/194-continuous-execution`, fetched and digested below) and a **YouTube video link, `https://www.youtube.com/watch?v=yxAeRq4vSoQ`** (not fetched — video, out of scope). Substantive content pulled from the linked deep-dive pages below.

### 2.1 What changes — mechanism

**Sources: `https://build.avax.network/docs/nodes/architecture/execution/continuous-execution.md` and `https://build.avax.network/docs/acps/194-continuous-execution.md`**

- Also known (formerly) as **Streaming Asynchronous Execution (SAE)**. It **decouples consensus from execution**: a queue is introduced upon which consensus is performed; a concurrent executor clears the queue and reports a delayed state root for later consensus rounds. Transaction validation prior to queueing is lightweight but guarantees eventual execution.
- **Block lifecycle changes from 3 phases to 5**: Proposed → Validated → Accepted (→ enqueued) → Executed → Settled (vs. today's Proposed → Executed → Accepted/Settled in one step).
  - **Proposed**: block builder creates block, building on most recently *settled* state, applying worst-case bounds for ancestor blocks not yet settled. Builders are **no longer expected to execute transactions during block building**.
  - **Validated**: validators check transactions can eventually be paid for (worst-case sender balance bounds + max required base fee) — does **not** execute transactions or compute state, and does **not** guarantee transactions won't revert or run out of gas.
  - **Accepted**: block accepted by consensus, enqueued into a **FIFO execution queue**.
  - **Executed**: the block executor (running in parallel with consensus) processes the block from the queue, producing a state root and deterministic execution timestamp.
  - **Settled**: a later block includes the executed block's results (`stateRoot`, `receiptsRoot`, `logsBloom`, `gasUsed`) once its timestamp ≥ execution time + constant delay **τ**.
- **Gas charging formula** (ACP-194 spec): `g_C := max(g_U, g_L / λ)` where `g_C`=gas charged, `g_U`=gas used, `g_L`=gas limit, `λ`=limit factor (minimum charge based on limit) — prevents reserving large gas limits without proportional payment.
- **Block size limit**: `ω_B := R · τ · λ` (max block gas). **Queue size limit**: `ω_Q := 2 · ω_B`. Blocks exceeding these are invalid.
- **C-Chain configuration parameters (from the ACP-194 spec table)**:
  | Parameter | Description | C-Chain value |
  |---|---|---|
  | **τ** | duration between execution and settlement | **5 s** |
  | **λ** | minimum conversion from gas limit to gas charged | **2** |
  - (Background, from ACP-176, reused here): `R = 2·T`, `K = 87·T` where `T` = target gas/second, `R` = gas capacity/second, `K` = gas price update constant, `M` = minimum gas price. Price = `M · exp(x/K)` where `x` = gas excess.
- **Security analysis (ACP-194 §Security Considerations)**: "worst-case cost" transaction validity bounds queue-DoS risk. With τ=5, λ=2: attacker's max achievable gas-price inflation ratio `D ≤ exp(2·5·(2-1)/87) = exp(10/87) ≈ 1.12` — i.e., **"Mallory can require users to increase their gas price by at most ~12%,"** deemed insignificant since real gas prices fluctuate more than that regularly.
- **Named-block / RPC semantics change (critical for AgentPay — see §2.3 below).**

### 2.2 Status / activation

- ACP-194 status per the spec header: **"Implementable"** (Discussion: https://github.com/avalanche-foundation/ACPs/discussions/196). Authors: Arran Schlosberg (@ARR4N), Stephen Buttolph (@StephenButtolph). Track: Standards.
- Reference implementation: **[StreVM](https://github.com/ava-labs/strevm)**, and AvalancheGo implementation pointer: `https://github.com/ava-labs/avalanchego/tree/a9f00e53e2884107db88d83eb30557070b64e28a/vms/saevm` (note: package path `saevm` = old "SAE" name).
- Explicit warning on the architecture page: **"StreVM is under active development. There are currently no guarantees about the stability of its Go APIs."**
- No mainnet activation date/block is stated anywhere in the fetched pages — **status should be read as "specified/implementable, reference implementation in active development," not yet confirmed live on C-Chain mainnet** as of this digest date.
- No explicit numeric throughput claim (e.g., "X TPS") appears in any of the three fetched sources. Benefits are described qualitatively: "increases gas per wall-second," "bursty throughput" via eager transaction acceptance, "VM time more closely aligns with wall time," amortized stop-the-world events (e.g., DB compaction) across multiple blocks.

### 2.3 Finality/RPC implications once activated — directly relevant to AgentPay

**Source: `https://build.avax.network/docs/acps/194-continuous-execution.md`, Appendix — "Named blocks"** (quoted near-verbatim):

> "Other than the _earliest_ (genesis) named block... all other named blocks are now mapped in terms of the _execution_ status of blocks and MUST be interpreted as follows:
> - _pending_: the most recently _accepted_ block OR the most recently _executed_ block;
> - _latest_: the block that was most recently _executed_;
> - _safe_ and _finalized_: the block that was most recently _settled_."
>
> "The finality guarantees of Snowman consensus remove any distinction between _safe_ and _finalized_. Furthermore, the _latest_ block is not at risk of re-org, only of a negligible risk of data corruption local to the API node."

Implication for AgentPay: **once/if Continuous Execution activates, `latest` no longer means "final" the way it does today** — `latest` = most recently *executed* (pre-settlement), while `safe`/`finalized` = most recently *settled* (i.e., after the τ=5s settlement delay). Also: **`eth_getBlockReceipts` MUST return receipts for the block's own transactions, not the settled receipts** — APIs are required not to reshuffle this despite the async settlement.

---

## 3. Firewood

Primary landing page (`/docs/primary-network/firewood.md`) has no prose (interactive `<FirewoodPage />` component only). Its only other content is an outbound link to the Ava Labs marketing blog post, **`https://www.avax.network/about/blog/introducing-firewood-a-next-generation-database-built-for-high-throughput-blockchains`** (not fetched — out of scope per task instructions; noted here because it is likely where Firewood's performance/throughput marketing narrative lives, which could be useful for AgentPay's pitch). Substantive content below is from the linked deep-dive page and the GitHub README.

**Sources: `https://build.avax.network/docs/nodes/architecture/execution/firewood.md` and GitHub README (`ava-labs/firewood`, see §5).**

- **What it is**: a purpose-built embedded key-value store optimized to store recent Merkleized blockchain state. Unlike traditional approaches that layer a Merkle trie on top of a generic KV store (LevelDB/RocksDB), **Firewood stores trie nodes directly on disk** and uses the trie structure itself as the on-disk index — "no additional emulation of the logical trie to flatten out the data structure."
- **Status**: **"Firewood is beta-level software. The Firewood API may change with little to no warning."** (stated identically on both the docs page and the GitHub README).
- **Key design**: node's address = its disk offset (not a hash); branch nodes point directly to child disk offsets; no hash-based lookup required to find a node.
- **No compaction**: eliminates LSM-tree-style compaction cycles and their associated write amplification / latency spikes. Space management resembles heap allocation with free lists tracking different-size reusable slots.
- **Revision management**: persistent (immutable) trie supporting multiple concurrent versions; unchanged subtrees are shared across revisions; old revisions remain readable.
- **Future-Delete Log (FDL)**: tracks nodes that become obsolete on each revision; when a revision expires, its logged nodes are returned to free space — enables predictable, non-bursty cleanup ("inline compaction... as part of normal operation").
- **Ethereum compatibility**: default hashing is **SHA256** (compatible with AvalancheGo's [MerkleDB](https://github.com/ava-labs/avalanchego/tree/master/x/merkledb)); enabling the **`ethhash`** Cargo feature switches to **Keccak256**, adds RLP-encoded account handling and correct account storage root computation — "has some performance overhead compared to the default configuration."
- **Proof support (native)**: Key Proof, Range Proof, Change Proof — used for state sync without trusting the source.
- **Performance claims are qualitative, not numeric**, in the fetched docs pages: lower write amplification, minimal latency spikes (vs. periodic compaction), fast iteration (native trie), native proof generation vs. reconstruction required elsewhere. **No specific benchmark numbers (ops/sec, latency in ms, etc.) are given in the docs pages fetched** — the docs page points to Prometheus metrics (`firewood_db_size_bytes`, `firewood_read_latency_seconds`, `firewood_write_latency_seconds`, `firewood_revision_count`, `firewood_free_space_bytes`) and a full [METRICS.md](https://github.com/ava-labs/firewood/blob/main/METRICS.md) reference rather than quoting numbers directly. The GitHub repo has a `benchmark/` directory (C-Chain re-execution, Rust criterion, synthetic workloads) — not fetched/digested here (out of scope per task instructions).
- **CLI**: `fwdctl` (create / put / get / prove operations against a Firewood DB file).
- **Integration with AvalancheGo**: positioned as an alternative to LevelDB/PebbleDB. Docs page states: **"Firewood integration with AvalancheGo is under active development."** Go bindings live in a separate repo: [`ava-labs/firewood-go-ethhash`](https://github.com/ava-labs/firewood-go-ethhash).
- Firewood is also shown as the storage engine underneath the Continuous Execution architecture diagram (Executor → VM → Firewood), i.e., the two features are explicitly designed to work together.

---

## 4. Exchange Integration — ops guide for payment settlement (HIGH PRIORITY for AgentPay)

**Source: `https://build.avax.network/docs/primary-network/exchange-integration.md`** (full text fetched, 160 lines)

### 4.1 Core facts

- Purpose stated in doc: *"provide a brief overview of how to integrate with the EVM-Compatible Avalanche C-Chain."* For teams already supporting ETH, "supporting the C-Chain is as straightforward as spinning up an Avalanche node (which has the same API as go-ethereum) and populating Avalanche's ChainID (43114) when constructing transactions."
- Two integration paths documented: (1) **direct EVM/JSON-RPC endpoints** against a self-run AvalancheGo node, or (2) **Rosetta API** via [`ava-labs/avalanche-rosetta`](https://github.com/ava-labs/avalanche-rosetta) (Coinbase's standardized multi-chain integration spec; Data API + Construction API; server ships with a `Dockerfile` bundling both the Rosetta server and the Avalanche client).
- **Running a node**: build from [`ava-labs/avalanchego`](https://github.com/ava-labs/avalanchego) source, or use the node install script (`/docs/nodes/run-a-node/using-install-script/installing-avalanche-go`) for a `systemd`-managed prebuilt-binary install.
- **C-Chain config file location**: `$HOME/.avalanchego/configs/chains/C/config.json` (overridable via `--chain-config-dir`). Example config given in the doc:
  ```json
  {
    "snowman-api-enabled": false,
    "coreth-admin-api-enabled": false,
    "local-txs-enabled": true,
    "pruning-enabled": false,
    "eth-apis": [
      "internal-eth", "internal-blockchain", "internal-transaction",
      "internal-tx-pool", "internal-account", "internal-personal",
      "debug-tracer", "web3", "eth", "eth-filter", "admin", "net"
    ]
  }
  ```
  - **Warning (Callout, verbatim intent)**: if you need Ethereum Archive-Node functionality you must disable C-Chain pruning (`"pruning-enabled": false`), since pruning has been **enabled by default since AvalancheGo v1.4.10**.
  - `personal_` RPC namespace is **off by default**; must be explicitly enabled via config.
- **Transaction construction**: C-Chain transactions are identical to standard EVM transactions with 2 exceptions: (1) **must be signed with Avalanche's ChainID (43114)**; (2) dynamic gas fee details are at `/docs/rpcs/other/guides/txn-fees#c-chain-fees`. Standard Ethereum tooling works unmodified: Remix IDE, thirdweb, Hardhat.
- **Address format**: not separately specified — doc treats C-Chain addresses as standard Ethereum-style (`0x...`) addresses, consistent with "identical to interacting with go-ethereum."

### 4.2 Finality / confirmation guidance — QUOTED VERBATIM (this is the load-bearing fact for AgentPay's receipt-attribution flow)

Under **"Determining Finality"**:

> "Avalanche consensus provides fast and irreversible finality with ~1 second. To query the most up-to-date finalized block, query any value (that is block, balance, state, etc) with the `latest` parameter. If you query above the last finalized block (that is eth_blockNumber returns 10 and you query 11), an error will be thrown indicating that unfinalized data cannot be queried (as of `avalanchego@v1.3.2`)."

Key operational takeaways for AgentPay's settlement-finality logic:
- **No confirmation-count / block-depth waiting is recommended or needed today** — Avalanche's Snowman consensus gives **irreversible finality at block acceptance**, ~1 second after submission. Querying `latest` (rather than counting confirmations the way one would on probabilistic-finality chains) is the documented pattern for "has this settled."
- Attempting to query state **above** the current finalized/latest block height throws an explicit RPC error (protects against reading unconfirmed/nonexistent data) — behavior confirmed as of `avalanchego@v1.3.2`.
- **Caveat for the future** (cross-referenced from §2.3 above, ACP-194 spec, not from the exchange-integration page itself): if/when Continuous Execution (ACP-194) activates, `latest` will mean "most recently *executed*" rather than fully *settled*; the ACP-194 spec explicitly remaps `safe`/`finalized` to mean "most recently *settled* block" (after the τ=5s settlement delay). **AgentPay should treat `exchange-integration.md`'s "~1 second, query latest" guidance as the current (pre-ACP-194) state of the world**, and should plan to query `safe`/`finalized` (not `latest`) for irreversible confirmation if/when Continuous Execution ships on mainnet, to preserve the same finality guarantee.

### 4.3 Data ingestion / Golang SDK note

- For Go-based data ingestion, the doc recommends the **custom [`ethclient`](https://github.com/ava-labs/avalanchego/tree/master/graft/coreth/ethclient)** shipped in `avalanchego`/`coreth`, NOT the standard go-ethereum client — because standard go-ethereum's `block.Hash()` computes incorrectly on Avalanche blocks (doesn't account for the added `ExtDataHash` header field used to move AVAX between X-Chain/P-Chain and C-Chain: [`graft/coreth/core/types/block.go#L98`](https://github.com/ava-labs/avalanchego/blob/master/graft/coreth/core/types/block.go#L98)).
- If reading raw JSON RPC responses or using web3.js (which doesn't recompute the hash client-side), there are **no issues** — safe path for most integrations, including presumably AgentPay's receipt-attribution flow if it reads tx/receipt JSON directly rather than recomputing block hashes.
- Support channel: public [Discord](https://chat.avalabs.org/).

---

## 5. Contract Verification

**Result: NOT LOCATABLE.** Per task instructions, exactly 3 probe URLs were tried (all `.md`, all HTTP 404):

1. `https://build.avax.network/docs/primary-network/verify-contract.md` → 404
2. `https://build.avax.network/docs/primary-network/contract-verification/overview.md` → 404
3. `https://build.avax.network/docs/tooling/verify-contract.md` → 404

**Contract Verification page not locatable at a stable URL as of 2026-08-15.** No further probing was done per instructions.

---

## 6. GitHub repositories referenced across all fetched pages

| Repo | Purpose (per citing page) | Cited from |
|---|---|---|
| **ava-labs/avalanchego** | Official Avalanche node client; contains grafted Coreth (EVM) at `graft/coreth`, ProposerVM (`vms/proposervm`), atomic tx logic (`graft/coreth/plugin/evm/atomic`), custom `ethclient`, MerkleDB (`x/merkledb`), and the Continuous-Execution-in-progress package `vms/saevm` | coreth-architecture.md, exchange-integration.md, deep continuous-execution page, deep firewood page, ACP-194 spec |
| **ava-labs/avalanche-rosetta** | Ava Labs' implementation of the Rosetta (Mesh) API standard for the C-Chain; includes a Dockerfile bundling server + Avalanche client | exchange-integration.md |
| **coinbase/rosetta-specifications** | Upstream Rosetta/Mesh API specification repo | exchange-integration.md |
| **avalanche-foundation/ACPs** | Avalanche Community Proposals repo; hosts the ACP-194 spec text and its discussion thread (#196) | continuous-execution.md (landing page link), ACP-194 spec |
| **ava-labs/strevm** ("StreVM") | Reference implementation of Continuous Execution for EVM blocks; explicitly "under active development," no API stability guarantees | deep continuous-execution page, ACP-194 spec |
| **ava-labs/firewood** | Firewood database source code — the compaction-less Merkleized-state store; includes `METRICS.md`, `benchmark/`, `fwdctl` CLI | firewood.md (landing page link), deep firewood page, GitHub README fetch |
| **ava-labs/firewood-go-ethhash** | Go language bindings for Firewood, for AvalancheGo integration (integration itself "under active development") | deep firewood page |
| **ava-labs/avalanche-cli** | CLI tool for spinning up a local Avalanche test network (`avalanche network start`) | avalanchego GitHub README |

---

## 7. GitHub README digests

### 7.1 `ava-labs/avalanchego` — README (fetched `https://raw.githubusercontent.com/ava-labs/avalanchego/master/README.md`)

- Described as: "Node implementation for the Avalanche network — a blockchains platform with high throughput, and blazing fast transactions."
- **Minimum Mainnet node hardware**: 8 AWS-equivalent vCPUs, 16 GiB RAM, 1 TiB storage, Ubuntu 22.04/24.04 or macOS ≥ 12, reliable IPv4/IPv6 with an open public port. Build requires **Go ≥ 1.25.10**, gcc, g++.
- **Bootstrapping**: a new Mainnet node currently takes **several days** to catch up before it can serve API calls or participate in consensus; it will not report healthy until done. Bottleneck is typically database I/O.
- **Versioning scheme**: `v0.x.x` = development network, `v1.x.x` = production network, second component = network-upgrade count, third component = client-patch count since last network upgrade. API compatibility is preserved across versions unless a feature is explicitly deprecated.
- **Supported platform tiers**: Tier 1 (amd64/arm64 Linux — full e2e/stress-tested) down to "Not supported" (amd64 Darwin, amd64 Windows, arm/i386 Linux).
- Licensed under BSD-3, except grafted subprojects (e.g., `graft/coreth`) which may carry a different license.

### 7.2 `ava-labs/firewood` — README (fetched `https://raw.githubusercontent.com/ava-labs/firewood/main/README.md`)

- Full title: **"Firewood: Compaction-Less Database Optimized for Efficiently Storing Recent Merkleized Blockchain State."** Explicit beta warning repeated: "Firewood is beta-level software. The Firewood API may change with little to no warning."
- Built specifically to avoid the double-indexing problem of layering a Merkle trie on top of a generic KV store; like a B+-tree DB, uses the trie structure itself as the on-disk index, so **iteration stays fast (good for state-sync queries) without requiring compaction**.
- By default only keeps a **configurable number of recent revisions** on disk/memory (actively cleans up expired ones via the Future-Delete Log), but also supports an **archival mode via `RootStore`** that retains all historical revisions for lookup by root hash.
- Node addresses are **disk offsets, not hashes**; free space management resembles heap allocation (free lists by size class); guarantees recoverability by never referencing new nodes in a revision until they're flushed to disk.
- Build requires `cargo` + `make`; devcontainer (GitHub Codespaces / VS Code Dev Containers) ships Rust (stable+nightly), Go, Nix, sccache preconfigured. Performance benchmarking (C-Chain re-execution, Rust criterion, synthetic workloads) documented in `benchmark/README.md` (not fetched — out of scope). CLI tool `fwdctl` for direct DB interaction; test via `cargo nextest --release`. Licensed under the "Ecosystem License."

---

## 8. Top facts for AgentPay (summary)

1. **Finality guidance (verbatim, exchange-integration.md)**: *"Avalanche consensus provides fast and irreversible finality with ~1 second... query... with the `latest` parameter"* — today, AgentPay can treat a C-Chain settlement as final ~1s after submission by polling `latest`, no confirmation-count logic needed.
2. **Chain ID / RPC**: Mainnet ChainID **43114**; JSON-RPC at `/ext/bc/C/rpc`, WS at `/ext/bc/C/ws` (coreth-architecture.md); addresses are standard `0x...` EVM addresses.
3. **Future finality risk**: ACP-194 (Continuous Execution), if/when activated, **redefines `latest` as "most recently executed" (pre-settlement)** and moves true finality to `safe`/`finalized` = "most recently settled," settled τ=**5 seconds** after execution (ACP-194 spec, Appendix "Named blocks"). AgentPay's finality logic should be designed to switch from `latest` to `safe`/`finalized` if/when this activates on mainnet — status as of this digest is "Implementable" spec + actively-developed reference implementation (StreVM), **not confirmed live on mainnet**.
4. **Go SDK gotcha**: standard go-ethereum client mis-computes `block.Hash()` on Avalanche blocks (extra `ExtDataHash` field); use AvalancheGo's own `ethclient` package, or read raw JSON/web3.js responses directly (both are safe) — relevant if AgentPay recomputes block hashes anywhere in its receipt-attribution pipeline.
5. **Firewood** (beta-status DB backing Coreth/Continuous Execution) removes compaction-induced latency spikes, which is the throughput/latency architectural story behind AgentPay's pitch — but note **no numeric benchmark figures were present in the docs pages**; only qualitative claims plus pointers to `METRICS.md` and the repo's `benchmark/` suite.

Full detail, exact quotes, all repo links, and both README digests are in the sections above.
# Section C — P-Chain & Staking Digest (Avalanche Primary Network)

Compiled 2026-08-15 for AgentPay (StraitsX hackathon: AI-agent payments layer settling XSGD on Avalanche C-Chain mainnet). Purpose: background depth on Avalanche's network-security model and validator economics for the "why Avalanche" pitch narrative. Not integration-critical — compressed, but every hard number below is quoted verbatim from source.

**Fetch status: all 6 URLs fetched successfully (HTTP 200). None NOT FETCHED.**

| # | URL | Status |
|---|-----|--------|
| 1 | https://build.avax.network/docs/primary-network/platformvm-architecture.md | Fetched |
| 2 | https://build.avax.network/docs/primary-network/validate/staking-for-finance-professionals.md | Fetched |
| 3 | https://build.avax.network/docs/primary-network/validate/validate-vs-delegate.md | Fetched |
| 4 | https://build.avax.network/docs/primary-network/validate/rewards-formula.md | Fetched |
| 5 | https://build.avax.network/docs/primary-network/validate/how-to-stake.md | Fetched |
| 6 | https://build.avax.network/docs/primary-network/validate/node-validator.md | Fetched |

---

## 1. PlatformVM Architecture (P-Chain)
Source: https://build.avax.network/docs/primary-network/platformvm-architecture.md

- PlatformVM (P-Chain) runs on **Snowman++** consensus (via ProposerVM: stake-sampled single-proposer slots) and "controls validators, staking rewards, subnet membership, and chain creation."
- **Responsibilities:**
  - Validator registry & staking: tracks Primary Network validators/delegators, uptime, staking rewards, validator fees.
  - Subnet/L1 orchestration: creates Subnets/chains (`CreateSubnetTx`, `CreateChainTx`), converts Subnets to L1s (`ConvertSubnetToL1Tx`, per ACP-77), maintains Subnet/L1 validator sets (permissionless add/remove, warp-authorized changes).
  - Warp messaging: signs warp messages for cross-chain communication on Avalanche L1s.
  - Atomic transfers: import/export of AVAX to/from other chains via shared memory.
- Blocks are Standard, Proposal (with Commit/Abort options), or Atomic; built by `vms/platformvm/block/builder`.
- **Key transaction types** (table, verbatim purposes):
  - `AddValidatorTx`, `AddDelegatorTx` — join Primary Network validator set / delegate stake
  - `AddSubnetValidatorTx` — add validator to a Subnet (must also be on Primary)
  - `AddPermissionlessValidatorTx` / `AddPermissionlessDelegatorTx` — permissionless validation on Subnets that allow it
  - `CreateSubnetTx` — create a new Subnet and owner controls
  - `CreateChainTx` — launch a new blockchain (VM + genesis) on a Subnet
  - `ConvertSubnetToL1Tx` — convert a Subnet into an L1 with its initial validator set (ACP-77)
  - `RegisterL1ValidatorTx` — add a validator to an L1, authorized by warp message from the L1's validator manager
  - `SetL1ValidatorWeightTx` — change an L1 validator's weight (weight of 0 removes the validator)
  - `IncreaseL1ValidatorBalanceTx` — top up an L1 validator's continuous-fee balance
  - `DisableL1ValidatorTx` — deactivate an L1 validator, reclaim remaining balance
  - `ImportTx` / `ExportTx` — move AVAX to/from other chains via atomic UTXOs
  - `RewardValidatorTx` — mint rewards after successful staking periods
  - `TransformSubnetTx` — legacy subnet transform (disabled post-Etna)
- P-Chain APIs exposed at `/ext/bc/P` (`platform.getBlock`, `platform.getCurrentValidators`, `platform.issueTx`, `platform.getSubnets`, `platform.getBlockchains`).
- Default chain config: `~/.avalanchego/configs/chains/P/config.json` → `{"state-sync-enabled": true, "pruning-enabled": true}`.

---

## 2. Validate vs. Delegate — Core Distinction
Source: https://build.avax.network/docs/primary-network/validate/validate-vs-delegate.md

- **Validation**: run node infrastructure; stake minimum **2,000 AVAX on Mainnet (1 AVAX on Fuji Testnet)**. Sampling probability during consensus is proportional to stake. Rewards require being "online and responsive for more than 80% of their validation period."
- **Delegation**: stake to an existing validator without running infrastructure; minimum **25 AVAX on Mainnet (1 AVAX on Fuji Testnet)**. Delegator rewards are shared by the validator "according to the validator's delegation fee rate."
- Validators bear higher stake/responsibility and get direct rewards; delegators get indirect rewards passed through the validator, minus the delegation fee.

---

## 3. Staking Minimums, Durations, Fees, Weight Caps (Mainnet + Fuji)
Source: https://build.avax.network/docs/primary-network/validate/how-to-stake.md and https://build.avax.network/docs/primary-network/validate/rewards-formula.md

**Mainnet parameters (verbatim):**
- "The minimum amount that a validator must stake is 2,000 AVAX"
- "The minimum amount that a delegator must delegate is 25 AVAX"
- "The minimum amount of time one can stake funds for validation is 2 weeks"
- "The maximum amount of time one can stake funds for validation is 1 year"
- "The minimum amount of time one can stake funds for delegation is 2 weeks"
- "The maximum amount of time one can stake funds for delegation is 1 year"
- "The minimum delegation fee rate is 2%"
- "The maximum weight of a validator (their own stake + stake delegated to them) is the minimum of 3 million AVAX and 5 times the amount the validator staked." Example given: staking 2,000 AVAX → max total weight 10,000 AVAX (5×2,000), i.e., up to 8,000 AVAX delegatable to that node.
- Reward eligibility: "online and response [sic] for more than 80% of their validation period, as measured by a majority of validators, weighted by stake."

**Fuji Testnet deltas (all other params match Mainnet):**
- "The minimum amount that a validator must stake is 1 AVAX"
- "The minimum amount that a delegator must delegate is 1 AVAX"
- "The minimum amount of time one can stake funds for validation is 24 hours"
- "The minimum amount of time one can stake funds for delegation is 24 hours"

**Full Primary Network Parameters on Mainnet** (rewards-formula.md, verbatim block):
```
AssetID = Avax
InitialSupply = 240_000_000 Avax
MaximumSupply = 720_000_000 Avax
MinConsumptionRate = 0.10 * reward.PercentDenominator
MaxConsumptionRate = 0.12 * reward.PercentDenominator
Minting Period = 365 * 24 * time.Hour
MinValidatorStake = 2_000 Avax
MaxValidatorStake = 3_000_000 Avax
MinStakeDuration = 2 * 7 * 24 * time.Hour
MaxStakeDuration = 365 * 24 * time.Hour
MinDelegationFee = 20000, that is 2%
MinDelegatorStake = 25 Avax
MaxValidatorWeightFactor = 5 (platformVM parameter, shared across networks)
UptimeRequirement = 0.8, that is 80%
```
`PercentDenominator = 1_000_000` (used to express percentages to 4 decimal places).

**Pending Helicon upgrade changes** (live on Fuji as of July 28, 2026 15:00 UTC; NOT yet scheduled on Mainnet — flag as forward-looking, not current Mainnet state):
- `MinConsumptionRate` drops from 0.10 → **0.075** (ACP-285), ramping linearly over 90 days post-activation; rate used is the one in effect at the staking period's start time.
- Effective uptime requirement rises from 80% → **90%** (ACP-267) for validations whose start time is at/after Helicon activation; `UptimeRequirement` genesis param itself stays 0.8. Earlier-started validations still judged at 80%. L1 validators keep their own subnet-transformation requirement.
- `MinStakeDuration` for Primary Network **validators** drops to **48 hours** (ACP-273) once Helicon activates on a network (Fuji minimum now **12 hours**). Delegators unaffected — keep the 2-week minimum.

**Delegator weight bound:** `MaxWeight = min(Validator.Weight × MaxValidatorWeightFactor, MaxValidatorStake)`. Setting `MaxValidatorWeightFactor` to 1 disables delegation.

**Delegation fee distribution mechanics:** After the Cortina Activation, delegation fees are no longer paid per delegation period as a separate UTXO — they are "batched during a node's entire validation period and are distributed when it is unstaked."

---

## 4. Rewards Formula (quoted verbatim)
Source: https://build.avax.network/docs/primary-network/validate/rewards-formula.md (identical formula restated in how-to-stake.md)

Potential reward, calculated **at the beginning of the staking period**:

```
Potential Reward = (MaximumSupply − Supply) × (Stake / Supply) × (StakingPeriod / MintingPeriod) × EffectiveConsumptionRate
```

Where:
- `MaximumSupply − Supply` = AVAX tokens left to emit in the network
- `Stake / Supply` = individual's stake as % of all available AVAX
- `StakingPeriod / MintingPeriod` = time locked ÷ MintingPeriod (MintingPeriod = 1 year, network-configured)
- `EffectiveConsumptionRate = (MinConsumptionRate/PercentDenominator) × (1 − StakingPeriod/MintingPeriod) + (MaxConsumptionRate/PercentDenominator) × (StakingPeriod/MintingPeriod)`

Constraint: `MinConsumptionRate ≤ EffectiveConsumptionRate ≤ MaxConsumptionRate`. Longer `StakingPeriod` → closer to `MaxConsumptionRate`.

Max reward case (`StakingPeriod = MintingPeriod`):
```
Max Reward = (MaximumSupply − Supply) × (Stake / Supply) × (MaxConsumptionRate / PercentDenominator)
```

Key clarification (verbatim): "`StakingPeriod` is the staker's entire staking period, not just the staker's uptime... The uptime comes into play only to decide whether a staker should be rewarded; to calculate the actual reward only the staking period duration is taken into account." I.e., uptime is a binary reward-eligibility gate (≥80%, or ≥90% post-Helicon), not an input to the reward magnitude itself.

**Validator delegation capacity formula** (staking-for-finance-professionals.md):
```
Validator Delegation Capacity = ((3,000,000 AVAX − (5 × Validator Stake Amount)) − Validator Stake Amount) − Active Delegation Stake
```

**Rewards timing/distribution** (staking-for-finance-professionals.md, verbatim):
- Rewards are NOT distributed incrementally; actual reward determined ONLY at end of period; no "accrued but not yet received" rewards mid-period.
- Validator: Gross Validator Rewards → Validator Rewards Address; Delegation Fee Rewards (= Gross Delegation Rewards × Delegation Fee Rate) → Delegation Fee Address, batched at end of validator's staking period.
- Delegator: Net Delegator Revenue = Gross Rewards − Delegation Fee, paid to Delegator Rewards Address at end of the **delegator's** (not validator's) staking period.
- Principal is always returned since "Avalanche does NOT have slashing" — worst case is zero rewards, never loss of principal.

---

## 5. Institutional / Finance-Professional Framing
Source: https://build.avax.network/docs/primary-network/validate/staking-for-finance-professionals.md

**Critical risk callout (verbatim):**
- "No Slashing - Avalanche does NOT have slashing. Your staked principal is never at risk of being taken by the protocol or validators, regardless of validator performance."
- "Assets Are Locked... completely illiquid until [maturity] date."
- "Irreversible Transaction... There is NO mechanism for early withdrawal or changing transaction settings."

**Non-custodial design (verbatim):** "At every stage, you retain ownership of your private keys. The validator never has access to your funds for either form of staking. The time-lock is enforced by the Avalanche protocol, not by any third party." (Caveat: third-party intermediaries impose their own restrictions.)

**Validator vs Delegator comparison table (key rows):**
| Aspect | Validator | Delegator |
|---|---|---|
| Minimum Capital | 2,000 AVAX | 25 AVAX |
| Maximum Stake | 3,000,000 AVAX | Dependent on validator capacity |
| Hardware Required | Yes (8-core CPU, 16GB RAM, 1TB SSD) | No |
| Technical Knowledge | High (Linux, networking, DevOps) | None required |
| Uptime Requirement | >80% for rewards | N/A (inherits validator's) |
| Risk Profile | Operational + reputational | Minimal (validator selection risk) |

**Staking must occur on P-Chain**, not C-Chain — C-Chain AVAX must first be moved via `ExportTx` (C-Chain) → `ImportTx` (P-Chain). Cross-chain transfer cost: "approximately 0.001 AVAX" per transaction, ~0.002 AVAX total. Core Wallet provides one-click cross-chain transfer.

**Required P-Chain addresses:** Validator/Delegator Principal Address (source of staked funds), Rewards Address, and (validator-only) Delegation Fee Address.

**Validation transaction parameters:** Node ID, Node BLS Public Key, Node BLS Proof of Possession, Stake Amount (min 2,000 AVAX), Delegation Fee % (must be 2%–100%), Start Time, End Time (2 weeks–1 year from start), Stake Return Address, Validator Rewards Address, Delegation Fee Address.

**Delegation transaction parameters:** Node ID, Stake Amount (min 25 AVAX, max = validator capacity), Start/End Time (end must be before validator's end; delegators can join up until the last two weeks of the validator's period), Stake Return Address, Delegator Rewards Address.

**Auto-Renewed Staking — ACP-236** (forward-looking; live on Fuji since Helicon activation July 28, 2026 15:00 UTC; **not yet scheduled on Mainnet** — flag clearly as not-yet-live in production):
- Validator specifies a cycle duration + auto-compound percentage instead of a fixed end time; renews automatically at each cycle boundary if uptime requirement met.
- New txs: `AddAutoRenewedValidatorTx`, `SetAutoRenewedValidatorConfigTx`, `RewardAutoRenewedValidatorTx`.
- `AutoCompoundRewardShares` (millionths, max 1,000,000): 0 = withdraw all rewards; 300,000 = restake 30%; 1,000,000 = full compounding.
- Missing the uptime requirement at a cycle boundary forces removal and forfeits that cycle's rewards (principal always returned — no slashing).
- Cycle length bounds: minimum = network minimum (12h Fuji, 48h Mainnet once Helicon activates there); maximum = 1 year.
- Delegators cannot auto-renew (ACP-236 applies to validators only); delegation period must fit within the validator's current cycle.

---

## 6. Hardware Requirements for Validators
Source: https://build.avax.network/docs/primary-network/validate/staking-for-finance-professionals.md (comparison table; node-validator.md and how-to-stake.md do not restate specs, only link out to a separate "Run an Avalanche Node" doc not in this fetch set)

- **8-core CPU, 16GB RAM, 1TB SSD** — quoted verbatim from the Validator vs. Delegator comparison table.
- Networking: node must accept/send TCP traffic on the staking port (default **9651**) and ideally have a public IP (`--public-ip=` flag; NAT traversal attempted by default otherwise). API port default **9650**; docs recommend restricting API port access to trusted machines and disabling unused APIs.
- Secret management: only required secret is the node's Staking Key (TLS key at `$HOME/.avalanchego/staking/staker.key` + `staker.crt`) which determines Node ID — must be backed up; losing it changes the node's ID and jeopardizes reward eligibility. Best practice: do not keep AVAX funds on the validating node itself — funds should sit in cold addresses.
- Uptime self-check: `info.uptime` RPC method; public tool: Avalanche Validator Health Dashboard (https://stats.avax.network/dashboard/validator-health-check/).

## 7. How to Add a Validator — Methods
Source: https://build.avax.network/docs/primary-network/validate/node-validator.md

Three supported methods: (1) Core web wallet UI (https://core.app), (2) `platform-cli` command-line tool (install via `curl -sSfL https://build.avax.network/install/platform-cli | sh`), (3) AvalancheJS SDK programmatically. Also mentioned: an interactive Builder Console staking tool (https://build.avax.network/console/primary-network/stake).

- Retrieve Node ID/BLS key/BLS proof of possession via `info.getNodeID` RPC.
- `platform-cli validator add-permissionless` flags: `--stake` (min 1 Fuji / 2000 Mainnet), `--duration` (min `336h` = 14 days), `--delegation-fee` (min `0.02` = 2%), `--bls-public-key`, `--bls-pop`, `--node-endpoint` or manual BLS, `--network` (fuji/mainnet/local), supports `--ledger` hardware wallet in place of `--key-name`.
- Once an `AddValidatorTx`/`AddPermissionlessValidatorTx` is issued, parameters are immutable: "You can't remove your stake early or change the stake amount, node ID, or reward address" (repeated verbatim across docs 5 and 6).
- AvalancheJS repo clone: `git clone https://github.com/ava-labs/avalanchejs.git`; example script `examples/p-chain/validate.ts` builds a `newAddPermissionlessValidatorTx`. Default example validation period is 21 days; stake unit is nAVAX (1 AVAX = 1e9 nAVAX); default delegation fee param in the example is `20` (i.e., `1e4 * 20`).
- Verification: `platform.getPendingValidators` (before start time) / `platform.getCurrentValidators` (after start).

---

## GitHub Repositories Referenced (org/name + purpose)

| Repo | Purpose (as linked in docs) | Source page |
|---|---|---|
| `ava-labs/avalanchego` (path: `vms/platformvm`) | PlatformVM source code | platformvm-architecture.md |
| `ava-labs/avalanchego` (path: `vms/platformvm/txs`) | P-Chain block/tx type definitions | platformvm-architecture.md |
| `ava-labs/avalanchego` (path: `vms/platformvm/block/builder`) | P-Chain block builder | platformvm-architecture.md |
| `avalanche-foundation/ACPs` (path: `ACPs/77-reinventing-subnets`) | ACP-77 spec — Subnet-to-L1 conversion | platformvm-architecture.md |
| `ava-labs/avalanchejs` | AvalancheJS SDK — used for programmatic staking (`examples/p-chain/validate.ts`) | node-validator.md |

Note: ACP-285 (reduce minimum consumption rate), ACP-267 (uptime requirement increase), ACP-273 (reduce minimum staking duration), and ACP-236 (auto-renewed staking) are referenced by number/title with links to `/docs/acps/...` on the build.avax.network doc site itself, not to a GitHub ACP repo path, in rewards-formula.md and staking-for-finance-professionals.md.

---

## Notes / Caveats for Pitch Use

- All Helicon-upgrade figures (90% uptime, 0.075 min consumption rate, 48h/12h min validator stake duration, ACP-236 auto-renewal) are **Fuji-only as of this fetch (2026-08-15)** — Mainnet still runs the original 80% uptime / 0.10 min consumption / 2-week min duration parameters. Use Mainnet figures for any claim about production Avalanche today; Helicon figures should be flagged explicitly as "upcoming" if mentioned.
- "Why Avalanche" narrative hooks for AgentPay pitch: no-slashing principal safety (validator vs. custodial-bank risk framing), sub-second finality claim not present in these 6 docs (would need a separate consensus-speed doc), stake-weighted Snowman++ sampling, and the explicit institutional/finance-professional staking guide (doc 2) as evidence Avalanche targets regulated/TradFi participants — relevant analog for a StraitsX/XSGD institutional payments pitch.
