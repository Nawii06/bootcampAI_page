import { sql } from "drizzle-orm";
import { db, pool } from "./index";

async function verify() {
  const result = await db.execute(sql`
    select current_database() as database_name,
           current_user as database_user,
           now() as checked_at
  `);
  console.log("Database connection verified:", result.rows[0]);
}

verify()
  .then(() => pool.end())
  .catch(async (error: unknown) => {
    console.error("Database verification failed:", error);
    await pool.end();
    process.exitCode = 1;
  });

