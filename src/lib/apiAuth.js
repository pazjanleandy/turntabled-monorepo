import { supabase } from "../supabase.js";

export async function buildApiAuthHeaders() {
  const headers = {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
