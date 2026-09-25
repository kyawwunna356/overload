'use client';

import { useEffect, useState } from 'react';
import {
  finishGoogleSignIn,
  onAuthChange,
  sendCode,
  signInWithGoogle,
  signOut,
  syncConfigured,
  verifyCode,
  type Account,
} from '../sync/auth';

export type { Account, AuthResult } from '../sync/auth';

// Who is signed in on this device, live, plus the sign-in actions for the /account screen.
// `account` is undefined until the saved session has been read (a moment, from storage — not
// the network), then the account or null.
export function useAccount() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => onAuthChange(setAccount), []);

  return {
    account,
    configured: syncConfigured(),
    signInWithGoogle,
    finishGoogleSignIn,
    sendCode,
    verifyCode,
    signOut,
  };
}
