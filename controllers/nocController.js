// Archivo: controllers/nocController.js
const db = require('../config/db');

// En nocController.js
const asignarTicket = async (req, res) => {
    const { id_ticket, id_tecnico } = req.body; // Recibimos el ticket y el técnico elegido

    try {
        await db.query(
            "UPDATE tickets SET id_tecnico = ?, estado = 'En revision' WHERE id_ticket = ?",
            [id_tecnico, id_ticket]
        );

        await registrarAccion('NOC', `Jefe de Operaciones asignó el ticket #TK-${id_ticket} al técnico ID-${id_tecnico}`);

        res.json({ mensaje: 'Ticket asignado correctamente al técnico.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al asignar el ticket' });
    }
};

// 1. OBTENER FALLAS (Corregido para mostrar el nombre del cliente)
const obtenerFallas = async (req, res) => {
    try {
        const query = `
            SELECT t.*, c.nombre_completo AS cliente 
            FROM tickets t
            LEFT JOIN clientes c ON t.id_cliente = c.id_cliente
            ORDER BY t.id_ticket DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener incidentes" });
    }
};

// 2. OBTENER OA (Módulo de Aprovisionamiento) — incluye IPs del cliente
const obtenerAprovisionamientos = async (req, res) => {
    try {
        const query = `
            SELECT 
                oa.*,
                c.nombre_completo  AS cliente,
                c.email,
                c.telefono,
                c.direccion,
                sc.numero_usuario_unico,
                sc.plan_contratado,
                sc.region,
                sc.ip_wan_red,
                sc.ip_wan_pe,
                sc.ip_wan_ce,
                sc.ip_wan_broadcast,
                sc.ip_lan_red,
                sc.linea_telefonica_asignada,
                inv.equipo         AS equipo_nombre,
                inv.serie          AS equipo_serie
            FROM ordenes_aprovisionamiento oa
            LEFT JOIN clientes c            ON oa.id_cliente = c.id_cliente
            LEFT JOIN servicios_cliente sc  ON sc.id_cliente = oa.id_cliente
            LEFT JOIN inventario inv        ON inv.id_cliente = oa.id_cliente
            ORDER BY oa.id_oa DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener ordenes de aprovisionamiento" });
    }
};

// 3. OBTENER CAB (Módulo de Gestión de Cambios)
const obtenerCambios = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM gestion_cambios ORDER BY id_cambio DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener control de cambios" });
    }
};

// 4. OBTENER OCS (Módulo de Cancelaciones)
const obtenerCancelaciones = async (req, res) => {
    try {
        const query = `
            SELECT oc.*, c.nombre_completo AS cliente 
            FROM ordenes_cancelacion oc
            LEFT JOIN clientes c ON oc.id_cliente = c.id_cliente
            ORDER BY oc.id_ocs DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener órdenes de cancelación" });
    }
};

const { registrarAccion } = require('./bitacoraController'); // Asegúrate de tener esto arriba

// 5. RESOLVER FALLA (Guardar RCA y cerrar ticket)
const resolverFalla = async (req, res) => {
    const { id } = req.params;
    const { causa_raiz, acciones_resolucion } = req.body;

    try {
        const query = `
            UPDATE tickets 
            SET estado = 'Resuelto', 
                causa_raiz = ?, 
                acciones_resolucion = ?, 
                hora_recuperacion = NOW() 
            WHERE id_ticket = ?
        `;
        await db.query(query, [causa_raiz, acciones_resolucion, id]);
        
        // Avisamos a la bitácora de auditoría
        await registrarAccion('NOC', `Ticket #TK-${id} cerrado. RCA: ${causa_raiz}`);
        
        res.json({ mensaje: 'Ticket resuelto y documentado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al resolver el ticket' });
    }
};

// 6. FINALIZAR APROVISIONAMIENTO (OA) — guarda enlace troncal y config PE/CE
const configurarOA = async (req, res) => {
    const { id } = req.params;
    const { enlace_troncal, ip_troncal_red, ip_troncal_pe, ip_troncal_ce, config_pe, config_ce } = req.body;

    try {
        await db.query(
            `UPDATE ordenes_aprovisionamiento 
             SET estado          = 'Operativo',
                 enlace_troncal  = ?,
                 ip_troncal_red  = ?,
                 ip_troncal_pe   = ?,
                 ip_troncal_ce   = ?,
                 config_pe       = ?,
                 config_ce       = ?
             WHERE id_oa = ?`,
            [
                enlace_troncal  || null,
                ip_troncal_red  || null,
                ip_troncal_pe   || null,
                ip_troncal_ce   || null,
                config_pe       || null,
                config_ce       || null,
                id
            ]
        );

        await registrarAccion('NOC',
            `OA-${id} finalizada. Enlace: ${enlace_troncal || 'N/A'} | PE: ${ip_troncal_pe || 'N/A'} | CE: ${ip_troncal_ce || 'N/A'}`
        );

        res.json({ mensaje: 'Aprovisionamiento exitoso. Servicio del cliente enrutado y en linea.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al finalizar el aprovisionamiento' });
    }
};


// 7. EJECUTAR CAMBIO EN LA RED (CAB)
const ejecutarCambio = async (req, res) => {
    const { id } = req.params;
    const { plan_rollback } = req.body; // Recibimos el plan por si el ingeniero lo actualizó
    try {
        await db.query(
            "UPDATE gestion_cambios SET estado = 'Completado', plan_rollback = ? WHERE id_cambio = ?", 
            [plan_rollback, id]
        );
        
        // Avisamos a la bitácora
        const { registrarAccion } = require('./bitacoraController'); 
        await registrarAccion('NOC', `Cambio en la red finalizado (CAB-${id}). Se actualizó su estatus a Completado.`);
        
        res.json({ mensaje: 'El cambio en la red ha sido ejecutado y cerrado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al ejecutar el cambio' });
    }
};

// 8. EJECUTAR CANCELACIÓN (OCS)
const ejecutarCancelacion = async (req, res) => {
    const { id } = req.params;
    const { equipo_recuperado } = req.body;
    
    try {
        await db.query(
            "UPDATE ordenes_cancelacion SET estado = 'Finalizado', equipo_recuperado = ? WHERE id_ocs = ?", 
            [equipo_recuperado ? 1 : 0, id]
        );
        
        // Avisamos a la bitácora
        const { registrarAccion } = require('./bitacoraController'); 
        await registrarAccion('NOC', `Cancelación finalizada (OCS-${id}). Equipo recuperado: ${equipo_recuperado ? 'Sí' : 'No'}`);
        
        res.json({ mensaje: 'Servicio dado de baja en red y OCS finalizada correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error al ejecutar la cancelación' });
    }
};

// Modifica tu exports para incluir esta última función:
module.exports = { obtenerFallas, obtenerAprovisionamientos, obtenerCambios, obtenerCancelaciones, resolverFalla, configurarOA, ejecutarCambio, ejecutarCancelacion, asignarTicket };
