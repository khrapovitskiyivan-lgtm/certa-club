"use client";

import { useActionState, useState } from "react";
import { CATEGORIES, CURRENCIES, type Listing } from "@/core/listing";
import { CITY_SUGGESTIONS } from "@/core/phone";
import { createListing, type ListingFormState } from "../actions";
import { LotFiles } from "./lot-files";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

const COUNTRIES = ["Россия", "ОАЭ", "Великобритания", "Кипр", "Швейцария", "Монако", "Франция", "Италия", "Германия", "Турция", "Казахстан", "Армения", "Грузия", "Сербия", "США"];

export function ListingForm({ kind }: { kind: Listing["kind"] }) {
  const [state, action, pending] = useActionState<ListingFormState, FormData>(createListing.bind(null, kind), {});
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [onRequest, setOnRequest] = useState(v.priceOnRequest === "on");
  const isOffer = kind === "offer";

  const err = (k: string) => e[k] && <p className={s.fieldError}>{e[k]}</p>;

  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.group}>
        <div className={s.field}>
          <label htmlFor="category" className={s.label}>
            Категория
          </label>
          <select id="category" name="category" className={s.select} defaultValue={v.category ?? ""}>
            <option value="" disabled>
              Выберите
            </option>
            {Object.entries(CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          {err("category")}
        </div>

        <div className={s.field}>
          <label htmlFor="title" className={s.label}>
            {isOffer ? "Что за вещь" : "Что ищете"}
          </label>
          <input
            id="title"
            name="title"
            className={s.input}
            defaultValue={v.title ?? ""}
            placeholder={isOffer ? "Например: Patek Philippe Nautilus 5711" : "Например: работа Айвазовского, морской пейзаж"}
          />
          {err("title")}
        </div>

        <div className={s.field}>
          <label htmlFor="description" className={s.label}>
            {isOffer ? "Описание" : "Подробности (необязательно)"}
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={3000}
            className={s.input}
            defaultValue={v.description ?? ""}
            placeholder={isOffer ? "Состояние, комплектность, год, история владения, документы" : "Параметры, год, состояние, на что обратить внимание"}
          />
          {err("description")}
        </div>

        <div className={c.row}>
          <div className={s.field}>
            <label htmlFor={isOffer ? "price" : "budget"} className={s.label}>
              {isOffer ? "Цена" : "Бюджет (необязательно)"}
            </label>
            <input
              id={isOffer ? "price" : "budget"}
              name={isOffer ? "price" : "budget"}
              inputMode="numeric"
              className={s.input}
              defaultValue={v[isOffer ? "price" : "budget"] ?? ""}
              disabled={isOffer && onRequest}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="currency" className={s.label}>
              Валюта
            </label>
            <select id="currency" name="currency" className={s.select} defaultValue={v.currency ?? "RUB"}>
              {Object.entries(CURRENCIES).map(([k, sign]) => (
                <option key={k} value={k}>
                  {sign}
                </option>
              ))}
            </select>
          </div>
        </div>
        {err(isOffer ? "price" : "budget")}
        {isOffer && (
          <label className={c.check}>
            <input type="checkbox" name="priceOnRequest" checked={onRequest} onChange={(ev) => setOnRequest(ev.target.checked)} />
            Цена по запросу
          </label>
        )}

        <div className={s.field}>
          <label htmlFor="country" className={s.label}>
            {isOffer ? "Где находится вещь: страна" : "Где удобно получить: страна"}
          </label>
          <input id="country" name="country" list="country-list" className={s.input} defaultValue={v.country ?? ""} />
          <datalist id="country-list">
            {COUNTRIES.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          {err("country")}
        </div>
        <div className={s.field}>
          <label htmlFor="city" className={s.label}>
            Город
          </label>
          <input id="city" name="city" list="city-list" className={s.input} defaultValue={v.city ?? ""} />
          <datalist id="city-list">
            {CITY_SUGGESTIONS.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          <p className={s.hint}>Только страна и город, без точного адреса.</p>
          {err("city")}
        </div>

        {isOffer && <LotFiles />}

        {isOffer && (
          <label className={c.check}>
            <input type="checkbox" name="quiet" defaultChecked={v.quiet === "on"} />
            Тихий лот: не показывать в общей ленте, куратор предложит вещь лично
          </label>
        )}
      </div>

      {state.formError && <p className={s.formError}>{state.formError}</p>}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Публикуем" : isOffer ? "Предложить" : "Разместить запрос"}
      </button>
    </form>
  );
}
