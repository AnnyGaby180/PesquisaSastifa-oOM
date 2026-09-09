import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estaAutenticado, getUsuarioIdSessao } from "@/lib/auth";
import { getTipoPesquisa } from "@/lib/perguntas";

export async function GET() {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const pesquisas = await prisma.pesquisa.findMany({
    include: { obra: true, criadoPor: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pesquisas);
}

export async function POST(req: NextRequest) {
  const usuarioId = await getUsuarioIdSessao();
  if (!usuarioId) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const {
    obraId,
    tipoPesquisa,
    responsavelAtendimento,
    clienteNome,
    clienteContato,
    idclienteCv,
  } = await req.json();

  if (!obraId || !responsavelAtendimento?.trim()) {
    return NextResponse.json(
      { erro: "Informe a obra e o responsável pelo atendimento." },
      { status: 400 }
    );
  }

  if (!tipoPesquisa || !getTipoPesquisa(tipoPesquisa)) {
    return NextResponse.json({ erro: "Selecione uma etapa de pesquisa válida." }, { status: 400 });
  }

  const pesquisa = await prisma.pesquisa.create({
    data: {
      obraId,
      tipoPesquisa,
      responsavelAtendimento: responsavelAtendimento.trim(),
      clienteNome: clienteNome?.trim() || null,
      clienteContato: clienteContato?.trim() || null,
      clienteCvId: idclienteCv ? String(idclienteCv) : null,
      criadoPorId: usuarioId,
    },
  });

  return NextResponse.json(pesquisa, { status: 201 });
}
