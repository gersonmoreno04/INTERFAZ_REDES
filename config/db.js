const mysql = require('mysql2');
require('dotenv').config();

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertir el pool para usar Promesas (async/await)
const promisePool = pool.promise();

// Probar la conexión al iniciar
promisePool.getConnection()
    .then(connection => {
        console.log('✅ Base de datos de Pumatel conectada con éxito.');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Error conectando a la base de datos:', err.message);
    });

module.exports = promisePool;