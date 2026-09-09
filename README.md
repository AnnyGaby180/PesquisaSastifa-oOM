# Pesquisa de Satisfação — O.M. Incorporadora

Sistema de pesquisa de satisfação com painel administrativo, login por
usuário, 10 etapas de pesquisa e integração com WhatsApp.

## Configuração inicial (depois de extrair este projeto)

1. `npm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `SESSION_SECRET`
3. `npx prisma migrate dev --name init`
4. Edite `prisma/seed.ts` se quiser mudar os nomes das obras, depois: `npm run seed`
5. Edite `prisma/seed-usuario.ts` com seu nome/e-mail/senha, depois: `npx tsx prisma/seed-usuario.ts`
6. `npm run dev`
7. Acesse `localhost:3000/admin/login`

## Estrutura

- `app/admin` — painel (protegido por login)
- `app/pesquisa/[token]` — formulário público do cliente
- `app/api` — backend
- `lib/perguntas.ts` — as 10 etapas e perguntas (edite aqui para mudar)
- `prisma/schema.prisma` — modelos do banco de dados
- `lib/cvcrm.ts` — integração com o CV CRM

## Integração com o CV CRM

1. Preencha `CV_SUBDOMINIO`, `CV_EMAIL` e `CV_TOKEN` no `.env` (veja `.env.example`).
2. Rode `npx prisma migrate dev --name cvcrm` para criar os campos novos
   (`clienteCvId`, `leadCvId`, `enviadoCvEm`) na tabela de pesquisas.
3. **Buscar clientes automaticamente:** já funciona — na tela "Gerar link de
   pesquisa", preencha telefone, CPF/CNPJ ou e-mail e clique em "Buscar no
   CV". O nome do cliente e, quando possível, a **Obra** também são
   preenchidos automaticamente (buscando as reservas do cliente pelo CPF no
   CV e comparando o nome do empreendimento com as obras cadastradas aqui).
   Se o nome do empreendimento no CV não bater com nenhuma obra cadastrada,
   aparece um aviso e você seleciona manualmente.
4. **Enviar respostas de volta ao CV como atendimento:** o código já existe
   (`registrarAtendimentoCV` em `lib/cvcrm.ts`), mas fica **desativado** por
   padrão (`CV_ENVIAR_ATENDIMENTO="false"`) porque a documentação pública do
   CV não confirma o formato exato do corpo da requisição desse endpoint.
   Antes de ativar (`CV_ENVIAR_ATENDIMENTO="true"`):
   - Teste o endpoint `POST https://om.cvcrm.com.br/api/v1/atendimento/cadastrar`
     manualmente (Postman/Insomnia) com o token real, ou
   - Confirme o formato com o suporte do CV (suporte.cvcrm.com.br).
   - Ajuste o `payload` dentro de `registrarAtendimentoCV` se necessário.

## Integração com outros sistemas (ex.: intranet)

Existe uma API somente-leitura para outro sistema (como a intranet) buscar
os resultados das pesquisas já respondidas: `GET /api/integracoes/resultados`.

- **Autenticação:** header `x-api-key` com o valor de `INTEGRACAO_API_KEY`
  (definido no `.env`). Não usa cookie de login — é pra sistema conversar
  com sistema.
- **Filtros opcionais** (query string): `?obra=Nome%20da%20Obra` e
  `?desde=2026-01-01` (só respostas a partir dessa data).
- **Exemplo:**
  ```
  curl -H "x-api-key: SUA_CHAVE_AQUI" \
    "https://SEU-DOMINIO/api/integracoes/resultados"
  ```
- **Resposta:** JSON `{ total, resultados: [...] }`, com uma pesquisa
  respondida por item (obra, etapa, cliente, notas por pergunta,
  comentário, data). Veja o formato exato em
  `app/api/integracoes/resultados/route.ts`.

Passe a URL do site publicado + a chave de `INTEGRACAO_API_KEY` para quem
cuida do intra.ominc.com.br — é só isso que eles precisam para consumir os
dados.
