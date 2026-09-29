// A lime tick in a pale-green circle: "done this session", on a board heading or row. Decorative;
// the caller says it in words for screen readers.
export function CheckBadge({ size }: { size: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-pill bg-primary-pale text-primary ${
        size === "sm" ? "h-7 w-7" : "h-9 w-9"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
