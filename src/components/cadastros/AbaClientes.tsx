import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { AvatarCliente } from '../ui/AvatarCliente';
import { Loading } from '../ui/Loading';
import { useToast } from '../ui/Toast';
import { ModalEditarCliente } from './ModalEditarCliente';
import { useClientes, useCriarCliente } from '../../hooks/useClientes';
import { usePapel } from '../../hooks/usePapel';
import { formatarCNPJ, formatarTelefone, onlyDigits } from '../../lib/formatters';
import { clienteSchema } from '../../schemas/cliente';
import type { ClienteRow } from '../../types/database';

export function AbaClientes() {
  const lista = useClientes();
  const criar = useCriarCliente();
  const { podeEditarNFs } = usePapel();
  const toast = useToast();

  const [novo, setNovo] = useState({ nome: '', cnpj: '', telefone: '', email: '' });
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<ClienteRow | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista.data ?? [];
    return (lista.data ?? []).filter((c) => c.nome.toLowerCase().includes(termo));
  }, [busca, lista.data]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const parsed = clienteSchema.safeParse({
      nome: novo.nome,
      cnpj: novo.cnpj || null,
      telefone: novo.telefone || null,
      email: novo.email || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    try {
      await criar.mutateAsync(parsed.data);
      setNovo({ nome: '', cnpj: '', telefone: '', email: '' });
      toast.success('Cliente cadastrado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {podeEditarNFs && (
        <Card className="p-5">
          <h3 className="text-xs uppercase tracking-[0.16em] text-text-3 mb-4">Novo cliente</h3>
          <form onSubmit={adicionar} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <Input
                label="Nome *"
                value={novo.nome}
                onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
                placeholder="Razão social ou nome fantasia"
                required
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="CNPJ"
                value={formatarCNPJ(novo.cnpj)}
                onChange={(e) =>
                  setNovo((n) => ({ ...n, cnpj: onlyDigits(e.target.value).slice(0, 14) }))
                }
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Telefone"
                value={formatarTelefone(novo.telefone)}
                onChange={(e) =>
                  setNovo((n) => ({ ...n, telefone: onlyDigits(e.target.value).slice(0, 11) }))
                }
                placeholder="(11) ..."
              />
            </div>
            <div className="md:col-span-3">
              <Input
                label="Email"
                type="email"
                value={novo.email}
                onChange={(e) => setNovo((n) => ({ ...n, email: e.target.value }))}
                placeholder="contato@..."
              />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button type="submit" loading={criar.isPending}>
                <Plus size={14} /> Adicionar cliente
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border-soft flex items-center gap-3">
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            leftIcon={<Search size={14} />}
            className="w-full"
          />
          <span className="text-xs text-text-3 whitespace-nowrap font-mono-num">
            {filtrados.length} {filtrados.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        {lista.isLoading ? (
          <Loading fullScreen={false} text="Carregando clientes..." />
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            descricao={busca ? 'Tente outro termo de busca.' : 'Cadastre o primeiro cliente acima.'}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">CNPJ</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Email</th>
                <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Telefone</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setEditando(c)}
                  className="border-b border-border-soft last:border-b-0 hover:bg-surface-2 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarCliente nome={c.nome} />
                      <span className="text-sm text-text">{c.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-text-2 font-mono-num">
                    {c.cnpj ? formatarCNPJ(c.cnpj) : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-text-2">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-text-2 font-mono-num">
                    {c.telefone ? formatarTelefone(c.telefone) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ModalEditarCliente
        cliente={editando}
        onClose={() => setEditando(null)}
        podeEditar={podeEditarNFs}
      />
    </div>
  );
}
