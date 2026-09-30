"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type Business = {
  description: string;
  modules: string[];
  metrics: [string, string, string][];
  tasks: [string, string, string][];
};

const businesses: Record<string, Business> = {
  "Real Estate": {
    description: "Turn property enquiries into qualified site visits and deals.",
    modules: ["Leads", "Properties", "Site Visits", "Agents", "Deals", "Follow-ups"],
    metrics: [["New leads", "12", "+18%"], ["Site visits", "06", "Today"], ["Hot leads", "04", "2 new"], ["Pipeline", "₹48.2L", "+12%"]],
    tasks: [["Follow up with Rahul", "Lead • Hot", "1h ago"], ["Review new lead: Priya", "Lead • New", "2h ago"], ["Send proposal to Apex", "Deal • Pending", "3h ago"]]
  },
  Salon: {
    description: "Fill your calendar, retain customers and automate follow-ups.",
    modules: ["Customers", "Appointments", "Services", "Staff", "Packages", "Follow-ups"],
    metrics: [["New enquiries", "18", "+24%"], ["Appointments", "14", "Today"], ["Returning", "72%", "+8%"], ["Revenue", "₹38.6K", "+14%"]],
    tasks: [["Confirm bridal package", "Booking • Today", "30m ago"], ["Follow up with Neha", "Customer • Warm", "1h ago"], ["Review tomorrow's slots", "Calendar • 6 open", "2h ago"]]
  },
  Gym: {
    description: "Convert enquiries into memberships and keep members engaged.",
    modules: ["Members", "Memberships", "Attendance", "Plans", "Payments", "Follow-ups"],
    metrics: [["New enquiries", "21", "+31%"], ["Renewals", "09", "This week"], ["At risk", "05", "3 new"], ["Revenue", "₹64.8K", "+16%"]],
    tasks: [["Call renewal list", "Membership • 9", "45m ago"], ["Message inactive members", "Retention • 5", "1h ago"], ["Review new enquiry", "Lead • Hot", "2h ago"]]
  },
  Restaurant: {
    description: "Manage customers, reservations and repeat orders from one workspace.",
    modules: ["Customers", "Orders", "Reservations", "Menu", "Reviews", "Marketing"],
    metrics: [["New customers", "34", "+22%"], ["Reservations", "28", "Today"], ["Repeat orders", "41%", "+6%"], ["Revenue", "₹82.4K", "+11%"]],
    tasks: [["Confirm group reservation", "Booking • 8 guests", "20m ago"], ["Reply to review", "Reputation • 4.2★", "1h ago"], ["Launch weekend offer", "Marketing • Draft", "2h ago"]]
  },
  Coaching: {
    description: "Capture student enquiries, manage batches and keep fee follow-ups on track.",
    modules: ["Students", "Batches", "Courses", "Fees", "Leads", "Follow-ups"],
    metrics: [["New enquiries", "27", "+29%"], ["Admissions", "11", "This month"], ["Fee pending", "07", "Needs action"], ["Revenue", "₹1.42L", "+19%"]],
    tasks: [["Call parent enquiry", "Lead • Hot", "35m ago"], ["Send fee reminder", "Fees • 7", "1h ago"], ["Review batch capacity", "Batch • 82%", "3h ago"]]
  },
  Agency: {
    description: "Keep clients, projects, proposals and follow-ups moving together.",
    modules: ["Clients", "Projects", "Proposals", "Invoices", "Tasks", "Follow-ups"],
    metrics: [["New leads", "09", "+13%"], ["Active projects", "16", "3 due"], ["Proposals", "05", "2 hot"], ["Pipeline", "₹18.7L", "+21%"]],
    tasks: [["Follow up with Apex", "Proposal • Hot", "45m ago"], ["Review campaign brief", "Project • Due", "2h ago"], ["Send invoice #104", "Invoice • Pending", "3h ago"]]
  }
};

