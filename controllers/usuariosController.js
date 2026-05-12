// Archivo: controllers/usuariosController.js
const db = require('../config/db');
const { registrarAccion } = require('./bitacoraController');

/* =========================================================================
   MÓDULO 1: GESTIÓN DE CLIENTES (VENTAS)
   ========================================================================= */

const crearUsuario = async (req, res) => {
    const {
        nombre_completo, email, telefono, direccion,
        plan_contratado, linea_telefonica, numero_serie,
        // Nuevos campos de direccionamiento (vienen del frontend después de /siguiente-ip)
        region, ip_wan_red, ip_wan_pe, ip_wan_ce, ip_wan_broadcast, ip_lan_red
    } = req.body;

    const conexion = await db.getConnection();
    
    try {
        await conexion.beginTransaction(); 
        await conexion.query('SET FOREIGN_KEY_CHECKS = 0');

        // 1. Guardar en CLIENTES
        const [resUsuario] = await conexion.query(
            'INSERT INTO clientes (nombre_completo, email, telefono, direccion) VALUES (?, ?, ?, ?)',
            [nombre_completo, email, telefono, direccion]
        );
        const id_cliente = resUsuario.insertId;

        // 2. Verificar equipos en INVENTARIO
        const idsEquipos = [];
        for (let serie of numero_serie) {
            const [equipos] = await conexion.query(
                'SELECT id_inventario FROM inventario WHERE serie = ? AND estado = "Optimo"',
                [serie]
            );
            if (equipos.length === 0) throw new Error(`Serie ${serie} no disponible.`);
            idsEquipos.push(equipos[0].id_inventario);
        }

        // 3. Crear el Contrato con IPs de direccionamiento
        const numero_usuario_unico = 'PUMA-' + Math.floor(Math.random() * 100000);
        await conexion.query(
            `INSERT INTO servicios_cliente
             (id_cliente, numero_usuario_unico, plan_contratado, region,
              linea_telefonica_asignada, id_equipo_asignado, fecha_activacion,
              ip_wan_red, ip_wan_pe, ip_wan_ce, ip_wan_broadcast, ip_lan_red)
             VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
            [
                id_cliente, numero_usuario_unico, plan_contratado, region || 'DF',
                linea_telefonica, idsEquipos[0],
                ip_wan_red || null, ip_wan_pe || null, ip_wan_ce || null,
                ip_wan_broadcast || null, ip_lan_red || null
            ]
        );

        // 4. Actualizar INVENTARIO
        for (let idInv of idsEquipos) {
            await conexion.query(
                'UPDATE inventario SET id_cliente = ? WHERE id_inventario = ?',
                [id_cliente, idInv]
            );
        }

        // 5. Disparar OA al NOC
        await conexion.query(
            'INSERT INTO ordenes_aprovisionamiento (id_cliente, empresa_instaladora, estado) VALUES (?, "Cuadrilla PumaTel", "Pendiente Configuración")',
            [id_cliente]
        );

        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.commit(); 

        await registrarAccion('VENTAS', `Contrato ${numero_usuario_unico} procesado. Región: ${region}. WAN: ${ip_wan_red}. OA enviada al NOC.`);
        res.status(201).json({ mensaje: 'ÉXITO: Venta completada y enviada al NOC.', numero_usuario: numero_usuario_unico });

    } catch (error) {
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.rollback(); 
        console.error('Error:', error);
        res.status(400).json({ mensaje: error.message });
    } finally {
        conexion.release(); 
    }
};

const obtenerClientes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                c.id_cliente,
                c.nombre_completo,
                c.email,
                c.telefono,
                c.direccion,
                c.fecha_registro,
                sc.id_servicio,
                sc.numero_usuario_unico,
                sc.plan_contratado,
                sc.linea_telefonica_asignada,
                sc.fecha_activacion,
                sc.estatus_servicio,
                inv.equipo   AS equipo_nombre,
                inv.serie    AS equipo_serie,
                inv.estado   AS equipo_estado
            FROM clientes c
            LEFT JOIN servicios_cliente sc ON sc.id_cliente = c.id_cliente
            LEFT JOIN inventario inv       ON inv.id_cliente = c.id_cliente
            ORDER BY c.fecha_registro DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ mensaje: 'Error al consultar la base de datos' });
    }
};


/* =========================================================================
   MÓDULO 2: GESTIÓN DE PERSONAL (RECURSOS HUMANOS)
   ========================================================================= */

const obtenerPersonal = async (req, res) => {
    try {
        // Usamos "AS" para traducir tus columnas reales al formato que espera el HTML
        const query = `
            SELECT id_empleado, nombre_completo, username AS usuario, id_rol, telefono, email AS correo 
            FROM empleados 
            ORDER BY id_rol ASC, nombre_completo ASC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener personal:", error);
        res.status(500).json({ mensaje: 'Error al obtener personal' });
    }
};

const crearPersonal = async (req, res) => {
    // Recibimos los datos del formulario web
    const { nombre_completo, id_rol, telefono, correo, usuario, password } = req.body;
    
    try {
        // Hacemos el INSERT apuntando a tus columnas exactas: email, username, password_hash
        const query = `
            INSERT INTO empleados (nombre_completo, id_rol, telefono, email, username, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        // Guardamos los datos en la BD
        await db.query(query, [nombre_completo, id_rol, telefono || null, correo || null, usuario, password]);
        
        // Avisamos a la bitácora
        await registrarAccion('RECURSOS HUMANOS', `Alta de nuevo empleado: ${nombre_completo} (Usuario: ${usuario})`);
        
        res.json({ mensaje: 'Personal registrado con éxito' });
    } catch (error) {
        console.error("Error al registrar personal:", error);
        res.status(500).json({ mensaje: 'Error al registrar personal en la BD' });
    }
};

const editarPersonal = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, id_rol, telefono, correo, usuario, password } = req.body;

    try {
        // Si se envía password, la actualizamos; si no, solo los demás campos
        let query, params;
        if (password && password.trim() !== '') {
            query = `UPDATE empleados SET nombre_completo=?, id_rol=?, telefono=?, email=?, username=?, password_hash=? WHERE id_empleado=?`;
            params = [nombre_completo, id_rol, telefono || null, correo || null, usuario, password, id];
        } else {
            query = `UPDATE empleados SET nombre_completo=?, id_rol=?, telefono=?, email=?, username=? WHERE id_empleado=?`;
            params = [nombre_completo, id_rol, telefono || null, correo || null, usuario, id];
        }
        await db.query(query, params);
        await registrarAccion('RECURSOS HUMANOS', `Empleado #${id} (${nombre_completo}) actualizado.`);
        res.json({ mensaje: 'Empleado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al editar personal:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el empleado.' });
    }
};

const eliminarPersonal = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT nombre_completo FROM empleados WHERE id_empleado = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        const nombre = rows[0].nombre_completo;
        await db.query('DELETE FROM empleados WHERE id_empleado = ?', [id]);
        await registrarAccion('RECURSOS HUMANOS', `Empleado #${id} (${nombre}) eliminado del sistema.`);
        res.json({ mensaje: 'Empleado eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar personal:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el empleado.' });
    }
};

