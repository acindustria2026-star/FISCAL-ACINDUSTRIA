import type { EmpresaRow } from '../types/database';
import {
  CSS_PRINT_BASE,
  esc,
  gerarAssinaturas,
  gerarFooter,
  gerarTimbrado,
} from './printHelpers';

export interface MetricaParaPrint {
  label: string;
  valor: string;
}

export interface ConfigImpressaoRelatorio {
  empresa: EmpresaRow;
  titulo: string;
  periodo: string;
  metricas: MetricaParaPrint[];
  headers: string[];
  rows: string[][];
  totalRow?: string[] | null;
  alignmentByCol?: ('left' | 'right')[];
}

export interface ResultadoImpressao {
  ok: boolean;
  motivo?: string;
}

function gerarResumo(metricas: MetricaParaPrint[]): string {
  if (metricas.length === 0) return '';
  return `
  <section class="resumo-rel">
    ${metricas
      .map(
        (m) => `
      <div>
        <span class="label">${esc(m.label)}</span>
        <span class="value">${esc(m.valor)}</span>
      </div>
    `,
      )
      .join('')}
  </section>
  `.trim();
}

function gerarTabela(
  headers: string[],
  rows: string[][],
  totalRow: string[] | null | undefined,
  alignmentByCol: ('left' | 'right')[] | undefined,
): string {
  const align = (i: number) => (alignmentByCol?.[i] === 'right' ? 'right' : 'left');
  return `
  <table class="tab-rel">
    <thead>
      <tr>
        ${headers.map((h, i) => `<th class="${align(i)}">${esc(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          ${r.map((c, i) => `<td class="${align(i)}">${esc(c)}</td>`).join('')}
        </tr>
      `,
        )
        .join('')}
    </tbody>
    ${
      totalRow
        ? `
    <tfoot>
      <tr class="total">
        ${totalRow.map((c, i) => `<td class="${align(i)}">${esc(c)}</td>`).join('')}
      </tr>
    </tfoot>
    `
        : ''
    }
  </table>
  `.trim();
}

function gerarPeriodo(periodo: string): string {
  return `<p class="periodo-rel">Período: <strong>${esc(periodo)}</strong></p>`;
}

function gerarHtml(cfg: ConfigImpressaoRelatorio): string {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${esc(cfg.titulo)} · ${esc(cfg.empresa.nome_fantasia)}</title>
  <style>
    ${CSS_PRINT_BASE}

    .periodo-rel {
      font-size: 11px;
      color: #555;
      margin: 0 0 12px;
    }
    .periodo-rel strong { color: #1a1a1a; }

    .resumo-rel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px 16px;
      padding: 12px 16px;
      background: #FAF7F0;
      border: 1px solid #E5D9B6;
      border-radius: 8px;
      margin-bottom: 18px;
    }
    .resumo-rel > div { display: flex; flex-direction: column; gap: 2px; }

    .tab-rel {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .tab-rel th, .tab-rel td {
      padding: 8px 10px;
      vertical-align: middle;
    }
    .tab-rel th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      font-weight: 600;
      background: #f5f3ed;
      border-bottom: 1px solid #d0d0d0;
    }
    .tab-rel td {
      border-top: 1px solid #ececec;
    }
    .tab-rel .right { text-align: right; font-variant-numeric: tabular-nums; }
    .tab-rel .left { text-align: left; }

    .tab-rel tfoot tr.total {
      background: #FAF7F0;
      border-top: 2px solid #D4A017;
      font-weight: 700;
    }
    .tab-rel tfoot tr.total td {
      color: #A57D0D;
      border-top: none;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    @media print {
      body { background: #fff; }
      .tab-rel { page-break-inside: auto; }
      .tab-rel tr { page-break-inside: avoid; page-break-after: auto; }
      .tab-rel thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  ${gerarTimbrado(cfg.empresa, cfg.titulo, dataHoje, horaAgora)}
  ${gerarPeriodo(cfg.periodo)}
  ${gerarResumo(cfg.metricas)}
  ${gerarTabela(cfg.headers, cfg.rows, cfg.totalRow, cfg.alignmentByCol)}

  ${gerarAssinaturas(cfg.empresa.nome_fantasia)}

  ${gerarFooter(cfg.empresa.nome_fantasia, dataHoje, horaAgora)}

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function imprimirRelatorio(cfg: ConfigImpressaoRelatorio): ResultadoImpressao {
  if (cfg.rows.length === 0) {
    return { ok: false, motivo: 'Nada pra imprimir — relatório sem dados' };
  }

  const janela = window.open('', '_blank', 'width=1200,height=900');
  if (!janela) {
    return { ok: false, motivo: 'Permita popups no navegador para abrir o relatório' };
  }

  const html = gerarHtml(cfg);
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  return { ok: true };
}
