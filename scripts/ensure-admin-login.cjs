const { loadEnvConfig } = require("@next/env");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

loadEnvConfig(process.cwd());

const ADMIN_EMAIL = "support@drivadocs.com";
const OLD_ADMIN_EMAIL = "drivadocs@gmail.com";
const ADMIN_PASSWORD = "AdminPass123!";
const ADMIN_PHONE = "2349074707624";

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

  const client = await pool.connect();
  try {
    await client.query("begin");

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existing = await client.query(
      'select id,email from "User" where lower(email) in ($1,$2) order by case when lower(email) = $1 then 0 else 1 end limit 1',
      [ADMIN_EMAIL, OLD_ADMIN_EMAIL]
    );

    let userId;
    if (existing.rowCount) {
      userId = existing.rows[0].id;
      await client.query(
        'update "User" set name=$1,email=$2,phone=$3,"passwordHash"=$4,role=$5,"accountType"=$6,"isActive"=true,"updatedAt"=now() where id=$7',
        ["DrivaDocs Admin", ADMIN_EMAIL, ADMIN_PHONE, passwordHash, "SUPER_ADMIN", "INDIVIDUAL", userId]
      );
    } else {
      userId = `admin_${crypto.randomUUID()}`;
      await client.query(
        'insert into "User" (id,name,email,phone,"passwordHash",role,"accountType","isActive","createdAt","updatedAt") values ($1,$2,$3,$4,$5,$6,$7,true,now(),now())',
        [userId, "DrivaDocs Admin", ADMIN_EMAIL, ADMIN_PHONE, passwordHash, "SUPER_ADMIN", "INDIVIDUAL"]
      );
    }

    const adminProfile = await client.query('select id from "AdminUser" where "userId"=$1 limit 1', [userId]);
    if (adminProfile.rowCount) {
      await client.query(
        'update "AdminUser" set role=$1,permissions=$2,"updatedAt"=now() where "userId"=$3',
        ["SUPER_ADMIN", JSON.stringify({
          users: true,
          requests: true,
          pricing: true,
          payments: true,
          notifications: true,
          support: true
        }), userId]
      );
    } else {
      await client.query(
        'insert into "AdminUser" (id,"userId","staffCode",role,permissions,"createdAt","updatedAt") values ($1,$2,$3,$4,$5,now(),now())',
        [`admin_profile_${crypto.randomUUID()}`, userId, `DRV-SUPER-${userId.slice(-6).toUpperCase()}`, "SUPER_ADMIN", JSON.stringify({
          users: true,
          requests: true,
          pricing: true,
          payments: true,
          notifications: true,
          support: true
        })]
      );
    }

    await client.query("commit");
    console.log(`Admin login ready: ${ADMIN_EMAIL}`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
