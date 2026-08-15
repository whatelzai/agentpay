---
name: agentpay-protocol
description: Run the AgentPay propose, authorize, poll, execute, and receipt protocol through MCP or CLI.
---

# AgentPay Protocol

Use this sequence for every purchase:

1. Call `propose_purchase` with the exact merchant and amount in SGD.
2. Give the user the returned confirmation URL. Explain what will be purchased and the exact amount.
3. Wait for the user to authorize in their own wallet or managed signer. Never ask for a private key.
4. Poll `get_confirmation` with the returned request ID until it is confirmed or expires.
5. Call `execute_purchase` with the opaque `confirmation_token` and the exact same merchant and amount.
6. Call `get_receipt` and report whether the purchase was authorized or refused.

If using the CLI, the equivalent commands are `agentpay propose`, `agentpay confirmation`, `agentpay execute`, and `agentpay receipt`. `agentpay ping` checks connectivity.

The confirmation token is a capability, not a general spending license. Do not reuse it, alter its fields, or pass raw payment proof through an agent-visible response.
