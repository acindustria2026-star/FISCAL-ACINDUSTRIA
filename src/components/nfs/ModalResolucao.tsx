import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
  nf: {
    id: string;
    numero: string;
    cliente_nome?: string;
    valor_final?: number;
  };
  complementaresSugeridas?: string[];
}

export function ModalResolucao({
  isOpen,
  onClose,
  onResolved,
  nf,
  complementaresSugeridas = [],
}: Props) {
  const { perfil } = useAuth();
  const [temCompl, setTemCompl] = useState(complementaresSugeridas.length > 0);
  const [numeroCompl, setNumeroCompl] = useState(complementaresSugeridas[0] ?? '');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTemCompl(complementaresSugeridas.length > 0);
      setNumeroCompl(complementaresSugeridas[0] ?? '');
      setMotivo('');
      setErro('');
    }
  }, [isOpen, complementaresSugeridas]);

  if (!isOpen) return null;

  async function salvar() {
    if (!motivo.trim()) {
      setErro('Preenche o motivo da resolução');
      return;
    }
    if (temCompl && !numeroCompl.trim()) {
      setErro('Preenche o número da NF complementar');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .update({
          resolvido: true,
          resolvido_motivo: motivo.trim(),
          resolvido_por: perfil?.id ?? null,
          resolvido_em: new Date().toISOString(),
          resolvido_nf_compl: temCompl ? numeroCompl.trim() : null,
        })
        .eq('id', nf.id);

      if (error) throw error;

      onResolved();
      onClose();
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 rounded-2xl p-6 max-w-lg w-full border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif-display text-2xl mb-1">
          Marcar NF {nf.numero} como resolvido
        </h2>
        <p className="text-sm text-text-2 mb-6">
          {nf.cliente_nome} · R${' '}
          {Number(nf.valor_final ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-text-3 uppercase tracking-[0.1em] block mb-3">
              Como foi resolvido?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-bg/50 border border-border-soft rounded-lg cursor-pointer hover:bg-bg/80 transition">
                <input
                  type="radio"
                  checked={!temCompl}
                  onChange={() => setTemCompl(false)}
                  className="accent-accent"
                />
                <div>
                  <p className="font-medium text-sm text-text">Apenas observação</p>
                  <p className="text-xs text-text-3">Diferença aceita sem emitir NF complementar</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-bg/50 border border-border-soft rounded-lg cursor-pointer hover:bg-bg/80 transition">
                <input
                  type="radio"
                  checked={temCompl}
                  onChange={() => setTemCompl(true)}
                  className="accent-accent"
                />
                <div>
                  <p className="font-medium text-sm text-text">↗ Gerou NF complementar</p>
                  <p className="text-xs text-text-3">Diferença compensada por uma NF complementar</p>
                </div>
              </label>
            </div>
          </div>

          {temCompl && (
            <div>
              <label className="text-xs text-text-3 uppercase tracking-[0.1em] block mb-2">
                Número da NF complementar *
              </label>
              <input
                type="text"
                value={numeroCompl}
                onChange={(e) => setNumeroCompl(e.target.value)}
                placeholder="Ex: 7700"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition"
              />
              {complementaresSugeridas.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap items-center">
                  <span className="text-xs text-text-3">Sugestões:</span>
                  {complementaresSugeridas.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNumeroCompl(num)}
                      className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition"
                    >
                      NF {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-text-3 uppercase tracking-[0.1em] block mb-2">
              Motivo da resolução *
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Ex: Cliente confirmou impureza de 2.810 kg na pesagem"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-none focus:outline-none focus:border-accent transition"
            />
          </div>

          {erro && <p className="text-warn text-sm">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="px-4 py-2 rounded-lg border border-border text-sm text-text-2 hover:bg-surface-3 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : '✅ Marcar como resolvido'}
          </button>
        </div>
      </div>
    </div>
  );
}
