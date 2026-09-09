import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Edite os dados abaixo com o seu nome, e-mail e senha antes de rodar.
const NOME = "Seu Nome";
const EMAIL = "seu.email@empresa.com";
const SENHA = "escolha-uma-senha-forte";

async function main() {
  const emailNormalizado = EMAIL.trim().toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { email: emailNormalizado } });

  if (existente) {
    console.log(`Já existe um usuário com o e-mail ${emailNormalizado}, nada foi criado.`);
    return;
  }

  const senhaHash = await bcrypt.hash(SENHA, 10);
  const usuario = await prisma.usuario.create({
    data: { nome: NOME, email: emailNormalizado, senhaHash },
  });

  console.log(`Usuário criado: ${usuario.nome} (${usuario.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
