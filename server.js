// Archivo: server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const app = express();

app.use(cors()); 
app.use(express.json()); 

// ==========================================
// 1. SERVIDOR WEB (ARCHIVOS FRONTEND)
// ==========================================
// Exponemos la carpeta 'public' para que el navegador pueda leer los HTML, CSS y JS
app.use(express.static(path.join(__dirname, 'public')));

// Ruta Raíz: Si entran a localhost:3000 sin especificar archivo, los mandamos al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ==========================================
// 2. RUTAS DE LA API (BACKEND PUMATEL)
// ==========================================
const rolesRoutes = require('./routes/rolesRoutes');
app.use('/api/roles', rolesRoutes);

const usuariosRoutes = require('./routes/usuariosRoutes'); 
app.use('/api/usuarios', usuariosRoutes); 

const inventarioRoutes = require('./routes/inventarioRoutes');
app.use('/api/inventario', inventarioRoutes);

const ticketsRoutes = require('./routes/ticketsRoutes');
app.use('/api/tickets', ticketsRoutes);

const authRoutes = require('./routes/authRoutes'); 
app.use('/api/auth', authRoutes);

const bitacoraRoutes = require('./routes/bitacoraRoutes');
app.use('/api/bitacora', bitacoraRoutes);

const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

const reportesRoutes = require('./routes/reportesRoutes');
app.use('/api/reportes', reportesRoutes);

const nocRoutes = require('./routes/nocRoutes');
app.use('/api/noc', nocRoutes);

// Ruta de diagnóstico para saber si el servidor está vivo
app.get('/api/status', (req, res) => {
    res.json({ mensaje: 'El servidor de Pumatel está en línea y funcionando.' });
});



// ==========================================
// 3. INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Pumatel corriendo en el puerto ${PORT}`);
});