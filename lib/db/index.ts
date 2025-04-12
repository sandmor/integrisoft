import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
pool.on("error", (err: any) => console.error(err));

const client = await pool.connect();

export const db = drizzle(client, { schema });
