// CSV export utility
export function downloadCSV(data: Record<string, any>[], filename: string, columns?: string[]) {
  if (!data.length) { return; }
  const keys = columns || Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map(row => keys.map(k => {
      let val = String(row[k] ?? '');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    }).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  window.open(URL.createObjectURL(blob));
}
