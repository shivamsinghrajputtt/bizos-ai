"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { Select } from "../../components/ui/select";

type LeadQueryRow = {
  id: string;
  source: string | null;
  stage: string | null;
  score: number | null;
  notes: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  }[] | null;
};

type Lead = Omit<LeadQueryRow, "customer"> & {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];

function StageSelect({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      compact={compact}
      options={stages.map((stage) => ({
        value: stage,
        label: stage.charAt(0).toUpperCase() + stage.slice(1),
      }))}
      label={compact ? undefined : "Stage"}
    />
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    source: "Website",
    stage: "new",
    score: "50",
    notes: "",
    next_follow_up_at: "",
  });

  async function load() {
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const id = localStorage.getItem("bizos_org_id");
    if (!id) {
      router.replace("/onboarding");
      return;
    }

    setOrgId(id);

    const { data, error: queryError } = await supabase
      .from("leads")
      .select(
        "id,source,stage,score,notes,next_follow_up_at,created_at,customer:customers(id,name,phone,email)",
      )
      .eq("organization_id", id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      const rows = (data || []) as LeadQueryRow[];
      setLeads(
        rows.map((lead) => ({
          ...lead,
          customer: lead.customer?.[0] ?? null,
        })),
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createLead(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;

    setSaving(true);
    setError("");

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        organization_id: orgId,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      })
      .select("id")
      .single();

    if (customerError) {
      setError(customerError.message);
      setSaving(false);
      return;
    }

    const { error: leadError } = await supabase.from("leads").insert({
      organization_id: orgId,
      customer_id: customer.id,
      source: form.source.trim() || null,
      stage: form.stage,
      score: Math.max(0, Math.min(100, Number(form.score) || 0)),
      notes: form.notes.trim() || null,
      next_follow_up_at: form.next_follow_up_at
        ? new Date(form.next_follow_up_at).toISOString()
        : null,
    });

    if (leadError) {
      setError(leadError.message);
      setSaving(false);
      return;
    }

    setForm({
      name: "",
      phone: "",
      email: "",
      source: "Website",
      stage: "new",
      score: "50",
      notes: "",
      next_follow_up_at: "",
    });
    setShowForm(false);
    setSaving(false);
    await load();
  }

  async function updateStage(id: string, stage: string) {
    if (!orgId) return;

    const { error: updateError } = await supabase
      .from("leads")
      .update({ stage })
      .eq("id", id)
      .eq("organization_id", orgId);

    if (updateError) setError(updateError.message);
    else
      setLeads((items) =>
        items.map((item) => (item.id === id ? { ...item, stage } : item)),
      );
  }

  async function deleteLead(id: string) {
    if (!orgId || !confirm("Delete this lead?")) return;

    const { error: deleteError } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId);

    if (deleteError) setError(deleteError.message);
    else setLeads((items) => items.filter((item) => item.id !== id));
  }

  const filtered = leads.filter((lead) => {
    const q = search.toLowerCase();
    return (
      !q ||
      [
        lead.customer?.name,
        lead.customer?.phone,
        lead.customer?.email,
        lead.source,
        lead.stage,
      ].some((value) => String(value || "").toLowerCase().includes(q))
    );
  });

  const stats = {
    total: leads.length,
    hot: leads.filter(
      (lead) => (lead.score || 0) >= 70 && lead.stage !== "lost",
    ).length,
    qualified: leads.filter((lead) => lead.stage === "qualified").length,
    won: leads.filter((lead) => lead.stage === "won").length,
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#05070b] text-white/40">
        Loading leads…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              ← Overview
            </button>
            <div className="mt-5 text-[10px] font-semibold tracking-[.2em] text-cyan-400">
              PIPELINE / LEADS
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Lead command center.
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Capture prospects, qualify demand and keep every follow-up visible.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black"
          >
            + New lead
          </button>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Total", stats.total],
            ["Hot", stats.hot],
            ["Qualified", stats.qualified],
            ["Won", stats.won],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/10 bg-white/[.025] p-5"
            >
              <div className="text-xs text-white/40">{label}</div>
              <div className="mt-2 text-3xl font-semibold">{value}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, phone, email, source…"
            className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/25"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[.02]">
          <div className="hidden grid-cols-[1.6fr_.8fr_.8fr_.9fr_1fr] gap-4 border-b border-white/10 px-5 py-3 text-[10px] tracking-[.15em] text-white/25 md:grid">
            <span>PROSPECT</span>
            <span>SOURCE</span>
            <span>SCORE</span>
            <span>STAGE</span>
            <span>FOLLOW-UP</span>
          </div>

          {filtered.length ? (
            filtered.map((lead) => (
              <div
                key={lead.id}
                className="grid gap-4 border-b border-white/[.06] px-5 py-5 md:grid-cols-[1.6fr_.8fr_.8fr_.9fr_1fr] md:items-center"
              >
                <div>
                  <div className="font-medium">
                    {lead.customer?.name || "Unnamed lead"}
                  </div>
                  <div className="mt-1 text-xs text-white/30">
                    {lead.customer?.phone ||
                      lead.customer?.email ||
                      "No contact details"}
                  </div>
                  {lead.notes && (
                    <div className="mt-2 line-clamp-1 text-xs text-white/40">
                      {lead.notes}
                    </div>
                  )}
                </div>
                <div className="text-sm text-white/50">{lead.source || "—"}</div>
                <div>
                  <span
                    className={
                      (lead.score || 0) >= 70
                        ? "rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300"
                        : "rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/50"
                    }
                  >
                    {lead.score ?? 0}
                  </span>
                </div>
                <StageSelect
                  compact
                  value={lead.stage || "new"}
                  onChange={(stage) => updateStage(lead.id, stage)}
                />
                <div className="flex items-center justify-between gap-2 text-xs text-white/35">
                  <span>
                    {lead.next_follow_up_at
                      ? new Date(lead.next_follow_up_at).toLocaleString()
                      : "Not scheduled"}
                  </span>
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="text-red-300/50 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-14 text-center">
              <div className="text-white/60">No leads yet.</div>
              <div className="mt-1 text-xs text-white/30">
                Create your first prospect to start the pipeline.
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-5 backdrop-blur-sm">
          <form
            onSubmit={createLead}
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0d12] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-[.18em] text-cyan-400">
                  NEW RECORD
                </div>
                <h2 className="mt-1 text-xl font-semibold">Create lead</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-white/30 hover:text-white"
                aria-label="Close create lead dialog"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/45">
                Name *
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-white/45">
                Phone
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91…"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-white/45">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@email.com"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-white/45">
                Source
                <input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Website / Referral / Instagram"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <div className="text-xs text-white/45">
                Stage
                <div className="mt-2">
                  <StageSelect
                    value={form.stage}
                    onChange={(stage) => setForm({ ...form, stage })}
                  />
                </div>
              </div>
              <label className="text-xs text-white/45">
                Lead score (0–100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-white/45 md:col-span-2">
                Next follow-up
                <input
                  type="datetime-local"
                  value={form.next_follow_up_at}
                  onChange={(e) =>
                    setForm({ ...form, next_follow_up_at: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
              <label className="text-xs text-white/45 md:col-span-2">
                Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
                />
              </label>
            </div>

            <button
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create lead →"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
