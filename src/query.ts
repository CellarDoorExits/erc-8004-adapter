import { Contract, EventLog } from 'ethers';
import { getChainConfig, chainIdToName } from './chains.js';
import type { DepartureRecord, QueryDeparturesOptions, ArrivalRecord, QueryArrivalsOptions, ChainName } from './types.js';
import ReputationRegistryABI from './abis/ReputationRegistry.json' with { type: 'json' };

/**
 * Query an agent's EXIT departure history from the ReputationRegistry.
 *
 * Searches for NewFeedback events where tag1="departure" for the given agent.
 * Returns decoded departure records with origin, timestamps, and tx info.
 *
 * Supports block range limits and pagination to avoid RPC scanning issues.
 *
 * @param agentId - The agent's token ID
 * @param options - Provider, chain, and optional block range / limit
 * @returns Array of departure records
 *
 * @example
 * ```typescript
 * const departures = await queryDepartures(1n, {
 *   provider,
 *   chain: 'base',
 *   fromBlock: -100000, // last 100k blocks (negative = relative to latest)
 *   limit: 50,
 * });
 * ```
 */
export async function queryDepartures(
  agentId: bigint | number,
  options: QueryDeparturesOptions,
): Promise<DepartureRecord[]> {
  const { provider } = options;

  let chainName: ChainName | undefined = options.chain;
  if (!chainName) {
    const network = await provider.getNetwork();
    chainName = chainIdToName(Number(network.chainId));
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${network.chainId}. Pass chain explicitly.`);
    }
  }

  const config = getChainConfig(chainName);
  const registry = new Contract(
    config.reputationRegistryAddress,
    ReputationRegistryABI,
    provider,
  );

  const id = BigInt(agentId);

  // Determine block range
  let fromBlock: number | string = options.fromBlock ?? 0;
  const toBlock: number | string = options.toBlock ?? 'latest';

  // Negative fromBlock = relative to latest
  if (typeof fromBlock === 'number' && fromBlock < 0) {
    const latest = await provider.getBlockNumber();
    fromBlock = Math.max(0, latest + fromBlock);
  }

  // Filter NewFeedback events by agentId and tag1="departure"
  const filter = registry.filters.NewFeedback(id, null, null, null, null, 'departure');
  const events = await registry.queryFilter(filter, fromBlock, toBlock);

  const limit = options.limit ?? events.length;
  const departures: DepartureRecord[] = [];

  // Batch block timestamps: collect unique block numbers, fetch once each
  const relevantEvents = events.slice(-limit); // take last N
  const blockNumbers = [...new Set(relevantEvents.map(e => e.blockNumber))];
  const blockTimestamps = new Map<number, number>();

  // Fetch blocks in parallel (batched, not N+1)
  const blocks = await Promise.all(
    blockNumbers.map(n => provider.getBlock(n)),
  );
  for (const block of blocks) {
    if (block) blockTimestamps.set(block.number, block.timestamp);
  }

  for (const event of relevantEvents) {
    if (!(event instanceof EventLog)) continue;

    const args = event.args;
    departures.push({
      origin: args.tag2,
      exitType: 'voluntary', // Default; full type info is in the feedbackURI
      timestamp: blockTimestamps.get(event.blockNumber) ?? 0,
      feedbackURI: args.feedbackURI,
      feedbackHash: args.feedbackHash,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  }

  return departures;
}

/**
 * Query an agent's arrival history from the ReputationRegistry.
 *
 * Searches for NewFeedback events where tag1="arrival" for the given agent.
 */
export async function queryArrivals(
  agentId: bigint | number,
  options: QueryArrivalsOptions,
): Promise<ArrivalRecord[]> {
  const { provider } = options;

  let chainName: ChainName | undefined = options.chain;
  if (!chainName) {
    const network = await provider.getNetwork();
    chainName = chainIdToName(Number(network.chainId));
    if (!chainName) {
      throw new Error(`Unknown chain ID: ${network.chainId}. Pass chain explicitly.`);
    }
  }

  const config = getChainConfig(chainName);
  const registry = new Contract(
    config.reputationRegistryAddress,
    ReputationRegistryABI,
    provider,
  );

  const id = BigInt(agentId);

  let fromBlock: number | string = options.fromBlock ?? 0;
  const toBlock: number | string = options.toBlock ?? 'latest';

  if (typeof fromBlock === 'number' && fromBlock < 0) {
    const latest = await provider.getBlockNumber();
    fromBlock = Math.max(0, latest + fromBlock);
  }

  const filter = registry.filters.NewFeedback(id, null, null, null, null, 'arrival');
  const events = await registry.queryFilter(filter, fromBlock, toBlock);

  const limit = options.limit ?? events.length;
  const relevantEvents = events.slice(-limit);
  const blockNumbers = [...new Set(relevantEvents.map(e => e.blockNumber))];
  const blockTimestamps = new Map<number, number>();

  const blocks = await Promise.all(
    blockNumbers.map(n => provider.getBlock(n)),
  );
  for (const block of blocks) {
    if (block) blockTimestamps.set(block.number, block.timestamp);
  }

  const arrivals: ArrivalRecord[] = [];

  for (const event of relevantEvents) {
    if (!(event instanceof EventLog)) continue;

    const args = event.args;
    arrivals.push({
      destination: args.tag2,
      departureRef: args.endpoint,
      timestamp: blockTimestamps.get(event.blockNumber) ?? 0,
      feedbackURI: args.feedbackURI,
      feedbackHash: args.feedbackHash,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  }

  return arrivals;
}
