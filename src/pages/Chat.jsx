import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db, databasePermissionMessage, isDatabasePermissionError } from '../firebase';
import { get, increment, onDisconnect, onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';
import { Sparkles, ArrowLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateChatReply } from '../ai';

export default function Chat({ user }) {
  const [searchParams] = useSearchParams();
  const targetUid = searchParams.get('uid');
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatError, setChatError] = useState('');
  const [chatDisabled, setChatDisabled] = useState(false);
  const [targetPresence, setTargetPresence] = useState(null);
  const [targetTyping, setTargetTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [userProfile, setUserProfile] = useState(null);
  const [hasSetIntro, setHasSetIntro] = useState(false);
  const isDemoTarget = Boolean(targetUser?.isFake || targetUid?.startsWith('fake_'));

  const buildIntroMessage = () => {
    const myName = userProfile?.displayName || 'a Skill Sync member';
    const targetName = targetUser?.displayName || 'there';
    const wanted = userProfile?.skillsWanted?.[0]?.name || 'new skills';
    const offered = userProfile?.skillsOffered?.[0]?.name || 'what I can teach';
    return `Hi ${targetName}, I'm ${myName}. I'm currently trying to improve ${wanted}, and I can help with ${offered}. Want to connect for a quick skill exchange?`;
  };

  useEffect(() => {
    if (targetUser && userProfile && messages.length === 0 && !hasSetIntro) {
      setNewMessage(buildIntroMessage());
      setHasSetIntro(true);
    }
  }, [targetUser, userProfile, messages.length, hasSetIntro]);

  const getChatId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  const markChatAsRead = async (chatId) => {
    try {
      await update(ref(db), {
        [`userChats/${user.uid}/${chatId}/unreadCount`]: 0,
        [`userChats/${user.uid}/${chatId}/lastReadAt`]: Date.now(),
      });
    } catch (error) {
      console.error('Failed to mark chat as read:', error);
    }
  };

  const writeChatSummaries = async ({
    chatId,
    senderId,
    senderName,
    recipientId,
    recipientName,
    text,
    recipientIsDemo = false,
  }) => {
    const timestamp = Date.now();
    await update(ref(db), {
      [`userChats/${senderId}/${chatId}/chatId`]: chatId,
      [`userChats/${senderId}/${chatId}/otherUserId`]: recipientId,
      [`userChats/${senderId}/${chatId}/otherUserName`]: recipientName,
      [`userChats/${senderId}/${chatId}/otherUserIsDemo`]: recipientIsDemo,
      [`userChats/${senderId}/${chatId}/lastMessage`]: text,
      [`userChats/${senderId}/${chatId}/lastTimestamp`]: timestamp,
      [`userChats/${senderId}/${chatId}/unreadCount`]: 0,
      [`userChats/${recipientId}/${chatId}/chatId`]: chatId,
      [`userChats/${recipientId}/${chatId}/otherUserId`]: senderId,
      [`userChats/${recipientId}/${chatId}/otherUserName`]: senderName,
      [`userChats/${recipientId}/${chatId}/otherUserIsDemo`]: false,
      [`userChats/${recipientId}/${chatId}/lastMessage`]: text,
      [`userChats/${recipientId}/${chatId}/lastTimestamp`]: timestamp,
      [`userChats/${recipientId}/${chatId}/unreadCount`]: increment(1),
    });
  };

  const defaultProfile = {
    displayName: user.displayName || user.email?.split('@')[0] || 'new user',
    email: user.email || '',
  };

  useEffect(() => {
    if (!targetUid) { navigate('/dashboard'); return; }

    let isMounted = true;

    get(ref(db, `users/${targetUid}`))
      .then((snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          setTargetUser(snap.val());
        }
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) return;
        setTargetUser({ displayName: 'Match' });
        if (isDatabasePermissionError(error)) {
          setChatError(databasePermissionMessage);
          setChatDisabled(true);
        }
      });

    get(ref(db, `users/${user.uid}`))
      .then((snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          setUserProfile(snap.val());
          return;
        }

        setUserProfile(defaultProfile);
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) return;
        setUserProfile(defaultProfile);
        if (isDatabasePermissionError(error)) {
          setChatError(databasePermissionMessage);
          setChatDisabled(true);
        }
      });

    const chatId = getChatId(user.uid, targetUid);
    const messagesRef = ref(db, `chats/${chatId}/messages`);

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        if (!isMounted) return;
        const value = snapshot.val() || {};
        const msgs = Object.entries(value)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => {
            const aTime = typeof a.createdAt === 'number' ? a.createdAt : 0;
            const bTime = typeof b.createdAt === 'number' ? b.createdAt : 0;
            return aTime - bTime;
          });
        setMessages(msgs);
        markChatAsRead(chatId);
      },
      (error) => {
        console.error(error);
        if (!isMounted) return;
        if (isDatabasePermissionError(error)) {
          setChatError(databasePermissionMessage);
          setChatDisabled(true);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [targetUid, user.uid, navigate]);

  useEffect(() => {
    if (!targetUid) {
      return undefined;
    }

    const presenceRef = ref(db, `presence/${targetUid}`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      setTargetPresence(snapshot.val());
    });

    return () => unsubscribe();
  }, [targetUid]);

  useEffect(() => {
    if (!targetUid) {
      return undefined;
    }

    const chatId = getChatId(user.uid, targetUid);
    const typingRef = ref(db, `typing/${chatId}/${targetUid}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      setTargetTyping(Boolean(snapshot.val()));
    });

    return () => unsubscribe();
  }, [targetUid, user.uid]);

  useEffect(() => {
    if (!targetUid || chatDisabled) {
      return undefined;
    }

    const chatId = getChatId(user.uid, targetUid);
    const myTypingRef = ref(db, `typing/${chatId}/${user.uid}`);
    const isTyping = newMessage.trim().length > 0;

    if (isTyping) {
      set(myTypingRef, true).catch((error) => console.error('Failed to set typing status:', error));
      onDisconnect(myTypingRef).remove().catch((error) => console.error('Failed to clear typing status on disconnect:', error));
    } else {
      remove(myTypingRef).catch((error) => console.error('Failed to clear typing status:', error));
    }

    return () => {
      remove(myTypingRef).catch((error) => console.error('Failed to clear typing status on cleanup:', error));
    };
  }, [newMessage, targetUid, user.uid, chatDisabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || chatDisabled) return;
    
    const chatId = getChatId(user.uid, targetUid);
    const messageText = newMessage;
    setNewMessage('');
    remove(ref(db, `typing/${chatId}/${user.uid}`)).catch((error) => console.error('Failed to clear typing status after send:', error));
    
    // 1. Send our message
    try {
      await set(push(ref(db, `chats/${chatId}/messages`)), {
        text: messageText,
        senderId: user.uid,
        createdAt: serverTimestamp() 
      });
      await writeChatSummaries({
        chatId,
        senderId: user.uid,
        senderName: userProfile?.displayName || defaultProfile.displayName,
        recipientId: targetUid,
        recipientName: targetUser?.displayName || 'Match',
        text: messageText,
        recipientIsDemo: isDemoTarget,
      });
    } catch (error) {
      console.error(error);
      if (isDatabasePermissionError(error)) {
        setChatError(databasePermissionMessage);
        setChatDisabled(true);
        setNewMessage(messageText);
        return;
      }

      throw error;
    }
    
    // 2. Trigger AI Reply instantly (for presentation purposes)
    if (targetUser && isDemoTarget) {
        // Construct basic history
        const h = [...messages.slice(-5), {senderId: user.uid, text: messageText}].map(m => ({
           sender: m.senderId === user.uid ? 'User' : targetUser.displayName,
           text: m.text
        }));
        
        try {
            const aiResponse = await generateChatReply(targetUser, h, "MOCKED_KEY");
            if(aiResponse) {
                await set(push(ref(db, `chats/${chatId}/messages`)), {
                  text: aiResponse,
                  senderId: targetUid, // Spoofing the other user
                  createdAt: serverTimestamp() 
                });
                await writeChatSummaries({
                  chatId,
                  senderId: targetUid,
                  senderName: targetUser?.displayName || 'Demo user',
                  recipientId: user.uid,
                  recipientName: userProfile?.displayName || defaultProfile.displayName,
                  text: aiResponse,
                });
                await markChatAsRead(chatId);
            }
        } catch(err) {
            alert("AI Chat Reply Error: " + err.message);
            console.error("AI reply failed: ", err);
        }
    }
  };

  if(!targetUser) return null;

  return (
    <div className="cinema-page" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="glass-panel animate-fade-rise" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'transparent', color: 'var(--text-main)', display: 'flex' }}><ArrowLeft /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '1rem' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="cinema-title" style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{targetUser.displayName?.charAt(0)}</span>
            </div>
            <div>
              <h2 className="cinema-title" style={{ fontSize: '1.6rem', margin: '0 0 2px 0', color: 'white' }}>{targetUser.displayName}</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                {isDemoTarget
                  ? 'Demo profile with instant AI replies'
                  : targetPresence?.state === 'online'
                    ? 'Online now'
                    : 'Realtime direct messaging'}
              </span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="glass-panel animate-fade-rise-delay" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatError && (
              <div style={{ color: '#fde68a', background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.32)', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem' }}>
                {chatError}
              </div>
            )}

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                <Sparkles size={30} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>This is the beginning of your conversation with {targetUser.displayName}.</p>
                <p style={{ fontSize: '0.85rem' }}>
                  {isDemoTarget ? 'Send a message to see the demo user reply instantly.' : 'Messages update in realtime for both users.'}
                </p>
              </div>
            )}

            {targetTyping && !isDemoTarget && (
              <div style={{ alignSelf: 'flex-start', maxWidth: '70%' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {targetUser.displayName} is typing...
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe = msg.senderId === user.uid;
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                  <div style={{ 
                    padding: '12px 18px', 
                    borderRadius: '16px', 
                    borderBottomRightRadius: isMe ? '4px' : '16px',
                    borderBottomLeftRadius: !isMe ? '4px' : '16px',
                    background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    fontSize: '0.95rem',
                    lineHeight: '1.4'
                  }}>
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder={chatDisabled ? 'Chat is unavailable until Realtime Database access is fixed.' : isDemoTarget ? 'Ask about skills, projects, or availability...' : 'Send a realtime message...'} 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              disabled={chatDisabled}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', padding: '14px 24px', fontSize: '1rem' }} 
            />
            <button type="submit" className="liquid-glass" disabled={chatDisabled || !newMessage.trim()} style={{ padding: '14px', borderRadius: '50%' }}>
              <Send size={18} />
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
