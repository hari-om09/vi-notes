import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  LogIn,
  UserPlus,
  LogOut,
  Play,
  Square,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  addEvents,
  createSession,
  getReport,
  login,
  register,
  updateSession,
  type KeystrokeEvent,
} from "./lib/api";
import {
  clearToken,
  clearUser,
  loadToken,
  loadUser,
  saveToken,
  saveUser,
  type StoredUser,
} from "./lib/storage";

// --- Types & Helpers ---
function classifyKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === "Backspace") return { keyType: "BACKSPACE" };
  if (e.key === "Enter") return { keyType: "ENTER" };
  if (e.key === "Tab") return { keyType: "TAB" };
  if (e.key.startsWith("Arrow")) return { keyType: "ARROW", key: e.key };
  if (e.key === "Escape") return { keyType: "ESCAPE" };
  if (e.key === "Delete") return { keyType: "DELETE" };
  if (e.key === "Home" || e.key === "End")
    return { keyType: "NAV", key: e.key };
  if (e.key === "PageUp" || e.key === "PageDown")
    return { keyType: "NAV", key: e.key };
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
    return { keyType: "CHAR" };
  return { keyType: "OTHER", key: e.key };
}

const fadeUpVariants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -15, scale: 0.98 },
};

export default function App() {
  // --- State ---
  const [token, setToken] = useState<string | null>(() => loadToken());
  const [user, setUser] = useState<StoredUser | null>(() => loadUser());

  // Auth State
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Editor State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);

  // Refs
  const eventsBufferRef = useRef<KeystrokeEvent[]>([]);
  const lastLenRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isAuthed = Boolean(token);

  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { chars: content.length, words };
  }, [content]);

  // --- Logic ---
  const flushEvents = useCallback(async () => {
    if (!token || !sessionId || eventsBufferRef.current.length === 0) return;
    const batch = [...eventsBufferRef.current];
    eventsBufferRef.current = []; // clear immediately to prevent duplicates
    try {
      await addEvents(token, sessionId, batch);
    } catch {
      // Re-queue on failure
      eventsBufferRef.current = [...batch, ...eventsBufferRef.current];
    }
  }, [token, sessionId]);

  const pushEvent = useCallback(
    (evt: KeystrokeEvent) => {
      if (!sessionId) return;
      eventsBufferRef.current.push(evt);
      // Auto-flush if buffer gets too large
      if (eventsBufferRef.current.length >= 200) {
        flushEvents();
      }
    },
    [sessionId, flushEvents],
  );

  useEffect(() => {
    if (!token || !sessionId) return;
    const id = window.setInterval(flushEvents, 5000);
    return () => window.clearInterval(id);
  }, [token, sessionId, flushEvents]);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const resp =
        authMode === "register"
          ? await register(authName, authEmail, authPassword)
          : await login(authEmail, authPassword);
      saveToken(resp.token);
      saveUser(resp.user);
      setToken(resp.token);
      setUser(resp.user);
      setAuthPassword("");
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Authentication failed",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    clearToken();
    clearUser();
    setSessionId(null);
    setReport(null);
    eventsBufferRef.current = [];
  }

  async function toggleSession() {
    if (!token) return;
    setEditorError(null);
    setEditorBusy(true);

    try {
      if (!sessionId) {
        // Start Session
        const resp = await createSession(token, title || "Untitled Draft");
        setSessionId(resp.sessionId);
        setReport(null);
        eventsBufferRef.current = [];
        lastLenRef.current = content.length;
        pushEvent({
          t: Date.now(),
          type: "input",
          meta: { delta: 0, init: true },
        });
        setTimeout(() => textareaRef.current?.focus(), 100); // focus after layout jump
      } else {
        // End Session
        await flushEvents();
        await updateSession(token, sessionId, {
          title,
          content,
          endedAt: new Date().toISOString(),
        });
        const rep = await getReport(token, sessionId);
        setReport(rep.report);
        setSessionId(null);
        eventsBufferRef.current = [];
      }
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : "Session error");
    } finally {
      setEditorBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 selection:bg-neutral-200">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-neutral-900" />
            <div className="font-bold tracking-tight">Vi-Notes</div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm font-medium text-neutral-600">
                {user.name}
              </div>
            )}
            {isAuthed && (
              <button
                className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-red-600 transition-colors"
                onClick={logout}
              >
                <LogOut size={16} /> Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <LayoutGroup>
          <AnimatePresence mode="wait">
            {!isAuthed ? (
              <motion.div
                key="auth-card"
                variants={fadeUpVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mx-auto mt-12 max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
              >
                <h1 className="mb-6 text-2xl font-bold">
                  {authMode === "login" ? "Welcome back" : "Create an account"}
                </h1>

                <form className="space-y-4" onSubmit={handleAuthSubmit}>
                  {authMode === "register" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Name
                      </label>
                      <input
                        className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-neutral-900"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                        required
                      />
                    </motion.div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Email
                    </label>
                    <input
                      className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-neutral-900"
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Password
                    </label>
                    <input
                      className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-neutral-900"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      autoComplete={
                        authMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                    >
                      {authError}
                    </motion.div>
                  )}

                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50"
                    type="submit"
                    disabled={authBusy}
                  >
                    {authMode === "login" ? (
                      <LogIn size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    {authBusy
                      ? "Processing..."
                      : authMode === "login"
                        ? "Sign In"
                        : "Register"}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                    onClick={() => {
                      setAuthError(null);
                      setAuthMode((m) =>
                        m === "login" ? "register" : "login",
                      );
                    }}
                  >
                    {authMode === "login"
                      ? "Don't have an account? Sign up"
                      : "Already have an account? Log in"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="editor-view"
                variants={fadeUpVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                {/* Control Bar Morphing Container */}
                <motion.div
                  layout
                  className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <input
                      className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-neutral-300"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Document Title..."
                      disabled={editorBusy}
                    />
                    <div className="mt-1 flex items-center gap-3 text-xs font-medium text-neutral-500">
                      <span>{stats.words} words</span>
                      <span>·</span>
                      <span>{stats.chars} characters</span>
                      {sessionId && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-1 text-emerald-600"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                          </span>
                          Recording
                        </motion.span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                        sessionId
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "bg-neutral-900 text-white hover:bg-neutral-800"
                      }`}
                      onClick={toggleSession}
                      disabled={editorBusy}
                    >
                      {sessionId ? (
                        <Square fill="currentColor" size={14} />
                      ) : (
                        <Play fill="currentColor" size={14} />
                      )}
                      {sessionId ? "End Session" : "Start Session"}
                    </button>

                    <AnimatePresence>
                      {sessionId && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                          onClick={flushEvents}
                          disabled={editorBusy}
                          title="Force Sync"
                        >
                          <RefreshCw size={16} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {editorError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                  >
                    {editorError}
                  </motion.div>
                )}

                {/* Editor Container */}
                <motion.div
                  layout
                  className="relative rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm"
                >
                  <textarea
                    ref={textareaRef}
                    className="h-[50vh] w-full resize-none rounded-xl p-6 text-base leading-relaxed outline-none"
                    placeholder="Write freely here. Hit 'Start Session' when you are ready to record."
                    value={content}
                    disabled={editorBusy}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (!sessionId) return;
                      const nextLen = e.target.value.length;
                      const delta = nextLen - lastLenRef.current;
                      lastLenRef.current = nextLen;
                      pushEvent({
                        t: Date.now(),
                        type: "input",
                        meta: { delta },
                      });
                    }}
                    onKeyDown={(e) => {
                      if (!sessionId) return;
                      const classified = classifyKey(e);
                      pushEvent({
                        t: Date.now(),
                        type: "keydown",
                        keyType: classified.keyType,
                        key: classified.key,
                        meta: {
                          ctrl: e.ctrlKey,
                          alt: e.altKey,
                          shift: e.shiftKey,
                          meta: e.metaKey,
                        },
                      });
                    }}
                    onPaste={(e) => {
                      if (!sessionId) return;
                      const text = e.clipboardData.getData("text") || "";
                      pushEvent({
                        t: Date.now(),
                        type: "paste",
                        meta: { len: text.length },
                      });
                    }}
                    onCut={() => {
                      if (!sessionId) return;
                      const el = textareaRef.current;
                      if (!el) return;
                      const len = Math.max(
                        0,
                        (el.selectionEnd || 0) - (el.selectionStart || 0),
                      );
                      pushEvent({ t: Date.now(), type: "cut", meta: { len } });
                    }}
                  />

                  {!sessionId && content.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                      <div className="rounded-full bg-neutral-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                        Start a session to enable editing & tracking
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Report Morphing Container */}
                <AnimatePresence>
                  {report && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                          <ShieldCheck className="text-emerald-500" />
                          Authenticity Report
                        </h2>
                        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Heuristic Analysis
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <div className="text-xs font-semibold uppercase text-neutral-500">
                            Duration
                          </div>
                          <div className="mt-1 text-xl font-bold">
                            {Math.round(
                              (report.summary.durationMs || 0) / 1000,
                            )}
                            s
                          </div>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <div className="text-xs font-semibold uppercase text-neutral-500">
                            Typing Speed
                          </div>
                          <div className="mt-1 text-xl font-bold">
                            {report.summary.charsPerMinute}{" "}
                            <span className="text-sm font-normal text-neutral-500">
                              CPM
                            </span>
                          </div>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <div className="text-xs font-semibold uppercase text-neutral-500">
                            Keydowns
                          </div>
                          <div className="mt-1 text-xl font-bold">
                            {report.signals.keydowns}
                          </div>
                        </div>
                        <div className="rounded-xl bg-neutral-50 p-4">
                          <div className="text-xs font-semibold uppercase text-neutral-500">
                            Backspaces
                          </div>
                          <div className="mt-1 text-xl font-bold">
                            {report.signals.backspaces}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-neutral-100 pt-6">
                        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-neutral-500">
                          Verification Flags
                        </h3>
                        {report.suspicious?.length ? (
                          <ul className="space-y-2">
                            {report.suspicious.map((s: string, i: number) => (
                              <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="flex items-center gap-2 text-sm text-amber-700"
                              >
                                <AlertCircle size={16} />
                                {s}
                              </motion.li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                            <ShieldCheck size={16} /> No suspicious patterns
                            flagged. Natural writing behavior detected.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>
    </div>
  );
}
