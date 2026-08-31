'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/use-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { useRouter } from 'next/navigation';

function AccountsPage() {
  const { users, isLoading, error, user, selectedSchoolId, setSelectedSchoolId, setCurrentView } = useAppStore();
  const router = useRouter();

  // Determine if current user can manage all accounts or only their school's accounts
  const userRole = user?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdminSchool = userRole === 'ADMIN_SCHOOL';

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

  // Filter users based on role and selected school
  // SUPER_ADMIN: tampilkan semua akun
  // ADMIN_SCHOOL: tampilkan akun berdasarkan selectedSchoolId (dapat diubah)
  // GURU, SISWA, ORANG_TUA, KEPALA_SEKOLAH: tampilkan sesuai role, jika admin sekolah pakai selectedSchoolId
  let filteredUsers = users;

  // Determine the effective school filter
  let effectiveSchoolId = selectedSchoolId;

  // If admin school and no specific school selected, use their school
  if (isAdminSchool && !effectiveSchoolId && user.schoolId) {
    effectiveSchoolId = user.schoolId;
  }

  // Apply filtering
  if (!isSuperAdmin) {
    if (isAdminSchool && effectiveSchoolId) {
      // Admin Sekolah: filter berdasarkan selectedSchoolId
      filteredUsers = users.filter((u: any) => u.schoolId === effectiveSchoolId);
    } else if (userRole) {
      // Untuk role lain, filter sesuai role
      filteredUsers = users.filter((u: any) => u.role === userRole);
    }
  }

  // Available schools for filter dropdown (ambil dari users yang sudah memiliki schoolId)
  const availableSchools = useMemo(() => {
    const schools = new Map<string, string>();
    users.forEach((u: any) => {
      if (u.schoolId && u.schoolName && !schools.has(u.schoolId)) {
        schools.set(u.schoolId, u.schoolName);
      }
    });
    return schools;
  }, [users]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:items-center">
          <h1 className="font-semibold text-2xl text-foreground">
            Kelola Akun
            {isAdminSchool && (
              <span className="ml-2 text-sm text-muted-foreground">
                {selectedSchoolId ? `Sekolah: ${selectedSchoolId}` : '(Sekolah: Sekolah Anda)'}
              </span>
            )}
          </h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/auth/register')}
            >
              Buat Akun Baru
            </Button>
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSchoolId('')}
              >
                Semua Sekolah
              </Button>
            )}
            {isAdminSchool && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSchoolId('')}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* School filter for Admin Sekolah */}
        {isAdminSchool && (
          <div className="mt-4 p-4 bg-muted/50 rounded border border-muted/20">
            <h3 className="font-medium mb-3">Filter Sekolah</h3>
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedSchoolId('')}
                aria-label="Batal filter sekolah"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Button>
              <p className="text-sm text-muted-foreground mb-2">
                Pilih sekolah untuk melihat akun:
              </p>
              {availableSchools.size > 0 ? (
                <select
                  value={selectedSchoolId || ''}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="mt-1 block w-full rounded border border-input placeholder:text-muted-foreground"
                >
                  <option value="">-- Pilih Sekolah --</option>
                  {Array.from(availableSchools.entries()).map(
                    ([schoolId, schoolName]) => (
                      <option
                        key={schoolId}
                        value={schoolId}
                        selected ={selectedSchoolId === schoolId}
                      >
                        {schoolName}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  (Tidak ada data sekolah yang tersedia)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabel daftar akun */}
        <Card className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Sekolah</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Aksi</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: any) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell>
                    {user.username || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        user.role === 'GURU'
                          ? 'bg-blue-100 text-blue-800 text-xs font-medium'
                          : user.role === 'SISWA'
                          ? 'bg-green-100 text-green-800 text-xs font-medium'
                          : user.role === 'ORANG_TUA'
                          ? 'bg-purple-100 text-purple-800 text-xs font-medium'
                          : user.role === 'KEPALA_SEKOLAH'
                          ? 'bg-orange-100 text-orange-800 text-xs font-medium'
                          : user.role === 'ADMIN_SCHOOL'
                          ? 'bg-indigo-100 text-indigo-800 text-xs font-medium'
                          : 'bg-gray-100 text-gray-800 text-xs font-medium'
                      }
                    >
                      {user.role || '-'}
                    </span>
                  </TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>
                    {user.schoolName || (isAdminSchool && effectiveSchoolId ? selectedSchoolId || user.schoolName || '-' : '-')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Lihat detail"
                      onClick={() => alert('Detail user: ' + user.username)}
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
                      onClick={() => alert('Edit user: ' + user.username)}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M11.26 13.3a1.26 1.26 0 0 0-.3 1.92h1.37l1.11 1.11a1.26 1.26 0 1 0 1.79-1.79l-1.37-1.37a1.26 1.26 0 0 0-1.92-.3zm2.31-1.96a1.26 1.26 0 0 1-1.82-.3l-.31-.31-.86-.86a1.26 1.26 0 1 1 1.98-1.98l.85.85a1.26 1.26 0 0 1 .3 1.82zM0 12l4.93 4.93a1.26 1.26 0 0 1-.3 1.92L0 21.26l4.93-4.93a1.26 1.26 0 0 1-.3-1.92zM22 12l-4.93 4.93a1.26 1.26 0 0 0 .3 1.92L22 21.26l-4.93-4.93a1.26 1.26 0 0 0-.3-1.92zM3.57 8.93a1.26 1.26 0 0 1 0 1.92l1.36 1.36a1.26 1.26 0 1 1-1.92 1.92l-1.36-1.36a1.26 1.26 0 0 1-1.92.3zM9 21.26l-4.93 4.93a1.26 1.26 0 0 1-.3 1.92L9 24l4.93-4.93a1.26 1.26 0 0 1-.3-1.92l4.93 4.93a1.26 1.26 0 1 1 1.92.3zM14 15.9l.68.68a1.26 1.26 0 0 1-1.92 1.92l-.68-.68a1.26 1.26 0 0 0 1.92-1.92l.68.68zm7.53 0a1.26 1.26 0 0 0 1.92 0l.68-.68a1.26 1.26 0 1 0-1.92-1.92l-.68.68zM21.26 9l4.93-4.93a1.26 1.26 0 0 1 1.92.3l4.93 4.93a1.26 1.26 0 1 0-.3-1.92l-4.93-4.93a1.26 1.26 0 0 0-1.92.3zM21.26 3.57l4.93 4.93a1.26 1.26 0 0 0 .3 1.92L22 2.28l-4.93 4.93a1.26 1.26 0 1 1-1.92-.3L22 .06l4.93-4.93a1.26 1.26 0 0 1-.3-1.92L21.26 0a1.26 1.26 0 0 1 .3-1.92zM1.74 15.9l-.68.68a1.26 1.26 0 0 0 1.92 1.92l.68-.68a1.26 1.26 0 1 1-1.92 1.92l-.68-.68zm-7.53 0a1.26 1.26 0 0 1-1.92 0l-.68.68a1.26 1.26 0 1 0 1.92 1.92l.68-.68zM9 3.57l4.93-4.93a1.26 1.26 0 0 0 1.92.3L9 .06l4.93 4.93a1.26 1.26 0 1 0-.3-1.92l-4.93 4.93a1.26 1.26 0 0 1-1.92.3z"
                        />
                      </svg>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit"
                      onClick={() => alert('Edit user: ' + user.username)}
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

export default AccountsPage;