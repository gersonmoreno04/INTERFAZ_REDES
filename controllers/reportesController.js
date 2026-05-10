const db = require('../config/db');
const { registrarAccion } = require('./bitacoraController');

/**
 * 🔹 CREAR REPORTE
 * Vincula al cliente, detecta su equipo y abre un ticket en el NOC.
 */
const crearReporte = async (req, res) => {
    const { identificador, tipo_falla, descripcion } = req.body;

    try {
        // 1. BUSCAR AL CLIENTE (Por ID o Teléfono)
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
        // Esto permite que el ingeniero del NOC sepa qué hardware revisar
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
        // Usamos 'Nuevo' como estado inicial según tu estructura de BD
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

/**
 * 🔹 OBTENER TODOS LOS REPORTES
 * Muestra la lista de fallas para el Dashboard del NOC.
 */
// 🔹 CAMBIO EN EL CONTROLLER (obtenerReportes)
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

/**
 * 🔹 ACTUALIZAR ESTADO DEL REPORTE
 * Permite al ingeniero del NOC cambiar el estado (En revision, Esperando Autorizacion, etc.)
 */
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

// 🔹 EXPORTACIÓN (Crucial para que las rutas no den TypeError)
module.exports = { 
    crearReporte, 
    actualizarReporte, 
    obtenerReportes 
};