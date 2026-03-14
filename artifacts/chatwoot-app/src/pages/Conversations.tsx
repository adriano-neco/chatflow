import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAppConversations, useAppMessages } from '@/hooks/use-app-data';
import { Avatar, Badge, Button, Input } from '@/components/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Filter, MoreVertical, Send, Paperclip, Smile, Inbox, Clock, CheckCircle2, User as UserIcon, Mail, MessageCircle, Phone } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas', icon: Inbox },
  { id: 'open', label: 'Abertas', icon: MessageCircle },
  { id: 'pending', label: 'Pendentes', icon: Clock },
  { id: 'resolved', label: 'Resolvidas', icon: CheckCircle2 },
];

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'email': return <Mail className="w-3.5 h-3.5" />;
    case 'whatsapp': return <Phone className="w-3.5 h-3.5 text-green-500" />;
    case 'chat': default: return <MessageSquare className="w-3.5 h-3.5 text-primary" />;
  }
}

import { MessageSquare } from 'lucide-react';

export function Conversations() {
  const [activeFilter, setActiveFilter] = useState('all');
  const { conversations, isLoading } = useAppConversations(activeFilter === 'all' ? undefined : activeFilter);
  const [selectedId, setSelectedId] = useState<number | null>(conversations?.[0]?.id || null);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [messageText, setMessageText] = useState("");

  const { messages } = useAppMessages(selectedId || 0);
  const selectedConv = conversations.find(c => c.id === selectedId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    // In a real app, call useSendMessage mutation here
    setMessageText("");
  };

  return (
    <AppLayout>
      <div className="flex h-full w-full bg-background">
        
        {/* Left Panel - List */}
        <div className="w-[320px] shrink-0 border-r border-border flex flex-col bg-card/30">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-display font-bold">Conversas</h1>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    activeFilter === f.id 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <Inbox className="w-10 h-10 mb-3 opacity-20" />
                <p>Nenhuma conversa encontrada.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-200 border border-transparent group relative",
                    selectedId === conv.id 
                      ? "bg-primary/5 border-primary/20 shadow-sm" 
                      : "hover:bg-muted hover:border-border/50"
                  )}
                >
                  <div className="flex gap-3">
                    <Avatar 
                      initials={getInitials(conv.contact.name)} 
                      src={conv.contact.avatarUrl}
                      className={cn("w-10 h-10", selectedId === conv.id ? "ring-2 ring-primary/20" : "")} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm truncate">{conv.contact.name}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(conv.updatedAt), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        {getChannelIcon(conv.channel)}
                        <span className="truncate">{conv.subject || "Sem assunto"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate opacity-80">
                        {conv.lastMessage?.content || "Nova conversa"}
                      </p>
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Center Panel - Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="h-16 shrink-0 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-3">
                  <Avatar initials={getInitials(selectedConv.contact.name)} src={selectedConv.contact.avatarUrl} />
                  <div>
                    <h2 className="font-semibold">{selectedConv.contact.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                      </span>
                      <span>•</span>
                      <span>ID: #{selectedConv.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowRightPanel(!showRightPanel)}>
                    Detalhes
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="text-center my-6">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {format(new Date(selectedConv.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => {
                    const isOutgoing = msg.messageType === 'outgoing';
                    const showAvatar = !isOutgoing && (i === 0 || messages[i-1].messageType !== 'incoming');
                    
                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex w-full", isOutgoing ? "justify-end" : "justify-start")}
                      >
                        <div className={cn("flex gap-2 max-w-[70%]", isOutgoing ? "flex-row-reverse" : "")}>
                          {!isOutgoing && (
                            <div className="w-8 shrink-0">
                              {showAvatar && <Avatar initials={getInitials(selectedConv.contact.name)} className="w-8 h-8" />}
                            </div>
                          )}
                          
                          <div className={cn(
                            "flex flex-col", 
                            isOutgoing ? "items-end" : "items-start"
                          )}>
                            <div className={cn(
                              "px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                              isOutgoing 
                                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                : "bg-card border border-border/60 text-foreground rounded-tl-sm"
                            )}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 px-1">
                              {format(new Date(msg.createdAt), "HH:mm")}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Chat Input */}
              <div className="shrink-0 p-4 border-t border-border bg-card/30">
                <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-background border border-input rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <div className="flex gap-1 pb-1">
                    <button type="button" className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <textarea 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent py-2 px-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  
                  <div className="flex gap-1 pb-1">
                    <button type="button" className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                    <Button type="submit" size="icon" className="rounded-xl shrink-0 h-10 w-10">
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                </form>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-muted-foreground">Pressione <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para quebra de linha</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-card border border-border shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Selecione uma conversa</h3>
                <p className="text-muted-foreground">Escolha um contato na lista à esquerda para começar a conversar ou criar um novo ticket.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Info */}
        <AnimatePresence>
          {showRightPanel && selectedConv && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card/30 overflow-y-auto shrink-0"
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center mb-6 pb-6 border-b border-border">
                  <Avatar initials={getInitials(selectedConv.contact.name)} src={selectedConv.contact.avatarUrl} className="w-20 h-20 text-xl mb-4 shadow-md" />
                  <h3 className="font-bold text-lg">{selectedConv.contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedConv.contact.email || "Sem email"}</p>
                </div>

                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedConv.contact.phone || "Não informado"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedConv.contact.company || "Sem empresa"}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detalhes do Ticket</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={selectedConv.status === 'open' ? 'success' : 'default'} className="capitalize">{selectedConv.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Canal</span>
                        <span className="capitalize flex items-center gap-1">
                          {getChannelIcon(selectedConv.channel)} {selectedConv.channel}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Atribuído a</span>
                        <span>{selectedConv.assignee?.name || "Ninguém"}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Etiquetas</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedConv.labels.map(l => (
                        <Badge key={l} variant="outline" className="bg-background">{l}</Badge>
                      ))}
                      <button className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-muted-foreground text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                        +
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
