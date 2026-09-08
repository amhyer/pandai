'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

export interface TkaTrendPoint {
  date: string;
  score: number;
  subjectName?: string;
}

export interface TkaSubjectPoint {
  subjectName: string;
  avgScore: number;
  mastery?: 'kuat' | 'cukup' | 'lemah';
}

const MASTERY_COLORS: Record<string, string> = {
  kuat: '#059669',
  cukup: '#d97706',
  lemah: '#dc2626',
};

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  padding: '12px',
} as const;

/**
 * TkaTrendChart — garis tren skor attempt dari waktu ke waktu,
 * dengan garis referensi KKM (default 75).
 */
export function TkaTrendChart({ data, kkm = 75, height = 260 }: { data: TkaTrendPoint[]; kkm?: number; height?: number }) {
  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
        Belum ada data attempt
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <ReferenceLine
          y={kkm}
          stroke="#dc2626"
          strokeDasharray="6 4"
          label={{ value: `KKM ${kkm}`, position: 'insideTopRight', fontSize: 11, fill: '#dc2626' }}
        />
        <Line type="monotone" dataKey="score" name="Skor" stroke="#1F3864" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * TkaSubjectChart — bar rata-rata skor per mapel, warna mengikuti level
 * penguasaan (kuat/cukup/lemah).
 */
export function TkaSubjectChart({ data, height = 240 }: { data: TkaSubjectPoint[]; height?: number }) {
  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
        Belum ada data per mapel
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey="subjectName" tick={{ fontSize: 10 }} interval={0} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="avgScore" name="Rata-rata" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {data.map((d) => (
            <Cell key={d.subjectName} fill={MASTERY_COLORS[d.mastery ?? 'cukup'] ?? '#1F3864'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
