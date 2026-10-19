import type { Member } from "@/server/store";
import { AppHeader } from "../app-header";

// Шапка витрины: общая шапка клуба с действиями «Предложить» и «Ищу».
export function ClubHeader({ me }: { me: Member }) {
  return <AppHeader me={me} area="club" />;
}
