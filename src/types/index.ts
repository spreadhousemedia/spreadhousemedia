export type QrStatus = 'active' | 'inactive'

/** Never includes password_hash — admin queries always select an explicit column list. */
export interface QrCode {
  id: string
  qr_number: string
  qr_name: string
  destination_url: string | null
  status: QrStatus
  batch_id: string | null
  password_changed?: boolean
  claimed_at?: string | null
  owner_email?: string | null
  requires_setup_code?: boolean
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  batch_name: string
  series_prefix: string
  start_number: string
  end_number: string
  total_qr_codes: number
  created_at: string
  updated_at: string
}

export type PasswordMode = 'common' | 'unique'

export const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'QR code not found. Please check the QR number and try again.',
  inactive: 'This QR code is inactive. Please contact the administrator.',
  invalid_url: 'Please enter a valid URL.',
  wrong_password: 'Incorrect password. Please enter the correct password.',
  wrong_setup_code: 'Incorrect setup code. Please check the code printed on your packaging slip.',
  already_claimed: 'This QR card is already activated. Please use your personal password to update the link.',
  password_mismatch: 'Passwords do not match.',
  rate_limited: 'Too many attempts. Please try again later.',
  too_many_attempts: 'Too many incorrect attempts. Temporary cooldown active. Please wait 5 minutes before trying again.',
  missing_setup_code: 'Packaging setup code is required to activate this card.',
  duplicate_qr_number: 'This QR number already exists.',
  invalid_qr_number: 'QR numbers may only contain letters, numbers, hyphens and underscores.',
  missing_qr_name: 'QR name is required.',
  password_too_short: 'Password must be at least 4 characters.',
  invalid_status: 'Invalid status.',
  batch_name_required: 'Batch name is required.',
  invalid_range_format: 'Start and end numbers must be numeric.',
  start_after_end: 'Start number must not be greater than the end number.',
  range_too_large: 'That range is too large (max 5000 QR codes per batch).',
  invalid_prefix: 'Series prefix must be 1-10 letters/numbers.',
  invalid_password_mode: 'Invalid password mode.',
  invalid_default_url: 'Please enter a valid default destination URL.',
  duplicates: 'Some QR numbers in this range already exist.',
  unauthorized: 'You are not authorized to perform this action.',
}

export function rpcErrorMessage(code: string | undefined | null): string {
  if (!code) return 'Something went wrong. Please check your Supabase connection and try again.'

  if (RPC_ERROR_MESSAGES[code]) {
    return RPC_ERROR_MESSAGES[code]
  }

  // Diagnostic logging for developers & users
  console.error('[Supabase Error Diagnostic]:', code)

  const lower = code.toLowerCase()
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Database connection failed. Please check your internet or Supabase URL in .env.'
  }
  if (lower.includes('function') && lower.includes('does not exist')) {
    return 'Database function is missing. Please run the supabase_schema.sql script in your Supabase SQL Editor.'
  }
  if (lower.includes('relation') && lower.includes('does not exist')) {
    return 'Database tables are missing. Please run the supabase_schema.sql script in your Supabase SQL Editor.'
  }
  if (lower.includes('permission denied') || lower.includes('row-level security')) {
    return 'Permission denied. Please verify your Supabase API keys and RLS policies.'
  }

  return code
}
