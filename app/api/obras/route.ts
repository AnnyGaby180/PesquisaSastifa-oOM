import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estaAutenticado } from "@/lib/auth";

export async function GET() {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const obras = await prisma.obra.findMany({ where: { ativa: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(obras);
}

export async function POST(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const { nome, endereco } = await req.json();
  if (!nome || !nome.trim()) {
    return NextResponse.json({ erro: "Informe o nome da obra." }, { status: 400 });
  }
  const obra = await prisma.obra.create({
    data: { nome: nome.trim(), endereco: endereco?.trim() || null },
  });
  return NextResponse.json(obra, { status: 201 });
}
