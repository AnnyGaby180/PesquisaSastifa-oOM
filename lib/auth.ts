import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "sessao_usuario";

function getSecret() {
  return process.env.SESSION_SECRET || "troque-esta-chave-de-sessao";
}

function assinar(valor: string) {
  const hmac = crypto.createHmac("sha256", getSecret()).update(valor).digest("hex");
  return `${valor}.${hmac}`;
}

function valido(assinado: string): string | null {
  const partes = assinado.split(".");
  const hmac = partes.pop();
  const valor = partes.join(".");
  if (!valor || !hmac) return null;
  const esperado = crypto.createHmac("sha256", getSecret()).update(valor).digest("hex");
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(esperado));
    return ok ? valor : null;
  } catch {
    return null;
  }
}

export async function criarSessaoUsuario(usuarioId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, assinar(usuarioId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getUsuarioIdSessao(): Promise<string | null> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(COOKIE_NAME)?.value;
  if (!valor) return null;
  return valido(valor);
}

export async function estaAutenticado(): Promise<boolean> {
  return (await getUsuarioIdSessao()) !== null;
}

export async function encerrarSessaoAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function senhaConfere(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

// Autenticação simples por chave de API, usada por integrações externas
// (ex.: a intranet) que não têm como fazer login com usuário/senha.
// A chave é enviada no header "x-api-key" e comparada com a variável de
// ambiente INTEGRACAO_API_KEY (ver .env.example).
export function chaveApiValida(chaveRecebida: string | null): boolean {
  const chaveEsperada = process.env.INTEGRACAO_API_KEY;
  if (!chaveEsperada || !chaveRecebida) return false;
  const bufRecebida = Buffer.from(chaveRecebida);
  const bufEsperada = Buffer.from(chaveEsperada);
  if (bufRecebida.length !== bufEsperada.length) return false;
  try {
    return crypto.timingSafeEqual(bufRecebida, bufEsperada);
  } catch {
    return false;
  }
}
