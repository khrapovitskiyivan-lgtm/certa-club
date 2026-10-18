import Link from "next/link";
import type { Member } from "@/server/store";
import { logout } from "../auth-actions";
import s from "../invite/invite.module.css";
import c from "./club.module.css";

// Шапка клуба: разделы витрины, кабинет совета для совета, выход.
export function ClubHeader({ me }: { me: Member }) {
  return (
    <header className={c.header}>
      <Link href="/club" className={s.mark}>
        Certa
      </Link>
      <nav className={c.nav}>
        <Link href="/club">Предложения</Link>
        <Link href="/club?tab=requests">Ищут в клубе</Link>
        <Link href="/club/new?kind=offer">Предложить вещь</Link>
        <Link href="/club/new?kind=request">Ищу вещь</Link>
        {me.role === "council" && <Link href="/council">Совет</Link>}
        <form action={logout}>
          <button type="submit" className={c.navBtn}>
            Выйти
          </button>
        </form>
      </nav>
    </header>
  );
}
