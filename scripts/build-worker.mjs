import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

fs.mkdirSync(path.join(root, "scripts-dist"), { recursive: true });

try {
    const result = await build({
        entryPoints: [path.join(root, "scripts", "sync-worker.ts")],
        bundle: true,
        platform: "node",
        target: "node20",
        format: "cjs",
        external: ["@prisma/client", "prisma"],
        outfile: path.join(root, "scripts-dist", "sync-worker.js"),
        logLevel: "info",
        plugins: [
            {
                name: "alias-at",
                setup(build) {
                    build.onResolve({ filter: /^@\// }, (args) => {
                        const resolved = path.resolve(
                            root,
                            "src",
                            args.path.slice(2),
                        );
                        // Try with .ts extension first, then .tsx, then bare (directory index)
                        for (const ext of [
                            ".ts",
                            ".tsx",
                            "/index.ts",
                            "/index.tsx",
                            "",
                        ]) {
                            const full = resolved + ext;
                            if (fs.existsSync(full)) return { path: full };
                        }
                        return { path: resolved + ".ts" };
                    });
                },
            },
        ],
    });

    if (result.errors.length > 0) {
        console.error("esbuild errors:");
        for (const e of result.errors)
            console.error(JSON.stringify(e, null, 2));
        process.exit(1);
    }

    console.log("sync-worker.js bundled successfully");
} catch (err) {
    console.error("Build failed:");
    if (err && typeof err === "object" && "errors" in err) {
        for (const e of err.errors) console.error(JSON.stringify(e, null, 2));
    } else {
        console.error(err);
    }
    process.exit(1);
}
