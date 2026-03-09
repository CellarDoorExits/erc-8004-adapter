/**
 * @cellar-door/erc-8004 — ERC-8004 adapter for EXIT Protocol
 *
 * Link EXIT departure markers to on-chain agent identities via the
 * ERC-8004 Trustless Agents IdentityRegistry and ReputationRegistry.
 *
 * @example
 * ```typescript
 * import { resolveAgent, registerDeparture, queryDepartures } from '@cellar-door/erc-8004';
 * import { JsonRpcProvider, Wallet } from 'ethers';
 *
 * const provider = new JsonRpcProvider('https://mainnet.base.org');
 * const agent = await resolveAgent(1n, { provider, chain: 'base' });
 *
 * const signer = new Wallet(privateKey, provider);
 * const result = await registerDeparture(marker, { signer, agentId: 1n });
 *
 * const departures = await queryDepartures(1n, { provider });
 * ```
 *
 * @packageDocumentation
 */

// Core operations
export { resolveAgent, addressToDid } from './identity.js';
export { registerDeparture, computeMarkerHash } from './reputation.js';
export { queryDepartures } from './query.js';

// Chain configuration
export { CHAIN_CONFIGS, getChainConfig, chainIdToName } from './chains.js';

// Types
export type {
  ChainName,
  ChainConfig,
  NetworkType,
  AgentIdentity,
  ExitType,
  ExitMarkerLike,
  TxOverrides,
  RegisterDepartureOptions,
  RegisterDepartureResult,
  QueryDeparturesOptions,
  DepartureRecord,
  ResolveAgentOptions,
} from './types.js';
