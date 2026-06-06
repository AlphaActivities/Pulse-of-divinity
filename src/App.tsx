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

function getPage(): 'home' | 'archive' {
  return window.location.hash === '#collected-works' ? 'archive' : 'home';
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
        trackCollectionViewed({ collection_name: 'available_works', artwork_count: 2 });
      },
      about:       () => trackSectionViewed({ section_name: 'artist_story' }),
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
    const onHashChange = () => setPage(getPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Direct React state navigation from archive — no hash roundtrip needed.
  // Updates the URL silently then swaps the page tree synchronously.
  const handleNavigateHome = () => {
    window.history.replaceState(null, '', '/');
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
