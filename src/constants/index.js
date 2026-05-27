// Application constants

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
}

// Contract Status
export const CONTRACT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  EXPIRING: 'expiring',
  PENDING: 'pending'
}

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  MONTH_YEAR: 'MMMM YYYY'
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
}

// Colors for UI states
export const STATUS_COLORS = {
  [CONTRACT_STATUS.ACTIVE]: 'green',
  [CONTRACT_STATUS.EXPIRED]: 'red',
  [CONTRACT_STATUS.EXPIRING]: 'yellow',
  [CONTRACT_STATUS.PENDING]: 'blue'
}

// Animation durations
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
}

// Breakpoints
export const BREAKPOINTS = {
  SM: '30em',
  MD: '48em',
  LG: '62em',
  XL: '80em'
}

// Storage keys
export const STORAGE_KEYS = {
  USER: 'usuario',
  REMEMBERED_USER: 'recordarUsuario',
  THEME: 'theme',
  PREFERENCES: 'userPreferences'
}
