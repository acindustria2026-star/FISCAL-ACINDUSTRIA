import { useState, type FormEvent } from 'react';
import { Plus, Layers, Trash2, Pencil, Check, X as XIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import {
  useCriarMaterial,
  useEditarMaterial,
  useExcluirMaterial,
  useMateriais,
} from '../../hooks/useMateriais';
import { usePapel } from '../../hooks/usePapel';
import { materialSchema, PADROES_MATERIAL } from '../../schemas/material';
import type { MaterialRow } from '../../types/database';

const novoVazio = {
  nome: '',
  icms_padrao: String(PADROES_MATERIAL.icms_padrao),
  pis_padrao: String(PADROES_MATERIAL.pis_padrao),
  cofins_padrao: String(PADROES_MATERIAL.cofins_padrao),
};

export function AbaMateriais() {
  const lista = useMateriais();
  const criar = useCriarMaterial();
  const editar = useEditarMaterial();
  const excluir = useExcluirMaterial();
  const { podeEditarNFs } = usePapel();
  const toast = useToast();

  const [novo, setNovo] = useState(novoVazio);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<typeof novoVazio>(novoVazio);
  const [confirmarExcluir, setConfirmarExcluir] = useState<MaterialRow | null>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const parsed = materialSchema.safeParse(novo);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    try {
      await criar.mutateAsync(parsed.data);
      setNovo(novoVazio);
      toast.success('Material cadastrado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar');
    }
  }

  function comecarEdicao(m: MaterialRow) {
    setEditando(m.id);
    setEdicao({
      nome: m.nome,
      icms_padrao: String(m.icms_padrao),
      pis_padrao: String(m.pis_padrao),
      cofins_padrao: String(m.cofins_padrao),
    });
  }

  async function salvarEdicao() {
    if (!editando) return;
    const parsed = materialSchema.safeParse(edicao);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    try {
      await editar.mutateAsync({ id: editando, dados: parsed.data });
      setEditando(null);
      toast.success('Material atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    }
  }

  async function executarExclusao() {
    if (!confirmarExcluir) return;
    try {
      await excluir.mutateAsync(confirmarExcluir.id);
      toast.success('Material excluído');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
      throw err;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {podeEditarNFs && (
        <Card className="p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-text-3 mb-4">Novo material</h3>
          <form onSubmit={adicionar} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <Input
                label="Nome *"
                value={novo.nome}
                onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
                placeholder="Sucata ferrosa, alumínio..."
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="ICMS %"
                type="number"
                step="0.01"
                value={novo.icms_padrao}
                onChange={(e) => setNovo((n) => ({ ...n, icms_padrao: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="PIS %"
                type="number"
                step="0.01"
                value={novo.pis_padrao}
                onChange={(e) => setNovo((n) => ({ ...n, pis_padrao: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="COFINS %"
                type="number"
                step="0.01"
                value={novo.cofins_padrao}
                onChange={(e) => setNovo((n) => ({ ...n, cofins_padrao: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button type="submit" loading={criar.isPending} fullWidth>
                <Plus size={14} /> Adicionar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {lista.isLoading ? (
          <Loading fullScreen={false} text="Carregando materiais..." />
        ) : (lista.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Layers size={32} />}
            titulo="Nenhum material cadastrado"
            descricao="Cadastre os tipos de material que você comercializa. Eles aparecem como sugestões nas notas."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
                <th className="px-4 py-2.5 font-medium">Material</th>
                <th className="px-4 py-2.5 font-medium font-mono-num text-right">ICMS %</th>
                <th className="px-4 py-2.5 font-medium font-mono-num text-right">PIS %</th>
                <th className="px-4 py-2.5 font-medium font-mono-num text-right">COFINS %</th>
                {podeEditarNFs && <th className="px-4 py-2.5 font-medium w-24" />}
              </tr>
            </thead>
            <tbody>
              {(lista.data ?? []).map((m) =>
                editando === m.id ? (
                  <tr key={m.id} className="border-b border-border-soft last:border-b-0 bg-surface-2">
                    <td className="px-4 py-2">
                      <Input
                        value={edicao.nome}
                        onChange={(e) => setEdicao((s) => ({ ...s, nome: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={edicao.icms_padrao}
                        onChange={(e) => setEdicao((s) => ({ ...s, icms_padrao: e.target.value }))}
                        className="text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={edicao.pis_padrao}
                        onChange={(e) => setEdicao((s) => ({ ...s, pis_padrao: e.target.value }))}
                        className="text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={edicao.cofins_padrao}
                        onChange={(e) => setEdicao((s) => ({ ...s, cofins_padrao: e.target.value }))}
                        className="text-right"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={salvarEdicao}
                          disabled={editar.isPending}
                          aria-label="Salvar"
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-[#0B0B0D] hover:brightness-110 transition disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          aria-label="Cancelar"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-2 hover:text-text hover:bg-surface-3 transition"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={m.id}
                    className="border-b border-border-soft last:border-b-0 hover:bg-surface-2 transition"
                  >
                    <td className="px-4 py-3 text-sm text-text">{m.nome}</td>
                    <td className="px-4 py-3 text-sm text-text-2 font-mono-num text-right">
                      {Number(m.icms_padrao).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2 font-mono-num text-right">
                      {Number(m.pis_padrao).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-2 font-mono-num text-right">
                      {Number(m.cofins_padrao).toFixed(2)}
                    </td>
                    {podeEditarNFs && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => comecarEdicao(m)}
                            aria-label="Editar"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-3 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmarExcluir(m)}
                            aria-label="Excluir"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-2 hover:text-warn hover:bg-warn-soft-bg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmarExcluir}
        onClose={() => setConfirmarExcluir(null)}
        onConfirm={executarExclusao}
        title="Excluir material?"
        description={
          confirmarExcluir
            ? `O material "${confirmarExcluir.nome}" será removido. Notas fiscais já criadas com ele continuam intactas (o nome fica gravado nelas).`
            : ''
        }
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}
