interface PasswordStrengthProps {
  value: string;
}

export function avaliarSenha(senha: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (senha.length >= 8) score++;
  if (senha.length >= 12) score++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) score++;
  if (/\d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) score++;

  const safeScore = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<typeof safeScore, string> = {
    0: '',
    1: 'Fraca',
    2: 'Razoável',
    3: 'Boa',
    4: 'Forte',
  };
  return { score: safeScore, label: labels[safeScore] };
}

export function PasswordStrength({ value }: PasswordStrengthProps) {
  const { score, label } = avaliarSenha(value);
  const colorByScore: Record<number, string> = {
    0: 'bg-border',
    1: 'bg-warn',
    2: 'bg-amber',
    3: 'bg-amber',
    4: 'bg-accent',
  };

  if (!value) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition ${i <= score ? colorByScore[score] : 'bg-border'}`}
          />
        ))}
      </div>
      {label && <p className="text-xs text-text-3">{label}</p>}
    </div>
  );
}
