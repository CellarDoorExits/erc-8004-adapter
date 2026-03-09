import type { ChainConfig, ChainName, NetworkType } from './types.js';

// ═══════════════════════════════════════════
// Contract Addresses (deterministic via CREATE2)
// ═══════════════════════════════════════════

const MAINNET_ADDRESSES = {
  identityRegistryAddress: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputationRegistryAddress: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
} as const;

const TESTNET_ADDRESSES = {
  identityRegistryAddress: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  reputationRegistryAddress: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
} as const;

function addrs(network: NetworkType) {
  return network === 'mainnet' ? MAINNET_ADDRESSES : TESTNET_ADDRESSES;
}

// ═══════════════════════════════════════════
// Chain Configs
// ═══════════════════════════════════════════

export const CHAIN_CONFIGS: Record<ChainName, ChainConfig> = {
  ethereum: {
    name: 'ethereum',
    chainId: 1,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  base: {
    name: 'base',
    chainId: 8453,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  arbitrum: {
    name: 'arbitrum',
    chainId: 42161,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  optimism: {
    name: 'optimism',
    chainId: 10,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  avalanche: {
    name: 'avalanche',
    chainId: 43114,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  bsc: {
    name: 'bsc',
    chainId: 56,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  celo: {
    name: 'celo',
    chainId: 42220,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  gnosis: {
    name: 'gnosis',
    chainId: 100,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  abstract: {
    name: 'abstract',
    chainId: 2741,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  goat: {
    name: 'goat',
    chainId: 2345,
    network: 'mainnet',
    ...addrs('mainnet'),
  },
  sepolia: {
    name: 'sepolia',
    chainId: 11155111,
    network: 'testnet',
    ...addrs('testnet'),
  },
  'base-sepolia': {
    name: 'base-sepolia',
    chainId: 84532,
    network: 'testnet',
    ...addrs('testnet'),
  },
  'arbitrum-sepolia': {
    name: 'arbitrum-sepolia',
    chainId: 421614,
    network: 'testnet',
    ...addrs('testnet'),
  },
};

/**
 * Look up chain config by name.
 */
export function getChainConfig(chain: ChainName = 'base'): ChainConfig {
  const config = CHAIN_CONFIGS[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`);
  }
  return config;
}

/**
 * Resolve a chain name from a chain ID.
 */
export function chainIdToName(chainId: number): ChainName | undefined {
  for (const [name, config] of Object.entries(CHAIN_CONFIGS)) {
    if (config.chainId === chainId) return name as ChainName;
  }
  return undefined;
}
