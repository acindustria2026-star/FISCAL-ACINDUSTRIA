import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

export interface SugestaoItem<T = unknown> {
  id: string;
  label: string;
  sublabel?: string;
  payload: T;
}

interface CampoComSugestoesProps<T> {
  label?: string;
  value: string;
  onChange: (texto: string) => void;
  onSelect?: (item: SugestaoItem<T>) => void;
  onCriar?: (texto: string) => void | Promise<void>;
  sugestoes: SugestaoItem<T>[];
  permitirNovo?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helper?: string;
  leftIcon?: ReactNode;
}

export function CampoComSugestoes<T>({
  label,
  value,
  onChange,
  onSelect,
  onCriar,
  sugestoes,
  permitirNovo = false,
  placeholder,
  disabled,
  error,
  helper,
  leftIcon,
}: CampoComSugestoesProps<T>) {
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const inputId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [aberto]);

  const filtradas = useMemo(() => {
    const termo = value.trim().toLowerCase();
    if (!termo) return sugestoes.slice(0, 8);
    return sugestoes
      .filter((s) => s.label.toLowerCase().includes(termo))
      .slice(0, 8);
  }, [sugestoes, value]);

  const exibeCriar =
    permitirNovo && value.trim().length > 0 && !filtradas.some((s) => s.label.toLowerCase() === value.trim().toLowerCase());
  const totalOpcoes = filtradas.length + (exibeCriar ? 1 : 0);

  function selecionar(idx: number) {
    if (idx < filtradas.length) {
      const item = filtradas[idx];
      onChange(item.label);
      onSelect?.(item);
    } else if (exibeCriar) {
      void onCriar?.(value.trim());
    }
    setAberto(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setAberto(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestacado((d) => Math.min(d + 1, totalOpcoes - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestacado((d) => Math.max(d - 1, 0));
    } else if (e.key === 'Enter') {
      if (totalOpcoes > 0) {
        e.preventDefault();
        selecionar(destacado);
      }
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1.5 relative">
      {label && (
        <label htmlFor={inputId} className="text-sm text-text-2 font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setAberto(true);
            setDestacado(0);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`w-full h-11 bg-surface-2 border rounded-xl text-text placeholder:text-text-3 outline-none transition focus:border-accent ${
            error ? 'border-warn' : 'border-border hover:border-border-soft'
          } ${leftIcon ? 'pl-10' : 'pl-3.5'} pr-10`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setAberto((a) => !a)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text"
          aria-label="Mostrar sugestões"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {aberto && totalOpcoes > 0 && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-30 bg-surface border border-border rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto"
        >
          {filtradas.map((s, idx) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setDestacado(idx)}
                onClick={() => selecionar(idx)}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition ${
                  destacado === idx ? 'bg-surface-3 text-text' : 'text-text-2 hover:bg-surface-2'
                }`}
              >
                <p>{s.label}</p>
                {s.sublabel && <p className="text-xs text-text-3 mt-0.5">{s.sublabel}</p>}
              </button>
            </li>
          ))}
          {exibeCriar && (
            <li>
              <button
                type="button"
                onMouseEnter={() => setDestacado(filtradas.length)}
                onClick={() => selecionar(filtradas.length)}
                className={`w-full text-left px-3.5 py-2.5 text-sm transition flex items-center gap-2 border-t border-border-soft ${
                  destacado === filtradas.length
                    ? 'bg-accent-soft-bg text-accent'
                    : 'text-accent hover:bg-accent-soft-bg'
                }`}
              >
                <Plus size={14} /> Criar &quot;{value.trim()}&quot;
              </button>
            </li>
          )}
        </ul>
      )}

      {error ? (
        <p className="text-xs text-warn">{error}</p>
      ) : helper ? (
        <p className="text-xs text-text-3">{helper}</p>
      ) : null}
    </div>
  );
}
