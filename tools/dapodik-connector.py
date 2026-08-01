#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================
  PANDAI - DAPODIK Connector v1.0
  Script untuk menarik data sekolah dari DAPODIK Lokal
  dan mengekspor ke file JSON untuk di-upload ke PANDAI.
=============================================================

CARA PENGGUNAAN:
  1. Pastikan DAPODIK Desktop sudah terbuka & running
  2. Pastikan Webservice DAPODIK sudah aktif (lihat panduan di bawah)
  3. Jalankan script ini: python pandai-dapodik-connector.py
  4. File hasil: pandai-sekolah-data.json (upload ke PANDAI)

PERSYARATAN:
  - Python 3.6+
  - Library requests: pip install requests
  - DAPODIK Desktop terbuka di komputer yang sama
=============================================================
"""

import json
import sys
import os
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("=" * 50)
    print("ERROR: Library 'requests' belum terinstal.")
    print("Jalankan: pip install requests")
    print("=" * 50)
    sys.exit(1)


# ==============================================================
#  DAPODIK Webservice Configuration
# ==============================================================
DAPODIK_HOST = "http://localhost:5774"
DAPODIK_TIMEOUT = 15  # detik

# API Endpoints (DAPODIK Lokal Webservice)
ENDPOINTS = {
    "sekolah": f"{DAPODIK_HOST}/WebService/getSekolah",
    "guru_tendik": f"{DAPODIK_HOST}/WebService/getGtk",
    "peserta_didik": f"{DAPODIK_HOST}/WebService/getPesertaDidik",
    "rombongan_belajar": f"{DAPODIK_HOST}/WebService/getRombonganBelajar",
}


def print_header():
    print()
    print("=" * 50)
    print("   PANDAI - DAPODIK Connector v1.0")
    print("   Platform Persiapan TKA Multi-Sekolah")
    print("=" * 50)
    print()


def print_guide():
    print("CARA AKTIFKAN WEBSERVICE DAPODIK:")
    print("-" * 50)
    print("1. Buka aplikasi DAPODIK Desktop")
    print("2. Klik menu 'Pengaturan' > 'Web Service'")
    print("3. Centang 'Aktifkan Web Service'")
    print("4. Klik 'Simpan'")
    print("5. Webservice akan berjalan di port 5774")
    print()
    print("LOKASI DEFAULT WEBSERVICE DAPODIK:")
    print("-" * 50)
    print("  URL  : http://localhost:5774")
    print("  Port : 5774")
    print()
    print("Jika port berbeda, tekan Ctrl+C dan jalankan:")
    print("  python pandai-dapodik-connector.py 8888")
    print("  (ganti 8888 dengan port DAPODIK Anda)")
    print()


def check_dapodik_connection(port=5774):
    """Cek koneksi ke DAPODIK lokal webservice."""
    url = f"http://localhost:{port}/WebService"
    try:
        resp = requests.get(url, timeout=3)
        return True
    except requests.exceptions.ConnectionError:
        return False
    except Exception:
        return False


def fetch_from_dapodik(endpoint, token, npsn, label=""):
    """Tarik data dari endpoint DAPODIK lokal."""
    url = f"{endpoint}?npsn={npsn}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        resp = requests.get(url, headers=headers, timeout=DAPODIK_TIMEOUT)
        if resp.status_code == 200:
            try:
                data = resp.json()
                # Handle different response formats
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    if "data" in data:
                        return data["data"]
                    elif "rows" in data:
                        return data["rows"]
                    else:
                        return [data]
                return data
            except json.JSONDecodeError:
                print(f"  ⚠ {label}: Response bukan JSON")
                return None
        elif resp.status_code == 403:
            print(f"  ✗ {label}: Token tidak valid (HTTP 403)")
            return None
        else:
            print(f"  ✗ {label}: HTTP {resp.status_code}")
            return None
    except requests.exceptions.ConnectionError:
        print(f"  ✗ {label}: Tidak terhubung ke DAPODIK")
        return None
    except requests.exceptions.Timeout:
        print(f"  ✗ {label}: Timeout ({DAPODIK_TIMEOUT}s)")
        return None
    except Exception as e:
        print(f"  ✗ {label}: Error - {e}")
        return None


def extract_school_profile(sekolah_data):
    """Ekstrak field profil sekolah dari data API DAPODIK."""
    if not sekolah_data:
        return {}

    # DAPODIK returns a list, take first item
    if isinstance(sekolah_data, list) and len(sekolah) > 0:
        row = sekolah_data[0]
    elif isinstance(sekolah_data, dict):
        row = sekolah_data
    else:
        return {}

    if not row:
        return {}

    # Map common DAPODIK API field names (snake_case)
    result = {}

    def get(*keys):
        for k in keys:
            v = row.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        return ""

    result["npsn"] = get("npsn", "npsn_smk")
    result["name"] = get("nama", "nama_sekolah", "nama_sp", "nm_sekolah")
    result["npsn_smk"] = get("npsn_smk")
    result["address"] = get("alamat", "alamat_jln", "jalan")
    result["province"] = get("propinsi", "provinsi", "nama_propinsi")
    result["city"] = get("kabupaten_kota", "kabupaten", "kab_kota", "nama_kabupaten")
    result["district"] = get("kecamatan", "kec", "nama_kecamatan")
    result["village"] = get("desa_kelurahan", "kelurahan", "desa", "nama_kelurahan")
    result["postalCode"] = get("kode_pos")
    result["principalName"] = get("kepala_sekolah", "nama_kepala_sekolah", "nm_kepala")
    result["nuptkPrincipal"] = get("nuptk_kepala", "nuptk_ks", "nip_kepala")
    result["accreditation"] = get("akreditasi", "status_akreditasi")
    result["schoolType"] = get("bentuk_pendidikan", "jenis_pendidikan", "jenjang")
    result["established"] = get("tahun_berdiri", "tgl_sk_pendirian")
    result["curriculum"] = get("kurikulum", "nama_kurikulum")
    result["phone"] = get("telepon", "telp", "no_telp")
    result["fax"] = get("fax", "no_fax")
    result["email"] = get("email", "email_sekolah")
    result["website"] = get("website", "web")
    result["status"] = get("status", "status_sekolah")

    return result


def extract_summary(data_list, label=""):
    """Extract summary counts from data list."""
    if not data_list or not isinstance(data_list, list):
        return f"0 record"
    return f"{len(data_list)} record"


def main():
    print_header()

    # Determine port from CLI argument or default
    port = 5774
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
            print(f"  Menggunakan port: {port}")
        except ValueError:
            print(f"  Port tidak valid: {sys.argv[1]}, menggunakan default: 5774")
    print()

    # Step 1: Check DAPODIK connection
    print(f"[1/4] Mengecek koneksi DAPODIK Lokal (port {port})...")
    if not check_dapodik_connection(port):
        print()
        print("  ✗ Tidak dapat terhubung ke DAPODIK Lokal!")
        print()
        print_guide()
        print("Tekan Enter untuk keluar...")
        input()
        sys.exit(1)
    print("  ✓ Terhubung ke DAPODIK Lokal")
    print()

    # Update endpoints with correct port
    for key in ENDPOINTS:
        ENDPOINTS[key] = f"http://localhost:{port}/WebService/{key.replace('_', '').title().replace(' ', '')}"
    # Restore correct endpoint paths
    ENDPOINTS = {
        "sekolah": f"http://localhost:{port}/WebService/getSekolah",
        "guru_tendik": f"http://localhost:{port}/WebService/getGtk",
        "peserta_didik": f"http://localhost:{port}/WebService/getPesertaDidik",
        "rombongan_belajar": f"http://localhost:{port}/WebService/getRombonganBelajar",
    }

    # Step 2: Get NPSN
    print("[2/4] Masukkan data:")
    print("-" * 50)
    npsn = input("  NPSN Sekolah (8 digit) : ").strip()
    if not npsn or len(npsn) < 8:
        print("  ✗ NPSN tidak valid")
        sys.exit(1)

    token = input("  Webservice Key (Token)   : ").strip()
    if not token:
        print("  ✗ Token wajib diisi")
        print("  Tip: Buka DAPODIK > Pengaturan > Web Service > lihat Key")
        sys.exit(1)
    print()

    # Step 3: Fetch data from DAPODIK
    print("[3/4] Menarik data dari DAPODIK Lokal...")
    print("-" * 50)

    all_data = {}
    success_count = 0

    # 3a: Sekolah (profil)
    print("  ⟳ Tarik Data Sekolah...", end="", flush=True)
    sekolah_data = fetch_from_dapodik(ENDPOINTS["sekolah"], token, npsn, "Sekolah")
    if sekolah_data is not None:
        print(f" ✓ ({extract_summary(sekolah_data)})")
        all_data["sekolah"] = sekolah_data
        success_count += 1
    else:
        print()

    # 3b: Guru & Tenaga Kependidikan
    print("  ⟳ Tarik Data Guru/Tendik...", end="", flush=True)
    gtk_data = fetch_from_dapodik(ENDPOINTS["guru_tendik"], token, npsn, "Guru/Tendik")
    if gtk_data is not None:
        print(f" ✓ ({extract_summary(gtk_data)})")
        all_data["guru_tendik"] = gtk_data
        success_count += 1
    else:
        print()

    # 3c: Peserta Didik
    print("  ⟳ Tarik Data Peserta Didik...", end="", flush=True)
    pd_data = fetch_from_dapodik(ENDPOINTS["peserta_didik"], token, npsn, "Peserta Didik")
    if pd_data is not None:
        print(f" ✓ ({extract_summary(pd_data)})")
        all_data["peserta_didik"] = pd_data
        success_count += 1
    else:
        print()

    # 3d: Rombongan Belajar
    print("  ⟳ Tarik Data Rombongan Belajar...", end="", flush=True)
    rombel_data = fetch_from_dapodik(ENDPOINTS["rombongan_belajar"], token, npsn, "Rombongan Belajar")
    if rombel_data is not None:
        print(f" ✓ ({extract_summary(rombel_data)})")
        all_data["rombongan_belajar"] = rombel_data
        success_count += 1
    else:
        print()

    print()

    if success_count == 0:
        print("  ✗ GAGAL: Tidak ada data yang berhasil ditarik.")
        print("  Pastikan:")
        print("    - NPSN benar")
        print("    - Token valid")
        print("    - DAPODIK Desktop terbuka")
        print()
        input("Tekan Enter untuk keluar...")
        sys.exit(1)

    print(f"  Berhasil menarik {success_count}/{4} jenis data.")
    print()

    # Step 4: Build export JSON for PANDAI
    print("[4/4] Membuat file ekspor PANDAI...")
    print("-" * 50)

    school_profile = extract_school_profile(all_data.get("sekolah"))

    # Build PANDAI export format
    pandai_export = {
        "_meta": {
            "generator": "PANDAI DAPODIK Connector v1.0",
            "exportedAt": datetime.now().isoformat(),
            "npsn": npsn,
            "dapodikPort": port,
            "dataTypes": list(all_data.keys()),
            "version": "1.0",
        },
        "sekolah": school_profile,
        "guru_tendik": all_data.get("guru_tendik", []),
        "peserta_didik": all_data.get("peserta_didik", []),
        "rombongan_belajar": all_data.get("rombongan_belajar", []),
    }

    # Save to JSON file
    output_filename = f"pandai-sekolah-{npsn}.json"
    output_path = os.path.join(os.getcwd(), output_filename)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(pandai_export, f, ensure_ascii=False, indent=2)

    print(f"  ✓ File disimpan: {output_filename}")
    print(f"  ✓ Ukuran: {os.path.getsize(output_path) / 1024:.1f} KB")
    print()

    # Summary
    print("=" * 50)
    print("  HASIL EKSPOR DATA DAPODIK")
    print("=" * 50)
    if school_profile:
        print(f"  NPSN            : {school_profile.get('npsn', '-')}")
        print(f"  Nama Sekolah    : {school_profile.get('name', '-')}")
        print(f"  Alamat          : {school_profile.get('address', '-')}")
        print(f"  Kecamatan       : {school_profile.get('district', '-')}")
        print(f"  Kabupaten/Kota  : {school_profile.get('city', '-')}")
        print(f"  Provinsi        : {school_profile.get('province', '-')}")
        print(f"  Kepala Sekolah  : {school_profile.get('principalName', '-')}")
        print(f"  Telp            : {school_profile.get('phone', '-')}")
        print(f"  Email           : {school_profile.get('email', '-')}")
    print(f"  Guru/Tendik     : {extract_summary(all_data.get('guru_tendik'))}")
    print(f"  Peserta Didik   : {extract_summary(all_data.get('peserta_didik'))}")
    print(f"  Rombongan Belajar: {extract_summary(all_data.get('rombongan_belajar'))}")
    print("=" * 50)
    print()
    print(f"  LANJUTKAN:")
    print(f"  1. Buka website PANDAI")
    print(f"  2. Klik 'Daftar Sekolah'")
    print(f"  3. Pilih role 'Admin'")
    print(f"  4. Klik 'Upload File Dapodik'")
    print(f"  5. Upload file: {output_filename}")
    print()
    input("Tekan Enter untuk keluar...")


if __name__ == "__main__":
    main()
