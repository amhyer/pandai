import { NextResponse } from 'next/server';

// GET /api/import/template?type=siswa|guru — Return CSV template
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !['siswa', 'guru'].includes(type)) {
      return NextResponse.json({ error: 'type harus siswa atau guru' }, { status: 400 });
    }

    let csv: string;

    if (type === 'siswa') {
      csv = 'name,nisn,jk,namaOrtu,classId,phone\n';
      csv += '"Ahmad Rizky","0051234567","L","Budi Santoso","cl_xxx123","081234567890"\n';
      csv += '"Siti Aminah","0051234568","P","Siti Nurhaliza","cl_xxx123","081234567891"\n';
    } else {
      csv = 'name,nip,nik,phone\n';
      csv += '"Drs. Budi Purnomo","198501012010011001","3501010101800001","081234567892"\n';
      csv += '"Ir. Sari Dewi","198702152011012002","3502020215800002","081234567893"\n';
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="template_${type}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengunduh template' }, { status: 500 });
  }
}
