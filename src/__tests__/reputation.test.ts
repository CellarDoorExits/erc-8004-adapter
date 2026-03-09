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

describe('computeMarkerHash', () => {
  it('produces a deterministic keccak256 hash', () => {
    const hash1 = computeMarkerHash(marker);
    const hash2 = computeMarkerHash(marker);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('produces different hashes for different markers', () => {
    const hash1 = computeMarkerHash(marker);
    const hash2 = computeMarkerHash({ ...marker, id: 'urn:exit:test:002' });
    expect(hash1).not.toBe(hash2);
  });

  it('handles numeric timestamps', () => {
    const numericMarker = { ...marker, timestamp: 1704067200000 };
    const hash = computeMarkerHash(numericMarker);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('includes origin in hash', () => {
    const hash1 = computeMarkerHash(marker);
    const hash2 = computeMarkerHash({ ...marker, origin: 'did:web:other.com' });
    expect(hash1).not.toBe(hash2);
  });

  it('includes exitType in hash', () => {
    const hash1 = computeMarkerHash(marker);
    const hash2 = computeMarkerHash({ ...marker, exitType: 'involuntary' as const });
    expect(hash1).not.toBe(hash2);
  });

  it('is not vulnerable to delimiter collision', () => {
    // Fields containing commas should not collide with different field splits
    const marker1 = { ...marker, id: 'a,b', subject: 'c' };
    const marker2 = { ...marker, id: 'a', subject: 'b,c' };
    const hash1 = computeMarkerHash(marker1);
    const hash2 = computeMarkerHash(marker2);
    expect(hash1).not.toBe(hash2);
  });

  it('produces different hashes with different salts', () => {
    const hash1 = computeMarkerHash(marker);
    const hash2 = computeMarkerHash(marker, 'my-salt');
    expect(hash1).not.toBe(hash2);
  });
});
