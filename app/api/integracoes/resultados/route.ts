// API pública (protegida por chave) para sistemas externos — como a
// intranet (intra.ominc.com.br) — lerem os resultados das pesquisas de
// satisfação já respondidas.
//
// Autenticação: header "x-api-key" com o valor de INTEGRACAO_API_KEY
// (ver .env.example). Não usa o login do painel, porque é uma integração
// entre sistemas, não uma pessoa.
//
// Exemplo de chamada:
//   GET https://SEU-DOMINIO/api/integracoes/resultados
//   Header: x-api-key: <chave>
//
// Parâmetros opcionais (query string):
//   ?obra=Autoria%20by%20Ornare   -> filtra por nome da obra
//   ?desde=2026-01-01             -> só pesquisas respondidas a partir dessa data (AAAA-MM-DD)
//
// Resposta: JSON com a lista completa de pesquisas RESPONDIDAS, uma por
// registro, já com o nome de cada critério (não só o id interno).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chaveApiValida } from "@/lib/auth";
import { getTipoPesquisa } from "@/lib/perguntas";

export async function GET(req: NextRequest) {
  const chaveRecebida = req.headers.get("x-api-key");
  if (!chaveApiValida(chaveRecebida)) {
    return NextResponse.json({ erro: "Chave de API ausente ou inválida." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const obraFiltro = searchParams.get("obra");
  const desde = searchParams.get("desde");

  const pesquisas = await prisma.pesquisa.findMany({
    where: {
      status: "RESPONDIDA",
      ...(obraFiltro ? { obra: { nome: obraFiltro } } : {}),
      ...(desde ? { respondidaEm: { gte: new Date(desde) } } : {}),
    },
    include: { obra: true, criadoPor: true },
    orderBy: { respondidaEm: "desc" },
  });

  const resultado = pesquisas.map((p) => {
    const tipo = getTipoPesquisa(p.tipoPesquisa);
    const respostas = (p.respostas as Record<string, number> | null) ?? {};
    const justificativas = (p.justificativas as Record<string, string> | null) ?? {};

    return {
      id: p.id,
      obra: p.obra.nome,
      etapa: tipo?.nome || p.tipoPesquisa,
      cliente: p.clienteNome,
      responsavelAtendimento: p.responsavelAtendimento,
      geradoPor: p.criadoPor?.nome ?? null,
      notaGeral: p.notaGeral,
      comentario: p.comentario,
      respostas: (tipo?.criterios ?? []).map((c) => ({
        pergunta: c.pergunta,
        nota: respostas[c.id] ?? null,
        justificativa: justificativas[c.id] ?? null,
      })),
      dataAtendimento: p.dataAtendimento,
      respondidaEm: p.respondidaEm,
    };
  });

  return NextResponse.json({ total: resultado.length, resultados: resultado });
}
