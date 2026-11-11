// Этапы сделки по отклику. Куратор двигает этап вручную; порядок совпадает со сценарием сделки в презентациях.
export const DEAL_STAGES = {
  new: "Новый отклик",
  connected: "Стороны связаны",
  expertise: "Экспертиза",
  contract: "Договор",
  payment: "Деньги в банке",
  handover: "Передача",
  closed: "Сделка закрыта",
  cancelled: "Отменена",
} as const;

export type DealStage = keyof typeof DEAL_STAGES;

export function isDealStage(x: string): x is DealStage {
  return Object.hasOwn(DEAL_STAGES, x);
}

// Открытая сделка остаётся в рабочем списке куратора.
export function isOpenStage(s: DealStage): boolean {
  return s !== "closed" && s !== "cancelled";
}

// Ранние отклики хранят только status: new или handled.
export function stageOf(i: { stage?: DealStage; status: "new" | "handled" }): DealStage {
  return i.stage ?? (i.status === "handled" ? "connected" : "new");
}

// Как совет убедился в личности при подтверждении участия. Сканы документов клуб не хранит.
export const CHECK_METHODS = {
  passport_in_person: "Паспорт, лично",
  video_call: "Видеозвонок с документом",
  agent_confirmed: "Подтвердил агент",
  known_personally: "Знаком лично члену совета",
} as const;

export type CheckMethod = keyof typeof CHECK_METHODS;

export function isCheckMethod(x: string): x is CheckMethod {
  return Object.hasOwn(CHECK_METHODS, x);
}
