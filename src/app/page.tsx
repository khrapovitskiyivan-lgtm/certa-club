import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/server/auth";
import { Hero } from "./hero";

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <MemberRedirect />
      </Suspense>
    </>
  );
}

// Вошедший участник не смотрит заставку: сразу в клуб.
async function MemberRedirect() {
  await connection();
  const m = await currentMember();
  if (m) redirect(m.role === "council" ? "/council" : m.status === "awaiting_kyc" ? "/verify" : "/club");
  return null;
}
