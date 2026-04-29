import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface DadosRelatorio {
  empresa: {
    nome_fantasia: string;
    razao_social?: string;
    cnpj?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
  };
  periodo: {
    label: string;
  };
  filtros: {
    material?: string;
    cliente?: string;
  };
  resumo: {
    totalNFs: number;
    pesoTotal: number;
    valorTotal: number;
    precoMedio: number;
  };
  porMaterial: Array<{
    material: string;
    nfs: number;
    peso: number;
    valor: number;
    precoReal: number;
  }>;
  porCliente: Array<{
    cliente: string;
    nfs: number;
    peso: number;
    valor: number;
    precoReal: number;
  }>;
  detalhado: Array<{
    numero: string;
    data: string;
    cliente_nome: string;
    material: string;
    peso: number;
    valor_pago: number;
    preco_real: number;
  }>;
}

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKG = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const fmt4 = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtData = (d: string) => {
  const apenas10 = String(d).substring(0, 10);
  const partes = apenas10.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return apenas10;
};

const dataHoraAgora = () =>
  new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function nomeArquivo(periodoLabel: string, ext: 'pdf' | 'xlsx'): string {
  const slug = periodoLabel.toLowerCase().replace(/[\s/]/g, '-').replace(/[^\w-]/g, '');
  return `relatorio-preco-real-${slug}.${ext}`;
}

// ==========================================
// 1. IMPRIMIR (abre janela com layout HTML)
// ==========================================
export function imprimirRelatorio(dados: DadosRelatorio): void {
  const html = gerarHTMLRelatorio(dados);

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Permita popups pra imprimir o relatório');
    return;
  }

  win.document.write(html);
  win.document.close();

  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };
}

