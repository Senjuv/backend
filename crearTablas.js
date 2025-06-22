const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://gomitas_db_user:qaVGZycKFqN5QZwNiv5QyMYL9WK4r0JX@dpg-d1b6o5odl3ps73ebg2v0-a.oregon-postgres.render.com/gomitas_db',
  ssl: { rejectUnauthorized: false } // importante para Render
});

async function crearTablas() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tiendas (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        direccion TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entregas (
        id SERIAL PRIMARY KEY,
        tienda_id INTEGER REFERENCES tiendas(id) ON DELETE CASCADE,
        cantidad_bolsas INTEGER NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cotizaciones (
        id SERIAL PRIMARY KEY,
        cantidad_bolsas INTEGER NOT NULL,
        kilos_calculados NUMERIC NOT NULL,
        costo_total NUMERIC NOT NULL,
        ingreso_esperado NUMERIC NOT NULL,
        ganancia_esperada NUMERIC NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS finanzas (
        id SERIAL PRIMARY KEY,
        dinero_actual NUMERIC NOT NULL,
        dinero_esperado NUMERIC NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tablas creadas correctamente');
  } catch (error) {
    console.error('❌ Error al crear tablas:', error);
  } finally {
    await pool.end();
  }
}

crearTablas();
