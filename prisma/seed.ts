import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Suas 4 obras/projetos (nome comercial — o mesmo nome usado no CV CRM
// como "empreendimento", pra bater com a busca automática de obra).
const OBRAS = [
  { nome: "Autoria by Ornare" },
  { nome: "Bossa OM Home" },
  { nome: "Olivier OM Home" },
  { nome: "Dual OM Stay" },
];

async function main() {
  for (const obra of OBRAS) {
    const existente = await prisma.obra.findFirst({ where: { nome: obra.nome } });
    if (!existente) {
      await prisma.obra.create({ data: obra });
      console.log(`Obra criada: ${obra.nome}`);
    } else {
      console.log(`Obra já existe, pulando: ${obra.nome}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
