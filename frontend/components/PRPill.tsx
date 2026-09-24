import type { PR } from "@/lib/domain/prs";
import { prKindLabel } from "@/lib/format";

// The lasting mark of a record, quiet on purpose: the flash was the celebration. Nothing when
// `prs` is undefined, so a caller can pass a map lookup straight in. The label names what was
// broken, for a screen reader.
export function PRPill({ prs }: { prs: PR[] | undefined }) {
  if (prs === undefined) return null;
  return (
    <span
      role="img"
      aria-label={`Record: ${prs.map((pr) => prKindLabel(pr.kind)).join(", ")}`}
      className="shrink-0 rounded-pill bg-primary-pale px-2 py-0.5 text-xs font-bold text-ink-deep"
    >
      PR
    </span>
  );
}
