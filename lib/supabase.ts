import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

// Server-side client (service role)
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Browser client (anon key)
export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient<Database>(supabaseUrl, anonKey);
}

// Auth helpers for server
export async function getSession(request: Request) {
  const supabase = getSupabaseServerClient();
  const cookieHeader = request.headers.get("cookie") || "";

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(request: Request) {
  const supabase = getSupabaseServerClient();
  const session = await getSession(request);

  if (!session) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return data;
}

export async function signOut(request: Request) {
  const supabase = getSupabaseServerClient();
  return await supabase.auth.signOut();
}

// Type-safe query builder
export function db(request?: Request) {
  const isServer = typeof window === "undefined";
  const client = isServer ? getSupabaseServerClient() : getSupabaseBrowserClient();
  return client;
}
