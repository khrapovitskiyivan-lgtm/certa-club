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

// Как этапы видят стороны сделки: без внутренней кухни куратора, с понятным следующим шагом.
export const PARTY_STAGES: Record<DealStage, { title: string; next: string }> = {
  new: { title: "Куратор изучает отклик", next: "Куратор свяжется с вами в течение суток." },
  connected: { title: "Куратор на связи", next: "Куратор согласует со сторонами условия и осмотр вещи." },
  expertise: { title: "Экспертиза", next: "Независимый эксперт осматривает вещь и готовит письменное заключение." },
  contract: { title: "Договор", next: "Стороны согласуют и подписывают договор купли-продажи." },
  payment: { title: "Деньги в банке", next: "Покупатель вносит сумму через банк. Продавец получит её после передачи вещи." },
  handover: { title: "Передача", next: "Встреча при эксперте: вещь сверяют с заключением и подписывают акт." },
  closed: { title: "Сделка закрыта", next: "Спасибо, что провели сделку в клубе." },
  cancelled: { title: "Сделка остановлена", next: "Подробности сообщит куратор." },
};

// Путь сделки по порядку; отмена в него не входит и показывается отдельно.
export const DEAL_PATH: DealStage[] = ["new", "connected", "expertise", "contract", "payment", "handover", "closed"];

export type DealRole = "buyer" | "seller";

// Кто участник в этой сделке: у предложения откликается покупатель, у запроса «Ищу» откликается продавец.
// null: участник не сторона сделки.
export function dealRole(
  i: { listingKind: "offer" | "request"; authorId: string; fromId: string },
  memberId: string,
): DealRole | null {
  if (memberId === i.fromId) return i.listingKind === "offer" ? "buyer" : "seller";
  if (memberId === i.authorId) return i.listingKind === "offer" ? "seller" : "buyer";
  return null;
}

// Шаги пути с отметкой пройденных: для полосы этапов у сторон.
export function dealSteps(stage: DealStage): { stage: DealStage; state: "done" | "current" | "todo" }[] {
  const at = DEAL_PATH.indexOf(stage);
  return DEAL_PATH.map((s, k) => ({ stage: s, state: stage === "closed" || k < at ? "done" : k === at ? "current" : "todo" }));
}

// Письмо стороне о статусе сделки: роль, текущий этап, следующий шаг и весь путь с отметками.
// Имён другой стороны и заметок куратора здесь нет по построению: функция их не получает.
export function dealStatusMail(
  d: { role: DealRole; pseudonym: string; title: string; stage: DealStage },
  dealsUrl: string,
): { subject: string; text: string } {
  const p = PARTY_STAGES[d.stage];
  const lines = [
    `Здравствуйте, ${d.pseudonym}.`,
    "",
    `${d.role === "buyer" ? "Вы покупаете" : "Вы продаёте"} «${d.title}».`,
    `Сейчас: ${p.title.toLowerCase()}.`,
    p.next,
  ];
  if (d.stage !== "cancelled") {
    lines.push("", "Ход сделки:");
    dealSteps(d.stage).forEach((st, k) => {
      const name = st.stage === "new" ? "Отклик" : DEAL_STAGES[st.stage];
      const mark = st.state === "done" ? "пройдено" : st.state === "current" ? "сейчас" : "";
      lines.push(`${k + 1}. ${name}${mark ? `: ${mark}` : ""}`);
    });
  }
  lines.push("", `Все ваши сделки: ${dealsUrl}`, "", "Вопросы по сделке задавайте куратору, ответив на это письмо.");
  return { subject: `Сделка «${d.title}»: ${p.title.toLowerCase()}`, text: lines.join("\n") };
}

// Статус своего лота для автора: где лот сейчас и что с откликами. Имён откликнувшихся здесь нет.
export function lotStatus(
  l: { status: "pending" | "active" | "rejected" | "withdrawn"; quiet?: boolean; rejectReason?: string | null },
  deals: { stage?: DealStage; status: "new" | "handled" }[],
): { label: string; hint: string; deals: string } {
  const base =
    l.status === "pending"
      ? { label: "На проверке у совета", hint: "Решение обычно в течение суток." }
      : l.status === "rejected"
        ? { label: "Вернули на доработку", hint: `${l.rejectReason ? `Причина: ${l.rejectReason}. ` : ""}Исправьте лот и отправьте снова.` }
        : l.status === "withdrawn"
          ? { label: "Снят", hint: "Лот не виден участникам." }
          : l.quiet
            ? { label: "Тихий лот", hint: "Виден только совету, куратор предлагает его лично." }
            : { label: "На витрине", hint: "Лот видят все участники клуба." };
  const open = deals.map(stageOf).filter(isOpenStage);
  const closed = deals.map(stageOf).filter((s) => s === "closed").length;
  // Самый продвинутый открытый этап: по нему автор понимает, насколько близка продажа.
  const far = open.sort((a, b) => DEAL_PATH.indexOf(b) - DEAL_PATH.indexOf(a))[0];
  const parts = [];
  if (deals.length === 0) parts.push("Откликов пока нет");
  else parts.push(`Откликов: ${deals.length}`);
  if (far) parts.push(`дальше всех: ${PARTY_STAGES[far].title.toLowerCase()}`);
  if (closed) parts.push(`закрыто сделок: ${closed}`);
  return { ...base, deals: parts.join(", ") };
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
