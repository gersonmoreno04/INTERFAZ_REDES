// Archivo: controllers/dashboardController.js
const db = require('../config/db');

const obtenerMetricas = async (req, res) => {
    try {
        // 1. Contar total de clientes
        const [clientes] = await db.query('SELECT COUNT(*) AS total FROM clientes');
        const totalClientes = clientes[0].total;

        // 2. Contar tickets pendientes (Todo lo que NO sea "Finalizado")
        const [tickets] = await db.query('SELECT COUNT(*) AS total FROM tickets WHERE estado != "Finalizado"');
        const ticketsPendientes = tickets[0].total;

        // 3. Contar TODO el inventario registrado (sin importar estado)
        const [inventario] = await db.query('SELECT COUNT(*) AS total FROM inventario');
        const totalInventario = inventario[0].total || 0;

        // Enviamos los 3 números empaquetados
        res.json({
            clientes: totalClientes,
            tickets: ticketsPendientes,
            inventario: totalInventario
        });

    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({ mensaje: 'Error al obtener métricas' });
    }
};

module.exports = { obtenerMetricas };