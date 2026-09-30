"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Stats = { leads: number; hot: number; customers: number; tasks: number };

export default function AIAssistantPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<Stats>({ leads: 0, hot: 0, customers: 0, tasks: 0 });
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const orgId = localStorage.getItem("bizos_org_id");
      if (!orgId) {
        router.replace("/onboarding");
        return;
      }

      const [leadsResult, customersResult, tasksResult] = await Promise.all([
        supabase.from("leads").select("id,score,stage").eq("organization_id", orgId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", orgId).neq("status", "done")
      ]);

      const dbError = leadsResult.error || customersResult.error || tasksResult.error;
      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      const leads = leadsResult.data || [];
      setStats({
        leads: leads.length,
        hot: leads.filter((lead) => (lead.score || 0) >= 70 && lead.stage !== "lost").length,
        customers: customersResult.count || 0,
        tasks: tasksResult.count || 0
      });
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  function ask() {
    const q = query.trim().toLowerCase();
    if (!q || asking) return;
    setAsking(true);

    if (q.includes("lead") || q.includes("hot")) {
      setAnswer(
        "You have " + stats.leads + " leads, including " + stats.hot + " hot leads."
      );
    } else if (q.includes("customer")) {
      setAnswer("You have " + stats.customers + " customers in this workspace.");
    } else if (q.includes("task") || q.includes("work")) {
      setAnswer("You have " + stats.tasks + " open tasks.");
    } else {
      setAnswer(
        "Live snapshot: " +
        stats.leads + " leads, " +
        stats.hot + " hot leads, " +
        stats.customers + " customers and " +
        stats.tasks +
        " open tasks. Ask about leads, customers or tasks."
      );
    }
    window.setTimeout(() => setAsking(false), 150);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070b] grid place-items-center text-white/40">
        Loading AI workspace…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <button onClick={() => router.push("/")} className="text-xs text-cyan-300">
          ← Overview
        </button>

        <div className="mt-8">
          <div className="text-[10px] tracking-[.2em] text-cyan-400">AI COMMAND LAYER</div>
          <h1 className="mt-2 text-4xl font-semibold">Ask your business.</h1>
          <p className="mt-2 text-sm text-white/40">
            BizOS reads your live workspace context. The model layer can be connected next.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-cyan-400/15 bg-cyan-400/[.035] p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400 text-xl text-black">✦</div>
            <div>
              <div className="font-semibold">BizOS Analyst</div>
              <div className="text-xs text-white/35">Live workspace context</div>
            </div>
          </div>

          <div className="mt-6 flex gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
              placeholder="Which leads need attention?"
              className="flex-1 bg-transparent px-3 py-3 text-sm outline-none"
            />
            <button disabled={!query.trim() || asking} onClick={ask} className="rounded-xl bg-cyan-400 px-4 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-50">
              {asking ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          {answer && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
              {answer}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              [stats.leads, "Leads"],
              [stats.hot, "Hot leads"],
              [stats.customers, "Customers"],
              [stats.tasks, "Open tasks"]
            ].map(([value, label]) => (
              <div key={String(label)} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-2xl font-semibold">{value}</div>
                <div className="mt-1 text-xs text-white/30">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
