export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';

export const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 20, MAX_LIMIT: 100 } as const;

export const IMAGE_LIMITS = {
  MAX_BYTES: 2 * 1024 * 1024,
  MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as readonly string[],
} as const;

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 72,
  PATTERN: /^(?=.*[A-Za-z])(?=.*\d).+$/,
} as const;

export const CHECKOUT_LIMITS = { MAX_ITEMS: 20 } as const;
export const KIOSK_LIMITS = { MAX_SERVICES: 20 } as const;

/** A registrar "claims" a kiosk request for this long before another registrar may take it over. */
export const KIOSK_CLAIM_TIMEOUT_MINUTES = 10;

export const QUEUE_BOARD_LIMITS = { CURRENT: 12, WAITING: 20 } as const;

export const PG_UNIQUE_VIOLATION = '23505';
export const PG_FOREIGN_KEY_VIOLATION = '23503';

export const SEQUENCES = {
  PATIENT_CODE: 'patient_code_seq',
  KIOSK_REQUEST_NUMBER: 'kiosk_request_number_seq',
  RECEIPT_NUMBER: 'receipt_number_seq',
} as const;

export const WS_NAMESPACE = '/realtime';

export const WS_EVENTS = {
  QUEUE_UPDATED: 'queue:updated',
  QUEUE_CALLED: 'queue:called',
  KIOSK_NEW: 'kiosk:new',
  KIOSK_UPDATED: 'kiosk:updated',
  PAYMENT_UPDATED: 'payment:updated',
} as const;

export const WS_ROOMS = {
  BOARD: 'board',
  role: (role: string): string => `role:${role}`,
  user: (id: string): string => `user:${id}`,
  doctor: (id: string): string => `doctor:${id}`,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
