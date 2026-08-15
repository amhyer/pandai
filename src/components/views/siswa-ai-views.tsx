'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Sparkles, Plus, Send, Loader2, MessageSquare, Trash2,
  BookOpen, GraduationCap, X, Menu,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ChatSession {
  id: string;
  title: string;
  subjectId: string | null;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface SubjectItem { id: string; name: string; code: string; }

// ═══════════════════════════════════════════════════════════════
// MARKDOWN HELPER (basic)
// ═══════════════════════════════════════════════════════════════

function renderBasicMarkdown(text: string): string {
  let html = text
    // Code blocks (```...```) -> <pre><code>
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-sm"><code>$1</code></pre>')
    // Inline code (`...`) -> <code>
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Bold (**...**) -> <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic (*...*) -> <em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headings (##, ###)
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1 text-[#1F3864]">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1 text-[#1F3864]">$1</h3>')
    // Unordered list items
    .replace(/^[*\-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-2">')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>');
  
  return `<p class="mb-2">${html}</p>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SiswaPandaiAiView() {
  const { user } = useAppStore();
  const schoolId = user?.schoolId || '';
  const userId = user?.id || '';

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Fetch subjects
  useEffect(() => {
    fetch('/api/subjects').then((r) => r.json()).then(setSubjects).catch(() => {});
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!userId || !schoolId) return;
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/ai/chatbot?userId=${userId}&schoolId=${schoolId}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { setSessions([]); }
    finally { setLoadingSessions(false); }
  }, [userId, schoolId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Fetch messages for active session
  const fetchMessages = useCallback(async (sessionId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/ai/chatbot?userId=${userId}&schoolId=${schoolId}`);
      const allSessions = await res.json();
      const session = (Array.isArray(allSessions) ? allSessions : []).find(
        (s: ChatSession) => s.id === sessionId
      );
      if (session) {
        setSubjectId(session.subjectId || '');
      }
      // We need a separate way to get messages. Let's add sessionId to query
      // For now, we'll create a lightweight endpoint approach via the messages we get
    } catch {}
    setLoadingMsgs(false);
  }, [userId, schoolId]);

  // Auto-scroll when messages change
  useEffect(() => { scrollToBottom(); }, [messages, sending, scrollToBottom]);

  const createNewSession = async () => {
    if (!userId || !schoolId) return;
    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_session', userId, schoolId, subjectId: subjectId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');
      const newSession = data.session;
      setActiveSession(newSession.id);
      setMessages([]);
      setSessions((prev) => [newSession, ...prev]);
      toast.success('Sesi baru dibuat');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat sesi');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/ai/chatbot?sessionId=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Sesi dihapus');
    } catch {
      toast.error('Gagal menghapus sesi');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return;

    const userContent = input.trim();
    setInput('');

    // Optimistic: add user message
    const tempUserMsg: ChatMsg = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userContent,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          userId, schoolId,
          sessionId: activeSession,
          subjectId: subjectId || undefined,
          content: userContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal');

      const aiMsg: ChatMsg = {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
        createdAt: data.message.createdAt,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Update session title in sidebar
      const sessRes = await fetch(`/api/ai/chatbot?userId=${userId}&schoolId=${schoolId}`);
      const sessData = await sessRes.json();
      setSessions(Array.isArray(sessData) ? sessData : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim pesan');
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSessionClick = (sessionId: string) => {
 setActiveSession(sessionId);
    // Since we don't have a dedicated messages endpoint, load from session data
    // For now, reset messages and let user send a new message
    setMessages([]);
    // Fetch session subject
    const sess = sessions.find((s) => s.id === sessionId);
    if (sess) setSubjectId(sess.subjectId || '');
    // In a real app, we'd fetch messages here
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] text-white shadow-sm">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">PANDAI AI</h1>
          <p className="text-sm text-muted-foreground">Asisten belajar cerdas</p>
        </div>
      </div>

      <Card className="flex-1 rounded-xl shadow-sm border-0 bg-white overflow-hidden flex flex-col">
        <div className="flex flex-1 min-h-0">
          {/* Sidebar - Session List */}
          <div className={cn(
            'border-r bg-gray-50/80 flex flex-col transition-all duration-300 shrink-0',
            sidebarOpen ? 'w-64 md:w-72' : 'w-0 border-r-0 overflow-hidden'
          )}>
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1F3864]">Sesi Chat</h2>
                <Button
                  size="sm"
                  onClick={createNewSession}
                  className="h-7 gap-1 bg-[#1F3864] hover:bg-[#2d5289] text-white rounded-lg text-xs"
                >
                  <Plus className="w-3 h-3" /> Baru
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 px-2">
              {loadingSessions ? (
                <div className="space-y-2 px-1">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 px-2 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Belum ada sesi chat</p>
                </div>
              ) : (
                <div className="space-y-1 pb-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        'group relative flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-colors',
                        activeSession === s.id ? 'bg-[#1F3864]/10 border border-[#1F3864]/20' : 'hover:bg-gray-100'
                      )}
                      onClick={() => handleSessionClick(s.id)}
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#1F3864]">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {s.lastMessage || 'Belum ada pesan'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header Bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
              <Button
                variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#1F3864]">
                  {activeSession ? sessions.find((s) => s.id === activeSession)?.title || 'Chat' : 'Pilih atau buat sesi baru'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {activeSession ? 'Aktif' : 'Mulai percakapan baru'}
                </p>
              </div>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-40 h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Konteks Mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Tanpa konteks</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!activeSession && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1F3864] to-[#2d5289] flex items-center justify-center mb-4">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1F3864] mb-1">Selamat Datang di PANDAI AI!</h3>
                  <p className="text-sm max-w-sm">Asisten belajar cerdas yang siap membantu Anda memahami materi pelajaran. Buat sesi baru untuk mulai bertanya.</p>
                  <Button
                    onClick={createNewSession}
                    className="mt-4 bg-gradient-to-r from-[#1F3864] to-[#2d5289] hover:opacity-90 text-white rounded-lg gap-2"
                  >
                    <Plus className="w-4 h-4" /> Mulai Chat Baru
                  </Button>
                </div>
              )}

              {activeSession && messages.length === 0 && !sending && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <BookOpen className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium text-sm">Mulai ajukan pertanyaan</p>
                  <p className="text-xs mt-1">Pilih konteks mata pelajaran di atas untuk jawaban yang lebih relevan</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2 max-w-[85%] md:max-w-[75%]',
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold',
                    msg.role === 'user' ? 'bg-[#1F3864]' : 'bg-gradient-to-br from-[#F59E0B] to-[#d97706]'
                  )}>
                    {msg.role === 'user' ? (user?.name?.[0] || 'S') : 'AI'}
                  </div>
                  {/* Bubble */}
                  <div className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[#1F3864] text-white rounded-tr-md'
                      : 'bg-gray-100 text-gray-800 rounded-tl-md'
                  )}>
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div
                        className="ai-markdown"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderBasicMarkdown(msg.content)) }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <div className="flex gap-2 max-w-[75%] mr-auto">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold bg-gradient-to-br from-[#F59E0B] to-[#d97706]">
                    AI
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            {activeSession && (
              <div className="border-t px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik pertanyaan Anda..."
                    disabled={sending}
                    className="rounded-xl border-gray-200 focus:border-[#1F3864]"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    className="h-10 w-10 p-0 bg-[#1F3864] hover:bg-[#2d5289] text-white rounded-xl shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