// Exportamos todas las funciones (Las de Ventas y las de RH)
/* =========================================================================
   MÓDULO 3: GESTIÓN DE CONTRATOS (VENTAS)
   ========================================================================= */

// PUT /api/usuarios/contratos/:id — Edita plan y línea telefónica del contrato
const editarContrato = async (req, res) => {
    const { id } = req.params; // id_servicio
    const { plan_contratado, linea_telefonica_asignada } = req.body;
    try {
        const [result] = await db.query(
            `UPDATE servicios_cliente
             SET plan_contratado = ?, linea_telefonica_asignada = ?
             WHERE id_servicio = ?`,
            [plan_contratado, linea_telefonica_asignada || null, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Contrato no encontrado.' });
        await registrarAccion('VENTAS', `Contrato ID-${id} actualizado. Plan: ${plan_contratado}`);
        res.json({ mensaje: 'Contrato actualizado correctamente.' });
    } catch (error) {
        console.error('Error al editar contrato:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el contrato.' });
    }
};

// PATCH /api/usuarios/contratos/:id/estatus — Cambia estatus (Activo/Suspendido/Cancelado)
// Cuando se Cancela: libera el equipo del inventario y genera OCS al NOC
const cambiarEstatusContrato = async (req, res) => {
    const { id } = req.params; // id_servicio
    const { estatus } = req.body; // 'Activo' | 'Suspendido' | 'Cancelado'
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        // Obtener datos actuales del contrato
        const [filas] = await conexion.query(
            `SELECT sc.id_cliente, sc.numero_usuario_unico, sc.id_equipo_asignado
             FROM servicios_cliente sc WHERE sc.id_servicio = ?`, [id]
        );
        if (filas.length === 0) { await conexion.rollback(); return res.status(404).json({ mensaje: 'Contrato no encontrado.' }); }

        const { id_cliente, numero_usuario_unico, id_equipo_asignado } = filas[0];

        // Actualizar estatus
        await conexion.query(
            'UPDATE servicios_cliente SET estatus_servicio = ? WHERE id_servicio = ?',
            [estatus, id]
        );

        // Si se cancela: liberar equipo en inventario y generar OCS al NOC
        if (estatus === 'Cancelado') {
            if (id_equipo_asignado) {
                await conexion.query(
                    'UPDATE inventario SET id_cliente = NULL WHERE id_inventario = ?',
                    [id_equipo_asignado]
                );
            }
            await conexion.query(
                `INSERT INTO ordenes_cancelacion (id_cliente, motivo, estado)
                 VALUES (?, 'Baja de servicio solicitada desde módulo comercial.', 'Pendiente Desconfiguración PE')`,
                [id_cliente]
            );
            await registrarAccion('VENTAS', `Contrato ${numero_usuario_unico} CANCELADO. OCS enviada al NOC.`);
        } else {
            await registrarAccion('VENTAS', `Contrato ${numero_usuario_unico} → ${estatus}.`);
        }

        await conexion.commit();
        res.json({ mensaje: `Contrato actualizado a: ${estatus}.`, generaOCS: estatus === 'Cancelado' });
    } catch (error) {
        await conexion.rollback();
        console.error('Error al cambiar estatus:', error);
        res.status(500).json({ mensaje: 'Error al cambiar el estatus del contrato.' });
    } finally {
        conexion.release();
    }
};

