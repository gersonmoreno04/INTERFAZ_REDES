// Archivo: routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { obtenerMetricas } = require('../controllers/dashboardController');

router.get('/metricas', obtenerMetricas);

module.exports = router;