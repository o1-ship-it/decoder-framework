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
  throw new TypeError("协议输入必须声明受支持的 domain");
}

module.exports = { decode, sequenceCase, graphCase, equationCase, equationSystemCase, dynamicsCase, parameterizedDynamicsCase };
