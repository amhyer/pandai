#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║  PANDAI — Alat Tarik Data Dapodik Lokal                    ║
║  Versi 2.1 (Proxy Mode — tidak pernah gagal CORS)          ║
║                                                              ║
║  Cara pakai:                                                 ║
║    1. Pastikan Dapodik Lokal sudah berjalan                  ║
║    2. Klik 2x file ini (atau jalankan: python dapodik.py)     ║
║    3. Browser akan terbuka otomatis                         ║
║    4. Masukkan NPSN dan Token, lalu klik "Tarik Data"        ║
║                                                              ║
║  Tidak perlu install apapun! Hanya butuh Python 3.           ║
╚══════════════════════════════════════════════════════════════╝
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.error
import webbrowser
import threading
import os
import sys
import socket

PORT = 8765
DAPODIK_SERVER = "http://localhost:5774"

HTML_PAGE = r'''<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PANDAI — Tarik Data Dapodik Lokal</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #1F3864; --navy-light: #2d5289; --navy-dark: #152A4A;
    --amber: #F59E0B; --amber-dark: #D97706; --amber-light: #FDE68A;
    --white: #ffffff;
    --gray-50: #f9fafb; --gray-100: #f3f4f6; --gray-200: #e5e7eb; --gray-300: #d1d5db;
    --gray-400: #9ca3af; --gray-500: #6b7280; --gray-600: #4b5563; --gray-700: #374151;
    --gray-800: #1f2937; --gray-900: #111827;
    --green-50: #f0fdf4; --green-100: #dcfce7; --green-500: #22c55e; --green-600: #16a34a; --green-700: #15803d;
    --red-50: #fef2f2; --red-100: #fee2e2; --red-500: #ef4444; --red-600: #dc2626;
    --yellow-50: #fffbeb; --yellow-100: #fef3c7; --yellow-600: #ca8a04;
    --blue-50: #eff6ff; --blue-100: #dbeafe; --blue-600: #2563eb;
    --radius: 12px;
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 50%, var(--navy-dark) 100%);
    min-height: 100vh; color: var(--gray-800); line-height: 1.6;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 20px 16px 40px; }
  .header { text-align: center; margin-bottom: 32px; color: var(--white); }
  .header .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .header .logo-icon {
    width: 48px; height: 48px; background: rgba(245,158,11,0.15);
    border-radius: 14px; display: flex; align-items: center; justify-content: center;
  }
  .header .logo-icon svg { width: 28px; height: 28px; color: var(--amber); }
  .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .header p { font-size: 14px; opacity: 0.6; margin-top: 4px; }
  .card {
    background: var(--white); border-radius: var(--radius);
    box-shadow: var(--shadow-md); padding: 28px; margin-bottom: 20px;
  }
  .card-title {
    font-size: 18px; font-weight: 700; color: var(--navy);
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid var(--gray-100);
  }
  .card-title svg { width: 22px; height: 22px; color: var(--amber); }
  label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
  input[type="text"], input[type="password"] {
    width: 100%; padding: 11px 14px;
    border: 1.5px solid var(--gray-200); border-radius: 10px;
    font-size: 14px; color: var(--gray-800); background: var(--gray-50);
    transition: border-color 0.2s, box-shadow 0.2s; outline: none;
  }
  input:focus { border-color: var(--navy-light); box-shadow: 0 0 0 3px rgba(31,56,100,0.12); background: var(--white); }
  .form-group { margin-bottom: 16px; }
  .hint { font-size: 11px; color: var(--gray-400); margin-top: 4px; }
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 24px; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; outline: none;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn svg { width: 18px; height: 18px; }
  .btn-primary {
    background: linear-gradient(135deg, var(--navy), var(--navy-light));
    color: var(--white); box-shadow: 0 2px 8px rgba(31,56,100,0.3);
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(31,56,100,0.4); }
  .btn-amber {
    background: linear-gradient(135deg, var(--amber), var(--amber-dark));
    color: var(--navy-dark); box-shadow: 0 2px 8px rgba(245,158,11,0.3);
  }
  .btn-amber:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.4); }
  .btn-success {
    background: linear-gradient(135deg, var(--green-600), var(--green-700));
    color: var(--white); box-shadow: 0 2px 8px rgba(22,163,74,0.3);
  }
  .btn-outline { background: var(--white); color: var(--navy); border: 1.5px solid var(--gray-200); }
  .btn-outline:hover:not(:disabled) { border-color: var(--navy); background: var(--gray-50); }
  .btn-group { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
  .btn-full { width: 100%; }
  .status-box {
    border-radius: 10px; padding: 14px 16px;
    font-size: 13px; font-weight: 500;
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  }
  .status-box svg { width: 20px; height: 20px; flex-shrink: 0; }
  .status-info { background: var(--blue-50); color: var(--blue-600); border: 1px solid var(--blue-100); }
  .status-success { background: var(--green-50); color: var(--green-700); border: 1px solid var(--green-100); }
  .status-error { background: var(--red-50); color: var(--red-600); border: 1px solid var(--red-100); }
  .status-warning { background: var(--yellow-50); color: var(--yellow-600); border: 1px solid var(--yellow-100); }
  .progress-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
  @media (max-width: 600px) { .progress-grid { grid-template-columns: 1fr; } }
  .progress-item {
    border-radius: 10px; padding: 14px;
    background: var(--gray-50); border: 1px solid var(--gray-200); font-size: 13px;
  }
  .progress-item .label { font-weight: 600; color: var(--gray-700); display: flex; align-items: center; gap: 6px; }
  .progress-item .count { font-size: 20px; font-weight: 700; color: var(--navy); margin-top: 4px; }
  .progress-item.done { border-color: var(--green-500); background: var(--green-50); }
  .progress-item.loading { border-color: var(--amber); background: var(--yellow-50); }
  .progress-item.error { border-color: var(--red-500); background: var(--red-50); }
  .progress-item.pending { opacity: 0.5; }
  .spinner {
    width: 18px; height: 18px;
    border: 2.5px solid transparent; border-top-color: currentColor;
    border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .log-box {
    background: var(--gray-900); color: var(--green-500);
    border-radius: 10px; padding: 16px;
    font-family: 'Courier New', monospace; font-size: 12px;
    max-height: 200px; overflow-y: auto; margin-top: 16px; line-height: 1.8;
  }
  .log-error { color: var(--red-500); }
  .log-info { color: var(--amber); }
  .log-success { color: var(--green-500); }
  .steps { display: flex; gap: 8px; margin-bottom: 24px; }
  .step { flex: 1; text-align: center; }
  .step-num {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--gray-200); color: var(--gray-500);
    font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 6px; transition: all 0.3s;
  }
  .step-label { font-size: 11px; color: var(--gray-400); font-weight: 500; }
  .step.active .step-num { background: var(--navy); color: var(--white); }
  .step.active .step-label { color: var(--navy); font-weight: 600; }
  .step.done .step-num { background: var(--green-600); color: var(--white); }
  .step.done .step-label { color: var(--green-700); }
  .preview-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
  .preview-table th { background: var(--navy); color: var(--white); padding: 8px 10px; text-align: left; font-weight: 600; position: sticky; top: 0; }
  .preview-table td { padding: 7px 10px; border-bottom: 1px solid var(--gray-200); color: var(--gray-700); }
  .preview-table tr:hover td { background: var(--gray-50); }
  .table-scroll { max-height: 250px; overflow: auto; border-radius: 8px; border: 1px solid var(--gray-200); }
  .footer { text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/>
        </svg>
      </div>
      <h1>PANDAI — Tarik Data Dapodik</h1>
    </div>
    <p>Alat penarikan data dari Dapodik Lokal untuk diimpor ke PANDAI</p>
  </div>

  <div class="card">
    <div class="steps">
      <div class="step active" id="step1"><div class="step-num">1</div><div class="step-label">Koneksi</div></div>
      <div class="step" id="step2"><div class="step-num">2</div><div class="step-label">Tarik Data</div></div>
      <div class="step" id="step3"><div class="step-num">3</div><div class="step-label">Download</div></div>
    </div>

    <!-- Step 1: Connection -->
    <div id="section-connect">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        Koneksi ke Dapodik Lokal
      </div>
      <div class="status-box status-info" id="connect-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Pastikan aplikasi <b>Dapodik Lokal</b> sudah berjalan di laptop Anda. Buka menu <b>Bantuan → Manajemen Web Service</b>, centang "Aktif", lalu tekan <b>Simpan</b>. Token akan muncul di halaman tersebut.</span>
      </div>
      <div class="form-group">
        <label>NPSN Sekolah</label>
        <input type="text" id="input-npsn" placeholder="Contoh: 30100001" />
        <div class="hint">NPSN dapat dilihat di halaman profil sekolah di Dapodik</div>
      </div>
      <div class="form-group">
        <label>Dapodik Webservice Key (Token)</label>
        <input type="text" id="input-token" placeholder="Kunci token dari Manajemen Web Service Dapodik" />
        <div class="hint">Dapatkan dari menu <b>Bantuan → Manajemen Web Service</b> di aplikasi Dapodik Lokal</div>
      </div>
      <div class="form-group">
        <label>Server Dapodik (biasanya tidak perlu diubah)</label>
        <input type="text" id="input-server" value="http://localhost:5774" />
        <div class="hint">Pastikan tidak ada tanda "/" di akhir</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary btn-full" id="btn-connect" onclick="testConnection()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          Tes Koneksi ke Dapodik Lokal
        </button>
      </div>
      <div id="connect-result" style="margin-top:12px;"></div>
    </div>

    <!-- Step 2: Pull Data -->
    <div id="section-pull" style="display:none;">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Tarik Data dari Dapodik
      </div>
      <div class="status-box status-success" id="pull-connected">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Terhubung ke Dapodik Lokal — <b id="pull-school-name">-</b></span>
      </div>
      <div class="progress-grid" id="pull-progress">
        <div class="progress-item pending" id="prog-sekolah">
          <div class="label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> Data Sekolah</div>
          <div class="count" id="count-sekolah">-</div>
        </div>
        <div class="progress-item pending" id="prog-guru">
          <div class="label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> Data Guru / PTK</div>
          <div class="count" id="count-guru">-</div>
        </div>
        <div class="progress-item pending" id="prog-pd">
          <div class="label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5"/></svg> Peserta Didik</div>
          <div class="count" id="count-pd">-</div>
        </div>
        <div class="progress-item pending" id="prog-rombel">
          <div class="label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> Rombongan Belajar</div>
          <div class="count" id="count-rombel">-</div>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-amber btn-full" id="btn-pull" onclick="pullAllData()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Mulai Tarik Semua Data
        </button>
      </div>
      <div class="log-box" id="pull-log" style="display:none;"></div>
    </div>

    <!-- Step 3: Export -->
    <div id="section-export" style="display:none;">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Data Berhasil Ditarik!
      </div>
      <div class="status-box status-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Semua data berhasil ditarik dari Dapodik Lokal. Download file JSON, lalu impor ke PANDAI.</span>
      </div>
      <div id="pull-preview"></div>
      <div class="btn-group" style="flex-direction:column;gap:12px;">
        <button class="btn btn-success btn-full" onclick="downloadJSON()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download JSON untuk Impor ke PANDAI
        </button>
        <button class="btn btn-outline" onclick="resetPull()" style="align-self:flex-start;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          Tarik Ulang
        </button>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>PANDAI by NALAR — Alat Tarik Data Dapodik v2.1 (Proxy Mode)</p>
    <p style="margin-top:4px;">Data diproses lokal di laptop Anda. Tidak ada data yang dikirim ke server eksternal.</p>
  </div>
</div>

<script>
var pulledData = {
  version: '2.1', exportedAt: '', source: 'dapodik_lokal',
  schoolName: '', npsn: '',
  data: { sekolah: null, guru: [], pesertaDidik: [], rombel: [], mataPelajaran: [] }
};

function setStep(n) {
  for (var i = 1; i <= 3; i++) {
    var el = document.getElementById('step' + i);
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  }
  document.getElementById('section-connect').style.display = n === 1 ? '' : 'none';
  document.getElementById('section-pull').style.display = n === 2 ? '' : 'none';
  document.getElementById('section-export').style.display = n === 3 ? '' : 'none';
}

/* Fetch via proxy to avoid CORS */
async function fetchDapodik(endpoint) {
  var cfg = getConfig();
  var url = '/proxy?url=' + encodeURIComponent(cfg.server + '/WebService/' + endpoint + '?npsn=' + cfg.npsn) + '&token=' + encodeURIComponent(cfg.token);
  var resp = await fetch(url);
  if (!resp.ok) {
    var text = await resp.text().catch(function() { return ''; });
    throw new Error('HTTP ' + resp.status + ': ' + text.substring(0, 300));
  }
  return resp.json();
}

function getConfig() {
  return {
    server: document.getElementById('input-server').value.replace(/\/+$/, ''),
    npsn: document.getElementById('input-npsn').value.trim(),
    token: document.getElementById('input-token').value.trim()
  };
}

async function testConnection() {
  var cfg = getConfig();
  var resultDiv = document.getElementById('connect-result');
  var btn = document.getElementById('btn-connect');
  if (!cfg.npsn || !cfg.token) {
    resultDiv.innerHTML = '<div class="status-box status-warning" style="margin-top:12px"><span>NPSN dan Token wajib diisi!</span></div>';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Menghubungkan...';
  resultDiv.innerHTML = '<div class="status-box status-info" style="margin-top:12px"><span class="spinner"></span><span>Mencoba terhubung ke ' + cfg.server + '...</span></div>';
  try {
    var data = await fetchDapodik('getSekolah');
    var rows = Array.isArray(data) ? data : (data.data || data.rows || data.sekolah || [data]);
    if (rows.length === 0) throw new Error('Data sekolah kosong');
    var sekolah = rows[0];
    var name = sekolah.nama || sekolah.nama_sekolah || sekolah.sekolah || 'Sekolah';
    pulledData.schoolName = name;
    pulledData.npsn = cfg.npsn;
    resultDiv.innerHTML = '<div class="status-box status-success" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Berhasil terhubung! Sekolah: <b>' + name + '</b> (NPSN: ' + cfg.npsn + ')</span></div>';
    setTimeout(function() { setStep(2); }, 800);
  } catch (err) {
    resultDiv.innerHTML = '<div class="status-box status-error" style="margin-top:12px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>Gagal terhubung: ' + err.message + '<br><br><b>Tips:</b><br>1. Pastikan Dapodik Lokal sudah berjalan<br>2. Buka Bantuan → Manajemen Web Service<br>3. Centang "Aktif", tekan <b>Simpan</b><br>4. Salin Token yang muncul di halaman tersebut</span></div>';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> Tes Koneksi ke Dapodik Lokal';
  }
}

function log(msg, type) {
  var box = document.getElementById('pull-log');
  box.style.display = '';
  var line = document.createElement('div');
  if (type) line.className = 'log-' + type;
  var time = new Date().toLocaleTimeString('id-ID');
  line.textContent = '[' + time + '] ' + msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function setProgress(id, state, count) {
  var el = document.getElementById('prog-' + id);
  el.className = 'progress-item ' + state;
  document.getElementById('count-' + id).textContent = count !== undefined ? count : '-';
}

async function pullAllData() {
  var btn = document.getElementById('btn-pull');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> SEDANG MENGIRIM DATA, MOHON TUNGGU...';
  ['sekolah','guru','pd','rombel'].forEach(function(id){ setProgress(id,'loading','...'); });
  document.getElementById('pull-log').innerHTML = '';
  document.getElementById('pull-log').style.display = '';

  try {
    log('Menarik data Sekolah...');
    try {
      setProgress('sekolah','loading','...');
      var d = await fetchDapodik('getSekolah');
      var rows = Array.isArray(d)?d:(d.data||d.rows||d.sekolah||[d]);
      pulledData.data.sekolah = rows;
      setProgress('sekolah','done',rows.length+' records');
      log('Data Sekolah: '+rows.length+' record','success');
    } catch(e){ setProgress('sekolah','error','GAGAL'); log('Data Sekolah gagal: '+e.message,'error'); }

    log('Menarik data Guru & PTK...');
    try {
      setProgress('guru','loading','...');
      var d2 = await fetchDapodik('getGtk');
      var rows2 = Array.isArray(d2)?d2:(d2.data||d2.rows||d2.guru||d2.ptk||[]);
      pulledData.data.guru = rows2;
      setProgress('guru','done',rows2.length+' guru');
      log('Data Guru: '+rows2.length+' guru/ptk','success');
    } catch(e){ setProgress('guru','error','GAGAL'); log('Data Guru gagal: '+e.message,'error'); }

    log('Menarik data Peserta Didik...');
    try {
      setProgress('pd','loading','...');
      var d3 = await fetchDapodik('getPesertaDidik');
      var rows3 = Array.isArray(d3)?d3:(d3.data||d3.rows||d3.peserta_didik||[]);
      pulledData.data.pesertaDidik = rows3;
      setProgress('pd','done',rows3.length+' siswa');
      log('Data Peserta Didik: '+rows3.length+' siswa','success');
    } catch(e){ setProgress('pd','error','GAGAL'); log('Peserta Didik gagal: '+e.message,'error'); }

    log('Menarik data Rombongan Belajar...');
    try {
      setProgress('rombel','loading','...');
      var d4 = await fetchDapodik('getRombonganBelajar');
      var rows4 = Array.isArray(d4)?d4:(d4.data||d4.rows||d4.rombel||[]);
      pulledData.data.rombel = rows4;
      setProgress('rombel','done',rows4.length+' kelas');
      log('Data Rombongan Belajar: '+rows4.length+' rombel','success');
    } catch(e){ setProgress('rombel','error','GAGAL'); log('Rombel gagal: '+e.message,'error'); }

    pulledData.exportedAt = new Date().toISOString();
    var total = pulledData.data.guru.length + pulledData.data.pesertaDidik.length + pulledData.data.rombel.length;
    if (total === 0) {
      log('ADA YANG SALAH DENGAN DATA. Token tidak berfungsi?','error');
    } else {
      log('========================================','success');
      log(' TOTAL: '+total+' data berhasil ditarik','success');
      log(' Sekolah: '+(pulledData.data.sekolah? pulledData.data.sekolah.length:0),'success');
      log(' Guru/PTK: '+pulledData.data.guru.length,'success');
      log(' Peserta Didik: '+pulledData.data.pesertaDidik.length,'success');
      log(' Rombongan Belajar: '+pulledData.data.rombel.length,'success');
      log('========================================','success');
      setTimeout(function(){
        setStep(3);
        document.getElementById('pull-school-name').textContent = pulledData.schoolName + ' (NPSN: ' + pulledData.npsn + ')';
        buildPreview();
      }, 1000);
    }
  } catch(err) { log('Error: '+err.message,'error'); }
  finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Mulai Tarik Semua Data';
  }
}

function buildPreview() {
  var container = document.getElementById('pull-preview');
  var html = '';
  if (pulledData.data.guru.length > 0) html += buildTablePreview('Guru / PTK', pulledData.data.guru, ['nama','nama_pegawai','nip','nuptk','jenis_kelamin','jk'], 5);
  if (pulledData.data.pesertaDidik.length > 0) html += buildTablePreview('Peserta Didik', pulledData.data.pesertaDidik, ['nama','nama_peserta_didik','nisn','nis','jenis_kelamin','jk'], 5);
  if (pulledData.data.rombel.length > 0) html += buildTablePreview('Rombongan Belajar', pulledData.data.rombel, ['nama','nama_rombel','tingkat_pendidikan','tingkat','kurikulum_id'], 5);
  container.innerHTML = html;
}

function buildTablePreview(title, data, keyFields, maxRows) {
  if (!data || data.length === 0) return '';
  var row0 = data[0];
  var cols = keyFields.filter(function(k){ return row0.hasOwnProperty(k); });
  if (cols.length === 0) cols = Object.keys(row0).slice(0, 8);
  var displayData = data.slice(0, maxRows);
  var h = '<div style="margin-top:16px;"><h4 style="font-size:14px;font-weight:600;color:var(--navy);margin-bottom:8px;">'+title+' ('+data.length+' data)</h4>';
  h += '<div class="table-scroll"><table class="preview-table"><thead><tr>';
  cols.forEach(function(c){ h += '<th>'+c.replace(/_/g,' ')+'</th>'; });
  h += '</tr></thead><tbody>';
  displayData.forEach(function(row){
    h += '<tr>';
    cols.forEach(function(c){
      var val = row[c]; if (val === null || val === undefined) val = '-';
      if (typeof val === 'object') val = JSON.stringify(val);
      h += '<td>'+String(val).substring(0,40)+'</td>';
    });
    h += '</tr>';
  });
  if (data.length > maxRows) h += '<tr><td colspan="'+cols.length+'" style="text-align:center;color:var(--gray-400);font-style:italic;">... dan '+(data.length-maxRows)+' data lainnya</td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}

function downloadJSON() {
  var json = JSON.stringify(pulledData, null, 2);
  var blob = new Blob([json], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'dapodik_' + pulledData.npsn + '_' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetPull() {
  pulledData = { version:'2.1', exportedAt:'', source:'dapodik_lokal', schoolName:'', npsn:'', data:{sekolah:null,guru:[],pesertaDidik:[],rombel:[],mataPelajaran:[]} };
  ['sekolah','guru','pd','rombel'].forEach(function(id){ setProgress(id,'pending','-'); });
  document.getElementById('pull-log').innerHTML = '';
  document.getElementById('pull-log').style.display = 'none';
  document.getElementById('pull-preview').innerHTML = '';
  setStep(2);
}
</script>
</body>
</html>'''


