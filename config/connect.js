import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config(); // load env

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,   // <-- you probably need DB_NAME here
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;

async function getPool() {
  if (pool) return pool; // reuse existing
  try {
    pool = await sql.connect(config);
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ SQL connection error:", err);
    throw err;
  }
}

export async function ExecuteRecordSetQry(qry) {
  const pool = await getPool();
  const result = await pool.request().query(qry);
  return result; // use result.recordset for rows
}

export async function ExecuteQry(qry) {
  const pool = await getPool();
  await pool.request().query(qry);
  return { status: "ok", message: "Query executed successfully." };
}
