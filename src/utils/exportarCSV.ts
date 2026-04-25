function escaparCelula(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const s = typeof valor === 'string' ? valor : JSON.stringify(valor);
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportarCSV(nomeArquivo: string, headers: string[], linhas: unknown[][]): void {
  const csv = [
    headers.map(escaparCelula).join(','),
    ...linhas.map((linha) => linha.map(escaparCelula).join(',')),
  ].join('\n');

  // BOM pra Excel reconhecer UTF-8
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
