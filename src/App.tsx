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

  // Consume any pending scroll queued by ArchiveNavbar when returning home.
  // takePendingScroll() is null-safe and clears the value on read.
  useEffect(() => {
    if (page !== 'home') return;
    const target = takePendingScroll();
    if (!target) return;
    // No page reload occurred — React just swapped the tree. Give it one
    // paint cycle (~80ms) so section offsetTops are stable before scrolling.
    const id = setTimeout(() => scrollToSection(target), 80);
    return () => clearTimeout(id);
  }, [page]);

  if (page === 'archive') {
    return <CollectedWorksPage />;
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
