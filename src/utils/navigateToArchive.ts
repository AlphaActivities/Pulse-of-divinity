export function navigateToArchive(): void {
  sessionStorage.setItem('lpScrollRestore', String(Math.round(window.scrollY)));
  sessionStorage.setItem('lpScrollRestoreInternal', '1');
  window.history.pushState({ fromSite: true }, '', '/collected-works');
  window.dispatchEvent(new CustomEvent('spaNavigate'));
}
