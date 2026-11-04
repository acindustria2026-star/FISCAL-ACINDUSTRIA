import { usePeriodo } from '../contexts/PeriodoContext';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const ANOS = (() => {
  const atual = new Date().getFullYear();
  const anos: number[] = [];
  for (let a = 2024; a <= atual + 1; a++) anos.push(a);
  return anos;
})();

const selectCls =
  'h-8 px-3 pr-7 rounded-lg text-xs bg-surface-2 border border-border text-text-2 ' +
  'hover:border-accent focus:outline-none focus:border-accent transition appearance-none cursor-pointer ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

const chevron =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' ' +
  "viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E\")";

export function SeletorPeriodo() {
  const { mes, ano, isTodos, setPeriodo } = usePeriodo();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPeriodo({ mes: null, ano: null })}
        className={`h-8 px-3 rounded-full text-xs transition font-mono-num border ${
          isTodos
            ? 'bg-accent text-[#0B0B0D] font-medium border-accent'
            : 'text-text-2 border-border hover:text-text hover:bg-surface-3'
        }`}
      >
        Todos
      </button>

      <select
        value={mes ?? ''}
        disabled={isTodos}
        onChange={(e) => {
          const val = e.target.value;
          setPeriodo({
            mes: val === '' ? null : Number(val),
            ano: ano ?? new Date().getFullYear(),
          });
        }}
        className={selectCls}
        style={{ backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        <option value="">Mês</option>
        {NOMES_MESES.map((nome, idx) => (
          <option key={idx} value={idx}>
            {nome}
          </option>
        ))}
      </select>

      <select
        value={ano ?? ''}
        disabled={isTodos}
        onChange={(e) => {
          const val = e.target.value;
          setPeriodo({ mes, ano: val === '' ? null : Number(val) });
        }}
        className={selectCls}
        style={{ backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        <option value="">Ano</option>
        {ANOS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
