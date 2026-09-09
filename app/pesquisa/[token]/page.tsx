import { prisma } from "@/lib/prisma";
import { getTipoPesquisa } from "@/lib/perguntas";
import FormularioPesquisa from "@/components/FormularioPesquisa";

export default async function PaginaPesquisa({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const pesquisa = await prisma.pesquisa.findUnique({
    where: { token },
    include: { obra: true },
  });

  const tipo = pesquisa ? getTipoPesquisa(pesquisa.tipoPesquisa) : undefined;

  return (
    <main className="flex flex-1 flex-col items-center bg-[color:var(--papel)] px-4 py-10">
      <div className="w-full max-w-lg">
        <header className="mb-6 text-center">
          <img src="/logo.png" alt="Logo da empresa" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="font-display text-2xl font-bold text-[color:var(--blueprint)]">
            Pesquisa de satisfação
          </h1>
          {pesquisa && (
            <p className="mt-1 text-[color:var(--concreto)]">
              {tipo?.nome} · Obra: <strong>{pesquisa.obra.nome}</strong>
            </p>
          )}
        </header>

        <div className="rounded-lg border border-[color:var(--concreto-claro)] bg-[color:var(--papel-card)] p-6 shadow-sm">
          {!pesquisa || !tipo ? (
            <p className="text-[color:var(--concreto)]">
              Este link de pesquisa não é válido. Verifique se o endereço foi copiado
              corretamente.
            </p>
          ) : pesquisa.status === "RESPONDIDA" ? (
            <p className="text-[color:var(--concreto)]">
              Esta pesquisa já foi respondida. Obrigado pela sua participação!
            </p>
          ) : (
            <FormularioPesquisa
              token={token}
              obraNome={pesquisa.obra.nome}
              responsavelAtendimento={pesquisa.responsavelAtendimento}
              clienteNomeInicial={pesquisa.clienteNome}
              criterios={tipo.criterios}
            />
          )}
        </div>
      </div>
    </main>
  );
}
