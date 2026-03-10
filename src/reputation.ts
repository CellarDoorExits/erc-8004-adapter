import { Contract, keccak256 as ethersKeccak256, AbiCoder, toUtf8Bytes } from 'ethers';
import {
  computeMarkerHash as coreComputeMarkerHash,
  computeArrivalHash as coreComputeArrivalHash,
} from '@cellar-door/attestation-core';
import type { MarkerHashResult } from '@cellar-door/attestation-core';
import { keccak256 as viemKeccak256, toHex } from 'viem';
import { getChainConfig, chainIdToName } from './chains.js';
import type {
  ExitMarkerLike,
  ArrivalMarkerLike,
  RegisterDepartureOptions,
  RegisterDepartureResult,
  RegisterArrivalOptions,
  RegisterArrivalResult,
  ChainName,
  TxOverrides,
} from './types.js';
import ReputationRegistryABI from './abis/ReputationRegistry.json' with { type: 'json' };

/**
 * Compute the keccak256 hash of an EXIT marker for on-chain commitment.
 *
 * Delegates to @cellar-door/attestation-core for cross-adapter consistency.
 * All adapters (EAS, Sign Protocol, ERC-8004) now produce identical hashes
 * for the same marker + salt combination.
 */
export function computeMarkerHash(marker: ExitMarkerLike, salt?: string): { hash: string; salt: string } {
  // Normalize salt: attestation-core expects a 0x-prefixed bytes32 Hex value.
  // Legacy callers may pass plain hex strings or arbitrary strings.
  let normalizedSalt: `0x${string}` | undefined;
  if (salt !== undefined) {
    if (salt.startsWith('0x') && salt.length === 66) {
      normalizedSalt = salt as `0x${string}`;
    } else {
      // Hash arbitrary salt strings into a deterministic bytes32
      normalizedSalt = viemKeccak256(toHex(salt));
    }
  }
  const result: MarkerHashResult = coreComputeMarkerHash(marker, normalizedSalt);
  return { hash: result.hash, salt: result.salt };
}

/**
 * Register an EXIT departure marker as a reputation signal on the ReputationRegistry.
 *
 * Calls `giveFeedback()` with:
 * - value=0, valueDecimals=0 (neutral signal)
 * - tag1="departure"
 * - tag2=origin platform identifier
 * - endpoint="" (unused)
 * - feedbackURI=marker URI (IPFS, HTTP, etc.)
 * - feedbackHash=keccak256 of marker content (ABI-encoded, salted)
 *
 * @param marker - The EXIT marker to register
 * @param options - Signer, agentId, chain, and optional tx overrides
 * @returns Transaction hash, block number, and feedback index
 */
export async function registerDeparture(
  marker: ExitMarkerLike,
  options: RegisterDepartureOptions,
): Promise<RegisterDepartureResult> {
  const { signer } = options;

  // Detect chain from signer if not specified
  let chainName: ChainName | undefined = options.chain;
  if (!chainName && signer.provider) {
    const network = await signer.provider.getNetwork();
    chainName = chainIdToName(Number(network.chainId));
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${network.chainId}. Pass chain explicitly.`);
    }
  }
  if (!chainName) {
    throw new Error('Cannot detect chain. Pass chain explicitly or use a signer with a provider.');
  }

  const config = getChainConfig(chainName);
  const registry = new Contract(
    config.reputationRegistryAddress,
    ReputationRegistryABI,
    signer,
  );

  const agentId = BigInt(options.agentId);
  const { hash: feedbackHash, salt: usedSalt } = computeMarkerHash(marker, options.hashSalt);
  const feedbackURI = options.markerUri ?? '';

  // Build tx overrides (gas limit, fees, nonce)
  const overrides: Record<string, unknown> = {};
  if (options.txOverrides?.gasLimit) overrides.gasLimit = options.txOverrides.gasLimit;
  if (options.txOverrides?.maxFeePerGas) overrides.maxFeePerGas = options.txOverrides.maxFeePerGas;
  if (options.txOverrides?.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = options.txOverrides.maxPriorityFeePerGas;
  if (options.txOverrides?.nonce !== undefined) overrides.nonce = options.txOverrides.nonce;

  // Dry run: estimate gas to catch reverts before submitting
  try {
    await registry.giveFeedback.estimateGas(
      agentId, 0, 0, 'departure', marker.origin, '', feedbackURI, feedbackHash,
    );
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    throw new Error(`Transaction would revert: ${msg}`);
  }

  const tx = await registry.giveFeedback(
    agentId,
    0,        // value (neutral)
    0,        // valueDecimals
    'departure',        // tag1
    marker.origin,      // tag2
    '',                 // endpoint
    feedbackURI,        // feedbackURI
    feedbackHash,       // feedbackHash
    ...(Object.keys(overrides).length > 0 ? [overrides] : []),
  );

  // Wait for receipt with timeout
  const timeoutMs = options.receiptTimeoutMs ?? 60_000;
  const receipt = await Promise.race([
    tx.wait(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Transaction receipt timeout after ${timeoutMs}ms. txHash: ${tx.hash}`)), timeoutMs),
    ),
  ]) as Awaited<ReturnType<typeof tx.wait>>;

  // Parse the NewFeedback event to get feedbackIndex
  let feedbackIndex = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'NewFeedback') {
        feedbackIndex = BigInt(parsed.args.feedbackIndex);
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    feedbackIndex,
    salt: usedSalt,
  };
}

