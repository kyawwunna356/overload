"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  backupLabel,
  isCompleteCode,
  looksLikeEmail,
  normalizeCode,
  normalizeEmail,
  type BackupState,
} from "@/lib/domain/signin";
import { useAccount, type AuthResult } from "@/lib/hooks/useAccount";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";
import { useOnline, useStandalone } from "@/lib/hooks/useDevice";
import { useLocalStats } from "@/lib/hooks/useLocalStats";
import { countLabel } from "@/lib/format";
import { GoogleMark } from "./GoogleMark";

// The Me tab: who you are, whether your log is backed up, how much this phone holds, and how to
// install the app. Sign in is Continue with Google, or an emailed code as the fallback. This is
// the one screen allowed to wait on the network (Hard Rule 5's written exception) — it's used
// once per device and never on the logging path. Everything else about backup happens in the
// background, and everything else here reads Dexie.
//
// Google comes back here with `?code=…`, which is exchanged once and then removed from the URL.

const NO_SIGNAL = "No signal. Try again when you're online.";
const NOT_SET_UP = "Backup isn't set up on this copy of the app.";
// The emailed-code sign-in is built and working but hidden for now (the user's choice): Google
// is the one way in. Flip this to bring the email form back; nothing else needs to change.
const SHOW_EMAIL_CODE = false;

const GOOGLE_FAILED = SHOW_EMAIL_CODE
  ? "Google sign-in didn't finish. Try again, or use an email code."
  : "Google sign-in didn't finish. Try again.";

function explain(result: AuthResult, rejected: string): string | null {
  if (result.ok) return null;
  if (result.reason === "offline") return NO_SIGNAL;
  if (result.reason === "unconfigured") return NOT_SET_UP;
  return rejected;
}

