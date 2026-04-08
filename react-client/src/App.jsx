import React, { useState, useEffect } from 'react';
import { 
  motion, 
  useSpring, 
  useMotionValue,
  useTransform,
  AnimatePresence,
  useScroll
} from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { ArrowRight, Code, Layout, Smartphone, Database } from 'lucide-react';
import ShaderCanvas from './ShaderCanvas';
import './App.css';

/* =========================================================================
   1. CORE: Smooth Scroll (Silky)
   ========================================================================= */
const SmoothScroll = ({ children }) => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 2.0, // extremely slow and luxurious
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      direction: 'vertical', smooth: true, mouseMultiplier: 0.8,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);
  return <>{children}</>;
};

/* =========================================================================
   2. HEADER (Clean & Minimal)
   ========================================================================= */
const Header = ({ setCursorState }) => {
  return (
    <header className="main-header">
      <div className="logo-container" onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}>
        <span className="logo-text">ZERO & ONE</span>
      </div>
      <nav className="nav-links">
        {['Expertise', 'Portfolio', 'Login'].map((item) => (
          <div 
            key={item} 
            className="nav-link"
            onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}
          >
            {item}
          </div>
        ))}
      </nav>
    </header>
  );
};

/* =========================================================================
   3. ELEGANT TEXT FADES (Scroll Reveal)
   ========================================================================= */
const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 80, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

/* =========================================================================
   MAIN APP WITH CALM AURORA SHADER
   ========================================================================= */
export default function App() {
  const [cursorState, setCursorState] = useState("default");
  
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  // Smooth Cursor Physics
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorXSpring = useSpring(cursorX, { damping: 40, stiffness: 300 });
  const cursorYSpring = useSpring(cursorY, { damping: 40, stiffness: 300 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
      
      cursorX.set(e.clientX - 10);
      cursorY.set(e.clientY - 10);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <SmoothScroll>
      <div className="noise-overlay"></div>
      
      {/* Soft, Calming Midnight Aurora Shader, Now masked by a Torch Light */}
      <div className="torch-mask">
        <ShaderCanvas />
      </div>

      {/* Elegant Torch Core Cursor (Massive Light) */}
      <motion.div
        animate={cursorState}
        variants={{
          default: { width: 30, height: 30, x: 0, y: 0, borderRadius: '50%', background: 'rgba(255, 255, 255, 1)', boxShadow: '0 0 60px 20px rgba(255, 255, 255, 0.6), 0 0 120px 40px rgba(255, 255, 255, 0.3)' },
          hover: { width: 80, height: 80, x: -25, y: -25, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', boxShadow: '0 0 80px 30px rgba(255, 255, 255, 0.4)' }
        }}
        transition={{ type: "spring", mass: 0.1, stiffness: 300, damping: 20 }}
        style={{
          translateX: cursorXSpring, translateY: cursorYSpring,
          position: 'fixed', top: 0, left: 0, borderRadius: '50%',
          pointerEvents: 'none', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      />

      <Header setCursorState={setCursorState} />

      <main style={{ position: 'relative', zIndex: 10 }}>
        
        {/* HERO SECTION */}
        <motion.section 
          className="hero-section"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <FadeUp delay={0.2}>
            <div className="tag-line">A New Era of Digital Design</div>
          </FadeUp>
          
          <FadeUp delay={0.4}>
            <h1 className="massive-title">
              Crafting Digital Masterpieces.
            </h1>
          </FadeUp>
          
          <FadeUp delay={0.6}>
            <div className="hero-subtitle">
              We build high-performance websites and applications that elevate your brand and bring calm to the chaos. Enter an experience of pure elegance.
            </div>
          </FadeUp>

          <FadeUp delay={0.8}>
            <button 
              className="primary-btn"
              onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}
            >
              Start Your Project
            </button>
          </FadeUp>
        </motion.section>

        {/* EXPERTISE SECTION (LUXURY CARDS) */}
        <section className="expertise-section">
          <div className="section-header">
            <FadeUp>
              <h2 className="section-title">Our Capabilities</h2>
            </FadeUp>
          </div>

          <div className="luxury-grid">
            {[
              { title: "Web Development", icon: Code, desc: "Custom, scalable, and secure beautifully crafted systems." },
              { title: "UI/UX Design", icon: Layout, desc: "Intuitive, glass-like visuals that provide exceptional serenity." },
              { title: "Tech Solutions", icon: Database, desc: "End-to-end technology solutions and expert consulting services." },
              { title: "Mobile Apps", icon: Smartphone, desc: "Responsive and native applications acting as fluid extensions of joy." },
            ].map((item, i) => (
              <motion.div 
                key={i}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--card-mouse-x", `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty("--card-mouse-y", `${e.clientY - rect.top}px`);
                }}
                onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true, margin: "-100px" }}
              >
                <div className="glass-card">
                  <div className="card-icon-wrapper">
                    <item.icon size={36} strokeWidth={1} />
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-desc">{item.desc}</p>
                  <div className="card-action">
                    Explore <ArrowRight size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PORTFOLIO ACCORDION (Elegant) */}
        <section className="portfolio-section">
          <FadeUp>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '80px' }}>Selected Deployments</h2>
          </FadeUp>
          
          <div className="portfolio-gallery">
            {[
              { name: "E-Commerce", tag: "Full Stack", src: "/assets/images/portfolio/E-commerce.png" },
              { name: "Rebranding", tag: "Identity", src: "/assets/images/portfolio/rebranding.jpg" },
              { name: "Cloud Solutions", tag: "Infrastructure", src: "/assets/images/portfolio/tech solutions.png" }
            ].map((item, i) => (
              <div key={i} className="project-row" onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}>
                <motion.div 
                   className="project-img-wrapper"
                   initial={{ opacity: 0, scale: 0.9, y: 100 }}
                   whileInView={{ opacity: 1, scale: 1, y: 0 }}
                   transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                   viewport={{ once: true, margin: '-100px' }}
                >
                  <img src={item.src} className="project-img" alt={item.name} />
                </motion.div>
                <motion.div 
                   className="project-info"
                   initial={{ opacity: 0, y: 100 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ duration: 1.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                   viewport={{ once: true, margin: '-100px' }}
                >
                  <span className="project-tag">{item.tag}</span>
                  <h3 className="project-title">{item.name}</h3>
                  <div className="card-action" style={{ color: 'rgba(255,255,255,0.6)' }}>View Case Study <ArrowRight size={14} /></div>
                </motion.div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="main-footer" onMouseEnter={() => setCursorState("hover")} onMouseLeave={() => setCursorState("default")}>
          <div className="footer-logo">ZERO & ONE.</div>
          <div className="footer-links">
            <a href="#">Twitter</a>
            <a href="#">LinkedIn</a>
            <a href="#">Instagram</a>
          </div>
        </footer>
        
      </main>
    </SmoothScroll>
  );
}
