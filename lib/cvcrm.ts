// Integração com a API do CV CRM (https://desenvolvedor.cvcrm.com.br)
//
// Autenticação: a API v1 do CV usa dois headers simples — "email" (um usuário
// administrativo da conta) e "token" (gerado no painel CV em
// Configurações > Usuários administrativos > [seu usuário] > Token).
// Não é o Bearer Token da v3 (que expira em 6h) — este token de v1 não expira
// sozinho, mas pode ser revogado/renovado manualmente no painel.
//
// Variáveis de ambiente necessárias (ver .env.example):
//   CV_SUBDOMINIO   -> "om" (a conta é om.cvcrm.com.br)
//   CV_EMAIL        -> anny@ominc.com.br
//   CV_TOKEN        -> o token gerado no painel do CV
//   CV_ENVIAR_ATENDIMENTO -> "true" para ativar o envio automático das
//                            respostas da pesquisa como atendimento no CV.
//                            Deixe "false" (ou omitido) até confirmarmos
//                            o formato exato aceito pelo endpoint de criação
//                            (ver aviso na função registrarAtendimentoCV).

type ClienteCV = {
  idpessoa_int?: string;
  idpessoa?: string;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  documento?: string;
  documento_tipo?: string;
  [key: string]: unknown;
};

function getConfigCV() {
  const subdominio = process.env.CV_SUBDOMINIO;
  const email = process.env.CV_EMAIL;
  const token = process.env.CV_TOKEN;

  if (!subdominio || !email || !token) {
    return null;
  }

  return {
    baseUrl: `https://${subdominio}.cvcrm.com.br/api/v1`,
    headers: {
      email,
      token,
      "Content-Type": "application/json",
    } as Record<string, string>,
  };
}

function normalizarTelefone(telefoneBruto: string): string {
  const somenteDigitos = telefoneBruto.replace(/\D/g, "");
  return somenteDigitos.startsWith("55") ? somenteDigitos.slice(2) : somenteDigitos;
}

