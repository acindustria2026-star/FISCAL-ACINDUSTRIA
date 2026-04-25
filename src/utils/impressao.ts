import type { EmpresaRow } from '../types/database';
import type { ItemComparativo } from '../hooks/useComparativo';
import {
  CSS_PRINT_BASE,
  brl,
  brl4,
  esc,
  formatarCNPJ,
  formatarData,
  gerarAssinaturas,
  gerarFooter,
  gerarTimbrado,
  kg,
  pct,
} from './printHelpers';

function statusTag(status: 'ok' | 'divergente' | 'aguardando'): string {
  const map = {
    ok: { txt: 'Conferida', cor: '#10783D', bg: '#E8F5ED' },
    divergente: { txt: 'Divergente', cor: '#C63030', bg: '#FCEAEA' },
    aguardando: { txt: 'Aguardando', cor: '#9B7D2E', bg: '#FAF3DC' },
  };
  const s = map[status];
  return `<span class="status-tag" style="color: ${s.cor}; background: ${s.bg}; border-color: ${s.cor};">${s.txt}</span>`;
}

function gerarResumo(itens: ItemComparativo[]): string {
  const totPeso = itens.reduce((s, i) => s + i.pesoEmitido, 0);
  const totFinal = itens.reduce((s, i) => s + i.valorFinalNf, 0);
  const totPago = itens.reduce((s, i) => s + (i.valorPago ?? 0), 0);
  const totImp = itens.reduce((s, i) => s + i.impostoNf, 0);

  return `
  <section class="resumo">
    <div><span class="label">NFs no comprovante</span><span class="value">${itens.length}</span></div>
    <div><span class="label">Peso emitido</span><span class="value">${esc(kg(totPeso))}</span></div>
    <div><span class="label">Valor total NF</span><span class="value">${esc(brl(totFinal))}</span></div>
    <div><span class="label">Total pago</span><span class="value valor-destaque">${esc(brl(totPago))}</span></div>
    <div><span class="label">Impostos NF</span><span class="value">${esc(brl(totImp))}</span></div>
  </section>
  `.trim();
}

function gerarTabelaComp(item: ItemComparativo): string {
  if (!item.rec) {
    return `
    <table class="tab-comp">
      <thead>
        <tr><th>Comparativo</th><th>Emitido na NF</th><th>Recebido</th><th>Diferença</th></tr>
      </thead>
      <tbody>
        <tr><td>Peso</td><td>${esc(kg(item.pesoEmitido))}</td><td>—</td><td>—</td></tr>
        <tr><td>Valor</td><td>${esc(brl(item.valorFinalNf))}</td><td>—</td><td>—</td></tr>
      </tbody>
    </table>
    `.trim();
  }
  const r = item.rec;
  const valorPago = Number(r.valor_pago);
  const difValorClass =
    item.difValor !== null && Math.abs(item.difValor) >= 0.01
      ? item.difValor > 0
        ? 'positivo'
        : 'negativo'
      : '';
  const difPesoClass = item.status === 'divergente' ? 'negativo' : 'positivo';

  return `
  <table class="tab-comp">
    <thead>
      <tr><th>Comparativo</th><th>Emitido na NF</th><th>Recebido</th><th>Diferença</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Peso</td>
        <td>${esc(kg(item.pesoEmitido))}</td>
        <td>${esc(kg(item.pesoLiquido))}</td>
        <td class="${difPesoClass}">
          ${esc(item.difPeso !== null ? `${item.difPeso > 0 ? '+' : ''}${kg(item.difPeso)} (${pct(item.difPesoPct, true)})` : '—')}
        </td>
      </tr>
      <tr>
        <td>Valor</td>
        <td>${esc(brl(item.valorFinalNf))}</td>
        <td>${esc(brl(valorPago))}</td>
        <td class="${difValorClass}">
          ${esc(item.difValor !== null && Math.abs(item.difValor) >= 0.01 ? `${item.difValor > 0 ? '+' : ''}${brl(item.difValor)}` : '—')}
        </td>
      </tr>
    </tbody>
  </table>
  `.trim();
}

