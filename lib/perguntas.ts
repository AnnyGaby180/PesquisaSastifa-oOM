// Cada etapa da jornada do cliente tem seu próprio conjunto de perguntas.
// Para adicionar, remover ou reescrever uma etapa, edite só a lista
// TIPOS_PESQUISA abaixo — não precisa mexer no banco de dados.

export type Criterio = {
  id: string;
  pergunta: string;
};

export type TipoPesquisa = {
  id: string;
  nome: string;
  criterios: Criterio[];
};

export const TIPOS_PESQUISA: TipoPesquisa[] = [
  {
    id: "pos-venda",
    nome: "Pós-venda",
    criterios: [
      { id: "clareza-imovel", pergunta: "As informações sobre o imóvel foram claras?" },
      { id: "clareza-contrato", pergunta: "As condições do contrato foram explicadas com clareza?" },
    ],
  },
  {
    id: "renegociacao",
    nome: "Renegociação",
    criterios: [
      { id: "atendimento-renegociacao", pergunta: "Como você avalia o seu atendimento durante o processo de renegociação do seu contrato?" },
      { id: "condicoes-renegociacao", pergunta: "As condições aprovadas na renegociação atenderam suas necessidades?" },
    ],
  },
  {
    id: "visita-obra",
    nome: "Visita na obra",
    criterios: [
      { id: "experiencia-visita", pergunta: "Como você avalia sua experiência na visita da obra?" },
      { id: "limpeza-canteiro", pergunta: "Como você avalia a limpeza e organização do canteiro de obras durante sua visita?" },
    ],
  },
  {
    id: "personalizacao",
    nome: "Personalização",
    criterios: [
      { id: "opcoes-acabamento", pergunta: "As opções de acabamento ofertadas atenderam suas expectativas?" },
      { id: "atendimento-personalizacao", pergunta: "Como você avalia o atendimento recebido durante o processo de personalização?" },
    ],
  },
  {
    id: "vistoria",
    nome: "Vistoria",
    criterios: [
      { id: "qualidade-vistoria", pergunta: "Como você avalia a qualidade do imóvel na vistoria?" },
      { id: "horario-vistoria", pergunta: "A vistoria foi iniciada no horário agendado?" },
    ],
  },
  {
    id: "agi",
    nome: "AGI (Assembleia Geral de Instalação)",
    criterios: [
      { id: "conducao-agi", pergunta: "Como você avalia as informações recebidas e a condução da Assembleia Geral de Instalação?" },
      { id: "prazo-entrega-empreendimento", pergunta: "Como você avalia o cumprimento do prazo prometido para a entrega do empreendimento?" },
    ],
  },
  {
    id: "entrega-chaves",
    nome: "Entrega de chaves",
    criterios: [
      { id: "satisfacao-entrega", pergunta: "Qual seu nível de satisfação com o processo de entrega de chaves?" },
      { id: "clareza-orientacoes", pergunta: "As orientações sobre o imóvel foram claras?" },
    ],
  },
  {
    id: "seis-meses-entrega",
    nome: "6 meses após a entrega",
    criterios: [
      { id: "satisfacao-6-meses", pergunta: "Qual é o seu nível de satisfação com o imóvel agora após 6 meses do recebimento?" },
      { id: "atendimento-6-meses", pergunta: "Como você avalia o atendimento recebido para eventuais solicitações durante esse período?" },
    ],
  },
  {
    id: "doze-meses-entrega",
    nome: "1 ano após a entrega",
    criterios: [
      { id: "satisfacao-12-meses", pergunta: "Qual é o seu nível de satisfação com o imóvel agora após 12 meses do recebimento?" },
      { id: "atendimento-12-meses", pergunta: "Como você avalia o atendimento recebido para eventuais solicitações durante esse período?" },
    ],
  },
  {
    id: "assistencia-tecnica",
    nome: "Assistência técnica",
    criterios: [
      { id: "qualidade-reparo", pergunta: "Como você avalia a qualidade do reparo realizado?" },
      { id: "atendimento-tecnico", pergunta: "Como você avalia o atendimento da equipe técnica?" },
    ],
  },
];

export function getTipoPesquisa(id: string): TipoPesquisa | undefined {
  return TIPOS_PESQUISA.find((t) => t.id === id);
}

export const ESCALA = [1, 2, 3, 4, 5] as const;

export const ESCALA_LABELS: Record<number, string> = {
  1: "Muito insatisfeito",
  2: "Insatisfeito",
  3: "Neutro",
  4: "Satisfeito",
  5: "Muito satisfeito",
};

export function calcularNotaGeral(respostas: Record<string, number>): number {
  const valores = Object.values(respostas).filter((v) => typeof v === "number");
  if (valores.length === 0) return 0;
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  return Math.round(((media - 1) / 4) * 10);
}
