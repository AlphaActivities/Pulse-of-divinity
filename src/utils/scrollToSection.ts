// NAV_TRANSITION_DELTA is the difference in total vertical padding between the
// navbar's expanded state (py-5 = 40px) and compressed state (py-3 = 24px).
// When the navbar transitions during a smooth scroll, the target Y must be
// adjusted by this amount so the section lands flush under the navbar.
const NAV_TRANSITION_DELTA = 16;

export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  const nav = document.querySelector('nav');
  const navHeight = nav?.getBoundingClientRect().height ?? 72;

  const baseTarget = target.getBoundingClientRect().top + window.scrollY - navHeight;

  const currentlyExpanded = window.scrollY <= 50;
  const targetWillBeCompressed = baseTarget > 50;
  const currentlyCompressed = window.scrollY > 50;
  const targetWillBeExpanded = baseTarget <= 50;

  let delta = 0;
  if (currentlyExpanded && targetWillBeCompressed) {
    // Navbar will shrink during scroll — subtract the delta so section
    // lands flush under the shorter compressed navbar.
    delta = -NAV_TRANSITION_DELTA;
  } else if (currentlyCompressed && targetWillBeExpanded) {
    // Navbar will grow during scroll — add the delta so section lands
    // flush under the taller expanded navbar.
    delta = NAV_TRANSITION_DELTA;
  }

  window.scrollTo({
    top: baseTarget + delta,
    behavior: 'smooth',
  });
}
