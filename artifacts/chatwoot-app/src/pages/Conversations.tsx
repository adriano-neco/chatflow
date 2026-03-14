import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRoute, useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppConversations, useAppMessages } from '@/hooks/use-app-data';
import { Avatar } from '@/components/ui';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, MoreVertical, Send, Paperclip, Smile, Inbox, Phone, Video,
  MessageSquare, Check, CheckCheck, X, ChevronLeft, Filter,
  Clock, CheckCircle2, MessageCircle, User as UserIcon, Mail, ArrowLeft
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

const TEAL = {
  header: 'bg-[#075E54]',
  headerLight: 'bg-[#128C7E]',
  accent: 'bg-[#25D366]',
  outgoing: 'bg-[#DCF8C6]',
  outgoingDark: 'bg-[#d1f4bb]',
  incomingBg: 'bg-white',
  chatBg: 'bg-[#e5ddd5]',
  sidebarBg: 'bg-white',
  activeItem: 'bg-[#f0f0f0]',
  searchBg: 'bg-[#f0f2f5]',
};

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas', icon: Inbox },
  { id: 'open', label: 'Abertas', icon: MessageCircle },
  { id: 'pending', label: 'Pendentes', icon: Clock },
  { id: 'resolved', label: 'Resolvidas', icon: CheckCircle2 },
];

function getChannelBadge(channel: string) {
  switch (channel) {
    case 'email': return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Email</span>;
    case 'whatsapp': return <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">WhatsApp</span>;
    case 'telegram': return <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">Telegram</span>;
    default: return <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">Chat</span>;
  }
}

function formatConvTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yy');
}

function formatMsgDate(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}

function MessageStatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === 'read') {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.0714 0.652832L4.00009 7.86807L1.27455 5.1"
            stroke="#4FC3F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.7246 0.652832L7.65332 7.86807L6.22168 6.42554"
            stroke="#4FC3F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.0714 0.652832L4.00009 7.86807L1.27455 5.1"
            stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.7246 0.652832L7.65332 7.86807L6.22168 6.42554"
            stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center", className)}>
      <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.72461 0.652832L1.65332 7.86807L0.221679 6.42554"
          stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function ChatBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.06] pointer-events-none overflow-hidden">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wp-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <text x="5" y="30" fontSize="20" fill="#128C7E">💬</text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wp-pattern)" />
      </svg>
    </div>
  );
}

