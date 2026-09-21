"use client";

import { Fragment, useMemo, useState } from "react";
import { getTipoPesquisa } from "@/lib/perguntas";
import { linkWhatsapp } from "@/lib/whatsapp";

type Pesquisa = {
  id: string;
  token: string;
  status: "PENDENTE" | "RESPONDIDA";
  obra: { nome: string };
  tipoPesquisa: string;
  clienteNome: string | null;
  clienteContato: string | null;
  responsavelAtendimento: string;
  criadoPorNome: string | null;
  notaGeral: number | null;
  dataAtendimento: string;
  respostas: Record<string, number> | null;
  justificativas: Record<string, string> | null;
  comentario: string | null;
};

export default function TabelaPesquisas({ pesquisas: pesquisasIniciais }: { pesquisas: Pesquisa[] }) {
  const [pesquisas, setPesquisas] = useState(pesquisasIniciais);
  const [copiadoToken, setCopiadoToken] = useState<string | null>(null);
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCriador, setFiltroCriador] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [excluindoToken, setExcluindoToken] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState("");

  const obrasUnicas = useMemo(
    () => Array.from(new Set(pesquisas.map((p) => p.obra.nome))).sort(),
    [pesquisas]
  );
  const responsaveisUnicos = useMemo(
    () => Array.from(new Set(pesquisas.map((p) => p.responsavelAtendimento))).sort(),
    [pesquisas]
  );
  const etapasUnicas = useMemo(
    () => Array.from(new Set(pesquisas.map((p) => p.tipoPesquisa))),
    [pesquisas]
  );
  const criadoresUnicos = useMemo(
    () => Array.from(new Set(pesquisas.map((p) => p.criadoPorNome).filter(Boolean))) as string[],
    [pesquisas]
  );

  const pesquisasFiltradas = pesquisas.filter((p) => {
    if (filtroObra && p.obra.nome !== filtroObra) return false;
    if (filtroResponsavel && p.responsavelAtendimento !== filtroResponsavel) return false;
    if (filtroEtapa && p.tipoPesquisa !== filtroEtapa) return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroCriador && p.criadoPorNome !== filtroCriador) return false;
    return true;
  });

  async function excluirPesquisa(p: Pesquisa) {
    const confirmado = window.confirm(
      `Excluir a pesquisa de ${p.clienteNome || "cliente sem nome"} (${p.obra.nome})? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    setErroExclusao("");
    setExcluindoToken(p.token);

    const res = await fetch(`/api/pesquisas/${p.token}`, { method: "DELETE" });

    setExcluindoToken(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroExclusao(data.erro || "Não foi possível excluir a pesquisa.");
      return;
    }

    setPesquisas((atual) => atual.filter((item) => item.token !== p.token));
  }

  function copiarLink(token: string) {
    const url = `${window.location.origin}/pesquisa/${token}`;
    navigator.clipboard.writeText(url);
    setCopiadoToken(token);
    setTimeout(() => setCopiadoToken(null), 1800);
  }

  function limparFiltros() {
    setFiltroObra("");
    setFiltroResponsavel("");
    setFiltroEtapa("");
    setFiltroStatus("");
    setFiltroCriador("");
  }

  const temFiltroAtivo =
    filtroObra || filtroResponsavel || filtroEtapa || filtroStatus || filtroCriador;

  if (pesquisas.length === 0) {
    return (
      <p className="text-sm text-[color:var(--concreto)]">
        Nenhuma pesquisa gerada ainda. Clique em &ldquo;Gerar link de pesquisa&rdquo; para
        começar.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          className="rounded-md border border-[color:var(--concreto-claro)] px-2 py-1.5 text-sm"
        >
          <option value="">Todas as obras</option>
          {obrasUnicas.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={filtroResponsavel}
          onChange={(e) => setFiltroResponsavel(e.target.value)}
          className="rounded-md border border-[color:var(--concreto-claro)] px-2 py-1.5 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {responsaveisUnicos.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
          className="rounded-md border border-[color:var(--concreto-claro)] px-2 py-1.5 text-sm"
        >
          <option value="">Todas as etapas</option>
          {etapasUnicas.map((id) => (
            <option key={id} value={id}>
              {getTipoPesquisa(id)?.nome || id}
            </option>
          ))}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-md border border-[color:var(--concreto-claro)] px-2 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="RESPONDIDA">Respondida</option>
        </select>

        <select
          value={filtroCriador}
          onChange={(e) => setFiltroCriador(e.target.value)}
          className="rounded-md border border-[color:var(--concreto-claro)] px-2 py-1.5 text-sm"
        >
          <option value="">Todos que geraram</option>
          {criadoresUnicos.map((nome) => (
            <option key={nome} value={nome}>
              {nome}
            </option>
          ))}
        </select>

        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="text-sm font-medium text-[color:var(--laranja)] hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {erroExclusao && (
        <p className="mb-3 text-sm font-medium text-[color:var(--erro)]">{erroExclusao}</p>
      )}

      {pesquisasFiltradas.length === 0 ? (
        <p className="text-sm text-[color:var(--concreto)]">
          Nenhuma pesquisa encontrada com esses filtros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--concreto-claro)] text-left text-xs uppercase tracking-wide text-[color:var(--concreto)]">
                <th className="py-2 pr-3">Obra</th>
                <th className="py-2 pr-3">Etapa</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Responsável</th>
                <th className="py-2 pr-3">Gerado por</th>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Nota</th>
                <th className="py-2 pr-3">Link</th>
                <th className="py-2 pr-3"></th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {pesquisasFiltradas.map((p) => {
                const tipo = getTipoPesquisa(p.tipoPesquisa);
                const temJustificativas =
                  p.justificativas && Object.keys(p.justificativas).length > 0;

                return (
                  <Fragment key={p.id}>
                    <tr className="border-b border-[color:var(--concreto-claro)]/50">
                      <td className="py-2 pr-3 font-medium text-[color:var(--blueprint)]">{p.obra.nome}</td>
                      <td className="py-2 pr-3">{tipo?.nome || p.tipoPesquisa}</td>
                      <td className="py-2 pr-3">{p.clienteNome || "—"}</td>
                      <td className="py-2 pr-3">{p.responsavelAtendimento}</td>
                      <td className="py-2 pr-3">{p.criadoPorNome || "—"}</td>
                      <td className="py-2 pr-3">
                        {new Date(p.dataAtendimento).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.status === "RESPONDIDA"
                              ? "bg-[color:var(--sucesso)]/15 text-[color:var(--sucesso)]"
                              : "bg-[color:var(--alerta)]/20 text-[color:var(--alerta)]"
                          }`}
                        >
                          {p.status === "RESPONDIDA" ? "Respondida" : "Pendente"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {p.notaGeral ?? "—"}
                        {temJustificativas && (
                          <span
                            title="Tem justificativa de nota baixa"
                            className="ml-1 inline-block h-2 w-2 rounded-full bg-[color:var(--erro)]"
                          />
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {p.status === "PENDENTE" ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => copiarLink(p.token)}
                              className="rounded-md border border-[color:var(--linha)] px-2 py-1 text-xs font-medium text-[color:var(--blueprint)] hover:bg-[color:var(--linha)]/10"
                            >
                              {copiadoToken === p.token ? "Copiado!" : "Copiar link"}
                            </button>
                            {p.clienteContato && (
                              <a
                                href={linkWhatsapp(
                                  p.clienteContato,
                                  `Olá${p.clienteNome ? `, ${p.clienteNome.split(" ")[0]}` : ""}! Poderia avaliar sua experiência (${
                                    tipo?.nome || ""
                                  })? É rapidinho: ${window.location.origin}/pesquisa/${p.token}`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[#25D366] px-2 py-1 text-xs font-medium text-white hover:bg-[#1fb959]"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[color:var(--concreto)]">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {p.status === "RESPONDIDA" && (
                          <button
                            onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                            className="text-xs font-medium text-[color:var(--laranja)] hover:underline"
                          >
                            {expandido === p.id ? "Fechar" : "Ver detalhes"}
                          </button>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => excluirPesquisa(p)}
                          disabled={excluindoToken === p.token}
                          className="text-xs font-medium text-[color:var(--erro)] hover:underline disabled:opacity-60"
                        >
                          {excluindoToken === p.token ? "Excluindo..." : "Excluir"}
                        </button>
                      </td>
                    </tr>
                    {expandido === p.id && p.status === "RESPONDIDA" && (
                      <tr className="border-b border-[color:var(--concreto-claro)]/50 bg-[color:var(--papel)]">
                        <td colSpan={11} className="px-3 py-4">
                          <div className="space-y-3">
                            {tipo?.criterios.map((c) => (
                              <div key={c.id}>
                                <p className="text-sm font-medium text-[color:var(--blueprint)]">
                                  {c.pergunta}{" "}
                                  <span className="font-bold">— nota {p.respostas?.[c.id] ?? "—"}</span>
                                </p>
                                {p.justificativas?.[c.id] && (
                                  <p className="mt-0.5 rounded-md border-l-2 border-[color:var(--erro)] bg-white px-2 py-1 text-sm text-[color:var(--concreto)]">
                                    &ldquo;{p.justificativas[c.id]}&rdquo;
                                  </p>
                                )}
                              </div>
                            ))}
                            {p.comentario && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--concreto)]">
                                  Comentário geral
                                </p>
                                <p className="text-sm text-[color:var(--concreto)]">{p.comentario}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
