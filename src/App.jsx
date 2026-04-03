import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { onDisconnect, ref, serverTimestamp, set, update } from 'firebase/database';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import AIAssistant from './components/AIAssistant';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const presenceRef = ref(db, `presence/${user.uid}`);
    const onlineState = {
      state: 'online',
      lastChanged: Date.now(),
    };
    const offlineState = {
      state: 'offline',
      lastChanged: Date.now(),
    };

    set(presenceRef, onlineState).catch((error) => console.error('Failed to set presence:', error));
    onDisconnect(presenceRef).set(offlineState).catch((error) => console.error('Failed to register disconnect presence:', error));

    return () => {
      update(ref(db), {
        [`presence/${user.uid}/state`]: 'offline',
        [`presence/${user.uid}/lastChanged`]: Date.now(),
      }).catch((error) => console.error('Failed to clear presence:', error));
    };
  }, [user]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ padding: '2rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
        Loading Engine...
      </div>
    </div>
  );

  return (
    <Router>
      <>
        <Routes>
          <Route path="/" element={!user ? <Landing /> : <Navigate to="/dashboard" />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" />} />
          <Route path="/chat" element={user ? <Chat user={user} /> : <Navigate to="/" />} />
        </Routes>
        <AIAssistant user={user} />
      </>
    </Router>
  );
}

export default App;
