const express = require('express');
const router = express.Router();
const { obtenerFallas, obtenerAprovisionamientos, obtenerCambios, obtenerCancelaciones, resolverFalla,configurarOA, ejecutarCambio, ejecutarCancelacion } = require('../controllers/nocController');
// Rutas de lectura (GET)
router.get('/fallas', obtenerFallas);
router.get('/oa', obtenerAprovisionamientos);
router.get('/cab', obtenerCambios);
router.get('/ocs', obtenerCancelaciones);

// Rutas de escritura/acción (PUT/POST)
router.put('/fallas/:id/resolver', resolverFalla); // <-- NUEVA RUTA PARA RESOLVER TICKETS
// Agrega esta línea en la sección de rutas PUT/POST:
router.put('/oa/:id/configurar', configurarOA); 
router.put('/cab/:id/ejecutar', ejecutarCambio);
router.put('/ocs/:id/desconfigurar', ejecutarCancelacion);


module.exports = router;