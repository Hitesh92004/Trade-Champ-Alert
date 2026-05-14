import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Gracefully handle missing credentials — Supabase is optional
let supabase = null;
if (
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes("your_supabase") &&
  !SUPABASE_KEY.includes("your_supabase")
) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    console.warn("Supabase client creation failed — running without Supabase");
  }
}

export { supabase };
