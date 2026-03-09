import { describe, it, expect } from 'vitest';
import { addressToDid } from '../identity.js';
import { getChainConfig, chainIdToName, CHAIN_CONFIGS } from '../chains.js';

describe('addressToDid', () => {
  it('builds a did:pkh from address and chainId', () => {
    const did = addressToDid('0x1234567890abcdef1234567890abcdef12345678', 8453);
    expect(did).toMatch(/^did:pkh:eip155:8453:0x[0-9a-fA-F]{40}$/);
  });

  it('checksums the address', () => {
    const did = addressToDid('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 1);
    expect(did).toContain('0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF');
  });
});

describe('getChainConfig', () => {
  it('returns config for known chains', () => {
    const config = getChainConfig('base');
    expect(config.chainId).toBe(8453);
    expect(config.identityRegistryAddress).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
  });

  it('throws for unknown chains', () => {
    expect(() => getChainConfig('unknown' as any)).toThrow('Unsupported chain');
  });

  it('defaults to base', () => {
    expect(getChainConfig().name).toBe('base');
  });
});

describe('chainIdToName', () => {
  it('resolves chain ID to name', () => {
    expect(chainIdToName(8453)).toBe('base');
    expect(chainIdToName(1)).toBe('ethereum');
    expect(chainIdToName(11155111)).toBe('sepolia');
  });

  it('returns undefined for unknown chain ID', () => {
    expect(chainIdToName(999999)).toBeUndefined();
  });
});

describe('CHAIN_CONFIGS', () => {
  it('has mainnet addresses for mainnet chains', () => {
    const mainnetChains = Object.values(CHAIN_CONFIGS).filter(c => c.network === 'mainnet');
    expect(mainnetChains.length).toBeGreaterThan(5);
    for (const chain of mainnetChains) {
      expect(chain.identityRegistryAddress).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
      expect(chain.reputationRegistryAddress).toBe('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63');
    }
  });

  it('has testnet addresses for testnet chains', () => {
    const testnetChains = Object.values(CHAIN_CONFIGS).filter(c => c.network === 'testnet');
    expect(testnetChains.length).toBeGreaterThan(0);
    for (const chain of testnetChains) {
      expect(chain.identityRegistryAddress).toBe('0x8004A818BFB912233c491871b3d84c89A494BD9e');
      expect(chain.reputationRegistryAddress).toBe('0x8004B663056A597Dffe9eCcC1965A193B7388713');
    }
  });
});
