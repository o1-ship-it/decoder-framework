// Common protocol for heterogeneous information decoders.

const adaptive = require("./decoder_adaptive.js");
const sequenceVerifier = require("./decoder_verifier.js");
const graph = require("./graph_decoder.js");
const equation = require("./equation_decoder.js");
const equationVerifier = require("./equation_verifier.js");
const equationSystem = require("./equation_system.js");
const equationSystemVerifier = require("./equation_system_verifier.js");
const generator = require("./decoder_generator.js");
const generatorVerifier = require("./decoder_generator_verifier.js");
const adaptiveSearch = require("./decoder_adaptive_search.js");
const polynomial = require("./polynomial_decoder.js");
const polynomialVerifier = require("./polynomial_verifier.js");
const factorization = require("./polynomial_factorization.js");
const factorVerifier = require("./polynomial_factorization_verifier.js");
const polynomialAnalysis = require("./polynomial_analysis.js");
const polynomialAnalysisVerifier = require("./polynomial_analysis_verifier.js");
const dynamics = require("./dynamics_invariant.js");
const dynamicsVerifier = require("./dynamics_invariant_verifier.js");
const parameterizedDynamics = require("./dynamics_parameterized.js");
const noisySequence = require("./decoder_noisy_sequence.js");
const multivariateCondition = require("./dynamics_condition_multivariate.js");
const machineRepresentation = require("./machine_representation.js");
const machineDecoderSearch = require("./machine_decoder_search.js");
const hiddenStructure = require("./decoder_hidden_structure.js");
const hiddenCompetition = require("./decoder_hidden_competition.js");
const capabilityMatrix = require("./decoder_capability_matrix.js");
const identifiability = require("./decoder_identifiability.js");

function sequenceCase(development, holdout) {
  if (!Array.isArray(holdout) || holdout.length === 0) throw new TypeError("序列验证需要非空留出数据");
  const frozen = adaptive.createCertificate(development, holdout.length, [8, 10, 12]);
  if (!frozen.certificate) {
    return { domain: "sequence", status: "uncertain", decoder: null, complexity: null, residual: null, verification: "no_certificate" };
  }
  const verification = sequenceVerifier.verifyCertificate(frozen.certificate, development, holdout);
  const residual = verification.status === "verified_on_supplied_observations" ? 0 : 1;
  return {
    domain: "sequence",
    status: "candidate_frozen",
    decoder: frozen.certificate.decoder,
    representation: frozen.certificate.rule,
    hypothesis: frozen.certificate.model,
    complexity: frozen.certificate.complexity.value,
    complexityUnit: "domain_specific_proxy_not_bits",
    residual,
    residualMeaning: "verification_failure_indicator",
    evidenceScope: "future_sequence_values",
    verification: verification.status,
    limits: frozen.certificate.limits,
  };
}

function graphCase(input) {
  const frozen = graph.makeCertificate(input);
  if (!frozen.certificate) return { domain: "graph", status: "uncertain", decoder: null, complexity: null, residual: null, verification: "no_certificate" };
  const verification = graph.verifyCertificate(frozen.certificate, input);
  return {
    domain: "graph",
    status: "candidate_frozen",
    decoder: frozen.certificate.model.kind,
    representation: frozen.certificate.rule,
    hypothesis: frozen.certificate.model,
    complexity: frozen.certificate.complexity,
    complexityUnit: "domain_specific_proxy_not_bits",
    residual: verification.status === "verified_on_graph" ? 0 : 1,
    residualMeaning: "verification_failure_indicator",
    evidenceScope: "observed_graph_only",
    verification: verification.status,
    limits: frozen.certificate.limits,
  };
}

function equationCase(input) {
  const certificate = equation.makeCertificate(input.equation);
  const sourceVerification = equationVerifier.verifyCertificate(certificate, input.equation);
  const comparison = input.equivalentEquation
    ? equationVerifier.verifyCertificate(certificate, input.equivalentEquation)
    : sourceVerification;
  const residual = comparison.status === "verified_equation" ? 0 : 1;
  return {
    domain: "equation",
    status: "candidate_frozen",
    decoder: "linear_normalization",
    representation: equation.decode(input.equation).representation,
    hypothesis: certificate.hypothesis,
    complexity: equation.decode(input.equation).complexity,
    complexityUnit: "term_count_proxy",
    residual,
    residualMeaning: "equivalence_verification_failure_indicator",
    verification: comparison.status,
    limits: certificate.limits,
  };
}

