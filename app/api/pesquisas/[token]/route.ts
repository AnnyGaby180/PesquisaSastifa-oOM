import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularNotaGeral, getTipoPesquisa } from "@/lib/perguntas";
import { registrarAtendimentoCV } from "@/lib/cvcrm";
import { estaAutenticado } from "@/lib/auth";

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
  // Só aceita notas inteiras de 1 a 5 para os critérios da etapa desta pesquisa
  // (ignora qualquer outra chave ou valor estranho enviado por fora do site).
  const criteriosValidos = new Set(
    (getTipoPesquisa(existente.tipoPesquisa)?.criterios ?? []).map((c) => c.id)
  );
  const respostasLimpas: Record<string, number> = {};
  for (const [id, nota] of Object.entries(respostas ?? {})) {
    if (criteriosValidos.has(id) && Number.isInteger(nota) && nota >= 1 && nota <= 5) {
      respostasLimpas[id] = nota;
    }
  }
  if (Object.keys(respostasLimpas).length === 0) {
    return NextResponse.json({ erro: "Responda pelo menos um critério." }, { status: 400 });
  }

  const justificativasLimpas: Record<string, string> = {};
  for (const [id, texto] of Object.entries(justificativas ?? {})) {
    if (criteriosValidos.has(id) && typeof texto === "string" && texto.trim()) {
      justificativasLimpas[id] = texto.trim().slice(0, 1000);
    }
  }
  const comentarioLimpo =
    typeof comentario === "string" ? comentario.trim().slice(0, 2000) : "";
  const nomeLimpo =
    typeof clienteNome === "string" ? clienteNome.trim().slice(0, 200) : "";

const notaGeral = calcularNotaGeral(respostasLimpas);

const atualizada = await prisma.pesquisa.update({
  where: { token },
  data: {
    status: "RESPONDIDA",
    clienteNome: nomeLimpo || existente.clienteNome,
    respostas: respostasLimpas,
    justificativas:
      Object.keys(justificativasLimpas).length > 0 ? justificativasLimpas : undefined,
    comentario: comentarioLimpo || null,
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
  if (comentarioLimpo) partesDescricao.push(`Comentário do cliente: ${comentarioLimpo}`);
  if (Object.keys(justificativasLimpas).length > 0) {
    partesDescricao.push(
      `Justificativas de notas baixas: ${JSON.stringify(justificativasLimpas)}`
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

// Exclui uma pesquisa (ex.: link gerado por engano, ou registro de teste).
// Só quem está logado no painel pode fazer isso.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
  ) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

const { token } = await params;

const existente = await prisma.pesquisa.findUnique({ where: { token } });
  if (!existente) {
    return NextResponse.json({ erro: "Pesquisa não encontrada." }, { status: 404 });
  }

await prisma.pesquisa.delete({ where: { token } });

return NextResponse.json({ ok: true });
}
