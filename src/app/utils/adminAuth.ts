import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Protection simple des pages admin et des routes d'écriture (update*).
 *
 * Activation : définir la variable d'environnement ADMIN_PASSWORD.
 *  - Si ADMIN_PASSWORD est ABSENT, l'application reste en accès libre
 *    (comportement d'origine) pour ne rien casser.
 *  - S'il est présent, les pages /admin/* et /stats exigent un cookie
 *    de session signé (émis par /api/auth/login), et les routes
 *    updateArticles / updateCategories / updateParameters renvoient 401
 *    sans ce cookie.
 */
const SESSION_NAME = 'admin_session';
const SESSION_DURATION_MS = 12 * 3600 * 1000; // 12 heures

function sign(ts: string, password: string): string {
    return createHmac('sha256', password)
        .update(ts)
        .digest('hex');
}

export async function isAdminAuthed(): Promise<boolean> {
    const password = process.env.ADMIN_PASSWORD;
    // Pas de mot de passe configuré → accès libre (mode d'origine du dépôt)
    if (!password) return true;

    const token = (await cookies()).get(SESSION_NAME)?.value;
    if (!token) return false;

    const dot = token.indexOf('.');
    if (dot <= 0) return false;
    const ts = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    if (sig !== sign(ts, password)) return false;

    const expiry = Number(ts) + SESSION_DURATION_MS;
    return Number.isFinite(expiry) && Date.now() < expiry;
}

export function makeSessionCookie(): { name: string; value: string; maxAge: number } {
    const ts = String(Date.now());
    return {
        name: SESSION_NAME,
        value: `${ts}.${sign(ts, process.env.ADMIN_PASSWORD || '')}`,
        maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    };
}

export function clearSessionCookie(): { name: string; value: string; maxAge: number } {
    return { name: SESSION_NAME, value: '', maxAge: 0 };
}