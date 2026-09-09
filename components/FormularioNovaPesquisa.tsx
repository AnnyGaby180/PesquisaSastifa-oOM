"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIPOS_PESQUISA } from "@/lib/perguntas";
import { linkWhatsapp } from "@/lib/whatsapp";

type Obra = { id: string; nome: string };

// Remove acentos, pontuação e deixa em minúsculo, pra comparar o nome do
// empreendimento que vem do CV com o nome da Obra cadastrada aqui — os
// nomes não são idênticos char-a-char (um pode ser a razão social da SPE,
// o outro o nome comercial), então a comparação é por "contém".
function normalizarNomeObra(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function encontrarObraCorrespondente(obras: Obra[], nomeCv: string): Obra | null {
  const alvo = normalizarNomeObra(nomeCv);
  if (!alvo) return null;

  // 1) match exato (depois de normalizar)
  const exata = obras.find((o) => normalizarNomeObra(o.nome) === alvo);
  if (exata) return exata;

  // 2) um nome contém o outro (ex: "Horus Marista" dentro de
  // "SPE Residencial Horus Marista")
  const parcial = obras.find((o) => {
    const nomeObra = normalizarNomeObra(o.nome);
    return nomeObra.includes(alvo) || alvo.includes(nomeObra);
  });
  return parcial ?? null;
}

export default function FormularioNovaPesquisa() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState("");
  const [tipoPesquisa, setTipoPesquisa] = useState(TIPOS_PESQUISA[0].id);
  const [responsavel, setResponsavel] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteContato, setClienteContato] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [clienteEmailBusca, setClienteEmailBusca] = useState("");
  const [idclienteCv, setIdclienteCv] = useState<string | null>(null);
  const [buscandoCv, setBuscandoCv] = useState(false);
  const [statusBuscaCv, setStatusBuscaCv] = useState<"" | "encontrado" | "nao-encontrado">("");
  const [obraCvNome, setObraCvNome] = useState<string | null>(null);
  const [obraCvAutoSelecionada, setObraCvAutoSelecionada] = useState(false);
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const podeBuscarCv =
    clienteContato.trim() || clienteDocumento.trim() || clienteEmailBusca.trim();

  function limparResultadoBuscaCv() {
    setStatusBuscaCv("");
    setIdclienteCv(null);
    setObraCvNome(null);
    setObraCvAutoSelecionada(false);
  }

  async function buscarNoCv() {
    if (!podeBuscarCv) return;
    setBuscandoCv(true);
    setStatusBuscaCv("");
    try {
      const params = new URLSearchParams();
      if (clienteContato.trim()) params.set("telefone", clienteContato.trim());
      if (clienteDocumento.trim()) params.set("documento", clienteDocumento.trim());
      if (clienteEmailBusca.trim()) params.set("email", clienteEmailBusca.trim());

      const res = await fetch(`/api/cv/clientes?${params.toString()}`);
      const data = await res.json();
      if (data.encontrado) {
        setClienteNome(data.nome || clienteNome);
        setIdclienteCv(data.idclienteCv ? String(data.idclienteCv) : null);
        setStatusBuscaCv("encontrado");

        if (data.obraCv?.nome) {
          setObraCvNome(data.obraCv.nome);
          const match = encontrarObraCorrespondente(obras, data.obraCv.nome);
          if (match) {
            setObraId(match.id);
            setObraCvAutoSelecionada(true);
          } else {
            setObraCvAutoSelecionada(false);
          }
        } else {
          setObraCvNome(null);
          setObraCvAutoSelecionada(false);
        }
      } else {
        setIdclienteCv(null);
        setStatusBuscaCv("nao-encontrado");
        setObraCvNome(null);
        setObraCvAutoSelecionada(false);
      }
    } catch {
      setStatusBuscaCv("nao-encontrado");
    } finally {
      setBuscandoCv(false);
    }
  }

  useEffect(() => {
    fetch("/api/obras")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setObras(data);
          if (data.length > 0) setObraId(data[0].id);
        }
      });
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!obraId || !responsavel.trim()) {
      setErro("Selecione a obra e informe o responsável pelo atendimento.");
      return;
    }
    setCriando(true);
    const res = await fetch("/api/pesquisas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        obraId,
        tipoPesquisa,
        responsavelAtendimento: responsavel,
        clienteNome,
        clienteContato,
        idclienteCv,
      }),
    });
    setCriando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.erro || "Não foi possível gerar o link.");
      return;
    }
    const pesquisa = await res.json();
    setLinkGerado(`${window.location.origin}/pesquisa/${pesquisa.token}`);
  }

  function copiar() {
    if (!linkGerado) return;
    navigator.clipboard.writeText(linkGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  const nomeEtapa = TIPOS_PESQUISA.find((t) => t.id === tipoPesquisa)?.nome || "";
  const mensagemWhatsapp = linkGerado
    ? `Olá${clienteNome ? `, ${clienteNome.split(" ")[0]}` : ""}! Poderia avaliar sua experiência (${nomeEtapa})? É rapidinho: ${linkGerado}`
    : "";

  return (
    <main className="flex flex-1 flex-col items-center bg-[color:var(--papel)] px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/admin" className="mb-4 inline-block text-sm text-[color:var(--concreto)] hover:text-[color:var(--blueprint)]">
          ← Voltar ao painel
        </Link>

        <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-6 shadow-sm">
          <h1 className="font-display mb-1 text-xl font-bold text-[color:var(--blueprint)]">
            Gerar link de pesquisa
          </h1>
          <p className="mb-5 text-sm text-[color:var(--concreto)]">
            Preencha os dados do atendimento e envie o link gerado para o cliente responder.
          </p>

          {linkGerado ? (
            <div className="space-y-4">
              <div className="rounded-md border border-[color:var(--sucesso)] bg-[color:var(--sucesso)]/10 p-3 text-sm text-[color:var(--sucesso)]">
                Link gerado com sucesso!
              </div>

              {clienteContato.trim() && (
                <a
                  href={linkWhatsapp(clienteContato, mensagemWhatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-2.5 font-semibold text-white hover:bg-[#1fb959]"
                >
                  Enviar por WhatsApp
                </a>
              )}

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={linkGerado}
                  className="flex-1 rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm"
                />
                <button
                  onClick={copiar}
                  className="rounded-md bg-[color:var(--blueprint)] px-3 py-2 text-sm font-medium text-white hover:bg-[color:var(--blueprint-2)]"
                >
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <button
                onClick={() => {
                  setLinkGerado(null);
                  setResponsavel("");
                  setClienteNome("");
                  setClienteContato("");
                  setClienteDocumento("");
                  setClienteEmailBusca("");
                  setIdclienteCv(null);
                  setStatusBuscaCv("");
                  setObraCvNome(null);
                  setObraCvAutoSelecionada(false);
                }}
                className="text-sm font-medium text-[color:var(--laranja)] hover:underline"
              >
                Gerar outro link
              </button>
            </div>
          ) : (
            <form onSubmit={criar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
                  Obra
                </label>
                <select
                  value={obraId}
                  onChange={(e) => setObraId(e.target.value)}
                  className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
                >
                  {obras.length === 0 && <option value="">Nenhuma obra cadastrada</option>}
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
                {obraCvNome && obraCvAutoSelecionada && (
                  <p className="mt-1 text-xs font-medium text-[color:var(--sucesso)]">
                    Preenchida automaticamente pelo CV ({obraCvNome}). Confira se está certa.
                  </p>
                )}
                {obraCvNome && !obraCvAutoSelecionada && (
                  <p className="mt-1 text-xs font-medium text-[color:var(--laranja)]">
                    O CV indica o empreendimento &quot;{obraCvNome}&quot;, mas não achei uma obra
                    cadastrada com esse nome — selecione manualmente.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
                  Etapa da pesquisa
                </label>
                <select
                  value={tipoPesquisa}
                  onChange={(e) => setTipoPesquisa(e.target.value)}
                  className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
                >
                  {TIPOS_PESQUISA.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
                  Responsável pelo atendimento
                </label>
                <input
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  required
                  className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
                  placeholder="Nome de quem atendeu o cliente"
                />
              </div>

              <div className="rounded-md border border-[color:var(--concreto-claro)] bg-[color:var(--papel)] p-3">
                <p className="mb-2 text-sm font-medium text-[color:var(--concreto)]">
                  Buscar cliente no CV (opcional)
                </p>
                <p className="mb-3 text-xs text-[color:var(--concreto)]">
                  Preencha pelo menos um dos campos abaixo e clique em buscar — o nome do
                  cliente é preenchido automaticamente se ele já existir no CV.
                </p>

                <div className="space-y-2">
                  <input
                    value={clienteContato}
                    onChange={(e) => {
                      setClienteContato(e.target.value);
                      limparResultadoBuscaCv();
                    }}
                    className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
                    placeholder="Telefone (WhatsApp) — (62) 99999-9999"
                  />
                  <input
                    value={clienteDocumento}
                    onChange={(e) => {
                      setClienteDocumento(e.target.value);
                      limparResultadoBuscaCv();
                    }}
                    className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
                    placeholder="CPF ou CNPJ do cliente"
                  />
                  <input
                    value={clienteEmailBusca}
                    onChange={(e) => {
                      setClienteEmailBusca(e.target.value);
                      limparResultadoBuscaCv();
                    }}
                    type="email"
                    className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 text-sm outline-none focus:border-[color:var(--linha)]"
                    placeholder="E-mail do cliente"
                  />
                </div>

                <button
                  type="button"
                  onClick={buscarNoCv}
                  disabled={buscandoCv || !podeBuscarCv}
                  className="mt-3 w-full rounded-md border border-[color:var(--concreto-claro)] py-2 text-sm font-medium text-[color:var(--blueprint)] hover:bg-white disabled:opacity-60"
                >
                  {buscandoCv ? "Buscando..." : "Buscar no CV"}
                </button>

                {statusBuscaCv === "encontrado" && (
                  <p className="mt-2 text-xs font-medium text-[color:var(--sucesso)]">
                    Cliente encontrado no CV — nome preenchido automaticamente.
                  </p>
                )}
                {statusBuscaCv === "nao-encontrado" && (
                  <p className="mt-2 text-xs text-[color:var(--concreto)]">
                    Nenhum cliente encontrado no CV com esses dados. Preencha o nome manualmente.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[color:var(--concreto)]">
                  Nome do cliente (opcional)
                </label>
                <input
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full rounded-md border border-[color:var(--concreto-claro)] px-3 py-2 outline-none focus:border-[color:var(--linha)]"
                  placeholder="Se já souber, preencha; senão o cliente informa"
                />
              </div>

              {erro && <p className="text-sm font-medium text-[color:var(--erro)]">{erro}</p>}

              <button
                type="submit"
                disabled={criando || obras.length === 0}
                className="w-full rounded-md bg-[color:var(--laranja)] py-2.5 font-semibold text-white hover:bg-[color:var(--laranja-escuro)] disabled:opacity-60"
              >
                {criando ? "Gerando..." : "Gerar link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
