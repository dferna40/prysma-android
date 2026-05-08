import { useState } from 'react';

interface AppLogoProps {
  appIconDataUrl?: string;
  appName: string;
  className?: string;
}

const buildFallbackLabel = (appName: string) => {
  const tokens = appName
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  return (tokens.map((token) => token[0]).join('') || 'A').toUpperCase();
};

export function AppLogo({
  appIconDataUrl = '',
  appName,
  className = 'h-10 w-10',
}: AppLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const resolvedIconUrl = appIconDataUrl.trim() || '/app-icon.png';

  if (!hasImageError) {
    return (
      <img
        src={resolvedIconUrl}
        alt={`Icono de ${appName}`}
        onError={() => setHasImageError(true)}
        className={`${className} rounded-2xl border border-slate-200 bg-white object-cover shadow-sm dark:border-slate-700 dark:bg-slate-900`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${className} inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]`}
    >
      {buildFallbackLabel(appName)}
    </div>
  );
}
