"use client";

import { useState } from "react";
import { ESCALA, ESCALA_LABELS, type Criterio } from "@/lib/perguntas";

type Props = {
  token: string;
  obraNome: string;
  responsavelAtendimento: string;
  clienteNomeInicial: string | null;
  criterios: Criterio[];
};

const NOTA_LIMITE_JUSTIFICATIVA = 3;

export default function FormularioPesquisa({
  token,
  obraNome,
  responsavelAtendimento,
  clienteNomeInicial,
  criterios,
}: Props) {
  const [clienteNome, setClienteNome] = useState(clienteNomeInicial || "");
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  const faltam = criterios.filter((c) => !respostas[c.id]).length;

  const criteriosComNotaBaixa = criterios.filter(
    (c) => respostas[c.id] !== undefined && respostas[c.id] < NOTA_LIMITE_JUSTIFICATIVA
  );
  const faltamJustificativas = criteriosComNotaBaixa.filter(
    (c) => !justificativas[c.id]?.trim()
  );

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!clienteNome.trim()) {
      setErro("Por favor, informe seu nome.");
      return;
    }
    if (faltam > 0) {
      setErro("Por favor, responda todos os itens antes de enviar.");
      return;
    }
    if (faltamJustificativas.length > 0) {
      setErro(
        "Por favor, explique o motivo das notas mais baixas antes de enviar (campos marcados abaixo)."
      );
      return;
    }
    if (!aceite) {
      setErro("Você precisa concordar com o uso dos seus dados para continuar.");
      return;
    }

    setEnviando(true);
    const res = await fetch(`/api/pesquisas/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteNome, respostas, justificativas, comentario }),
    });
    setEnviando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível enviar. Tente novamente.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="rounded-lg border-l-4 border-[color:var(--sucesso)] bg-white p-6 shadow-sm">
        <p className="font-display text-lg font-bold text-[color:var(--blueprint)]">
          Obrigado, {clienteNome.split(" ")[0]}!
        </p>
        <p className="mt-1 text-[color:var(--concreto)]">
          Sua avaliação sobre a obra <strong>{obraNome}</strong> foi registrada com sucesso.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
          Seu nome
        </label>
        <input
          value={clienteNome}
          onChange={(e) => setClienteNome(e.target.value)}
          required
          className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
          placeholder="Digite seu nome completo"
        />
      </div>

      <div className="space-y-5">
        {criterios.map((criterio, idx) => {
          const notaAtual = respostas[criterio.id];
          const precisaJustificar =
            notaAtual !== undefined && notaAtual < NOTA_LIMITE_JUSTIFICATIVA;

          return (
            <div
              key={criterio.id}
              className="border-t border-dashed border-[color:var(--concreto-claro)] pt-4 first:border-t-0 first:pt-0"
            >
              <p className="mb-2 text-sm font-medium text-[color:var(--blueprint)]">
                <span className="mr-1 text-[color:var(--concreto-claro)]">
                  {String(idx + 1).padStart(2, "0")}
                </span>{" "}
                {criterio.pergunta}
              </p>
              <div className="flex gap-2">
                {ESCALA.map((nota) => {
                  const selecionado = respostas[criterio.id] === nota;
                  return (
                    <button
                      key={nota}
                      type="button"
                      title={ESCALA_LABELS[nota]}
                      onClick={() => setRespostas((r) => ({ ...r, [criterio.id]: nota }))}
                      className={`h-11 w-11 rounded-md border text-sm font-semibold transition-colors ${
                        selecionado
                          ? "border-[color:var(--laranja)] bg-[color:var(--laranja)] text-white"
                          : "border-[color:var(--concreto-claro)] bg-white text-[color:var(--concreto)] hover:border-[color:var(--linha)]"
                      }`}
                    >
                      {nota}
                    </button>
                  );
                })}
              </div>

              {precisaJustificar && (
                <div className="mt-3 rounded-md border border-[color:var(--alerta)] bg-[color:var(--alerta)]/10 p-3">
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--blueprint)]">
                    Por favor, nos conte o motivo dessa nota:
                  </label>
                  <textarea
                    value={justificativas[criterio.id] || ""}
                    onChange={(e) =>
                      setJustificativas((j) => ({ ...j, [criterio.id]: e.target.value }))
                    }
                    rows={2}
                    required
                    className="w-full rounded-md border border-[color:var(--concreto-claro)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
                    placeholder="Conte o que aconteceu"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
          Comentário (opcional)
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
          placeholder="Conte um pouco mais sobre sua experiência"
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-[color:var(--concreto)]">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Seus dados (nome e respostas) serão usados apenas para fins de melhoria do
          atendimento e não serão compartilhados com terceiros. Ao marcar esta caixa, você
          concorda com esse uso.
        </span>
      </label>

      {erro && <p className="text-sm font-medium text-[color:var(--erro)]">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-[color:var(--laranja)] py-3 font-semibold text-white transition-colors hover:bg-[color:var(--laranja-escuro)] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Enviar avaliação"}
      </button>
      <p className="text-center text-xs text-[color:var(--concreto)]">
        Atendimento realizado por {responsavelAtendimento}
      </p>
    </form>
  );
}
