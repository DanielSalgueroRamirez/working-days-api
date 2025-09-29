// src/types.ts
export interface ApiResponseSuccess {
  date: string; // UTC ISO 8601 con 'Z'
}

export interface ApiResponseError {
  error: 'InvalidParameters' | 'FetchError' | string;
  message: string;
}