# ═══════════════════════════════════════════════════════════════
# PROXY REQUEST HANDLER
# ═══════════════════════════════════════════════════════════════

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    """Handles both static files and /proxy requests to Dapodik"""

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            # Serve the embedded HTML page
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode('utf-8'))

        elif self.path.startswith('/proxy'):
            # Proxy request to Dapodik Webservice
            self.handle_proxy()

        elif self.path.startswith('/favicon'):
            self.send_response(204)
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def handle_proxy(self):
        """Proxy a request to the Dapodik Webservice"""
        try:
            # Parse query parameters
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            target_url = params.get('url', [''])[0]
            token = params.get('token', [''])[0]

            if not target_url:
                self.send_error(400, 'Missing url parameter')
                return

            # Create request to Dapodik
            req = urllib.request.Request(target_url, method='GET')
            req.add_header('Authorization', 'Bearer ' + token)
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'PANDAI-Dapodik-Tool/2.1')

            # Execute request with timeout
            response = urllib.request.urlopen(req, timeout=30)
            data = response.read()

            # Send response back to browser
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace') if e.fp else str(e)
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_json = json.dumps({"success": False, "error": f"HTTP {e.code}: {body[:500]}"}).encode()
            self.wfile.write(error_json)

        except urllib.error.URLError as e:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_json = json.dumps({
                "success": False,
                "error": "Tidak dapat terhubung dengan Dapodik Lokal. Pastikan: (1) Dapodik Lokal sudah berjalan, (2) Web Service sudah diaktifkan, (3) Token sudah benar.",
                "detail": str(e.reason) if hasattr(e, 'reason') else str(e)
            }).encode()
            self.wfile.write(error_json)

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_json = json.dumps({"success": False, "error": str(e)}).encode()
            self.wfile.write(error_json)