function equationSystemCase(input) {
  const certificate = equationSystem.makeCertificate(input.system);
  const verification = equationSystemVerifier.verifyCertificate(certificate, input.system);
  return {
    domain: "equation_system",
    status: "candidate_frozen",
    decoder: "rational_row_reduction",
    representation: `RREF(${certificate.hypothesis.variables.join(",")})`,
    hypothesis: certificate.hypothesis,
    conclusions: certificate.conclusions,
    complexity: certificate.hypothesis.rank * certificate.hypothesis.variables.length,
    complexityUnit: "rank_times_variable_count",
    residual: verification.status === "verified_system" ? 0 : 1,
    residualMeaning: "rref_verification_failure_indicator",
    evidenceScope: "finite_linear_system",
    verification: verification.status,
    limits: certificate.limits,
  };
}

function polynomialCase(input) {
  const certificate = polynomial.makeCertificate(input.polynomial);
  const verification = polynomialVerifier.verifyCertificate(certificate, input.polynomial);
  return { domain: "polynomial", status: "candidate_frozen", decoder: certificate.claim, representation: polynomial.decode(input.polynomial).representation, hypothesis: certificate.hypothesis, complexity: certificate.hypothesis.terms.length, complexityUnit: "monomial_count", residual: verification.status === "verified_polynomial" ? 0 : 1, residualMeaning: "normalization_verification_failure_indicator", verification: verification.status, limits: certificate.limits };
}

function polynomialFactorCase(input) {
  const certificate = factorization.makeCertificate(input.polynomial);
  const verification = factorVerifier.verifyCertificate(certificate, input.polynomial);
  return { domain: "polynomial_factor", status: "candidate_frozen", decoder: "integer_root_factorization", representation: factorization.decode(input.polynomial).representation, hypothesis: certificate.factorization, complexity: certificate.factorization.factors.length, complexityUnit: "factor_count", residual: verification.status === "verified_factorization" ? 0 : 1, residualMeaning: "factor_expansion_failure_indicator", verification: verification.status, limits: certificate.limits };
}

function polynomialAnalysisCase(input) {
  const certificate = polynomialAnalysis.makeCertificate(input.polynomial);
  const verification = polynomialAnalysisVerifier.verifyCertificate(certificate, input.polynomial);
  return { domain: "polynomial_analysis", status: "candidate_frozen", decoder: "polynomial_invariant_analysis", representation: `degree=${certificate.analysis.totalDegree}; homogeneous=${certificate.analysis.homogeneous}`, hypothesis: certificate.analysis, complexity: certificate.analysis.normalized.terms.length + certificate.analysis.variables.length, complexityUnit: "term_plus_variable_count", residual: verification.status === "verified_polynomial_analysis" ? 0 : 1, residualMeaning: "invariant_recomputation_failure_indicator", verification: verification.status, limits: certificate.limits };
}

function dynamicsCase(input) {
  const maxDegree = input.maxDegree || 2;
  const coefficientRange = input.coefficientRange || 1;
  const method = input.method || "linear_nullspace";
  const frozen = dynamics.makeCertificate(input.map, maxDegree, coefficientRange, method);
  const verification = dynamicsVerifier.verifyCertificate(frozen, input.map);
  const candidateFrozen = frozen.invariants.length > 0;
  return {
    domain: "dynamics",
    status: candidateFrozen ? "candidate_frozen" : "uncertain",
    decoder: "polynomial_invariant_search",
    representation: "二维多项式映射不变量",
    hypothesis: frozen.invariants,
    complexity: frozen.invariants.length,
    complexityUnit: "candidate_count",
    residual: candidateFrozen ? (verification.status === "verified_dynamics_invariants" ? 0 : 1) : null,
    residualMeaning: "symbolic_and_trajectory_verification_failure_indicator",
    verification: candidateFrozen ? verification.status : "no_nontrivial_invariant",
    search: frozen.search,
    readability: { machine: frozen.representation, human: frozen.invariants.map(item => item.rule) },
    trajectoryChecks: verification.trajectoryChecks || [],
    limits: frozen.limits,
  };
}

function parameterizedDynamicsCase(input) {
  const certificate = parameterizedDynamics.makeCertificate(input.parameters);
  const verification = parameterizedDynamics.verifyCertificate(certificate, input.parameters);
  const hasCandidate = certificate.candidates.length > 0;
  return { domain: "dynamics_parameterized", status: hasCandidate ? "candidate_frozen" : "uncertain", decoder: "parameterized_rotation_scaling", representation: "F(a,b)(x,y)=(ax-by,bx+ay)", hypothesis: certificate.candidates, condition: certificate.condition, complexity: certificate.candidates.length, complexityUnit: "candidate_count", residual: hasCandidate ? (verification.status === "verified_parameter_condition" ? 0 : 1) : null, verification: hasCandidate ? verification.status : "uncertain_parameter_region", limits: certificate.limits };
}

