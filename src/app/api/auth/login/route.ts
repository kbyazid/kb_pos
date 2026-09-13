import { NextResponse } from 'next/server';
import { clearSessionCookie, makeSessionCookie } from '@/app/utils/adminAuth';

export async function POST(request: Request) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        return NextResponse.json({ error: "ADMIN_PASSWORD n'est pas configuré dans l'environnement" }, { status: 500 });
    }

    let submitted: unknown;
    try {
        submitted = (await request.json()).password;
    } catch {
        submitted = null;
    }

    if (typeof submitted !== 'string' || submitted !== password) {
        return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
        ...makeSessionCookie(),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
    });
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set({
        ...clearSessionCookie(),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
    });
    return response;
}