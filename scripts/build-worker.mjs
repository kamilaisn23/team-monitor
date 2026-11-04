import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

fs.mkdirSync(path.join(root, "scripts-dist"), { recursive: true });

const aliasAtPlugin = {
    name: "alias-at",
    setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => {
            const resolved = path.resolve(root, "src", args.path.slice(2));
            for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
                const full = resolved + ext;
                if (fs.existsSync(full)) return { path: full };
            }
            return { path: resolved + ".ts" };
        });
    },
};

try {
    // Build the sync worker script
    const workerResult = await build({
        entryPoints: [path.join(root, "scripts", "sync-worker.ts")],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        external: ["@prisma/client", "prisma", "pg"],
        outfile: path.join(root, "scripts-dist", "sync-worker.js"),
        logLevel: "info",
        plugins: [aliasAtPlugin],
    });

    if (workerResult.errors.length > 0) {
        console.error("esbuild errors (sync-worker):");
        for (const e of workerResult.errors)
            console.error(JSON.stringify(e, null, 2));
        process.exit(1);
    }
    console.log("sync-worker.js bundled successfully");

    // Build sync-manager as a standalone CJS module so it can be loaded at runtime
    // via a dynamic require() without being bundled into the Next.js server bundle.
    const managerResult = await build({
        entryPoints: [path.join(root, "src", "lib", "sync-manager.ts")],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        external: ["worker_threads", "@prisma/client", "prisma", "pg"],
        outfile: path.join(root, "scripts-dist", "sync-manager.js"),
        logLevel: "info",
        plugins: [aliasAtPlugin],
    });

    if (managerResult.errors.length > 0) {
        console.error("esbuild errors (sync-manager):");
        for (const e of managerResult.errors)
            console.error(JSON.stringify(e, null, 2));
        process.exit(1);
    }
    console.log("sync-manager.js bundled successfully");
    await build({
        entryPoints: [path.join(root, "scripts", "sync-cron.ts")],
        bundle: true,
        platform: "node",
        target: "node22",
        format: "cjs",
        external: ["@prisma/client", "prisma", "pg"],
        outfile: path.join(root, "scripts-dist", "sync-cron.js"),
        logLevel: "info",
        plugins: [aliasAtPlugin],
    });
    console.log("sync-cron.js bundled successfully");
} catch (err) {
    console.error("Build failed:");
    if (err && typeof err === "object" && "errors" in err) {
        for (const e of err.errors) console.error(JSON.stringify(e, null, 2));
    } else {
        console.error(err);
    }
    process.exit(1);
}
