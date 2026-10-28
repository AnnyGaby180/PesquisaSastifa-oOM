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
  etapaId?: string;
  etapaNome?: string;
  link: string;
}): string {
  return `Olá! Tudo bem? 😊

A OM Inc. valoriza muito a sua opinião! Gostaríamos de convidá-lo a participar da nossa pesquisa de satisfação referente ao atendimento que você recebeu. Sua avaliação é muito importante para aprimorarmos continuamente a qualidade dos nossos serviços.

Contamos com você! 💙

🔗 ${opcoes.link}`;
}
