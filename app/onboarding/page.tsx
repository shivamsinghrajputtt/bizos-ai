"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const types=["Real Estate","Salon","Gym","Restaurant","Coaching","Agency","Other"];

export default function OnboardingPage(){
  const router=useRouter();
  const supabase=createClient();
  const [userId,setUserId]=useState<string|null>(null);
  const [name,setName]=useState("");
  const [type,setType]=useState("Real Estate");
  const [description,setDescription]=useState("");
  const [phone,setPhone]=useState("");
  const [website,setWebsite]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user) router.replace("/login"); else {setUserId(data.user.id);setLoading(false)}})},[router]);

  async function save(e:FormEvent){
    e.preventDefault(); if(!userId) return;
    setSaving(true); setError("");
    const {data:org,error:orgError}=await supabase.from("organizations").insert({name,type,business_type:type,owner_id:userId}).select("id").single();
    if(orgError){setError(orgError.message);setSaving(false);return;}
    const {error:memberError}=await supabase.from("organization_members").insert({organization_id:org.id,user_id:userId,role:"owner"});
    if(memberError){setError(memberError.message);setSaving(false);return;}
    const {error:profileError}=await supabase.from("business_profiles").insert({organization_id:org.id,business_name:name,description,industry:type,phone,website});
    if(profileError){setError(profileError.message);setSaving(false);return;}
    localStorage.setItem("bizos_org_id",org.id);
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
          <label className="mt-5 block text-xs text-white/45">What kind of business is this? *</label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{types.map(x=><button type="button" key={x} onClick={()=>setType(x)} className={`rounded-xl border px-3 py-3 text-xs transition ${type===x?"border-cyan-400/40 bg-cyan-400/10 text-cyan-300":"border-white/10 bg-black/20 text-white/45 hover:text-white"}`}>{x}</button>)}</div>
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
