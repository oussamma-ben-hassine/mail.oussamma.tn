'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <h1 className="text-3xl font-bold mb-2">Une erreur est survenue</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{error.message || 'Erreur inattendue dans la messagerie'}</p>
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}
