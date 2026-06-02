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
