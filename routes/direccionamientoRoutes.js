// Archivo: routes/direccionamientoRoutes.js
const express = require('express');
const router  = express.Router();
const {
    obtenerSiguienteIP,
    obtenerEnlacesNube,
    obtenerResumen,
} = require('../controllers/direccionamientoController');
 
// GET /api/direccionamiento/siguiente-ip?region=DF|GDL|MTY
// → Ventas llama esto al seleccionar región; devuelve próxima WAN+LAN libre
router.get('/siguiente-ip', obtenerSiguienteIP);
 
// GET /api/direccionamiento/enlaces-nube
// → NOC llama esto para cargar el menú de enlaces troncales 172.16.x.x
router.get('/enlaces-nube', obtenerEnlacesNube);
 
// GET /api/direccionamiento/resumen
// → Panel admin/NOC: ocupación de IPs por región
router.get('/resumen', obtenerResumen);
 
module.exports = router;