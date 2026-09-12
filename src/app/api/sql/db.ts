import mysql from 'mysql2/promise';

export type Connection = mysql.Connection;

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

export function getMainDb() {
    return mysql.createConnection({
        ...dbConfig,
        database: process.env.DB_NAME,
    });
}

// Mode base unique (établissement unique) : les données « POS » (transactions,
// paramètres, utilisateurs, imprimantes, devises, stats) vivent dans la même
// base que le catalogue. Architecture d'origine : database: DB_NAME + '_' + POS.
export function getPosDb() {
    return mysql.createConnection({
        ...dbConfig,
        database: process.env.DB_NAME,
    });
}
