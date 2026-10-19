// Контракт витрины: предложения (продажа) и запросы (поиск). Единый источник правды для форм и сервера.
import { z } from "zod";

export const CATEGORIES = {
  watches: "Часы",
  jewelry: "Ювелирные изделия",
  art: "Искусство",
  collectibles: "Коллекционные предметы",
} as const;
export type Category = keyof typeof CATEGORIES;

export const CURRENCIES = { RUB: "₽", USD: "$", EUR: "€" } as const;
export type Currency = keyof typeof CURRENCIES;

const categoryKeys = Object.keys(CATEGORIES) as [Category, ...Category[]];
const currencyKeys = Object.keys(CURRENCIES) as [Currency, ...Currency[]];

const place = {
  country: z.string().trim().min(2, "Укажите страну").max(60),
  city: z.string().trim().min(2, "Укажите город").max(80),
};

// Сумма из формы: пробелы и запятые допустимы, «1 500 000» тоже.
const amount = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s,]/g, ""))
  .refine((s) => s === "" || /^\d{1,12}$/.test(s), "Только цифры")
  .transform((s) => (s === "" ? undefined : Number(s)));

export const offerSchema = z
  .object({
    category: z.enum(categoryKeys, { message: "Выберите категорию" }),
    title: z.string().trim().min(3, "Коротко назовите вещь").max(120),
    description: z.string().trim().min(10, "Опишите вещь подробнее").max(3000),
    priceOnRequest: z.literal("on").optional(),
    price: amount,
    currency: z.enum(currencyKeys).default("RUB"),
    quiet: z.literal("on").optional(),
    ...place,
  })
  .superRefine((d, ctx) => {
    if (!d.priceOnRequest && d.price === undefined) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Укажите цену или отметьте «по запросу»" });
    }
  });

export const requestSchema = z.object({
  category: z.enum(categoryKeys, { message: "Выберите категорию" }),
  title: z.string().trim().min(3, "Коротко: что ищете").max(120),
  description: z.string().trim().max(3000).optional().default(""),
  budget: amount,
  currency: z.enum(currencyKeys).default("RUB"),
  ...place,
});

export type OfferInput = z.infer<typeof offerSchema>;
export type RequestInput = z.infer<typeof requestSchema>;

export type Listing = {
  id: string;
  kind: "offer" | "request";
  authorId: string;
  // Псевдоним автора на момент публикации: имя не показываем.
  authorPseudonym: string;
  category: Category;
  title: string;
  description: string;
  // offer: цена или «по запросу»; request: бюджет (необязателен).
  amount?: number;
  currency: Currency;
  onRequest?: boolean;
  // Тихий лот: виден только автору и совету, куратор предлагает его лично.
  quiet?: boolean;
  country: string;
  city: string;
  // Адреса фото: /api/file/... (загруженные) или /demo/... (тестовые). Первое фото: обложка.
  photos?: string[];
  // Документы о происхождении: видят только автор и совет.
  docs?: { key: string; name: string }[];
  // Тестовый лот, созданный советом для демонстрации витрины.
  demo?: boolean;
  status: "active" | "withdrawn";
  createdAt: string;
  withdrawnAt?: string;
};

export type FieldErrors = Record<string, string>;

function collect(issues: z.core.$ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!errors[key]) errors[key] = i.message;
  }
  return errors;
}

export function validateOffer(raw: Record<string, unknown>) {
  const r = offerSchema.safeParse(raw);
  return r.success ? ({ ok: true, data: r.data } as const) : ({ ok: false, errors: collect(r.error.issues) } as const);
}

export function validateRequest(raw: Record<string, unknown>) {
  const r = requestSchema.safeParse(raw);
  return r.success ? ({ ok: true, data: r.data } as const) : ({ ok: false, errors: collect(r.error.issues) } as const);
}

// Кто видит объявление в ленте: активные и не тихие; тихие только автору и совету.
export function visibleTo(l: Listing, viewerId: string, isCouncil: boolean): boolean {
  if (l.status !== "active") return isCouncil || l.authorId === viewerId;
  if (l.quiet) return isCouncil || l.authorId === viewerId;
  return true;
}

export function formatAmount(amount: number | undefined, currency: Currency): string {
  if (amount === undefined) return "";
  return `${amount.toLocaleString("ru-RU")} ${CURRENCIES[currency]}`;
}
