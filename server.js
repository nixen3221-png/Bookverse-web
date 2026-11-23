const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let pool;

// Autodetecta Docker MySQL (puerto 3307) o XAMPP MySQL (puerto 3306)
async function inicializarConexionBD() {
  const entornos = [
    {
      nombre: "Docker MySQL (puerto 3307)",
      host: "127.0.0.1",
      port: 3307,
      user: "root",
      password: "root",
      database: "bookverse_db",
    },
    {
      nombre: "XAMPP MySQL (puerto 3306)",
      host: "127.0.0.1",
      port: 3306,
      user: "root",
      password: "",
      database: "bookverse_db",
    },
  ];

  for (const cfg of entornos) {
    try {
      const candidato = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        waitForConnections: true,
        connectionLimit: 10,
      });
      await candidato.query("SELECT 1");
      console.log(`Conectado exitosamente a ${cfg.nombre}`);
      return candidato;
    } catch (_) {
      // Si este puerto no responde, intenta con el siguiente
    }
  }

  console.warn("Aviso: No se detectó MySQL activo en 3307 ni 3306.");
  return mysql.createPool({
    host: "127.0.0.1",
    port: 3307,
    user: "root",
    password: "root",
    database: "bookverse_db",
    waitForConnections: true,
    connectionLimit: 10,
  });
}

// Redirigir raíz al panel principal
app.get("/", (req, res) => {
  res.redirect("/HTML/index.html");
});

// 1. Verificar estado de conexión y obtener últimas 20 lecturas (RF-10 / RF-11)
app.get("/api/estado", async (req, res) => {
  try {
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM registro_datos_sensores"
    );

    const [ultimas] = await pool.query(`
      SELECT 
        r.id,
        s.codigo_sensor,
        suc.nombre AS sucursal,
        s.tipo_sensor,
        r.valor,
        s.unidad_medida AS unidad,
        DATE_FORMAT(r.fecha_registro, '%H:%i:%s') AS fecha_registro
      FROM registro_datos_sensores r
      JOIN sensores s ON r.sensor_id = s.id
      JOIN sucursales suc ON s.sucursal_id = suc.id
      ORDER BY r.id DESC
      LIMIT 20
    `);

    res.json({ conectado: true, total, ultimas });
  } catch (error) {
    res.status(500).json({ conectado: false, error: error.message });
  }
});

// 2. Insertar lote de lecturas simuladas en MySQL (RF-11)
app.post("/api/lecturas", async (req, res) => {
  const { lecturas } = req.body;
  if (!Array.isArray(lecturas) || lecturas.length === 0) {
    return res.status(400).json({ ok: false, error: "Sin lecturas válidas" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of lecturas) {
      await conn.query(
        `INSERT INTO registro_datos_sensores (sensor_id, valor)
         SELECT id, ? FROM sensores WHERE codigo_sensor = ?`,
        [item.valor, item.codigo_sensor]
      );
    }

    await conn.commit();
    res.json({ ok: true, insertadas: lecturas.length });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: error.message });
  } finally {
    conn.release();
  }
});

// 3. Generar informe estadístico desde MySQL (RF-12)
app.get("/api/informe", async (req, res) => {
  try {
    const [resumen] = await pool.query(`
      SELECT 
        s.codigo_sensor,
        suc.nombre AS sucursal,
        s.tipo_sensor,
        s.unidad_medida,
        COUNT(r.id) AS muestras,
        ROUND(AVG(r.valor), 1) AS promedio,
        ROUND(MIN(r.valor), 1) AS minimo,
        ROUND(MAX(r.valor), 1) AS maximo
      FROM sensores s
      JOIN sucursales suc ON s.sucursal_id = suc.id
      LEFT JOIN registro_datos_sensores r ON r.sensor_id = s.id
      GROUP BY s.id, s.codigo_sensor, suc.nombre, s.tipo_sensor, s.unidad_medida
      ORDER BY s.id ASC
    `);

    res.json({ ok: true, resumen });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 4. Vaciar tabla de lecturas para reiniciar pruebas (RF-13)
app.delete("/api/lecturas", async (req, res) => {
  try {
    await pool.query("TRUNCATE TABLE registro_datos_sensores");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

inicializarConexionBD().then((conexion) => {
  pool = conexion;
  app.listen(PORT, () => {
    console.log(`Servidor BookVerse activo en http://localhost:${PORT}`);
  });
});