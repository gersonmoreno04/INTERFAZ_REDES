// Archivo: controllers/inventarioController.js
const db = require('../config/db');
const { registrarAccion } = require('./bitacoraController'); // Conectamos la bitácora

// 1. OBTENER TODO (Read)
const obtenerInventario = async (req, res) => {
    try {
        const query = `
            SELECT i.id_inventario, i.equipo, i.serie, i.estado, i.id_cliente,
                   c.nombre_completo AS cliente, c.direccion
            FROM inventario i
            LEFT JOIN clientes c ON i.id_cliente = c.id_cliente
            ORDER BY i.id_inventario DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener inventario:", error);
        res.status(500).json({ mensaje: 'Error al obtener inventario' });
    }
};

// 2. CREAR NUEVO (Create)
const crearEquipo = async (req, res) => {
    const { equipo, serie, estado } = req.body;
    try {
        await db.query('INSERT INTO inventario (equipo, serie, estado) VALUES (?, ?, ?)', [equipo, serie, estado || 'Optimo']);
        await registrarAccion('ALMACÉN', `Se registró un nuevo equipo: ${equipo} (Serie: ${serie})`);
        res.json({ mensaje: 'Equipo registrado con éxito' });
    } catch (error) {
        console.error("Error al registrar equipo:", error);
        res.status(500).json({ mensaje: 'Error al registrar equipo' });
    }
};

// 3. ACTUALIZAR O DAR DE BAJA (Update)
const actualizarEquipo = async (req, res) => {
    const { id } = req.params;
    const { equipo, serie, id_cliente, estado } = req.body;
    
    // Si el id_cliente viene vacío, lo convertimos a NULL para la base de datos
    const clienteAsignado = (id_cliente === '' || !id_cliente) ? null : id_cliente;

    try {
        await db.query(
            'UPDATE inventario SET equipo = ?, serie = ?, id_cliente = ?, estado = ? WHERE id_inventario = ?', 
            [equipo, serie, clienteAsignado, estado, id]
        );
        await registrarAccion('ALMACÉN', `Se actualizó el equipo #${id} (Serie: ${serie}) a estado: ${estado}`);
        res.json({ mensaje: 'Equipo actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar equipo:", error);
        res.status(500).json({ mensaje: 'Error al actualizar equipo' });
    }
};

module.exports = { obtenerInventario, crearEquipo, actualizarEquipo };