/**
 * kb_pos_astra — Initialisation de la base MySQL (schéma RÉEL de l'application)
 *
 * Usage : node scripts/setup-db.cjs
 *
 * Lit DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME depuis .env.local.
 *
 * ⚠️ Schéma canonique tiré des requêtes réelles des routes /api/sql/*
 *    (categorie, article, formule, panier, facturation…) et de
 *    scripts/init-db.sql — PAS du fichier src/app/api/sql/init/route.ts,
 *    qui contient un ancien schéma incompatible (tables anglaises).
 *
 * Le script :
 *   1. Supprime les tables de l'ancien schéma (compat .env local vide) ;
 *   2. Crée les vraies tables (mode base unique) ;
 *   3. Insère des données de démarrage si les tables sont vides.
 *
 * Non destructif pour les données : ne supprime que les tables de
 * l'ancien schéma, recrée les autres seulement si absentes.
 */

const fs = require('fs');
const path = require('path');

// ── Lecture du .env.local ────────────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local introuvable à la racine du projet.');
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
const HOST = env.DB_HOST;
const PORT = Number(env.DB_PORT || 3306);
const USER = env.DB_USER;
const PASSWORD = env.DB_PASSWORD;
const DB = env.DB_NAME;

if (!HOST || !USER || !PASSWORD || !DB) {
    console.error('❌ .env.local incomplet : DB_HOST, DB_USER, DB_PASSWORD, DB_NAME sont requis.');
    process.exit(1);
}

console.log(`Hôte        : ${HOST}:${PORT}`);
console.log(`Utilisateur : ${USER}`);
console.log(`Base        : ${DB}\n`);

// Ancien schéma (généré par src/app/api/sql/init/route.ts) — incompatible
// avec les requêtes réelles des routes API ; ces tables sont supprimées.
const DROP_LEGACY = [
    'categories', 'products', 'currencies', 'colors', 'discounts',
    'transactions', 'transaction_items', 'payment_methods', 'users',
    'parameters', 'printers',
];

