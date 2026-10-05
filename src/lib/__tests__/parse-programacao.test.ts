import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProgramacaoMessage, splitSolos } from "../parse-programacao";

function names(raw: string) {
  return parseProgramacaoMessage(raw).map((i) => ({ name: i.name, solo: i.solo }));
}

test("numbered: 1. Plano Melhor (Juliana)", () => {
  assert.deepEqual(names("1. Plano Melhor (Juliana)"), [
    { name: "Plano Melhor", solo: "Juliana" },
  ]);
});

test("numbered with dash/paren variants", () => {
  const r = parseProgramacaoMessage("1) Plano Melhor (Juliana)\n2 - Vento do Espírito (Gabi)");
  assert.equal(r.length, 2);
  assert.equal(r[0].position, 1);
  assert.equal(r[1].name, "Vento do Espírito");
});

test("bullet: • Plano Melhor (Juliana)", () => {
  assert.deepEqual(names("• Plano Melhor (Juliana)"), [
    { name: "Plano Melhor", solo: "Juliana" },
  ]);
});

test("hyphen: - Plano Melhor - Juliana", () => {
  assert.deepEqual(names("- Plano Melhor - Juliana"), [
    { name: "Plano Melhor", solo: "Juliana" },
  ]);
});

test("plain lines without solos", () => {
  assert.deepEqual(names("Plano Melhor\nVento do Espírito"), [
    { name: "Plano Melhor", solo: "PENDENTE" },
    { name: "Vento do Espírito", solo: "PENDENTE" },
  ]);
});

test("parentheses without space: Vento do espírito(Gabi)", () => {
  assert.deepEqual(names("Vento do espírito(Gabi)"), [
    { name: "Vento do espírito", solo: "Gabi" },
  ]);
});

test("parentheses with space: Me atraiu (Gabi)", () => {
  assert.deepEqual(names("Me atraiu (Gabi)"), [
    { name: "Me atraiu", solo: "Gabi" },
  ]);
});

test("full message with greeting is filtered", () => {
  const raw = `Boa tarde pessoal,
seguem os louvores para o culto de sábado:

Plano Melhor (Juliana)
Vento do espírito(Gabi)

Me atraiu (Gabi)`;
  assert.deepEqual(names(raw), [
    { name: "Plano Melhor", solo: "Juliana" },
    { name: "Vento do espírito", solo: "Gabi" },
    { name: "Me atraiu", solo: "Gabi" },
  ]);
});

test("multi solo with hyphen: Escolhido (Henrique-Quezia)", () => {
  assert.deepEqual(names("Escolhido (Henrique-Quezia)"), [
    { name: "Escolhido", solo: "Henrique / Quezia" },
  ]);
});

test("multi solo with slash: Escolhido (Henrique/Quezia)", () => {
  assert.deepEqual(names("Escolhido (Henrique / Quezia)"), [
    { name: "Escolhido", solo: "Henrique / Quezia" },
  ]);
});

test("Solo: prefix", () => {
  assert.deepEqual(names("1. Plano Melhor — Solo: Juliana"), [
    { name: "Plano Melhor", solo: "Juliana" },
  ]);
  assert.deepEqual(names("Lugar Seguro solo: Juliana"), [
    { name: "Lugar Seguro", solo: "Juliana" },
  ]);
  assert.deepEqual(names("Ao Único (Solo: Juliana)"), [
    { name: "Ao Único", solo: "Juliana" },
  ]);
});

test("case-insensitive and extra spaces", () => {
  assert.deepEqual(names("   1.    PLANO   MELHOR   (  juliana  )   "), [
    { name: "PLANO MELHOR", solo: "juliana" },
  ]);
  assert.deepEqual(names("BOA NOITE PESSOAL\nyeshua"), [
    { name: "yeshua", solo: "PENDENTE" },
  ]);
});

test("ignores blank lines and noise-only messages", () => {
  assert.deepEqual(parseProgramacaoMessage("\n\n   \nBoa tarde pessoal,\n\n"), []);
});

test("mixed formats keep sequential positions", () => {
  const raw = `Bom dia!
1. Plano Melhor (Juliana)
• Vento do espírito(Gabi)
- Lugar Seguro - Juliana
Escolhido (Henrique-Quezia)
Digno`;
  const r = parseProgramacaoMessage(raw);
  assert.equal(r.length, 5);
  assert.deepEqual(r.map((i) => i.position), [1, 2, 3, 4, 5]);
  assert.equal(r[3].solo, "Henrique / Quezia");
  assert.equal(r[4].solo, "PENDENTE");
});

test("hyphenated song title with no solo is not split wrongly", () => {
  // Long right side without separator stays as title
  assert.deepEqual(names("Começo, Meio e Fim"), [
    { name: "Começo, Meio e Fim", solo: "PENDENTE" },
  ]);
});

test("splitSolos helper", () => {
  assert.equal(splitSolos("Henrique-Quezia"), "Henrique / Quezia");
  assert.equal(splitSolos("Solo: Gabi"), "Gabi");
  assert.equal(splitSolos(""), "PENDENTE");
});

test("emoji-only, header colon and sign-off lines are ignored", () => {
  const raw = `🙏🏻🔥
Louvores do próximo culto:
Plano Melhor (Juliana)
Yeshua
Deus abençoe!
Obrigado 🙌`;
  assert.deepEqual(names(raw), [
    { name: "Plano Melhor", solo: "Juliana" },
    { name: "Yeshua", solo: "PENDENTE" },
  ]);
});

test("strips trailing emoji in song line", () => {
  const r = names("Me atraiu (Gabi) 🔥");
  assert.equal(r.length, 1);
  assert.equal(r[0].solo, "Gabi");
  assert.equal(r[0].name, "Me atraiu");
});