function gerarCardNf(item: ItemComparativo): string {
  const nf = item.nf;
  const cliente = item.cliente;
  const rec = item.rec;
  const transporte = nf.transportadora || nf.placa_veiculo || nf.motorista || nf.tipo_frete;

  return `
  <article class="nf-card">
    <header class="nf-card-head">
      <div>
        <div class="nf-num">NF ${esc(nf.numero)}</div>
        <div class="nf-meta">${esc(formatarData(nf.data))}${nf.material ? ' · ' + esc(nf.material) : ''}</div>
      </div>
      ${statusTag(item.status)}
    </header>

    <section class="cliente-info">
      <div class="label">Cliente</div>
      <div class="value cliente-nome">${esc(nf.cliente_nome)}</div>
      <div class="cliente-detalhes">
        ${cliente?.cnpj ? `<span><strong>CNPJ:</strong> ${esc(formatarCNPJ(cliente.cnpj))}</span>` : ''}
        ${cliente?.endereco ? `${cliente?.cnpj ? ' &nbsp;·&nbsp; ' : ''}<span>${esc(cliente.endereco)}</span>` : ''}
      </div>
    </section>

    <section class="grid-4 secao-dados">
      <div><span class="label">Peso emitido</span><span class="value">${esc(kg(item.pesoEmitido))}</span></div>
      <div><span class="label">Preço negociado</span><span class="value">${esc(brl4(nf.preco_negociado))}/kg</span></div>
      <div><span class="label">Preço final</span><span class="value">${esc(brl4(nf.preco_final_kg))}/kg</span></div>
      <div><span class="label">Valor final NF</span><span class="value valor-destaque">${esc(brl(item.valorFinalNf))}</span></div>
    </section>

    <section class="grid-4 secao-dados">
      <div><span class="label">Valor negociado</span><span class="value">${esc(brl(item.valorNegociadoNf))}</span></div>
      <div><span class="label">ICMS</span><span class="value">${esc(brl(nf.icms))}</span></div>
      <div><span class="label">PIS+COFINS</span><span class="value">${esc(brl(Number(nf.pis) + Number(nf.cofins)))}</span></div>
      <div><span class="label">Total impostos</span><span class="value">${esc(brl(nf.total_impostos))}</span></div>
    </section>

    ${
      rec
        ? `
    <section class="recebimento-bloco">
      <div class="bloco-titulo">Recebimento conferido em ${esc(formatarData(rec.data_recebimento))}</div>
      <div class="grid-4 secao-dados">
        <div><span class="label">Peso bruto</span><span class="value">${esc(kg(rec.peso_bruto))}</span></div>
        <div><span class="label">Impureza</span><span class="value">${esc(kg(rec.impureza_kg))} (${esc(pct(Number(rec.impureza_pct)))})</span></div>
        <div><span class="label">Peso líquido</span><span class="value">${esc(kg(rec.peso_liquido))}</span></div>
        <div><span class="label">Valor pago</span><span class="value valor-destaque">${esc(brl(rec.valor_pago))}</span></div>
      </div>
      ${
        rec.pago && rec.data_pagamento
          ? `<div class="pagamento-info">
              Pago em ${esc(formatarData(rec.data_pagamento))}${rec.valor_real_recebido !== null ? ' · valor recebido ' + esc(brl(rec.valor_real_recebido)) : ''}
            </div>`
          : !rec.pago
            ? '<div class="pagamento-info pendente">⚠ Recebimento sem pagamento imediato.</div>'
            : ''
      }
    </section>
    `
        : ''
    }

    ${gerarTabelaComp(item)}

    ${
      transporte
        ? `
    <section class="transporte-bloco">
      <div class="label">Transporte</div>
      <div class="value">
        ${nf.tipo_frete ? `<strong>${esc(nf.tipo_frete)}</strong>` : ''}
        ${nf.transportadora ? ' · ' + esc(nf.transportadora) : ''}
        ${nf.placa_veiculo ? ' · placa ' + esc(nf.placa_veiculo) : ''}
        ${nf.motorista ? ' · motorista ' + esc(nf.motorista) : ''}
      </div>
    </section>
    `
        : ''
    }

    ${
      nf.observacoes
        ? `<section class="obs-bloco"><div class="label">Observações</div><div class="value">${esc(nf.observacoes)}</div></section>`
        : ''
    }
  </article>
  `.trim();
}

