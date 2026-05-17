const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const nextDir = path.resolve(root, ".next");

if (!nextDir.startsWith(root)) {
  throw new Error(`Refusing to remove cache outside project: ${nextDir}`);
}

fs.rmSync(nextDir, { recursive: true, force: true });
console.log("Cleared .next dev cache");
