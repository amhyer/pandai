'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, ImageOff, Loader2 } from 'lucide-react';

export interface ImageModalProps {
  /** URL gambar yang ditampilkan. null/undefined = tampilkan placeholder. */
  imageUrl: string | null | undefined;
  /** Kontrol buka/tutup modal (controlled). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul yang ditampilkan di header modal. */
  title?: string;
  /** Deskripsi opsional di bawah judul. */
  description?: string;
}

/**
 * ImageModal — lightbox umum untuk menampilkan gambar (soal, materi, dokumen
 * scan) dalam dialog penuh. Dipakai lintas view (list/form/detail) sehingga
 * semua tombol "Lihat gambar" cukup membuka state open + URL.
 */
export function ImageModal({
  imageUrl,
  open,
  onOpenChange,
  title = 'Pratinjau Gambar',
  description,
}: ImageModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasUrl = Boolean(imageUrl);

  const handleClose = () => {
    // Reset state agar gambar berikutnya dimuat ulang dengan benar
    setLoaded(false);
    setFailed(false);
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = imageUrl.split('/').pop()?.split('?')[0] || 'gambar';
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-slate-100">
          <DialogTitle className="text-base text-[#1F3864]">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs">{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="relative min-h-[240px] max-h-[70vh] flex items-center justify-center bg-slate-50">
          {hasUrl ? (
            <>
              {!loaded && !failed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1F3864]" />
                </div>
              )}
              {failed ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <ImageOff className="h-10 w-10" />
                  <p className="text-sm">Gagal memuat gambar</p>
                  <p className="text-xs break-all max-w-md px-4 opacity-70">{imageUrl}</p>
                </div>
              ) : (
                <img
                  src={imageUrl as string}
                  alt={title}
                  onLoad={() => setLoaded(true)}
                  onError={() => setFailed(true)}
                  className={`max-h-[70vh] w-auto max-w-full object-contain ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <ImageOff className="h-10 w-10" />
              <p className="text-sm">Tidak ada gambar</p>
            </div>
          )}
        </div>

        {hasUrl && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-white">
            <a href={imageUrl as string} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Buka Tab Baru
              </Button>
            </a>
            <Button size="sm" className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Unduh
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ImageModal;
