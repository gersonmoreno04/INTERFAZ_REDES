// Archivo: controllers/authController.js
const db = require('../config/db');

const iniciarSesion = async (req, res) => {
    const { username, password } = req.body;

    try {
        // AQUÍ ESTÁ EL CAMBIO: Buscamos en 'empleados' y traemos 'id_empleado'
        const [empleados] = await db.query(
            'SELECT id_empleado, nombre_completo, id_rol, username FROM empleados WHERE username = ? AND password_hash = ?',
            [username, password]
        );

        if (empleados.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const usuarioEncontrado = empleados[0];
        
        res.json({
            mensaje: `Bienvenido, ${usuarioEncontrado.nombre_completo}`,
            usuario: usuarioEncontrado
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

module.exports = { iniciarSesion };