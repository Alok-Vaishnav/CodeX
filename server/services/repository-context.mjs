import path from "node:path";
import { sourceExtensions } from "../middleware/upload.mjs";

export function redactSecrets(source) {
  return source
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED PRIVATE KEY]")
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED API KEY]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED AWS KEY]");
}

function parseRepositoryUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw Object.assign(new Error("Use a valid public GitHub repository URL."), { status: 400 }); }
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || segments.length < 2 || url.username || url.password) {
    throw Object.assign(new Error("Use a valid public GitHub repository URL."), { status: 400 });
  }
  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo)) {
    throw Object.assign(new Error("That GitHub repository URL is not valid."), { status: 400 });
  }
  return { owner, repo };
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Folio-Code-Explainer" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const status = response.status === 404 ? 404 : response.status === 403 || response.status === 429 ? 429 : 502;
    const message = status === 404 ? "That repository was not found or is not public." : status === 429 ? "GitHub’s public API is rate-limited. Try again shortly." : "GitHub could not provide this repository right now.";
    throw Object.assign(new Error(message), { status });
  }
  return response.json();
}

function rankPath(filePath, question) {
  const lower = filePath.toLowerCase();
  if (/\/(node_modules|vendor|dist|build|\.next|coverage)\//.test(lower) || /(^|\/)(\.env|.*\.pem|.*\.key|.*credentials.*|.*secret.*)(\/|$)/.test(lower)) return -1000;
  if (/package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock/.test(lower) || !sourceExtensions.has(path.extname(lower))) return -1000;
  let score = 0;
  if (/(^|\/)readme\.md$/.test(lower)) score += 100;
  if (/(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/.test(lower)) score += 80;
  if (/(^|\/)(index|main|app|server|routes|router)\.[a-z0-9]+$/.test(lower)) score += 30;
  const words = question.toLowerCase().match(/[a-z0-9_]{3,}/g) || [];
  for (const word of words) if (lower.includes(word)) score += 10;
  if (lower.split("/").length <= 2) score += 3;
  return score;
}

export async function getRepositoryContext(repoUrl, question) {
  const { owner, repo } = parseRepositoryUrl(repoUrl);
  const apiRoot = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repoInfo = await githubJson(apiRoot);
  if (repoInfo.private) throw Object.assign(new Error("Private repositories need a GitHub connection. This setup supports public repositories."), { status: 403 });
  const tree = await githubJson(`${apiRoot}/git/trees/${encodeURIComponent(repoInfo.default_branch)}?recursive=1`);
  const candidates = (tree.tree || [])
    .filter((item) => item.type === "blob" && item.size <= 150_000)
    .map((item) => ({ path: item.path, sha: item.sha, score: rankPath(item.path, question) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14);

  let remaining = 55_000;
  const files = [];
  for (let index = 0; index < candidates.length && remaining > 0; index += 5) {
    const batch = candidates.slice(index, index + 5);
    const blobs = await Promise.all(batch.map(async (item) => {
      try { return { item, blob: await githubJson(`${apiRoot}/git/blobs/${item.sha}`) }; }
      catch { return null; }
    }));
    for (const result of blobs) {
      if (!result?.blob?.content || result.blob.encoding !== "base64") continue;
      let text = Buffer.from(result.blob.content, "base64").toString("utf8");
      if (text.includes("\0")) continue;
      text = redactSecrets(text).slice(0, Math.min(12_000, remaining));
      if (!text.trim()) continue;
      files.push({ name: result.item.path, text });
      remaining -= text.length;
    }
  }
  if (!files.length) throw Object.assign(new Error("No readable source files were found in that repository."), { status: 422 });
  return { repository: `${owner}/${repo}`, files };
}
