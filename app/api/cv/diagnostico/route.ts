import { NextRequest, NextResponse } from "next/server";
import { estaAutenticado } from "@/lib/auth";
import { diagnosticarReservasCV } from "@/lib/cvcrm";

// GET /api/cv/diagnostico?documento=78377161168
// Roda uma bateria de chamadas na API de reservas do CV e devolve o
// resultado cru de cada uma. Serve pra descobrir por que a busca de
// empreendimento não está retornando nada — roda no servidor Next
// (o computador da Anny), que alcança o CV normalmente.
export async function GET(req: NextRequest) {
  if (!(await estaAutenticado())) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const documento = searchParams.get("documento") || "";

  const resultado = await diagnosticarReservasCV(documento);
  return NextResponse.json(resultado);
}