/**
 * Compute the keccak256 hash of an arrival marker for on-chain commitment.
 *
 * Delegates to @cellar-door/attestation-core for cross-adapter consistency.
 */
export function computeArrivalMarkerHash(marker: ArrivalMarkerLike, salt?: string): { hash: string; salt: string } {
  let normalizedSalt: `0x${string}` | undefined;
  if (salt !== undefined) {
    if (salt.startsWith('0x') && salt.length === 66) {
      normalizedSalt = salt as `0x${string}`;
    } else {
      normalizedSalt = viemKeccak256(toHex(salt));
    }
  }
  const result: MarkerHashResult = coreComputeArrivalHash(marker, normalizedSalt);
  return { hash: result.hash, salt: result.salt };
}

/**
 * Register an arrival marker as a reputation signal on the ReputationRegistry.
 *
 * Calls `giveFeedback()` with:
 * - value=0, valueDecimals=0 (neutral signal)
 * - tag1="arrival"
 * - tag2=destination identifier
 * - endpoint=departureRef (links to originating departure)
 * - feedbackURI=marker URI
 * - feedbackHash=keccak256 of arrival marker content (ABI-encoded, salted)
 */
export async function registerArrival(
  marker: ArrivalMarkerLike,
  options: RegisterArrivalOptions,
): Promise<RegisterArrivalResult> {
  const { signer } = options;

  let chainName: ChainName | undefined = options.chain;
  if (!chainName && signer.provider) {
    const network = await signer.provider.getNetwork();
    chainName = chainIdToName(Number(network.chainId));
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${network.chainId}. Pass chain explicitly.`);
    }
  }
  if (!chainName) {
    throw new Error('Cannot detect chain. Pass chain explicitly or use a signer with a provider.');
  }

  const config = getChainConfig(chainName);
  const registry = new Contract(
    config.reputationRegistryAddress,
    ReputationRegistryABI,
    signer,
  );

  const agentId = BigInt(options.agentId);
  const { hash: feedbackHash, salt: usedSalt } = computeArrivalMarkerHash(marker, options.hashSalt);
  const feedbackURI = options.markerUri ?? '';

  const overrides: Record<string, unknown> = {};
  if (options.txOverrides?.gasLimit) overrides.gasLimit = options.txOverrides.gasLimit;
  if (options.txOverrides?.maxFeePerGas) overrides.maxFeePerGas = options.txOverrides.maxFeePerGas;
  if (options.txOverrides?.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = options.txOverrides.maxPriorityFeePerGas;
  if (options.txOverrides?.nonce !== undefined) overrides.nonce = options.txOverrides.nonce;

  // Dry run
  try {
    await registry.giveFeedback.estimateGas(
      agentId, 0, 0, 'arrival', marker.destination, marker.departureRef, feedbackURI, feedbackHash,
    );
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    throw new Error(`Transaction would revert: ${msg}`);
  }

  const tx = await registry.giveFeedback(
    agentId,
    0,                       // value (neutral)
    0,                       // valueDecimals
    'arrival',               // tag1
    marker.destination,      // tag2
    marker.departureRef,     // endpoint (links to departure)
    feedbackURI,             // feedbackURI
    feedbackHash,            // feedbackHash
    ...(Object.keys(overrides).length > 0 ? [overrides] : []),
  );

  const timeoutMs = options.receiptTimeoutMs ?? 60_000;
  const receipt = await Promise.race([
    tx.wait(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Transaction receipt timeout after ${timeoutMs}ms. txHash: ${tx.hash}`)), timeoutMs),
    ),
  ]) as Awaited<ReturnType<typeof tx.wait>>;

  let feedbackIndex = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'NewFeedback') {
        feedbackIndex = BigInt(parsed.args.feedbackIndex);
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    feedbackIndex,
    salt: usedSalt,
  };
}