export function MeScreen() {
  const { account, configured, signInWithGoogle, finishGoogleSignIn, sendCode, verifyCode, signOut } =
    useAccount();
  const status = useBackupStatus();
  const stats = useLocalStats();
  const online = useOnline();
  const installed = useStandalone();
  const router = useRouter();
  const params = useSearchParams();

  const googleCode = params.get("code");
  const googleError = params.has("error");

  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  // Exchange Google's one-time code exactly once (React runs effects twice in development).
  const exchanged = useRef(false);
  useEffect(() => {
    if (googleCode === null || exchanged.current) return;
    exchanged.current = true;
    void finishGoogleSignIn(googleCode).then((result) => {
      setMessage(explain(result, GOOGLE_FAILED));
      router.replace("/account");
    });
  }, [googleCode, finishGoogleSignIn, router]);

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setMessage(null);
    try {
      setMessage(await action());
    } catch {
      setMessage(NO_SIGNAL);
    } finally {
      setBusy(false);
    }
  };

  const google = () => run(async () => explain(await signInWithGoogle(), GOOGLE_FAILED));

  const send = () =>
    run(async () => {
      const result = await sendCode(email);
      if (result.ok) setCodeSent(true);
      return explain(result, "Couldn't send a code to that address.");
    });

  const verify = () =>
    run(async () => {
      const result = await verifyCode(email, code);
      if (result.ok) setCode("");
      return explain(result, "That code didn't work. Check it, or send a new one.");
    });

  const shown = message ?? (googleError ? GOOGLE_FAILED : null);
  const finishingGoogle = googleCode !== null;
  const googleButton = (
    <>
      <button
        type="button"
        disabled={busy || !online}
        onClick={() => void google()}
        className="flex h-14 w-full touch-manipulation items-center justify-center gap-3 rounded-pill bg-ink text-lg font-semibold text-page active:bg-body disabled:opacity-50"
      >
        <GoogleMark className="h-6 w-6" />
        Continue with Google
      </button>
      {!online && (
        <p className="pt-3 text-center text-sm text-body">No signal. Connect to sign in.</p>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header className="px-2 pb-2">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          Me
        </h1>
      </header>

      {!configured ? (
        <Card>
          <p className="text-body">{NOT_SET_UP}</p>
        </Card>
      ) : account === undefined || finishingGoogle ? null : account ? (
        <>
          <Card>
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-primary-pale text-xl font-bold text-ink-deep"
              >
                {account.label.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold text-ink">{account.label}</p>
                {account.email && account.email !== account.label && (
                  <p className="break-words text-body">{account.email}</p>
                )}
              </div>
            </div>
          </Card>
          <BackupCard state={status} />
        </>
      ) : (
        <Card>
          <div className="flex items-start gap-4 pb-5">
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-primary-pale text-primary"
            >
              <CloudIcon />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink">Back up your log</h2>
              <p className="text-body">Keep your history if you lose or change your phone.</p>
            </div>
          </div>
          {googleButton}
        </Card>
      )}

      {configured && account === null && !finishingGoogle && SHOW_EMAIL_CODE && (
        <Card>
          {!codeSent ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (looksLikeEmail(email)) void send();
              }}
              className="flex flex-col gap-3"
            >
              <label htmlFor="email" className="text-sm text-body">
                Or email me a sign-in code
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-control bg-page px-4 text-base text-ink placeholder:text-body"
              />
              <button
                type="submit"
                disabled={busy || !looksLikeEmail(email)}
                className="h-12 w-full touch-manipulation rounded-pill bg-page text-base font-semibold text-ink active:bg-line disabled:opacity-60"
              >
                Send code
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (isCompleteCode(code)) void verify();
              }}
              className="flex flex-col gap-3"
            >
              <label htmlFor="code" className="text-sm text-body">
                Enter the code sent to{" "}
                <span className="font-semibold text-ink">{normalizeEmail(email)}</span>
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={code}
                onChange={(event) => setCode(normalizeCode(event.target.value))}
                placeholder="123456"
                className="h-16 w-full rounded-control bg-page px-4 text-center text-3xl font-bold tracking-[0.3em] text-ink placeholder:text-mute"
              />
              <button
                type="submit"
                disabled={busy || !isCompleteCode(code)}
                className="h-14 w-full touch-manipulation rounded-pill bg-primary text-lg font-bold text-on-primary active:bg-primary-active disabled:opacity-60"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  setMessage(null);
                }}
                className="h-12 touch-manipulation text-sm text-body active:text-ink"
              >
                Use a different email
              </button>
            </form>
          )}
        </Card>
      )}

      {shown && (
        <p role="alert" className="px-2 text-center text-sm font-semibold text-negative-deep">
          {shown}
        </p>
      )}

      {stats && (
        <Card>
          <p className="text-xs font-semibold tracking-wide text-mute uppercase">On this phone</p>
          <p className="pt-1 text-lg font-semibold text-ink tabular-nums">
            {countLabel(stats.sets, "set")} · {countLabel(stats.sessions, "session")}
          </p>
        </Card>
      )}

      {!installed && (
        <div className="flex items-center gap-4 rounded-card border border-line px-6 py-5">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-card text-primary"
          >
            <AddIcon />
          </span>
          <div>
            <p className="font-semibold text-ink">Add to Home Screen</p>
            <p className="text-sm text-body">Share → Add to Home Screen</p>
          </div>
        </div>
      )}

      {configured && account && !finishingGoogle && (
        <div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="h-14 w-full touch-manipulation rounded-pill border border-line text-lg font-semibold text-negative-deep active:bg-line"
          >
            Sign out
          </button>
          <p className="px-2 pt-3 text-sm text-body">Signing out keeps every set on this phone.</p>
        </div>
      )}

      <p className="px-2 pt-2 text-sm text-mute">
        Overload {process.env.NEXT_PUBLIC_APP_VERSION}
      </p>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-card px-6 py-5">{children}</div>;
}

// One card for the three signed-in states. Waiting is normal offline, so it reads calmly; only
// Paused, which needs you to act, gets the warning colour (and the Me tab's badge).
function BackupCard({ state }: { state: BackupState | null | undefined }) {
  if (!state || state.kind === "signed-out") return null;

  if (state.kind === "paused") {
    return (
      <div className="rounded-card border border-warning bg-card px-6 py-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-warning-pale text-lg font-bold text-warning"
          >
            !
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">{backupLabel(state)}</h2>
            <p className="text-body">
              This phone&apos;s sets belong to another account. Sign out, then sign in with that
              account to back them up. Nothing is lost while it&apos;s paused.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const backedUp = state.kind === "backed-up";
  return (
    <Card>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill ${
            backedUp ? "bg-primary-pale text-primary" : "bg-page text-body"
          }`}
        >
          {backedUp ? <CheckIcon /> : <CloudIcon />}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{backupLabel(state)}</h2>
          <p className="text-body">
            {backedUp ? "Everything on this phone is backed up." : "Backs up when you're online."}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function CloudIcon() {
  return (
    <Glyph>
      <path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.5 4.3 4.3 0 0 0 7 18Z" />
    </Glyph>
  );
}

function CheckIcon() {
  return (
    <Glyph>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Glyph>
  );
}

function AddIcon() {
  return (
    <Glyph>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Glyph>
  );
}
