// The History tab. A placeholder until milestone 10 builds the sessions and exercises views; it
// exists now so the tab has a static page to open, offline like every other screen.
export default function HistoryPage() {
  return (
    <>
      <header className="px-2 pb-6">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          History
        </h1>
      </header>
      <p className="rounded-card bg-card px-6 py-5 text-body">
        Your sessions and every lift you&apos;ve logged will live here.
      </p>
    </>
  );
}
