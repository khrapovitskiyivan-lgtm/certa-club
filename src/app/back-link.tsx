import Link from "next/link";
import b from "./back-link.module.css";

// Явный адрес, а не history.back: на страницу часто приходят по ссылке из письма, истории там нет.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={b.back}>
      ← {label}
    </Link>
  );
}
