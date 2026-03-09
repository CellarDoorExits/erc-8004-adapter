import { Contract, getAddress } from 'ethers';
import { getChainConfig, chainIdToName } from './chains.js';
import type { AgentIdentity, ResolveAgentOptions, ChainName } from './types.js';
import IdentityRegistryABI from './abis/IdentityRegistry.json' with { type: 'json' };

/**
 * Build a did:pkh DID from an Ethereum address and chain ID.
 */
export function addressToDid(address: string, chainId: number): string {
  return `did:pkh:eip155:${chainId}:${getAddress(address)}`;
}

/**
 * Resolve an ERC-8004 agent's on-chain identity.
 *
 * Queries the IdentityRegistry for the agent's owner, agent wallet,
 * and agentURI. The primary DID is derived from the agent wallet
 * (the agent's own address), not the owner (the custodian).
 *
 * @param agentId - The agent's token ID in the IdentityRegistry
 * @param options - Provider and optional chain name
 * @returns The agent's identity including DID
 *
 * @example
 * ```typescript
 * const agent = await resolveAgent(1n, { provider, chain: 'base' });
 * console.log(agent.did);           // did:pkh:eip155:8453:0x<agentWallet>
 * console.log(agent.controllerDid); // did:pkh:eip155:8453:0x<owner>
 * ```
 */
export async function resolveAgent(
  agentId: bigint | number,
  options: ResolveAgentOptions,
): Promise<AgentIdentity> {
  const { provider } = options;

  // Detect chain from provider if not specified
  let chainName: ChainName | undefined = options.chain;
  if (!chainName) {
    const network = await provider.getNetwork();
    chainName = chainIdToName(Number(network.chainId));
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${network.chainId}. Supported: ${Object.keys(getChainConfig).length ? 'see CHAIN_CONFIGS' : 'pass chain explicitly'}.`);
    }
  }

  const config = getChainConfig(chainName);
  const registry = new Contract(
    config.identityRegistryAddress,
    IdentityRegistryABI,
    provider,
  );

  const id = BigInt(agentId);

  // Query owner, tokenURI, and agent wallet — use allSettled for partial results
  const [ownerResult, uriResult, walletResult] = await Promise.allSettled([
    registry.ownerOf(id) as Promise<string>,
    registry.tokenURI(id) as Promise<string>,
    registry.getAgentWallet(id) as Promise<string>,
  ]);

  // ownerOf is required — if it fails, the agent doesn't exist
  if (ownerResult.status === 'rejected') {
    const reason = ownerResult.reason?.message ?? String(ownerResult.reason);
    if (reason.includes('invalid token') || reason.includes('nonexistent') || reason.includes('ERC721')) {
      throw new Error(`Agent ${id} not found in IdentityRegistry on ${chainName}.`);
    }
    throw new Error(`Failed to resolve agent ${id}: ${reason}`);
  }

  const owner = getAddress(ownerResult.value);
  const agentURI = uriResult.status === 'fulfilled' ? uriResult.value : undefined;

  // Agent wallet may not be set — fall back to owner for DID
  const agentWallet = walletResult.status === 'fulfilled' && walletResult.value !== '0x0000000000000000000000000000000000000000'
    ? getAddress(walletResult.value)
    : undefined;

  // Primary DID: agent wallet (the actor). Fallback: owner (the custodian).
  const didAddress = agentWallet ?? owner;
  const did = addressToDid(didAddress, config.chainId);
  const controllerDid = addressToDid(owner, config.chainId);

  return {
    agentId: id,
    owner,
    agentWallet,
    agentURI,
    did,
    controllerDid,
  };
}
