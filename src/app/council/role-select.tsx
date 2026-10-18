"use client";

import { useRef } from "react";
import { setRoleAction } from "./actions";
import c from "./council.module.css";

// Выбор роли участника: изменение сразу отправляется на сервер.
export function RoleSelect({ id, role, locked }: { id: string; role: string; locked: boolean }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setRoleAction}>
      <input type="hidden" name="id" value={id} />
      <select
        name="role"
        defaultValue={role}
        className={c.roleSelect}
        disabled={locked}
        title={locked ? "Единственного члена совета нельзя снять с роли" : undefined}
        onChange={() => form.current?.requestSubmit()}
        aria-label="Роль"
      >
        <option value="member">Участник</option>
        <option value="expert">Эксперт</option>
        <option value="council">Экспертный совет</option>
      </select>
    </form>
  );
}
