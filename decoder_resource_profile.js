function profile(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) throw new TypeError("任务列表不能为空");
  return { schemaVersion: 1, claim: "decoder_resource_profile", tasks: tasks.map(task => { const start = process.hrtime.bigint(); let result; let error = null; try { result = task.run(); } catch (caught) { error = caught.message; } const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6; return { name: task.name, elapsedMs, status: error ? "error" : result?.verification || result?.status || "completed", candidateCount: Array.isArray(result?.hypothesis) ? result.hypothesis.length : (Array.isArray(result?.invariants) ? result.invariants.length : null), error }; }) };
}
module.exports = { profile };
