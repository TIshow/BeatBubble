import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { askFriend } from "@/ai/askFriend";
import { answerFriend, type QuotaStatus } from "@/ai/friendEndpoint";

// POST /api/ai/friend — the companion's lines (#151). The work is in
// answerFriend; this file only connects it to Supabase and Claude. The API key
// exists only here, on the server.

const ANSWERS = new Set<QuotaStatus>(["ok", "signed-out", "not-enabled", "limit"]);

// ai_take_quota() (migration 0018) runs as the user the token belongs to, so
// it knows whether they are a teacher without the browser saying so.
async function takeQuota(token: string): Promise<QuotaStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
  const { data, error } = await supabase.rpc("ai_take_quota");
  if (error) {
    // An expired or invalid token is fixed by signing in again.
    if (error.code === "PGRST301" || /jwt/i.test(error.message)) return "signed-out";
    console.error("[BeatBubble] AI quota check failed:", error.code);
    return "unavailable";
  }
  return ANSWERS.has(data as QuotaStatus) ? (data as QuotaStatus) : "unavailable";
}

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Left null: answerFriend answers a bad request.
  }
  const reply = await answerFriend(request.headers.get("authorization"), body, {
    takeQuota,
    ask: (song) => askFriend(new Anthropic(), song),
  });
  return Response.json(reply.body, { status: reply.status });
}
