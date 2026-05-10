// Archivo: routes/inventarioRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerInventario, crearEquipo, actualizarEquipo } = require('../controllers/inventarioController');

router.get('/', obtenerInventario);
router.post('/', crearEquipo);          // Ruta para guardar nuevos
router.put('/:id', actualizarEquipo);   // Ruta para editar existentes

module.exports = router;