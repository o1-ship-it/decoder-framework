// Conjectures are finite, explicitly scoped claims generated from decoders.

const generator = require("./decoder_generator.js");
const generatorVerifier = require("./decoder_generator_verifier.js");
const graph = require("./graph_decoder.js");
const polynomialAnalysis = require("./polynomial_analysis.js");
const polynomialAnalysisVerifier = require("./polynomial_analysis_verifier.js");
const dynamics = require("./dynamics_invariant.js");

function sequenceConjecture(sequence, horizon = 4) {
  if (!Array.isArray(sequence) || sequence.length < 16 + horizon) return { status: "uncertain", domain: "sequence", claim: null, reason: "需要 16 项开发数据和留出数据" };
  const development = sequence.slice(0, 16);
  const frozen = generator.createCertificate(development, horizon, [8, 10, 12], 2);
  if (!frozen.certificate) return { status: "uncertain", domain: "sequence", claim: null, reason: "没有所有切分都通过的组合解码器" };
  const certificate = frozen.certificate;
  return {
    status: "conjecture",
    domain: "sequence",
    claim: { kind: "finite_sequence_rule", decoder: certificate.decoder, transform: certificate.transform, baseModel: certificate.model.base },
    evidence: { developmentLength: certificate.development.length, forecast: certificate.forecast, exactRate: certificate.selection.exactRate },
    limits: certificate.limits,
    verify: observed => generatorVerifier.verifyCertificate(certificate, observed || []),
  };
}

function graphConjecture(input) {
  const selection = graph.select(input);
  if (!selection.winner) return { status: "uncertain", domain: "graph", claim: null, reason: "没有匹配的结构解码器" };
  const winner = selection.winner;
  return {
    status: "conjecture",
    domain: "graph",
    claim: { kind: "finite_graph_invariant", decoder: winner.name, model: winner.model },
    evidence: { vertices: input.n, edges: input.edges.length, validCandidates: selection.candidates.filter(item => item.valid).map(item => item.name) },
    limits: ["有限简单无向图", "结构判断依赖预设不变量", "不等价于完整图同构定理"],
    verify: candidate => graph.verifyModel(winner.model, candidate) ? { status: "verified_conjecture_instance" } : { status: "counterexample_found" },
  };
}

function polynomialConjecture(input) {
  const analysis = polynomialAnalysis.analyze(input);
  if (!analysis.homogeneous) return { status: "uncertain", domain: "polynomial", claim: null, reason: "非齐次表达式没有当前欧拉猜想的适用条件" };
  const certificate = polynomialAnalysis.makeCertificate(input);
  return {
    status: "conjecture",
    domain: "polynomial",
    claim: { kind: "euler_homogeneous_identity", degree: analysis.totalDegree, variables: analysis.variables },
    evidence: { termCount: analysis.normalized.terms.length, checked: analysis.eulerIdentity },
    limits: certificate.limits,
    verify: candidate => polynomialAnalysisVerifier.verifyCertificate(certificate, candidate),
  };
}

function dynamicsConjecture(input, maxDegree = 2, coefficientRange = 1) {
  const certificate = dynamics.makeCertificate(input, maxDegree, coefficientRange);
  if (certificate.invariants.length === 0) return { status: "uncertain", domain: "dynamics", claim: null, reason: "当前有限搜索范围没有非平凡守恒量", limits: certificate.limits };
  const invariants = certificate.invariants;
  return {
    status: "conjecture",
    domain: "dynamics",
    claim: { kind: "polynomial_dynamics_invariant", invariants: invariants.map(item => item.rule), search: certificate.search },
    evidence: { invariantCount: invariants.length, checkedSymbolically: true },
    limits: certificate.limits,
    verify: candidate => {
      try {
        if (!candidate?.x || !candidate?.y || !invariants.every(item => dynamics.verifyInvariant(item, candidate))) return { status: "counterexample_found" };
        return { status: "verified_dynamics_conjecture", invariantCount: invariants.length };
      } catch { return { status: "counterexample_found" }; }
    },
  };
}

module.exports = { sequenceConjecture, graphConjecture, polynomialConjecture, dynamicsConjecture };
