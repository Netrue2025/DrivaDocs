const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
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
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: ["error", "warn"]
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: {
        email: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });

    console.log({
      email: ADMIN_EMAIL,
      exists: Boolean(user),
      role: user?.role || null,
      isActive: user?.isActive ?? null,
      hasPassword: Boolean(user?.passwordHash),
      passwordMatches: user?.passwordHash
        ? await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash)
        : false
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.code || error.name || "ERROR", error.message || error);
  process.exit(1);
});
