// The app's pages scroll inside one element (the frame in app/(app)/layout.tsx), not the window:
// on iOS a home-screen app re-measures the window between pages, and a bar fixed to it jumps. The
// frame's tab bar sits below this scroller instead, so nothing is pinned to a moving viewport.

export const PAGE_SCROLLER_ID = 'page';

export function pageScroller(): HTMLElement | null {
  return document.getElementById(PAGE_SCROLLER_ID);
}

// How far the page is scrolled: the scroller's offset, or the window's where there's no frame.
export function pageScrollTop(): number {
  return pageScroller()?.scrollTop ?? window.scrollY;
}

export function scrollPageToTop(): void {
  const scroller = pageScroller();
  if (scroller) scroller.scrollTo({ top: 0 });
  else window.scrollTo({ top: 0 });
}
