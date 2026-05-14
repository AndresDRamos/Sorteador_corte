// Cliente singleton de SQL Server: gestiona un pool de conexiones reutilizable.
// Lee la configuracion desde variables de entorno (.env).
import sql from 'mssql';

// Configuracion del pool a partir de variables de entorno.
const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    // Encriptacion opcional; por defecto desactivada para entornos locales.
    encrypt: process.env.DB_ENCRYPT === 'true',
    // Permite confiar en certificados self-signed cuando encrypt esta activo.
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

/**
 * Obtiene el pool de conexiones activo. Si no existe o esta cerrado, lo crea.
 * Reutiliza la misma instancia durante la vida del servidor.
 */
export async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }
  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('[sqlClient] conexion a SQL Server establecida');

    // Listener para reconectar si el pool se cierra inesperadamente.
    pool.on('error', (err) => {
      console.error('[sqlClient] error en el pool:', err.message);
      pool = null;
    });

    return pool;
  } catch (err) {
    console.error('[sqlClient] no se pudo conectar a SQL Server:', err.message);
    pool = null;
    throw err;
  }
}

// Exportamos sql para usar sus tipos (NVarChar, etc.) en queries parametrizadas.
export { sql };
