This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Meta Conversions API (CAPI) — semi-manual

Integração invisível: quando um lead é movido de etapa **no pipeline configurado** em `META_CAPI_PIPELINE_ID`, o servidor dispara um evento server-side pro pixel Meta do Site Pronto. Melhora o score de correspondência mandando email/telefone/nome hasheados (SHA-256) — coisa que o navegador não envia.

**Disparo**: dentro de `moveLeadAction` (`app/actions/pipeline.ts`), após `logTimeline` e antes de `revalidatePipelinePaths`. Awaited dentro de `try/catch` isolado — falha do CAPI nunca quebra a movimentação do lead.

**De-para etapa → evento** (em `lib/capi-stage-map.ts`):

| Etapa (nome exato) | Evento Meta            |
|--------------------|------------------------|
| `Qualificado`      | `LeadQualificado` (custom) |
| `Fechado`          | `Purchase` (`value=estimated_value` se `> 0`, fallback `497.00 BRL`) |

> ⚠️ Matching é por **nome exato** (case-sensitive). `pipeline_leads.stage` é texto, não FK. Se renomear `Qualificado` ou `Fechado` no UI de configurações, atualize `lib/capi-stage-map.ts` — o sistema emite `console.warn '[CAPI]'` quando detecta nomes mapeados ausentes.

**Idempotência dupla**:
- `event_id = "{lead_id}-{event_name}"` determinístico (Meta deduplica do lado deles).
- Tabela `capi_events_log` com unique `(lead_id, event_name)` no Supabase impede reenvio.
- Sem retry automático nesta versão: 1 tentativa, log do resultado, fim.

**Env vars** (Vercel — Production):
- `META_PIXEL_ID` · `META_CAPI_TOKEN` · `META_CAPI_PIPELINE_ID` (uuid do pipeline alvo)
- `META_TEST_EVENT_CODE` (opcional — preencher só durante teste na aba "Testar eventos"; deixar vazio em prod real)

**Onde NÃO dispara**: webhook de criação de lead (`/api/pipeline/inbound/[token]`) sempre cria na primeira etapa do pipeline, nunca em `Qualificado`/`Fechado`. `setLostReasonAction` e `updateLeadAction` não mudam `stage`.
