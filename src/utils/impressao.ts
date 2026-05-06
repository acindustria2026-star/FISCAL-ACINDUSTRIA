import QRCode from 'qrcode';
import type { EmpresaRow } from '../types/database';
import type { ItemComparativo } from '../hooks/useComparativo';
import {
  brl,
  brl4,
  esc,
  formatarCNPJ,
  formatarData,
  kg,
  pct,
} from './printHelpers';

const LOGO_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/logo.jpg` : '/logo.jpg';

function statusInfo(status: 'ok' | 'divergente' | 'aguardando') {
  if (status === 'ok') return { label: '✓ CONFERIDO', cor: '#10783D', bg: '#E8F5ED' };
  if (status === 'divergente')
    return { label: '⚠ DIVERGENTE', cor: '#C63030', bg: '#FCEAEA' };
  return { label: '⏰ AGUARDANDO', cor: '#9B7D2E', bg: '#FAF3DC' };
}

function montarTextoQR(item: ItemComparativo): string {
  const nf = item.nf;
  const rec = item.rec;
  const linhas = [
    `COMPROVANTE TRANS AMBIENTAL`,
    `NF: ${nf.numero}`,
    `Data: ${formatarData(nf.data)}`,
    `Cliente: ${nf.cliente_nome}`,
    nf.material ? `Material: ${nf.material}` : '',
    `Peso NF: ${kg(item.pesoEmitido)}`,
    `Valor NF: ${brl(item.valorFinalNf)}`,
    rec ? `Recebido: ${kg(rec.peso_liquido)}` : '',
    rec ? `Pago: ${brl(rec.valor_pago)}` : '',
    `Hash: ${nf.id?.substring(0, 8) ?? ''}`,
  ];
  return linhas.filter(Boolean).join('\n');
}

function gerarTimbradoLimpo(e: EmpresaRow): string {
  const enderecoLinha = [
    e.endereco,
    [e.cidade, e.uf].filter(Boolean).join('/'),
    e.cep ? `CEP ${e.cep}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const contatoLinha = [e.telefone, e.email].filter(Boolean).join(' · ');
  const dataAgora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });

  return `
  <header class="timbrado">
    <div class="timbrado-logo">
      <img src="${LOGO_URL}" alt="Logo" />
    </div>
    <div class="timbrado-info">
      <h1>${esc(e.nome_fantasia)}</h1>
      ${e.razao_social ? `<p class="razao">${esc(e.razao_social)}</p>` : ''}
      <p class="dados">
        ${e.cnpj ? `CNPJ: ${esc(formatarCNPJ(e.cnpj))}` : ''}
        ${e.inscricao_estadual ? ` &nbsp;·&nbsp; IE: ${esc(e.inscricao_estadual)}` : ''}
      </p>
      ${enderecoLinha ? `<p class="dados">${esc(enderecoLinha)}</p>` : ''}
      ${contatoLinha ? `<p class="dados">${esc(contatoLinha)}</p>` : ''}
    </div>
    <div class="timbrado-meta">
      <p class="meta-titulo">Comprovante de Operação</p>
      <p class="meta-data">${esc(dataAgora)}</p>
    </div>
  </header>
  `.trim();
}

