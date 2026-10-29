import path from "node:path";
import multer from "multer";

export const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".go", ".rs", ".java", ".c", ".h", ".cpp", ".cs", ".php", ".rb", ".swift", ".kt", ".sql", ".sh", ".json", ".yaml", ".yml", ".md", ".toml", ".html", ".css", ".scss", ".vue", ".svelte", ".astro", ".dart", ".ex", ".exs", ".scala", ".clj", ".cljs", ".tf", ".hcl", ".ipynb"]);

export const codeFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 12, fileSize: 1_000_000, fields: 4, fieldSize: 8_000 },
  fileFilter: (_req, file, done) => {
    if (!sourceExtensions.has(path.extname(file.originalname).toLowerCase())) {
      return done(Object.assign(new Error(`Unsupported code file: ${file.originalname}`), { status: 400 }));
    }
    return done(null, true);
  },
});
