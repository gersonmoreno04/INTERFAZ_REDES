// Archivo: controllers/bitacoraController.js
const db = require('../config/db');

// Función para mostrar la bitácora en admin.html
const obtenerBitacora = async (req, res) => {
    try {
        // Traemos los últimos 5 movimientos ordenados por el más reciente
        const [rows] = await db.query('SELECT * FROM bitacora ORDER BY fecha DESC LIMIT 5');
        res.json(rows);
    } catch (error) {
        console.error('Error leyendo bitácora:', error);
        res.status(500).json({ mensaje: 'Error al consultar la bitácora' });
    }
};

// Función interna para escribir en la bitácora (NO es una ruta web)
const registrarAccion = async (modulo, accion) => {
    try {
        await db.query('INSERT INTO bitacora (modulo, accion) VALUES (?, ?)', [modulo, accion]);
    } catch (error) {
        console.error('Error guardando en bitácora:', error);
    }
};

module.exports = { obtenerBitacora, registrarAccion };