// Archivo: controllers/rolesController.js
const db = require('../config/db');

// Función para obtener todos los roles
const obtenerRoles = async (req, res) => {
    try {
        // Hacemos la consulta SQL
        const [rows] = await db.query('SELECT * FROM roles');
        
        // Respondemos con los datos en formato JSON
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo roles:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { obtenerRoles };