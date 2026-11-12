// Эксперты клуба: профиль для вкладки «Эксперты». Публикуется только с письменного согласия эксперта.
// Контактов в профиле нет: связь с экспертом только через куратора.
import { z } from "zod";
import type { Category } from "./listing";

// Направления из презентации для экспертов; новое направление появляется вместе с новым экспертом.
export const EXPERT_FIELDS = {
  watches: "Часовое дело",
  art: "Живопись, графика, декоративное искусство",
  gems: "Геммология и ювелирное искусство",
  coins: "Нумизматика",
  icons: "Иконопись и церковное искусство",
  minerals: "Минералогия и палеонтология",
  other: "Другое направление",
} as const;
export type ExpertField = keyof typeof EXPERT_FIELDS;

// Как показывать имя: полностью или инициалами (эксперт выбирает сам).
export const NAME_MODES = { full: "Полное имя", initials: "Инициалы" } as const;
export type NameMode = keyof typeof NAME_MODES;

export type Expert = {
  id: string;
  fullName: string;
  nameMode: NameMode;
  field: ExpertField;
  specialization: string;
  credentials: string;
  experienceYears?: number;
  city: string;
  // Дата, когда совет отметил письменное согласие эксперта на публикацию.
  consentAt?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const expertSchema = z.object({
  fullName: z.string().trim().min(2, "Укажите имя").max(120),
  nameMode: z.enum(keys(NAME_MODES)),
  field: z.enum(keys(EXPERT_FIELDS), { message: "Выберите направление" }),
  specialization: z.string().trim().max(160).default(""),
  credentials: z.string().trim().min(5, "Опишите квалификацию: образование, аттестация, место работы").max(400),
  experienceYears: z
    .union([z.literal(""), z.coerce.number().int().min(0, "От 0 до 70").max(70, "От 0 до 70")])
    .transform((v) => (v === "" ? undefined : v)),
  city: z.string().trim().max(80).default(""),
  consent: z.literal("on").optional(),
  published: z.literal("on").optional(),
});

export type ExpertErrors = Partial<Record<"fullName" | "field" | "credentials" | "experienceYears" | "published", string>>;

export function validateExpert(raw: Record<string, unknown>):
  | { ok: true; data: Omit<Expert, "id" | "createdAt" | "updatedAt" | "consentAt"> & { consent: boolean } }
  | { ok: false; errors: ExpertErrors } {
  const r = expertSchema.safeParse(raw);
  if (!r.success) {
    const errors: ExpertErrors = {};
    for (const i of r.error.issues) {
      const k = i.path[0] as keyof ExpertErrors;
      if (k && !errors[k]) errors[k] = i.message;
    }
    return { ok: false, errors };
  }
  const d = r.data;
  // Опубликовать без согласия эксперта нельзя.
  if (d.published && !d.consent) return { ok: false, errors: { published: "Публикация только с письменного согласия эксперта" } };
  return {
    ok: true,
    data: {
      fullName: d.fullName,
      nameMode: d.nameMode,
      field: d.field,
      specialization: d.specialization,
      credentials: d.credentials,
      experienceYears: d.experienceYears,
      city: d.city,
      consent: Boolean(d.consent),
      published: Boolean(d.published),
    },
  };
}

// Имя на витрине: «Иван Петрович Сидоров» -> «И. П. Сидоров» в режиме инициалов.
export function displayName(e: Pick<Expert, "fullName" | "nameMode">): string {
  if (e.nameMode === "full") return e.fullName;
  const parts = e.fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  // Фамилия считается последним словом, как в «Имя Отчество Фамилия».
  const last = parts.pop()!;
  return `${parts.map((p) => `${p[0].toUpperCase()}.`).join(" ")} ${last}`;
}

// Стаж словами: 1 год, 3 года, 15 лет.
export function yearsText(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? "год" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "года" : "лет";
  return `${n} ${w}`;
}

// Какие направления экспертов отвечают за категорию лота. Порядок: основное направление первым.
const FIELDS_BY_CATEGORY: Record<Category, ExpertField[]> = {
  watches: ["watches"],
  jewelry: ["gems"],
  art: ["art", "icons"],
  collectibles: ["coins", "minerals", "other"],
};

// Эксперты, которых видно у лота: опубликованные с согласия, по направлениям категории, основное направление первым.
export function expertsForCategory<E extends Pick<Expert, "field" | "published" | "consentAt">>(experts: E[], category: Category): E[] {
  const fields = FIELDS_BY_CATEGORY[category];
  return experts
    .filter((e) => e.published && e.consentAt && fields.includes(e.field))
    .sort((a, b) => fields.indexOf(a.field) - fields.indexOf(b.field));
}
