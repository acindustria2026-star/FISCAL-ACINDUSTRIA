import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { precisaBackup, diasDesdeUltimoBackup } from '../lib/backup';

export function LembreteBackup() {
  const [mostrar, setMostrar] = useState(false);
  const [dias, setDias] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (precisaBackup()) {
      const adiado = sessionStorage.getItem('backup_adiado');
      if (adiado === 'true') return;

      setDias(diasDesdeUltimoBackup());
      setMostrar(true);
    }
  }, []);

  function adiar() {
    sessionStorage.setItem('backup_adiado', 'true');
    setMostrar(false);
  }

  function irParaBackup() {
    setMostrar(false);
    navigate('/backup');
  }

  if (!mostrar) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-surface-elev border border-accent rounded-2xl p-4 shadow-2xl max-w-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="font-medium mb-1">Lembrete de backup</p>
          <p className="text-sm text-text-secondary mb-3">
            {dias === null
              ? 'Você ainda não fez nenhum backup. Recomendamos fazer agora.'
              : `Já se passaram ${dias} dias desde o último backup.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={irParaBackup}
              className="px-3 py-1.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent/90"
            >
              Fazer agora
            </button>
            <button
              onClick={adiar}
              className="px-3 py-1.5 text-text-secondary text-sm hover:text-text"
            >
              Lembrar amanhã
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
