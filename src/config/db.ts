import dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("Database connection successful");
    client.release();
  } catch (error) {
    console.error("Unable to connect to the database", error);
    process.exit(1);
  }
};
