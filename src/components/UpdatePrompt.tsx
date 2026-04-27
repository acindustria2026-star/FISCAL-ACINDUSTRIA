import { useEffect, useState } from 'react';

export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let intervalId: number | undefined;

    void navigator.serviceWorker.ready.then((reg) => {
      // Verifica updates a cada 60s
      intervalId = window.setInterval(() => {
        void reg.update();
      }, 60_000);

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      });
    });

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="fixed bottom-4 right-4 px-4 py-3 rounded-xl font-semibold shadow-lg z-[9999] cursor-pointer animate-pulse"
      style={{
        background: 'linear-gradient(135deg, #D4A017 0%, #A57D0D 100%)',
        color: '#0B0B0D',
        boxShadow: '0 4px 16px rgba(212, 160, 23, 0.3)',
      }}
    >
      🔄 Nova versão disponível — clique para atualizar
    </button>
  );
}