function gerarComprovanteNF(item: ItemComparativo, qrDataUrl: string): string {
  const nf = item.nf;
  const cliente = item.cliente;
  const rec = item.rec;
  const status = statusInfo(item.status);

  const difPesoTxt =
    item.difPeso !== null && item.difPesoPct !== null
      ? `${item.difPeso > 0 ? '+' : ''}${kg(item.difPeso)} (${item.difPeso > 0 ? '+' : ''}${(
          item.difPesoPct * 100
        ).toFixed(2)}%)`
      : '—';
  const difPesoCor =
    item.difPeso === null
      ? '#888'
      : item.difPeso >= 0
        ? '#10783D'
        : '#C63030';

  const difValorTxt =
    item.difValor !== null
      ? `${item.difValor >= 0 ? '+' : ''}${brl(item.difValor)}`
      : '—';
  const difValorCor =
    item.difValor === null ? '#888' : item.difValor >= 0 ? '#10783D' : '#C63030';

  const transporte = nf.transportadora || nf.placa_veiculo || nf.motorista || nf.tipo_frete;

  return `
  <article class="comprovante-nf">
    <!-- Cabeçalho NF + status -->
    <section class="nf-header">
      <div>
        <h2 class="nf-numero">NF ${esc(nf.numero)}</h2>
        <p class="nf-meta">${esc(formatarData(nf.data))}${nf.material ? ' · ' + esc(nf.material) : ''}</p>
        <p class="cliente-nome">${esc(nf.cliente_nome)}</p>
        ${cliente?.cnpj ? `<p class="cliente-cnpj">CNPJ: ${esc(formatarCNPJ(cliente.cnpj))}</p>` : ''}
        ${
          transporte
            ? `<p class="transporte">Transporte: ${
                [nf.tipo_frete, nf.transportadora, nf.placa_veiculo ? `placa ${nf.placa_veiculo}` : '', nf.motorista ? `motorista ${nf.motorista}` : '']
                  .filter(Boolean)
                  .map((s) => esc(String(s)))
                  .join(' · ')
              }</p>`
            : ''
        }
      </div>
      <span class="status-tag" style="color:${status.cor};background:${status.bg};border-color:${status.cor}">
        ${status.label}
      </span>
    </section>

    <!-- 2 blocos lado a lado: Emitido + Recebido -->
    <section class="bloco-2col">
      <div class="bloco">
        <h3>📋 Emitido na NF</h3>
        <table>
          <tbody>
            <tr><td>Peso</td><td class="num">${esc(kg(item.pesoEmitido))}</td></tr>
            <tr><td>Preço/kg final</td><td class="num">${esc(brl4(nf.preco_final_kg))}</td></tr>
            <tr><td>Valor NF</td><td class="num destaque-amber">${esc(brl(item.valorFinalNf))}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="bloco ${rec ? '' : 'bloco-aguardando'}">
        <h3>📦 ${rec ? `Recebido em ${esc(formatarData(rec.data_recebimento))}` : 'Aguardando recebimento'}</h3>
        ${
          rec
            ? `<table>
                <tbody>
                  <tr><td>Peso bruto</td><td class="num">${esc(kg(rec.peso_bruto))}</td></tr>
                  <tr>
                    <td>Impureza</td>
                    <td class="num warn">− ${esc(kg(rec.impureza_kg))}${rec.impureza_pct ? ` (${esc(pct(Number(rec.impureza_pct)))})` : ''}</td>
                  </tr>
                  <tr><td>Peso líquido</td><td class="num bold">${esc(kg(rec.peso_liquido))}</td></tr>
                  <tr><td>Valor pago</td><td class="num destaque-green">${esc(brl(rec.valor_pago))}</td></tr>
                  ${
                    rec.pago && rec.data_pagamento
                      ? `<tr><td colspan="2" class="pago-info">✓ Pago em ${esc(formatarData(rec.data_pagamento))}</td></tr>`
                      : ''
                  }
                </tbody>
              </table>`
            : '<p class="aguardando-msg">Esta NF ainda não tem recebimento conferido.</p>'
        }
      </div>
    </section>

    <!-- Comparativo em destaque -->
    ${
      rec
        ? `
    <section class="comparativo-destaque">
      <h3>📊 Comparativo</h3>
      <div class="cmp-linha">
        <span class="cmp-label">PESO</span>
        <span class="cmp-valores">${esc(kg(item.pesoEmitido))} → ${esc(kg(rec.peso_liquido))}</span>
        <span class="cmp-dif" style="color:${difPesoCor}">${esc(difPesoTxt)}</span>
      </div>
      <div class="cmp-linha cmp-linha-borda">
        <span class="cmp-label">VALOR</span>
        <span class="cmp-valores">${esc(brl(item.valorFinalNf))} → ${esc(brl(rec.valor_pago))}</span>
        <span class="cmp-dif" style="color:${difValorCor}">${esc(difValorTxt)}</span>
      </div>
    </section>
    `
        : ''
    }

    <!-- Impostos + QR Code -->
    <section class="impostos-qr">
      <div class="impostos">
        <h3>💰 Impostos da NF</h3>
        <div class="impostos-grid">
          <div class="imposto-card">
            <p class="imposto-label">ICMS</p>
            <p class="imposto-valor">${esc(brl(nf.icms))}</p>
          </div>
          <div class="imposto-card">
            <p class="imposto-label">PIS + COFINS</p>
            <p class="imposto-valor">${esc(brl(Number(nf.pis) + Number(nf.cofins)))}</p>
          </div>
        </div>
      </div>
      <div class="qr-block">
        <h3>Autenticidade</h3>
        <img src="${qrDataUrl}" alt="QR Code" class="qr-img" />
        <p class="qr-legenda">Escaneie pra conferir</p>
      </div>
    </section>

    <!-- Assinaturas -->
    <section class="assinaturas-comp">
      <div>
        <div class="linha-assinatura"></div>
        <p class="ass-nome">${esc(item.nf.cliente_nome ? '' : '')}${esc('Trans Ambiental')}</p>
        <p class="ass-papel">Responsável pela emissão</p>
      </div>
      <div>
        <div class="linha-assinatura"></div>
        <p class="ass-nome">Cliente</p>
        <p class="ass-papel">Confere e recebe</p>
      </div>
    </section>

    ${nf.observacoes ? `<section class="observacoes-comp"><strong>Observações:</strong> ${esc(nf.observacoes)}</section>` : ''}
  </article>
  `.trim();
}

