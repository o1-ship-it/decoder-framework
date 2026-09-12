const assert = require("node:assert/strict");
const path = require("node:path");
const manifest = require("./decoder_manifest.js");
const files = ["decoder_v1.js", "decoder_protocol.js"].map(name => path.join(__dirname, name));
const created = manifest.createManifest(files);
assert.equal(manifest.verifyManifest(created).status, "verified_manifest");
const tampered = JSON.parse(JSON.stringify(created)); tampered.files[0].sha256 = "0".repeat(64);
assert.equal(manifest.verifyManifest(tampered).status, "mismatch_found");
console.log("decoder_manifest_test: passed");
