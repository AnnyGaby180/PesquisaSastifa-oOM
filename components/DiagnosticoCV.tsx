"use client";

import { useState } from "react";

type Teste = {
  nome: string;
  url: string;
  status: number;
  quantidadeDeReservas: number;
  erro: string | null;
  amostraDaResposta: string;
};

type Resultado = {
  configurado: boolean;
  mensagem?: string;
  documentoConsultado?: string;
  testes: Teste[];
};

export default function DiagnosticoCV() {
  const [documento, setDocumento] = useState("");
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState("");

  async function rodar() {
    setRodando(true);
    setErro("");
    setResultado(null);
    try {
      const res = await fetch(
        `/api/cv/diagnostico?documento=${encodeURIComponent(documento)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro || "Não foi possível rodar o diagnóstico.");
        return;
      }
      setResultado(data);
    } catch {
      setErro("Erro de rede ao rodar o diagnóstico.");
    } finally {
      setRodando(false);
    }
  }

  function copiar() {
    if (!resultado) return;
    navigator.clipboard.writeText(JSON.stringify(resultado, null, 2));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function explicar(teste: Teste): { texto: string; cor: string } {
    if (teste.status === 401 || teste.status === 403) {
      return {
        texto: "Sem permissão — o token do CV não tem acesso a este recurso.",
        cor: "var(--erro)",
      };
    }
    if (teste.status === 204 || teste.quantidadeDeReservas === 0) {
      return { texto: "O CV respondeu, mas sem nenhuma reserva.", cor: "var(--laranja)" };
    }
    if (teste.quantidadeDeReservas > 0) {
      return {
        texto: `Funcionou — ${teste.quantidadeDeReservas} reserva(s) retornada(s).`,
        cor: "var(--sucesso)",
      };
    }
    return { texto: `Status ${teste.status}.`, cor: "var(--concreto)" };
  }

  return (
    <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-6 shadow-sm">
      <h1 className="font-display mb-1 text-xl font-bold text-[color:var(--blueprint)]">
        Diagnóstico da integração com o CV
      </h1>
      <p className="mb-5 text-sm text-[color:var(--concreto)]">
        Esta tela testa a API de reservas do CV de várias formas para descobrir por que a
        obra não está sendo preenchida automaticamente. Informe o CPF/CNPJ de um cliente
        que você sabe que tem reserva ou venda no CV.
      </p>

      <div className="flex gap-2">
        <input
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          className="flex-1 rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
          placeholder="CPF ou CNPJ (ex: 783.771.611-68)"
        />
        <button
          onClick={rodar}
          disabled={rodando || !documento.trim()}
          className="whitespace-nowrap rounded-md bg-[color:var(--laranja)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--laranja-escuro)] disabled:opacity-60"
        >
          {rodando ? "Testando..." : "Rodar diagnóstico"}
        </button>
      </div>

      {erro && <p className="mt-3 text-sm font-medium text-[color:var(--erro)]">{erro}</p>}

      {resultado && !resultado.configurado && (
        <p className="mt-4 rounded-md border border-[color:var(--erro)] bg-red-50 p-3 text-sm text-[color:var(--erro)]">
          {resultado.mensagem}
        </p>
      )}

      {resultado?.configurado && (
        <div className="mt-6 space-y-4">
          {resultado.testes.map((teste) => {
            const { texto, cor } = explicar(teste);
            return (
              <div
                key={teste.nome}
                className="rounded-md border border-[color:var(--concreto-claro)] p-3"
              >
                <p className="text-sm font-semibold text-[color:var(--blueprint)]">
                  {teste.nome}
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: cor }}>
                  {texto}
                </p>
                <p className="mt-1 break-all text-xs text-[color:var(--concreto)]">
                  HTTP {teste.status} · {teste.url}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[color:var(--concreto)]">
                    Ver resposta do CV
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded bg-[color:var(--papel)] p-2 text-[11px] leading-snug">
                    {teste.amostraDaResposta}
                  </pre>
                </details>
              </div>
            );
          })}

          <button
            onClick={copiar}
            className="w-full rounded-md bg-[color:var(--blueprint)] py-2 text-sm font-medium text-white hover:bg-[color:var(--blueprint-2)]"
          >
            {copiado ? "Copiado!" : "Copiar resultado completo"}
          </button>
          <p className="text-xs text-[color:var(--concreto)]">
            Clique em copiar e cole o resultado no chat para eu analisar.
          </p>
        </div>
      )}
    </div>
  );
}