function noisySequenceCase(input) {
  const result = noisySequence.decode(input.development, input.holdout || [], input.tolerance ?? 1);
  return { domain: "noisy_sequence", status: result.status === "verified_noisy_sequence" ? "candidate_frozen" : "uncertain", decoder: result.decoder, representation: "中位数步长与截距", hypothesis: result.model, complexity: 2, complexityUnit: "parameter_count", residual: result.residual, residualMeaning: "noise_tolerant_holdout_failure_indicator", verification: result.status, fitResidualMax: result.fitResidualMax, holdoutResidualMax: result.holdoutResidualMax, limits: result.limits };
}

function multivariateConditionCase(input) {
  if (input.family !== "sum_shift_y") throw new TypeError("当前协议只支持 family=sum_shift_y");
  const family = ({ a, b, c }) => ({ x: [{ coefficient: 1, powers: [1, 0] }], y: [{ coefficient: 1, powers: [0, 1] }, { coefficient: a + b + c - 1, powers: [0, 0] }] });
  const invariant = { polynomial: [{ coefficient: 1, powers: [0, 1] }] };
  const result = multivariateCondition.inferLinearCondition(family, invariant, ["a", "b", "c"], input.samples, input.fitCount || 4, input.point || [1, 0]);
  return { domain: "dynamics_condition_multivariate", status: result.generalizes ? "candidate_frozen" : "uncertain", decoder: "multivariate_linear_condition", representation: "参数残差线性零空间", hypothesis: result.condition, complexity: result.parameterVariables.length + 1, complexityUnit: "parameter_plus_intercept", residual: result.generalizes ? 0 : 1, verification: result.status, fitResidualMax: result.fitResidualMax, holdoutResidualMax: result.holdoutResidualMax, limits: ["当前内置 sum_shift_y 参数族", "一次参数条件", "留出样本必须独立"] };
}

function machineRepresentationCase(input) {
  const certificate = machineRepresentation.makeCertificate(input.graph);
  const verification = machineRepresentation.verifyCertificate(certificate, input.graph);
  return { domain: "machine_representation", status: verification.status === "verified_machine_representation" ? "candidate_frozen" : "uncertain", decoder: certificate.representation.kind, representation: "机器 WL-1 向量摘要", hypothesis: certificate.representation.vector, complexity: certificate.representation.vector.length, complexityUnit: "machine_feature_count", residual: verification.status === "verified_machine_representation" ? 0 : 1, verification: verification.status, readability: { machine: certificate.representation, human: certificate.representation.translation }, limits: ["当前内置 graph_wl1 表示", "机器向量摘要可验证，人类翻译可能丢失信息"] };
}
function machineDecoderSearchCase(input) {
  const certificate = machineDecoderSearch.makeCertificate(input.examples); const verification = machineDecoderSearch.verifyCertificate(certificate, input.holdout || []);
  return { domain: "machine_decoder_search", status: verification.status === "verified_machine_decoder" ? "candidate_frozen" : "uncertain", decoder: certificate.winner.decoder, representation: certificate.winner.representation, hypothesis: certificate.winner, complexity: certificate.winner.total - certificate.winner.correct, complexityUnit: "training_error_count", residual: verification.status === "verified_machine_decoder" ? 0 : 1, verification: verification.status, readability: { machine: certificate.winner, human: `自动选择 ${certificate.winner.decoder} 解码器` }, limits: certificate.limits };
}
function hiddenStructureCase(input) { const result = hiddenStructure.discover(input.development, input.holdout || [], input.options || {}); return { domain: "hidden_sequence", status: result.status === "verified_hidden_structure" ? "candidate_frozen" : "uncertain", decoder: result.decoder, representation: "模仿射递推", hypothesis: result.winner, complexity: result.winner ? 3 : null, complexityUnit: "modulus_multiplier_offset", residual: result.residual, verification: result.status, candidateCount: result.candidateCount, limits: result.limits }; }
function hiddenCompetitionCase(input) { const result = hiddenCompetition.compete(input.development, input.holdout || [], input.stress || [], input.options || {}); return { domain: "hidden_sequence_competition", status: result.status === "verified_unique_hidden_structure" ? "candidate_frozen" : "uncertain", decoder: result.decoder, representation: "多机制候选竞争", hypothesis: result.winners, complexity: result.winners.length ? result.winners[0].complexity : null, complexityUnit: "candidate_complexity_proxy", residual: result.residual, verification: result.status, candidateCount: result.exactCandidateCount, candidates: result.candidates, limits: result.limits }; }
function capabilityMatrixCase(input) { const certificate = capabilityMatrix.makeCertificate(input.tasks, input.options || {}); const verification = capabilityMatrix.verifyCertificate(certificate); return { domain: "capability_matrix", status: verification.status === "verified_capability_matrix" ? "candidate_frozen" : "uncertain", decoder: "decoder_capability_matrix", representation: "校准—测试—stress 能力矩阵", hypothesis: certificate.result, complexity: input.tasks.length, complexityUnit: "task_count", residual: verification.status === "verified_capability_matrix" ? 0 : 1, verification: verification.status, limits: certificate.result.limits }; }
function identifiabilityCase(input) { const certificate = identifiability.makeCertificate(input.development, input.holdout || [], input.options || {}); const verification = identifiability.verifyCertificate(certificate); return { domain: "hidden_identifiability", status: verification.status === "identified_hidden_structure" ? "candidate_frozen" : "uncertain", decoder: "hidden_identifiability_frontier", representation: "候选机制分歧前沿", hypothesis: certificate.result.firstDistinguishingObservation, complexity: certificate.result.candidateCount, complexityUnit: "surviving_candidate_count", residual: verification.status === "invalid_certificate" ? 1 : null, verification: verification.status, recommendedAdditionalObservations: certificate.result.recommendedAdditionalObservations, limits: certificate.result.limits }; }

