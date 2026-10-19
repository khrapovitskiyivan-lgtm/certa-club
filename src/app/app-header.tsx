import Link from "next/link";
import type { Member } from "@/server/store";
import { logout } from "./auth-actions";
import h from "./app-header.module.css";

// Общая шапка клуба и кабинета совета: слева название, справа служебное меню
// (на телефоне под кнопкой «Меню»), в витрине отдельной строкой действия «Предложить» и «Ищу».
export function AppHeader({ me, area }: { me: Member; area: "club" | "council" }) {
  const items = (
    <>
      <span className={h.who}>
        {me.pseudonym}
        {me.role === "council" ? " · совет" : ""}
      </span>
      {area === "club" && me.role === "council" && <Link href="/council">Кабинет совета</Link>}
      {area === "council" && <Link href="/club">Витрина</Link>}
      {area === "club" && me.status !== "active" && <Link href="/club/verify">Верификация</Link>}
      <Link href="/club/password">Пароль</Link>
      <form action={logout}>
        <button type="submit" className={h.linkBtn}>
          Выйти
        </button>
      </form>
    </>
  );

  return (
    <header className={h.header}>
      <div className={h.bar}>
        <Link href={area === "council" ? "/council" : "/club"} className={h.logo}>
          Certa
        </Link>
        <nav className={h.inline} aria-label="Меню">
          {items}
        </nav>
        <details className={h.mobile}>
          <summary>Меню</summary>
          <nav className={h.panel} aria-label="Меню">
            {items}
          </nav>
        </details>
      </div>
      {area === "club" && (
        <div className={h.actions}>
          <Link href="/club/new?kind=offer" className={h.action}>
            Предложить
          </Link>
          <Link href="/club/new?kind=request" className={h.action}>
            Ищу
          </Link>
        </div>
      )}
      {area === "council" && <p className={h.section}>Экспертный совет</p>}
    </header>
  );
}
