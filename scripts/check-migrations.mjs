#!/usr/bin/env node
// Falla si dos migraciones de supabase/migrations/ comparten número
// (docs/13-FLUJO-DE-TRABAJO-EQUIPO.md §10, punto 1 — colisión de numeración
// entre ramas paralelas). Se corre en CI y localmente (npm run check:migrations).

import { readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

/** @type {Map<string, string[]>} */
const byNumber = new Map();
let hasMalformed = false;

for (const file of files) {
  const match = file.match(/^(\d+)_/);
  if (!match) {
    console.error(`✖ ${file} no sigue la convención NNN_descripcion.sql (docs/13 §10)`);
    hasMalformed = true;
    continue;
  }
  const number = String(Number(match[1])); // normaliza "007" y "7" al mismo número
  const list = byNumber.get(number) ?? [];
  list.push(file);
  byNumber.set(number, list);
}

const collisions = [...byNumber.entries()].filter(([, list]) => list.length > 1);

if (collisions.length > 0) {
  console.error("✖ Migraciones con número duplicado (docs/13 §10):\n");
  for (const [number, list] of collisions) {
    console.error(`  Número ${number}:`);
    for (const file of list) console.error(`    - ${file}`);
  }
  console.error(
    "\nRenumerá una de las dos antes de mergear (la última en llegar a main cede el número)."
  );
}

if (collisions.length > 0 || hasMalformed) {
  process.exit(1);
}

console.log(`✓ ${files.length} migraciones en supabase/migrations/, sin números duplicados.`);
