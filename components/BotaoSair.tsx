"use client";

import { useRouter } from "next/navigation";

export default function BotaoSair() {
  const router = useRouter();

  async function sair() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={sair}
      className="text-sm font-medium text-[color:var(--concreto)] hover:text-[color:var(--blueprint)]"
    >
      Sair
    </button>
  );
}
