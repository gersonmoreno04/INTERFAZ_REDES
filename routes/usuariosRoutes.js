// Archivo: routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const { crearUsuario, obtenerClientes, obtenerPersonal, crearPersonal, editarPersonal, eliminarPersonal, editarContrato, cambiarEstatusContrato, eliminarCliente } = require('../controllers/usuariosController');
 
// 1. RUTAS DE CLIENTES (Módulo Comercial)
router.get('/clientes', obtenerClientes);
router.post('/registro', crearUsuario);
router.delete('/clientes/:id', eliminarCliente);
 
// 2. RUTAS DE CONTRATOS
router.put('/contratos/:id', editarContrato);
router.patch('/contratos/:id/estatus', cambiarEstatusContrato);
 
// 3. RUTAS DE PERSONAL (Módulo RH)
router.get('/personal', obtenerPersonal);
router.post('/personal', crearPersonal);
router.put('/personal/:id', editarPersonal);
router.delete('/personal/:id', eliminarPersonal);
 
module.exports = router;