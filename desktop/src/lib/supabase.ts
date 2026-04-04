import { createClient } from "@supabase/supabase-js";

// These will be configured per deployment.
// For local-only mode, auth is skipped entirely.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const isCloudEnabled = !!supabase;
