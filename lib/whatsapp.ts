export function linkWhatsapp(telefoneBruto: string, mensagem: string): string {
  const somenteDigitos = telefoneBruto.replace(/\D/g, "");
  const comCodigoPais = somenteDigitos.startsWith("55")
    ? somenteDigitos
    : `55${somenteDigitos}`;
  return `https://wa.me/${comCodigoPais}?text=${encodeURIComponent(mensagem)}`;
}
