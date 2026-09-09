import Link from "next/link";
import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import GerenciarUsuarios from "@/components/GerenciarUsuarios";

export default async function UsuariosPage() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Link
        href="/admin"
        className="mb-4 inline-block text-sm text-[color:var(--concreto)] hover:text-[color:var(--blueprint)]"
      >
        ← Voltar ao painel
      </Link>
      <h1 className="font-display mb-6 text-xl font-bold text-[color:var(--blueprint)]">
        Usuários do painel
      </h1>
      <GerenciarUsuarios />
    </main>
  );
}
