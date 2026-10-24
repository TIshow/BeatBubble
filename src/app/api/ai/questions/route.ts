import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { askQuestioner } from "@/ai/askQuestioner";
import { answerQuestions, type QuotaStatus } from "@/ai/questionsEndpoint";

// POST /api/ai/questions — the questioner (#151, idea ④). The work is in
// answerQuestions; this file only connects it to Supabase and Claude. The API
// key exists only here, on the server.

const ANSWERS = new Set<QuotaStatus>(["ok", "signed-out", "not-enabled", "limit"]);

// ai_take_quota() (migration 0017) runs as the user the token belongs to, so
// it knows their class without the browser saying which it is.
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
    // Left null: answerQuestions answers a bad request.
  }
  const reply = await answerQuestions(request.headers.get("authorization"), body, {
    takeQuota,
    ask: (song) => askQuestioner(new Anthropic(), song),
  });
  return Response.json(reply.body, { status: reply.status });
}
