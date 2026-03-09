import { Contract, keccak256, AbiCoder } from 'ethers';
import { getChainConfig, chainIdToName } from './chains.js';
import type {
  ExitMarkerLike,
  RegisterDepartureOptions,
  RegisterDepartureResult,
  ChainName,
  TxOverrides,
} from './types.js';
import ReputationRegistryABI from './abis/ReputationRegistry.json' with { type: 'json' };

/**
 * Compute the keccak256 hash of an EXIT marker for on-chain commitment.
 *
 * Uses ABI encoding (not string concatenation) to prevent delimiter
 * collision attacks where field values containing separators produce
 * identical hashes for distinct markers.
 */
export function computeMarkerHash(marker: ExitMarkerLike, salt?: string): { hash: string; salt: string } {
  // Generate random salt if not provided to prevent brute-force attacks.
  // Origin is low-entropy, exitType has 4 values — ~40 attempts without salt.
  // The salt MUST be stored alongside the hash for later verification.
  if (!salt) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    salt = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  const ts = typeof marker.timestamp === 'string'
    ? Math.floor(new Date(marker.timestamp).getTime() / 1000)
    : Math.floor(Number(marker.timestamp) / 1000);

  const coder = AbiCoder.defaultAbiCoder();
  const hash = keccak256(
    coder.encode(
      ['string', 'string', 'string', 'uint256', 'string', 'string', 'string'],
      [
        'ExitDeparture',  // domain separator
        marker.id,
        marker.subject,
        ts,
        marker.origin,
        marker.exitType,
        salt,
      ],
    ),
  );
  return { hash, salt };
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
