'use client';

import React from 'react';
import { ImageModal } from '@/components/shared/image-modal';

export interface ImagePreviewModalProps {
  imageUrl: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul opsional (default: "Pratinjau Gambar Soal"). */
  title?: string;
}

/**
 * ImagePreviewModal — pratinjau gambar soal yang lebih tipis dari ImageModal,
 * dipakai di question-bank / question-editor / assignment views.
 */
export function ImagePreviewModal({
  imageUrl,
  open,
  onOpenChange,
  title = 'Pratinjau Gambar Soal',
}: ImagePreviewModalProps) {
  return <ImageModal imageUrl={imageUrl} open={open} onOpenChange={onOpenChange} title={title} />;
}

export default ImagePreviewModal;
