// Archivo: routes/ticketsRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerTickets, actualizarEstado, obtenerTecnicos, asignarTicket } = require('../controllers/ticketsController');

router.get('/', obtenerTickets);
router.post('/actualizar-estado', actualizarEstado);

// Nuestras dos rutas nuevas para el panel de Admin NOC:
router.get('/tecnicos', obtenerTecnicos);
router.post('/asignar', asignarTicket);

module.exports = router;