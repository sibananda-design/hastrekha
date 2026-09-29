import { z } from "zod";

const text = z.string().trim().default("");

export const MOUNT_NAMES = ["Jupiter", "Saturn", "Sun", "Mercury", "Venus", "Moon", "Mars"] as const;

export const readingSchema = z.object({
  is_valid_palm: z.boolean(),
  quality_issue: z.string().nullable().optional().default(null),
  summary: text,
  lines: z.object({ heart: text, head: text, life: text, fate: text }),
  life_areas: z.object({ career: text, love_marriage: text, health: text, wealth: text }),
  mounts: z
    .array(
      z.object({
        name: z.string(),
        strength: z.string().default("balanced"),
        meaning: text,
      }),
    )
    .default([]),
  traits: z.array(z.string()).default([]),
  remedies: z.object({
    lucky_colour: text,
    lucky_number: z.coerce.number().int().default(0),
    lucky_day: text,
    gemstone: text,
    simple_remedies: z.array(z.string()).default([]),
  }),
  zodiac_sign: text,
});

export type Reading = z.infer<typeof readingSchema>;

/** Only the validity part is needed when the photo is rejected. */
export const validitySchema = z.object({
  is_valid_palm: z.boolean(),
  quality_issue: z.string().nullable().optional(),
});

export const detailsSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date of birth"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  hand: z.enum(["left", "right"]),
});
export type Details = z.infer<typeof detailsSchema>;

export function ageFromDob(dob: string, now = new Date()): number {
  const d = new Date(dob + "T00:00:00");
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function zodiacFromDob(dob: string): string {
  const d = new Date(dob + "T00:00:00");
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  const signs: [number, string][] = [
    [120, "Capricorn"], [219, "Aquarius"], [321, "Pisces"], [420, "Aries"], [521, "Taurus"],
    [621, "Gemini"], [723, "Cancer"], [823, "Leo"], [923, "Virgo"], [1023, "Libra"],
    [1122, "Scorpio"], [1222, "Sagittarius"], [1232, "Capricorn"],
  ];
  return signs.find(([end]) => md < end)?.[1] ?? "Capricorn";
}