// Busca um cliente cadastrado no CV por telefone, documento (CPF/CNPJ),
// e-mail ou id interno. É preciso informar pelo menos um desses campos
// (exigência da própria API do CV).
//
// GET /api/v1/cadastros/clientes?telefone=...  (confirmado na documentação)
export async function buscarClienteCV(params: {
  telefone?: string;
  documento?: string;
  email?: string;
  idcliente?: string | number;
}): Promise<ClienteCV | null> {
  const config = getConfigCV();
  if (!config) {
    console.warn("[cvcrm] Variáveis de ambiente do CV CRM não configuradas — pulando busca.");
    return null;
  }

  const query = new URLSearchParams();
  if (params.telefone) query.set("telefone", normalizarTelefone(params.telefone));
  if (params.documento) query.set("documento", params.documento.replace(/\D/g, ""));
  if (params.email) query.set("email", params.email);
  if (params.idcliente) query.set("idcliente", String(params.idcliente));

  if ([...query.keys()].length === 0) {
    return null;
  }

  try {
    const res = await fetch(`${config.baseUrl}/cadastros/clientes?${query.toString()}`, {
      method: "GET",
      headers: config.headers,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[cvcrm] Busca de cliente falhou: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const pessoas: ClienteCV[] = data?.pessoas ?? [];
    return pessoas[0] ?? null;
  } catch (err) {
    console.error("[cvcrm] Erro ao buscar cliente no CV:", err);
    return null;
  }
}

type ReservaCV = {
  idproposta_cv?: number;
  unidade?: {
    empreendimento?: string;
    idempreendimento_cv?: number | string;
    idempreendimento_int?: string;
  };
  titular?: { nome?: string; documento?: string };
  titulares?: Array<{ nome?: string; documento?: string }>;
  situacao?: { idsituacao?: number; situacao?: string };
  data?: string;
  data_venda?: string;
  [key: string]: unknown;
};

function apenasDigitos(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

// A resposta do CV para listas varia de conta pra conta: pode ser um array,
// um objeto { "<id>": {...} }, ou vir embrulhada numa chave "dados"/"reservas".
// Esta função aceita todas essas formas e devolve sempre um array.
function extrairListaReservas(data: unknown): ReservaCV[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as ReservaCV[];

  const obj = data as Record<string, unknown>;

  for (const chave of ["dados", "reservas", "registros"]) {
    const valor = obj[chave];
    if (Array.isArray(valor)) return valor as ReservaCV[];
    if (valor && typeof valor === "object") {
      return Object.values(valor as Record<string, unknown>) as ReservaCV[];
    }
  }

  // Formato { "8417": {...}, "8418": {...} } — mas ignora chaves de metadado
  // (total_de_registros, codigo, etc.) que não são objetos de reserva.
  return Object.entries(obj)
    .filter(([, v]) => v && typeof v === "object" && !Array.isArray(v))
    .map(([, v]) => v as ReservaCV);
}

// Todos os documentos (CPF/CNPJ) ligados a uma reserva — titular e demais
// compradores, quando a conta usa a lista "titulares".
function documentosDaReserva(reserva: ReservaCV): string[] {
  const docs: string[] = [];
  if (reserva.titular?.documento) docs.push(apenasDigitos(reserva.titular.documento));
  for (const t of reserva.titulares ?? []) {
    if (t?.documento) docs.push(apenasDigitos(t.documento));
  }
  return docs.filter(Boolean);
}

function empreendimentoDaReserva(
  reserva: ReservaCV
): { nome: string; idempreendimentoCv: string | number } | null {
  const nome = reserva?.unidade?.empreendimento;
  const idempreendimentoCv = reserva?.unidade?.idempreendimento_cv;
  if (!nome || idempreendimentoCv == null) return null;
  return { nome, idempreendimentoCv };
}

// Entre várias reservas do mesmo cliente, prioriza a mais recente que já
// virou venda; se nenhuma tiver data_venda, usa a mais recente em geral.
function escolherReservaMaisRelevante(reservas: ReservaCV[]): ReservaCV | undefined {
  const quando = (r: ReservaCV) => new Date(r.data_venda || r.data || 0).getTime();
  const vendidas = reservas.filter((r) => r.data_venda);
  const candidatas = vendidas.length > 0 ? vendidas : reservas;
  return [...candidatas].sort((a, b) => quando(b) - quando(a))[0];
}

type RespostaReservas = {
  url: string;
  status: number;
  ok: boolean;
  data: unknown;
  quantidade: number;
  erro?: string;
};

async function chamarReservasCV(filtros: Record<string, string>): Promise<RespostaReservas> {
  const config = getConfigCV();
  const url = config
    ? `${config.baseUrl}/comercial/reservas?${new URLSearchParams(filtros).toString()}`
    : "(sem configuração do CV)";

  if (!config) {
    return { url, status: 0, ok: false, data: null, quantidade: 0, erro: "CV não configurado." };
  }

  try {
    const res = await fetch(url, { method: "GET", headers: config.headers, cache: "no-store" });

    if (res.status === 204) {
      return { url, status: 204, ok: true, data: null, quantidade: 0 };
    }

    const texto = await res.text();
    let data: unknown = null;
    try {
      data = texto ? JSON.parse(texto) : null;
    } catch {
      return {
        url,
        status: res.status,
        ok: false,
        data: texto.slice(0, 1000),
        quantidade: 0,
        erro: "Resposta não é JSON válido.",
      };
    }

    if (!res.ok) {
      return { url, status: res.status, ok: false, data, quantidade: 0, erro: res.statusText };
    }

    return { url, status: res.status, ok: true, data, quantidade: extrairListaReservas(data).length };
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      data: null,
      quantidade: 0,
      erro: err instanceof Error ? err.message : "Erro desconhecido.",
    };
  }
}

// --- Plano B: índice local de reservas ---------------------------------
// Se o filtro por documento do CV não funcionar nesta conta, percorremos a
// lista de reservas paginada uma vez e montamos um índice
// documento -> empreendimento em memória. Fica em cache por alguns minutos
// para não refazer a varredura a cada busca.

const REGISTROS_POR_PAGINA = 200;
const MAX_PAGINAS = 25; // teto de segurança: 5.000 reservas
const CACHE_MS = 10 * 60 * 1000;

let indiceCache: {
  emQue: number;
  porDocumento: Map<string, ReservaCV[]>;
} | null = null;

async function getIndiceReservasPorDocumento(): Promise<Map<string, ReservaCV[]>> {
  if (indiceCache && Date.now() - indiceCache.emQue < CACHE_MS) {
    return indiceCache.porDocumento;
  }

  const porDocumento = new Map<string, ReservaCV[]>();
  let total = 0;

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const resposta = await chamarReservasCV({
      pagina: String(pagina),
      registros_por_pagina: String(REGISTROS_POR_PAGINA),
      retornar_integradas: "1",
    });

    if (!resposta.ok) {
      console.warn(
        `[cvcrm] Índice de reservas: página ${pagina} falhou (${resposta.status}) — ${resposta.erro ?? ""}`
      );
      break;
    }

    const reservas = extrairListaReservas(resposta.data);
    if (reservas.length === 0) break;

    for (const reserva of reservas) {
      for (const doc of documentosDaReserva(reserva)) {
        const lista = porDocumento.get(doc) ?? [];
        lista.push(reserva);
        porDocumento.set(doc, lista);
      }
    }

    total += reservas.length;
    if (reservas.length < REGISTROS_POR_PAGINA) break;

    if (pagina === MAX_PAGINAS) {
      console.warn(
        `[cvcrm] Índice de reservas: parei no teto de ${MAX_PAGINAS} páginas (${total} reservas). Pode haver reservas não indexadas.`
      );
    }
  }

  console.info(
    `[cvcrm] Índice de reservas montado: ${total} reservas, ${porDocumento.size} documentos distintos.`
  );

  indiceCache = { emQue: Date.now(), porDocumento };
  return porDocumento;
}

// Busca o empreendimento/obra ligado a um cliente pelo CPF/CNPJ.
//
// Caminho 1 (rápido): GET /comercial/reservas?documento=... — em algumas
// contas do CV esse filtro devolve 204 mesmo existindo reserva, então:
// Caminho 2 (plano B): varre a lista de reservas paginada e casa pelo
// documento do titular, usando um índice em cache.
export async function buscarEmpreendimentoClienteCV(
  documento: string
): Promise<{ nome: string; idempreendimentoCv: string | number } | null> {
  const config = getConfigCV();
  if (!config || !documento) return null;

  const documentoLimpo = apenasDigitos(documento);
  if (!documentoLimpo) return null;

  // Caminho 1 — filtro nativo do CV, em algumas variações de formato.
  const tentativas: Record<string, string>[] = [
    { documento: documentoLimpo, retornar_integradas: "1" },
    { documento: documento.trim(), retornar_integradas: "1" }, // formatado, com pontos
    { documento: documentoLimpo },
  ];

  for (const filtros of tentativas) {
    const resposta = await chamarReservasCV(filtros);
    if (resposta.ok && resposta.quantidade > 0) {
      const escolhida = escolherReservaMaisRelevante(extrairListaReservas(resposta.data));
      const empreendimento = escolhida ? empreendimentoDaReserva(escolhida) : null;
      if (empreendimento) {
        console.info(`[cvcrm] Empreendimento achado pelo filtro nativo: ${resposta.url}`);
        return empreendimento;
      }
    }
  }

  // Caminho 2 — índice local.
  console.info(
    `[cvcrm] Filtro por documento não retornou nada para ${documentoLimpo}; tentando pelo índice de reservas.`
  );

  try {
    const indice = await getIndiceReservasPorDocumento();
    const reservas = indice.get(documentoLimpo);

    if (!reservas || reservas.length === 0) {
      console.warn(`[cvcrm] Nenhuma reserva no índice para o documento ${documentoLimpo}.`);
      return null;
    }

    const escolhida = escolherReservaMaisRelevante(reservas);
    const empreendimento = escolhida ? empreendimentoDaReserva(escolhida) : null;

    if (!empreendimento) {
      console.warn(
        `[cvcrm] Reserva no índice sem nome/id de empreendimento: ${JSON.stringify(escolhida).slice(0, 500)}`
      );
      return null;
    }

    console.info(`[cvcrm] Empreendimento achado pelo índice: ${empreendimento.nome}`);
    return empreendimento;
  } catch (err) {
    console.error("[cvcrm] Erro ao consultar o índice de reservas:", err);
    return null;
  }
}

// Bateria de testes usada pela tela /admin/diagnostico-cv. Roda várias
// chamadas na API de reservas e devolve o resultado cru de cada uma, pra
// identificar por que a busca de empreendimento não retorna nada.
export async function diagnosticarReservasCV(documento: string) {
  const config = getConfigCV();
  if (!config) {
    return {
      configurado: false,
      mensagem:
        "As variáveis CV_SUBDOMINIO, CV_EMAIL e CV_TOKEN não estão preenchidas no arquivo .env.",
      testes: [],
    };
  }

  const documentoLimpo = apenasDigitos(documento);

  const testes: Array<{ nome: string; filtros: Record<string, string> }> = [
    {
      nome: "1. Listar reservas SEM nenhum filtro (o endpoint funciona?)",
      filtros: { pagina: "1", registros_por_pagina: "3" },
    },
    {
      nome: "2. Listar reservas incluindo já integradas/vendidas",
      filtros: { pagina: "1", registros_por_pagina: "3", retornar_integradas: "1" },
    },
    {
      nome: "3. Filtrar pelo documento (só números)",
      filtros: { documento: documentoLimpo, retornar_integradas: "1" },
    },
    {
      nome: "4. Filtrar pelo documento (formatado, com pontos)",
      filtros: { documento: documento.trim(), retornar_integradas: "1" },
    },
  ];

  const resultados = [];
  for (const teste of testes) {
    if (teste.filtros.documento === "" ) continue;
    const resposta = await chamarReservasCV(teste.filtros);
    resultados.push({
      nome: teste.nome,
      url: resposta.url.replace(config.baseUrl, "…"),
      status: resposta.status,
      quantidadeDeReservas: resposta.quantidade,
      erro: resposta.erro ?? null,
      // Só um pedaço da resposta, pra não despejar dado de cliente à toa.
      amostraDaResposta: JSON.stringify(resposta.data ?? null).slice(0, 1200),
    });
  }

  return { configurado: true, documentoConsultado: documentoLimpo, testes: resultados };
}


// ⚠️ ATENÇÃO — endpoint ainda não validado em produção.
//
// A documentação pública do CV (desenvolvedor.cvcrm.com.br) confirma que
// existe um endpoint para cadastrar atendimento (mencionado como
// "/atendimento/cadastrar", método POST), mas NÃO publica o schema exato do
// corpo JSON esperado. O payload abaixo é uma tentativa razoável, baseada no
// padrão dos outros endpoints do CV (idlead/idcliente + assunto + descrição),
// mas precisa ser testado (Postman/Insomnia, com o token real) ou confirmado
// com o suporte do CV (suporte.cvcrm.com.br) antes de confiar nele em
// produção. Por isso a função só executa de fato quando
// CV_ENVIAR_ATENDIMENTO=true — deixe desligado até validarmos a resposta.
//
// Quando for testar: chame esta função manualmente com um idlead/idcliente
// real e confira no painel do CV (Relacionar > Atendimentos) se o registro
// apareceu corretamente. Ajuste os nomes dos campos abaixo conforme o
// retorno/erro da API indicar.
export async function registrarAtendimentoCV(params: {
  idcliente?: string | number;
  idlead?: string | number;
  assunto: string; // ex: "Pesquisa de satisfação — Entrega de chaves"
  descricao: string; // corpo da mensagem/observação do atendimento
  notaGeral?: number | null;
}): Promise<{ ok: boolean; status?: number; body?: unknown; erro?: string }> {
  const config = getConfigCV();
  if (!config) {
    return { ok: false, erro: "Variáveis de ambiente do CV CRM não configuradas." };
  }

  if (process.env.CV_ENVIAR_ATENDIMENTO !== "true") {
    console.info("[cvcrm] Envio de atendimento desativado (CV_ENVIAR_ATENDIMENTO != 'true'). Pulando.");
    return { ok: false, erro: "Envio desativado por configuração." };
  }

  if (!params.idcliente && !params.idlead) {
    return { ok: false, erro: "Informe idcliente ou idlead para registrar o atendimento." };
  }

  const payload = {
    idcliente: params.idcliente,
    idlead: params.idlead,
    assunto: params.assunto,
    descricao: params.notaGeral != null
      ? `${params.descricao}\n\nNota geral da pesquisa: ${params.notaGeral}/10`
      : params.descricao,
    origem: "Pesquisa de satisfação (site O.M.)",
  };

  try {
    const res = await fetch(`${config.baseUrl}/atendimento/cadastrar`, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`[cvcrm] Falha ao registrar atendimento: ${res.status}`, body);
      return { ok: false, status: res.status, body, erro: "CV retornou erro." };
    }

    return { ok: true, status: res.status, body };
  } catch (err) {
    console.error("[cvcrm] Erro de rede ao registrar atendimento:", err);
    return { ok: false, erro: err instanceof Error ? err.message : "Erro desconhecido." };
  }
}
