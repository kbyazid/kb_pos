/**
 * kb_pos_astra — Vérification de la base MySQL (lecture seule)
 * Usage : node scripts/verify-db.cjs
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local introuvable');
        process.exit(1);
    }
    const env = {};
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
    return env;
}

const env = loadEnv();

(async () => {
    const mysql = require('mysql2/promise');
    const c = await mysql.createConnection({
        host: env.DB_HOST,
        port: Number(env.DB_PORT || 3306),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
    });
    console.log(`✅ Connecté à ${env.DB_NAME} sur ${env.DB_HOST}:${env.DB_PORT}\n`);

    const [tables] = await c.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0] || {})[0];
    console.log(`Tables (${tables.length}) :`);
    for (const t of tables) {
        const name = t[tableKey];
        const [cnt] = await c.query(`SELECT COUNT(*) AS n FROM \`${name}\``);
        console.log(`  - ${name} : ${cnt[0].n} ligne(s)`);
    }

    const [arts] = await c.query('SELECT nom, prix, categorie FROM article ORDER BY ordre LIMIT 10');
    console.log('\nArticles :');
    for (const a of arts) console.log(`  - ${a.nom} : ${a.prix} (catégorie ${a.categorie})`);

    const [cats] = await c.query('SELECT id, nom, ordre FROM categorie ORDER BY ordre');
    console.log('\nCatégories :');
    for (const k of cats) console.log(`  - ${k.id} : ${k.nom}`);

    const [curs] = await c.query('SELECT label, symbol FROM currency');
    console.log('\nDevises :');
    for (const cur of curs) console.log(`  - ${cur.label} (${cur.symbol})`);

    const [pm] = await c.query('SELECT label, currency FROM payment_methods');
    console.log('\nMoyens de paiement :');
    for (const p of pm) console.log(`  - ${p.label} (${p.currency})`);

    await c.end();
    console.log('\n🎉 Base vérifiée : opérationnelle.');
})().catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
});