function gerarHtmlComprovante(itens: ItemComparativo[], e: EmpresaRow): string {
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante · ${esc(e.nome_fantasia)}</title>
  <style>
    ${CSS_PRINT_BASE}

    .resumo {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px 16px;
      padding: 12px 16px;
      background: #FAF7F0;
      border: 1px solid #E5D9B6;
      border-radius: 8px;
      margin-bottom: 18px;
    }
    .resumo > div { display: flex; flex-direction: column; gap: 2px; }

    .nf-card {
      border: 1px solid #d0d0d0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .nf-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e5e5;
      margin-bottom: 12px;
    }
    .nf-num { font-size: 17px; font-weight: 700; }
    .nf-meta { font-size: 11px; color: #666; margin-top: 2px; }

    .status-tag {
      font-size: 9px;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1.5px solid;
      text-transform: uppercase;
      font-weight: 700;
    }

    .cliente-info { margin-bottom: 12px; }
    .cliente-nome { font-size: 13px; font-weight: 600; margin-top: 1px; }
    .cliente-detalhes { font-size: 10px; color: #666; margin-top: 3px; }

    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; }
    .grid-4 > div { display: flex; flex-direction: column; gap: 1px; }
    .secao-dados { margin-bottom: 10px; }

    .recebimento-bloco {
      background: #FAFAF7;
      border: 1px solid #E0DFD9;
      border-radius: 6px;
      padding: 10px 12px;
      margin: 12px 0;
    }
    .bloco-titulo {
      font-size: 10px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .pagamento-info {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #ddd;
      font-size: 11px;
      color: #555;
    }
    .pagamento-info.pendente { color: #9B7D2E; font-weight: 600; }

    .tab-comp {
      width: 100%;
      border-collapse: collapse;
      background: #FAF7F0;
      border: 1px solid #E5D9B6;
      border-radius: 6px;
      overflow: hidden;
      margin: 12px 0;
      font-size: 11px;
    }
    .tab-comp th, .tab-comp td {
      padding: 7px 10px;
      text-align: left;
    }
    .tab-comp th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #888;
      font-weight: 600;
      background: rgba(229, 217, 182, 0.4);
    }
    .tab-comp td {
      border-top: 1px solid #E5D9B6;
      font-weight: 500;
    }
    .tab-comp .positivo { color: #10783D; font-weight: 700; }
    .tab-comp .negativo { color: #C63030; font-weight: 700; }

    .transporte-bloco, .obs-bloco {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #e0e0e0;
      font-size: 11px;
    }
    .obs-bloco .value { font-style: italic; color: #555; }

    @media print {
      body { background: #fff; }
      .nf-card { box-shadow: none !important; }
    }
  </style>
</head>
<body>
  ${gerarTimbrado(e, 'Comprovante de Operação', dataHoje, horaAgora)}
  ${gerarResumo(itens)}
  ${itens.map(gerarCardNf).join('\n')}

  ${gerarAssinaturas(e.nome_fantasia)}

  ${gerarFooter(e.nome_fantasia, dataHoje, horaAgora)}

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export interface ResultadoImpressao {
  ok: boolean;
  motivo?: string;
}

export function imprimirComprovante(
  itens: ItemComparativo[],
  empresa: EmpresaRow,
): ResultadoImpressao {
  if (itens.length === 0) return { ok: false, motivo: 'Nenhuma NF selecionada' };

  const janela = window.open('', '_blank', 'width=1200,height=900');
  if (!janela) {
    return {
      ok: false,
      motivo: 'Permita popups no navegador para abrir o comprovante',
    };
  }

  const html = gerarHtmlComprovante(itens, empresa);
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  return { ok: true };
}
