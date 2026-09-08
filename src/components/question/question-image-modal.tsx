'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ImageModal } from '@/components/shared/image-modal';

export interface QuestionImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** URL gambar saat tersimpan (jika ada). */
  currentUrl?: string | null;
  /** Dipanggil saat user menyimpan URL baru (null = hapus gambar). */
  onSave: (url: string | null) => void;
  saving?: boolean;
}

/**
 * QuestionImageModal — kelola gambar penunjang soal: tempel URL, pratinjau,
 * simpan, atau hapus. URL disimpan sebagai string (bisa CDN/Storage) karena
 * model Question hanya menyimpan referensi `imageUrl`.
 */
export function QuestionImageModal({
  open,
  onOpenChange,
  currentUrl,
  onSave,
  saving = false,
}: QuestionImageModalProps) {
  const [url, setUrl] = useState(currentUrl ?? '');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const close = () => {
    setUrl(currentUrl ?? '');
    setPreviewError(false);
    onOpenChange(false);
  };

  const handleSave = () => {
    const trimmed = url.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      // Biarkan API yang memvalidasi lebih lanjut; ini guard UX awal
      setPreviewError(true);
      return;
    }
    onSave(trimmed || null);
    close();
  };

  const handleClear = () => {
    setUrl('');
    setPreviewError(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1F3864]">Gambar Soal</DialogTitle>
            <DialogDescription>
              Tempel URL gambar (http/https) sebagai penunjang soal. Kosongkan untuk menghapus gambar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreviewError(false);
              }}
              placeholder="https://cdn.example.com/soal-gambar.jpg"
              className="font-mono text-sm"
            />
            {url.trim() && (
              <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <img
                  src={url.trim()}
                  alt="Pratinjau gambar soal"
                  className="max-h-56 w-full object-contain"
                  onError={() => setPreviewError(true)}
                  onLoad={() => setPreviewError(false)}
                />
                {previewError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <p className="text-xs text-red-500">Gagal memuat pratinjau — periksa URL</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {currentUrl && (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 mr-auto" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Hapus Gambar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              disabled={!url.trim()}
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              Pratinjau
            </Button>
            <Button
              size="sm"
              className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageModal
        imageUrl={url.trim() || null}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Pratinjau Gambar Soal"
      />
    </>
  );
}

export default QuestionImageModal;
