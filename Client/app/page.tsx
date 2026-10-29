"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import AuthDialog from "./AuthDialog";

type IconName = "spark" | "upload" | "file" | "search" | "arrow" | "plus" | "close" | "chat" | "chevron" | "clock" | "shield" | "menu" | "github";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    spark: <><path d="M12 2.8v18.4M2.8 12h18.4M5.5 5.5l13 13M18.5 5.5l-13 13" /></>,
    upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" /></>,
    file: <><path d="M5 3.5h9l5 5v12H5zM14 3.5v5h5M8 13h8M8 16.5h6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h8M8 14h5" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    github: <><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.5 7a4.3 4.3 0 0 0-.1-3S17.4 3.7 15 5a13 13 0 0 0-6 0C6.6 3.7 5.6 4 5.6 4A4.3 4.3 0 0 0 5.5 7a4.7 4.7 0 0 0-1.2 3.2c0 4.7 2.8 5.7 5.5 6A3 3 0 0 0 9 18.5V22" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const suggestions = [
  { icon: "✳", title: "Explain this codebase", prompt: "Explain how this codebase is organized" },
  { icon: "↗", title: "Trace a user flow", prompt: "Trace what happens when a user signs in" },
  { icon: "◫", title: "Find the right file", prompt: "Where is the main entry point, and what calls it?" },
];
const codeExtensions = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "java", "c", "h", "cpp", "cs", "php", "rb", "swift", "kt", "sql", "sh", "json", "yaml", "yml", "md", "toml", "html", "css", "scss", "vue", "svelte", "astro", "dart", "ex", "exs", "scala", "clj", "cljs", "tf", "hcl", "ipynb"]);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type UserSummary = { id: string; name: string; email: string };

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const [shareCode, setShareCode] = useState(false);
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [apiAvailable, setApiAvailable] = useState(true);
  const [repoInput, setRepoInput] = useState("");
  const [repository, setRepository] = useState("");
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: "include" })
      .then((response) => response.json())
      .then((data) => { setUser(data.user || null); setApiAvailable(true); })
      .catch(() => setApiAvailable(false));
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get("auth");
    if (authResult === "google-failed") { setNotice("Google sign-in didn’t finish. Please try again."); setError(true); }
    if (authResult === "google-not-configured") { setNotice("Add Google OAuth credentials to .env to enable Google sign-in."); setError(true); }
    if (authResult === "google-success") setNotice("Signed in with Google. Your code workspace is ready.");
    if (authResult) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  function addFiles(incoming: FileList | File[]) {
    const batch = Array.from(incoming);
    const tooLarge = batch.filter((file) => file.size > 1 * 1024 * 1024).map((file) => file.name);
    const unsupported = batch.filter((file) => file.size <= 1 * 1024 * 1024 && !codeExtensions.has(file.name.split(".").pop()?.toLowerCase() || "")).map((file) => file.name);
    const valid = batch.filter((file) => file.size <= 1 * 1024 * 1024 && codeExtensions.has(file.name.split(".").pop()?.toLowerCase() || ""));
    setFiles((current) => {
      const next = [...current];
      valid.forEach((file) => {
        if (!next.some((existing) => existing.name === file.name && existing.size === file.size)) next.push(file);
      });
      return next;
    });
    setError(tooLarge.length > 0 || unsupported.length > 0);
    setNotice(tooLarge.length ? `${tooLarge.join(", ")} is over the 1 MB limit.` : unsupported.length ? `Unsupported file type: ${unsupported.join(", ")}. Add source code files.` : "");
    setSubmitted("");
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function ask() {
    if (!files.length && !repository) { setNotice("Add a GitHub repository or a code file first."); setError(true); return; }
    if (!question.trim()) { setNotice("Ask a question about the code to get started."); setError(true); return; }
    if (!user) { setNotice("Sign in to ask a question about this code."); setError(true); setAuthMode("login"); return; }
    if (!shareCode) { setNotice("Confirm that you want to send this code to the AI service to answer."); setError(true); return; }
    setError(false);
    setNotice("");
    setSubmitted(question.trim());
    setAnswer("");
    setAsking(true);
    try {
      const form = new FormData();
      form.set("question", question.trim());
      if (repoInput) form.set("repository", repoInput);
      files.forEach((file) => form.append("codeFiles", file));
      const response = await fetch(`${API_BASE}/api/questions`, { method: "POST", credentials: "include", body: form });
      const data = await response.json();
      if (response.status === 401) { setUser(null); setAuthMode("login"); throw new Error("Your session expired. Sign in again to ask."); }
      if (!response.ok) throw new Error(data.error || "Could not analyze the source.");
      setAnswer(data.answer);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The server could not be reached. Try again.");
      setError(true);
      setSubmitted("");
    } finally {
      setAsking(false);
    }
  }

  function connectRepository() {
    try {
      const url = new URL(repoInput.trim());
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.hostname !== "github.com" && url.hostname !== "www.github.com") throw new Error("Use a github.com repository URL.");
      if (parts.length < 2) throw new Error("Paste a repository link like github.com/owner/repo.");
      const owner = parts[0];
      const repo = parts[1].replace(/\.git$/, "");
      setRepository(`${owner}/${repo}`);
      setRepoInput(`https://github.com/${owner}/${repo}`);
      setNotice("");
      setError(false);
      setSubmitted("");
    } catch (caught) {
      setNotice(caught instanceof Error && caught.message ? caught.message : "That does not look like a GitHub repo link.");
      setError(true);
    }
  }

  function onQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); }
  }

  function reset() {
    setFiles([]); setQuestion(""); setRepoInput(""); setRepository(""); setNotice(""); setError(false); setSubmitted(""); setAnswer(""); setShareCode(false);
  }

  async function signOut() {
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }); }
    finally { setUser(null); setNotice("You’re signed out."); setError(false); }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-[#202525] selection:bg-[#d9fb6e] selection:text-[#202525]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[250px] flex-col border-r border-black/[.07] bg-[#f9f8f5] px-5 py-6 lg:flex">
        <a className="mb-9 flex items-center gap-3 px-2" href="#" aria-label="folio home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#202525] text-[#d9fb6e]"><Icon name="spark" size={18} /></span>
          <span className="text-[18px] font-semibold tracking-[-.7px]">folio<span className="text-[#849442]">.</span></span>
        </a>
        <button onClick={reset} className="group mb-9 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#d9fb6e] text-[13px] font-semibold shadow-[0_4px_12px_rgba(111,138,37,.12)] transition hover:bg-[#cef15e]">
          <Icon name="plus" size={16} /> New conversation <span className="ml-auto mr-3 rounded-md border border-black/10 px-1.5 py-0.5 text-[10px] text-black/45">N</span>
        </button>
        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.7px] text-[#a1a29b]">Code workspace</div>
        <nav className="flex flex-col gap-1" aria-label="Code workspace">
          <button className="flex h-10 items-center gap-3 rounded-lg bg-[#eeeee7] px-3 text-left text-[13px] font-semibold text-[#252a27]"><Icon name="chat" size={16} /> Ask your code</button>
          <button className="flex h-10 items-center gap-3 rounded-lg px-3 text-left text-[13px] text-[#787d77] transition hover:bg-[#eeeee7]"><Icon name="github" size={16} /> Repositories <span className="ml-auto text-[11px] text-[#a9aca5]">{repository ? "1" : "—"}</span></button>
        </nav>
        <div className="mb-2 mt-9 px-3 text-[10px] font-bold uppercase tracking-[1.7px] text-[#a1a29b]">Recent</div>
        <nav className="flex flex-col gap-1" aria-label="Recent conversations">
          {["How authentication works", "Where state is stored", "Map the API routes"].map((item) => <button key={item} className="flex h-9 items-center gap-3 rounded-lg px-3 text-left text-[12px] text-[#858981] transition hover:bg-[#eeeee7] hover:text-[#252a27]"><span className="h-1.5 w-1.5 rounded-full bg-[#c8cbc2]" />{item}</button>)}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#e9e9df] bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[1.2px] text-[#999d93]"><span>Free workspace</span><span>01 / 05</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eeeee7]"><div className="h-full w-1/5 rounded-full bg-[#a5c845]" /></div>
          <p className="mb-0 mt-3 text-[11px] leading-relaxed text-[#83877f]">Bring a repo or a code file. We’ll find the thread.</p>
        </div>
        <button onClick={user ? signOut : () => setAuthMode("login")} className="mt-5 flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#eeeee7]"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#e5e3d9] text-[11px] font-bold">{user?.name?.[0]?.toUpperCase() || "?"}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{user?.name || "Guest"}</span><span className="block truncate text-[10px] text-[#94978f]">{user?.email || "Sign in to save work"}</span></span>{user ? <span className="text-[10px] text-[#858981]">Sign out</span> : <Icon name="chevron" size={15} />}</button>
      </aside>

      <main className="relative min-h-screen overflow-hidden lg:pl-[250px]">
        <div className="pointer-events-none absolute -right-24 -top-32 h-[390px] w-[390px] rounded-full bg-[#e6edc8]/60 blur-3xl" />
        <header className="relative z-10 flex h-[68px] items-center justify-between border-b border-black/[.06] px-5 sm:px-8 lg:justify-end lg:px-10">
          <button className="grid h-9 w-9 place-items-center rounded-lg text-[#777c73] hover:bg-black/5 lg:hidden" aria-label="Open menu"><Icon name="menu" /></button>
          <div className="flex items-center gap-3 sm:gap-5"><span className={`hidden items-center gap-2 text-[10px] sm:flex ${apiAvailable ? "text-[#858981]" : "text-[#bd5f50]"}`}><span className={`h-1.5 w-1.5 rounded-full ${apiAvailable ? "bg-[#8ab545]" : "bg-[#d87963]"}`} />{apiAvailable ? "API ready" : "API offline"}</span>{user ? <><span className="hidden h-5 w-px bg-black/10 sm:block"/><span className="max-w-[120px] truncate text-[11px] text-[#666d62]">{user.name || user.email}</span><button onClick={signOut} className="rounded-full border border-[#e1e2d7] bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-[#6d7268] hover:bg-white">Sign out</button></> : <><button onClick={() => setAuthMode("login")} className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#62695e] hover:bg-black/5">Sign in</button><button onClick={() => setAuthMode("signup")} className="rounded-full bg-[#242a26] px-3.5 py-2 text-[10px] font-semibold text-white transition hover:bg-[#414b3c]">Create account</button></>}</div>
        </header>

        <div className="relative mx-auto flex min-h-[calc(100vh-68px)] w-full max-w-[1060px] flex-col px-5 pb-10 pt-10 sm:px-9 sm:pt-14 xl:px-14">
          <div className="mb-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e1e2d7] bg-white/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-[#74796e]"><span className="h-1.5 w-1.5 rounded-full bg-[#aacb4e]" /> Your code reading room</div>
            <span className="hidden font-mono text-[10px] tracking-[.15em] text-[#aaa99f] sm:block">01 — ASK</span>
          </div>

          <section className="mx-auto w-full max-w-[900px]">
            <div className="grid items-center gap-4 lg:grid-cols-[1fr_.92fr] lg:gap-7">
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.6px] text-[#898e82]"><span className="text-[#ef714b]">✳</span> A little clarity, coming up</div>
                <h1 className="max-w-[560px] text-[clamp(2.9rem,7.2vw,5.7rem)] font-medium leading-[.92] tracking-[-.078em] text-[#222826]">Aha is a few<br /><span className="font-serif italic text-[#e76b4d]">lines away.</span></h1>
                <p className="mt-5 max-w-[400px] text-[14px] leading-7 text-[#777d74] sm:text-[15px]">Bring a GitHub repo or a code file. Ask what it does, where a flow begins, or why a bug keeps coming back.</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#ebe9df] px-3 py-1.5 text-[10px] text-[#74786e]"><span className="flex -space-x-1"><span className="h-3 w-3 rounded-full border border-[#f4f2ee] bg-[#d9fb6e]"/><span className="h-3 w-3 rounded-full border border-[#f4f2ee] bg-[#f38a6e]"/><span className="h-3 w-3 rounded-full border border-[#f4f2ee] bg-[#b6b5f5]"/></span> Built for the “where does this happen?” moments.</div>
              </div>

              <div aria-hidden="true" className="relative mx-auto block h-[225px] w-full max-w-[400px] sm:h-[280px]">
                <div className="absolute left-[16%] top-[8%] h-[220px] w-[220px] rounded-full bg-[#d9fb6e] opacity-75 blur-[1px]" />
                <div className="absolute left-[9%] top-[4%] h-[240px] w-[240px] rounded-full border border-[#a8c94a]/40" />
                <div className="absolute left-[4%] top-[1%] h-[260px] w-[260px] rounded-full border border-dashed border-[#b8c98b]/55" />
                <div className="absolute left-[12%] top-[14%] h-[190px] w-[244px] rotate-[-10deg] rounded-[17px] border border-[#e9e7f0] bg-[#f6f4ff] p-4 shadow-[0_20px_45px_rgba(42,47,33,.09)]">
                  <div className="mb-4 flex items-center justify-between"><span className="text-[8px] font-bold uppercase tracking-[1.5px] text-[#a6a0c5]">src / routes · 04</span><span className="h-2 w-2 rounded-full bg-[#b7aff2]"/></div>
                  <div className="mb-2 h-2 w-3/4 rounded bg-[#dad6f1]"/><div className="mb-1.5 h-1 w-full rounded bg-[#e5e2f4]"/><div className="mb-4 h-1 w-4/5 rounded bg-[#e5e2f4]"/>
                  <div className="rounded-lg bg-white/80 p-2.5"><div className="mb-1 h-1 w-2/3 rounded bg-[#b7aff2]"/><div className="h-1 w-full rounded bg-[#eceaf6]"/><div className="mt-1 h-1 w-4/5 rounded bg-[#eceaf6]"/></div>
                </div>
                <div className="absolute left-[31%] top-[3%] z-10 h-[222px] w-[210px] rotate-[5deg] rounded-[17px] border border-[#e8e5da] bg-[#fffefa] p-4 shadow-[0_24px_55px_rgba(42,47,33,.16)]">
                  <div className="mb-5 flex items-center justify-between"><span className="text-[8px] font-bold uppercase tracking-[1.5px] text-[#9b9b8c]">src / auth.ts</span><Icon name="file" size={14}/></div>
                  <div className="mb-1 text-[7px] font-bold uppercase tracking-[1.8px] text-[#d0785d]">The request path</div>
                  <div className="text-[19px] font-semibold leading-[1.05] tracking-[-1px] text-[#282e2a]">One call.<br/>Three moving parts.</div>
                  <div className="mt-4 space-y-2 font-mono text-[8px]"><div><span className="text-[#a492cf]">export async function</span> <span className="text-[#718f43]">signIn</span>()</div><div className="pl-3 text-[#aaa99f]">→ validate credentials</div><div className="pl-3 text-[#d0785d]">→ create session</div></div>
                  <div className="mt-4 flex h-10 items-end gap-1.5"><div className="h-4 w-3 rounded-t bg-[#d9e7ae]"/><div className="h-6 w-3 rounded-t bg-[#c8df86]"/><div className="h-5 w-3 rounded-t bg-[#d9e7ae]"/><div className="h-8 w-3 rounded-t bg-[#a9ca51]"/><div className="h-7 w-3 rounded-t bg-[#b5d267]"/><div className="h-10 w-3 rounded-t bg-[#91b23b]"/><span className="mb-1 ml-auto rounded-full bg-[#ed7353] px-2 py-1 text-[8px] font-semibold text-white">3 calls</span></div>
                </div>
                <div className="absolute bottom-[5%] right-[2%] z-20 w-[132px] rotate-[8deg] rounded-[13px] bg-[#ed7353] p-3 text-white shadow-[0_12px_25px_rgba(167,74,48,.22)]"><div className="mb-2 text-[8px] font-bold uppercase tracking-[1.5px] text-white/65">Ask your repo</div><div className="font-serif text-[14px] italic leading-tight">“Where does<br/>this begin?”</div><div className="mt-3 flex items-center justify-end"><span className="grid h-6 w-6 place-items-center rounded-full bg-white/20"><Icon name="arrow" size={13}/></span></div></div>
                <div className="absolute bottom-[4%] left-[3%] z-20 flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-[0_8px_20px_rgba(42,47,33,.08)] backdrop-blur"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#edf4d5] text-[#789143]"><Icon name="spark" size={13}/></span><span className="text-[9px] font-semibold text-[#555a50]">A thread worth pulling</span></div>
              </div>
            </div>

            <div className="mt-9 rounded-[22px] border border-[#e5e5dc] bg-white p-2.5 shadow-[0_20px_60px_rgba(42,47,33,.07)] sm:mt-10 sm:p-3">
              <div className="px-2 pb-3 pt-1">
                <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#92968a]">Start with a codebase</span><span className="text-[9px] text-[#b1b3aa]">PUBLIC GITHUB URL</span></div>
                <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition ${repository ? "border-[#d5e3b5] bg-[#f8fbed]" : "border-[#e9eae3] bg-[#fdfdfa] focus-within:border-[#bccb91]"}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#242a26] text-white"><Icon name="github" size={16} /></span>
                  {repository ? <><span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3d4932]">{repository}</span><span className="rounded-full bg-[#e9f1d5] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#758a3d]">Link added</span><button className="grid h-7 w-7 place-items-center rounded-md text-[#95998b] hover:bg-[#eef2e4]" onClick={() => { setRepository(""); setRepoInput(""); setSubmitted(""); }} aria-label="Remove repository"><Icon name="close" size={14} /></button></> : <><input value={repoInput} onChange={(event) => setRepoInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); connectRepository(); } }} placeholder="Paste a GitHub repo URL…" aria-label="GitHub repository URL" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[12px] text-[#303630] outline-none placeholder:text-[#b1b3aa]"/><button onClick={connectRepository} className="shrink-0 rounded-lg bg-[#252b27] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#414b3c]">Use repo <span className="ml-1">↗</span></button></>}
                </div>
                <div className="my-3 flex items-center gap-3"><span className="h-px flex-1 bg-[#eeefe9]"/><span className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#b0b2a9]">or add source files</span><span className="h-px flex-1 bg-[#eeefe9]"/></div>
              </div>
              <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`group relative flex min-h-[142px] cursor-pointer items-center justify-center overflow-hidden rounded-[15px] border border-dashed px-5 py-6 transition sm:min-h-[154px] ${dragging ? "border-[#8ca83d] bg-[#f3f8e4]" : "border-[#dfe1d7] bg-[#fafbf7] hover:border-[#a6bb68] hover:bg-[#f8faef]"}`} onClick={() => inputRef.current?.click()}>
                <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full border border-[#e4e9d4] transition group-hover:scale-110" />
                <div className="absolute -right-4 -top-8 h-24 w-24 rounded-full border border-[#ebeddc]" />
                <div className="relative flex flex-col items-center text-center">
                  <span className="mb-3 grid h-11 w-11 place-items-center rounded-[14px] bg-[#e9f1ce] text-[#6f8537] shadow-[0_5px_15px_rgba(137,164,65,.12)]"><Icon name="upload" size={21} /></span>
                  <p className="m-0 text-[13px] text-[#7c8177]"><strong className="font-semibold text-[#2b302b]">Drop in code files</strong><span className="hidden sm:inline">, or </span><span className="text-[#819a42] underline decoration-[#cbd5ad] underline-offset-4">browse</span></p>
                  <p className="mb-0 mt-1.5 text-[10px] tracking-wide text-[#a4a79e]">TS · JS · PY · GO · RUST · HTML · CSS <span className="mx-1">/</span> 1 MB max each</p>
                </div>
                <input ref={inputRef} onClick={(event) => event.stopPropagation()} className="sr-only" type="file" multiple accept=".ts,.tsx,.js,.jsx,.mjs,.cjs,.py,.go,.rs,.java,.c,.h,.cpp,.cs,.php,.rb,.swift,.kt,.sql,.sh,.json,.yaml,.yml,.md,.toml,.html,.css,.scss,.vue,.svelte,.astro,.dart,.ex,.exs,.scala,.clj,.cljs,.tf,.hcl,.ipynb" onChange={onInputChange} aria-label="Choose code files" />
              </div>

              {files.length > 0 && <div className="flex flex-wrap gap-2 px-1 pt-3" aria-live="polite">{files.map((file, index) => <div className="flex max-w-full items-center gap-2 rounded-xl border border-[#ebede6] bg-[#fbfcf8] py-1.5 pl-2 pr-1.5" key={`${file.name}-${file.size}-${index}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f0eddf] text-[8px] font-bold uppercase text-[#938b66]">{file.name.split(".").pop()?.slice(0, 3) || "DOC"}</span><span className="max-w-[155px] truncate text-[11px] text-[#62685e]" title={file.name}>{file.name}</span><button aria-label={`Remove ${file.name}`} onClick={(event) => { event.stopPropagation(); removeFile(index); }} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#a0a397] hover:bg-[#f1eee9] hover:text-[#42463e]"><Icon name="close" size={13} /></button></div>)}</div>}

              <div className="mx-1 mt-3 border-t border-[#eeefe9] pt-2.5">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={onQuestionKeyDown} placeholder="Ask anything about the code…" rows={2} aria-label="Your code question" className="w-full resize-y border-0 bg-transparent px-1 py-2 text-[14px] leading-6 text-[#303630] outline-none placeholder:text-[#b0b2a9]" />
                <label className="mb-2 flex cursor-pointer items-start gap-2 px-1 text-[10px] leading-5 text-[#8d9187]"><input type="checkbox" checked={shareCode} onChange={(event) => setShareCode(event.target.checked)} className="mt-1 accent-[#80963f]"/><span>Send selected source to the configured AI service and save this Q&amp;A to your account. Don’t include secrets or credentials.</span></label>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1.5"><button onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] text-[#858a80] transition hover:bg-[#f4f5ef] hover:text-[#50564a]"><Icon name="plus" size={15} /> Add files</button><span className="hidden h-4 w-px bg-[#e8e9e2] sm:block" /><span className="hidden items-center gap-1.5 px-2 text-[10px] text-[#a0a398] sm:inline-flex"><Icon name="shield" size={13} /> Private by design</span></div>
                  <button onClick={ask} disabled={asking} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#242a26] px-4 text-[12px] font-semibold text-white shadow-[0_5px_12px_rgba(30,37,31,.14)] transition hover:-translate-y-0.5 hover:bg-[#3a4437] disabled:cursor-wait disabled:opacity-60">{asking ? "Reading code…" : "Explain this code"} {!asking && <Icon name="arrow" size={15} />}</button>
                </div>
              </div>
            </div>

            {notice && <p className={`mt-3 px-2 text-[11px] ${error ? "text-[#bd5f50]" : "text-[#7d8277]"}`} role="status">{notice}</p>}

            {submitted ? <div className="mt-5 rounded-2xl border border-[#e5e5dc] bg-white/85 p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.3px] text-[#869746]"><Icon name="spark" size={14} /> {asking ? "Following the thread…" : "Folio explains"}</div><p className="m-0 whitespace-pre-wrap text-[14px] leading-6 text-[#343a33]">{asking ? "Reading the selected source and putting the pieces together…" : answer}</p><p className="mb-0 mt-3 flex items-center gap-2 text-[11px] text-[#a0a397]"><Icon name="clock" size={13} /> Grounded in {repository ? `${repository} repository` : `${files.length} code file${files.length === 1 ? "" : "s"}`}</p></div> : <div className="mt-7 sm:mt-8">
              <div className="mb-3 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[1.4px] text-[#a0a397]"><span>Not sure where to begin?</span><span className="h-px flex-1 bg-[#e6e6dd]" /></div>
              <div className="grid gap-2 sm:grid-cols-3">{suggestions.map((item) => <button key={item.title} onClick={() => setQuestion(item.prompt)} className="group flex min-h-[65px] items-center gap-3 rounded-[14px] border border-[#e7e8e0] bg-white/65 px-3 text-left transition hover:-translate-y-0.5 hover:border-[#d3ddb8] hover:bg-white hover:shadow-[0_8px_22px_rgba(42,47,33,.05)]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#eff2e6] text-[14px] text-[#83964d] transition group-hover:bg-[#e8f1ce]">{item.icon}</span><span className="text-[11px] font-medium leading-4 text-[#74796f] group-hover:text-[#363c33]">{item.title}</span><span className="ml-auto text-[#c1c3b9] transition group-hover:translate-x-0.5 group-hover:text-[#829746]">↗</span></button>)}</div>
            </div>}
          </section>

          <footer className="mt-auto flex items-center justify-between pt-12 text-[10px] tracking-wide text-[#a8aaa1]"><span>Understand the code. Keep the context.</span><span className="hidden sm:block">LESS GUESSING, MORE BUILDING <span className="ml-1 text-[#9eb747]">✳</span></span></footer>
        </div>
      </main>
      {authMode && <AuthDialog apiBase={API_BASE} initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={(nextUser) => { setUser(nextUser); setAuthMode(null); setNotice("You’re signed in. Ask your code anything."); setError(false); }} />}
    </div>
  );
}
