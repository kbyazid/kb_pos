import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// ⚠️ Route de DIAGNOSTIC temporaire — à supprimer une fois l'erreur identifiée.
// Ne renvoie JAMAIS de valeur d'environnement (pas de host/user/password).
export async function GET() {
    let connection: mysql.Connection | undefined;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 10000,
        });

        const [versionRows] = await connection.query('SELECT VERSION() AS v');
        const serverVersion = String((versionRows as { v: string }[])[0]?.v ?? 'inconnue');

        const [tables] = await connection.query('SHOW TABLES');
        const tableCount = (tables as unknown[]).length;

        const [catRows] = await connection.query('SELECT COUNT(*) AS n FROM categorie');
        const categorieRows = Number((catRows as { n: number }[])[0]?.n ?? 0);

        const [artRows] = await connection.query('SELECT COUNT(*) AS n FROM article');
        const articleRows = Number((artRows as { n: number }[])[0]?.n ?? 0);

        return NextResponse.json(
            { ok: true, serverVersion, tableCount, categorieRows, articleRows },
            { status: 200 }
        );
    } catch (error) {
        const e = error as {
            message?: string;
            code?: string;
            errno?: number;
            sqlState?: string;
        };
        return NextResponse.json(
            {
                ok: false,
                code: e.code ?? null,
                errno: e.errno ?? null,
                sqlState: e.sqlState ?? null,
                message: e.message ?? String(error),
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch {
                // ignore
            }
        }
    }
}
