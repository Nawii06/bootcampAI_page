import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const command = process.argv[2];
const dataSetId = process.argv[3];
const root = path.resolve(
  import.meta.dirname,
  "..",
  "artifacts",
  "bootcamp-portal",
  "fake-data",
);

if (command === "list") {
  const files = await readdir(root);
  console.log(files.filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).join("\n"));
  process.exit(0);
}

if (command !== "remove" || !dataSetId) {
  console.error("Usage: node scripts/fake-data-set.mjs list | remove <data-set-id>");
  process.exit(1);
}

if (!/^FD_Set_[0-9]{2}$/.test(dataSetId)) {
  console.error("Invalid fake data set id.");
  process.exit(1);
}

const target = path.resolve(root, `${dataSetId}.json`);
if (path.dirname(target) !== root) {
  console.error("Resolved path is outside the fake-data directory.");
  process.exit(1);
}

await rm(target);
console.log(`Removed fake data set: ${dataSetId}`);
