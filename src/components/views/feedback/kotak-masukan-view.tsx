'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Filter,
  Eye,
  CheckCircle2,
  Reply,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface FeedbackItem {
  id: string;
  schoolId: string;
  fromUserId: string;
  fromRole: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  response: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  fromUser: { id: string; name: string; role: string };
  responder: { id: string; name: string; role: string } | null;
}

const CATEGORIES = [
  { value: 'saran', label: 'Saran', icon: Lightbulb, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'kritik', label: 'Kritik', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
  { value: 'apresiasi', label: 'Apresiasi', icon: ThumbsUp, color: 'bg-sky-100 text-sky-700' },
] as const;

const STATUSES = [
  { value: 'baru', label: 'Baru', color: 'bg-red-100 text-red-700' },
  { value: 'dibaca', label: 'Dibaca', color: 'bg-amber-100 text-amber-700' },
  { value: 'ditindaklanjuti', label: 'Ditindaklanjuti', color: 'bg-emerald-100 text-emerald-700' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  ORANG_TUA: 'Orang Tua',
  GURU: 'Guru',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  ADMIN_SCHOOL: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

// ─── Component ───────────────────────────────────────────────

export function KotakMasukanView() {
  const user = useAppStore((s) => s.user);
  const role = user?.role || '';
  const isInboxRole = ['GURU', 'KEPALA_SEKOLAH', 'ADMIN_SCHOOL', 'SUPER_ADMIN'].includes(role);

  // Form state
  const [category, setCategory] = useState('saran');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // List state
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Detail/Reply state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'kirim' | 'masuk'>('kirim');

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCategory !== 'all') params.set('category', filterCategory);

      const res = await fetch(`/api/feedback?${params.toString()}`, {
        headers: {
          
          
          
        },
      });
      const json = await res.json();
      if (json.data) setFeedbacks(json.data);
    } catch {
      toast.error('Gagal memuat feedback');
    } finally {
      setLoading(false);
    }
  }, [user, role, filterStatus, filterCategory]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Submit new feedback
  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Judul dan isi pesan wajib diisi');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
          
          
        },
        body: JSON.stringify({ category, subject, message }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success('Feedback berhasil dikirim');
        setSubject('');
        setMessage('');
        setCategory('saran');
        fetchFeedbacks();
      } else {
        toast.error(json.error || 'Gagal mengirim feedback');
      }
    } catch {
      toast.error('Gagal mengirim feedback');
    } finally {
      setSubmitting(false);
    }
  };

  // Update status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setUpdatingStatus(id);
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          
          
          
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Status diperbarui');
        fetchFeedbacks();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Gagal memperbarui status');
      }
    } catch {
      toast.error('Gagal memperbarui status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Send reply
  const handleReply = async (id: string) => {
    if (!replyText.trim()) {
      toast.error('Balasan tidak boleh kosong');
      return;
    }
    try {
      setReplyingTo(id);
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          
          
          
        },
        body: JSON.stringify({ response: replyText, status: 'ditindaklanjuti' }),
      });
      if (res.ok) {
        toast.success('Balasan terkirim');
        setReplyText('');
        setExpandedId(null);
        fetchFeedbacks();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Gagal mengirim balasan');
      }
    } catch {
      toast.error('Gagal mengirim balasan');
    } finally {
      setReplyingTo(null);
    }
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];
  const getStatusInfo = (st: string) => STATUSES.find((s) => s.value === st) || STATUSES[0];

  const stats = {
    total: feedbacks.length,
    baru: feedbacks.filter((f) => f.status === 'baru').length,
    dibaca: feedbacks.filter((f) => f.status === 'dibaca').length,
    ditindaklanjuti: feedbacks.filter((f) => f.status === 'ditindaklanjuti').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kotak Masukan</h1>
        <p className="text-muted-foreground mt-1">
          {isInboxRole
            ? 'Kelola saran, kritik, dan apresiasi dari warga sekolah'
            : 'Sampaikan saran, kritik, atau apresiasi Anda'}
        </p>
      </div>

      {/* Stats cards — only for inbox roles */}
      {isInboxRole && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.baru}</div>
              <div className="text-sm text-muted-foreground">Baru</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">{stats.dibaca}</div>
              <div className="text-sm text-muted-foreground">Dibaca</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{stats.ditindaklanjuti}</div>
              <div className="text-sm text-muted-foreground">Ditindaklanjuti</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for inbox roles */}
      {isInboxRole && (
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'masuk' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('masuk')}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Masukan Masuk ({stats.total})
          </Button>
          <Button
            variant={activeTab === 'kirim' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('kirim')}
          >
            <Send className="w-4 h-4 mr-1" />
            Kirim Feedback
          </Button>
        </div>
      )}

      {/* Kirim Feedback Form */}
      {(activeTab === 'kirim' || !isInboxRole) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5" />
              Kirim Feedback Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <cat.icon className="w-4 h-4" />
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Judul</label>
                <Input
                  placeholder="Judul singkat..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Isi Pesan</label>
              <Textarea
                placeholder="Tuliskan saran, kritik, atau apresiasi Anda..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={5000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length}/5000
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !subject.trim() || !message.trim()}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Mengirim...' : 'Kirim Feedback'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Inbox List — only for inbox roles */}
      {(activeTab === 'masuk' && isInboxRole) && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Masukan Masuk
              </CardTitle>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <Filter className="w-4 h-4 mr-1" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Belum ada masukan</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-3">
                  {feedbacks.map((fb) => {
                    const catInfo = getCategoryInfo(fb.category);
                    const statusInfo = getStatusInfo(fb.status);
                    const isExpanded = expandedId === fb.id;

                    return (
                      <div
                        key={fb.id}
                        className="border rounded-lg p-4 hover:bg-accent/30 transition-colors"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={catInfo.color}>
                                <catInfo.icon className="w-3 h-3 mr-1" />
                                {catInfo.label}
                              </Badge>
                              <Badge variant="outline" className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {ROLE_LABELS[fb.fromRole] || fb.fromRole}
                              </span>
                            </div>
                            <h3 className="font-medium text-sm truncate">{fb.subject}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {fb.fromUser.name} &middot; {new Date(fb.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            <Separator />
                            <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                              {fb.message}
                            </div>

                            {/* Response section */}
                            {fb.response ? (
                              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-md p-3 text-sm">
                                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-1">
                                  <Reply className="w-3 h-3" />
                                  Balasan dari {fb.responder?.name || 'Pihak Sekolah'}
                                  {fb.respondedAt && (
                                    <span className="text-muted-foreground ml-1">
                                      &middot; {new Date(fb.respondedAt).toLocaleDateString('id-ID', {
                                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                                <div className="whitespace-pre-wrap">{fb.response}</div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">Belum ada balasan</div>
                            )}

                            {/* Actions for inbox roles */}
                            <Separator />
                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* Quick status buttons */}
                              <div className="flex gap-1 flex-wrap">
                                {STATUSES.map((s) => (
                                  <Button
                                    key={s.value}
                                    variant={fb.status === s.value ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={updatingStatus === fb.id}
                                    onClick={() => handleUpdateStatus(fb.id, s.value)}
                                  >
                                    {s.value === 'baru' && <MessageSquare className="w-3 h-3 mr-1" />}
                                    {s.value === 'dibaca' && <Eye className="w-3 h-3 mr-1" />}
                                    {s.value === 'ditindaklanjuti' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {s.label}
                                  </Button>
                                ))}
                              </div>

                              {/* Reply textarea */}
                              <div className="flex-1 flex gap-2">
                                <Textarea
                                  placeholder="Tulis balasan..."
                                  value={expandedId === fb.id ? replyText : ''}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  rows={2}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  disabled={replyingTo === fb.id || !replyText.trim()}
                                  onClick={() => handleReply(fb.id)}
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ORANG_TUA: "Masukan Saya" list */}
      {role === 'ORANG_TUA' && feedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Masukan Saya
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {feedbacks.map((fb) => {
                  const catInfo = getCategoryInfo(fb.category);
                  const statusInfo = getStatusInfo(fb.status);
                  const isExpanded = expandedId === fb.id;

                  return (
                    <div
                      key={fb.id}
                      className="border rounded-lg p-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={catInfo.color}>
                              <catInfo.icon className="w-3 h-3 mr-1" />
                              {catInfo.label}
                            </Badge>
                            <Badge variant="outline" className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-sm">{fb.subject}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(fb.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <Separator />
                          <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                            {fb.message}
                          </div>

                          {fb.response ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-md p-3 text-sm">
                              <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-1">
                                <Reply className="w-3 h-3" />
                                Balasan dari {fb.responder?.name || 'Pihak Sekolah'}
                                {fb.respondedAt && (
                                  <span className="text-muted-foreground ml-1">
                                    &middot; {new Date(fb.respondedAt).toLocaleDateString('id-ID', {
                                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="whitespace-pre-wrap">{fb.response}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">Belum ada balasan</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
