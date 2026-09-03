import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';

export default async function RoleLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('pandai_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== 'KEPALA_SEKOLAH') redirect('/');
  return <>{children}</>;
}
