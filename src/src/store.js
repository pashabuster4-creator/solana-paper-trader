import fs from "node:fs/promises";
import path from "node:path";

const file = path.resolve("data/state.json");
const blank = () => ({ positions: {}, trades: [], day: new Date().toISOString().slice(0,10), realizedLossTodayUsd: 0, paperUsd: 10 });

export async function loadState() {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try { return { ...blank(), ...JSON.parse(await fs.readFile(file, "utf8")) }; }
  catch { const s = blank(); await saveState(s); return s; }
}
export async function saveState(state) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, file);
}
