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
  it('produces a keccak256 hash with auto-generated salt', () => {
    const result = computeMarkerHash(marker);
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.salt).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic with explicit salt', () => {
    const r1 = computeMarkerHash(marker, 'fixed-salt');
    const r2 = computeMarkerHash(marker, 'fixed-salt');
    expect(r1.hash).toBe(r2.hash);
    expect(r1.salt).toBe('fixed-salt');
  });

  it('auto-generates different salts each call', () => {
    const r1 = computeMarkerHash(marker);
    const r2 = computeMarkerHash(marker);
    expect(r1.salt).not.toBe(r2.salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces different hashes for different markers', () => {
    const salt = 'test-salt';
    const r1 = computeMarkerHash(marker, salt);
    const r2 = computeMarkerHash({ ...marker, id: 'urn:exit:test:002' }, salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('handles numeric timestamps', () => {
    const numericMarker = { ...marker, timestamp: 1704067200000 };
    const result = computeMarkerHash(numericMarker, 'salt');
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('includes origin in hash', () => {
    const salt = 'test-salt';
    const r1 = computeMarkerHash(marker, salt);
    const r2 = computeMarkerHash({ ...marker, origin: 'did:web:other.com' }, salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('includes exitType in hash', () => {
    const salt = 'test-salt';
    const r1 = computeMarkerHash(marker, salt);
    const r2 = computeMarkerHash({ ...marker, exitType: 'involuntary' as const }, salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('is not vulnerable to delimiter collision', () => {
    const salt = 'test-salt';
    const marker1 = { ...marker, id: 'a,b', subject: 'c' };
    const marker2 = { ...marker, id: 'a', subject: 'b,c' };
    const r1 = computeMarkerHash(marker1, salt);
    const r2 = computeMarkerHash(marker2, salt);
    expect(r1.hash).not.toBe(r2.hash);
  });

  it('produces different hashes with different salts', () => {
    const r1 = computeMarkerHash(marker, 'salt-a');
    const r2 = computeMarkerHash(marker, 'salt-b');
    expect(r1.hash).not.toBe(r2.hash);
  });
});
