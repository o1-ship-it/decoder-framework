// Exhaustive finite comparison; targets reach the learner only via queries.
const active = require("./blackbox_active_design.js");

const OPTIONS = { maxMapDegree: 1, coefficientRange: 1, stateMin: -1, stateMax: 1 };
const AXES = [[1, 0], [0, 1]];
const DIAGONAL = [[-1, -1], [-1, 0]];

function targets() {
  const result = [];
  for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1)
    for (let c = -1; c <= 1; c += 1) for (let d = -1; d <= 1; d += 1)
      result.push({ id: [a, b, c, d].join(","), coefficients: [a, b, c, d] });
  return result;
}

// Reference matrix evaluator independent of the learner's polynomial code.
function observe(target, state) {
  const [a, b, c, d] = target.coefficients;
  const [x, y] = state;
  return { state: state.slice(), next: [a * x + b * y, c * x + d * y] };
}

function run(target, policy) {
  if (!["active", "fixed_axes", "fixed_diagonal"].includes(policy)) throw new TypeError("Unknown sampling policy");
  const training = [observe(target, [0, 0])];
  const trace = [];
  for (let steps = 0; steps <= 8; steps += 1) {
    const result = active.design(training, OPTIONS);
    if (result.status === "identified_blackbox_map") {
      return { status: result.status, steps, training, trace, inferredMap: result.inferredMap };
    }
    if (result.status !== "active_blackbox_observation_plan") return { status: result.status, steps, training, trace };
    const state = policy === "active" ? result.recommendation.state : (policy === "fixed_axes" ? AXES : DIAGONAL)[steps];
    if (!state) return { status: "uncertain_exhausted_observation_grid", steps, training, trace };
    trace.push({ state: state.slice(), candidateCount: result.candidateCount });
    training.push(observe(target, state));
  }
  return { status: "uncertain_exhausted_observation_grid", steps: 8, training, trace };
}

function states() {
  const result = [];
  for (let x = -1; x <= 1; x += 1) for (let y = -1; y <= 1; y += 1)
    if (x || y) result.push([x, y]);
  return result;
}

function factorial(n) { let value = 1; for (let k = 2; k <= n; k += 1) value *= k; return value; }
function popcount(mask) { let count = 0; for (; mask; mask &= mask - 1) count += 1; return count; }

function exactPassive(target, universe = targets()) {
  const grid = states();
  const differences = universe.filter(item => item.id !== target.id).map(item => grid.reduce((mask, point, index) => {
    const expected = observe(target, point).next;
    const predicted = observe(item, point).next;
    return expected.every((value, axis) => value === predicted[axis]) ? mask : mask | (1 << index);
  }, 0));
  const unresolvedBySize = Array(grid.length + 1).fill(0);
  for (let mask = 0; mask < (1 << grid.length); mask += 1)
    if (differences.some(difference => (difference & mask) === 0)) unresolvedBySize[popcount(mask)] += 1;
  if (unresolvedBySize[grid.length]) throw new Error("Grid cannot identify the target");
  // E[T] = sum P(T > k). Each k-subset occurs in k!(n-k)! permutations.
  const permutations = factorial(grid.length);
  const totalSteps = unresolvedBySize.reduce((sum, count, size) => sum + count * factorial(size) * factorial(grid.length - size), 0);
  const worstSteps = unresolvedBySize.reduce((max, count, size) => count ? size + 1 : max, 0);
  return { permutations, totalSteps, meanSteps: totalSteps / permutations, worstSteps, unresolvedBySize };
}

function summarize(runs) {
  return { identified: runs.filter(item => item.status === "identified_blackbox_map").length,
    totalSteps: runs.reduce((sum, item) => sum + item.steps, 0),
    meanSteps: runs.reduce((sum, item) => sum + item.steps, 0) / runs.length,
    maxSteps: Math.max(...runs.map(item => item.steps)) };
}

function compare() {
  const universe = targets();
  const rows = universe.map(target => {
    const activeRun = run(target, "active");
    const axes = run(target, "fixed_axes");
    const diagonal = run(target, "fixed_diagonal");
    const passive = exactPassive(target, universe);
    return { id: target.id, active: { status: activeRun.status, steps: activeRun.steps },
      fixedAxes: { status: axes.status, steps: axes.steps }, fixedDiagonal: { status: diagonal.status, steps: diagonal.steps }, passive };
  });
  const permutationsPerTarget = factorial(states().length);
  const passiveTotalSteps = rows.reduce((sum, row) => sum + row.passive.totalSteps, 0);
  return { schemaVersion: 1, claim: "blackbox_active_sampling_comparison", evaluation: "exhaustive_finite_census",
    options: OPTIONS, targetCount: universe.length, permutationsPerTarget,
    active: summarize(rows.map(row => row.active)), fixedAxes: summarize(rows.map(row => row.fixedAxes)),
    fixedDiagonal: summarize(rows.map(row => row.fixedDiagonal)),
    passiveUniform: { totalSteps: passiveTotalSteps, runCount: universe.length * permutationsPerTarget,
      meanSteps: passiveTotalSteps / (universe.length * permutationsPerTarget), maxSteps: Math.max(...rows.map(row => row.passive.worstSteps)) },
    rows, limits: ["Origin is observed for free in all policies; steps count new queries only.",
      "All 81 linear parts with coefficients -1,0,1 and zero translation; not hidden or external tests.",
      "Knowing the origin fixes affine translation; only the linear part remains ambiguous.",
      "Uniform passive expectation covers all 8! orders with no replacement; no fitted seeds.",
      "The learner's candidate family is correct by construction. No out-of-family guarantee.",
      "One-step minimax splitting does not imply globally optimal experiment design."] };
}

module.exports = { OPTIONS, targets, observe, run, states, exactPassive, compare };
