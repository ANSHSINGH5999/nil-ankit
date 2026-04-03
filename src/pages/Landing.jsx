import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Video Background */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.6 }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1 }}></div>

      {/* Navigation */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', maxWidth: '80rem', margin: '0 auto' }}>
        <div className="cinema-title" style={{ fontSize: '2.5rem', letterSpacing: '0.02em', color: 'var(--text-main)', opacity: 0.9 }}>
          Skill Sync<sup style={{ fontSize: '0.8rem' }}>®</sup>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="nav-links-desktop">
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>Home</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-main)'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Ecosystem</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-main)'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Triads</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-main)'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Roadmaps</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='var(--text-main)'} onMouseOut={e=>e.target.style.color='var(--text-muted)'}>Contact</span>
        </div>

        <button className="liquid-glass" style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem' }} onClick={() => navigate('/login')}>
          Launch Platform
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8rem 1.5rem 10rem', minHeight: 'calc(100vh - 100px)', justifyContent: 'center' }}>
        <h1 className="cinema-title animate-fade-rise" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', lineHeight: '0.95', maxWidth: '80rem', margin: 0 }}>
          Trade skills. <em style={{ fontStyle: 'normal', color: 'var(--text-muted)' }}>Build teams.</em> <br/>Accelerate <em style={{ fontStyle: 'normal', color: 'var(--text-muted)' }}>your future.</em>
        </h1>
        
        <p className="animate-fade-rise-delay" style={{ color: 'var(--text-muted)', fontSize: 'clamp(1rem, 1.2vw, 1.125rem)', maxWidth: '42rem', marginTop: '2.5rem', lineHeight: '1.625', padding: '0 1rem' }}>
          Skill Sync seamlessly aligns your core competencies with exactly what you need to learn. Connect with driven students, establish powerful Triads, and supercharge your trajectory through mutual exchange.
        </p>

        <button className="liquid-glass animate-fade-rise-delay-2" style={{ padding: '1.25rem 3.5rem', fontSize: '1rem', marginTop: '3.5rem' }} onClick={() => navigate('/login')}>
          Find Your Match
        </button>
      </section>
    </div>
  );
}
