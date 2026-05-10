const express = require('express');
const router = express.Router();

// Verifica que esta ruta al archivo sea correcta
const { crearReporte, actualizarReporte, obtenerReportes } = require('../controllers/reportesController');

// Línea 6: Aquí es donde falla porque 'crearReporte' llega como undefined
router.post('/', crearReporte); 
router.put('/:id', actualizarReporte);
router.get('/', obtenerReportes);

module.exports = router;