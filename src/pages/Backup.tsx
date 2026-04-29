import { useState, useEffect } from 'react';
import { fazerBackup, diasDesdeUltimoBackup } from '../lib/backup';

export default function Backup() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(
    null,
  );
  const [diasUltimo, setDiasUltimo] = useState<number | null>(null);

  useEffect(() => {
    setDiasUltimo(diasDesdeUltimoBackup());
  }, []);

  async function handleBackup() {
    setCarregando(true);
    setResultado(null);

    const resultado = await fazerBackup();
    setCarregando(false);

    if (resultado.success) {
      setResultado({
        tipo: 'sucesso',
        mensagem: `${resultado.message} ${resultado.totalRegistros} registros · ${resultado.tamanhoEstimado}`,
      });
      setDiasUltimo(0);
    } else {
      setResultado({
        tipo: 'erro',
        mensagem: resultado.message,
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-fraunces mb-2">Backup do sistema</h1>
        <p className="text-text-secondary">
          Baixe um arquivo seguro com todos os dados da sua operação fiscal.
        </p>
      </div>

      <div className="bg-surface-elev rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-secondary text-sm uppercase tracking-wide">Último backup</p>
            <p className="text-2xl font-medium mt-1">
              {diasUltimo === null
                ? 'Nunca'
                : diasUltimo === 0
                  ? 'Hoje'
                  : diasUltimo === 1
                    ? 'Ontem'
                    : `Há ${diasUltimo} dias`}
            </p>
          </div>
          {(diasUltimo === null || diasUltimo >= 7) && (
            <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
              ⚠️ Recomendado fazer backup
            </span>
          )}
        </div>
      </div>

      <button
        onClick={handleBackup}
        disabled={carregando}
        className="w-full bg-accent text-bg font-medium text-lg rounded-2xl py-6 hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {carregando ? 'Gerando backup...' : '💾 Baixar backup completo'}
      </button>

      {resultado && (
        <div
          className={`rounded-2xl p-4 ${
            resultado.tipo === 'sucesso'
              ? 'bg-green-500/20 text-green-300'
              : 'bg-red-500/20 text-red-300'
          }`}
        >
          {resultado.mensagem}
        </div>
      )}

      <div className="bg-surface-elev rounded-2xl p-6 border border-border space-y-3">
        <h2 className="font-medium text-lg mb-3">O que vai no backup</h2>
        <ul className="space-y-2 text-text-secondary text-sm">
          <li>📋 Empresa: dados cadastrais, CNPJ, endereço</li>
          <li>👥 Clientes: todos os clientes cadastrados</li>
          <li>📦 Materiais: tipos de sucata e alíquotas</li>
          <li>📄 Notas fiscais: todas as NFs com valores e impostos</li>
          <li>✅ Recebimentos: pesos reais e divergências</li>
          <li>📊 Pedidos: pedidos em andamento e finalizados</li>
          <li>👤 Perfis: usuários do sistema</li>
          <li>📜 Auditoria: histórico de ações</li>
        </ul>
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6">
        <h3 className="font-medium mb-2">💡 Recomendação importante</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Salve o arquivo de backup em um local seguro fora deste computador. Recomendamos Google
          Drive, OneDrive ou HD externo. Mantenha pelo menos os últimos 4 backups.
        </p>
      </div>
    </div>
  );
}
