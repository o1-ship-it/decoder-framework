const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function digest(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function relativePath(file, directory = __dirname) {
  const relative = path.relative(directory, file).split(path.sep).join("/");
  if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) throw new RangeError("清单文件必须位于项目目录内");
  return relative;
}
function resolveManifestPath(directory, file) {
  if (!file || typeof file.path !== "string" || !file.path || path.isAbsolute(file.path)) throw new TypeError("清单路径无效");
  const base = path.resolve(directory);
  const resolved = path.resolve(base, file.path);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new RangeError("清单路径越出项目目录");
  return resolved;
}
function createManifest(files, directory = __dirname) {
  if (!Array.isArray(files) || files.length === 0) throw new TypeError("清单文件不能为空");
  return { schemaVersion: 1, claim: "decoder_reproducibility_manifest", files: files.map(file => ({ path: relativePath(file, directory), sha256: digest(file) })) };
}
function verifyManifest(manifest, directory = __dirname) {
  try {
    if (!manifest || manifest.schemaVersion !== 1 || manifest.claim !== "decoder_reproducibility_manifest") return { status: "invalid_manifest" };
    const mismatches = manifest.files.filter(file => { const target = resolveManifestPath(directory, file); return !fs.existsSync(target) || digest(target) !== file.sha256; });
    return { status: mismatches.length ? "mismatch_found" : "verified_manifest", mismatches };
  } catch (error) { return { status: "invalid_manifest", reason: error.message }; }
}
function main() {
  const names = ["AGENTS.md", "PROJECT_CONTEXT.md", "CODEBASE_MAP.md", "decoder_v1.js", "decoder_protocol.js", "decoder_report.js", "dynamics_invariant.js", "dynamics_invariant_verifier.js", "decoder_noisy_sequence.js", "decoder_distribution_shift.js", "decoder_translation.js", "dynamics_condition_multivariate.js", "machine_representation.js", "machine_decoder_search.js", "decoder_hidden_structure.js", "decoder_hidden_competition.js", "decoder_capability_matrix.js", "decoder_identifiability.js", "decoder_active_design.js", "decoder_noisy_active_design.js", "decoder_candidate_bank.js", "dynamics_composed_search.js", "decoder_blackbox_dynamics.js", "dynamics/blackbox_active_design.js", "dynamics/blackbox_active_experiment.js", "dynamics/README.md", "docs/README.md", "decoder_acceptance_v1.json", "benchmark_v1_2_results.json", "benchmark_v1_3_results.json", "benchmark_v1_4_results.json", "benchmark_v1_5_results.json", "benchmark_v1_6.json", "benchmark_v1_6_results.json", "benchmark_v1_7.json", "benchmark_v1_7_results.json", "benchmark_v2_0.json", "benchmark_v2_0_results.json", "benchmark_v2_1.json", "benchmark_v2_1_results.json", "benchmark_v2_2.json", "benchmark_v2_2_results.json", "benchmark_v2_3.json", "benchmark_v2_3_results.json", "benchmark_v2_4.json", "benchmark_v2_4_results.json", "benchmark_v3_0.json", "benchmark_v3_0_results.json", "benchmark_v3_1.json", "benchmark_v3_1_results.json", "decoder_observational_equivalence.js", "RELEASE_NOTES_v3_0.md", "RELEASE_NOTES_v3_1.md", "RESEARCH_REFLECTION_v2_2.md", "RESEARCH_REFLECTION_v2_3.md", "RESEARCH_REFLECTION_v2_4.md", "RESEARCH_REFLECTION_v3_0.md", "RESEARCH_REFLECTION_v3_1.md"];
  const manifest = createManifest(names.map(name => path.join(__dirname, name))); fs.writeFileSync(path.join(__dirname, "decoder_manifest_v1.json"), JSON.stringify(manifest, null, 2), "utf8"); console.log(`清单：${manifest.files.length} 个文件，${verifyManifest(manifest).status}`); return manifest;
}
if (require.main === module) main();
module.exports = { digest, relativePath, resolveManifestPath, createManifest, verifyManifest, main };
