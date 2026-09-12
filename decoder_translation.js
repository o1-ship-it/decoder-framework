// Measure the observable portion of a machine decoder result.
// This is a field-coverage proxy, not an information-theoretic quantity.

function coverage(result) {
  const machine = result?.readability?.machine || result?.hypothesis || null;
  const human = result?.readability?.human || result?.representation || null;
  const machineFields = machine && typeof machine === "object" ? Object.keys(machine).length : machine ? 1 : 0;
  const humanFields = human && typeof human === "object" ? Object.keys(human).length : human ? 1 : 0;
  return { machineFields, humanFields, translatedFields: humanFields, coverage: machineFields ? Math.min(1, humanFields / machineFields) : null, limitation: "字段覆盖率代理，不等于内部信息的可逆翻译" };
}

module.exports = { coverage };
