export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  const nav = document.querySelector('nav') as HTMLElement | null;
  const NAV_HEIGHT = nav ? Math.ceil(nav.getBoundingClientRect().height) : 68;

  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT,
    behavior: 'smooth',
  });
}
