import { createEntityId } from '../storage/entityIds';

export type PersistenceOperation =
  | 'publish_tournament_snapshot'
  | 'record_battle'
  | 'record_penalty'
  | 'undo_last_battle';

export type PersistenceErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT'
  | 'CONFLICT'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface MutationContext {
  requestId: string;
  idempotencyKey: string;
}

export interface PersistenceError {
  code: PersistenceErrorCode;
  message: string;
  requestId: string;
  retryable: boolean;
}

export interface PersistenceSuccess {
  success: true;
  message: string;
  requestId: string;
}

export interface PersistenceFailure {
  success: false;
  message: string;
  requestId: string;
  error: PersistenceError;
}

export type PersistenceResult = PersistenceSuccess | PersistenceFailure;

export function createMutationContext(
  operation: PersistenceOperation,
  stableKey: string
): MutationContext {
  return {
    requestId: createEntityId(),
    idempotencyKey: `${operation}:${stableKey}`,
  };
}

export function normalizePersistenceError(
  error: unknown,
  requestId: string,
  fallbackMessage = 'No se pudo completar la operación remota.'
): PersistenceError {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : fallbackMessage;
  const normalized = rawMessage.toLowerCase();

  let code: PersistenceErrorCode = 'UNKNOWN';
  if (normalized.includes('auth') || normalized.includes('session')) code = 'AUTH_REQUIRED';
  else if (normalized.includes('forbidden') || normalized.includes('permission')) code = 'FORBIDDEN';
  else if (normalized.includes('not_found') || normalized.includes('no encontrado')) code = 'NOT_FOUND';
  else if (normalized.includes('version_conflict')) code = 'VERSION_CONFLICT';
  else if (normalized.includes('conflict') || normalized.includes('duplicate')) code = 'CONFLICT';
  else if (normalized.includes('invalid') || normalized.includes('required')) code = 'VALIDATION_ERROR';
  else if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('timeout')) code = 'UNAVAILABLE';

  return {
    code,
    message: rawMessage || fallbackMessage,
    requestId,
    retryable: code === 'VERSION_CONFLICT' || code === 'UNAVAILABLE',
  };
}

export function failureFromPersistenceError(error: PersistenceError): PersistenceFailure {
  return {
    success: false,
    message: error.message,
    requestId: error.requestId,
    error,
  };
}

export function successFromPersistence(
  message: string,
  requestId: string
): PersistenceSuccess {
  return { success: true, message, requestId };
}
