'use client';

import { useState } from 'react';

export default function ConnexionPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'Échec de la connexion');
                setBusy(false);
                return;
            }
            window.location.href = '/admin/kitchen/config/';
        } catch {
            setError('Erreur réseau, réessayez');
            setBusy(false);
        }
    };

    const onKeyDown = (e: { key: string }) => {
        if (e.key === 'Enter') void submit();
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-linear-to-tr from-main-from-light to-main-to-light dark:from-main-from-dark dark:to-main-to-dark">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/90 p-6 shadow-md backdrop-blur dark:bg-black/45">
                <h1 className="text-2xl font-bold mb-4 text-center">Administration</h1>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void submit();
                    }}
                >
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Mot de passe"
                        autoFocus
                        className="w-full rounded-lg border border-gray-300 p-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    <button
                        type="submit"
                        disabled={busy}
                        className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700"
                    >
                        {busy ? 'Connexion…' : 'Se connecter'}
                    </button>
                </form>
                <p className="mt-3 text-xs text-gray-500">
                    Espace réservé : édition des produits, configuration et statistiques.
                </p>
            </div>
        </main>
    );
}