function gerarHtmlComprovante(
  itens: ItemComparativo[],
  e: EmpresaRow,
  qrDataUrls: string[],
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante · ${esc(e.nome_fantasia)}</title>
  <style>
    @page { size: A4 portrait; margin: 1.5cm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
      background: #fff;
    }

    /* Timbrado */
    .timbrado {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2px solid #1a1a1a;
      margin-bottom: 24px;
    }
    .timbrado-logo {
      width: 80px;
      height: 80px;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .timbrado-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .timbrado-info { flex: 1; }
    .timbrado-info h1 {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 4px;
      letter-spacing: -0.01em;
    }
    .timbrado-info .razao {
      font-size: 11px;
      color: #555;
      font-style: italic;
      margin: 2px 0;
    }
    .timbrado-info .dados {
      font-size: 10px;
      color: #555;
      margin: 2px 0;
      line-height: 1.4;
    }
    .timbrado-meta { text-align: right; flex-shrink: 0; }
    .meta-titulo {
      font-size: 10px;
      letter-spacing: 0.15em;
      color: #b8860b;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0;
    }
    .meta-data {
      font-size: 10px;
      color: #666;
      margin: 4px 0 0;
    }

    /* Comprovante NF — wrapper */
    .comprovante-nf {
      page-break-inside: avoid;
      page-break-after: always;
    }
    .comprovante-nf:last-child { page-break-after: auto; }

    /* Cabeçalho NF */
    .nf-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 18px;
    }
    .nf-numero {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 26px;
      font-weight: 700;
      margin: 0;
    }
    .nf-meta {
      font-size: 11px;
      color: #555;
      margin: 4px 0 0;
    }
    .cliente-nome {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 8px 0 0;
    }
    .cliente-cnpj {
      font-size: 10px;
      color: #666;
      margin: 2px 0 0;
    }
    .transporte {
      font-size: 10px;
      color: #666;
      margin: 4px 0 0;
    }
    .status-tag {
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 5px 12px;
      border-radius: 999px;
      border: 1.5px solid;
      text-transform: uppercase;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* 2 blocos lado a lado */
    .bloco-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .bloco {
      border: 1px solid #d4d4d4;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .bloco-aguardando {
      border-color: #f0d99c;
      background: #fefaee;
    }
    .bloco h3 {
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      margin: 0 0 10px;
    }
    .bloco table { width: 100%; font-size: 11px; }
    .bloco td { padding: 4px 0; }
    .bloco td:first-child { color: #666; }
    .bloco td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
    .bloco td.num.bold { font-weight: 700; }
    .bloco td.num.warn { color: #d97706; }
    .bloco td.destaque-amber { color: #b8860b; font-weight: 700; }
    .bloco td.destaque-green { color: #10783D; font-weight: 700; }
    .bloco tr:not(:last-child) td { border-bottom: 1px solid #f0f0f0; }
    .bloco .pago-info {
      font-size: 10px;
      color: #10783D;
      padding-top: 6px !important;
      font-weight: 600;
    }
    .aguardando-msg {
      font-size: 11px;
      color: #9b7d2e;
      font-style: italic;
      margin: 4px 0;
    }

    /* Comparativo destaque */
    .comparativo-destaque {
      background: #f8f8f6;
      border: 2px solid #d4d4d4;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .comparativo-destaque h3 {
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #555;
      font-weight: 700;
      text-align: center;
      margin: 0 0 12px;
    }
    .cmp-linha {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      padding: 4px 0;
    }
    .cmp-linha-borda { border-top: 1px solid #e5e5e5; padding-top: 10px; margin-top: 4px; }
    .cmp-label { color: #666; font-weight: 600; }
    .cmp-valores { text-align: center; font-variant-numeric: tabular-nums; color: #444; }
    .cmp-dif {
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    /* Impostos + QR */
    .impostos-qr {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .impostos h3, .qr-block h3 {
      font-size: 9px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #666;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .impostos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .imposto-card {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .imposto-label {
      font-size: 9px;
      color: #888;
      margin: 0 0 2px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .imposto-valor {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
    .qr-block { text-align: center; }
    .qr-img {
      width: 110px;
      height: 110px;
      margin: 0 auto;
      display: block;
    }
    .qr-legenda {
      font-size: 9px;
      color: #888;
      margin: 4px 0 0;
    }

    /* Assinaturas */
    .assinaturas-comp {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 40px;
      padding-top: 6px;
    }
    .assinaturas-comp > div { text-align: center; }
    .linha-assinatura {
      border-top: 1.5px solid #333;
      padding-top: 6px;
      margin-bottom: 6px;
      margin-top: 32px;
    }
    .ass-nome {
      font-size: 12px;
      font-weight: 600;
      margin: 0;
    }
    .ass-papel {
      font-size: 10px;
      color: #666;
      margin: 2px 0 0;
    }

    .observacoes-comp {
      margin-top: 16px;
      padding: 8px 10px;
      background: #fafaf7;
      border-left: 3px solid #d4a017;
      font-size: 10px;
      font-style: italic;
      color: #555;
    }

    @media print {
      body { background: #fff; }
    }
  </style>
</head>
<body>
  ${gerarTimbradoLimpo(e)}
  ${itens.map((item, idx) => gerarComprovanteNF(item, qrDataUrls[idx] ?? '')).join('\n')}

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 350);
    });
  </script>
</body>
</html>`;
}

export interface ResultadoImpressao {
  ok: boolean;
  motivo?: string;
}

export async function imprimirComprovante(
  itens: ItemComparativo[],
  empresa: EmpresaRow,
): Promise<ResultadoImpressao> {
  if (itens.length === 0) return { ok: false, motivo: 'Nenhuma NF selecionada' };

  // Gera todos os QR codes em paralelo (cada NF tem seu próprio texto offline)
  let qrDataUrls: string[];
  try {
    qrDataUrls = await Promise.all(
      itens.map((item) => QRCode.toDataURL(montarTextoQR(item), { width: 220, margin: 1 })),
    );
  } catch (err) {
    console.warn('[impressao] erro ao gerar QR codes:', err);
    qrDataUrls = itens.map(() => '');
  }

  const janela = window.open('', '_blank', 'width=1200,height=900');
  if (!janela) {
    return {
      ok: false,
      motivo: 'Permita popups no navegador para abrir o comprovante',
    };
  }

  const html = gerarHtmlComprovante(itens, empresa, qrDataUrls);
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  return { ok: true };
}
