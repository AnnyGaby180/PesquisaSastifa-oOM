import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarSessaoUsuario, senhaConfereOuFalsa } from "@/lib/auth";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json().catch(() => ({}));

  if (typeof email !== "string" || typeof senha !== "string" || !email || !senha) {
    return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });

  // Conta bloqueada por excesso de tentativas erradas.
  if (usuario?.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
    return NextResponse.json(
      { erro: `Muitas tentativas incorretas. Tente novamente em ${BLOQUEIO_MINUTOS} minutos.` },
      { status: 429 }
    );
  }

  const confere = await senhaConfereOuFalsa(senha, usuario?.senhaHash ?? null);

  if (!usuario || !usuario.ativo || !confere) {
    if (usuario && usuario.ativo) {
      const falhas = usuario.falhasLogin + 1;
      await prisma.usuario.update({
        where: { id: usuario.id },
        data:
          falhas >= MAX_TENTATIVAS
            ? {
                falhasLogin: 0,
                bloqueadoAte: new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000),
              }
            : { falhasLogin: falhas },
      });
    }
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }

  if (usuario.falhasLogin > 0 || usuario.bloqueadoAte) {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { falhasLogin: 0, bloqueadoAte: null },
    });
  }

  await criarSessaoUsuario(usuario.id);
  return NextResponse.json({ ok: true, nome: usuario.nome });
}
