'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FilterX,
  Globe,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// ====== CONSTANTS ======

const SUBJECTS = [
  { code: 'bindo', name: 'Bahasa Indonesia' },
  { code: 'bing', name: 'Bahasa Inggris' },
  { code: 'mat', name: 'Matematika' },
  { code: 'fis', name: 'Fisika' },
  { code: 'kim', name: 'Kimia' },
  { code: 'bio', name: 'Biologi' },
  { code: 'eko', name: 'Ekonomi' },
  { code: 'sos', name: 'Sosiologi' },
  { code: 'sej', name: 'Sejarah' },
  { code: 'geo', name: 'Geografi' },
] as const;

const TYPE_OPTIONS = [
  { value: 'pg', label: 'PG' },
  { value: 'pg_kompleks', label: 'PG Kompleks' },
  { value: 'isian', label: 'Isian' },
  { value: 'esai', label: 'Esai' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sulit', label: 'Sulit' },
] as const;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;

const ITEMS_PER_PAGE = 10;

// ====== TYPES ======

interface QuestionItem {
  id: string;
  subjectId: string;
  type: string;
  content: string;
  cognitiveLevel: string;
  difficulty: string;
  status: string;
  schoolId: string | null;
  subject?: { name: string; code: string };
  creator?: { id: string; name: string };
}

// ====== HELPERS ======

const getTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    pg: 'bg-blue-100 text-blue-700 border-blue-200',
    pg_kompleks: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    isian: 'bg-purple-100 text-purple-700 border-purple-200',
    esai: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  const labelMap: Record<string, string> = {
    pg: 'PG',
    pg_kompleks: 'PG Kompleks',
    isian: 'Isian',
    esai: 'Esai',
  };
  return (
    <Badge variant="outline" className={map[type] || ''}>
      {labelMap[type] || type}
    </Badge>
  );
};

const getDifficultyBadge = (difficulty: string) => {
  const map: Record<string, string> = {
    mudah: 'bg-green-100 text-green-700 border-green-200',
    sedang: 'bg-amber-100 text-amber-700 border-amber-200',
    sulit: 'bg-red-100 text-red-700 border-red-200',
  };
  const labelMap: Record<string, string> = {
    mudah: 'Mudah',
    sedang: 'Sedang',
    sulit: 'Sulit',
  };
  return (
    <Badge variant="outline" className={map[difficulty] || ''}>
      {labelMap[difficulty] || difficulty}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    published: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    archived: 'bg-red-50 text-red-500 border-red-200',
  };
  const labelMap: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
  };
  return (
    <Badge variant="outline" className={map[status] || ''}>
      {labelMap[status] || status}
    </Badge>
  );
};

const getSubjectName = (code: string) => {
  const found = SUBJECTS.find((s) => s.code === code);
  return found?.name || code;
};

// ====== COMPONENT ======

export function QuestionBank() {
  const { user, navigateTo } = useAppStore();

  // Data
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Build query params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (user?.schoolId) {
      params.set('schoolId', user.schoolId);
    }
    if (subjectFilter !== 'all') params.set('subjectId', subjectFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    return params.toString();
  }, [user?.schoolId, subjectFilter, typeFilter, statusFilter]);

  // Fetch questions
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = buildParams();
      const res = await fetch(`/api/questions${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('Gagal mengambil data soal');
      const data = await res.json();
      setQuestions(data);
    } catch {
      toast.error('Gagal memuat soal');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [subjectFilter, typeFilter, difficultyFilter, statusFilter, searchQuery]);

  // Filter + search + paginate
  const filteredQuestions = questions.filter((q) => {
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (
        !q.content.toLowerCase().includes(query) &&
        !(q.subject?.name || '').toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE));
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/questions?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Soal berhasil dihapus');
      setDeleteTarget(null);
      fetchQuestions();
    } catch {
      toast.error('Gagal menghapus soal');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Bank Soal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola soal-soal untuk persiapan TKA
          </p>
        </div>
        <Button
          onClick={() => navigateTo('question-editor')}
          className="bg-navy hover:bg-navy-light text-white gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Buat Soal Baru
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari soal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Subject */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Semua Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Difficulty */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Semua Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tingkat</SelectItem>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : paginatedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-muted p-4 mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Belum ada soal
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Belum ada soal. Klik &apos;Buat Soal Baru&apos; untuk menambahkan.
              </p>
              <Button
                onClick={() => navigateTo('question-editor')}
                className="mt-4 bg-navy hover:bg-navy-light text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Buat Soal Baru
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-[200px]">Konten Soal</TableHead>
                      <TableHead className="w-[140px]">Mata Pelajaran</TableHead>
                      <TableHead className="w-[120px]">Tipe</TableHead>
                      <TableHead className="w-[60px] text-center">Level</TableHead>
                      <TableHead className="w-[100px]">Kesulitan</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuestions.map((q, idx) => (
                      <TableRow key={q.id}>
                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                          {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="flex items-start gap-2">
                            {!q.schoolId && (
                              <Globe className="h-3.5 w-3.5 text-navy mt-0.5 shrink-0" aria-label="Soal global" />
                            )}
                            <p className="text-sm line-clamp-2 leading-relaxed">
                              {q.content}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {q.subject?.name || getSubjectName(q.subjectId)}
                        </TableCell>
                        <TableCell>{getTypeBadge(q.type)}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center h-6 w-10 rounded bg-navy/10 text-navy text-xs font-semibold">
                            {q.cognitiveLevel}
                          </span>
                        </TableCell>
                        <TableCell>{getDifficultyBadge(q.difficulty)}</TableCell>
                        <TableCell>{getStatusBadge(q.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-navy"
                              title="Lihat"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-navy"
                              title="Edit"
                              onClick={() => {
                                useAppStore.getState().setSelectedQuestionId(q.id);
                                navigateTo('question-editor');
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              title="Hapus"
                              onClick={() => setDeleteTarget(q)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Menampilkan{' '}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)}
                  </span>{' '}
                  dari{' '}
                  <span className="font-medium text-foreground">
                    {filteredQuestions.length}
                  </span>{' '}
                  soal
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    // Show first, last, current, and neighbors
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="icon"
                          className={`h-8 w-8 ${
                            page === currentPage
                              ? 'bg-navy text-white hover:bg-navy-light'
                              : ''
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    }
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-1 text-muted-foreground"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
            <AlertDialogDescription>
              Soal yang dihapus tidak dapat dikembalikan. Apakah Anda yakin ingin menghapus soal ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
