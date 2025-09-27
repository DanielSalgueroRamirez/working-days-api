export interface ApiResponseSuccess {
  date: string; // UTC ISO 8601 con 'Z'
}

export interface ApiResponseError {
  error: 'InvalidParameters' | 'FetchError' | string;
  message: string;
}

export interface HolidayEntry {
  date: string; // "2025-01-01"
}
