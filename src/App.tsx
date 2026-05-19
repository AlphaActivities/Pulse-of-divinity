import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EmotionalBridge from './components/EmotionalBridge';
import AvailableWorks from './components/AvailableWorks';
import About from './components/About';
import WorksAlreadyCherished from './components/WorksAlreadyCherished';
import Commissions from './components/Commissions';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
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
