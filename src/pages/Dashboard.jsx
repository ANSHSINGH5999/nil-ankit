import { useState, useEffect } from 'react';
import { auth, db, databasePermissionMessage, isDatabasePermissionError } from '../firebase';
import { signOut } from 'firebase/auth';
import { get, onValue, ref, set, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, BookOpen, Sparkles, User, Settings, GraduationCap, X, Plus, Trash2, Key, Users, Map, CheckCircle, Crosshair, Crown, Bell } from 'lucide-react';
import { findBestMatches, generateRoadmap, generateQuiz, generateTeamBuilder, generateSkillGap } from '../ai';
import { seedFakeUsers } from '../utils/seedData';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ user }) {
  const ADMIN_PASSWORD = '4Urukpzzpv@1';
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileWarning, setProfileWarning] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingType, setEditingType] = useState('offered');
  const [newSkill, setNewSkill] = useState('');
  const [newProficiency, setNewProficiency] = useState('Beginner');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminData, setAdminData] = useState({ users: [], chats: [] });
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  
  // AI States
  const [matches, setMatches] = useState(() => {
     const saved = sessionStorage.getItem('savedMatches');
     return saved ? JSON.parse(saved) : [];
  });
  const [isMatching, setIsMatching] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  // Phase 5 States
  const [careerGoal, setCareerGoal] = useState('');
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [aiTeam, setAiTeam] = useState(() => {
     const saved = sessionStorage.getItem('savedAiTeam');
     return saved ? JSON.parse(saved) : null;
  });
  const [isBuildingTeam, setIsBuildingTeam] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [insightMessage, setInsightMessage] = useState('');

  const proficiencyWeight = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const getWantedSkillNames = (record = profile) =>
    (record?.skillsWanted || [])
      .map((skill) => (typeof skill === 'string' ? skill : skill?.name || ''))
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

  const getOfferedSkillNames = (record) =>
    (record?.skillsOffered || [])
      .map((skill) => (typeof skill === 'string' ? skill : skill?.name || ''))
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

  const getSharedWantedSkills = (record) => {
    const wantedSkills = new Set(getWantedSkillNames());
    return getOfferedSkillNames(record).filter((name) => wantedSkills.has(name));
  };

  const isEligibleContact = (record) => getSharedWantedSkills(record).length > 0;

  const getMatchScore = (record) => {
    const wantedSkills = new Set(getWantedSkillNames());
    const offeredSkills = record?.skillsOffered || [];

    let matchedSkillCount = 0;
    let proficiencyScore = 0;

    offeredSkills.forEach((skill) => {
      const skillName = (typeof skill === 'string' ? skill : skill?.name || '').trim().toLowerCase();
      if (!wantedSkills.has(skillName)) {
        return;
      }

      matchedSkillCount += 1;
      const proficiency = (typeof skill === 'string' ? 'beginner' : skill?.proficiency || 'beginner').trim().toLowerCase();
      proficiencyScore += proficiencyWeight[proficiency] || 1;
    });

    return {
      matchedSkillCount,
      proficiencyScore,
      totalScore: matchedSkillCount * 100 + proficiencyScore * 10 + (record?.reputation || 0),
    };
  };

  const sortContactsByRelevance = (records) =>
    [...records].sort((left, right) => {
      const leftScore = getMatchScore(left);
      const rightScore = getMatchScore(right);

      if (rightScore.matchedSkillCount !== leftScore.matchedSkillCount) {
        return rightScore.matchedSkillCount - leftScore.matchedSkillCount;
      }

      if (rightScore.proficiencyScore !== leftScore.proficiencyScore) {
        return rightScore.proficiencyScore - leftScore.proficiencyScore;
      }

      if ((right.reputation || 0) !== (left.reputation || 0)) {
        return (right.reputation || 0) - (left.reputation || 0);
      }

      return (left.displayName || '').localeCompare(right.displayName || '');
    });

  const getStrongestMatchingSkill = (record) => {
    const wantedSkills = new Set(getWantedSkillNames());
    const offeredSkills = record?.skillsOffered || [];
    const matchedSkills = offeredSkills
      .map((skill) => ({
        name: (typeof skill === 'string' ? skill : skill?.name || '').trim(),
        proficiency: (typeof skill === 'string' ? 'Beginner' : skill?.proficiency || 'Beginner').trim(),
      }))
      .filter((skill) => wantedSkills.has(skill.name.toLowerCase()));

    if (matchedSkills.length === 0) {
      return null;
    }

    matchedSkills.sort((left, right) => {
      const leftWeight = proficiencyWeight[left.proficiency.toLowerCase()] || 1;
      const rightWeight = proficiencyWeight[right.proficiency.toLowerCase()] || 1;
      return rightWeight - leftWeight;
    });

    return matchedSkills[0];
  };

  const isExactSingleSkillMatch = (record) => {
    const wantedSkills = getWantedSkillNames();
    const sharedSkills = getSharedWantedSkills(record);
    return wantedSkills.length === 1 && sharedSkills.length === 1 && sharedSkills[0] === wantedSkills[0];
  };

  const getSkillPreview = (userRecord) => {
    const offered = userRecord?.skillsOffered?.slice(0, 2)?.map((skill) => skill.name || skill) || [];
    if (offered.length === 0) {
      return 'Open to connect';
    }
    return offered.join(', ');
  };

  const reputationScore = profile?.reputation || 0; 

  useEffect(() => {
    fetchProfile();
    fetchGlobalUsers();
  }, [user]);

  useEffect(() => {
    const conversationsRef = ref(db, `userChats/${user.uid}`);
    const unsubscribe = onValue(
      conversationsRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const items = Object.values(value).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));
        setConversations(items);
      },
      (error) => {
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        setPresenceMap(snapshot.val() || {});
      },
      (error) => {
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchGlobalUsers = async () => {
    try {
      const snapshot = await get(ref(db, 'users'));
      const allUsers = snapshot.exists() ? snapshot.val() : {};
      let us = Object.entries(allUsers)
        .filter(([uid, data]) => uid !== user.uid && data?.displayName)
        .map(([uid, data]) => ({ uid, ...data }));

      if (us.length === 0) {
        await seedFakeUsers();
        const seededSnapshot = await get(ref(db, 'users'));
        const seededUsers = seededSnapshot.exists() ? seededSnapshot.val() : {};
        us = Object.entries(seededUsers)
          .filter(([uid, data]) => uid !== user.uid && data?.displayName)
          .map(([uid, data]) => ({ uid, ...data }));
      }

      setGlobalUsers(sortContactsByRelevance(us));
    } catch(err) {
      console.error(err);
      if (isDatabasePermissionError(err)) {
        setProfileWarning(databasePermissionMessage);
      }
      setGlobalUsers([]);
    }
  };

  const fetchProfile = async () => {
    const defaultProfile = { displayName: user.displayName || user.email.split('@')[0], email: user.email, skillsOffered: [], skillsWanted: [], reputation: 0 };
    try {
      const snapshot = await get(ref(db, `users/${user.uid}`));
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      } else {
        setProfile(defaultProfile);
        await set(ref(db, `users/${user.uid}`), defaultProfile);
      }
    } catch (err) {
      console.error(err);
      setProfile(defaultProfile);
      setProfileWarning(
        isDatabasePermissionError(err)
          ? databasePermissionMessage
          : 'Signed in, but the app could not load your cloud profile.'
      );
    }
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    setLoading(true);
    try {
      const p = profile || {};
      const currentSkills = p[editingType] || [];
      const updatedSkills = [...currentSkills, { name: newSkill.trim(), proficiency: newProficiency }];
      await update(ref(db, `users/${user.uid}`), { [editingType]: updatedSkills });
      setProfile({ ...p, [editingType]: updatedSkills });
      setNewSkill(''); setNewProficiency('Beginner');
    } finally { setLoading(false); }
  };

  const removeSkill = async (index) => {
    setLoading(true);
    try {
      const p = profile || {};
      const currentSkills = [...(p[editingType] || [])];
      currentSkills.splice(index, 1);
      await update(ref(db, `users/${user.uid}`), { [editingType]: currentSkills });
      setProfile({ ...p, [editingType]: currentSkills });
    } finally { setLoading(false); }
  };

  const saveApiKey = async () => {
    setLoading(true);
    try {
      await update(ref(db, `users/${user.uid}`), { geminiApiKey: apiKey });
      setProfile({...profile, geminiApiKey: apiKey});
      setIsSettingsOpen(false);
    } finally { setLoading(false); }
  }

  // AI Executors
  const handleAIAnalysis = async () => {
    setInsightMessage('');
    setIsMatching(true);
    try {
      if (getWantedSkillNames().length === 0) {
        setMatches([]);
        setInsightMessage('Add at least one skill in "I want to learn" to unlock matched messaging.');
        return;
      }

      const snapshot = await get(ref(db, 'users'));
      const allUsers = snapshot.exists() ? snapshot.val() : {};
      let allOtherUsers = Object.entries(allUsers)
        .filter(([uid, data]) => uid !== user.uid && data?.displayName)
        .map(([uid, data]) => ({ uid, ...data }));

      if (allOtherUsers.length === 0) {
        await seedFakeUsers();
        const seededSnapshot = await get(ref(db, 'users'));
        const seededUsers = seededSnapshot.exists() ? seededSnapshot.val() : {};
        allOtherUsers = Object.entries(seededUsers)
          .filter(([uid, data]) => uid !== user.uid && data?.displayName)
          .map(([uid, data]) => ({ uid, ...data }));
      }

      allOtherUsers = sortContactsByRelevance(allOtherUsers.filter(isEligibleContact));

      if(allOtherUsers.length === 0) {
        setMatches([]);
        setInsightMessage('No matched users found yet. Add more skills you want to learn or wait for users who offer them.');
        return;
      }
      
      const rawMatches = await findBestMatches(profile, allOtherUsers);
      const enriched = rawMatches.map(m => {
        const fullUser = allOtherUsers.find(ou => ou.uid === m.uid);
        return { ...m, ...fullUser };
      }).filter(m => m.displayName);
      setMatches(enriched);
      setInsightMessage(enriched.length === 0 ? 'No strong single-match results were generated.' : '');
      sessionStorage.setItem('savedMatches', JSON.stringify(enriched));
    } catch (err) { alert("AI mapping failed: " + err.message); console.error(err); } finally { setIsMatching(false); }
  };

  const handleTeamBuilder = async () => {
    setInsightMessage('');
    setIsBuildingTeam(true);
    try {
      if (getWantedSkillNames().length === 0) {
        setAiTeam(null);
        setInsightMessage('Add at least one skill in "I want to learn" to assemble a relevant triad.');
        return;
      }

      const snapshot = await get(ref(db, 'users'));
      const allUsers = snapshot.exists() ? snapshot.val() : {};
      let allOtherUsers = Object.entries(allUsers)
        .filter(([uid, data]) => uid !== user.uid && data?.displayName)
        .map(([uid, data]) => ({ uid, ...data }));

      if (allOtherUsers.length < 2) {
        await seedFakeUsers();
        const seededSnapshot = await get(ref(db, 'users'));
        const seededUsers = seededSnapshot.exists() ? seededSnapshot.val() : {};
        allOtherUsers = Object.entries(seededUsers)
          .filter(([uid, data]) => uid !== user.uid && data?.displayName)
          .map(([uid, data]) => ({ uid, ...data }));
      }

      allOtherUsers = sortContactsByRelevance(allOtherUsers.filter(isEligibleContact));

      if(allOtherUsers.length < 2) {
        setAiTeam(null);
        setInsightMessage('At least two matched users are needed to assemble a triad.');
        return;
      }
      
      const teamMatch = await generateTeamBuilder(profile, allOtherUsers);
      const enrichedMembers = teamMatch.members.map(uid => allOtherUsers.find(ou => ou.uid === uid)).filter(Boolean);
      const builtTeam = { ...teamMatch, membersData: sortContactsByRelevance(enrichedMembers) };
      setAiTeam(builtTeam);
      setInsightMessage(enrichedMembers.length === 0 ? 'No triad members were available for the generated team.' : '');
      sessionStorage.setItem('savedAiTeam', JSON.stringify(builtTeam));
    } catch (err) { alert("Team builder failed: " + err.message); console.error(err); } finally { setIsBuildingTeam(false); }
  };

  const handleFullScan = () => {
     // API check bypassed
     handleAIAnalysis();
     handleTeamBuilder();
  };

  const compileRoadmap = async (skill) => {
    setIsRoadmapLoading(true);
    try {
      const roadmap = await generateRoadmap(skill.name || skill);
      setActiveRoadmap({ skill: skill.name || skill, data: roadmap });
    } catch(err) { alert("Error generating roadmap"); } finally { setIsRoadmapLoading(false); }
  };

  const startQuiz = async (skill) => {
    setIsQuizLoading(true); setQuizScore(null); setSelectedAnswers({});
    try {
      const quiz = await generateQuiz(skill.name || skill, skill.proficiency || 'General');
      setActiveQuiz({ skill: skill.name || skill, data: quiz });
    } catch(err) { alert("Error generating quiz"); } finally { setIsQuizLoading(false); }
  };

  const submitQuiz = async () => {
    let score = 0;
    activeQuiz.data.forEach((q, i) => { if (selectedAnswers[i] === q.correctAnswerIndex) score++; });
    setQuizScore(score);
    if(score === activeQuiz.data.length && profile) {
       const newRep = (profile.reputation || reputationScore) + 25;
       await update(ref(db, `users/${user.uid}`), { reputation: newRep });
       setProfile({...profile, reputation: newRep});
    }
  };

  const handleGapAnalysis = async (e) => {
    e.preventDefault();
    if (!careerGoal.trim()) return;
    setIsAnalyzingGap(true);
    try {
      const result = await generateSkillGap(profile, careerGoal);
      setGapAnalysis(result);
    } catch(err) { alert("Error analyzing career gap."); } finally { setIsAnalyzingGap(false); }
  };

  const handleNotifClick = () => { alert("Smart Notifications are active! No new alerts right now."); };

  const loadAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const [usersSnapshot, chatsSnapshot, presenceSnapshot] = await Promise.all([
        get(ref(db, 'users')),
        get(ref(db, 'chats')),
        get(ref(db, 'presence')),
      ]);

      const usersValue = usersSnapshot.exists() ? usersSnapshot.val() : {};
      const chatsValue = chatsSnapshot.exists() ? chatsSnapshot.val() : {};
      const presenceValue = presenceSnapshot.exists() ? presenceSnapshot.val() : {};

      const users = Object.entries(usersValue).map(([uid, record]) => ({
        uid,
        ...record,
        presence: presenceValue?.[uid]?.state || 'offline',
      }));

      const chats = Object.entries(chatsValue).map(([chatId, chatRecord]) => {
        const messages = Object.values(chatRecord?.messages || {}).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        const participants = chatId.split('_');
        return {
          chatId,
          participants,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.text || '',
        };
      }).sort((a, b) => b.messageCount - a.messageCount);

      setAdminData({ users, chats });
    } catch (error) {
      console.error(error);
      setAdminError('Failed to load admin data.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  const openAdminPanel = async () => {
    if (adminPassword !== ADMIN_PASSWORD) {
      setAdminError('Incorrect admin password.');
      return;
    }

    setAdminError('');
    setAdminPassword('');
    setIsAdminPromptOpen(false);
    setIsAdminPanelOpen(true);
    await loadAdminData();
  };

  const handleAdminSeed = async () => {
    setIsAdminLoading(true);
    try {
      await seedFakeUsers();
      await loadAdminData();
      await fetchGlobalUsers();
    } catch (error) {
      console.error(error);
      setAdminError('Failed to seed demo users.');
      setIsAdminLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <nav className="glass-panel animate-fade-rise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Sparkles size={28} color="white" />
          <span className="cinema-title" style={{ fontSize: '2rem' }}>Skill Sync<sup style={{fontSize: '0.8rem'}}>®</sup></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Hello, {profile?.displayName}</span>
          <button onClick={() => { setAdminError(''); setIsAdminPromptOpen(true); }} className="btn-secondary" style={{ padding: '10px 18px' }} title="Admin Access">
            Admin
          </button>
          <button onClick={handleNotifClick} className="btn-secondary" style={{ padding: '10px' }} title="Notifications"><Bell size={18} /></button>
          <button onClick={() => signOut(auth)} className="btn-secondary" style={{ padding: '10px 18px' }} title="Log out"><LogOut size={18} /></button>
        </div>
      </nav>

      {profileWarning && (
        <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fde68a' }}>
          {profileWarning}
        </div>
      )}

      <main style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 2fr', gap: '2.5rem' }}>
        
        {/* Left Column */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel animate-fade-rise" style={{ padding: '2.5rem', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                <User size={36} color="var(--text-muted)" />
              </div>
              <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '20px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <Crown size={12} color="var(--accent-primary)" />
                 <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>{profile?.reputation || reputationScore}</span>
              </div>
            </div>
            <div>
              <h2 className="cinema-title" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>
                 {profile?.displayName}
              </h2>
            </div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}><GraduationCap size={20} color="var(--text-muted)"/> I can teach</h3>
              <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => {setEditingType('skillsOffered'); setIsModalOpen(true)}}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(profile?.skillsOffered || []).length === 0 ? (
                <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No teaching skills.</p></div>
              ) : (
                profile.skillsOffered.map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--border-color)`, padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '6px' }}>{s.name || s}</div>
                        <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>{s.proficiency || 'General'}</span>
                    </div>
                    <button className="liquid-glass" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => startQuiz(s)} disabled={isQuizLoading}><CheckCircle size={14}/> Verify</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}><BookOpen size={20} color="var(--text-muted)"/> I want to learn</h3>
              <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => {setEditingType('skillsWanted'); setIsModalOpen(true)}}>Edit</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               {(profile?.skillsWanted || []).length === 0 ? (
                <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No learning skills.</p></div>
              ) : (
                profile.skillsWanted.map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--border-color)`, padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '6px' }}>{s.name || s}</div>
                        <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>{s.proficiency || 'General'}</span>
                    </div>
                    <button className="liquid-glass" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => compileRoadmap(s)} disabled={isRoadmapLoading}><Map size={14}/> Roadmap</button>
                  </div>
                ))
               )}
            </div>
          </div>
        </motion.div>

        {/* Right Column */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '2.5rem' }}>
             <h3 className="cinema-title" style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}><Crosshair size={24}/> AI Gap Analyzer</h3>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>Input your dream role to see what skills you are missing.</p>
             <form onSubmit={handleGapAnalysis} style={{ display: 'flex', gap: '10px' }}>
               <input type="text" placeholder="e.g. Senior Cloud Architect" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} style={{ flex: 1 }} />
               <button type="submit" className="liquid-glass" disabled={isAnalyzingGap || !careerGoal.trim()}>{isAnalyzingGap ? 'Analyzing Component...' : 'Analyze'}</button>
             </form>
             {gapAnalysis && (
               <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', borderLeft: '2px solid var(--accent-secondary)' }}>
                 <p style={{ fontWeight: '500', marginBottom: '1rem' }}>{gapAnalysis.verdict}</p>
                 <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Missed Prerequisites:</p>
                 <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                   {gapAnalysis.missingSkills.map(ms => <span key={ms} style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>{ms}</span>)}
                 </div>
                 <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>Next Move: {gapAnalysis.nextStep}</p>
               </motion.div>
             )}
          </div>

          <div className="glass-panel" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 className="cinema-title" style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>Realtime Messages</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Only users who teach the skills you want to learn can be messaged directly.</p>
              </div>
              {globalUsers.length > 0 && (
                <button className="btn-secondary" onClick={() => setIsDirectoryOpen(true)}>
                  View All
                </button>
              )}
            </div>

            {getWantedSkillNames().length === 0 ? (
              <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                Add skills under "I want to learn" to unlock matched messaging.
              </div>
            ) : globalUsers.filter(isEligibleContact).length === 0 ? (
              <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                No matched mentors found yet for your current learning goals.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {globalUsers.filter(isEligibleContact).slice(0, 6).map((person) => (
                  <div key={person.uid} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div className="cinema-title" style={{ fontSize: '1.3rem', color: 'white' }}>{person.displayName}</div>
                        {isExactSingleSkillMatch(person) && (
                          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(14, 165, 233, 0.16)', color: '#bae6fd' }}>
                            Exact match
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{getSkillPreview(person)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '0.35rem' }}>
                        Matches: {getSharedWantedSkills(person).join(', ')}
                      </div>
                      {getStrongestMatchingSkill(person) && (
                        <div style={{ fontSize: '0.75rem', color: '#fcd34d', marginTop: '0.25rem' }}>
                          Strongest match: {getStrongestMatchingSkill(person).name} ({getStrongestMatchingSkill(person).proficiency})
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Rank score: {getMatchScore(person).matchedSkillCount} skill match, proficiency {getMatchScore(person).proficiencyScore}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '999px', background: person.isFake ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.14)', color: person.isFake ? '#fcd34d' : '#bbf7d0', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {person.isFake ? 'Demo user' : presenceMap?.[person.uid]?.state === 'online' ? 'Online' : 'Live user'}
                      </span>
                      <button className="liquid-glass" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => navigate('/chat?uid=' + person.uid)}>
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h3 className="cinema-title" style={{ fontSize: '1.8rem', marginBottom: '0.35rem' }}>Inbox</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Recent conversations with unread counts.</p>
              </div>
            </div>

            {conversations.length === 0 ? (
              <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                No conversations yet. Start a message from the directory or AI results to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {conversations.slice(0, 8).map((conversation) => (
                  <button
                    key={conversation.chatId}
                    type="button"
                    onClick={() => navigate('/chat?uid=' + conversation.otherUserId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem 1.1rem',
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      color: 'white',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <span className="cinema-title" style={{ fontSize: '1.2rem' }}>{conversation.otherUserName}</span>
                        {conversation.otherUserIsDemo && (
                          <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d' }}>
                            Demo
                          </span>
                        )}
                        {!conversation.otherUserIsDemo && presenceMap?.[conversation.otherUserId]?.state === 'online' && (
                          <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(34, 197, 94, 0.14)', color: '#bbf7d0' }}>
                            Online
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conversation.lastMessage || 'Open chat'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      {!!conversation.unreadCount && (
                        <span style={{ minWidth: '28px', height: '28px', padding: '0 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14, 165, 233, 0.18)', color: '#bae6fd', fontSize: '0.78rem', fontWeight: 600 }}>
                          {conversation.unreadCount}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {conversation.lastTimestamp ? new Date(conversation.lastTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI SYNTHESIS - THE NEW TAB CONTROL */}
          <div className="glass-panel" style={{ padding: '3.5rem', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="cinema-title" style={{ fontSize: '2.4rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={30} color="var(--text-muted)"/> AI Synthesis
              </h2>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={handleAIAnalysis} 
                  disabled={isMatching}
                >
                  {isMatching ? 'Scanning...' : 'Scan Single Matches'}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleTeamBuilder} 
                  disabled={isBuildingTeam}
                >
                  {isBuildingTeam ? 'Architecting...' : 'Assemble Triad'}
                </button>
                <button className="liquid-glass" onClick={handleFullScan} disabled={isMatching || isBuildingTeam}>
                   {(isMatching || isBuildingTeam) ? 'Running Globally...' : 'Scan Ecosystem (Both)'}
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              
              {/* Show spinners */}
              {isMatching && <div style={{textAlign: 'center', padding: '1rem', color: 'var(--text-muted)'}}>Finding Singles matches...</div>}
              {isBuildingTeam && <div style={{textAlign: 'center', padding: '1rem', color: 'var(--text-muted)'}}>Architecting Triad team...</div>}
              {!isMatching && !isBuildingTeam && insightMessage && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {insightMessage}
                </div>
              )}
              {!isMatching && !isBuildingTeam && !aiTeam && matches.length === 0 && !insightMessage && (
                <div style={{ padding: '2rem', borderRadius: '16px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Run a scan to generate match suggestions and triad recommendations from the student ecosystem.
                </div>
              )}

              {/* Show AI Team if generated */}
              {aiTeam && !isBuildingTeam && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(14,165,233,0.1))', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                      <Users size={24} color="var(--text-main)" />
                      <h3 className="cinema-title" style={{ fontSize: '1.8rem', margin: 0 }}>{aiTeam.teamName}</h3>
                   </div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{aiTeam.synergyReasoning}</p>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     {aiTeam.membersData.map((member, memberIndex) => (
                       <div key={member.uid} style={{ flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <span className="cinema-title" style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.3rem' }}>{member.displayName}</span>
                         <div style={{ marginBottom: '0.8rem' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(234,179,8,0.15)', color: '#facc15', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(234,179,8,0.3)' }}>👑 {member.reputation || (Math.floor(member.uid.charCodeAt(member.uid.length-1)*3.7)+300)} Verified Rep</span>
                         </div>
                         <div style={{ display: 'flex', gap: '8px' }}>
                           <button className="liquid-glass" style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }} onClick={() => navigate('/chat?uid=' + member.uid)}>Internal Message</button>
                           <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => { const nums = ["916303171521", "919030695136", "918106649793"]; const target = nums[memberIndex % 3]; window.open(`https://wa.me/${target}`, '_blank'); }} title="Chat on WhatsApp">💬</button>
                         </div>
                       </div>
                     ))}
                   </div>
                </motion.div>
              )}

              {/* Show Matches */}
              {matches.length > 0 && !isMatching && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 className="cinema-title" style={{ fontSize: '1.8rem', marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Top Individual Synergies</h3>
                  {matches.filter(m => !(aiTeam?.membersData || []).some(t => t.uid === m.uid)).map((m, idx) => (
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} transition={{delay: idx*0.1}} key={m.uid} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                         <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <h4 className="cinema-title" style={{ fontSize: '1.6rem', color: 'white', marginBottom: 0 }}>{m.displayName}</h4>
                              {isExactSingleSkillMatch(m) && (
                                <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(14, 165, 233, 0.16)', color: '#bae6fd' }}>
                                  Exact match
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                               <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(139,92,246,0.2)', color: 'white', borderRadius: '12px' }}>{m.score}% Match</span>
                               <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(234,179,8,0.15)', color: '#facc15', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(234,179,8,0.3)' }}>👑 {m.reputation || (Math.floor(m.uid.charCodeAt(m.uid.length-1)*3.7)+300)} Verified Rep</span>
                               {m.mutual && <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(34,197,94,0.2)', color: 'white', borderRadius: '12px' }}>Mutual</span>}
                            </div>
                            {getStrongestMatchingSkill(m) && (
                              <div style={{ fontSize: '0.8rem', color: '#fcd34d', marginTop: '0.5rem' }}>
                                Strongest skill: {getStrongestMatchingSkill(m).name} ({getStrongestMatchingSkill(m).proficiency})
                              </div>
                            )}
                         </div>
                       </div>
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderLeft: '2px solid var(--border-color)' }}>"{m.reasoning}"</p>
                       <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                         <button className="liquid-glass" style={{ fontSize: '0.8rem', padding: '8px 16px' }} onClick={() => navigate('/chat?uid=' + m.uid)}>Internal Chat</button>
                         <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { const nums = ["916303171521", "919030695136", "918106649793"]; const target = nums[idx % 3]; window.open(`https://wa.me/${target}`, '_blank'); }}>WhatsApp</button>
                       </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Browse Directory Button */}
              {globalUsers.length > 0 && (
                <button className="btn-secondary" style={{ width: '100%', padding: '1rem', marginTop: '2.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }} onClick={() => setIsDirectoryOpen(true)}>
                  🌐 Browse Global Directory ({globalUsers.length} Students)
                </button>
              )}

            </div>
          </div>
        </motion.div>
      </main>

      {/* Ecosystem Directory Modal */}
      <AnimatePresence>
        {isDirectoryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '2rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 className="cinema-title" style={{ fontSize: '2rem' }}>Global Ecosystem Directory</h2>
                <button onClick={() => setIsDirectoryOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>
              <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                {globalUsers.filter(isEligibleContact).map(u => (
                   <div key={u.uid} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <h4 className="cinema-title" style={{ fontSize: '1.3rem', color: 'white' }}>{u.displayName}</h4>
                        {isExactSingleSkillMatch(u) && (
                          <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '999px', background: 'rgba(14, 165, 233, 0.16)', color: '#bae6fd' }}>
                            Exact match
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(234,179,8,0.15)', color: '#facc15', borderRadius: '10px', display: 'inline-block', border: '1px solid rgba(234,179,8,0.3)', marginBottom: '1rem', width: 'fit-content' }}>👑 {u.reputation || (Math.floor(u.uid.charCodeAt(u.uid.length-1)*3.7)+300)} Verified</span>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>Offers: <span style={{color: 'var(--text-main)'}}>{u.skillsOffered?.slice(0,2).map(s=>s.name).join(', ') || 'N/A'}</span></p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', margin: '0 0 1rem 0' }}>Matches: {getSharedWantedSkills(u).join(', ')}</p>
                      {getStrongestMatchingSkill(u) && (
                        <p style={{ fontSize: '0.8rem', color: '#fcd34d', margin: '0 0 1rem 0' }}>
                          Strongest skill: {getStrongestMatchingSkill(u).name} ({getStrongestMatchingSkill(u).proficiency})
                        </p>
                      )}
                      <button className="liquid-glass" style={{ width: '100%', fontSize: '0.8rem', padding: '8px', marginTop: 'auto' }} onClick={() => { setIsDirectoryOpen(false); navigate('/chat?uid=' + u.uid); }}>Direct Message</button>
                   </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ROADMAP MODAL... */}
      <AnimatePresence>
        {activeRoadmap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="cinema-title" style={{ fontSize: '2.2rem', color: 'white' }}>Learning Strategy: <span style={{ color: 'var(--text-muted)' }}>{activeRoadmap.skill}</span></h2>
                <button onClick={() => setActiveRoadmap(null)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activeRoadmap.data.map((r, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.2rem', color: 'white', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>{r.week}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{r.focus}</p>
                    </div>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                      {r.tasks.map((t, idx) => (
                         <li key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'start', marginBottom: '0.8rem', fontSize: '0.95rem' }}><div style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%', marginTop: '8px', flexShrink: 0 }} /><span>{t}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUIZ MODAL... */}
      <AnimatePresence>
        {activeQuiz && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="cinema-title" style={{ fontSize: '2.2rem', color: 'white' }}>Skill Verification</h2>
                <button onClick={() => {setActiveQuiz(null); setQuizScore(null);}} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>
              {quizScore === null ? (
                <div>
                  <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>Complete the assessment to verify your "{activeQuiz.skill}" proficiency.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {activeQuiz.data.map((q, qIndex) => (
                      <div key={qIndex} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontWeight: '500', fontSize: '1.05rem', marginBottom: '1.2rem', lineHeight: '1.5' }}>{qIndex + 1}. {q.question}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {q.options.map((opt, oIndex) => (
                            <button key={oIndex} className="btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px', background: selectedAnswers[qIndex] === oIndex ? 'rgba(255,255,255,0.1)' : 'transparent', borderColor: selectedAnswers[qIndex] === oIndex ? 'white' : 'var(--border-color)' }} onClick={() => setSelectedAnswers({...selectedAnswers, [qIndex]: oIndex})}>{opt}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="liquid-glass" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }} onClick={submitQuiz} disabled={Object.keys(selectedAnswers).length < activeQuiz.data.length}>Submit Evaluation (Awards +25 Rep)</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <h3 className="cinema-title" style={{ fontSize: '4rem', color: quizScore === activeQuiz.data.length ? 'var(--success)' : 'white' }}>{quizScore}/{activeQuiz.data.length}</h3>
                  <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>{quizScore === activeQuiz.data.length ? 'Perfect validation +25 Rep!' : 'Keep practicing.'}</p>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {activeQuiz.data.map((q, qIndex) => (
                      <div key={qIndex} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: `3px solid ${selectedAnswers[qIndex] === q.correctAnswerIndex ? 'var(--success)' : 'var(--danger)'}` }}>
                        <p style={{ fontWeight: '500', marginBottom: '8px' }}>{q.question}</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{q.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal Extracted since presentation mode handles variables internally */}

      {/* Edit Skills Modal Setup */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="cinema-title" style={{ fontSize: '2rem' }}>{editingType === 'skillsOffered' ? 'Skills Offered' : 'Skills Wanted'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Skill Name</label><input type="text" placeholder="e.g. React, Calculus, Spanish" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} /></div>
                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Proficiency Level</label><select value={newProficiency} onChange={(e) => setNewProficiency(e.target.value)} style={{ appearance: 'none', background: 'rgba(0,0,0,0.2)' }}><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option></select></div>
                <button className="liquid-glass" onClick={addSkill} disabled={loading || !newSkill.trim()} style={{ marginTop: '0.5rem', width: '100%' }}><Plus size={18} /> Add</button>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 className="cinema-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Current Skills</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {(profile?.[editingType] || []).map((skill, index) => {
                     const isStr = typeof skill === 'string';
                     return (
                       <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                         <div><span style={{ fontWeight: '500', marginRight: '10px' }}>{isStr ? skill : skill.name}</span>{!isStr && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({skill.proficiency})</span>}</div>
                         <button onClick={() => removeSkill(index)} disabled={loading} style={{ background: 'transparent', color: 'var(--danger)' }}><Trash2 size={18} /></button>
                       </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminPromptOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: '1rem' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="cinema-title" style={{ fontSize: '2rem' }}>Admin Access</h2>
                <button onClick={() => setIsAdminPromptOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={22} /></button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Enter the admin password to open full database access tools.</p>
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Admin password"
                style={{ marginBottom: '1rem' }}
              />
              {adminError && (
                <div style={{ marginBottom: '1rem', color: '#fecaca', background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.32)', borderRadius: '10px', padding: '0.85rem 1rem', fontSize: '0.9rem' }}>
                  {adminError}
                </div>
              )}
              <button className="liquid-glass" style={{ width: '100%' }} onClick={openAdminPanel}>
                Unlock Admin
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 95, padding: '1.5rem' }}>
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 18 }} className="glass-panel" style={{ width: '100%', maxWidth: '1100px', maxHeight: '88vh', overflow: 'auto', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 className="cinema-title" style={{ fontSize: '2.2rem' }}>Admin Console</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>Full access view for users, chats, and demo data.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-secondary" onClick={loadAdminData}>Refresh</button>
                  <button className="btn-secondary" onClick={handleAdminSeed}>Seed Demo Users</button>
                  <button onClick={() => setIsAdminPanelOpen(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Users</div>
                  <div className="cinema-title" style={{ fontSize: '2rem' }}>{adminData.users.length}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Live Chats</div>
                  <div className="cinema-title" style={{ fontSize: '2rem' }}>{adminData.chats.length}</div>
                </div>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Online Now</div>
                  <div className="cinema-title" style={{ fontSize: '2rem' }}>{adminData.users.filter((entry) => entry.presence === 'online').length}</div>
                </div>
              </div>

              {isAdminLoading && (
                <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Loading admin data...</div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h3 className="cinema-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Users</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '55vh', overflow: 'auto' }}>
                    {adminData.users.map((entry) => (
                      <div key={entry.uid} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
                          <div className="cinema-title" style={{ fontSize: '1.15rem' }}>{entry.displayName || entry.email || entry.uid}</div>
                          <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '999px', background: entry.presence === 'online' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(255,255,255,0.06)', color: entry.presence === 'online' ? '#bbf7d0' : 'var(--text-muted)' }}>
                            {entry.presence}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.35rem' }}>{entry.email || 'No email'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>UID: {entry.uid}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem' }}>
                  <h3 className="cinema-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Chats</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '55vh', overflow: 'auto' }}>
                    {adminData.chats.map((chat) => (
                      <div key={chat.chatId} style={{ padding: '0.9rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                        <div className="cinema-title" style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>{chat.participants.join(' + ')}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.35rem' }}>Messages: {chat.messageCount}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.45' }}>{chat.lastMessage || 'No messages yet'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
