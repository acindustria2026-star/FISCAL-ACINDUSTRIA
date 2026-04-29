import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from './supabase';

interface BackupData {
  empresa: any[];
  clientes: any[];
  materiais: any[];
  notas_fiscais: any[];
  recebimentos: any[];
  pedidos: any[];
  auditoria: any[];
  perfis: any[];
}

interface BackupResult {
  success: boolean;
  message: string;
  totalRegistros: number;
  tamanhoEstimado: string;
}

async function buscarTabela(nome: string): Promise<any[]> {
  console.log(`📊 [Backup] Buscando ${nome}...`);
  const { data, error } = await (supabase as any).from(nome).select('*');
  if (error) {
    console.error(`❌ [Backup] Erro em ${nome}:`, error);
    return [];
  }
  console.log(`✅ [Backup] ${nome}: ${data?.length ?? 0} registros`);
  return data ?? [];
}

export async function coletarDados(): Promise<BackupData> {
  const [empresa, clientes, materiais, notas_fiscais, recebimentos, pedidos, auditoria, perfis] =
    await Promise.all([
      buscarTabela('empresas'),
      buscarTabela('clientes'),
      buscarTabela('materiais'),
      buscarTabela('notas_fiscais'),
      buscarTabela('recebimentos'),
      buscarTabela('pedidos'),
      buscarTabela('auditoria'),
      buscarTabela('perfis'),
    ]);

  return { empresa, clientes, materiais, notas_fiscais, recebimentos, pedidos, auditoria, perfis };
}

function criarExcel(dados: BackupData): Blob {
  const wb = XLSX.utils.book_new();

  const abas: Array<[string, any[]]> = [
    ['Empresa', dados.empresa],
    ['Clientes', dados.clientes],
    ['Materiais', dados.materiais],
    ['Notas Fiscais', dados.notas_fiscais],
    ['Recebimentos', dados.recebimentos],
    ['Pedidos', dados.pedidos],
    ['Perfis', dados.perfis],
    ['Auditoria', dados.auditoria],
  ];

  for (const [nome, registros] of abas) {
    const ws = XLSX.utils.json_to_sheet(registros.length > 0 ? registros : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function criarReadme(dados: BackupData, dataBackup: string): string {
  const total =
    dados.empresa.length +
    dados.clientes.length +
    dados.materiais.length +
    dados.notas_fiscais.length +
    dados.recebimentos.length +
    dados.pedidos.length +
    dados.auditoria.length +
    dados.perfis.length;

  const valorTotal = dados.notas_fiscais.reduce(
    (acc: number, nf: any) => acc + (parseFloat(nf.valor_final) || 0),
    0,
  );

  return `═══════════════════════════════════════════════════
   BACKUP DO SISTEMA AC INDÚSTRIA FISCAL
═══════════════════════════════════════════════════

📅 Data do backup: ${dataBackup}
📦 Total de registros: ${total}

📊 RESUMO
─────────────────────────────────────────
  Empresa:        ${dados.empresa.length} registro(s)
  Clientes:       ${dados.clientes.length} registro(s)
  Materiais:      ${dados.materiais.length} registro(s)
  Notas Fiscais:  ${dados.notas_fiscais.length} registro(s)
  Recebimentos:   ${dados.recebimentos.length} registro(s)
  Pedidos:        ${dados.pedidos.length} registro(s)
  Auditoria:      ${dados.auditoria.length} registro(s)
  Perfis:         ${dados.perfis.length} registro(s)

💰 Valor total NFs: R$ ${valorTotal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
  })}

📁 ARQUIVOS NESTE BACKUP
─────────────────────────────────────────
  • backup-completo.xlsx    (planilha Excel)
  • backup-completo.json    (dados estruturados)
  • README.txt              (este arquivo)

🔧 COMO USAR
─────────────────────────────────────────
  • Abrir Excel: clique em backup-completo.xlsx
  • Ver dados: Excel ou Google Sheets aceitam o formato
  • Restaurar: contate o administrador (precisa SQL)

⚠️  GUARDE ESSE BACKUP EM LOCAL SEGURO
   Recomendamos: Google Drive, OneDrive, HD externo
   Mantenha pelo menos os últimos 4 backups.

═══════════════════════════════════════════════════
   Sistema desenvolvido para AC INDÚSTRIA
═══════════════════════════════════════════════════
`;
}

function nomeArquivo(): { dataIso: string; dataBR: string; arquivo: string } {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const min = String(agora.getMinutes()).padStart(2, '0');

  return {
    dataIso: `${ano}-${mes}-${dia}`,
    dataBR: `${dia}/${mes}/${ano} ${hora}:${min}`,
    arquivo: `backup-acindustria-${ano}-${mes}-${dia}-${hora}${min}.zip`,
  };
}

export async function fazerBackup(): Promise<BackupResult> {
  try {
    console.log('🚀 [Backup] Iniciando backup...');

    const dados = await coletarDados();
    const { dataIso, dataBR, arquivo } = nomeArquivo();

    const total =
      dados.empresa.length +
      dados.clientes.length +
      dados.materiais.length +
      dados.notas_fiscais.length +
      dados.recebimentos.length +
      dados.pedidos.length +
      dados.auditoria.length +
      dados.perfis.length;

    if (total === 0) {
      return {
        success: false,
        message: 'Nenhum dado encontrado pra fazer backup',
        totalRegistros: 0,
        tamanhoEstimado: '0 KB',
      };
    }

    const zip = new JSZip();
    zip.file('backup-completo.xlsx', criarExcel(dados));
    zip.file('backup-completo.json', JSON.stringify({ dataBackup: dataIso, dados }, null, 2));
    zip.file('README.txt', criarReadme(dados, dataBR));

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    saveAs(blob, arquivo);

    localStorage.setItem('ultimo_backup', new Date().toISOString());

    const tamanhoMB = (blob.size / 1024 / 1024).toFixed(2);

    console.log(`✅ [Backup] ${total} registros, ${tamanhoMB} MB`);
    return {
      success: true,
      message: `Backup baixado com sucesso!`,
      totalRegistros: total,
      tamanhoEstimado: `${tamanhoMB} MB`,
    };
  } catch (err) {
    console.error('❌ [Backup] Erro:', err);
    return {
      success: false,
      message: 'Erro ao gerar backup: ' + (err as Error).message,
      totalRegistros: 0,
      tamanhoEstimado: '0 KB',
    };
  }
}

export function diasDesdeUltimoBackup(): number | null {
  const ultimo = localStorage.getItem('ultimo_backup');
  if (!ultimo) return null;

  const agora = new Date();
  const dataUltimo = new Date(ultimo);
  const diff = agora.getTime() - dataUltimo.getTime();
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dias;
}

export function precisaBackup(): boolean {
  const dias = diasDesdeUltimoBackup();
  if (dias === null) return true;
  return dias >= 7;
}
