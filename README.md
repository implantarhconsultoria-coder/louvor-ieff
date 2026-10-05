# LOUVOR IEFF

App mobile-first do Ministério de Louvor — **Igreja Filhos da Fé**.

Estética escura com neon (roxo / rosa / ciano), pensada para uso no palco e no celular da equipe.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Zustand (estado client-side / demo)
- Framer Motion + Lucide React

## Rodar local

```bash
cd /workspace/louvor-ieff
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) (viewport mobile ~390px).

## Rotas

| Rota | Tela |
|------|------|
| `/` | Home |
| `/programacao` | Programação do culto (+ Nova via WhatsApp) |
| `/musica/[id]` | Detalhe da música |
| `/musica/[id]/cifra` | Modo cifra (palco) |
| `/repertorio` | Repertório + filtros |
| `/ensaios` | Ensaios / aprovar tom |
| `/ministro` | Modo Ministro (PIN **2626**) |
| `/culto` | Ao vivo |
| `/avisos` | Avisos |

## PIN Ministro

`2626` — só o modo ministro autenticado chama músicas ao vivo.

## Dados

Demo only. Tons/artistas/cifras desconhecidos ficam **PENDENTE** (nunca inventados).

## Nova Programação (WhatsApp)

Cole qualquer mensagem: numerada (`1. Plano Melhor (Juliana)`), bullets (`•`), hífen
(`- Plano Melhor - Juliana`), linhas simples, `Nome(Solo)` com/sem espaço, `Solo:`,
múltiplos solos (`Escolhido (Henrique-Quezia)` → `Henrique / Quezia`). Saudações,
linhas em branco, emojis e despedidas são ignorados.

- Música não encontrada → criada como **nova**, campos PENDENTE (nunca bloqueia).
- Resolução: exato/normalizado → fuzzy → escolha aprendida. Incerto → "Encontramos estas
  possíveis músicas" (nunca vincula automaticamente). A escolha é lembrada.
- Spotify / YouTube / Cifra Club ficam no **mesmo** registro da música (`spotify`, `youtube`,
  `cifraClub`, `instruments`, `defaultChoice`).

### Integrações

| Serviço | Sem chave (padrão) | Com chave |
|--------|--------------------|-----------|
| Spotify | link de busca `open.spotify.com/search/...` | `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` → faixa, artista, capa, álbum, duração (só vincula se confiante) |
| YouTube | links de busca por categoria (oficial, ao vivo, lyric, bateria, baixo, guitarra, violão, teclado, vocal, backing) | `YOUTUBE_API_KEY` → vídeo priorizando canal oficial/artista para oficial/ao vivo/lyric |
| Cifra Club | link de busca (sem API oficial — não copiamos cifras) | — |

Rota: `GET /api/song-refs?name=...&artist=...`. Veja `.env.example`.

### Versão oficial por culto ("todos ouvirão esta")

Na revisão, cada música mostra **até 3 versões mais usadas** para o ministro escolher:

1. Escolha anterior da igreja (`song.defaultChoice.version`) — já vem marcada
2. Versões usadas em cultos anteriores (`song.versionHistory`)
3. Catálogo: Spotify Web API (popularidade) se houver chaves; senão iTunes Search API
   da Apple (pública, sem chave) — artistas distintos, prioriza gospel e quem tem mais
   gravações do título; exclui playback/cover/remix/medley. Nunca inventa.

Ao confirmar, a versão escolhida é gravada em `programItem.chosenVersion` (trava do culto)
e aprendida na música. Música, Ouvir, Referência, Cifra Club e Culto ao Vivo usam
`getSongLinks(song, programItem.chosenVersion)` → todos abrem a mesma gravação.

> Os dados ficam no navegador (Zustand/localStorage). Para que **todos os aparelhos**
> vejam a mesma programação/versão, é preciso sincronizar com um backend (ex.: Supabase).

## Testes

```bash
npm test
```
