"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Lead = {
  id: string;
  stage: string | null;
  score: number | null;
  created_at: string;
  customer: { name: string | null } | null;
};

type Task = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_at: string | null;
};

const nav = ["Overview", "Leads", "Customers", "Tasks", "AI Assistant"];

function formatTime(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(Math.abs(diff) / 60000));
  if (diff >= 0) {
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }
  return `Due in ${minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`}`;
}

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("Real Estate");
  const [businessName, setBusinessName] = useState("Your workspace");
  const [activeNav, setActiveNav] = useState("Overview");
  const [command, setCommand] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [leadCount, setLeadCount] = useState(0);
  const [hotLeadCount, setHotLeadCount] = useState(0);
  const [error, setError] = useState("");

  async function loadWorkspace() {
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const orgId = localStorage.getItem("bizos_org_id");
    if (!orgId) {
      router.replace("/onboarding");
      return;
    }

    const [profileResult, leadsResult, tasksResult, customersResult, hotLeadsResult] =
      await Promise.all([
        supabase
          .from("business_profiles")
          .select("business_name, industry")
          .eq("organization_id", orgId)
          .maybeSingle(),
        supabase
          .from("leads")
          .select("id, stage, score, created_at, customer:customers(name)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_at")
          .eq("organization_id", orgId)
          .neq("status", "done")
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(6),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("score", 70),
      ]);

    const firstError =
      profileResult.error ||
      leadsResult.error ||
      tasksResult.error ||
      customersResult.error ||
      hotLeadsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    if (profileResult.data?.industry) setType(profileResult.data.industry);
    if (profileResult.data?.business_name) setBusinessName(profileResult.data.business_name);
    setLeads((leadsResult.data as Lead[]) || []);
    setTasks((tasksResult.data as Task[]) || []);
    setLeadCount(leadsResult.count || 0);
    setHotLeadCount(hotLeadsResult.count || 0);
    setCustomerCount(customersResult.count || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const staleLeads = leads.filter((lead) => {
    const created = new Date(lead.created_at).getTime();
    return Date.now() - created > 24 * 60 * 60 * 1000 && lead.stage !== "won";
  }).length;

  const metrics = [
    ["New leads", String(leadCount), leadCount ? "Live" : "No leads yet"],
    ["Customers", String(customerCount), customerCount ? "Live" : "No customers yet"],
    ["Hot leads", String(hotLeadCount), hotLeadCount ? "Needs attention" : "None"],
    ["Open tasks", String(tasks.length), tasks.length ? "Action queue" : "All clear"],
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#05070b] grid place-items-center text-white">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400 font-black text-black">B</div>
          <p className="mt-4 text-sm text-white/40">Loading your workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none fixed -left-40 top-20 -z-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 bottom-0 -z-0 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#07090d]/90 p-5 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 font-black text-black">B</div>
          <div>
            <div className="font-bold">BIZ<span className="text-cyan-400">OS</span></div>
            <div className="text-[9px] tracking-[.28em] text-white/35">BUSINESS OS</div>
          </div>
        </div>

        <nav className="mt-7 space-y-1">
          {nav.map((item) => (
            <button
              key={item}
              onClick={() => item === "Overview" ? setActiveNav("Overview") : router.push(`/${item === "AI Assistant" ? "ai-assistant" : item.toLowerCase()}`)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                activeNav === item ? "bg-white/[.08] text-white" : "text-white/45 hover:bg-white/[.04] hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                activeNav === item ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee]" : "bg-white/20"
              }`} />
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-cyan-400/15 bg-cyan-400/[.035] p-4">
          <div className="text-[10px] font-semibold tracking-[.2em] text-cyan-400">AI STATUS</div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            Workspace connected
          </div>
          <div className="mt-2 text-[10px] text-white/35">Supabase data is live</div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070b]/75 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">
            <div className="lg:hidden font-bold">BIZ<span className="text-cyan-400">OS</span></div>
            <div className="hidden items-center gap-2 text-xs text-white/35 md:flex">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Supabase connected
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => loadWorkspace()}
                className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white/55 hover:bg-white/[.07]"
              >
                Refresh
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  localStorage.removeItem("bizos_org_id");
                  router.replace("/login");
                }}
                className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white/70 hover:bg-white/[.07]"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-10">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[.04] px-3 py-1.5 text-[10px] font-semibold tracking-[.18em] text-cyan-300">
              AI COMMAND CENTER <span className="text-white/20">/</span> LIVE
            </div>
            <h1 className="text-4xl font-semibold tracking-[-.04em] md:text-6xl">
              Run {businessName}.<br />
              <span className="text-white/30">Not the busywork.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 md:text-base">
              {type} workspace powered by your real Supabase data.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-2">
            <div className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3">
              <span className="text-cyan-400">✦</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Ask BizOS anything… e.g. “Which leads need attention?”"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
              <kbd className="hidden rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/25 sm:block">⌘ ↵</kbd>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">
              Database error: {error}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, trend]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-cyan-400/20 hover:bg-white/[.045]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{label}</span>
                  <span className="text-[10px] text-cyan-400">{trend}</span>
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
                <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400/80 to-blue-500/60" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold tracking-[.18em] text-white/30">WORK QUEUE</div>
                  <h2 className="mt-1 text-xl font-semibold">What needs your attention</h2>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/35">{tasks.length} open</span>
              </div>

              <div className="mt-5 space-y-2">
                {tasks.length ? tasks.map((task, i) => (
                  <button key={task.id} className="flex w-full items-center gap-4 rounded-2xl border border-white/[.06] bg-black/20 p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[.025]">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      i === 0 ? "bg-cyan-400/10 text-cyan-300" : "bg-white/[.04] text-white/35"
                    }`}>{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="mt-1 block text-[11px] text-white/30">
                        {task.priority || "medium"} priority • {task.status || "todo"}
                      </span>
                    </span>
                    <span className="text-[10px] text-white/25">{formatTime(task.due_at)}</span>
                    <span className="text-white/20">→</span>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                    <div className="text-sm text-white/60">Your work queue is clear.</div>
                    <div className="mt-1 text-xs text-white/30">Create tasks and they will appear here automatically.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[.08] via-[#071016] to-[#071016] p-6">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-cyan-400/10" />
              <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-cyan-400/10" />
              <div className="text-[10px] font-semibold tracking-[.2em] text-cyan-300">AI PULSE</div>
              <div className="mt-7 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl text-cyan-300">✦</div>
                <div>
                  <div className="text-lg font-semibold">{staleLeads} attention signals</div>
                  <div className="text-xs text-white/35">Calculated from your live leads</div>
                </div>
              </div>
              <p className="mt-6 text-sm leading-6 text-white/55">
                {staleLeads
                  ? `${staleLeads} recent leads look ready for a follow-up review.`
                  : leadCount
                    ? "No obvious stale-lead signal right now. Keep working the active pipeline."
                    : "Add your first lead and BizOS will start finding useful signals."}
              </p>
              <button
                onClick={() => router.push("/leads")}
                className="mt-6 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-bold text-black transition hover:bg-cyan-300"
              >
                Review leads →
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5 md:p-6">
            <div>
              <div className="text-[10px] font-semibold tracking-[.18em] text-white/30">LIVE DATA LAYER</div>
              <h2 className="mt-1 text-xl font-semibold">Your workspace is connected</h2>
              <p className="mt-2 text-xs leading-5 text-white/35">
                BizOS is now reading this organization’s profile, leads, customers and tasks directly from Supabase.
              </p>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {[
                ["01", "Auth", "Connected"],
                ["02", "Workspace", businessName],
                ["03", "Database", "Live"],
                ["04", "Industry", type],
              ].map(([n, label, value]) => (
                <div key={label} className="rounded-xl border border-white/8 bg-black/20 p-4">
                  <div className="text-[10px] text-white/20">{n}</div>
                  <div className="mt-2 text-xs text-white/40">{label}</div>
                  <div className="mt-1 truncate text-sm text-cyan-300">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0b0e14]/90 p-2 backdrop-blur-xl lg:hidden">
          {nav.slice(0, 4).map((item) => (
            <button key={item} onClick={() => item === "Overview" ? router.push("/") : router.push(`/${item.toLowerCase()}`)} className={`rounded-xl px-3 py-2 text-[10px] ${
              activeNav === item ? "bg-cyan-400/10 text-cyan-300" : "text-white/35"
            }`}>
              {item}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
