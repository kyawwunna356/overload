"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// The pill at the top of a screen that goes back. It goes back through history because the
// previous page is cached: a plain link would ask the server for it, which fails with no
// signal. With no history to go back to (a page opened directly), the link's own navigation
// to `href` applies.
export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
      className="inline-flex h-12 touch-manipulation items-center rounded-pill bg-card px-5 text-base font-semibold text-ink active:bg-line"
    >
      {label}
    </Link>
  );
}
