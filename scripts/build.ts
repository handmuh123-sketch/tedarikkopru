import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextCli = fileURLToPath(import.meta.resolve("next/dist/bin/next"));

const exitCode = await new Promise<number>((resolve, reject) => {
  const child = spawn(process.execPath, [nextCli, "build"], {
    env: {
      ...process.env,
      TEDARIKKOPRU_BUILD_PHASE: "compile",
    },
    stdio: "inherit",
  });

  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Next.js build ${signal} sinyaliyle durdu.`));
      return;
    }

    resolve(code ?? 1);
  });
});

process.exitCode = exitCode;
