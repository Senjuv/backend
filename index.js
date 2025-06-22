const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config(); // ✅ Para cargar .env localmente

const app = express();
app.use(cors());
app.use(express.json());

// Configurar conexión a PostgreSQL con variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Ruta raíz para verificar que el backend está vivo
app.get('/', (req, res) => {
  res.send('API Backend de Gomitas funcionando correctamente');
});

// --- Rutas Tiendas ---
app.get('/tiendas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tiendas ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ ERROR EN /tiendas:', err);
    res.status(500).json({ error: err.message || 'Error desconocido' });
  }
});

app.post('/tiendas', async (req, res) => {
  const { nombre, direccion } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tiendas (nombre, direccion) VALUES ($1, $2) RETURNING *',
      [nombre, direccion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tiendas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tienda = await pool.query('SELECT * FROM tiendas WHERE id = $1', [id]);
    if (tienda.rows.length === 0) return res.status(404).json({ error: 'Tienda no encontrada' });

    const entregas = await pool.query('SELECT * FROM entregas WHERE tienda_id = $1 ORDER BY fecha DESC', [id]);

    const CostoUnitario = 5.24;
    const PrecioVenta = 10;

    let totalBolsas = 0;
    let totalIngreso = 0;
    let totalCosto = 0;
    let totalGanancia = 0;

    entregas.rows.forEach(entrega => {
      totalBolsas += entrega.cantidad_bolsas;
      totalIngreso += entrega.cantidad_bolsas * PrecioVenta;
      totalCosto += entrega.cantidad_bolsas * CostoUnitario;
    });
    totalGanancia = totalIngreso - totalCosto;

    res.json({
      tienda: tienda.rows[0],
      entregas: entregas.rows,
      resumen: {
        totalBolsas,
        totalIngreso,
        totalCosto,
        totalGanancia
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas Entregas ---
app.get('/entregas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entregas ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/tiendas/:id/entregas', async (req, res) => {
  const { id } = req.params;
  const { cantidad_bolsas } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO entregas (tienda_id, cantidad_bolsas) VALUES ($1, $2) RETURNING *',
      [id, cantidad_bolsas]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/entregas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM entregas WHERE id = $1', [id]);
    res.json({ mensaje: 'Entrega eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas Finanzas ---
app.get('/finanzas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM finanzas ORDER BY fecha DESC LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ dinero_actual: 0, dinero_esperado: 0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/finanzas', async (req, res) => {
  const { dinero_actual, dinero_esperado } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO finanzas (dinero_actual, dinero_esperado) VALUES ($1, $2) RETURNING *`,
      [dinero_actual, dinero_esperado]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rutas Cotizaciones ---
app.get('/cotizaciones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cotizaciones ORDER BY fecha DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cotizaciones', async (req, res) => {
  const { cantidad_bolsas, dinero_actual } = req.body;
  const bolsasPorKilo = 25;
  const costoPorKilo = 106;
  const precioPorBolsa = 10;

  const kilos_calculados = cantidad_bolsas / bolsasPorKilo;
  const costo_total = kilos_calculados * costoPorKilo;
  const ingreso_esperado = cantidad_bolsas * precioPorBolsa;
  const ganancia_esperada = ingreso_esperado - costo_total;

  try {
    const cotizacion = await pool.query(
      `INSERT INTO cotizaciones 
       (cantidad_bolsas, kilos_calculados, costo_total, ingreso_esperado, ganancia_esperada) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [cantidad_bolsas, kilos_calculados, costo_total, ingreso_esperado, ganancia_esperada]
    );

    await pool.query(
      `INSERT INTO finanzas (dinero_actual, dinero_esperado) VALUES ($1, $2)`,
      [dinero_actual, ingreso_esperado]
    );

    res.status(201).json(cotizacion.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
