import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const skillsTable = pgTable("skills", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  systemPromptAddition: text("system_prompt_addition"),
  icon: text("icon").notNull().default("⚡"),
  activeStatus: boolean("active_status").notNull().default(true),
  isPlatformExclusive: boolean("is_platform_exclusive").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const skillActivationsTable = pgTable("skill_activations", {
  id: serial("id").primaryKey(),
  skillId: integer("skill_id").notNull().references(() => skillsTable.id),
  userId: integer("user_id"),
  systemInstanceId: integer("system_instance_id"),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
});