def check_dapodik_running():
    """Check if Dapodik webservice is running"""
    try:
        req = urllib.request.Request(DAPODIK_SERVER + '/WebService/getSekolah?npsn=test', method='GET')
        req.add_header('User-Agent', 'PANDAI-Dapodik-Tool/2.1')
        urllib.request.urlopen(req, timeout=3)
        return True
    except urllib.error.HTTPError:
        # Even a 403/401 means the server is running
        return True
    except:
        return False


def find_free_port():
    """Find a free port, trying the default first"""
    global PORT
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', PORT)) == 0:
                return  # Port already in use, try another
    except:
        return

    # Try to find next available port
    for offset in range(1, 10):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', PORT + offset))
                PORT = PORT + offset
                return
        except:
            continue


def open_browser():
    """Open browser after a short delay"""
    import time
    time.sleep(1)
    webbrowser.open(f'http://localhost:{PORT}')


if __name__ == '__main__':
    print()
    print("  ╔══════════════════════════════════════════════════════════╗")
    print("  ║     PANDAI — Alat Tarik Data Dapodik Lokal v2.1         ║")
    print("  ║     by NALAR                                           ║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print()

    # Check Python version
    if sys.version_info < (3, 6):
        print("  [ERROR] Python 3.6 atau lebih baru diperlukan.")
        print(f"         Versi saat ini: Python {sys.version}")
        print("         Download Python gratis di: https://www.python.org/downloads/")
        input("\n  Tekan Enter untuk keluar...")
        sys.exit(1)

    # Check if Dapodik is running
    print(f"  [INFO] Mengecek koneksi Dapodik Lokal di {DAPODIK_SERVER}...")
    if check_dapodik_running():
        print("  [OK]   Dapodik Lokal terdeteksi ✓")
    else:
        print("  [!]    Dapodik Lokal TIDAK terdeteksi.")
        print("         Pastikan aplikasi Dapodik sudah berjalan.")
        print("         Buka: Bantuan → Manajemen Web Service → Aktif → Simpan")
        print()

    # Find free port
    find_free_port()

    # Start server
    with socketserver.TCPServer(('', PORT), ProxyHandler) as httpd:
        url = f'http://localhost:{PORT}'
        print(f"  [OK]   Server berjalan di: {url}")
        print()
        print("  [i]   Buka browser dan masukkan NPSN + Token Dapodik")
        print("  [i]   Tutup jendela ini untuk menghentikan server")
        print()
        print("  ═══════════════════════════════════════════════════════════")
        print()

        # Open browser in background
        threading.Thread(target=open_browser, daemon=True).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server dihentikan. Terima kasih!")
