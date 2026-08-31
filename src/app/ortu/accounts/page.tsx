'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

function OrtuAccountsPage() {
  const { users, isLoading, error, user, selectedSchoolId, setSelectedSchoolId } = useAppStore();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#1F3864] animate-pulse">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Memuat data akun...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={() => router.refresh()}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen">Anda harus login terlebih dahulu</div>;
  }

  // Orang Tua bisa melihat akun mereka sendiri (yang memiliki child relationship)
  // atau guru/kepala sekolah di sekolah sama
  const effectiveSchoolId = selectedSchoolId || user.schoolId;

  // Filter users untuk orang tua - themselves (yang memiliki children) atau staff di sekolah
  let filteredUsers = users.filter((u: any) => {
    // Orang tua bisa melihat akun mereka sendiri (yang memiliki parentId atau children)
    if (u.id === user.id) return true;
    // Atau guru/kepala sekolah di sekolah sama
    if ((u.role === 'GURU' || u.role === 'KEPALA_SEKOLAH') && u.schoolId === effectiveSchoolId) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:items-center">
          <h1 className="font-semibold text-2xl text-foreground">
            Akun Orang Tua
            <span className="ml-2 text-sm text-muted-foreground">
              ({user.name || 'Orang Tua'})
            </span>
          </h1>
        </div>

        <div className="mt-4 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/auth/register')}
          >
            Buat Akun Baru
          </Button>
        </div>

        {/* Tabel daftar akun */}
        <Card className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Jenis Akun</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u: any) => (
                <TableRow key={u.id} className="hover:bg-muted/50">
                  <TableCell>
                    {u.username || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        u.role === 'GURU'
                          ? 'bg-blue-100 text-blue-800 text-xs font-medium'
                          : u.role === 'SISWA'
                          ? 'bg-green-100 text-green-800 text-xs font-medium'
                          : u.role === 'ORANG_TUA'
                          ? 'bg-purple-100 text-purple-800 text-xs font-medium'
                          : 'bg-gray-100 text-gray-800 text-xs font-medium'
                      }
                    >
                      {u.role || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{u.name || '-'}</TableCell>
                  <TableCell>
                    {u.role === 'GURU' ? 'Guru' :
                      u.role === 'SISWA' ? 'Siswa' :
                      u.role === 'ORANG_TUA' ? 'Orang Tua' : 'Lainnya'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.isActive ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Lihat detail"
                      onClick={() => alert('Detail user: ' + u.username)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M10 9v10M14 11v10M2 2l20 20M2 22l20-20M2 12l20 0"
                        />
                      </svg>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit"
                      onClick={() => alert('Edit user: ' + u.username)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M11.26 13.3a1.26 1.26 0 0 0-.3 1.92h1.37l1.11 1.11a1.26 1.26 0 1 0 1.79-1.79l-1.37-1.37a1.26 1.26 0 0 0-1.92-.3zm2.31-1.96a1.26 1.26 0 0 1-1.82-.3l-.31-.31-.86-.86a1.26 1.26 0 1 1 1.98-1.98l.85.85a1.26 1.26 0 0 1 .3 1.82zM0 12l4.93 4.93a1.26 1.26 0 0 1-.3 1.92L0 21.26l4.93-4.93a1.26 1.26 0 0 1-.3-1.92zM22 12l-4.93 4.93a1.26 1.26 0 0 0 .3 1.92L22 21.26l-4.93-4.93a1.26 1.26 0 0 0-.3-1.92zM3.57 8.93a1.26 1.26 0 0 1 0 1.92l1.36 1.36a1.26 1.26 0 1 1-1.92 1.92l-1.36-1.36a1.26 1.26 0 0 1-1.92.3zM9 21.26l-4.93 4.93a1.26 1.26 0 0 1-.3 1.92L9 24l4.93-4.93a1.26 1.26 0 0 1-.3-1.92l4.93 4.93a1.26 1.26 0 1 1 1.92.3zM14 15.9l.68.68a1.26 1.26 0 0 1-1.92 1.92l-.68-.68a1.26 1.26 0 0 0 1.92-1.92l.68.68zm7.53 0a1.26 1.26 0 0 0 1.92 0l.68-.68a1.26 1.26 0 1 0-1.92-1.92l-.68.68zm7.53 0a1.26 1.26 0 0 0 1.92 0l.68-.68a1.26 1.26 0 1 0-1.92-1.92l-.68.68zm9 3.57l4.93-4.93a1.26 1.26 0 0 0 1.92.3L9 .06l4.93 4.93a1.26 1.26 0 1 0-.3-1.92l-4.93 4.93a1.26 1.26 0 0 1-1.92.3z"
                        />
                      </svg>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit"
                      onClick={() => alert('Edit user: ' + u.username)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M11.26 13.3a1.26 1.26 0 0 0-.3 1.92h1.37l1.11 1.11a1.26 1.26 0 1 0 1.79-1.79l-1.37-1.37a1.26 1.26 0 0 0-1.92-.3zm2.31-1.96a1.26 1.26 0 0 1-1.82-.3l-.31-.31-.86-.86a1.26 1.26 0 1 1 1.98-1.98l.85.85a1.26 1.26 0 0 1 .3 1.82zM0 12l4.93 4.93a1.26 1.26 0 0 1-.3 1.92L0 21.26l4.93-4.93a1.26 1.26 0 0 1-.3-1.92zM22 12l-4.93 4.93a1.26 1.26 0 0 0 .3 1.92L22 21.26l-4.93-4.93a1.26 1.26 0 0 0-.3-1.92zM3.57 8.93a1.26 1.26 0 0 1 0 1.92l1.36 1.36a1.26 1.26 0 1 1-1.92 1.92l-1.36-1.36a1.26 1.26 0 0 1-1.92.3zM9 21.26l-4.93 4.93a1.26 1.26 0 0 1-.3 1.92L9 24l4.93-4.93a1.26 1.26 0 0 1-.3-1.92l4.93 4.93a1.26 1.26 0 1 1 1.92.3zM14 15.9l.68.68a1.26 1.26 0 0 1-1.92 1.92l-.68-.68a1.26 1.26 0 0 0 1.92-1.92l.68.68zm7.53 0a1.26 1.26 0 0 0 1.92 0l.68-.68a1.26 1.26 0 1 0-1.92-1.92l-.68.68zm7.53 0a1.26 1.26 0 0 0 1.92 0l.68-.68a1.26 1.26 0 1 0-1.92-1.92l-.68.68zm9 3.57l4.93-4.93a1.26 1.26 0 0 0 1.92.3L9 .06l4.93 4.93a1.26 1.26 0 1 0-.3-1.92l-4.93 4.93a1.26 1.26 0 0 1-1.92.3z"
                        />
                      </svg>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

export default OrtuAccountsPage;