// Unit test untuk src/lib/school-grades.ts
// Jalankan dengan: node --import tsx --test tests/school-grades.test.ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSchoolLevel,
  getGradeOptions,
  getGradeLabel,
  getGradeColor,
  getGradeBg,
  extractGradeFromName,
  isGradeValidForSchool,
} from '../src/lib/school-grades';

describe('getSchoolLevel', () => {
  test('mengenali SD/MI', () => {
    assert.equal(getSchoolLevel('SD'), 'SD');
    assert.equal(getSchoolLevel('MI'), 'SD');
    assert.equal(getSchoolLevel('SDIT'), 'SD');
    assert.equal(getSchoolLevel('SDLB'), 'SD');
  });
  test('mengenali SMP/MTs', () => {
    assert.equal(getSchoolLevel('SMP'), 'SMP');
    assert.equal(getSchoolLevel('MTs'), 'SMP');
    assert.equal(getSchoolLevel('MTS'), 'SMP');
    assert.equal(getSchoolLevel('SLTP'), 'SMP');
    assert.equal(getSchoolLevel('SMPLB'), 'SMP');
  });
  test('fallback ke SMA untuk SMA/SMK/MA', () => {
    assert.equal(getSchoolLevel('SMA'), 'SMA');
    assert.equal(getSchoolLevel('SMK'), 'SMA');
    assert.equal(getSchoolLevel('MA'), 'SMA');
    assert.equal(getSchoolLevel(null), 'SMA');
    assert.equal(getSchoolLevel(undefined), 'SMA');
    assert.equal(getSchoolLevel(''), 'SMA');
  });
});

describe('getGradeOptions', () => {
  test('SD → 1-6', () => {
    assert.deepEqual(getGradeOptions('SD'), ['1', '2', '3', '4', '5', '6']);
  });
  test('SMP → 7-9', () => {
    assert.deepEqual(getGradeOptions('SMP'), ['7', '8', '9']);
  });
  test('SMA/SMK → 10-12', () => {
    assert.deepEqual(getGradeOptions('SMA'), ['10', '11', '12']);
    assert.deepEqual(getGradeOptions('SMK'), ['10', '11', '12']);
    assert.deepEqual(getGradeOptions(null), ['10', '11', '12']);
  });
});

describe('getGradeLabel', () => {
  test('memberi label semua tingkat 1-12', () => {
    assert.equal(getGradeLabel('1'), 'Kelas 1');
    assert.equal(getGradeLabel('6'), 'Kelas 6');
    assert.equal(getGradeLabel('7'), 'Kelas 7');
    assert.equal(getGradeLabel('9'), 'Kelas 9');
    assert.equal(getGradeLabel('10'), 'Kelas 10');
    assert.equal(getGradeLabel('12'), 'Kelas 12');
  });
  test('tak dikenal → "-"', () => {
    assert.equal(getGradeLabel('13'), '-');
    assert.equal(getGradeLabel('0'), '-');
    assert.equal(getGradeLabel('abc'), '-');
  });
});

describe('getGradeColor / getGradeBg', () => {
  test('memberi warna untuk semua tingkat 1-12', () => {
    for (let i = 1; i <= 12; i++) {
      assert.match(getGradeColor(String(i)), /^border-l-/);
      assert.match(getGradeBg(String(i)), /^bg-/);
    }
  });
  test('tak valid → fallback abu-abu', () => {
    assert.equal(getGradeColor('abc'), 'border-l-gray-400');
    assert.equal(getGradeBg('abc'), 'bg-gray-50 text-gray-700');
  });
});

describe('extractGradeFromName', () => {
  test('angka Arab di awal', () => {
    assert.equal(extractGradeFromName('1A'), '1');
    assert.equal(extractGradeFromName('12 TKJ'), '12');
    assert.equal(extractGradeFromName('10 IPA'), '10');
  });
  test('angka Romawi di awal', () => {
    assert.equal(extractGradeFromName('VII-2'), '7');
    assert.equal(extractGradeFromName('X IPA 1'), '10');
    assert.equal(extractGradeFromName('XI IPA'), '11');
    assert.equal(extractGradeFromName('XII IPS'), '12');
    assert.equal(extractGradeFromName('IX'), '9');
    assert.equal(extractGradeFromName('VI A'), '6');
  });
  test('tidak salah tangkap penjurusan (IPA/IPS)', () => {
    assert.equal(extractGradeFromName('IPA 1'), '');
    assert.equal(extractGradeFromName('IPS 2'), '');
  });
  test('kosong / tak dikenali', () => {
    assert.equal(extractGradeFromName(''), '');
    assert.equal(extractGradeFromName('Kelas Prestasi'), '');
  });
});

describe('isGradeValidForSchool', () => {
  test('SD hanya menerima 1-6', () => {
    assert.equal(isGradeValidForSchool('1', 'SD'), true);
    assert.equal(isGradeValidForSchool('6', 'SD'), true);
    assert.equal(isGradeValidForSchool('7', 'SD'), false);
    assert.equal(isGradeValidForSchool('10', 'SD'), false);
  });
  test('SMP hanya menerima 7-9', () => {
    assert.equal(isGradeValidForSchool('7', 'SMP'), true);
    assert.equal(isGradeValidForSchool('9', 'SMP'), true);
    assert.equal(isGradeValidForSchool('6', 'SMP'), false);
    assert.equal(isGradeValidForSchool('10', 'SMP'), false);
  });
  test('SMA/SMK hanya menerima 10-12', () => {
    assert.equal(isGradeValidForSchool('10', 'SMA'), true);
    assert.equal(isGradeValidForSchool('12', 'SMK'), true);
    assert.equal(isGradeValidForSchool('9', 'SMA'), false);
    assert.equal(isGradeValidForSchool('6', null), false);
  });
});
