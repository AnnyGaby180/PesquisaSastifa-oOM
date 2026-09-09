"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Dado = { obra: string; notaMedia: number; respostas: number };

export default function GraficoNotasPorObra({ dados }: { dados: Dado[] }) {
  if (dados.length === 0) {
    return (
      <p className="text-sm text-[color:var(--concreto)]">
        Ainda não há pesquisas respondidas para gerar o gráfico.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d7dde1" vertical={false} />
        <XAxis dataKey="obra" tick={{ fontSize: 12, fill: "#6b7278" }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#6b7278" }} />
        <Tooltip
          formatter={(value, name) => {
            const numero = typeof value === "number" ? value : Number(value);
            return name === "notaMedia" ? [`${numero.toFixed(1)} / 10`, "Nota média"] : [value, name];
          }}
          contentStyle={{ fontSize: 13 }}
        />
        <Bar dataKey="notaMedia" fill="#1d6fb8" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
