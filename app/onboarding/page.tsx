"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { Select } from "../../components/ui/select";

const types=["Real Estate","Salon","Gym","Restaurant","Coaching","Agency","Other"];

export default function OnboardingPage(){
  const router=useRouter();
  const supabase=createClient();
  const [userId,setUserId]=useState<string|null>(null);
  const [sessionReady,setSessionReady]=useState(false);
  const [name,setName]=useState("");
  const [type,setType]=useState("Real Estate");
  const [description,setDescription]=useState("");
  const [phone,setPhone]=useState("");
  const [website,setWebsite]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setSessionReady(true);
      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUserId(session.user.id);
        setSessionReady(true);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function save(e:FormEvent){
    e.preventDefault();

    if (!sessionReady) {
      setError("Your login session is not ready. Please refresh and sign in again.");
      return;
    }

    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Your login session has expired. Please sign in again.");
      setSaving(false);
      router.replace("/login");
      return;
    }

    const { data: orgId, error: workspaceError } = await supabase.rpc(
      "create_business_workspace",
      {
        p_name: name,
        p_business_type: type,
        p_description: description || null,
        p_phone: phone || null,
        p_website: website || null,
      }
    );

    if (workspaceError) {
      setError(workspaceError.message);
      setSaving(false);
      return;
    }

    localStorage.setItem("bizos_org_id", orgId);
    router.push("/");
  }

  if(loading) return <main className="min-h-screen bg-[#05070b] grid place-items-center text-white/40">Loading workspace…</main>;

  return <main className="min-h-screen bg-[#05070b] text-white px-5 py-10">
    <div className="mx-auto max-w-3xl">
      <div className="mb-8"><div className="text-sm font-bold">BIZ<span className="text-cyan-400">OS</span></div><div className="mt-8 text-xs tracking-[.2em] text-cyan-400">STEP 1 / BUSINESS DNA</div><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Tell BizOS how your business works.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/40">This configures the workspace, modules and AI context. You can change it later.</p></div>
      <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/[.025] p-6">
          <label className="text-xs text-white/45">Business name *</label>
          <input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none focus:border-cyan-400/50" placeholder="e.g. Sharma Properties"/>
          <div className="mt-5">
            <Select
              label="What kind of business is this? *"
              value={type}
              onChange={setType}
              options={types.map((value) => ({ value, label: value }))}
            />
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6 md:col-span-2"><label className="text-xs text-white/45">Describe your business</label><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-400/50" placeholder="What do you sell, who are your customers, and what do you want BizOS to help with?"/></div>
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><label className="text-xs text-white/45">Business phone</label><input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-400/50" placeholder="+91…"/></div>
        <div className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><label className="text-xs text-white/45">Website</label><input value={website} onChange={e=>setWebsite(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-400/50" placeholder="https://…"/></div>
        {error && <div className="md:col-span-2 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-300">{error}</div>}
        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-black disabled:opacity-50">{saving?"Building workspace…":"Build my workspace →"}</button></div>
      </form>
    </div>
  </main>
}
