"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password});
    if (result.error) setError(result.error.message);
    else if (mode === "signup") router.push("/onboarding");
    else router.push("/");
    setLoading(false);
  }

  return <main className="min-h-screen bg-[#05070b] text-white grid place-items-center px-5">
    <div className="w-full max-w-md">
      <div className="mb-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400 font-black text-black">B</div><h1 className="mt-5 text-3xl font-semibold">Welcome to BizOS</h1><p className="mt-2 text-sm text-white/40">{mode==="login" ? "Sign in to your business workspace." : "Create your business workspace in minutes."}</p></div>
      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[.03] p-6 shadow-2xl shadow-black/30">
        <label className="block text-xs text-white/45">Email</label>
        <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-400/50" placeholder="you@business.com"/>
        <label className="mt-5 block text-xs text-white/45">Password</label>
        <input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-cyan-400/50" placeholder="Minimum 6 characters"/>
        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{error}</div>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-black disabled:opacity-50">{loading ? "Please wait…" : mode==="login" ? "Sign in →" : "Create workspace →"}</button>
        <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("")}} className="mt-4 w-full text-xs text-white/40 hover:text-white">{mode==="login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      </form>
      <p className="mt-5 text-center text-[10px] tracking-[.15em] text-white/20">YOUR DATA • YOUR WORKSPACE • YOUR CONTROL</p>
    </div>
  </main>;
}
