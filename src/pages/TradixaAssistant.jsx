import React, { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, Send, Bot, User, Loader2, Plus, Menu, Lock, Sparkles, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';

export default function TradixaAssistant({ store }) {
  const navigate = useNavigate();

  const renderMessageContent = (content, isUser) => {
    if (!content) return null;
    const parts = content.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong 
            key={index} 
            className={`font-black tracking-wide ${isUser ? 'text-blue-100 font-extrabold' : 'text-blue-700 font-bold'}`}
          >
            {part}
          </strong>
        );
      }
      return part;
    });
  };
  
  const renderMessageContentWithActions = (msg, msgIdx) => {
    if (msg.role === 'user') {
      return (
        <div className="text-xs lg:text-[13.5px] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
          {renderMessageContent(msg.content, true)}
        </div>
      );
    }

    const actionStart = msg.content.indexOf('---AI_ACTION_START---');
    const actionEnd = msg.content.indexOf('---AI_ACTION_END---');

    if (actionStart === -1 || actionEnd === -1) {
      return (
        <div className="text-xs lg:text-[13.5px] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
          {renderMessageContent(msg.content, false)}
        </div>
      );
    }

    const mainText = msg.content.substring(0, actionStart).trim();
    const jsonStr = msg.content.substring(actionStart + '---AI_ACTION_START---'.length, actionEnd).trim();

    let actionData = null;
    try {
      actionData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI action JSON:', e);
    }

    const actionStatus = msg.executed ? 'success' : (executedActions[msgIdx] || 'idle');

    const handleExecuteAction = async () => {
      if (!actionData || actionStatus !== 'idle') return;
      
      setExecutedActions(prev => ({ ...prev, [msgIdx]: 'loading' }));
      try {
        const entity = actionData.entity;
        const payload = actionData.payload;
        
        // Calculate subtotal and tax amounts dynamically for PR
        if (entity === 'PurchaseRequisition') {
          const subtotal = payload.items?.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0) || 0;
          const tax_amount = payload.include_tax ? subtotal * 0.11 : 0; 
          
          payload.subtotal = subtotal;
          payload.tax_amount = tax_amount;
          payload.total_amount = subtotal + tax_amount;
          payload.status = payload.status || 'Diajukan';
          payload.pr_number = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(7).toUpperCase()}`;
          payload.timestamp_wib = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
          payload.requester = store?.owner_name || 'Administrator';
        }

        if (api.entities[entity]) {
          await api.entities[entity].create(payload, { via_ai: true });
          setExecutedActions(prev => ({ ...prev, [msgIdx]: 'success' }));
          
          // Persist the executed status in localStorage so it remains executed when returning to chat
          if (currentConversation?.id) {
            const chatKey = `chat_${currentConversation.id}`;
            const storedMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
            if (storedMessages[msgIdx]) {
              storedMessages[msgIdx].executed = true;
              localStorage.setItem(chatKey, JSON.stringify(storedMessages));
              setMessages(storedMessages);
            }
          }
          
          sonnerToast.success(`Aksi AI Berhasil: Data ${entity} berhasil dibuat di database!`, {
            description: `Tercatat di Audit Log: 'Created new ${entity} (via Tradixa AI Assistant)'.`,
            duration: 6000
          });
        } else {
          throw new Error(`Entitas ${entity} tidak ditemukan di API.`);
        }
      } catch (err) {
        console.error('Failed to execute AI action:', err);
        setExecutedActions(prev => ({ ...prev, [msgIdx]: 'error' }));
        sonnerToast.error('Gagal mengeksekusi aksi AI. Silakan coba lagi.');
      }
    };

    const isPrSubmitted = actionData?.entity === 'PurchaseRequisition' && (actionData?.payload?.status === 'Diajukan' || !actionData?.payload?.status);

    return (
      <div className="space-y-4">
        {mainText && (
          <div className="text-xs lg:text-[13.5px] leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
            {renderMessageContent(mainText, false)}
          </div>
        )}
        
        {actionData && (
          <div className="mt-3 p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${actionStatus === 'success' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${actionStatus === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">🤖 TRADIXA AI SUGGESTED ACTION</span>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${actionStatus === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {actionStatus === 'success' ? 'Executed' : 'Pending Review'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {actionData.title || `Buat Rekor ${actionData.entity}`}
              </h4>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-[11px] leading-relaxed font-mono">
                {Object.entries(actionData.payload || {}).map(([key, val]) => {
                  if (key === 'items' && Array.isArray(val)) {
                    return (
                      <div key={key} className="border-t border-slate-900 pt-1.5 mt-1.5">
                        <span className="text-emerald-400 font-bold">items:</span>
                        <div className="pl-3 mt-1 space-y-1 text-[10px] text-slate-300">
                          {val.map((item, idx) => (
                            <div key={idx} className="bg-slate-900 p-1.5 rounded border border-slate-800/50">
                              • <span className="font-bold text-slate-100">{item.description}</span> - {item.qty} {item.unit} @ Rp {new Intl.NumberFormat('id-ID').format(item.price || 0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-200 text-right truncate max-w-[200px]" title={String(val)}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {actionStatus === 'success' ? (
                <div className="mt-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3 rounded-xl flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-300">Aksi Sukses Dieksekusi!</p>
                    <p className="text-slate-300 mt-0.5">Data telah aman dimasukkan ke database Supabase dan tercatat di Audit Trail ERP.</p>
                  </div>
                </div>
              ) : actionStatus === 'error' ? (
                <div className="mt-3 bg-red-950/80 border border-red-900 text-red-200 p-3 rounded-xl flex items-start gap-2 text-[11px]">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-300">Eksekusi Aksi Gagal</p>
                    <p className="text-slate-300 mt-0.5">Terjadi kendala jaringan. Silakan coba klik Eksekusi kembali.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={handleExecuteAction}
                    disabled={!isCrudActive || actionStatus === 'loading'}
                    className={`flex-1 h-9 text-xs font-bold rounded-xl shadow-md transition-all ${
                      isCrudActive 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.01]' 
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {actionStatus === 'loading' && (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    )}
                    {isCrudActive 
                      ? `Konfirmasi & Eksekusi (${isPrSubmitted ? 'Diajukan' : 'Draft'})` 
                      : 'Aktifkan AI Actions'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Premium gating logic
  const isTrial = store?.plan === 'pro' && store?.has_used_trial;
  const isFree = !store?.plan || store?.plan === 'free';
  const isAiLocked = isTrial || isFree;

  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCrudActive, setIsCrudActive] = useState(true);
  const [executedActions, setExecutedActions] = useState({});

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      const unsubscribe = api.agents.subscribeToConversation(
        currentConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      return () => unsubscribe();
    }
  }, [currentConversation]);

  useEffect(() => {
    const handler = (e) => {
      setConversations(e.detail.conversations || []);
      if (currentConversation) {
        const updatedCurrent = e.detail.conversations.find(c => c.id === currentConversation.id);
        if (updatedCurrent) {
          setCurrentConversation(updatedCurrent);
        }
      }
    };
    window.addEventListener('conversations_update', handler);
    return () => window.removeEventListener('conversations_update', handler);
  }, [currentConversation]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const convos = await api.agents.listConversations({
        agent_name: 'tradixa_assistant'
      });
      setConversations(convos);
      if (convos.length > 0) {
        loadConversation(convos[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
    setIsLoading(false);
  };

  const loadConversation = async (conversationId) => {
    try {
      const convo = await api.agents.getConversation(conversationId);
      setCurrentConversation(convo);
      setMessages(convo.messages || []);
      setIsSheetOpen(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const convo = await api.agents.createConversation({
        agent_name: 'tradixa_assistant',
        metadata: {
          name: `Chat ${new Date().toLocaleString('id-ID')}`,
          description: 'Percakapan dengan Tradixa Assistant'
        }
      });
      setConversations([convo, ...conversations]);
      setCurrentConversation(convo);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || isSending) return;

    setIsSending(true);
    const userMessage = input;
    setInput('');

    try {
      // Fetch summary metrics to provide real-time context to the AI assistant
      let financialContext = null;
      if (store?.id) {
        try {
          const [products, sales, payables, receivables, expenses] = await Promise.all([
            api.entities.Product.filter({ store_id: store.id }),
            api.entities.SalesTransaction.filter({ store_id: store.id }),
            api.entities.Payable.filter({ store_id: store.id, status: 'Pending' }),
            api.entities.Receivable.filter({ store_id: store.id, status: 'Pending' }),
            api.entities.Expense.filter({ store_id: store.id })
          ]);

          const lowStockCount = products.filter(p => p.stock <= p.reorder_level && p.stock > 0).length;
          const totalRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
          const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
          const totalPayables = payables.reduce((sum, p) => sum + (p.remaining_amount || p.amount || 0), 0);
          const totalReceivables = receivables.reduce((sum, r) => sum + (r.remaining_amount || r.amount || 0), 0);
          const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

          // Build expense breakdown by category
          const expenseByCategory = {};
          expenses.forEach(e => {
            const cat = e.category || 'Lainnya';
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (e.amount || 0);
          });

          financialContext = {
            storeName: store?.store_name || store?.name || 'Toko Anda',
            totalProductsCount: products.length,
            totalTransactionsCount: sales.length,
            revenue: totalRevenue,
            netProfit: totalProfit,
            lowStockCount,
            payablesAmount: totalPayables,
            receivablesAmount: totalReceivables,
            totalExpenses,
            expenseCount: expenses.length,
            expenseByCategory
          };
        } catch (err) {
          console.error("Failed to load context for AI Assistant:", err);
        }
      }

      await api.agents.addMessage(currentConversation, {
        role: 'user',
        content: userMessage
      }, { isCrudActive, financialContext });
    } catch (error) {
      console.error('Error sending message:', error);
    }
    setIsSending(false);
  };

  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ConversationList = () => (
    <>
      {isLoading ? (
        <div className="p-4 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Memuat...
        </div>
      ) : conversations.length === 0 ? (
        <div className="p-4 text-center text-slate-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">Belum ada percakapan</p>
          <Button 
            size="sm" 
            onClick={createNewConversation}
            className="mt-3 bg-blue-600 hover:bg-blue-700"
          >
            Mulai Chat
          </Button>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => loadConversation(convo.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentConversation?.id === convo.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-slate-50'
              }`}
            >
              <p 
                className="font-medium text-sm text-slate-800"
                style={{ 
                  whiteSpace: 'normal', 
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                {convo.metadata?.name || 'Percakapan'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(convo.created_date).toLocaleDateString('id-ID')}
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-4 overflow-hidden">
      {/* Desktop Sidebar - Conversation List */}
      <Card className="hidden lg:flex w-72 flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Percakapan</CardTitle>
            <Button size="icon" onClick={createNewConversation} className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <ConversationList />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden relative">
        {isAiLocked && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center bg-white/80 backdrop-blur-sm rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6 shadow-inner">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Tradixa AI Assistant</h3>
            <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
              Fitur AI Assistant eksklusif untuk paket <span className="font-bold text-blue-600">Pro & Enterprise</span>. 
              Upgrade sekarang untuk mendapatkan asisten pintar yang memahami seluruh bisnis Anda.
            </p>
            <Button
              onClick={() => navigate('/PricingPage')}
              className="flex items-center gap-2 px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl shadow-xl hover:opacity-90 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-5 h-5" /> Upgrade ke Premium
            </Button>
            <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-bold">Premium Feature Only</p>
          </div>
        )}

        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <SheetTitle>Percakapan</SheetTitle>
                    <Button size="icon" onClick={createNewConversation} className="h-8 w-8">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-5rem)]">
                  <ConversationList />
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base lg:text-lg truncate">Tradixa Assistant</CardTitle>
              <p className="text-xs lg:text-sm text-slate-500 truncate">AI Assistant untuk sistem retail</p>
            </div>
            
            {/* AI Actions (CRUD) Toggle and InfoTooltip */}
            <div className="flex items-center gap-2 border-l pl-3 ml-2 border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-[9px] lg:text-[10px] uppercase tracking-wider font-bold text-slate-400">AI Actions</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] lg:text-[10px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${isCrudActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {isCrudActive ? 'Active' : 'Disabled'}
                  </span>
                  
                  {/* Switch Toggle Button */}
                  <button 
                    onClick={() => setIsCrudActive(!isCrudActive)}
                    className={`w-8 h-4 lg:w-9 lg:h-5 rounded-full p-0.5 transition-colors focus:outline-none relative flex items-center ${isCrudActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full bg-white transition-transform shadow-sm transform ${isCrudActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>

                  {/* Info Tooltip Icon */}
                  <div className="relative group cursor-pointer">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-[10px] font-bold transition-all border border-slate-200">i</span>
                    {/* Tooltip Content container */}
                    <div className="absolute right-0 top-6 w-56 lg:w-64 p-3 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl border border-slate-800">
                      <p className="font-bold text-emerald-400 mb-1 flex items-center gap-1">🤖 AI Actions (CRUD)</p>
                      <p className="text-slate-200">
                        {isCrudActive 
                          ? 'Aktif: AI diizinkan menyarankan & mengisi formulir transaksi secara otomatis (PO, Stock Opname, Promosi, dll).' 
                          : 'Nonaktif: AI hanya berjalan dalam mode diskusi/tanya jawab biasa (Tidak bisa memicu aksi CRUD).'}
                      </p>
                      <div className="absolute right-1.5 -top-1 w-2.5 h-2.5 bg-slate-900 rotate-45 border-l border-t border-slate-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50/50">
          {!currentConversation ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium mb-2">Selamat Datang di Tradixa Assistant</p>
                <p className="text-sm mb-4">Mulai percakapan baru untuk mendapatkan bantuan</p>
                <Button onClick={createNewConversation} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Mulai Chat Baru
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 lg:p-6">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-500 mt-12">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Mulai percakapan dengan mengirim pesan</p>
                    <p className="text-sm mt-2">Tanyakan tentang cara menggunakan sistem</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                            <Bot className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-3 py-2 lg:px-4 lg:py-2.5 shadow-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border text-slate-800'
                          }`}
                        >
                          <div 
                            className="text-xs lg:text-[13.5px] leading-relaxed"
                            style={{ 
                              wordWrap: 'break-word', 
                              overflowWrap: 'break-word', 
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {renderMessageContentWithActions(msg, idx)}
                          </div>
                          {msg.created_date && (
                            <p className={`text-[10px] mt-1.5 lg:mt-2 opacity-70 ${msg.role === 'user' ? 'text-blue-50' : 'text-slate-500'}`}>
                              {formatTime(msg.created_date)}
                            </p>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                            <User className="w-4 h-4 lg:w-5 lg:h-5 text-slate-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                          <Bot className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="bg-white border rounded-2xl px-4 py-2.5 shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-3 lg:p-4 bg-white flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ketik pesan atau tanyakan alur sistem..."
                    disabled={isSending}
                    className="flex-1 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-all"
                  />
                  <Button
                    type="submit"
                    disabled={!input.trim() || isSending}
                    className="bg-blue-600 hover:bg-blue-700 px-3 lg:px-4 shadow-md"
                    size="sm"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
                <p className="text-[10px] lg:text-[11px] text-slate-400 mt-2 text-center">
                  Tradixa Assistant memahami seluruh Blueprint sistem Anda.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
