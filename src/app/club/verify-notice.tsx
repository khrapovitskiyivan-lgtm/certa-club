import Link from "next/link";
import type { Member } from "@/server/store";
import s from "../invite/invite.module.css";

// Витрина открыта после регистрации; размещать и откликаться можно только после верификации.
export function VerifyNotice({ me, action, next }: { me: Member; action: string; next: string }) {
  if (me.status === "kyc_submitted") {
    return (
      <p className={s.hint}>
        Чтобы {action}, нужна верификация. Она на рассмотрении экспертного совета.{" "}
        <Link href={`/club/verify?next=${encodeURIComponent(next)}`} style={{ textDecoration: "underline" }}>
          Кабинет верификации
        </Link>
      </p>
    );
  }
  return (
    <p className={s.hint}>
      Чтобы {action}, пройдите верификацию: она по стандарту частного банка и нужна один раз.{" "}
      <Link href={`/club/verify?next=${encodeURIComponent(next)}`} style={{ textDecoration: "underline" }}>
        Пройти верификацию
      </Link>
    </p>
  );
}
