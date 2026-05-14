const db = require('../config/db');
const { registrarAccion } = require('./bitacoraController');

 //CREAR REPORTE

const crearReporte = async (req, res) => {
    const { identificador, tipo_falla, descripcion } = req.body;

    try {
        // 1. BUSCAR AL CLIENTE 
        const [clientes] = await db.query(
            `SELECT id_cliente, nombre_completo 
             FROM clientes 
             WHERE id_cliente = ? OR telefono = ?`,
            [identificador, identificador]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                mensaje: 'Cliente no encontrado. Verifique su ID o teléfono.'
            });
        }

        const cliente = clientes[0];

        // 2. BUSCAR EL EQUIPO ASIGNADO EN INVENTARIO
        const [equipos] = await db.query(
            `SELECT id_inventario FROM inventario WHERE id_cliente = ?`,
            [cliente.id_cliente]
        );
        const id_equipo = equipos.length > 0 ? equipos[0].id_inventario : null;

        // 3. DETERMINAR PRIORIDAD (Valores permitidos: 'Baja', 'Normal', 'Alta', 'Critica')
        let prioridad = 'Normal';
        if (tipo_falla === 'Sin internet' || tipo_falla === 'Sin señal') {
            prioridad = 'Alta';
        }

        // 4. PREPARAR LA DESCRIPCIÓN TÉCNICA
        const descripcionCompleta = `[FALLA: ${tipo_falla}] - ${descripcion}`;

        // 5. INSERTAR EN TABLA 'tickets'
        await db.query(
            `INSERT INTO tickets (prioridad, descripcion, id_cliente, id_tecnico, estado) 
             VALUES (?, ?, ?, NULL, 'Nuevo')`,
            [prioridad, descripcionCompleta, cliente.id_cliente]
        );

        // 6. REGISTRAR EN BITÁCORA GENERAL
        await registrarAccion('SOPORTE', `Falla de ${tipo_falla} reportada por ${cliente.nombre_completo}`);

        res.status(201).json({
            mensaje: `¡Reporte enviado! Folio generado para ${cliente.nombre_completo}.`
        });

    } catch (error) {
        console.error("DETALLE DEL ERROR EN EL CONTROLADOR:", error);
        res.status(500).json({ mensaje: 'Error interno al procesar el reporte.' });
    }
};

//Muestra la lista de todos los reportes
const obtenerReportes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                t.id_ticket, 
                t.severidad, 
                c.nombre_completo AS cliente, -- ESTO ES LO QUE BUSCA TU HTML
                t.descripcion, 
                t.estado 
            FROM tickets t 
            LEFT JOIN clientes c ON t.id_cliente = c.id_cliente 
            ORDER BY t.fecha_creacion DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al obtener reportes' });
    }
};

//Actualiza la lista de reportes
const actualizarReporte = async (req, res) => {
    const { id } = req.params;
    const { estado, causa_raiz, acciones_resolucion } = req.body;
    
    try {
        await db.query(
            `UPDATE tickets 
             SET estado = ?, causa_raiz = ?, acciones_resolucion = ?, hora_recuperacion = IF(? = 'Resuelto', NOW(), NULL)
             WHERE id_ticket = ?`, 
            [estado, causa_raiz, acciones_resolucion, estado, id]
        );
        res.json({ mensaje: 'Gestión del ticket actualizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al actualizar el estado del ticket.' });
    }
};

//EXPORTACIÓN
module.exports = { 
    crearReporte, 
    actualizarReporte, 
    obtenerReportes 
};