function generatedSequenceCase(input) {
  const searchResult = adaptiveSearch.adaptiveSynthesize(input.sequence, { splitSizes: input.splitSizes || [8, 10, 12], maxOrder: input.maxOrder || 2 });
  if (searchResult.status !== "candidate_frozen") return { domain: "sequence", status: "uncertain", decoder: null, complexity: null, residual: null, verification: "no_certificate", searchRounds: searchResult.rounds };
  const frozen = generator.createCertificate(input.sequence, input.horizon || 1, input.splitSizes || [8, 10, 12], searchResult.selectedOrder);
  if (!frozen.certificate) return { domain: "sequence", status: "uncertain", decoder: null, complexity: null, residual: null, verification: "no_certificate" };
  const verification = generatorVerifier.verifyCertificate(frozen.certificate, input.observed || []);
  return {
    domain: "sequence",
    status: "candidate_frozen",
    decoder: frozen.certificate.decoder,
    representation: `${frozen.certificate.transform}→${frozen.certificate.baseDecoder}`,
    hypothesis: frozen.certificate.model,
    complexity: frozen.certificate.model.base ? 1 : null,
    complexityUnit: "composed_decoder_proxy",
    residual: verification.status === "verified_composed_decoder" ? 0 : 1,
    residualMeaning: "composed_decoder_verification_failure_indicator",
    evidenceScope: "finite_sequence_and_observed_holdout",
    verification: verification.status,
    limits: frozen.certificate.limits,
    searchRounds: searchResult.rounds,
  };
}

function decode(input) {
  if (input?.domain === "sequence") return sequenceCase(input.development, input.holdout || []);
  if (input?.domain === "graph") return graphCase(input.graph);
  if (input?.domain === "equation") return equationCase(input);
  if (input?.domain === "equation_system") return equationSystemCase(input);
  if (input?.domain === "generated_sequence") return generatedSequenceCase(input);
  if (input?.domain === "polynomial") return polynomialCase(input);
  if (input?.domain === "polynomial_factor") return polynomialFactorCase(input);
  if (input?.domain === "polynomial_analysis") return polynomialAnalysisCase(input);
  if (input?.domain === "dynamics") return dynamicsCase(input);
  if (input?.domain === "dynamics_parameterized") return parameterizedDynamicsCase(input);
  if (input?.domain === "noisy_sequence") return noisySequenceCase(input);
  if (input?.domain === "dynamics_condition_multivariate") return multivariateConditionCase(input);
  if (input?.domain === "machine_representation") return machineRepresentationCase(input);
  if (input?.domain === "machine_decoder_search") return machineDecoderSearchCase(input);
  if (input?.domain === "hidden_sequence") return hiddenStructureCase(input);
  if (input?.domain === "hidden_sequence_competition") return hiddenCompetitionCase(input);
  if (input?.domain === "capability_matrix") return capabilityMatrixCase(input);
  if (input?.domain === "hidden_identifiability") return identifiabilityCase(input);
  throw new TypeError("协议输入必须声明受支持的 domain");
}

module.exports = { decode, sequenceCase, graphCase, equationCase, equationSystemCase, dynamicsCase, parameterizedDynamicsCase, noisySequenceCase, multivariateConditionCase, machineRepresentationCase, machineDecoderSearchCase, hiddenStructureCase, hiddenCompetitionCase, capabilityMatrixCase, identifiabilityCase };
