import { readFile } from "node:fs/promises";
import path from "node:path";

let htmlPromise: Promise<string> | undefined;
export async function vueShell(status = 200) {
  htmlPromise ??= readFile(
    path.join(process.cwd(), "public", "vue", "index.html"),
    "utf8",
  ).catch((error) => {
    htmlPromise = undefined;
    throw error;
  });
  return new Response(await htmlPromise, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
