import { redirect } from 'next/navigation';
import { getServerSessionUser } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

/**
 * Halaman "Bobot & Ketuntasan" belum punya view-nya: tidak ada entri
 * `bobot-ketuntasan` di peta view (src/components/app/view-router.tsx) maupun
 * komponen yang merendernya, sehingga shell hanya menampilkan skeleton
 * tanpa akhir.
 *
 * Sampai view-nya dibuat, rute ini dialihkan ke dashboard Admin Sekolah.
 * TODO: kembalikan ke <PrefetchedRouteShell initialView="bobot-ketuntasan" />
 *       setelah view + entri ViewType-nya tersedia.
 */
export default async function BobotKetuntasanPage() {
  const user = await getServerSessionUser(['ADMIN_SCHOOL', 'SUPER_ADMIN']);
  if (!user) redirect('/');

  redirect('/admin-school');
}
