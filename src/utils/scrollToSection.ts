// Fixed navbar height — py-5 in both transparent and glass states.
// Avoids getBoundingClientRect() forced layout at tap time.
const NAV_HEIGHT = 84;

export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT + 2,
    behavior: 'smooth',
  });
}
