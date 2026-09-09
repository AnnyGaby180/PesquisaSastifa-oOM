import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarSessaoUsuario, senhaConfere } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json();

  if (!email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (!usuario || !usuario.ativo) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const confere = await senhaConfere(senha, usuario.senhaHash);
  if (!confere) {
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  await criarSessaoUsuario(usuario.id);
  return NextResponse.json({ ok: true, nome: usuario.nome });
}
