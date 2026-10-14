export function linkWhatsapp(telefoneBruto: string, mensagem: string): string {
  const somenteDigitos = telefoneBruto.replace(/\D/g, "");
  const comCodigoPais = somenteDigitos.startsWith("55")
    ? somenteDigitos
    : `55${somenteDigitos}`;
  return `https://wa.me/${comCodigoPais}?text=${encodeURIComponent(mensagem)}`;
}

// Texto padrão do convite para o cliente responder a pesquisa.
// Usado no formulário de nova pesquisa e na tabela do painel.
export function mensagemConvitePesquisa(opcoes: {
  clienteNome?: string | null;
  etapaId: string;
  etapaNome: string;
  link: string;
}): string {
  const primeiroNome = opcoes.clienteNome?.trim().split(" ")[0];
  const saudacao = primeiroNome
    ? `Olá, ${primeiroNome}, tudo bem? Aqui é da O.M. Incorporadora.`
    : "Olá, tudo bem? Aqui é da O.M. Incorporadora.";
  const abertura =
    opcoes.etapaId === "renegociacao"
      ? "Agradecemos por conversar com a gente sobre a renegociação do seu contrato!"
      : `Queremos saber como foi a sua experiência na etapa "${opcoes.etapaNome}".`;

  return `${saudacao}\n\n${abertura} Sua opinião é muito importante para melhorarmos o nosso atendimento.\n\nPode nos ajudar respondendo uma pesquisa rápida, de cerca de 2 minutos? É só acessar o link abaixo:\n\n${opcoes.link}\n\nAgradecemos desde já!`;
}
