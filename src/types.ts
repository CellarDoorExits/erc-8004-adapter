import type { Signer, Provider } from 'ethers';

// ═══════════════════════════════════════════
// Chain Configuration
// ═══════════════════════════════════════════

export type ChainName =
  | 'ethereum' | 'base' | 'arbitrum' | 'optimism'
  | 'avalanche' | 'bsc' | 'celo' | 'gnosis' | 'abstract' | 'goat'
  | 'sepolia' | 'base-sepolia' | 'arbitrum-sepolia';

export type NetworkType = 'mainnet' | 'testnet';

export interface ChainConfig {
  readonly name: ChainName;
  readonly chainId: number;
  readonly network: NetworkType;
  readonly identityRegistryAddress: string;
  readonly reputationRegistryAddress: string;
}

// ═══════════════════════════════════════════
// Agent Identity
// ═══════════════════════════════════════════

export interface AgentIdentity {
  /** Agent token ID in the IdentityRegistry */
  agentId: bigint;
  /** Owner (custodian) address */
  owner: string;
  /** Agent's own wallet address (if set) */
  agentWallet?: string;
  /** Agent registration file URI */
  agentURI?: string;
  /** Primary DID: derived from agent wallet (or owner if no wallet set) */
  did: string;
  /** Controller DID: always derived from owner address */
  controllerDid: string;
}

// ═══════════════════════════════════════════
// EXIT Marker (subset needed for registration)
// ═══════════════════════════════════════════

export type ExitType = 'voluntary' | 'forced' | 'emergency' | 'keyCompromise' | 'platform_shutdown' | 'directed' | 'constructive' | 'acquisition';
export type ExitStatus = 'good_standing' | 'disputed' | 'unverified';

export interface ExitMarkerLike {
  id: string;
  subject: string;
  origin: string;
  timestamp: string | number;
  exitType: ExitType;
}

// ═══════════════════════════════════════════
// Transaction Overrides
// ═══════════════════════════════════════════

export interface TxOverrides {
  gasLimit?: bigint | number;
  maxFeePerGas?: bigint | number;
  maxPriorityFeePerGas?: bigint | number;
  nonce?: number;
}

// ═══════════════════════════════════════════
// Departure Registration
// ═══════════════════════════════════════════

export interface RegisterDepartureOptions {
  signer: Signer;
  agentId: bigint | number;
  chain?: ChainName;
  /** URI pointing to the full EXIT marker (e.g. IPFS) */
  markerUri?: string;
  /** Salt for marker hash (prevents rainbow table attacks on deterministic hashes) */
  hashSalt?: string;
  /** Transaction overrides (gas, nonce, fees) */
  txOverrides?: TxOverrides;
  /** Timeout in ms for receipt waiting (default: 60000) */
  receiptTimeoutMs?: number;
}

export interface RegisterDepartureResult {
  txHash: string;
  blockNumber: number;
  feedbackIndex: bigint;
  /** Salt used for marker hash — store this for later verification */
  salt: string;
}

// ═══════════════════════════════════════════
// Query
// ═══════════════════════════════════════════

export interface QueryDeparturesOptions {
  provider: Provider;
  chain?: ChainName;
  /** Start block (0 = genesis, negative = relative to latest) */
  fromBlock?: number;
  /** End block (default: 'latest') */
  toBlock?: number | string;
  /** Max departures to return (from most recent) */
  limit?: number;
}

export interface DepartureRecord {
  origin: string;
  exitType: string;
  timestamp: number;
  feedbackURI: string;
  feedbackHash: string;
  txHash: string;
  blockNumber: number;
}

// ═══════════════════════════════════════════
// Arrival Registration
// ═══════════════════════════════════════════

export interface ArrivalMarkerLike {
  id: string;
  subject: string;
  destination: string;
  timestamp: string | number;
  /** Reference to the departure marker this arrival corresponds to */
  departureRef: string;
}

export interface RegisterArrivalOptions {
  signer: Signer;
  agentId: bigint | number;
  chain?: ChainName;
  /** URI pointing to the full arrival marker (e.g. IPFS) */
  markerUri?: string;
  /** Salt for marker hash */
  hashSalt?: string;
  /** Transaction overrides (gas, nonce, fees) */
  txOverrides?: TxOverrides;
  /** Timeout in ms for receipt waiting (default: 60000) */
  receiptTimeoutMs?: number;
}

export interface RegisterArrivalResult {
  txHash: string;
  blockNumber: number;
  feedbackIndex: bigint;
  /** Salt used for marker hash — store this for later verification */
  salt: string;
}

// ═══════════════════════════════════════════
// Arrival Query
// ═══════════════════════════════════════════

export interface QueryArrivalsOptions {
  provider: Provider;
  chain?: ChainName;
  fromBlock?: number;
  toBlock?: number | string;
  limit?: number;
}

export interface ArrivalRecord {
  destination: string;
  departureRef: string;
  timestamp: number;
  feedbackURI: string;
  feedbackHash: string;
  txHash: string;
  blockNumber: number;
}

// ═══════════════════════════════════════════
// Resolve Options
// ═══════════════════════════════════════════

export interface ResolveAgentOptions {
  provider: Provider;
  chain?: ChainName;
}
