import { describe, it, expect } from 'vitest';
import { computeMarkerHash } from '../reputation.js';
import type { ExitMarkerLike } from '../types.js';

const marker: ExitMarkerLike = {
  id: 'urn:exit:test:001',
  subject: 'did:pkh:eip155:8453:0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
  origin: 'did:web:example.com',
  timestamp: '2025-01-01T00:00:00Z',
  exitType: 'voluntary',
};

// A valid bytes32 hex salt for deterministic tests
const FIXED_SALT = '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const FIXED_SALT_B = '0x1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100';

describe('computeMarkerHash', () => {
  it('produces a keccak256 hash with auto-generated salt', () => {
    const result = computeMarkerHash(marker);
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('is deterministic with explicit salt', () => {
    const r1 = computeMarkerHash(marker, FIXED_SALT);
    const r2 = computeMarkerHash(marker, FIXED_SALT);
    expect(r1.hash).toBe(r2.hash);
    expect(r1.salt).toBe(FIXED_SALT);
  });

  it('normalizes non-hex salts deterministically', () => {
    // Legacy callers passing plain strings get them hashed to bytes32
    const r1 = computeMarkerHash(marker, 'fixed-salt');
    const r2 = computeMarkerHash(marker, 'fixed-salt');
    expect(r1.hash).toBe(r2.hash);
    expect(r1.salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('auto-generates different salts each call', () => {
    const r1 = computeMarkerHash(marker);
    const r2 = computeMarkerHash(marker);
    expect(r1.salt).not.toBe(r2.salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces different hashes for different markers', () => {
    const r1 = computeMarkerHash(marker, FIXED_SALT);
    const r2 = computeMarkerHash({ ...marker, id: 'urn:exit:test:002' }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('handles numeric timestamps', () => {
    const numericMarker = { ...marker, timestamp: 1704067200000 };
    const result = computeMarkerHash(numericMarker, FIXED_SALT);
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('includes origin in hash', () => {
    const r1 = computeMarkerHash(marker, FIXED_SALT);
    const r2 = computeMarkerHash({ ...marker, origin: 'did:web:other.com' }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('includes exitType in hash', () => {
    const r1 = computeMarkerHash(marker, FIXED_SALT);
    const r2 = computeMarkerHash({ ...marker, exitType: 'forced' as const }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('is not vulnerable to delimiter collision', () => {
    const marker1 = { ...marker, id: 'a,b', subject: 'c' };
    const marker2 = { ...marker, id: 'a', subject: 'b,c' };
    const r1 = computeMarkerHash(marker1, FIXED_SALT);
    const r2 = computeMarkerHash(marker2, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces different hashes with different salts', () => {
    const r1 = computeMarkerHash(marker, FIXED_SALT);
    const r2 = computeMarkerHash(marker, FIXED_SALT_B);
    expect(r1.hash).not.toBe(r2.hash);
  });
});
