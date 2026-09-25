"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  isCompleteCode,
  looksLikeEmail,
  normalizeCode,
  normalizeEmail,
  type BackupState,
} from "@/lib/domain/signin";
import { useAccount, type AuthResult } from "@/lib/hooks/useAccount";
import { useBackupStatus } from "@/lib/hooks/useBackupStatus";
import { BackLink } from "./BackLink";
import { GoogleMark } from "./GoogleMark";

// Sign in to back up: Continue with Google, or an emailed code as the fallback. This is the one
// screen allowed to wait on the network (Hard Rule 5's written exception) — it's used once per
// device and never on the logging path. Everything else about backup happens in the background.
//
// Google comes back here with `?code=…`, which is exchanged once and then removed from the URL.

const NO_SIGNAL = "No signal. Try again when you're online.";
const NOT_SET_UP = "Backup isn't set up on this copy of the app.";
const GOOGLE_FAILED = "Google sign-in didn't finish. Try again, or use an email code.";

function explain(result: AuthResult, rejected: string): string | null {
  if (result.ok) return null;
  if (result.reason === "offline") return NO_SIGNAL;
  if (result.reason === "unconfigured") return NOT_SET_UP;
  return rejected;
}

export function AccountForm() {
  const { account, configured, signInWithGoogle, finishGoogleSignIn, sendCode, verifyCode, signOut } =
    useAccount();
  const status = useBackupStatus();
  const router = useRouter();
  const params = useSearchParams();

  const googleCode = params.get("code");
  const googleError = params.has("error");
  // Arrived from Google: history now holds Google's page, so "Board" must not go back to it.
  const [cameFromGoogle] = useState(() => googleCode !== null || googleError);

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

  return (
    <div className="pb-8">
      <nav className="pb-4">
        <BackLink href="/" label="‹ Board" direct={cameFromGoogle} />
      </nav>
      <header className="px-2 pb-5">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          Back up
        </h1>
      </header>

      {!configured ? (
        <Card>
          <p className="text-body">{NOT_SET_UP}</p>
        </Card>
      ) : account === undefined || finishingGoogle ? null : account ? (
        <Card>
          <p className="text-sm text-body">Signed in as</p>
          <p className="break-words pb-4 text-lg font-semibold text-ink">{account.label}</p>
          <StatusText state={status} />
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-6 h-12 w-full touch-manipulation rounded-pill bg-page text-base font-semibold text-ink active:bg-line"
          >
            Sign out
          </button>
          <p className="pt-3 text-center text-sm text-body">
            Signing out keeps every set on this phone.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="px-2 text-body">
            Sign in to keep a copy of your training safe. Logging works the same with or without
            signal.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void google()}
            className="flex h-14 w-full touch-manipulation items-center justify-center gap-3 rounded-pill bg-ink text-lg font-semibold text-page active:bg-body disabled:opacity-60"
          >
            <GoogleMark className="h-6 w-6" />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 px-2 text-sm text-body" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

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
                  Email me a sign-in code
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
        </div>
      )}

      {shown && (
        <p role="alert" className="px-2 pt-4 text-center text-sm font-semibold text-negative-deep">
          {shown}
        </p>
      )}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-card bg-card px-6 py-5">{children}</div>;
}

function StatusText({ state }: { state: BackupState | null | undefined }) {
  if (!state) return null;
  switch (state.kind) {
    case "backed-up":
      return <p className="text-ink">Everything is backed up ✓</p>;
    case "waiting":
      return (
        <p className="text-body">
          {state.pending} {state.pending === 1 ? "change" : "changes"} waiting. They go up
          whenever there&apos;s signal.
        </p>
      );
    case "paused":
      return (
        <p className="text-body">
          This phone&apos;s sets belong to another account, so backup is paused. Sign out and sign
          in with that account to back them up.
        </p>
      );
    case "signed-out":
      return null;
  }
}
