export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Page non trouvée dans la messagerie oussamma.tn</p>
      <a
        href="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        Retour à la boîte de réception
      </a>
    </div>
  );
}
