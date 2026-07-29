# Regras do Projeto

## Stack Tecnológica do Projeto

- **Framework:** Svelte 5 (utilizar Runes: `$state`, `$derived`, `$effect`, `$props`, etc. em vez da sintaxe reativa do Svelte 4).
- **Framework de Aplicação:** SvelteKit 2 (configurado com `@sveltejs/adapter-static`).
- **Base de Dados Local (Offline):** Dexie.js (`src/lib/db.ts`).
- **Backend / Sync:** PocketBase (`src/lib/pb.ts` e sincronização em `src/lib/sync.ts`).
- **Biblioteca de Componentes:** WebAwesome (`@awesome.me/webawesome`).
- **Linguagem:** TypeScript (tipificar tudo corretamente).

## Comandos Úteis (usar sempre `pnpm`)

- **Desenvolvimento:** `pnpm run dev`
- **Validação de Tipos/Svelte:** `pnpm run check`
- **Linters:** `pnpm run lint`
- **Formatação:** `pnpm run format`

## Diretrizes para o Agente

1. **Validação:** Após qualquer alteração de código, corre sempre `pnpm run format` e depois `pnpm run check` / `pnpm run lint` para garantir que o código está limpo, formatado e sem erros.
2. **Svelte 5 Runes:** Garante que novos ficheiros `.svelte` utilizam Runes e não a sintaxe antiga do Svelte 4.
3. **Persistência / Sync:** Ter em atenção a lógica de sincronização local com Dexie.js e remota com PocketBase ao lidar com dados.
