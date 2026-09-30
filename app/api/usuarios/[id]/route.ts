// Redefinir a senha de um usuário do painel, atualizar o nome, ou
// desativar (remover da lista) um usuário. Só quem já está logado pode
// fazer isso.
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
  const { senha, nome } = await req.json();

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  const data: { senhaHash?: string; nome?: string } = {};

  if (senha !== undefined) {
    if (!senha || senha.length < 6) {
      return NextResponse.json(
        { erro: "A nova senha precisa ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }
    data.senhaHash = await hashSenha(senha);
  }

  if (nome !== undefined) {
    if (!nome.trim()) {
      return NextResponse.json({ erro: "O nome não pode ficar vazio." }, { status: 400 });
    }
    data.nome = nome.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  await prisma.usuario.update({ where: { id }, data });

  return NextResponse.json({ ok: true });
}

// Remove um usuário da lista (desativa, sem apagar de verdade — assim
// nenhuma pesquisa antiga criada por ele fica órfã). Só quem está logado
// pode fazer isso.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  }

  await prisma.usuario.update({ where: { id }, data: { ativo: false } });

  return NextResponse.json({ ok: true });
}
