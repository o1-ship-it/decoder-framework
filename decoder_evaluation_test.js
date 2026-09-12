const assert = require("node:assert/strict");
const scoring = require("./decoder_evaluation.js");
const experiment = require("./decoder_evaluation_experiment.js");

const calibration = [...experiment.sequenceRecords("calibration", 2), ...experiment.graphRecords("calibration")];
const test = [...experiment.sequenceRecords("test", 2), ...experiment.graphRecords("test")];
const model = scoring.fitCalibration(calibration, 5);
assert.equal(Object.keys(model.buckets).length, 6);
const evaluated = scoring.evaluateRecords(test, model);
assert.equal(evaluated.length, 2);
assert.ok(evaluated.every(row => row.coverage === 1));
assert.ok(evaluated.every(row => row.brierScore < row.certaintyBaselineBrier));

assert.throws(() => scoring.evaluateRecords(calibration, model), /重用校准记录/);
assert.throws(() => scoring.fitCalibration(calibration.concat(calibration[0]), 5), /唯一/);
const unknown = { id: "unknown", partition: "test", domain: "sequence", claim: "exact_future_values", prediction: { issued: true, evidence: "new-family" }, outcome: { success: true } };
const unknownResult = scoring.evaluateRecords([unknown], model)[0];
assert.equal(unknownResult.probabilityCount, 0);
assert.equal(unknownResult.coverage, 1);

console.log("decoder_evaluation_test: passed");
