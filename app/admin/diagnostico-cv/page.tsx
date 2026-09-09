import Link from "next/link";
import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import DiagnosticoCV from "@/components/DiagnosticoCV";

export default async function DiagnosticoCvPage() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-[color:var(--papel)] px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-[color:var(--concreto)] hover:text-[color:var(--blueprint)]"
        >
          ← Voltar ao painel
        </Link>
        <DiagnosticoCV />
      </div>
    </main>
  );
}
