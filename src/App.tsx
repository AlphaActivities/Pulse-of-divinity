import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EmotionalBridge from './components/EmotionalBridge';
import AvailableWorks from './components/AvailableWorks';
import About from './components/About';
import WorksAlreadyCherished from './components/WorksAlreadyCherished';
import Commissions from './components/Commissions';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CollectedWorksPage from './pages/CollectedWorksPage';
import { scrollToSection } from './utils/scrollToSection';
import { takePendingScroll } from './utils/pendingScroll';
import { trackPageView, trackSectionViewed, trackCollectionViewed } from './utils/analytics';
import { availableWorks } from './data/artworks';

// Give the SPA full control over scroll position — prevents the browser from
// auto-restoring scroll on popstate and interfering with our manual restoration.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function getPage(): 'home' | 'archive' {
  if (window.location.pathname === '/collected-works') return 'archive';
  if (window.location.hash === '#collected-works') return 'archive';
  return 'home';
}

export default function App() {
  const [page, setPage] = useState<'home' | 'archive'>(getPage);
  const observedSections = useRef<Set<string>>(new Set());

  // Track home page view once on mount.
  useEffect(() => {
    trackPageView({ page_path: '/', page_title: 'Pulse of Divinity Home' });
  }, []);

  // Track section views once per session using IntersectionObserver.
  useEffect(() => {
    if (page !== 'home') return;

    const sectionMap: Record<string, () => void> = {
      works: () => {
        trackSectionViewed({ section_name: 'available_works' });
        trackCollectionViewed({ collection_name: 'available_works', artwork_count: availableWorks.length });
      },
      about:       () => trackSectionViewed({ section_name: 'about' }),
      cherished:   () => trackSectionViewed({ section_name: 'cherished_works' }),
      commissions: () => trackSectionViewed({ section_name: 'commissions' }),
      contact:     () => trackSectionViewed({ section_name: 'contact' }),
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).id;
          if (!id || observedSections.current.has(id)) return;
          observedSections.current.add(id);
          sectionMap[id]?.();
        });
      },
      { threshold: 0.4 }
    );

    Object.keys(sectionMap).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    const onNavigate = () => setPage(getPage());
    window.addEventListener('popstate', onNavigate);
    window.addEventListener('spaNavigate', onNavigate);
    return () => {
      window.removeEventListener('popstate', onNavigate);
      window.removeEventListener('spaNavigate', onNavigate);
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === '#collected-works') {
      window.history.replaceState(null, '', '/collected-works');
    }
  }, []);

  // Direct React state navigation from archive — updates URL and swaps the page tree.
  const handleNavigateHome = () => {
    window.history.pushState(null, '', '/');
    setPage('home');
  };

  // Consume any pending scroll queued by ArchiveNavbar when returning home.
  // Two rAFs ensure the home tree has committed and the browser has completed
  // at least one layout pass before scrollToSection reads section offsetTops.
  useEffect(() => {
    if (page !== 'home') return;
    const target = takePendingScroll();
    if (!target) return;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => scrollToSection(target));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [page]);

  // Restore LP scroll position after internal navigation from the landing page.
  // Uses sessionStorage so the value survives pushState without being erased.
  // Polls until document.body is tall enough to support the target (covers
  // the image-load race where scrollHeight is smaller than target on first rAF).
  useEffect(() => {
    if (page !== 'home') return;

    const internal = sessionStorage.getItem('lpScrollRestoreInternal');
    const rawY = sessionStorage.getItem('lpScrollRestore');
    if (!internal || !rawY) return;

    const target = parseInt(rawY, 10);
    if (!target || target <= 0) {
      sessionStorage.removeItem('lpScrollRestore');
      sessionStorage.removeItem('lpScrollRestoreInternal');
      return;
    }

    // Clear immediately — don't re-apply on subsequent renders or refresh.
    sessionStorage.removeItem('lpScrollRestore');
    sessionStorage.removeItem('lpScrollRestoreInternal');

    let rafId: number;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

    const attempt = () => {
      attempts += 1;
      if (document.body.scrollHeight >= target + window.innerHeight || attempts >= MAX_ATTEMPTS) {
        window.scrollTo(0, target);
        return;
      }
      rafId = requestAnimationFrame(attempt);
    };

    rafId = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(rafId);
  }, [page]);

  if (page === 'archive') {
    return <CollectedWorksPage onNavigateHome={handleNavigateHome} />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <EmotionalBridge />
        <AvailableWorks />
        <About />
        <WorksAlreadyCherished />
        <Commissions />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
