// Archivo: routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal, editarPersonal, eliminarPersonal } = require('../controllers/usuariosController');
 
// 1. RUTAS DE CLIENTES (Para el módulo de Ventas y Admin)
router.get('/clientes', obtenerClientes);
router.post('/registro', crearUsuario);
 
// 2. RUTAS DE PERSONAL (Módulo de RH)
router.get('/personal', obtenerPersonal);
router.post('/personal', crearPersonal);
 
// NUEVAS: Editar y Eliminar empleado por ID
router.put('/personal/:id', editarPersonal);
router.delete('/personal/:id', eliminarPersonal);
 
module.exports = router;