function gerarHTMLRelatorio(dados: DadosRelatorio): string {
  const { empresa, periodo, filtros, resumo, porMaterial, porCliente, detalhado } = dados;

  const filtrosTexto = [
    filtros.material ? `Material: ${filtros.material}` : null,
    filtros.cliente ? `Cliente: ${filtros.cliente}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Preço Real — ${periodo.label}</title>
<style>
  @page { size: A4; margin: 1.5cm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', 'Helvetica', sans-serif; color: #1a1a1a; line-height: 1.5; margin: 0; }

  .timbrado {
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-placeholder {
    width: 250px;
    height: 80px;
    border: 1px dashed #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 10px;
    flex-shrink: 0;
  }
  .empresa-info { flex: 1; }
  .empresa-info h1 { font-family: 'Georgia', serif; font-size: 20px; margin: 0 0 4px; }
  .empresa-info p { font-size: 11px; color: #555; margin: 2px 0; }

  .titulo { text-align: center; margin: 32px 0 16px; }
  .titulo h2 { font-family: 'Georgia', serif; font-size: 24px; margin: 0; color: #1a1a1a; }
  .titulo .periodo { font-size: 14px; color: #666; margin-top: 6px; }
  .titulo .filtros { font-size: 11px; color: #888; margin-top: 4px; font-style: italic; }
  .titulo .gerado { font-size: 10px; color: #999; margin-top: 8px; }

  .secao { margin: 28px 0 20px; page-break-inside: avoid; }
  .secao h3 {
    font-family: 'Georgia', serif;
    font-size: 16px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 6px;
    margin: 0 0 12px;
    color: #1a1a1a;
  }

  .resumo-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 12px 0;
  }
  .card {
    border: 1px solid #ddd;
    padding: 10px;
    border-radius: 4px;
    background: #fafafa;
  }
  .card.destaque { background: #fff4d6; border-color: #d4a017; }
  .card .label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .card .valor { font-size: 14px; font-weight: 600; margin-top: 4px; }
  .card.destaque .valor { color: #b8860b; font-size: 16px; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th {
    text-align: left;
    padding: 6px 8px;
    background: #f3f3f3;
    border-bottom: 2px solid #1a1a1a;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.destaque { color: #b8860b; font-weight: 600; }

  .lista-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  .lista-item:last-child { border-bottom: none; }
  .lista-item .nome { font-weight: 600; font-size: 12px; }
  .lista-item .meta { font-size: 10px; color: #777; margin-top: 2px; }
  .lista-item .preco { font-weight: 600; color: #b8860b; font-size: 13px; }

  .rodape {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
    font-size: 10px;
    color: #888;
    text-align: center;
  }

  @media print {
    .secao { page-break-inside: avoid; }
    .titulo { page-break-after: avoid; }
    body { margin: 0; }
  }
</style>
</head>
<body>

<div class="timbrado">
  <div class="logo-placeholder">LOGO 250×80</div>
  <div class="empresa-info">
    <h1>${empresa.nome_fantasia ?? 'AC INDÚSTRIA'}</h1>
    ${empresa.razao_social ? `<p>${empresa.razao_social}</p>` : ''}
    ${empresa.cnpj ? `<p>CNPJ: ${empresa.cnpj}</p>` : ''}
    ${empresa.endereco ? `<p>${empresa.endereco}</p>` : ''}
    ${
      empresa.telefone || empresa.email
        ? `<p>${[empresa.telefone, empresa.email].filter(Boolean).join(' · ')}</p>`
        : ''
    }
  </div>
</div>

<div class="titulo">
  <h2>Relatório de Preço Real da Sucata</h2>
  <div class="periodo">Período: ${periodo.label}</div>
  ${filtrosTexto ? `<div class="filtros">${filtrosTexto}</div>` : ''}
  <div class="gerado">Gerado em ${dataHoraAgora()}</div>
</div>

<div class="secao">
  <h3>Resumo Geral</h3>
  <div class="resumo-cards">
    <div class="card">
      <div class="label">NFs processadas</div>
      <div class="valor">${resumo.totalNFs}</div>
    </div>
    <div class="card">
      <div class="label">Peso de origem</div>
      <div class="valor">${fmtKG(resumo.pesoTotal)} kg</div>
    </div>
    <div class="card">
      <div class="label">Valor pago</div>
      <div class="valor">R$ ${fmtBRL(resumo.valorTotal)}</div>
    </div>
    <div class="card destaque">
      <div class="label">⭐ Preço real médio</div>
      <div class="valor">R$ ${fmt4(resumo.precoMedio)}/kg</div>
    </div>
  </div>
</div>

<div class="secao">
  <h3>Quebra por Material</h3>
  ${porMaterial
    .map(
      (m) => `
    <div class="lista-item">
      <div>
        <div class="nome">${m.material}</div>
        <div class="meta">${m.nfs} NF · ${fmtKG(m.peso)} kg · R$ ${fmtBRL(m.valor)}</div>
      </div>
      <div class="preco">R$ ${fmt4(m.precoReal)}/kg</div>
    </div>
  `,
    )
    .join('')}
</div>

<div class="secao">
  <h3>Quebra por Fornecedor</h3>
  ${porCliente
    .map(
      (c) => `
    <div class="lista-item">
      <div>
        <div class="nome">${c.cliente}</div>
        <div class="meta">${c.nfs} NF · ${fmtKG(c.peso)} kg · R$ ${fmtBRL(c.valor)}</div>
      </div>
      <div class="preco">R$ ${fmt4(c.precoReal)}/kg</div>
    </div>
  `,
    )
    .join('')}
</div>

<div class="secao">
  <h3>Detalhado por NF (ordenado pelo preço real maior)</h3>
  <table>
    <thead>
      <tr>
        <th>NF</th>
        <th>Data</th>
        <th>Cliente</th>
        <th>Material</th>
        <th class="num">Peso origem</th>
        <th class="num">Valor pago</th>
        <th class="num">Preço real</th>
      </tr>
    </thead>
    <tbody>
      ${detalhado
        .map(
          (nf) => `
        <tr>
          <td>${nf.numero}</td>
          <td>${fmtData(nf.data)}</td>
          <td>${nf.cliente_nome}</td>
          <td>${nf.material}</td>
          <td class="num">${fmtKG(nf.peso)} kg</td>
          <td class="num">R$ ${fmtBRL(nf.valor_pago)}</td>
          <td class="num destaque">R$ ${fmt4(nf.preco_real)}/kg</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>
</div>

<div class="rodape">
  Sistema de Controle Fiscal · ${empresa.nome_fantasia ?? 'AC INDÚSTRIA'} · Documento gerado automaticamente
</div>

</body>
</html>`;
}

// ==========================================
// 2. BAIXAR PDF (via jsPDF)
// ==========================================
export function baixarPDFRelatorio(dados: DadosRelatorio): void {
  const { empresa, periodo, filtros, resumo, porMaterial, porCliente, detalhado } = dados;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 15;

  // Timbrado: placeholder de logo (250×80px ≈ 65×21mm)
  doc.setDrawColor(40);
  doc.setLineWidth(0.5);
  doc.rect(15, y, 65, 21);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('LOGO 250x80', 47.5, y + 12, { align: 'center' });

  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(empresa.nome_fantasia ?? 'AC INDÚSTRIA', 85, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  let linhaY = y + 11;
  if (empresa.razao_social) {
    doc.text(empresa.razao_social, 85, linhaY);
    linhaY += 4;
  }
  if (empresa.cnpj) {
    doc.text(`CNPJ: ${empresa.cnpj}`, 85, linhaY);
    linhaY += 4;
  }
  if (empresa.endereco) {
    doc.text(empresa.endereco, 85, linhaY);
    linhaY += 4;
  }
  const contato = [empresa.telefone, empresa.email].filter(Boolean).join(' · ');
  if (contato) {
    doc.text(contato, 85, linhaY);
  }

  y += 26;
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  y += 8;

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('Relatório de Preço Real da Sucata', 105, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Período: ${periodo.label}`, 105, y, { align: 'center' });
  y += 5;

  const filtrosTexto = [
    filtros.material ? `Material: ${filtros.material}` : null,
    filtros.cliente ? `Cliente: ${filtros.cliente}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (filtrosTexto) {
    doc.setFontSize(8);
    doc.text(filtrosTexto, 105, y, { align: 'center' });
    y += 4;
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado em ${dataHoraAgora()}`, 105, y, { align: 'center' });
  y += 8;

  // Resumo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text('Resumo Geral', 15, y);
  y += 5;
  doc.line(15, y, 195, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NFs processadas: ${resumo.totalNFs}`, 15, y);
  doc.text(`Peso de origem: ${fmtKG(resumo.pesoTotal)} kg`, 75, y);
  y += 5;
  doc.text(`Valor pago: R$ ${fmtBRL(resumo.valorTotal)}`, 15, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(184, 134, 11);
  doc.text(`PREÇO REAL MÉDIO: R$ ${fmt4(resumo.precoMedio)}/kg`, 75, y);
  y += 8;

  // Por material
  doc.setTextColor(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Por Material', 15, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Material', 'NFs', 'Peso (kg)', 'Valor (R$)', 'Preço real (R$/kg)']],
    body: porMaterial.map((m) => [
      m.material,
      String(m.nfs),
      fmtKG(m.peso),
      fmtBRL(m.valor),
      fmt4(m.precoReal),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Por cliente
  if (y > 240) {
    doc.addPage();
    y = 15;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Por Fornecedor', 15, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Fornecedor', 'NFs', 'Peso (kg)', 'Valor (R$)', 'Preço real (R$/kg)']],
    body: porCliente.map((c) => [
      c.cliente,
      String(c.nfs),
      fmtKG(c.peso),
      fmtBRL(c.valor),
      fmt4(c.precoReal),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Detalhado
  if (y > 240) {
    doc.addPage();
    y = 15;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Detalhado por NF', 15, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['NF', 'Data', 'Cliente', 'Material', 'Peso', 'Pago', 'Preço real']],
    body: detalhado.map((nf) => [
      nf.numero,
      fmtData(nf.data),
      nf.cliente_nome,
      nf.material,
      fmtKG(nf.peso),
      fmtBRL(nf.valor_pago),
      fmt4(nf.preco_real),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pages}`, 105, 290, { align: 'center' });
    doc.text(
      `Sistema de Controle Fiscal · ${empresa.nome_fantasia ?? 'AC INDÚSTRIA'}`,
      105,
      294,
      { align: 'center' },
    );
  }

  doc.save(nomeArquivo(periodo.label, 'pdf'));
}

