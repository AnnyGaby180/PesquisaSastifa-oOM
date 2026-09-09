import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estaAutenticado, hashSenha } from "@/lib/auth";

export async function GET() {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const usuarios = await prisma.usuario.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { nome, email, senha } = await req.json();

  if (!nome?.trim() || !email?.trim() || !senha || senha.length < 6) {
    return NextResponse.json(
      { erro: "Preencha nome, e-mail e uma senha com pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const emailNormalizado = email.trim().toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });
  if (existente) {
    return NextResponse.json({ erro: "Já existe um usuário com esse e-mail." }, { status: 409 });
  }

  const senhaHash = await hashSenha(senha);

  const usuario = await prisma.usuario.create({
    data: { nome: nome.trim(), email: emailNormalizado, senhaHash },
    select: { id: true, nome: true, email: true, createdAt: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
