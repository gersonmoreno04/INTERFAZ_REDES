// Archivo: controllers/usuariosController.js
const db = require('../config/db');
const { registrarAccion } = require('./bitacoraController');
 
/* =========================================================================
   MÓDULO 1: GESTIÓN DE CLIENTES (VENTAS)
   ========================================================================= */
 
const crearUsuario = async (req, res) => {
    const { nombre_completo, email, telefono, direccion, plan_contratado, linea_telefonica, numero_serie } = req.body;
    const conexion = await db.getConnection();
    
    try {
        await conexion.beginTransaction(); 
 
        await conexion.query('SET FOREIGN_KEY_CHECKS = 0');
 
        const [resUsuario] = await conexion.query(
            'INSERT INTO clientes (nombre_completo, email, telefono, direccion) VALUES (?, ?, ?, ?)',
            [nombre_completo, email, telefono, direccion]
        );
        const id_cliente = resUsuario.insertId;
 
        const idsEquipos = [];
        for (let serie of numero_serie) {
            const [equipos] = await conexion.query(
                'SELECT id_inventario FROM inventario WHERE serie = ? AND estado = "Optimo"',
                [serie]
            );
            if (equipos.length === 0) throw new Error(`Serie ${serie} no disponible.`);
            idsEquipos.push(equipos[0].id_inventario);
        }
 
        const numero_usuario_unico = 'PUMA-' + Math.floor(Math.random() * 100000);
        await conexion.query(
            'INSERT INTO servicios_cliente (id_cliente, numero_usuario_unico, plan_contratado, linea_telefonica_asignada, id_equipo_asignado, fecha_activacion) VALUES (?, ?, ?, ?, ?, CURDATE())',
            [id_cliente, numero_usuario_unico, plan_contratado, linea_telefonica, idsEquipos[0]]
        );
 
        for (let idInv of idsEquipos) {
            await conexion.query(
                'UPDATE inventario SET id_cliente = ? WHERE id_inventario = ?',
                [id_cliente, idInv]
            );
        }
 
        await conexion.query(
            'INSERT INTO ordenes_aprovisionamiento (id_cliente, empresa_instaladora, estado) VALUES (?, "Cuadrilla PumaTel", "Pendiente Configuración")',
            [id_cliente]
        );
 
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.commit(); 
 
        await registrarAccion('VENTAS', `Contrato ${numero_usuario_unico} procesado. OA enviada al NOC.`);
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
        const [rows] = await db.query('SELECT id_cliente, nombre_completo, email, telefono, direccion FROM clientes');
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
    const { nombre_completo, id_rol, telefono, correo, usuario, password } = req.body;
    
    try {
        const query = `
            INSERT INTO empleados (nombre_completo, id_rol, telefono, email, username, password_hash) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await db.query(query, [nombre_completo, id_rol, telefono || null, correo || null, usuario, password]);
        
        await registrarAccion('RECURSOS HUMANOS', `Alta de nuevo empleado: ${nombre_completo} (Usuario: ${usuario})`);
        
        res.json({ mensaje: 'Personal registrado con éxito' });
    } catch (error) {
        console.error("Error al registrar personal:", error);
        res.status(500).json({ mensaje: 'Error al registrar personal en la BD' });
    }
};
 
/* =========================================================================
   NUEVO: EDITAR EMPLEADO (PUT /api/usuarios/personal/:id)
   ========================================================================= */
const editarPersonal = async (req, res) => {
    const { id } = req.params;
    const { nombre_completo, id_rol, telefono, correo, usuario, password } = req.body;
 
    try {
        // Si el frontend envía contraseña nueva, se actualiza; si no, se conserva la actual
        let query;
        let params;
 
        if (password && password.trim() !== '') {
            // Actualiza todos los campos incluyendo la contraseña
            query = `
                UPDATE empleados 
                SET nombre_completo = ?, id_rol = ?, telefono = ?, email = ?, username = ?, password_hash = ?
                WHERE id_empleado = ?
            `;
            params = [nombre_completo, id_rol, telefono || null, correo || null, usuario, password, id];
        } else {
            // Actualiza sin tocar la contraseña
            query = `
                UPDATE empleados 
                SET nombre_completo = ?, id_rol = ?, telefono = ?, email = ?, username = ?
                WHERE id_empleado = ?
            `;
            params = [nombre_completo, id_rol, telefono || null, correo || null, usuario, id];
        }
 
        const [result] = await db.query(query, params);
 
        if (result.affectedRows === 0) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }
 
        await registrarAccion('RECURSOS HUMANOS', `Empleado actualizado: ${nombre_completo} (ID: ${id})`);
 
        res.json({ mensaje: 'Empleado actualizado con éxito' });
    } catch (error) {
        console.error("Error al editar personal:", error);
        res.status(500).json({ mensaje: 'Error al actualizar el empleado en la BD' });
    }
};
 
/* =========================================================================
   NUEVO: ELIMINAR EMPLEADO (DELETE /api/usuarios/personal/:id)
   ========================================================================= */
const eliminarPersonal = async (req, res) => {
    const { id } = req.params;
 
    try {
        // Obtenemos el nombre antes de eliminar para la bitácora
        const [empleado] = await db.query('SELECT nombre_completo FROM empleados WHERE id_empleado = ?', [id]);
 
        if (empleado.length === 0) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }
 
        const nombreEmpleado = empleado[0].nombre_completo;
 
        await db.query('DELETE FROM empleados WHERE id_empleado = ?', [id]);
 
        await registrarAccion('RECURSOS HUMANOS', `Baja de empleado: ${nombreEmpleado} (ID: ${id})`);
 
        res.json({ mensaje: 'Empleado eliminado con éxito' });
    } catch (error) {
        console.error("Error al eliminar personal:", error);
        res.status(500).json({ mensaje: 'Error al eliminar el empleado en la BD' });
    }
};
 
// Exportamos todas las funciones
module.exports = { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal, editarPersonal, eliminarPersonal };
 