const nav = ["Overview", "Leads", "Customers", "Tasks", "AI Assistant"];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [authLoading, setAuthLoading] = useState(true);
  const [type, setType = useState("Real Estate");
  const [open, setOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [command, setCommand] = useState("");

  useEffect(() => {\n    supabase.auth.getUser().then(async ({ data }) => {\n      if (!data.user) { router.replace("/login"); return; }\n      const orgId = localStorage.getItem("bizos_org_id");\n      if (!orgId) { router.replace("/onboarding"); return; }\n      const { data: profile } = await supabase.from("business_profiles").select("industry").eq("organization_id", orgId).maybeSingle();\n      if (profile?.industry && businesses[profile.industry]) setType(profile.industry);\n      setAuthLoading(false);\n    });\n  }, [router]);\n\n  const business = businesses[type];
  const completion = useMemo(() => Math.round((business.modules.length / 6) * 100), [business.modules.length]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-white selection:bg-cyan-400/30">
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none fixed -left-40 top-20 -z-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 bottom-0 -z-0 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#07090d]/85 p-5 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400 font-black text-black">B</div>
          <div><div className="font-bold tracking-tight">BIZ<span className="text-cyan-400">OS</span></div><div className="text-[9px] tracking-[.28em] text-white/35">BUSINESS OS</div></div>
        </div>
        <nav className="mt-7 space-y-1">
          {nav.map((item) => (
            <button key={item} onClick={() => setActiveNav(item)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeNav === item ? "bg-white/[.08] text-white" : "text-white/45 hover:bg-white/[.04] hover:text-white"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${activeNav === item ? "bg-cyan-400 shadow-[0_0_12px_#22d3ee]" : "bg-white/20"}`} />{item}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-cyan-400/15 bg-cyan-400/[.035] p-4">
          <div className="text-[10px] font-semibold tracking-[.2em] text-cyan-400">AI STATUS</div>
          <div className="mt-3 flex items-center gap-2 text-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />Your AI workspace is ready</div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[82%] rounded-full bg-cyan-400" /></div>
          <div className="mt-2 text-[10px] text-white/35">82% workspace configured</div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05070b]/75 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">
            <div className="lg:hidden"><span className="font-bold">BIZ<span className="text-cyan-400">OS</span></span></div>
            <div className="hidden items-center gap-2 text-xs text-white/35 md:flex"><span className="h-2 w-2 rounded-full bg-cyan-400" />All systems operational</div>
            <div className="ml-auto flex items-center gap-2">
              <button className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white/55 hover:bg-white/[.07]">⌘ K</button>
              <button className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-white/70 hover:bg-white/[.07]">Configure</button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] px-5 py-7 md:px-8 md:py-10">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[.04] px-3 py-1.5 text-[10px] font-semibold tracking-[.18em] text-cyan-300">AI COMMAND CENTER <span className="text-white/20">/</span> LIVE</div>
              <h1 className="text-4xl font-semibold tracking-[-.04em] md:text-6xl">Run the business.<br /><span className="text-white/30">Not the busywork.</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 md:text-base">{business.description}</p>
            </div>

            <div className="relative w-full xl:w-[280px]">
              <div className="mb-2 text-[10px] font-semibold tracking-[.18em] text-white/30">ACTIVE BUSINESS</div>
              <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.045] px-4 py-3.5 text-left shadow-2xl shadow-black/20 transition hover:border-cyan-400/30 hover:bg-white/[.07]">
                <span><span className="block text-[10px] text-white/35">WORKSPACE</span><span className="mt-0.5 block text-sm font-medium">{type}</span></span>
                <span className={`text-white/45 transition ${open ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {open && <div className="absolute left-0 right-0 top-[74px] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14] p-1.5 shadow-2xl shadow-black/60">
                {Object.keys(businesses).map((name) => <button key={name} onClick={() => { setType(name); setOpen(false); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition ${name === type ? "bg-cyan-400/10 text-cyan-300" : "text-white/65 hover:bg-white/[.06] hover:text-white"}`}>
                  <span>{name}</span>{name === type && <span className="text-xs">✓</span>}
                </button>)}
              </div>}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-2">
            <div className="flex items-center gap-3 rounded-xl bg-black/20 px-4 py-3">
              <span className="text-cyan-400">✦</span>
              <input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ask BizOS anything… e.g. “Which leads need attention?”" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
              <kbd className="hidden rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/25 sm:block">⌘ ↵</kbd>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {business.metrics.map(([label, value, trend]) => <div key={label} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[.045]">
              <div className="flex items-center justify-between"><span className="text-xs text-white/40">{label}</span><span className="text-[10px] text-cyan-400">{trend}</span></div>
              <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-400/80 to-blue-500/60" /></div>
            </div>)}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[.025] p-5 md:p-6">
              <div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold tracking-[.18em] text-white/30">WORK QUEUE</div><h2 className="mt-1 text-xl font-semibold">What needs your attention</h2></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/35">{business.tasks.length} open</span></div>
              <div className="mt-5 space-y-2">
                {business.tasks.map(([title, meta, time], i) => <button key={title} className="flex w-full items-center gap-4 rounded-2xl border border-white/[.06] bg-black/20 p-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[.025]">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${i === 0 ? "bg-cyan-400/10 text-cyan-300" : "bg-white/[.04] text-white/35"}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="mt-1 block text-[11px] text-white/30">{meta}</span></span>
                  <span className="text-[10px] text-white/25">{time}</span><span className="text-white/20">→</span>
                </button>)}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[.08] via-[#071016] to-[#071016] p-6">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-cyan-400/10" />
              <div className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-cyan-400/10" />
              <div className="text-[10px] font-semibold tracking-[.2em] text-cyan-300">AI PULSE</div>
              <div className="mt-7 flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl text-cyan-300">✦</div><div><div className="text-lg font-semibold">3 actions found</div><div className="text-xs text-white/35">AI reviewed your workspace</div></div></div>
              <p className="mt-6 text-sm leading-6 text-white/55">Three leads have gone quiet for 24+ hours. A quick follow-up could move them back into your active pipeline.</p>
              <button className="mt-6 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-bold text-black transition hover:bg-cyan-300">Review recommendations →</button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div><div className="text-[10px] font-semibold tracking-[.18em] text-white/30">BUSINESS DNA</div><h2 className="mt-1 text-xl font-semibold">{type} workspace</h2><p className="mt-1 text-xs text-white/35">Modules adapt automatically to the way this business operates.</p></div>
              <div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${completion}%` }} /></div><span className="text-xs text-cyan-300">{completion}% configured</span></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">{business.modules.map((module, i) => <div key={module} className="rounded-xl border border-white/8 bg-black/20 px-3.5 py-2.5 text-xs text-white/55 transition hover:border-cyan-400/20 hover:text-cyan-300"><span className="mr-2 text-white/20">{String(i + 1).padStart(2, "0")}</span>{module}</div>)}</div>
          </div>
        </section>

        <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/10 bg-[#0b0e14]/90 p-2 backdrop-blur-xl lg:hidden">
          {nav.slice(0, 4).map((item) => <button key={item} onClick={() => setActiveNav(item)} className={`rounded-xl px-3 py-2 text-[10px] ${activeNav === item ? "bg-cyan-400/10 text-cyan-300" : "text-white/35"}`}>{item}</button>)}
        </nav>
      </div>
    </main>
  );
}
