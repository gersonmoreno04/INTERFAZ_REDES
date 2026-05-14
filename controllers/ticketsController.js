// Archivo: controllers/ticketsController.js
const db = require('../config/db');

const { registrarAccion } = require('./bitacoraController');

const obtenerTickets = async (req, res) => {
    const idRol = req.query.idRol;
    const idEmpleado = req.query.idEmpleado;

    try {
        let query = `
            SELECT 
                t.id_ticket, t.prioridad, t.descripcion, t.estado, t.id_tecnico, 
                c.nombre_completo AS cliente, c.direccion,
                e.nombre_completo AS tecnico
            FROM tickets t
            LEFT JOIN clientes c ON t.id_cliente = c.id_cliente
            LEFT JOIN empleados e ON t.id_tecnico = e.id_empleado
        `;

        if (idRol == 2) {
            query += ` WHERE t.id_tecnico = ?`;
            const [rows] = await db.query(query, [idEmpleado]);
            return res.json(rows);
        }

        const [rows] = await db.query(query);
        res.json(rows);

    } catch (error) {
        console.error("Error en obtenerTickets:", error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

const actualizarEstado = async (req, res) => {
    const { id_ticket, nuevo_estado } = req.body;
    try {
        // 1. Actualizamos el ticket
        await db.query('UPDATE tickets SET estado = ? WHERE id_ticket = ?', [nuevo_estado, id_ticket]);
        
        // 2. Avisamos a la bitácora
        await registrarAccion('NOC', `Técnico actualizó el Ticket #${id_ticket} a estado: ${nuevo_estado}`);
        
        // 3. Le decimos a la página web que todo salió bien (para que se recargue sola)
        res.json({ mensaje: 'Estado actualizado' });
    } catch (error) {
        console.error("Error en actualizarEstado:", error);
        res.status(500).json({ mensaje: 'Error al actualizar el ticket' });
    }
};

const obtenerTecnicos = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_empleado, nombre_completo FROM empleados WHERE id_rol = 2');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener técnicos' });
    }
};

const asignarTicket = async (req, res) => {
    const { id_ticket, id_tecnico } = req.body;
    try {
        // 1. Asignamos el ticket
        await db.query('UPDATE tickets SET id_tecnico = ?, estado = "En revision" WHERE id_ticket = ?', [id_tecnico, id_ticket]);
        
        // 2. Avisamos a la bitácora
        await registrarAccion('NOC ADMIN', `Se asignó el Ticket #${id_ticket} al empleado ID: ${id_tecnico}`);
        
        // 3. Le decimos a la página web que todo salió bien
        res.json({ mensaje: 'Técnico asignado correctamente' });
    } catch (error) {
        console.error("Error en asignarTicket:", error);
        res.status(500).json({ mensaje: 'Error al asignar ticket' });
    }
};

module.exports = { obtenerTickets, actualizarEstado, obtenerTecnicos, asignarTicket };