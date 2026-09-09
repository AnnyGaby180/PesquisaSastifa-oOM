import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/auth";
import FormularioNovaPesquisa from "@/components/FormularioNovaPesquisa";

export default async function NovaPesquisaPage() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  return <FormularioNovaPesquisa />;
}
