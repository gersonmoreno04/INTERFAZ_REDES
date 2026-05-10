// Archivo: routes/rolesRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerRoles } = require('../controllers/rolesController');

// Definimos que al entrar a la raíz de esta ruta por el método GET, ejecute la función
router.get('/', obtenerRoles);

module.exports = router;