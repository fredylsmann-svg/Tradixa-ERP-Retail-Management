import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, ArrowLeft, Circle, CheckCheck, MessageSquare, Smile, Info, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

export default function ChatDrawer({ isOpen, onOpenChange, store }) {
  const navigate = useNavigate();
  const isPaidPremium = store?.plan === 'premium';
  const isEnterprise = store?.plan === 'enterprise';
  const isChatLocked = !isPaidPremium && !isEnterprise;
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const messagesEndRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const contactsCacheRef = useRef(null);
  const { settings, playNotificationSound } = useSettings();
  const lastNotifiedTimeRef = useRef(null);

  // Load the real logged-in user once
  useEffect(() => {
    api.auth.me().then(u => { if (u) setCurrentUser(u); }).catch(() => { });
  }, []);

  // Presence Listener
  useEffect(() => {
    const handlePresence = (e) => {
      if (e.detail?.onlineUsers) {
        setOnlineUsers(e.detail.onlineUsers);
      }
    };
    window.addEventListener('presence_sync', handlePresence);
    return () => window.removeEventListener('presence_sync', handlePresence);
  }, []);

  // Load contacts when drawer opens
  useEffect(() => {
    if (isOpen && store?.id && currentUser) loadContacts();
  }, [isOpen, store, currentUser]);

  // OPTIMIZED: Use Supabase Realtime instead of 4-second polling
  useEffect(() => {
    if (!currentUser || !store?.id || !isOpen) return;

    // Initial load
    if (selectedContact) {
      loadMessages();
    } else {
      loadUnreadCounts();
    }

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`chat_drawer_${currentUser.id}_${store.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_messages',
        filter: `store_id=eq.${store.id}`
      }, (payload) => {
        const msg = payload.new || payload.old;
        // Only react to messages involving the current user
        if (msg && (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id)) {
          if (selectedContact) {
            // If conversation is open, reload messages
            if (msg.sender_id === selectedContact.id || msg.receiver_id === selectedContact.id) {
              loadMessages();
            }
          }
          // Always refresh unread counts
          loadUnreadCounts();
        }
      })
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [selectedContact?.id, currentUser?.id, isOpen, store?.id]);

  // Auto-scroll to bottom only on meaningful updates
  const lastMessageIdRef = useRef(null);
  useEffect(() => {
    if (messages.length > 0) {
      const latestId = messages[messages.length - 1].id;
      if (latestId !== lastMessageIdRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        lastMessageIdRef.current = latestId;
      }
    }
  }, [messages]);

  const loadContacts = async () => {
    // Use cached contacts if available to avoid re-fetching on every drawer open
    if (contactsCacheRef.current) {
      setContacts(contactsCacheRef.current);
      return;
    }
    try {
      // Load with column projection — only fetch needed fields
      const allUsers = await api.entities.User.filter({}, null, { columns: 'id, full_name, email, avatar_url, photo_url, position, role, store_id, current_store_id' });
      const storeEmployees = await api.entities.Employee.filter({ store_id: store.id }, null, { columns: 'id, name' });

      const empNames = new Set(storeEmployees.map(e => e.name?.toLowerCase().trim()));

      const storeUsers = allUsers.filter(u => {
        if (u.id === currentUser?.id) return false;
        if (u.store_id === store.id || u.current_store_id === store.id) return true;
        if (u.full_name && empNames.has(u.full_name.toLowerCase().trim())) return true;
        return false;
      });

      contactsCacheRef.current = storeUsers;
      setContacts(storeUsers);
    } catch (e) { console.error('loadContacts:', e); }
  };

  const loadUnreadCounts = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('internal_messages')
        .select('id, sender_id, created_at')
        .eq('store_id', store.id)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);
      if (!error && data) {
        const counts = {};
        let latestTime = 0;
        data.forEach(msg => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          const msgTime = new Date(msg.created_at).getTime();
          if (msgTime > latestTime) latestTime = msgTime;
        });

        if (latestTime > 0) {
          if (lastNotifiedTimeRef.current && latestTime > lastNotifiedTimeRef.current) {
            if (settings?.soundEnabled) playNotificationSound();
          }
          if (!lastNotifiedTimeRef.current || latestTime > lastNotifiedTimeRef.current) {
            lastNotifiedTimeRef.current = latestTime;
          }
        }

        setUnreadCounts(counts);
      }
    } catch (e) { console.error('loadUnreadCounts:', e); }
  };

  const loadMessages = async () => {
    if (!selectedContact || !currentUser) return;
    try {
      // OPTIMIZED: Column projection — only fetch needed fields
      const { data, error } = await supabase
        .from('internal_messages')
        .select('id, sender_id, receiver_id, message, is_read, created_at, created_date')
        .eq('store_id', store.id)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) { console.error('loadMessages error:', error); return; }
      
      if (data) {
        // Only update state if data changed to prevent scroll jumps
        const currentIds = messages.map(m => m.id).join(',');
        const newIds = data.map(m => m.id).join(',');
        
        if (currentIds !== newIds) {
          setMessages(data);
        }

        let latestTime = 0;
        data.forEach(msg => {
          if (msg.sender_id !== currentUser.id) {
            const msgTime = new Date(msg.created_at).getTime();
            if (msgTime > latestTime) latestTime = msgTime;
          }
        });

        if (latestTime > 0) {
          if (lastNotifiedTimeRef.current && latestTime > lastNotifiedTimeRef.current) {
            if (settings?.soundEnabled) playNotificationSound();
          }
          if (!lastNotifiedTimeRef.current || latestTime > lastNotifiedTimeRef.current) {
            lastNotifiedTimeRef.current = latestTime;
          }
        }
      }

      setMessages(data || []);

      // Mark unread messages as read
      const hasUnread = data?.some(m => m.sender_id === selectedContact.id && !m.is_read);
      if (hasUnread) {
        await supabase
          .from('internal_messages')
          .update({ is_read: true })
          .eq('store_id', store.id)
          .eq('sender_id', selectedContact.id)
          .eq('receiver_id', currentUser.id)
          .eq('is_read', false);
        loadUnreadCounts();
      }
    } catch (e) { console.error('loadMessages:', e); }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedContact || !currentUser) return;
    const trimmed = message.trim();
    setMessage('');
    try {
      const { error } = await supabase.from('internal_messages').insert({
        store_id: store.id,
        sender_id: currentUser.id,
        receiver_id: selectedContact.id,
        message: trimmed,
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
      });
      if (error) { console.error('sendMessage error:', error); return; }
      await loadMessages();
    } catch (e) { console.error('sendMessage:', e); }
  };

  const getAvatar = (u) => u?.avatar_url || u?.photo_url || null;
  const getName = (u) => u?.full_name || u?.name || 'Unknown';
  const getInitials = (u) => getName(u).substring(0, 2).toUpperCase();
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

  const filtered = contacts.filter(u =>
    getName(u).toLowerCase().includes(search.toLowerCase()) ||
    (u.position || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col border-l-0 shadow-2xl">

        {/* Header */}
        <SheetHeader className="p-4 border-b bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedContact ? (
              <>
                <button
                  onClick={() => { setSelectedContact(null); setMessages([]); }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={getAvatar(selectedContact)} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-xs">
                      {getInitials(selectedContact)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${onlineUsers[selectedContact.id] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{getName(selectedContact)}</p>
                  <div className="flex items-center gap-1">
                    <Circle className={`w-2 h-2 fill-current ${onlineUsers[selectedContact.id] ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <p className="text-[10px] text-slate-500">
                      {onlineUsers[selectedContact.id] ? 'Online' : 'Offline'} • {selectedContact.position || selectedContact.role || 'Staff'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <MessageSquare className="w-4 h-4" />
                </div>
                Chat Internal
              </SheetTitle>
            )}
          </div>
        </SheetHeader>

        {isChatLocked ? (
          /* ---- Locked Overlay ---- */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Fitur Chat Internal</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-xs">
              Chat Internal hanya tersedia untuk paket <span className="font-bold text-indigo-600">Premium</span>. Upgrade untuk berkomunikasi dengan tim Anda secara real-time.
            </p>
            <button
              onClick={() => { onOpenChange(false); navigate('/PricingPage'); }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" /> Upgrade ke Premium
            </button>
          </div>
        ) : !selectedContact ? (
          /* ---- Contact List ---- */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950">
            <div className="p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Cari rekan kerja..."
                  className="pl-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus-visible:ring-blue-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-400 px-6">
                  <Send className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-4">Tidak ada rekan kerja ditemukan</p>
                  <div className="p-3 bg-blue-50 dark:bg-slate-800/80 rounded-xl text-left border border-blue-100 dark:border-slate-800 shadow-sm flex gap-3">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Karyawan belum ditambahkan. Silakan tambahkan akun karyawan Anda melalui menu <b className="font-bold text-blue-600 dark:text-blue-400">User Management</b> agar dapat berkomunikasi.
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all text-left group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-11 h-11 border border-slate-100 dark:border-slate-800">
                        <AvatarImage src={getAvatar(contact)} />
                        <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm">
                          {getInitials(contact)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${onlineUsers[contact.id] ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn("truncate", unreadCounts[contact.id] ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-800 dark:text-slate-200")}>
                          {getName(contact)}
                        </p>
                        {unreadCounts[contact.id] > 0 && (
                          <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {unreadCounts[contact.id]}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{contact.position || contact.role || 'Staff'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ---- Chat Window ---- */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative bg-white dark:bg-slate-950">
              {/* Premium Subtle Dot Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.1]" 
                   style={{ 
                     backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                     backgroundSize: '20px 20px' 
                   }}></div>
              
              <div className="relative z-10 space-y-4">
                <div className="text-center mb-6">
                  <span className="px-3 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border dark:border-slate-700 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-widest shadow-sm">
                    Hari Ini
                  </span>
                </div>

              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-400">Kirim pesan pertama untuk memulai percakapan</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex flex-col max-w-[85%] min-w-0', isMe ? 'items-end' : 'items-start')}>
                      {!isMe && (
                        <span className="text-[10px] text-slate-500 font-bold mb-1 px-1">
                          {getName(selectedContact)}
                        </span>
                      )}
                      
                      <div className={cn(
                        'px-3.5 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap [word-break:break-word] overflow-wrap-anywhere',
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-none border border-slate-100 dark:border-slate-700'
                      )}>
                        {msg.message}
                      </div>
                      
                      <div className={cn("flex items-center gap-1 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatTime(msg.created_at || msg.created_date)}
                        </span>
                        {isMe && (
                          <CheckCheck className={cn("w-3.5 h-3.5", msg.is_read ? "text-blue-500" : "text-slate-400")} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

                {/* Scroll anchor — always at bottom */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input & Emoji Picker */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Smile className="w-5 h-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-80 p-2 mb-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl outline-none">
                      <div className="max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        <div className="grid grid-cols-7 gap-1" onWheel={(e) => e.stopPropagation()}>
                          {[
                            // Faces & Emotions
                            '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '☺️', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🥳', '🥺', '🤠', '🤡', '🥳', '🥸', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
                            // Gestures & People
                            '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '👣', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄',
                            // Hearts & Symbols
                            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧',
                            // Activities & Objects
                            '✨', '🔥', '🚀', '💡', '🎉', '🎊', '🎈', '🎁', '🎂', '🥂', '🍻', '🍺', '🥤', '☕', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍎', '🍓', '🥑', '🥦', '🥕', '💼', '💻', '📱', '⌨️', '🖱️', '🖨️', '🖥️', '💾', '💿', '📀', '📷', '📹', '🎥', '📞', '📠', '🔌', '🔋', '🕰️', '⌛', '⏳', '⚖️', '⛓️', '🧰', '🔧', '🔨', '⚒️', '⛏️', '🔩', '⚙️', '🧱', '🪜', '🧺', '🧹', '🧼', '🪠', '🔑', '🔐', '🔒', '🔓', '🔏', '📦', '🏷️', '📄', '📑', '📅', '🗑️', '📌', '📍'
                          ].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => setMessage(prev => prev + emoji)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(); }}
                    placeholder="Ketik pesan..."
                    className="pl-11 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus-visible:ring-blue-600"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800 transition-all shadow-md active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
