import { describe, expect, it } from 'vitest';
import {
  createMutationContext,
  normalizePersistenceError,
} from './contracts';

describe('Supabase persistence contracts', () => {
  it('creates stable idempotency keys and unique request IDs', () => {
    const first = createMutationContext('record_battle', 'battle-1');
    const second = createMutationContext('record_battle', 'battle-1');

    expect(first.idempotencyKey).toBe('record_battle:battle-1');
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.requestId).not.toBe(first.requestId);
  });

  it('normalizes concurrency errors into a retryable envelope', () => {
    const error = normalizePersistenceError(
      { message: 'version_conflict' },
      'request-1'
    );

    expect(error.code).toBe('VERSION_CONFLICT');
    expect(error.retryable).toBe(true);
    expect(error.requestId).toBe('request-1');
  });

  it('creates a distinct idempotency namespace for authorized reopening', () => {
    const mutation = createMutationContext('reopen_match', 'match-1:4');

    expect(mutation.idempotencyKey).toBe('reopen_match:match-1:4');
  });
});
