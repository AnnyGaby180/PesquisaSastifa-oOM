import Link from "next/link";
import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TabelaPesquisas from "@/components/TabelaPesquisas";
import GraficoNotasPorObra from "@/components/GraficoNotasPorObra";
import BotaoSair from "@/components/BotaoSair";

export default async function PainelAdmin() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  const pesquisas = await prisma.pesquisa.findMany({
    include: { obra: true, criadoPor: true },
    orderBy: { createdAt: "desc" },
  });

  const respondidas = pesquisas.filter((p) => p.status === "RESPONDIDA");
  const notaMediaGeral =
    respondidas.length > 0
      ? respondidas.reduce((acc, p) => acc + (p.notaGeral || 0), 0) / respondidas.length
      : null;
  const taxaResposta =
    pesquisas.length > 0 ? Math.round((respondidas.length / pesquisas.length) * 100) : 0;

  const obrasNomes = Array.from(new Set(respondidas.map((p) => p.obra.nome)));
  const dadosGrafico = obrasNomes.map((nome) => {
    const doObra = respondidas.filter((p) => p.obra.nome === nome);
    const media = doObra.reduce((acc, p) => acc + (p.notaGeral || 0), 0) / doObra.length;
    return { obra: nome, notaMedia: media, respostas: doObra.length };
  });

  const pesquisasSerializadas = pesquisas.map((p) => ({
    id: p.id,
    token: p.token,
    status: p.status,
    obra: { nome: p.obra.nome },
    tipoPesquisa: p.tipoPesquisa,
    clienteNome: p.clienteNome,
    clienteContato: p.clienteContato,
    responsavelAtendimento: p.responsavelAtendimento,
    criadoPorNome: p.criadoPor?.nome || null,
    notaGeral: p.notaGeral,
    dataAtendimento: p.dataAtendimento.toISOString(),
    respostas: (p.respostas as Record<string, number> | null) || null,
    justificativas: (p.justificativas as Record<string, string> | null) || null,
    comentario: p.comentario,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative border-b border-[color:var(--concreto-claro)] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <img src="/logo.png" alt="Logo da empresa" className="h-16 w-auto" />
        </div>
        <div className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-4">
          <Link
            href="/admin/usuarios"
            className="text-sm font-medium text-[color:var(--concreto)] hover:text-[color:var(--blueprint)]"
          >
            Usuários
          </Link>
          <BotaoSair />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[color:var(--concreto)]">
            Acompanhe a satisfação dos clientes das suas obras.
          </p>
          <Link
            href="/admin/nova"
            className="rounded-md bg-[color:var(--laranja)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--laranja-escuro)]"
          >
            + Gerar link de pesquisa
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CardEstatistica
            label="Nota média geral"
            valor={notaMediaGeral !== null ? notaMediaGeral.toFixed(1) : "—"}
            sufixo="/ 10"
          />
          <CardEstatistica label="Pesquisas respondidas" valor={String(respondidas.length)} />
          <CardEstatistica label="Taxa de resposta" valor={`${taxaResposta}%`} />
        </div>

        <section className="mb-6 rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-5">
          <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[color:var(--concreto)]">
            Nota média por obra
          </h2>
          <GraficoNotasPorObra dados={dadosGrafico} />
        </section>

        <section className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-5">
          <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-wide text-[color:var(--concreto)]">
            Todas as pesquisas
          </h2>
          <TabelaPesquisas pesquisas={pesquisasSerializadas} />
        </section>
      </main>
    </div>
  );
}

function CardEstatistica({
  label,
  valor,
  sufixo,
}: {
  label: string;
  valor: string;
  sufixo?: string;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--concreto)]">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-bold text-[color:var(--blueprint)]">
        {valor} <span className="text-sm font-medium text-[color:var(--concreto)]">{sufixo}</span>
      </p>
    </div>
  );
}
