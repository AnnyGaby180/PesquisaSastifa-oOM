import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularNotaGeral, getTipoPesquisa } from "@/lib/perguntas";
import { registrarAtendimentoCV } from "@/lib/cvcrm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const pesquisa = await prisma.pesquisa.findUnique({
    where: { token },
    include: { obra: true },
  });

  if (!pesquisa) {
    return NextResponse.json({ erro: "Pesquisa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    status: pesquisa.status,
    obraNome: pesquisa.obra.nome,
    responsavelAtendimento: pesquisa.responsavelAtendimento,
    clienteNome: pesquisa.clienteNome,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { clienteNome, respostas, justificativas, comentario } = body as {
    clienteNome?: string;
    respostas: Record<string, number>;
    justificativas?: Record<string, string>;
    comentario?: string;
  };

  const existente = await prisma.pesquisa.findUnique({ where: { token }, include: { obra: true } });
  if (!existente) {
    return NextResponse.json({ erro: "Pesquisa não encontrada." }, { status: 404 });
  }
  if (existente.status === "RESPONDIDA") {
    return NextResponse.json({ erro: "Esta pesquisa já foi respondida." }, { status: 409 });
  }
  if (!respostas || Object.keys(respostas).length === 0) {
    return NextResponse.json({ erro: "Responda pelo menos um critério." }, { status: 400 });
  }

  const notaGeral = calcularNotaGeral(respostas);

  const atualizada = await prisma.pesquisa.update({
    where: { token },
    data: {
      status: "RESPONDIDA",
      clienteNome: clienteNome?.trim() || existente.clienteNome,
      respostas,
      justificativas:
        justificativas && Object.keys(justificativas).length > 0 ? justificativas : undefined,
      comentario: comentario?.trim() || null,
      notaGeral,
      respondidaEm: new Date(),
    },
  });

  // Envia a resposta de volta ao CV CRM como atendimento (best-effort: não
  // bloqueia nem falha a resposta do cliente se o CV estiver fora do ar ou
  // se a integração ainda não estiver ativada — ver CV_ENVIAR_ATENDIMENTO
  // e o aviso em lib/cvcrm.ts).
  if (existente.clienteCvId || existente.leadCvId) {
    const nomeEtapa = getTipoPesquisa(existente.tipoPesquisa)?.nome || existente.tipoPesquisa;
    const partesDescricao = [
      `Pesquisa de satisfação respondida — etapa "${nomeEtapa}" (obra: ${existente.obra.nome}).`,
      `Responsável pelo atendimento: ${existente.responsavelAtendimento}.`,
    ];
    if (comentario?.trim()) partesDescricao.push(`Comentário do cliente: ${comentario.trim()}`);
    if (justificativas && Object.keys(justificativas).length > 0) {
      partesDescricao.push(
        `Justificativas de notas baixas: ${JSON.stringify(justificativas)}`
      );
    }

    const resultadoCv = await registrarAtendimentoCV({
      idcliente: existente.clienteCvId ?? undefined,
      idlead: existente.leadCvId ?? undefined,
      assunto: `Pesquisa de satisfação — ${nomeEtapa}`,
      descricao: partesDescricao.join("\n"),
      notaGeral,
    });

    if (resultadoCv.ok) {
      await prisma.pesquisa.update({
        where: { token },
        data: { enviadoCvEm: new Date() },
      });
    }
  }

  return NextResponse.json(atualizada);
}
