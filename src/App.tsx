import { useState, useEffect } from 'react';
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

function getPage(): 'home' | 'archive' {
  return window.location.hash === '#collected-works' ? 'archive' : 'home';
}

export default function App() {
  const [page, setPage] = useState<'home' | 'archive'>(getPage);

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
