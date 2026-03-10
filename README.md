# 𓉸 @cellar-door/erc-8004

EXIT Protocol adapter for [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) — link departure records to on-chain agent identities and reputation registries.

> **[𓉸 Passage Protocol](https://cellar-door.dev)** · [exit-door](https://github.com/CellarDoorExits/exit-door) · [entry-door](https://github.com/CellarDoorExits/entry-door) · [mcp](https://github.com/CellarDoorExits/mcp-server) · [langchain](https://github.com/CellarDoorExits/langchain) · [vercel](https://github.com/CellarDoorExits/vercel-ai-sdk) · [eliza](https://github.com/CellarDoorExits/eliza-exit) · [eas](https://github.com/CellarDoorExits/eas-adapter) · [erc-8004](https://github.com/CellarDoorExits/erc-8004-adapter) · [sign](https://github.com/CellarDoorExits/sign-protocol-adapter) · [python](https://github.com/CellarDoorExits/exit-python)

> **⚠️ Pre-release software — no formal security audit has been conducted.** Report vulnerabilities to hawthornhollows@gmail.com.

## Install

```bash
npm install @cellar-door/erc-8004 ethers
```

## Usage

```typescript
import { resolveAgent, registerDeparture, queryDepartures } from '@cellar-door/erc-8004';
import { JsonRpcProvider, Wallet } from 'ethers';

const provider = new JsonRpcProvider('https://mainnet.base.org');

// Resolve an agent's on-chain identity
const agent = await resolveAgent(1n, { provider, chain: 'base' });
// → { agentId: 1n, owner: '0x...', agentURI: '...', did: 'did:pkh:eip155:8453:0x...' }

// Register an EXIT departure as a reputation signal
const signer = new Wallet(privateKey, provider);
const result = await registerDeparture(exitMarker, {
  signer,
  agentId: 1n,
  chain: 'base',
  markerUri: 'ipfs://bafybeig...',
});
// → { txHash: '0x...', blockNumber: 12345, feedbackIndex: 0n }

// Query an agent's departure history
const departures = await queryDepartures(1n, { provider, chain: 'base' });
// → [{ origin, exitType, timestamp, feedbackURI, feedbackHash, txHash }]
```

## API

### `resolveAgent(agentId, options)`

Query the IdentityRegistry for an agent's owner, URI, and DID.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `bigint \| number` | Agent token ID |
| `options.provider` | `Provider` | ethers v6 provider |
| `options.chain` | `ChainName?` | Chain name (auto-detected if omitted) |

### `registerDeparture(marker, options)`

Register an EXIT marker as a reputation signal via `giveFeedback()`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `marker` | `ExitMarkerLike` | EXIT departure marker |
| `options.signer` | `Signer` | ethers v6 signer |
| `options.agentId` | `bigint \| number` | Target agent ID |
| `options.chain` | `ChainName?` | Chain name (auto-detected if omitted) |
| `options.markerUri` | `string?` | URI to full marker (IPFS, HTTP) |

### `queryDepartures(agentId, options)`

Query NewFeedback events filtered by `tag1="departure"`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentId` | `bigint \| number` | Agent token ID |
| `options.provider` | `Provider` | ethers v6 provider |
| `options.chain` | `ChainName?` | Chain name (auto-detected if omitted) |

## Contract Addresses

Deterministic across all chains (CREATE2):

| Network | IdentityRegistry | ReputationRegistry |
|---------|------------------|--------------------|
| Mainnet | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Testnet | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

**Supported chains:** Ethereum, Base, Arbitrum, Optimism, Avalanche, BSC, Celo, Gnosis, Abstract, GOAT, Sepolia, Base Sepolia, Arbitrum Sepolia.

## Feedback Signal Format

Departures are encoded as ReputationRegistry feedback:

```
giveFeedback(agentId, 0, 0, "departure", origin, "", markerUri, markerHash)
```

- `value=0` — neutral signal (departure is informational, not positive/negative)
- `tag1="departure"` — indexed for efficient querying
- `tag2=origin` — the platform the agent departed from
- `feedbackURI` — pointer to full EXIT marker
- `feedbackHash` — keccak256 commitment of marker content

## Security Considerations

### Permissionless Feedback
ERC-8004's ReputationRegistry allows **anyone** to post feedback for any agent. This means fake departure records can be created at low cost (fractions of a cent on L2). Consumers of departure data should verify:
- The `msg.sender` is the agent's owner or authorized operator
- The `feedbackURI` resolves to a valid, signed EXIT marker
- The marker's cryptographic proof is valid

### Hash Salt
`computeMarkerHash()` automatically generates a 256-bit random salt to prevent brute-force attacks on the hash. The salt is returned alongside the hash and **must be stored** for later verification. Without the salt, the hash cannot be recomputed.

### On-Chain Data
Departure records written on-chain are **immutable**. The `origin` field (platform name) is stored in cleartext. Consider privacy implications before registering departures for sensitive platforms.

### Known Limitations
- **Three-DID problem:** EXIT markers use `did:key`, ERC-8004 derives `did:pkh`, and registration files may declare other DIDs. These are not cryptographically linked in v0.1.0.
- **Ed25519/secp256k1 mismatch:** EXIT proofs use Ed25519 or P-256, but `did:pkh` resolves to secp256k1 keys. Cross-algorithm binding is not yet implemented.

## Ecosystem

| Package | Language | Description |
|---------|----------|-------------|
| [cellar-door-exit](https://github.com/CellarDoorExits/exit-door) | TypeScript | Core protocol (reference impl) |
| [cellar-door-exit](https://github.com/CellarDoorExits/exit-python) | Python | Core protocol |
| [cellar-door-entry](https://github.com/CellarDoorExits/entry-door) | TypeScript | Arrival/entry markers |
| [@cellar-door/langchain](https://github.com/CellarDoorExits/langchain) | TypeScript | LangChain integration |
| [cellar-door-langchain](https://github.com/CellarDoorExits/cellar-door-langchain-python) | Python | LangChain integration |
| [@cellar-door/vercel-ai-sdk](https://github.com/CellarDoorExits/vercel-ai-sdk) | TypeScript | Vercel AI SDK |
| [@cellar-door/mcp-server](https://github.com/CellarDoorExits/mcp-server) | TypeScript | MCP server |
| [@cellar-door/eliza](https://github.com/CellarDoorExits/eliza-exit) | TypeScript | ElizaOS plugin |
| [@cellar-door/eas](https://github.com/CellarDoorExits/eas-adapter) | TypeScript | EAS attestation anchoring |
| **[@cellar-door/erc-8004](https://github.com/CellarDoorExits/erc-8004-adapter)** | **TypeScript** | **ERC-8004 identity/reputation ← you are here** |
| [@cellar-door/sign-protocol](https://github.com/CellarDoorExits/sign-protocol-adapter) | TypeScript | Sign Protocol attestation |

**[Paper](https://cellar-door.dev/paper/) · [Website](https://cellar-door.dev)**

## License

Apache-2.0
