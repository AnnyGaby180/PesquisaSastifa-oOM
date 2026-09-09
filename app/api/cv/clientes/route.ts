import { NextRequest, NextResponse } from "next/server";
import { estaAutenticado } from "@/lib/auth";
import { buscarClienteCV, buscarEmpreendimentoClienteCV } from "@/lib/cvcrm";

// GET /api/cv/clientes?telefone=...  (ou ?documento=... / ?email=...)
// Usado no painel (ao gerar um novo link de pesquisa) para puxar o nome do
// cliente automaticamente a partir do telefone informado, buscando no CV CRM.
export async function GET(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const telefone = searchParams.get("telefone") || undefined;
  const documento = searchParams.get("documento") || undefined;
  const email = searchParams.get("email") || undefined;

  if (!telefone && !documento && !email) {
    return NextResponse.json(
      { erro: "Informe telefone, documento ou email para buscar." },
      { status: 400 }
    );
  }

  const cliente = await buscarClienteCV({ telefone, documento, email });

  if (!cliente) {
    return NextResponse.json({ encontrado: false });
  }

  // Usa o documento que veio na busca (se foi por CPF/CNPJ) ou o documento
  // que o próprio cadastro do cliente no CV já tem, pra descobrir o
  // empreendimento — funciona mesmo quando a busca original foi só por
  // telefone ou e-mail.
  const documentoParaObra = documento || (cliente.documento as string | undefined);
  const obraCv = documentoParaObra
    ? await buscarEmpreendimentoClienteCV(documentoParaObra)
    : null;

  return NextResponse.json({
    encontrado: true,
    idclienteCv: cliente.idcliente ?? cliente.idpessoa ?? cliente.idpessoa_int ?? null,
    nome: cliente.nome,
    telefone: cliente.celular || cliente.telefone || null,
    email: cliente.email || null,
    obraCv: obraCv ? { nome: obraCv.nome, idempreendimentoCv: obraCv.idempreendimentoCv } : null,
  });
}
