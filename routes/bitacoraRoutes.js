// Archivo: routes/bitacoraRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerBitacora } = require('../controllers/bitacoraController');

router.get('/', obtenerBitacora);

module.exports = router;