// ==========================================
// 3. EXPORTAR EXCEL
// ==========================================
export function exportarExcelRelatorio(dados: DadosRelatorio): void {
  const wb = XLSX.utils.book_new();

  const resumoData = [
    ['Empresa', dados.empresa.nome_fantasia],
    ['CNPJ', dados.empresa.cnpj ?? ''],
    ['Período', dados.periodo.label],
    ['Material', dados.filtros.material ?? 'Todos'],
    ['Cliente', dados.filtros.cliente ?? 'Todos'],
    ['Gerado em', dataHoraAgora()],
    [],
    ['NFs processadas', dados.resumo.totalNFs],
    ['Peso de origem (kg)', dados.resumo.pesoTotal],
    ['Valor pago total (R$)', dados.resumo.valorTotal],
    ['Preço real médio (R$/kg)', dados.resumo.precoMedio],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumoData), 'Resumo');

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      dados.porMaterial.map((m) => ({
        Material: m.material,
        NFs: m.nfs,
        'Peso (kg)': m.peso,
        'Valor pago (R$)': m.valor,
        'Preço real (R$/kg)': m.precoReal,
      })),
    ),
    'Por Material',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      dados.porCliente.map((c) => ({
        Fornecedor: c.cliente,
        NFs: c.nfs,
        'Peso (kg)': c.peso,
        'Valor pago (R$)': c.valor,
        'Preço real (R$/kg)': c.precoReal,
      })),
    ),
    'Por Fornecedor',
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      dados.detalhado.map((nf) => ({
        NF: nf.numero,
        Data: fmtData(nf.data),
        Cliente: nf.cliente_nome,
        Material: nf.material,
        'Peso origem (kg)': nf.peso,
        'Valor pago (R$)': nf.valor_pago,
        'Preço real (R$/kg)': nf.preco_real,
      })),
    ),
    'Detalhado',
  );

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, nomeArquivo(dados.periodo.label, 'xlsx'));
}
