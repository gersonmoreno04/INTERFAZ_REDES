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

        // DESACTIVAR LLAVES FORÁNEAS TEMPORALMENTE
        await conexion.query('SET FOREIGN_KEY_CHECKS = 0');

        // 1. Guardar en CLIENTES
        const [resUsuario] = await conexion.query(
            'INSERT INTO clientes (nombre_completo, email, telefono, direccion) VALUES (?, ?, ?, ?)',
            [nombre_completo, email, telefono, direccion]
        );
        const id_cliente = resUsuario.insertId;

        // 2. Verificar en INVENTARIO (Tu tabla real)
        const idsEquipos = [];
        for (let serie of numero_serie) {
            const [equipos] = await conexion.query(
                'SELECT id_inventario FROM inventario WHERE serie = ? AND estado = "Optimo"',
                [serie]
            );
            if (equipos.length === 0) throw new Error(`Serie ${serie} no disponible.`);
            idsEquipos.push(equipos[0].id_inventario);
        }

        // 3. Crear el Contrato
        const numero_usuario_unico = 'PUMA-' + Math.floor(Math.random() * 100000);
        await conexion.query(
            'INSERT INTO servicios_cliente (id_cliente, numero_usuario_unico, plan_contratado, linea_telefonica_asignada, id_equipo_asignado, fecha_activacion) VALUES (?, ?, ?, ?, ?, CURDATE())',
            [id_cliente, numero_usuario_unico, plan_contratado, linea_telefonica, idsEquipos[0]]
        );

        // 4. Actualizar INVENTARIO (Usamos el ID del cliente para marcar que ya no está libre)
        for (let idInv of idsEquipos) {
            await conexion.query(
                'UPDATE inventario SET id_cliente = ? WHERE id_inventario = ?',
                [id_cliente, idInv]
            );
        }

        // 5. DISPARAR AL NOC
        await conexion.query(
            'INSERT INTO ordenes_aprovisionamiento (id_cliente, empresa_instaladora, estado) VALUES (?, "Cuadrilla PumaTel", "Pendiente Configuración")',
            [id_cliente]
        );

        // REACTIVAR LLAVES FORÁNEAS Y CERRAR
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1');
        await conexion.commit(); 

        await registrarAccion('VENTAS', `Contrato ${numero_usuario_unico} procesado. OA enviada al NOC.`);
        res.status(201).json({ mensaje: 'ÉXITO: Venta completada y enviada al NOC.', numero_usuario: numero_usuario_unico });

    } catch (error) {
        await conexion.query('SET FOREIGN_KEY_CHECKS = 1'); // Asegurar reactivación en error
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

// Exportamos todas las funciones (Las de Ventas y las de RH)
module.exports = { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal };