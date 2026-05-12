// Archivo: controllers/direccionamientoController.js
// Gestiona el catálogo de direccionamiento IP de PumaTel
// ─────────────────────────────────────────────────────
// Dos universos de IPs:
//   1. IPs públicas ISP (ISP_MEXICO.xlsx) → las asigna VENTAS al crear contrato
//   2. IPs troncales NUBE (NUBE.xlsx)     → las asigna el TÉCNICO NOC al configurar OA
 
const db = require('../config/db');
 
/* =========================================================================
   CATÁLOGO FIJO — NUBE.xlsx (172.16.0.0/30 — enlaces backbone PE↔CE)
   Estos no se guardan en BD porque son infraestructura fija de red.
   El técnico los selecciona desde un menú al configurar la OA.
   ========================================================================= */
const ENLACES_NUBE = [
    // ÁREA 0 — Troncales intercity
    { area: 0, enlace: 'BAC-DF-01 vs BAC-GDL-01',             red: '172.16.0.0',   pe: '172.16.0.1',   ce: '172.16.0.2',   broadcast: '172.16.0.3'  },
    { area: 0, enlace: 'BAC-DF-01 vs BAC-MTY-01',             red: '172.16.0.4',   pe: '172.16.0.5',   ce: '172.16.0.6',   broadcast: '172.16.0.7'  },
    { area: 0, enlace: 'BAC-GDL-01 vs BAC-MTY-01',            red: '172.16.0.8',   pe: '172.16.0.9',   ce: '172.16.0.10',  broadcast: '172.16.0.11' },
 
    // ÁREA 1 — CDMX (DF)
    { area: 1, enlace: 'BAC-DF-01 vs DR-DF',                  red: '172.16.0.12',  pe: '172.16.0.13',  ce: '172.16.0.14',  broadcast: '172.16.0.15' },
    { area: 1, enlace: 'DR-DF vs sub-core-df-01',             red: '172.16.0.16',  pe: '172.16.0.17',  ce: '172.16.0.18',  broadcast: '172.16.0.19' },
    { area: 1, enlace: 'DR-DF vs sub-core-df-03',             red: '172.16.0.20',  pe: '172.16.0.21',  ce: '172.16.0.22',  broadcast: '172.16.0.23' },
    { area: 1, enlace: 'sub-core-df-01 vs sub-core-df-02',    red: '172.16.0.24',  pe: '172.16.0.25',  ce: '172.16.0.26',  broadcast: '172.16.0.27' },
    { area: 1, enlace: 'sub-core-df-01 vs sub-core-df-03',    red: '172.16.0.28',  pe: '172.16.0.29',  ce: '172.16.0.30',  broadcast: '172.16.0.31' },
    { area: 1, enlace: 'sub-core-df-02 vs sub-core-df-03',    red: '172.16.0.32',  pe: '172.16.0.33',  ce: '172.16.0.34',  broadcast: '172.16.0.35' },
    { area: 1, enlace: 'sub-core-df-01 vs int-gam-01',        red: '172.16.0.36',  pe: '172.16.0.37',  ce: '172.16.0.38',  broadcast: '172.16.0.39' },
    { area: 1, enlace: 'sub-core-df-01 vs int-iztapalapa-01', red: '172.16.0.40',  pe: '172.16.0.41',  ce: '172.16.0.42',  broadcast: '172.16.0.43' },
    { area: 1, enlace: 'sub-core-df-01 vs int-alvaroobregon-01', red: '172.16.0.44', pe: '172.16.0.45', ce: '172.16.0.46', broadcast: '172.16.0.47' },
    { area: 1, enlace: 'sub-core-df-02 vs int-azcapotzalco-01',  red: '172.16.0.48', pe: '172.16.0.49', ce: '172.16.0.50', broadcast: '172.16.0.51' },
    { area: 1, enlace: 'sub-core-df-02 vs int-benitojuarez-01',  red: '172.16.0.52', pe: '172.16.0.53', ce: '172.16.0.54', broadcast: '172.16.0.55' },
    { area: 1, enlace: 'sub-core-df-02 vs int-iztacalco-01',     red: '172.16.0.56', pe: '172.16.0.57', ce: '172.16.0.58', broadcast: '172.16.0.59' },
    { area: 1, enlace: 'sub-core-df-02 vs int-cuauhtemoc-01',    red: '172.16.0.60', pe: '172.16.0.61', ce: '172.16.0.62', broadcast: '172.16.0.63' },
    { area: 1, enlace: 'sub-core-df-03 vs int-venustianocarranza-01', red: '172.16.0.64', pe: '172.16.0.65', ce: '172.16.0.66', broadcast: '172.16.0.67' },
    { area: 1, enlace: 'sub-core-df-03 vs int-coyoacan-01',      red: '172.16.0.68', pe: '172.16.0.69', ce: '172.16.0.70', broadcast: '172.16.0.71' },
    { area: 1, enlace: 'sub-core-df-03 vs int-miguelhidalgo-01', red: '172.16.0.72', pe: '172.16.0.73', ce: '172.16.0.74', broadcast: '172.16.0.75' },
 
    // ÁREA 2 — GDL (Guadalajara)
    { area: 2, enlace: 'BAC-GDL-01 vs DR-GDL',                   red: '172.16.0.76',  pe: '172.16.0.77',  ce: '172.16.0.78',  broadcast: '172.16.0.79'  },
    { area: 2, enlace: 'DR-GDL vs sub-core-gdl-01',              red: '172.16.0.80',  pe: '172.16.0.81',  ce: '172.16.0.82',  broadcast: '172.16.0.83'  },
    { area: 2, enlace: 'DR-GDL vs sub-core-gdl-03',              red: '172.16.0.84',  pe: '172.16.0.85',  ce: '172.16.0.86',  broadcast: '172.16.0.87'  },
    { area: 2, enlace: 'sub-core-gdl-01 vs sub-core-gdl-02',     red: '172.16.0.88',  pe: '172.16.0.89',  ce: '172.16.0.90',  broadcast: '172.16.0.91'  },
    { area: 2, enlace: 'sub-core-gdl-01 vs sub-core-gdl-03',     red: '172.16.0.92',  pe: '172.16.0.93',  ce: '172.16.0.94',  broadcast: '172.16.0.95'  },
    { area: 2, enlace: 'sub-core-gdl-02 vs sub-core-gdl-03',     red: '172.16.0.96',  pe: '172.16.0.97',  ce: '172.16.0.98',  broadcast: '172.16.0.99'  },
    { area: 2, enlace: 'sub-core-gdl-01 vs int-regionnorte-01',  red: '172.16.0.100', pe: '172.16.0.101', ce: '172.16.0.102', broadcast: '172.16.0.103' },
    { area: 2, enlace: 'sub-core-gdl-01 vs int-altosnorte-01',   red: '172.16.0.104', pe: '172.16.0.105', ce: '172.16.0.106', broadcast: '172.16.0.107' },
    { area: 2, enlace: 'sub-core-gdl-01 vs int-altossur-01',     red: '172.16.0.108', pe: '172.16.0.109', ce: '172.16.0.110', broadcast: '172.16.0.111' },
    { area: 2, enlace: 'sub-core-gdl-02 vs int-cienega-01',      red: '172.16.0.112', pe: '172.16.0.113', ce: '172.16.0.114', broadcast: '172.16.0.115' },
    { area: 2, enlace: 'sub-core-gdl-02 vs int-sureste-01',      red: '172.16.0.116', pe: '172.16.0.117', ce: '172.16.0.118', broadcast: '172.16.0.119' },
    { area: 2, enlace: 'sub-core-gdl-02 vs int-sur-01',          red: '172.16.0.120', pe: '172.16.0.121', ce: '172.16.0.122', broadcast: '172.16.0.123' },
    { area: 2, enlace: 'sub-core-gdl-02 vs int-sierradeamula-01',red: '172.16.0.124', pe: '172.16.0.125', ce: '172.16.0.126', broadcast: '172.16.0.127' },
    { area: 2, enlace: 'sub-core-gdl-03 vs int-costasur-01',     red: '172.16.0.128', pe: '172.16.0.129', ce: '172.16.0.130', broadcast: '172.16.0.131' },
    { area: 2, enlace: 'sub-core-gdl-03 vs int-costanorte-01',   red: '172.16.0.132', pe: '172.16.0.133', ce: '172.16.0.134', broadcast: '172.16.0.135' },
    { area: 2, enlace: 'sub-core-gdl-03 vs int-centro-01',       red: '172.16.0.136', pe: '172.16.0.137', ce: '172.16.0.138', broadcast: '172.16.0.139' },
 
    // ÁREA 3 — MTY (Monterrey)
    { area: 3, enlace: 'BAC-MTY-01 vs BORDER-MTY',               red: '172.16.0.140', pe: '172.16.0.141', ce: '172.16.0.142', broadcast: '172.16.0.143' },
    { area: 3, enlace: 'BORDER-MTY vs sub-core-mty-01',          red: '172.16.0.144', pe: '172.16.0.145', ce: '172.16.0.146', broadcast: '172.16.0.147' },
    { area: 3, enlace: 'BORDER-MTY vs sub-core-mty-03',          red: '172.16.0.148', pe: '172.16.0.149', ce: '172.16.0.150', broadcast: '172.16.0.151' },
    { area: 3, enlace: 'sub-core-mty-01 vs sub-core-mty-02',     red: '172.16.0.152', pe: '172.16.0.153', ce: '172.16.0.154', broadcast: '172.16.0.155' },
    { area: 3, enlace: 'sub-core-mty-01 vs sub-core-mty-03',     red: '172.16.0.156', pe: '172.16.0.157', ce: '172.16.0.158', broadcast: '172.16.0.159' },
    { area: 3, enlace: 'sub-core-mty-02 vs sub-core-mty-03',     red: '172.16.0.160', pe: '172.16.0.161', ce: '172.16.0.162', broadcast: '172.16.0.163' },
    { area: 3, enlace: 'sub-core-mty-01 vs int-mierynoriega-01', red: '172.16.0.164', pe: '172.16.0.165', ce: '172.16.0.166', broadcast: '172.16.0.167' },
    { area: 3, enlace: 'sub-core-mty-01 vs int-losherreras-01',  red: '172.16.0.168', pe: '172.16.0.169', ce: '172.16.0.170', broadcast: '172.16.0.171' },
    { area: 3, enlace: 'sub-core-mty-01 vs int-iturbide-01',     red: '172.16.0.172', pe: '172.16.0.173', ce: '172.16.0.174', broadcast: '172.16.0.175' },
    { area: 3, enlace: 'sub-core-mty-02 vs int-allende-01',      red: '172.16.0.176', pe: '172.16.0.177', ce: '172.16.0.178', broadcast: '172.16.0.179' },
    { area: 3, enlace: 'sub-core-mty-02 vs int-cadereyta-01',    red: '172.16.0.180', pe: '172.16.0.181', ce: '172.16.0.182', broadcast: '172.16.0.183' },
    { area: 3, enlace: 'sub-core-mty-02 vs int-sannicolasgarza-01', red: '172.16.0.184', pe: '172.16.0.185', ce: '172.16.0.186', broadcast: '172.16.0.187' },
    { area: 3, enlace: 'sub-core-mty-02 vs int-abasolo-01',      red: '172.16.0.188', pe: '172.16.0.189', ce: '172.16.0.190', broadcast: '172.16.0.191' },
    { area: 3, enlace: 'sub-core-mty-03 vs int-graltrevino-01',  red: '172.16.0.192', pe: '172.16.0.193', ce: '172.16.0.194', broadcast: '172.16.0.195' },
    { area: 3, enlace: 'sub-core-mty-03 vs int-villaldana-01',   red: '172.16.0.196', pe: '172.16.0.197', ce: '172.16.0.198', broadcast: '172.16.0.199' },
    { area: 3, enlace: 'sub-core-mty-03 vs int-anahuac-01',      red: '172.16.0.200', pe: '172.16.0.201', ce: '172.16.0.202', broadcast: '172.16.0.203' },
];
 
/* =========================================================================
   CATÁLOGO FIJO — ISP_MEXICO.xlsx
   Bloques WAN /30 y LAN /28 por región.
   La función siguiente* calcula cuál es el próximo libre consultando la BD.
   ========================================================================= */
 
// Genera todas las subredes /30 de un bloque /24 WAN (64 subredes → 64 clientes)
function generarSubredesWAN(baseOctet3) {
    const subredes = [];
    for (let i = 0; i < 64; i++) {
        const base = i * 4;
        const oct3 = Math.floor(base / 256) + baseOctet3;
        const oct4 = base % 256;
        subredes.push({
            red:       `148.${oct3 === baseOctet3 ? '' : ''}${246 + [246,247,248].indexOf(baseOctet3)}.${oct4}/30`,
            pe:        `148.${246 + [246,247,248].indexOf(baseOctet3)}.${oct4 + 1}`,
            ce:        `148.${246 + [246,247,248].indexOf(baseOctet3)}.${oct4 + 2}`,
            broadcast: `148.${246 + [246,247,248].indexOf(baseOctet3)}.${oct4 + 3}`,
        });
    }
    return subredes;
}
 
// Precalcula todos los pools por región directamente (más claro y sin errores)
const POOLS_WAN = {
    DF:  Array.from({ length: 64 }, (_, i) => ({
        red:       `148.246.${Math.floor(i*4/256)}.${(i*4)%256}/30`,
        pe:        `148.246.${Math.floor(i*4/256)}.${(i*4)%256 + 1}`,
        ce:        `148.246.${Math.floor(i*4/256)}.${(i*4)%256 + 2}`,
        broadcast: `148.246.${Math.floor(i*4/256)}.${(i*4)%256 + 3}`,
    })),
    GDL: Array.from({ length: 64 }, (_, i) => ({
        red:       `148.247.${Math.floor(i*4/256)}.${(i*4)%256}/30`,
        pe:        `148.247.${Math.floor(i*4/256)}.${(i*4)%256 + 1}`,
        ce:        `148.247.${Math.floor(i*4/256)}.${(i*4)%256 + 2}`,
        broadcast: `148.247.${Math.floor(i*4/256)}.${(i*4)%256 + 3}`,
    })),
    MTY: Array.from({ length: 64 }, (_, i) => ({
        red:       `148.248.${Math.floor(i*4/256)}.${(i*4)%256}/30`,
        pe:        `148.248.${Math.floor(i*4/256)}.${(i*4)%256 + 1}`,
        ce:        `148.248.${Math.floor(i*4/256)}.${(i*4)%256 + 2}`,
        broadcast: `148.248.${Math.floor(i*4/256)}.${(i*4)%256 + 3}`,
    })),
};
 
// Bloques LAN /28 por región (cada bloque /24 tiene 16 subredes /28 → 14 IPs útiles)
const BLOQUES_LAN = {
    DF:  ['200.33.0','200.33.1','200.33.2','200.33.3','200.33.5','200.33.6'],
    GDL: ['200.33.7','200.33.8','200.33.9','200.33.10','200.33.11','200.33.12'],
    MTY: ['200.33.13','200.33.14','200.33.15','200.33.16','200.33.17','200.33.18'],
};
 
// Genera las 16 subredes /28 de un bloque /24 LAN
function generarSubredesLAN(bloque) {
    return Array.from({ length: 16 }, (_, i) => `${bloque}.${i * 16}/28`);
}
 
/* =========================================================================
   ENDPOINT: GET /api/direccionamiento/siguiente-ip?region=DF|GDL|MTY
   Consulta la BD, determina qué WAN y LAN ya están usadas y devuelve
   la primera libre de cada pool.
   ========================================================================= */
const obtenerSiguienteIP = async (req, res) => {
    const region = (req.query.region || 'DF').toUpperCase();
    if (!['DF', 'GDL', 'MTY'].includes(region)) {
        return res.status(400).json({ mensaje: 'Región inválida. Usa DF, GDL o MTY.' });
    }
 
    try {
        // Obtener todas las IPs WAN y LAN ya asignadas en esta región
        const [usadas] = await db.query(
            'SELECT ip_wan_red, ip_lan_red FROM servicios_cliente WHERE region = ? AND estatus_servicio != "Cancelado"',
            [region]
        );
 
        const wanUsadas = new Set(usadas.map(r => r.ip_wan_red).filter(Boolean));
        const lanUsadas = new Set(usadas.map(r => r.ip_lan_red).filter(Boolean));
 
        // Encontrar primera WAN /30 libre
        const poolWAN = POOLS_WAN[region];
        const siguienteWAN = poolWAN.find(s => !wanUsadas.has(s.red)) || null;
 
        // Encontrar primera LAN /28 libre (recorre todos los bloques de la región)
        let siguienteLAN = null;
        for (const bloque of BLOQUES_LAN[region]) {
            const subredes = generarSubredesLAN(bloque);
            const libre = subredes.find(s => !lanUsadas.has(s));
            if (libre) { siguienteLAN = libre; break; }
        }
 
        // Calcular capacidad restante
        const wanLibres  = poolWAN.filter(s => !wanUsadas.has(s.red)).length;
        const totalLAN   = BLOQUES_LAN[region].length * 16;
        const lanLibres  = totalLAN - lanUsadas.size;
 
        res.json({
            region,
            wan: siguienteWAN,          // { red, pe, ce, broadcast }
            lan: siguienteLAN,          // "200.33.x.x/28"
            capacidad: {
                wan_total:  poolWAN.length,
                wan_usadas: wanUsadas.size,
                wan_libres: wanLibres,
                lan_total:  totalLAN,
                lan_usadas: lanUsadas.size,
                lan_libres: lanLibres,
            }
        });
    } catch (error) {
        console.error('Error al calcular siguiente IP:', error);
        res.status(500).json({ mensaje: 'Error al calcular la siguiente IP disponible.' });
    }
};
 
/* =========================================================================
   ENDPOINT: GET /api/direccionamiento/enlaces-nube
   Devuelve el catálogo completo de enlaces troncales agrupados por área.
   Lo usa el NOC para el menú desplegable al configurar una OA.
   ========================================================================= */
const obtenerEnlacesNube = (req, res) => {
    const agrupados = {
        0: { nombre: 'Área 0 — Troncales Intercity', enlaces: [] },
        1: { nombre: 'Área 1 — CDMX (DF)',            enlaces: [] },
        2: { nombre: 'Área 2 — GDL (Guadalajara)',    enlaces: [] },
        3: { nombre: 'Área 3 — MTY (Monterrey)',      enlaces: [] },
    };
    ENLACES_NUBE.forEach(e => agrupados[e.area].enlaces.push(e));
    res.json(Object.values(agrupados));
};
 
/* =========================================================================
   ENDPOINT: GET /api/direccionamiento/resumen
   Muestra el estado de uso de IPs por región (para el panel admin/NOC).
   ========================================================================= */
const obtenerResumen = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT region,
                   COUNT(*) AS total,
                   SUM(CASE WHEN estatus_servicio = 'Activo'     THEN 1 ELSE 0 END) AS activos,
                   SUM(CASE WHEN estatus_servicio = 'Suspendido' THEN 1 ELSE 0 END) AS suspendidos,
                   SUM(CASE WHEN estatus_servicio = 'Cancelado'  THEN 1 ELSE 0 END) AS cancelados
            FROM servicios_cliente
            WHERE ip_wan_red IS NOT NULL
            GROUP BY region
        `);
 
        const resumen = ['DF', 'GDL', 'MTY'].map(r => {
            const reg = rows.find(x => x.region === r) || { total: 0, activos: 0, suspendidos: 0, cancelados: 0 };
            return {
                region: r,
                wan_capacidad: POOLS_WAN[r].length,
                lan_capacidad: BLOQUES_LAN[r].length * 16,
                clientes_activos: reg.activos,
                clientes_suspendidos: reg.suspendidos,
                clientes_cancelados: reg.cancelados,
            };
        });
 
        res.json(resumen);
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({ mensaje: 'Error al obtener el resumen de direccionamiento.' });
    }
};
 
module.exports = { obtenerSiguienteIP, obtenerEnlacesNube, obtenerResumen };