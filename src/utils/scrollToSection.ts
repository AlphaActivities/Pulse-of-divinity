// Predicted navbar heights — avoids getBoundingClientRect() forced layout at tap time.
// Expanded = bg-transparent py-5 (top of page), Compressed = glass-nav py-3 (after scroll).
const EXPANDED_NAV_HEIGHT   = 84;
const COMPRESSED_NAV_HEIGHT = 68;

// Vertical padding difference between expanded and compressed states (py-5 vs py-3).
// When the navbar transitions during a smooth scroll, the target Y is adjusted by this
// amount so the section lands flush under the final navbar height.
const NAV_TRANSITION_DELTA = 16;

export function scrollToSection(selector: string): void {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;

  const currentlyExpanded = window.scrollY <= 50;
  const navHeight = currentlyExpanded ? EXPANDED_NAV_HEIGHT : COMPRESSED_NAV_HEIGHT;

  const baseTarget = target.getBoundingClientRect().top + window.scrollY - navHeight;

  const targetWillBeCompressed = baseTarget > 50;
  const targetWillBeExpanded   = baseTarget <= 50;

  let delta = 0;
  if (currentlyExpanded && targetWillBeCompressed) {
    // Navbar will shrink during scroll. The final navbar is shorter, so the
    // page must scroll farther to bring the section flush — add the delta.
    delta = NAV_TRANSITION_DELTA;
  } else if (!currentlyExpanded && targetWillBeExpanded) {
    // Navbar will grow during scroll. The final navbar is taller, so the
    // page must scroll less far — subtract the delta.
    delta = -NAV_TRANSITION_DELTA;
  }

  window.scrollTo({
    top: baseTarget + delta + 2,
    behavior: 'smooth',
  });
}
