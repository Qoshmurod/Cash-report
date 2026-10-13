import type { ApiErrorCode } from '~/types/api'

export class ApiError extends Error {
  readonly statusCode: number
  readonly code: ApiErrorCode | string
  readonly details?: unknown

  constructor(statusCode: number, code: ApiErrorCode | string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  get validationMessages(): string[] {
    if (Array.isArray(this.details)) return this.details.filter((d): d is string => typeof d === 'string')
    return []
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}
