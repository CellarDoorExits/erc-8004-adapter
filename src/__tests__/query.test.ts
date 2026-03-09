import { describe, it, expect } from 'vitest';
import { CHAIN_CONFIGS } from '../chains.js';

describe('queryDepartures configuration', () => {
  it('all chains have reputationRegistryAddress', () => {
    for (const [name, config] of Object.entries(CHAIN_CONFIGS)) {
      expect(config.reputationRegistryAddress).toBeTruthy();
      expect(config.reputationRegistryAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it('mainnet and testnet addresses differ', () => {
    const base = CHAIN_CONFIGS.base;
    const sepolia = CHAIN_CONFIGS.sepolia;
    expect(base.reputationRegistryAddress).not.toBe(sepolia.reputationRegistryAddress);
  });
});
