import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const greetingSettingKey = "greetingPopup";

export const defaultGreetingSettings = {
  enabled: true,
  delaySeconds: 8,
  title: "Weekly road check-in",
  message:
    "Hello {{name}}, it is {{day}} today, I wish you the very best of this week. Stay out of trouble and stay safe on the road."
};

const greetingSchema = z.object({
  enabled: z.boolean().default(defaultGreetingSettings.enabled),
  delaySeconds: z.coerce.number().int().min(0).max(3600).default(defaultGreetingSettings.delaySeconds),
  title: z.string().trim().min(1).max(80).default(defaultGreetingSettings.title),
  message: z.string().trim().min(1).max(600).default(defaultGreetingSettings.message)
});

export type GreetingSettings = z.infer<typeof greetingSchema>;

type RawSettingRow = {
  value: unknown;
};

export function normalizeGreetingSettings(value: unknown): GreetingSettings {
  const parsed = greetingSchema.safeParse(value || {});
  if (!parsed.success) return defaultGreetingSettings;
  return parsed.data;
}

export function renderGreetingMessage(template: string, name?: string | null, date = new Date()) {
  const day = new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
  const safeName = name?.trim() || "";
  let message = template.replace(/\{\{\s*day\s*\}\}/gi, day);

  if (safeName) {
    message = message.replace(/\{\{\s*name\s*\}\}/gi, safeName);
  } else {
    message = message
      .replace(/\s*\{\{\s*name\s*\}\}\s*,?/gi, "")
      .replace(/^Hello\s*,/i, "Hello,");
  }

  return message.replace(/\s{2,}/g, " ").trim();
}

export async function getGreetingSettings(prisma: PrismaClient) {
  await ensureSiteSettingTable(prisma);
  const rows = await prisma.$queryRaw<RawSettingRow[]>`
    SELECT "value"
    FROM "SiteSetting"
    WHERE "key" = ${greetingSettingKey}
    LIMIT 1
  `;
  return normalizeGreetingSettings(rows[0]?.value);
}

export async function saveGreetingSettings(prisma: PrismaClient, value: unknown) {
  await ensureSiteSettingTable(prisma);
  const settings = normalizeGreetingSettings(value);
  await prisma.$executeRaw`
    INSERT INTO "SiteSetting" ("key", "value", "createdAt", "updatedAt")
    VALUES (${greetingSettingKey}, ${JSON.stringify(settings)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("key")
    DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP
  `;
  return settings;
}

async function ensureSiteSettingTable(prisma: PrismaClient) {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SiteSetting" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
}
