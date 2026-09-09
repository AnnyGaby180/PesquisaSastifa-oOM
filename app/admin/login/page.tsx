"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    setCarregando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível entrar.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[color:var(--papel)] p-6">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-8 shadow-sm"
      >
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="Logo da empresa" className="h-24 w-auto" />
        </div>

        <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="mb-4 w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
          placeholder="seu.email@empresa.com"
        />

        <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
          Senha
        </label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          className="mb-4 w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
          placeholder="••••••••"
        />

        {erro && (
          <p className="mb-4 text-sm font-medium text-[color:var(--erro)]">{erro}</p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-md bg-[color:var(--blueprint)] py-2 font-medium text-white transition-colors hover:bg-[color:var(--blueprint-2)] disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