// DELETE /api/usuarios/clientes/:id — Elimina cliente y todo su historial
const eliminarCliente = async (req, res) => {
    const { id } = req.params; // id_cliente
    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();
        await conexion.query('SET FOREIGN_KEY_CHECKS = 0');

        const [cli] = await conexion.query('SELECT nombre_completo FROM clientes WHERE id_cliente = ?', [id]);
        if (cli.length === 0) { await conexion.rollback(); return res.status(404).json({ mensaje: 'Cliente no encontrado.' }); }
        const nombre = cli[0].nombre_completo;

        // Liberar equipos en inventario
        await conexion.query('UPDATE inventario SET id_cliente = NULL WHERE id_cliente = ?', [id]);
        // Eliminar registros relacionados
        await conexion.query('DELETE FROM servicios_cliente WHERE id_cliente = ?', [id]);
        await conexion.query('DELETE FROM ordenes_aprovisionamiento WHERE id_cliente = ?', [id]);
        await conexion.query('DELETE FROM ordenes_cancelacion WHERE id_cliente = ?', [id]);
        await conexion.query('DELETE FROM tickets WHERE id_cliente = ?', [id]);
        await conexion.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);

        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.commit();

        await registrarAccion('VENTAS', `Cliente ${nombre} (ID-${id}) eliminado del sistema.`);
        res.json({ mensaje: 'Cliente eliminado correctamente.' });
    } catch (error) {
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.rollback();
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el cliente.' });
    } finally {
        conexion.release();
    }
};

module.exports = { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal, editarPersonal, eliminarPersonal, editarContrato, cambiarEstatusContrato, eliminarCliente };