// Navbar height at py-3: logo clamps to 82px on desktop, 60px on mobile.
// Evaluated at call time so it reflects the viewport at the moment of tap.
export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  const NAV_HEIGHT = window.innerWidth < 768 ? 60 : 82;

  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT + 2,
    behavior: 'smooth',
  });
}
