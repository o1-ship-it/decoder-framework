const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function digest(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function createManifest(files) {
  if (!Array.isArray(files) || files.length === 0) throw new TypeError("清单文件不能为空");
  return { schemaVersion: 1, claim: "decoder_reproducibility_manifest", files: files.map(file => ({ path: path.basename(file), sha256: digest(file) })) };
}
function verifyManifest(manifest, directory = __dirname) {
  try {
    if (!manifest || manifest.schemaVersion !== 1 || manifest.claim !== "decoder_reproducibility_manifest") return { status: "invalid_manifest" };
    const mismatches = manifest.files.filter(file => !fs.existsSync(path.join(directory, file.path)) || digest(path.join(directory, file.path)) !== file.sha256);
    return { status: mismatches.length ? "mismatch_found" : "verified_manifest", mismatches };
  } catch (error) { return { status: "invalid_manifest", reason: error.message }; }
}
function main() {
  const names = ["decoder_v1.js", "decoder_protocol.js", "decoder_report.js", "dynamics_invariant.js", "dynamics_invariant_verifier.js", "decoder_noisy_sequence.js", "decoder_distribution_shift.js", "decoder_translation.js", "dynamics_condition_multivariate.js", "machine_representation.js", "machine_decoder_search.js", "decoder_hidden_structure.js", "decoder_hidden_competition.js", "decoder_capability_matrix.js", "decoder_identifiability.js", "decoder_acceptance_v1.json", "benchmark_v1_2_results.json", "benchmark_v1_3_results.json", "benchmark_v1_4_results.json", "benchmark_v1_5_results.json", "benchmark_v1_6.json", "benchmark_v1_6_results.json", "benchmark_v1_7.json", "benchmark_v1_7_results.json", "benchmark_v2_0.json", "benchmark_v2_0_results.json", "benchmark_v2_1.json", "benchmark_v2_1_results.json"];
  const manifest = createManifest(names.map(name => path.join(__dirname, name))); fs.writeFileSync(path.join(__dirname, "decoder_manifest_v1.json"), JSON.stringify(manifest, null, 2), "utf8"); console.log(`清单：${manifest.files.length} 个文件，${verifyManifest(manifest).status}`); return manifest;
}
if (require.main === module) main();
module.exports = { digest, createManifest, verifyManifest, main };
