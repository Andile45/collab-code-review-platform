import { Pool, PoolClient } from "pg";

/**
 * PostgreSQL connection pool.
 * Reads connection config from environment variables.
 * dotenv.config() is called once in server.ts before this module is imported.
 */
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

/**
 * Simple query helper — runs a parameterized query against the pool.
 * @param text  SQL query string with $1, $2… placeholders
 * @param params  Values for the placeholders
 */
export const query = (text: string, params?: any[]) => pool.query(text, params);

/**
 * Execute a set of queries inside a database transaction.
 * Automatically commits on success and rolls back on error.
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query("INSERT INTO ...", [...]);
 *   await client.query("INSERT INTO ...", [...]);
 *   return someValue;
 * });
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test that the database is reachable.
 * Exits the process with code 1 on failure.
 */
export const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();
  } catch (error) {
    console.error("❌ Unable to connect to the database", error);
    process.exit(1);
  }
};
