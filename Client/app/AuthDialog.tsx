"use client";

import { FormEvent, useEffect, useState } from "react";

type UserSummary = { id: string; name: string; email: string };
type AuthMode = "login" | "signup";

export default function AuthDialog({
  apiBase,
  initialMode,
  onClose,
  onAuthenticated,
}: {
  apiBase: string;
  initialMode: AuthMode;
  onClose: () => void;
  onAuthenticated: (user: UserSummary) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [purpose, setPurpose] = useState<"signup" | "login">("signup");
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/api/config`).then((response) => response.json()).then((data) => setGoogleEnabled(Boolean(data.googleEnabled))).catch(() => setGoogleEnabled(false));
  }, [apiBase]);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (mode === "signup" && password !== confirmPassword) { setMessage("Those passwords don’t match."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/${mode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(data.error || "Could not continue.");
      setEmail(data.email || email);
      setPurpose(data.purpose || mode);
      setStep("otp");
      setMessage(data.message || "We sent a one-time code to your email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The server could not be reached. Start the API server and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!/^\d{6}$/.test(code)) { setMessage("Enter the six-digit code from your email."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/otp/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That code could not be verified.");
      onAuthenticated(data.user as UserSummary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The server could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/auth/otp/resend`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send another code.");
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("credentials");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#1b211e]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-[26px] border border-white/60 bg-[#fbfaf6] p-6 shadow-[0_30px_100px_rgba(14,20,15,.3)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#d9fb6e]/55 blur-2xl" />
        <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-[#777d74] transition hover:bg-black/5" aria-label="Close sign in dialog"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        <div className="relative">
          <div className="mb-7 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#242a26] text-[#d9fb6e]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13" /></svg></span><span className="text-[15px] font-semibold tracking-tight">folio<span className="text-[#849442]">.</span></span></div>
          {step === "credentials" ? <>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[1.6px] text-[#899546]">Your code, in context</div>
            <h2 id="auth-title" className="mb-2 text-[30px] font-medium leading-tight tracking-[-1.5px] text-[#242a26]">{mode === "signup" ? "Create your workspace." : "Welcome back."}</h2>
            <p className="mb-6 text-[13px] leading-6 text-[#7c8177]">{mode === "signup" ? "Save code conversations and pick up where you left off." : "Sign in to continue exploring your code."}</p>

            <a href={googleEnabled ? `${apiBase}/api/auth/google` : undefined} aria-disabled={!googleEnabled} onClick={(event) => { if (!googleEnabled) { event.preventDefault(); setMessage("Add Google OAuth credentials to .env to enable Google sign-in."); } }} className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5e5dc] bg-white text-[12px] font-semibold text-[#363b35] transition ${googleEnabled ? "hover:border-[#c9ccbe] hover:bg-[#fcfcfa]" : "cursor-not-allowed opacity-60"}`}>
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.7 7.18l7.28 5.65c4.25-3.92 7.46-9.72 7.46-17.3Z"/><path fill="#FBBC05" d="m10.54 28.41-7.98 6.19C6.51 42.62 14.62 48 24 48c6.47 0 11.9-2.13 15.86-5.8l-7.28-5.65c-2.02 1.36-4.6 2.17-8.58 2.17-6.26 0-11.57-4.22-13.46-9.91Z"/><path fill="#34A853" d="M10.54 19.59 2.56 13.4A23.9 23.9 0 0 0 0 24c0 3.8.91 7.4 2.56 10.6l7.98-6.19A14.4 14.4 0 0 1 9.5 24c0-1.55.37-3.04 1.04-4.41Z"/></svg>
              Continue with Google
            </a>
            {!googleEnabled && <p className="mb-0 mt-2 text-center text-[10px] text-[#a0a397]">Google OAuth credentials are needed to enable this option.</p>}

            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#e8e8df]"/><span className="text-[9px] font-semibold uppercase tracking-[1.3px] text-[#a2a49b]">or use email</span><span className="h-px flex-1 bg-[#e8e8df]"/></div>
            <form onSubmit={submitCredentials} className="space-y-3">
              {mode === "signup" && <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#666d62]">Name</span><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} placeholder="Your name" className="h-11 w-full rounded-xl border border-[#e5e5dc] bg-white px-3 text-[12px] outline-none transition focus:border-[#aabb72]" /></label>}
              <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#666d62]">Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" className="h-11 w-full rounded-xl border border-[#e5e5dc] bg-white px-3 text-[12px] outline-none transition focus:border-[#aabb72]" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#666d62]">Password</span><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={128} required placeholder={mode === "signup" ? "At least 10 characters" : "Your password"} className="h-11 w-full rounded-xl border border-[#e5e5dc] bg-white px-3 text-[12px] outline-none transition focus:border-[#aabb72]" /></label>
              {mode === "signup" && <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#666d62]">Confirm password</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={10} maxLength={128} required placeholder="Type it again" className="h-11 w-full rounded-xl border border-[#e5e5dc] bg-white px-3 text-[12px] outline-none transition focus:border-[#aabb72]" /></label>}
              <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#252b27] text-[12px] font-semibold text-white transition hover:bg-[#414b3c] disabled:cursor-wait disabled:opacity-60">{busy ? "Please wait…" : mode === "signup" ? "Create account" : "Continue with email"}<span>→</span></button>
            </form>
            <p className="mb-0 mt-5 text-center text-[11px] text-[#858981]">{mode === "signup" ? "Already have an account?" : "New to Folio?"} <button onClick={() => switchMode(mode === "signup" ? "login" : "signup")} className="font-semibold text-[#657b36] underline underline-offset-2">{mode === "signup" ? "Sign in" : "Create an account"}</button></p>
          </> : <>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[1.6px] text-[#899546]">One more step</div>
            <h2 id="auth-title" className="mb-2 text-[30px] font-medium leading-tight tracking-[-1.5px] text-[#242a26]">Check your inbox.</h2>
            <p className="mb-6 text-[13px] leading-6 text-[#7c8177]">Enter the six-digit code we sent to <strong className="text-[#454b42]">{email}</strong>. It expires in 10 minutes.</p>
            <form onSubmit={verifyCode} className="space-y-3">
              <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-[#666d62]">Email verification code</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required placeholder="000000" className="h-14 w-full rounded-xl border border-[#e5e5dc] bg-white px-4 text-center font-mono text-[22px] tracking-[.45em] outline-none transition focus:border-[#aabb72]" /></label>
              <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#252b27] text-[12px] font-semibold text-white transition hover:bg-[#414b3c] disabled:cursor-wait disabled:opacity-60">{busy ? "Verifying…" : "Verify and sign in"}<span>→</span></button>
            </form>
            <div className="mt-4 flex items-center justify-between text-[11px]"><button disabled={busy} onClick={resendCode} className="font-semibold text-[#657b36] underline underline-offset-2 disabled:opacity-50">Resend code</button><button onClick={() => { setStep("credentials"); setMessage(""); setCode(""); }} className="text-[#858981] hover:text-[#454b42]">Change email</button></div>
          </>}
          {message && <p role="status" className="mb-0 mt-4 rounded-xl border border-[#e8e5d8] bg-[#f4f2ea] px-3 py-2 text-[11px] leading-5 text-[#6d7166]">{message}</p>}
          <p className="mb-0 mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#a0a397]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg> Your account is secured with email verification.</p>
        </div>
      </section>
    </div>
  );
}
