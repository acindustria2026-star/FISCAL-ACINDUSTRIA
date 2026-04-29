// Helpers compartilhados pra geração de HTML de impressão (comprovante e relatório).

import type { EmpresaRow } from '../types/database';
import { formatarData as formatarDataBrasilia } from '../lib/dataUtils';

export const LOGO_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="78" height="78">
  <defs>
    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4A017"/>
      <stop offset="100%" stop-color="#A57D0D"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#lg)"/>
  <text x="50" y="68" font-family="Georgia, 'Times New Roman', serif" font-size="56" font-weight="600" text-anchor="middle" fill="#0B0B0D">F</text>
</svg>
`.trim();

export function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export function brl(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function brl4(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function kg(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function pct(n: number | null | undefined, signed = false): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return `${(Number(n) * 100).toLocaleString('pt-BR', {
    signDisplay: signed ? 'always' : 'auto',
    maximumFractionDigits: 2,
  })}%`;
}

export function formatarData(d: string | null | undefined): string {
  return formatarDataBrasilia(d);
}

export function formatarCNPJ(v: string | null | undefined): string {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '').slice(0, 14);
  if (d.length !== 14) return v;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatarCEP(v: string | null | undefined): string {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '').slice(0, 8);
  if (d.length !== 8) return v;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Header timbrado — recebe título do documento (ex: "Comprovante de Operação", "Relatório de Impureza")
 */
export function gerarTimbrado(
  e: EmpresaRow,
  tituloDoc: string,
  dataHoje: string,
  horaAgora: string,
): string {
  const enderecoLinhas = [
    e.endereco,
    [e.cidade, e.uf].filter(Boolean).join(' / '),
    e.cep ? `CEP ${formatarCEP(e.cep)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const contatoLinha = [e.telefone, e.email, e.site].filter(Boolean).join(' · ');

  return `
  <header class="timbrado">
    <div class="logo">${LOGO_SVG}</div>
    <div class="empresa-info">
      <div class="empresa-nome">${esc(e.nome_fantasia)}</div>
      ${e.razao_social ? `<div class="empresa-razao">${esc(e.razao_social)}</div>` : ''}
      <div class="empresa-dados">
        ${e.cnpj ? `<strong>CNPJ:</strong> ${esc(formatarCNPJ(e.cnpj))}` : ''}
        ${e.inscricao_estadual ? ` &nbsp;·&nbsp; <strong>IE:</strong> ${esc(e.inscricao_estadual)}` : ''}
        ${enderecoLinhas ? `<br>${esc(enderecoLinhas)}` : ''}
        ${contatoLinha ? `<br>${esc(contatoLinha)}` : ''}
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-titulo">${esc(tituloDoc)}</div>
      <div class="doc-data">${esc(dataHoje)} · ${esc(horaAgora)}</div>
    </div>
  </header>
  `.trim();
}

/**
 * CSS base reutilizado em ambos os prints (timbrado, resumo, tabelas, assinaturas, footer)
 */
export const CSS_PRINT_BASE = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  background: #fff;
}

.timbrado {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 2.5px solid #D4A017;
  margin-bottom: 18px;
}
.logo { flex-shrink: 0; }
.empresa-info { flex: 1; }
.empresa-nome { font-size: 22px; font-weight: 700; line-height: 1.2; }
.empresa-razao { font-size: 11px; color: #666; font-style: italic; margin-top: 2px; }
.empresa-dados { font-size: 10px; color: #555; line-height: 1.6; margin-top: 6px; }

.doc-meta { text-align: right; flex-shrink: 0; }
.doc-titulo {
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #D4A017;
  font-weight: 700;
  text-transform: uppercase;
}
.doc-data { font-size: 11px; color: #555; margin-top: 4px; }

.label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  font-weight: 500;
}
.value { font-size: 12px; font-weight: 500; color: #1a1a1a; }
.valor-destaque { color: #A57D0D !important; font-weight: 700 !important; font-size: 13px !important; }

.assinaturas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  margin-top: 50px;
  page-break-inside: avoid;
}
.assinaturas > div { text-align: center; }
.linha-assinatura {
  border-top: 1.5px solid #333;
  padding-top: 50px;
  margin-bottom: 6px;
}
.assinaturas .nome { font-size: 12px; font-weight: 600; }
.assinaturas .papel { font-size: 10px; color: #888; margin-top: 2px; }

.doc-footer {
  margin-top: 30px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
  text-align: center;
  font-size: 9px;
  color: #999;
}
`.trim();

export function gerarAssinaturas(empresaNome: string): string {
  return `
  <section class="assinaturas">
    <div>
      <div class="linha-assinatura"></div>
      <div class="nome">${esc(empresaNome)}</div>
      <div class="papel">Responsável pela emissão</div>
    </div>
    <div>
      <div class="linha-assinatura"></div>
      <div class="nome">Cliente</div>
      <div class="papel">Confere e recebe</div>
    </div>
  </section>
  `.trim();
}

export function gerarFooter(empresaNome: string, dataHoje: string, horaAgora: string): string {
  return `
  <footer class="doc-footer">
    Documento gerado em ${esc(dataHoje)} às ${esc(horaAgora)} · Sistema de Controle Fiscal · ${esc(empresaNome)}
  </footer>
  `.trim();
}
