// Phone-width shell shared by the app's screens. The safe-area insets keep content clear
// of the notch and home bar (the viewport is set to fill the whole screen in the root layout).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
