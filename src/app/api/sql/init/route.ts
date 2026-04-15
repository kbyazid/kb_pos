import { NextResponse } from 'next/server';
import { getMainDb } from '../db';

/**
 * API Route pour initialiser les tables de la base de données
 * Accessible via: GET /api/sql/init
 */
export async function GET() {
    try {
        const connection = await getMainDb();

        // ============================================
        // CRÉATION DES TABLES
        // ============================================

        const createTables = [
            // Table categories
            `CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(7) DEFAULT '#3B82F6',
                display_order INT DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,

            // Table products
            `CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(36) PRIMARY KEY,
                category_id VARCHAR(36),
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                color VARCHAR(7) DEFAULT '#FFFFFF',
                printer VARCHAR(255) DEFAULT NULL,
                is_active TINYINT(1) DEFAULT 1,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )`,

            // Table payment_methods
            `CREATE TABLE IF NOT EXISTS payment_methods (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                shortcut VARCHAR(10),
                icon VARCHAR(50),
                color VARCHAR(7) DEFAULT '#10B981',
                is_active TINYINT(1) DEFAULT 1,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table discounts
            `CREATE TABLE IF NOT EXISTS discounts (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('percentage', 'fixed') DEFAULT 'percentage',
                value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table colors
            `CREATE TABLE IF NOT EXISTS colors (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                hex VARCHAR(7) NOT NULL,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table currencies
            `CREATE TABLE IF NOT EXISTS currencies (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                rate DECIMAL(10, 4) DEFAULT 1.0000,
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table printers
            `CREATE TABLE IF NOT EXISTS printers (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'network',
                address VARCHAR(255),
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table users
            `CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                pin VARCHAR(10) NOT NULL,
                role VARCHAR(50) DEFAULT 'cashier',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table parameters
            `CREATE TABLE IF NOT EXISTS parameters (
                id VARCHAR(36) PRIMARY KEY,
                param_key VARCHAR(255) NOT NULL UNIQUE,
                param_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`,

            // Table transactions
            `CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                payment_method VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                fiscal_year VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`,

            // Table transaction_items
            `CREATE TABLE IF NOT EXISTS transaction_items (
                id VARCHAR(36) PRIMARY KEY,
                transaction_id VARCHAR(36),
                product_id VARCHAR(36),
                product_name VARCHAR(255),
                quantity DECIMAL(10, 3) DEFAULT 1.000,
                unit_price DECIMAL(10, 2),
                total DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            )`
        ];

        // Exécuter chaque création de table
        for (const sql of createTables) {
            await connection.execute(sql);
        }

        // ============================================
        // DONNÉES DE TEST (si les tables sont vides)
        // ============================================

        // Vérifier si des catégories existent
        const [categories] = await connection.execute('SELECT COUNT(*) as count FROM categories');
        const categoryCount = (categories as any)[0].count;

        if (categoryCount === 0) {
            // Insérer des données de test
            await connection.execute(`
                INSERT IGNORE INTO categories (id, name, color, display_order) VALUES
                ('cat-001', 'Boissons', '#3B82F6', 1),
                ('cat-002', 'Snacks', '#10B981', 2),
                ('cat-003', 'Plats', '#F59E0B', 3)
            `);

            await connection.execute(`
                INSERT IGNORE INTO products (id, category_id, name, price, display_order) VALUES
                ('prod-001', 'cat-001', 'Café', 2.50, 1),
                ('prod-002', 'cat-001', 'Thé', 2.00, 2),
                ('prod-003', 'cat-001', 'Jus d\'orange', 4.00, 3),
                ('prod-004', 'cat-002', 'Biscuits', 1.50, 1),
                ('prod-005', 'cat-002', 'Chocolat', 2.00, 2),
                ('prod-006', 'cat-003', 'Sandwich', 5.00, 1),
                ('prod-007', 'cat-003', 'Salade', 6.00, 2)
            `);

            await connection.execute(`
                INSERT IGNORE INTO payment_methods (id, name, shortcut, color, display_order) VALUES
                ('pay-001', 'Espèces', 'ESP', '#10B981', 1),
                ('pay-002', 'Carte Bancaire', 'CB', '#3B82F6', 2),
                ('pay-003', 'Mobile', 'MOB', '#8B5CF6', 3)
            `);

            await connection.execute(`
                INSERT IGNORE INTO users (id, name, pin, role) VALUES
                ('user-001', 'Caissier 1', '1234', 'cashier'),
                ('user-002', 'Admin', '0000', 'admin')
            `);

            await connection.execute(`
                INSERT IGNORE INTO currencies (id, name, symbol, rate) VALUES
                ('curr-001', 'Euro', '€', 1.0000),
                ('curr-002', 'Dollar US', '$', 1.0800)
            `);
        }

        await connection.end();

        return NextResponse.json({
            success: true,
            message: '✅ Base de données initialisée avec succès!',
            tables: [
                'categories',
                'products',
                'payment_methods',
                'discounts',
                'colors',
                'currencies',
                'printers',
                'users',
                'parameters',
                'transactions',
                'transaction_items'
            ]
        });

    } catch (error) {
        console.error('❌ Erreur initialisation base de données:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}
