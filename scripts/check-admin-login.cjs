const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

loadEnvConfig(process.cwd());

const ADMIN_EMAIL = "support@drivadocs.com";
const ADMIN_PASSWORD = "AdminPass123!";

function connectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not configured.");

  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return url.toString();
}

async function main() {
  const pool = new Pool({
    connectionString: connectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    max: 1
  });

  try {
    const result = await pool.query(
      'select email, role, "isActive", "passwordHash" from "User" where lower(email)=lower($1)',
      [ADMIN_EMAIL]
    );
    const user = result.rows[0];
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash)
      : false;

    console.log({
      email: ADMIN_EMAIL,
      exists: Boolean(user),
      role: user?.role || null,
      isActive: user?.isActive ?? null,
      hasPassword: Boolean(user?.passwordHash),
      passwordMatches
    });
  } finally {
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.code || "ERROR", error.message || error);
  process.exit(1);
});
