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
