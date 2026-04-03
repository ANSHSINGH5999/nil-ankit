import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { Sparkles, UserPlus, LogIn } from 'lucide-react';

function buildDefaultProfile(user, fallbackName = '') {
  return {
    displayName: fallbackName || user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    skillsOffered: [],
    skillsWanted: [],
    createdAt: new Date().toISOString(),
  };
}

export default function Login() {
  const [isSignApp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatAuthError = (err) => {
    const code = err?.code || '';
    const message = err?.message || 'Login failed.';

    if (code.includes('auth/unauthorized-domain')) {
      return 'Google sign-in is blocked for this domain. Open the app on http://localhost:3006 or add the current domain to Firebase Authentication > Settings > Authorized domains.';
    }

    if (code.includes('auth/operation-not-allowed')) {
      return 'This sign-in method is not enabled in Firebase Authentication. Enable Email/Password or Google in the Firebase console.';
    }

    if (code.includes('auth/invalid-credential') || code.includes('auth/invalid-login-credentials')) {
      return 'Invalid email or password for this Firebase project.';
    }

    if (code.includes('auth/popup-closed-by-user')) {
      return 'Google sign-in popup was closed before login finished.';
    }

    if (code.includes('auth/popup-blocked')) {
      return 'Your browser blocked the Google sign-in popup. Allow popups for this site and try again.';
    }

    return message.replace('Firebase: ', '');
  };

  const ensureUserProfile = async (user, fallbackName = '') => {
    const userRef = ref(db, `users/${user.uid}`);
    const existingProfile = await get(userRef);

    if (existingProfile.exists()) {
      return;
    }

    await set(userRef, buildDefaultProfile(user, fallbackName));
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isSignApp) {
        const trimmedName = name.trim();
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

        if (trimmedName) {
          await updateProfile(cred.user, { displayName: trimmedName });
        }

        try {
          await ensureUserProfile(cred.user, trimmedName);
        } catch (profileError) {
          console.error('Profile initialization failed after sign up:', profileError);
        }
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, provider);

      try {
        await ensureUserProfile(cred.user);
      } catch (profileError) {
        console.error('Profile initialization failed after Google sign in:', profileError);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Dynamic Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}>
         <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', background: 'radial-gradient(circle at 10% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 40%)' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel" 
        style={{ width: '100%', maxWidth: '440px', padding: '3rem', position: 'relative', overflow: 'hidden', zIndex: 10, background: 'rgba(255,255,255,0.02)' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '1rem' }}
          >
            <Sparkles size={32} color="var(--text-main)" />
            <h1 className="cinema-title" style={{ fontSize: '2.8rem', fontWeight: '400', margin: 0 }}>Skill Sync<sup style={{fontSize: '0.8rem'}}>®</sup></h1>
          </motion.div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Enter the student ecosystem.</p>
        </div>

        {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</motion.div>}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {isSignApp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.90rem', color: 'var(--text-muted)' }}>Full Name</label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required={isSignApp} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }} />
            </motion.div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.90rem', color: 'var(--text-muted)' }}>Email Address</label>
            <input type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)'}} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.90rem', color: 'var(--text-muted)' }}>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)'}} />
          </div>

          <button type="submit" className="liquid-glass" style={{ marginTop: '1rem', padding: '14px', width: '100%' }} disabled={loading}>
            {loading ? 'Processing...' : (isSignApp ? <><UserPlus size={20}/> Create Account</> : <><LogIn size={20}/> Sign In</>)}
          </button>

          <div style={{ position: 'relative', textAlign: 'center', margin: '1.5rem 0' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 0 }} />
            <span style={{ display: 'inline-block', background: 'var(--bg-primary)', padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', position: 'relative', zIndex: 1 }}>Or continue with</span>
          </div>

          <button type="button" onClick={handleGoogleAuth} className="btn-secondary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
            Google
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-muted)', fontSize: '0.90rem' }}>
          {isSignApp ? "Already have an account?" : "Don't have an account?"}{' '}
          <span style={{ color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500', textDecoration: 'underline' }} onClick={() => setIsSignUp(!isSignApp)}>
            {isSignApp ? 'Sign In' : 'Create one'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
