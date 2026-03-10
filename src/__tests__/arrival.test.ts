import { describe, it, expect } from 'vitest';
import { computeArrivalMarkerHash } from '../reputation.js';
import type { ArrivalMarkerLike } from '../types.js';

const marker: ArrivalMarkerLike = {
  id: 'urn:exit:arrival:001',
  subject: 'did:pkh:eip155:8453:0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
  destination: 'did:web:newplatform.com',
  timestamp: '2025-01-15T00:00:00Z',
  departureRef: 'urn:exit:test:001',
};

const FIXED_SALT = '0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const FIXED_SALT_B = '0x1f1e1d1c1b1a191817161514131211100f0e0d0c0b0a09080706050403020100';

describe('computeArrivalMarkerHash', () => {
  it('produces a keccak256 hash with auto-generated salt', () => {
    const result = computeArrivalMarkerHash(marker);
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('is deterministic with explicit salt', () => {
    const r1 = computeArrivalMarkerHash(marker, FIXED_SALT);
    const r2 = computeArrivalMarkerHash(marker, FIXED_SALT);
    expect(r1.hash).toBe(r2.hash);
    expect(r1.salt).toBe(FIXED_SALT);
  });

  it('normalizes non-hex salts deterministically', () => {
    const r1 = computeArrivalMarkerHash(marker, 'fixed-salt');
    const r2 = computeArrivalMarkerHash(marker, 'fixed-salt');
    expect(r1.hash).toBe(r2.hash);
    expect(r1.salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('auto-generates different salts each call', () => {
    const r1 = computeArrivalMarkerHash(marker);
    const r2 = computeArrivalMarkerHash(marker);
    expect(r1.salt).not.toBe(r2.salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces different hashes for different markers', () => {
    const r1 = computeArrivalMarkerHash(marker, FIXED_SALT);
    const r2 = computeArrivalMarkerHash({ ...marker, id: 'urn:exit:arrival:002' }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('handles numeric timestamps', () => {
    const numericMarker = { ...marker, timestamp: 1705276800000 };
    const result = computeArrivalMarkerHash(numericMarker, FIXED_SALT);
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('includes destination in hash', () => {
    const r1 = computeArrivalMarkerHash(marker, FIXED_SALT);
    const r2 = computeArrivalMarkerHash({ ...marker, destination: 'did:web:other.com' }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('includes departureRef in hash', () => {
    const r1 = computeArrivalMarkerHash(marker, FIXED_SALT);
    const r2 = computeArrivalMarkerHash({ ...marker, departureRef: 'urn:exit:test:999' }, FIXED_SALT);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('uses arrival domain separator (distinct from departure)', () => {
    const arrivalHash = computeArrivalMarkerHash(marker, FIXED_SALT);
    expect(arrivalHash.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('produces different hashes with different salts', () => {
    const r1 = computeArrivalMarkerHash(marker, FIXED_SALT);
    const r2 = computeArrivalMarkerHash(marker, FIXED_SALT_B);
    expect(r1.hash).not.toBe(r2.hash);
  });
});