export function Conversations() {
  const [matchConv, paramsConv] = useRoute('/conversations/:id');
  const [, navigate] = useLocation();
  const selectedId = matchConv && paramsConv?.id ? parseInt(paramsConv.id) : null;

  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { conversations, isLoading } = useAppConversations(
    activeFilter === 'all' ? undefined : activeFilter
  );
  const { messages, refetch: refetchMessages } = useAppMessages(selectedId || 0);

  const selectedConv = conversations.find(c => c.id === selectedId);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const filteredConvs = conversations.filter(c =>
    !search || c.contact.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedId || isSending) return;

    const optimistic = {
      id: Date.now(),
      conversationId: selectedId,
      content: text,
      messageType: 'outgoing',
      deliveryStatus: 'sent',
      sender: null,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setMessageText('');
    setIsSending(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const resp = await apiFetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text, messageType: 'outgoing' }),
      });
      if (resp.ok) {
        const saved = await resp.json();
        setLocalMessages(prev =>
          prev.map(m => m.id === optimistic.id ? { ...saved } : m)
        );
        setTimeout(() => {
          setLocalMessages(prev =>
            prev.map(m => m.id === saved.id ? { ...m, deliveryStatus: 'delivered' } : m)
          );
        }, 1200);
      }
    } catch {
      // keep optimistic
    } finally {
      setIsSending(false);
    }
  }, [messageText, selectedId, isSending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; msgs: typeof localMessages }[] = [];
    let lastDate = '';
    for (const msg of localMessages) {
      const d = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (d !== lastDate) {
        groups.push({ date: msg.createdAt, msgs: [msg] });
        lastDate = d;
      } else {
        groups[groups.length - 1].msgs.push(msg);
      }
    }
    return groups;
  }, [localMessages]);

  const statusLabel: Record<string, string> = {
    open: 'Aberta', pending: 'Pendente', resolved: 'Resolvida', snoozed: 'Silenciada'
  };
  const statusColor: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-gray-100 text-gray-600',
    snoozed: 'bg-blue-100 text-blue-700',
  };

  return (
    <AppLayout>
      <div className="flex h-full w-full overflow-hidden" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* LEFT SIDEBAR - Conversation List */}
        <div className={cn(
          "flex flex-col border-r border-gray-200 shrink-0 transition-all duration-200",
          selectedId ? "hidden md:flex w-[340px]" : "flex w-full md:w-[340px]"
        )}>
          {/* Sidebar Header */}
          <div className="h-[60px] bg-[#075E54] flex items-center justify-between px-4 shrink-0">
            <span className="text-white font-bold text-lg tracking-wide">ChatFlow</span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full h-9 pl-9 pr-4 bg-[#f0f2f5] rounded-lg text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 px-3 py-2 bg-white border-b border-gray-100 overflow-x-auto no-scrollbar shrink-0">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                  activeFilter === f.id
                    ? "bg-[#075E54] text-white shadow-sm"
                    : "bg-[#f0f2f5] text-gray-600 hover:bg-gray-200"
                )}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="flex flex-col gap-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Inbox className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isActive = conv.id === selectedId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/conversations/${conv.id}`)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-4 py-3 border-b border-gray-100 transition-colors relative",
                      isActive ? "bg-[#f0f0f0]" : "hover:bg-[#f5f5f5]"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#075E54] flex items-center justify-center text-white font-bold text-base shadow-sm">
                        {getInitials(conv.contact.name)}
                      </div>
                      {conv.status === 'open' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-[15px] text-gray-900 truncate">{conv.contact.name}</span>
                        <span className="text-[11px] text-gray-400 ml-2 shrink-0">{formatConvTime(conv.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-500 truncate flex-1">
                          {conv.lastMessage?.content || conv.subject || 'Nova conversa'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="shrink-0 min-w-[20px] h-5 bg-[#25D366] text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT - Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 relative",
          !selectedId ? "hidden md:flex" : "flex"
        )}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="h-[60px] bg-[#075E54] flex items-center gap-3 px-4 shrink-0 shadow-md z-10">
                <button
                  onClick={() => navigate('/conversations')}
                  className="md:hidden text-white p-1 rounded-full hover:bg-white/10 mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(selectedConv.contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-[15px] truncate">{selectedConv.contact.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded font-medium", statusColor[selectedConv.status] || 'bg-gray-100 text-gray-600')}>
                      {statusLabel[selectedConv.status] || selectedConv.status}
                    </span>
                    {getChannelBadge(selectedConv.channel)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-colors">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-white/80 hover:bg-white/10 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto relative" style={{ backgroundColor: '#e5ddd5' }}>
                <ChatBackground />
                <div className="relative z-10 px-4 py-4 space-y-1">
                  {groupedMessages.map((group, gi) => (
                    <React.Fragment key={gi}>
                      {/* Date separator */}
                      <div className="flex justify-center my-4">
                        <span className="bg-white text-gray-500 text-[12px] font-medium px-3 py-1 rounded-full shadow-sm">
                          {formatMsgDate(group.date)}
                        </span>
                      </div>
                      {group.msgs.map((msg, mi) => {
                        const isOut = msg.messageType === 'outgoing';
                        const prevMsg = mi > 0 ? group.msgs[mi - 1] : null;
                        const showTail = !prevMsg || prevMsg.messageType !== msg.messageType;

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className={cn("flex mb-0.5", isOut ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "relative max-w-[70%] md:max-w-[55%] px-3 py-2 rounded-lg shadow-sm",
                                isOut
                                  ? "bg-[#DCF8C6] rounded-tr-none"
                                  : "bg-white rounded-tl-none",
                                !showTail && "rounded-tr-lg rounded-tl-lg"
                              )}
                            >
                              {/* WhatsApp-style tail */}
                              {showTail && isOut && (
                                <div className="absolute -right-[6px] top-0 w-3 h-3 overflow-hidden">
                                  <div className="bg-[#DCF8C6] w-4 h-4 rotate-45 translate-x-[2px] -translate-y-[6px]" />
                                </div>
                              )}
                              {showTail && !isOut && (
                                <div className="absolute -left-[6px] top-0 w-3 h-3 overflow-hidden">
                                  <div className="bg-white w-4 h-4 rotate-45 -translate-x-[8px] -translate-y-[6px]" />
                                </div>
                              )}

                              <p className="text-[14.5px] text-gray-800 leading-[1.45] whitespace-pre-wrap break-words pr-10">
                                {msg.content}
                              </p>
                              <div className="flex items-center gap-1 justify-end mt-0.5 -mr-1">
                                <span className="text-[11px] text-gray-400">
                                  {format(new Date(msg.createdAt), 'HH:mm')}
                                </span>
                                {isOut && (
                                  <MessageStatusIcon status={msg.deliveryStatus || 'sent'} />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              <div className="shrink-0 bg-[#f0f2f5] px-3 py-2 flex items-end gap-2">
                <button className="p-2.5 rounded-full text-gray-500 hover:bg-gray-200 transition-colors shrink-0">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="p-2.5 rounded-full text-gray-500 hover:bg-gray-200 transition-colors shrink-0">
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 bg-white rounded-2xl px-4 py-2 shadow-sm flex items-end">
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite uma mensagem"
                    className="w-full text-[15px] text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none bg-transparent leading-relaxed max-h-[120px] min-h-[24px]"
                    rows={1}
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm",
                    messageText.trim()
                      ? "bg-[#075E54] text-white hover:bg-[#128C7E] scale-100"
                      : "bg-[#128C7E] text-white/70"
                  )}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center"
              style={{ backgroundColor: '#f0f2f5', backgroundImage: 'radial-gradient(circle at 50% 50%, #e9f5f3 0%, #f0f2f5 70%)' }}>
              <div className="text-center max-w-sm px-6">
                <div className="w-24 h-24 rounded-full bg-[#075E54]/10 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-12 h-12 text-[#075E54]" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">ChatFlow</h2>
                <p className="text-gray-500 text-[15px] leading-relaxed">
                  Selecione uma conversa ao lado para começar a atender seus clientes.
                </p>
                <div className="mt-8 flex items-center gap-2 justify-center text-xs text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  Criptografia de ponta a ponta com Argon2id
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
