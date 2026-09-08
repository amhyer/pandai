'use client';

import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { COMPETENCY_DIMENSIONS } from '@/lib/competency-dimensions';

export interface CompetencyRadarPoint {
  dimension: string;
  label: string;
  avgRating: number; // 1-4
}

/**
 * CompetencyRadarChart — radar 8 dimensi Profil Lulusan
 * (Kurikulum Pembelajaran Mendalam), skala 1-4.
 *
 * Dipakai di Dashboard TKA (siswa/ortu) dan Profil Lulusan.
 */
export function CompetencyRadarChart({
  data,
  height = 280,
  color = '#1F3864',
}: {
  data: CompetencyRadarPoint[];
  height?: number;
  color?: string;
}) {
  const hasData = data.some((d) => d.avgRating > 0);

  // Pastikan semua dimensi 8 ada (yang kosong = 0)
  const full = COMPETENCY_DIMENSIONS.map((dim) => {
    const found = data.find((d) => d.dimension === dim.key);
    return {
      subject: dim.label,
      score: found?.avgRating ?? 0,
      fullMark: 4,
    };
  });

  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        Belum ada asesmen 8 dimensi untuk periode ini
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={full} outerRadius="72%">
        <PolarGrid className="stroke-muted" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 4]} tick={{ fontSize: 9 }} />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            padding: '12px',
          }}
          formatter={(value) => [
            `${value}/4`,
            'Rata-rata',
          ]}
        />
        <Radar name="Rata-rata" dataKey="score" stroke={color} fill={color} fillOpacity={0.35} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default CompetencyRadarChart;
