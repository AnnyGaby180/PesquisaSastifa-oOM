"use client";

import { Fragment, useEffect, useState } from "react";

type Usuario = { id: string; nome: string; email: string; createdAt: string };

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [criando, setCriando] = useState(false);

  const [usuarioRedefinindo, setUsuarioRedefinindo] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [erroRedefinir, setErroRedefinir] = useState("");
  const [sucessoRedefinir, setSucessoRedefinir] = useState<string | null>(null);
  const [salvandoRedefinicao, setSalvandoRedefinicao] = useState(false);

  async function redefinirSenha(e: React.FormEvent, usuarioId: string) {
    e.preventDefault();
    setErroRedefinir("");
    setSucessoRedefinir(null);
    setSalvandoRedefinicao(true);

    const res = await fetch(`/api/usuarios/${usuarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: novaSenha }),
    });
    setSalvandoRedefinicao(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroRedefinir(data.erro || "Não foi possível redefinir a senha.");
      return;
    }

    setSucessoRedefinir(usuarioId);
    setNovaSenha("");
    setUsuarioRedefinindo(null);
  }

  async function carregar() {
    const res = await fetch("/api/usuarios");
    if (res.ok) {
      setUsuarios(await res.json());
    }
  }

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const res = await fetch("/api/usuarios");
      if (res.ok && !cancelado) {
        setUsuarios(await res.json());
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCriando(true);

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha }),
    });
    setCriando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível cadastrar o usuário.");
      return;
    }

    setSucesso(`Usuário ${nome} cadastrado com sucesso!`);
    setNome("");
    setEmail("");
    setSenha("");
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-5">
        <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[color:var(--concreto)]">
          Cadastrar novo usuário
        </h2>
        <form onSubmit={criar} className="grid gap-3 sm:grid-cols-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            placeholder="Nome"
            className="rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="E-mail"
            className="rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            placeholder="Senha (mín. 6 caracteres)"
            className="rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
          />
          <div className="sm:col-span-3">
            {erro && <p className="mb-2 text-sm font-medium text-[color:var(--erro)]">{erro}</p>}
            {sucesso && (
              <p className="mb-2 text-sm font-medium text-[color:var(--sucesso)]">{sucesso}</p>
            )}
            <button
              type="submit"
              disabled={criando}
              className="rounded-md bg-[color:var(--laranja)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--laranja-escuro)] disabled:opacity-60"
            >
              {criando ? "Cadastrando..." : "Cadastrar usuário"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-5">
        <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[color:var(--concreto)]">
          Usuários com acesso
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--concreto-claro)] text-left text-xs uppercase tracking-wide text-[color:var(--concreto)]">
              <th className="py-2 pr-3">Nome</th>
              <th className="py-2 pr-3">E-mail</th>
              <th className="py-2 pr-3">Desde</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <Fragment key={u.id}>
                <tr className="border-b border-[color:var(--concreto-claro)]/50">
                  <td className="py-2 pr-3 font-medium text-[color:var(--blueprint)]">{u.nome}</td>
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-2 pr-3">
                    <button
                      onClick={() => {
                        setSucessoRedefinir(null);
                        setErroRedefinir("");
                        setNovaSenha("");
                        setUsuarioRedefinindo(
                          usuarioRedefinindo === u.id ? null : u.id
                        );
                      }}
                      className="text-xs font-medium text-[color:var(--laranja)] hover:underline"
                    >
                      {usuarioRedefinindo === u.id ? "Cancelar" : "Redefinir senha"}
                    </button>
                  </td>
                </tr>
                {usuarioRedefinindo === u.id && (
                  <tr className="border-b border-[color:var(--concreto-claro)]/50 bg-[color:var(--papel)]">
                    <td colSpan={4} className="px-3 py-3">
                      <form
                        onSubmit={(e) => redefinirSenha(e, u.id)}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="password"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          required
                          placeholder={`Nova senha para ${u.nome} (mín. 6 caracteres)`}
                          className="min-w-[260px] rounded-md border border-[color:var(--concreto-claro)] px-3 py-1.5 text-sm outline-none focus:border-[color:var(--linha)]"
                        />
                        <button
                          type="submit"
                          disabled={salvandoRedefinicao}
                          className="rounded-md bg-[color:var(--blueprint)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[color:var(--blueprint-2)] disabled:opacity-60"
                        >
                          {salvandoRedefinicao ? "Salvando..." : "Salvar nova senha"}
                        </button>
                        {erroRedefinir && (
                          <p className="w-full text-sm font-medium text-[color:var(--erro)]">
                            {erroRedefinir}
                          </p>
                        )}
                      </form>
                    </td>
                  </tr>
                )}
                {sucessoRedefinir === u.id && (
                  <tr>
                    <td colSpan={4} className="px-3 pb-2 pt-0">
                      <p className="text-sm font-medium text-[color:var(--sucesso)]">
                        Senha de {u.nome} redefinida com sucesso!
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