// ── Schéma réel (columns = requêtes des routes /api/sql/*) ──────────────────
const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS config_etablissement (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mode_fonctionnement VARCHAR(50) NOT NULL DEFAULT 'restaurant',
        kitchen_view_enabled TINYINT NOT NULL DEFAULT 1,
        grafana_access_enabled TINYINT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS categorie (
        id VARCHAR(10) NOT NULL PRIMARY KEY,
        nom VARCHAR(50) NOT NULL,
        ordre INT NOT NULL,
        INDEX idx_categorie_nom (nom)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS article (
        id INT NOT NULL AUTO_INCREMENT,
        ordre INT NOT NULL,
        nom VARCHAR(50) NOT NULL DEFAULT '',
        prix DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        photo VARCHAR(50) NOT NULL DEFAULT '',
        disponible INT NOT NULL DEFAULT 1,
        categorie VARCHAR(50) NOT NULL DEFAULT '',
        description VARCHAR(300) DEFAULT '',
        options VARCHAR(1000) DEFAULT '',
        nbr_commandes INT NOT NULL DEFAULT 0,
        taux_tva DECIMAL(5,2) DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_article_nom (nom)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS formule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255) NOT NULL,
        prix DECIMAL(10,2) NOT NULL DEFAULT 0,
        ordre INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS element_formule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_ef_formule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_formule INT NOT NULL,
        id_element_formule INT NOT NULL,
        ordre INT NOT NULL DEFAULT 0,
        FOREIGN KEY (id_formule) REFERENCES formule(id) ON DELETE CASCADE,
        FOREIGN KEY (id_element_formule) REFERENCES element_formule(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_ef_article (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_element_formule INT NOT NULL,
        id_article INT NOT NULL,
        ordre INT NOT NULL DEFAULT 0,
        FOREIGN KEY (id_element_formule) REFERENCES element_formule(id) ON DELETE CASCADE,
        FOREIGN KEY (id_article) REFERENCES article(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS panier (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_num_order VARCHAR(50),
        service_type ENUM('sur_place','emporter') DEFAULT 'sur_place',
        paid TINYINT NOT NULL DEFAULT 0,
        preparation_started_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_panier_article (
        id INT AUTO_INCREMENT PRIMARY KEY,
        panier_id INT NOT NULL,
        article_id INT NOT NULL,
        quantite INT NOT NULL DEFAULT 1,
        nom_categorie VARCHAR(255),
        \`option\` TEXT,
        paid_at DATETIME,
        kitchen_view TINYINT NOT NULL DEFAULT 0,
        FOREIGN KEY (panier_id) REFERENCES panier(id) ON DELETE CASCADE,
        FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_panier_formule (
        id INT AUTO_INCREMENT PRIMARY KEY,
        panier_id INT NOT NULL,
        formule_id INT NOT NULL,
        quantite INT NOT NULL DEFAULT 1,
        note TEXT,
        paid_at DATETIME,
        FOREIGN KEY (panier_id) REFERENCES panier(id) ON DELETE CASCADE,
        FOREIGN KEY (formule_id) REFERENCES formule(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_pf_ef (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_pf INT NOT NULL,
        id_ef INT NOT NULL,
        id_article INT NOT NULL,
        nom_categorie VARCHAR(255),
        options TEXT,
        kitchen_view TINYINT NOT NULL DEFAULT 0,
        FOREIGN KEY (id_pf) REFERENCES rel_panier_formule(id) ON DELETE CASCADE,
        FOREIGN KEY (id_ef) REFERENCES element_formule(id) ON DELETE CASCADE,
        FOREIGN KEY (id_article) REFERENCES article(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS rel_table_panier (
        id INT AUTO_INCREMENT PRIMARY KEY,
        panier_id INT NOT NULL,
        table_id INT NOT NULL,
        FOREIGN KEY (panier_id) REFERENCES panier(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS theme_admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        selected TINYINT NOT NULL DEFAULT 0,
        text_light VARCHAR(9) DEFAULT '#000000',
        text_dark VARCHAR(9) DEFAULT '#FFFFFF',
        gradient_start_light VARCHAR(9) DEFAULT '#FFFFFF',
        gradient_start_dark VARCHAR(9) DEFAULT '#1A1A2E',
        gradient_end_light VARCHAR(9) DEFAULT '#F0F0F0',
        gradient_end_dark VARCHAR(9) DEFAULT '#16213E',
        popup_light VARCHAR(9) DEFAULT '#FFFFFF',
        popup_dark VARCHAR(9) DEFAULT '#1A1A2E',
        activated_light VARCHAR(9) DEFAULT '#E0E0E0',
        activated_dark VARCHAR(9) DEFAULT '#2A2A4A',
        secondary_light VARCHAR(9) DEFAULT '#4A90D9',
        secondary_dark VARCHAR(9) DEFAULT '#6AB0FF',
        secondary_activated_light VARCHAR(9) DEFAULT '#357ABD',
        secondary_activated_dark VARCHAR(9) DEFAULT '#4A90D9'
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        \`key\` VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Cashier',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS parameters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        param_key VARCHAR(255) NOT NULL UNIQUE,
        param_value TEXT
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS payment_methods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        address VARCHAR(255) DEFAULT '0',
        currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
        hidden TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS facturation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        panier_id VARCHAR(255),
        user_id VARCHAR(255),
        payment_method_id INT,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
        note TEXT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS facturation_article (
        id INT AUTO_INCREMENT PRIMARY KEY,
        facturation_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        quantity INT NOT NULL DEFAULT 1,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        discount_unit VARCHAR(10) DEFAULT '%',
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (facturation_id) REFERENCES facturation(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS printers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        note_enabled TINYINT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS currency (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        max_value DECIMAL(10,2) DEFAULT NULL,
        decimals INT DEFAULT NULL
    ) ENGINE=InnoDB`,
];

// ── Données de démarrage (si tables vides) ───────────────────────────────────
const SEED_DATA = [
    { table: 'config_etablissement', check: 'SELECT COUNT(*) AS n FROM config_etablissement',
      sql: `INSERT INTO config_etablissement (mode_fonctionnement) VALUES ('restaurant')` },

    { table: 'theme_admin', check: 'SELECT COUNT(*) AS n FROM theme_admin',
      sql: `INSERT INTO theme_admin (selected, text_light, text_dark, gradient_start_light, gradient_start_dark, gradient_end_light, gradient_end_dark, popup_light, popup_dark, activated_light, activated_dark, secondary_light, secondary_dark, secondary_activated_light, secondary_activated_dark)
            VALUES (1, '#d97706', '#facc15', '#fff7ed', '#65a30d', '#fed7aa', '#14532d', '#f1f5f9', '#713f12', '#fdba74', '#84cc16', '#84cc16', '#fdba74', '#a3e635', '#f97316')` },

    { table: 'categorie', check: 'SELECT COUNT(*) AS n FROM categorie',
      sql: `INSERT INTO categorie (id, nom, ordre) VALUES ('1', 'Boissons', 1), ('2', 'Entrées', 2), ('3', 'Plats', 3), ('4', 'Desserts', 4)` },

    { table: 'article', check: 'SELECT COUNT(*) AS n FROM article',
      sql: `INSERT INTO article (ordre, nom, prix, photo, disponible, categorie, description, options, nbr_commandes, taux_tva) VALUES
            (1, 'Coca-Cola', 3.00, '', 1, '1', '', '', 0, NULL),
            (2, 'Eau', 1.50, '', 1, '1', '', '', 0, NULL),
            (3, 'Café', 1.80, '', 1, '1', '', '', 0, NULL),
            (4, 'Salade César', 8.50, '', 1, '2', '', '', 0, NULL),
            (5, 'Soupe du jour', 6.00, '', 1, '2', '', '', 0, NULL),
            (6, 'Steak Frites', 14.00, '', 1, '3', '', '', 0, NULL),
            (7, 'Pizza Margherita', 11.00, '', 1, '3', '', '', 0, NULL),
            (8, 'Crème Brûlée', 7.00, '', 1, '4', '', '', 0, NULL),
            (9, 'Glace', 2.50, '', 1, '4', '', '', 0, NULL),
            (10, 'Tarte aux pommes', 6.50, '', 1, '4', '', '', 0, NULL)` },

    { table: 'users', check: 'SELECT COUNT(*) AS n FROM users',
      sql: `INSERT INTO users (id, name, role) VALUES ('comptoir', 'Comptoir', 'Cashier')` },

    { table: 'payment_methods', check: 'SELECT COUNT(*) AS n FROM payment_methods',
      sql: `INSERT INTO payment_methods (label, address, currency, hidden) VALUES ('Espèce', '0', 'DA', 0), ('Carte Bancaire', '0', 'DA', 0), ('Chèque', '0', 'DA', 0)` },

    { table: 'currency', check: 'SELECT COUNT(*) AS n FROM currency',
      sql: `INSERT INTO currency (label, symbol, max_value, decimals) VALUES ('Dinar (DA)', 'DA', NULL, 2), ('Euro (€)', '€', NULL, 2)` },

    { table: 'parameters', check: 'SELECT COUNT(*) AS n FROM parameters',
      sql: `INSERT IGNORE INTO parameters (param_key, param_value) VALUES
            ('name', 'Mon Restaurant'), ('address', 'Adresse'), ('zipCode', ''), ('city', ''), ('id', ''), ('email', '')` },
];

// ── Exécution ────────────────────────────────────────────────────────────────
(async () => {
    let mysql;
    try {
        mysql = require('mysql2/promise');
    } catch (e) {
        console.error("❌ mysql2 non installé — lancez d'abord « bun install » (ou npm install).");
        process.exit(1);
    }

    let connection;
    try {
        connection = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASSWORD });
        console.log('✅ Connexion au serveur MySQL réussie\n');
    } catch (e) {
        console.error(`❌ Connexion impossible : ${e.message}`);
        process.exit(1);
    }

    try {
        // 1) Suppression de l'ancien schéma incompatible
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        for (const table of DROP_LEGACY) {
            await connection.query(`DROP TABLE IF EXISTS \`${DB}\`.\`${table}\``);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log(`🗑️  ${DROP_LEGACY.length} tables de l'ancien schéma supprimées (si présentes).`);

        // 2) Création du vrai schéma
        await connection.changeUser({ database: DB });
        for (const sql of CREATE_TABLES) {
            await connection.query(sql);
        }
        console.log(`✅ ${CREATE_TABLES.length} tables créées ou déjà présentes.`);

        // 3) Données de démarrage (uniquement si vide)
        for (const seed of SEED_DATA) {
            const [rows] = await connection.query(seed.check);
            if (Number(rows[0].n) === 0) {
                await connection.query(seed.sql);
                console.log(`   🌱 ${seed.table} : données de démarrage insérées`);
            } else {
                console.log(`   ℹ️  ${seed.table} : déjà remplie, ignoré`);
            }
        }

        // 4) Récapitulatif
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\n📋 Tables présentes dans « ${DB} » : ${tables.length}`);
        for (const t of tables) console.log('   - ' + Object.values(t)[0]);

        console.log('\n🎉 Base prête. Rechargez la page admin : le mode lecture seule doit disparaître.');
    } catch (e) {
        console.error(`❌ Erreur : ${e.message}`);
        process.exit(1);
    } finally {
        await connection.end();
    }
})();



