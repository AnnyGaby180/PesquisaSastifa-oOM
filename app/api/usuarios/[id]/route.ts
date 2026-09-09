// Redefinir a senha de um usuário do painel. Só quem já está logado pode
// fazer isso (não é "esqueci minha senha" — é um admin ajudando outro,
// ou trocando a própria senha).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estaAutenticado, hashSenha } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const { senha } = await req.json();

  if (!senha || senha.length < 6) {
    return NextResponse.json(
      { erro: "A nova senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  const senhaHash = await hashSenha(senha);
  await prisma.usuario.update({ where: { id }, data: { senhaHash } });

  return NextResponse.json({ ok: true });
}
