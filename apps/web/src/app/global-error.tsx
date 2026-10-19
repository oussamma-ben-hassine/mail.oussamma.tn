'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-slate-50 text-slate-800">
        <h1 className="text-3xl font-bold mb-2">Erreur globale</h1>
        <p className="mb-4">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium"
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
