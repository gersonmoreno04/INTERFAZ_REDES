// Archivo: routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal } = require('../controllers/usuariosController');

// 1. RUTAS DE CLIENTES (Para el módulo de Ventas y Admin)
router.get('/clientes', obtenerClientes);
router.post('/registro', crearUsuario); // (O la ruta que usabas antes para crearUsuario)

// 2. RUTAS DE PERSONAL (Para el nuevo módulo de RH que acabamos de hacer)
router.get('/personal', obtenerPersonal);
router.post('/personal', crearPersonal);

module.exports = router;