import { MESES_ABREV, usePeriodo } from '../contexts/PeriodoContext';

const ANOS = (() => {
  const atual = new Date().getFullYear();
  return [atual - 1, atual, atual + 1];
})();

const MESES = MESES_ABREV.map((label, idx) => ({ label, value: idx }));

export function SeletorPeriodo() {
  const { mes, ano, setPeriodo, isTodos } = usePeriodo();

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
        onChange={(e) => {
          const val = e.target.value;
          setPeriodo({ mes: val === '' ? null : Number(val), ano: ano ?? new Date().getFullYear() });
        }}
        className="h-8 px-2 pr-6 rounded-lg text-xs bg-surface-2 border border-border text-text-2 hover:border-border-soft focus:outline-none focus:border-accent transition appearance-none cursor-pointer"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%23666\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
      >
        <option value="">Mês</option>
        {MESES.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={ano ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          setPeriodo({ mes, ano: val === '' ? null : Number(val) });
        }}
        className="h-8 px-2 pr-6 rounded-lg text-xs bg-surface-2 border border-border text-text-2 hover:border-border-soft focus:outline-none focus:border-accent transition appearance-none cursor-pointer"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%23666\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
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
