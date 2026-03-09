# 𓉸 @cellar-door/erc-8004

EXIT Protocol adapter for [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) — link departure records to on-chain agent identities and reputation registries.

> **⚠️ Pre-release software — no formal security audit has been conducted.**

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

## License

Apache-2.0
