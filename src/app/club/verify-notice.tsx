import Link from "next/link";
import type { Member } from "@/server/store";
import s from "../invite/invite.module.css";

// Витрина открыта после регистрации; размещать и откликаться можно только после верификации.
export function VerifyNotice({ me, action }: { me: Member; action: string }) {
  if (me.status === "kyc_submitted") {
    return <p className={s.hint}>Чтобы {action}, нужна верификация. Она на рассмотрении экспертного совета, ждать недолго.</p>;
  }
  return (
    <p className={s.hint}>
      Чтобы {action}, пройдите верификацию: она по стандарту частного банка и нужна один раз.{" "}
      <Link href="/verify" style={{ textDecoration: "underline" }}>
        Пройти верификацию
      </Link>
    </p>
  );
}
