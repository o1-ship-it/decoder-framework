"""Minimal benchmark for the decoder theory.

The benchmark intentionally uses transparent baseline decoders so that each
prediction can be inspected and verified without external dependencies.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Callable, List, Optional, Sequence


Number = float


@dataclass
class DecoderResult:
    name: str
    description_length: float
    predicted: List[Number]
    valid: bool
    note: str


def arithmetic_decoder(train: Sequence[Number], horizon: int) -> DecoderResult:
    if len(train) < 2:
        return DecoderResult("arithmetic", float("inf"), [], False, "需要至少两个样本")
    d = train[1] - train[0]
    if any(train[i] - train[i - 1] != d for i in range(2, len(train))):
        return DecoderResult("arithmetic", float("inf"), [], False, "差分不恒定")
    predicted = [train[-1] + d * (i + 1) for i in range(horizon)]
    # Two parameters: initial value and common difference.
    return DecoderResult("arithmetic", 2.0, predicted, True, f"公差={d:g}")


def periodic_decoder(train: Sequence[Number], horizon: int) -> DecoderResult:
    n = len(train)
    for period in range(1, n // 2 + 1):
        if all(train[i] == train[i % period] for i in range(n)):
            predicted = [train[(n + i) % period] for i in range(horizon)]
            return DecoderResult(
                "periodic", float(period), predicted, True, f"周期={period}"
            )
    return DecoderResult("periodic", float("inf"), [], False, "未发现稳定周期")


def polynomial_decoder(train: Sequence[Number], horizon: int) -> DecoderResult:
    # Newton forward extrapolation using finite differences. This always fits
    # the observed prefix, which makes it a useful overfitting control.
    table = [list(train)]
    while len(table[-1]) > 1:
        previous = table[-1]
        table.append([previous[i + 1] - previous[i] for i in range(len(previous) - 1)])
    work = [row[-1] for row in table]
    predicted: List[Number] = []
    for _ in range(horizon):
        predicted.append(sum(work))
        for level in range(len(work) - 1, 0, -1):
            work[level - 1] += work[level]
    # Degree + initial value encode the fitted polynomial; larger degree costs more.
    degree = max(0, len(train) - 1)
    return DecoderResult("polynomial", float(degree + 1), predicted, True, f"次数={degree}")


def constant_decoder(train: Sequence[Number], horizon: int) -> DecoderResult:
    if not train or any(value != train[0] for value in train):
        return DecoderResult("constant", float("inf"), [], False, "序列不恒定")
    return DecoderResult("constant", 1.0, [train[0]] * horizon, True, "常数")


DECODERS: List[Callable[[Sequence[Number], int], DecoderResult]] = [
    constant_decoder,
    arithmetic_decoder,
    periodic_decoder,
    polynomial_decoder,
]


def prediction_error(predicted: Sequence[Number], expected: Sequence[Number]) -> Optional[float]:
    if len(predicted) != len(expected):
        return None
    return sum(abs(a - b) for a, b in zip(predicted, expected)) / len(expected)


def run_case(name: str, sequence: Sequence[Number], train_size: int = 6, horizon: int = 4) -> None:
    train = sequence[:train_size]
    hidden = sequence[train_size : train_size + horizon]
    print(f"\n{name}: 已知={list(train)}, 隐藏={list(hidden)}")
    print("解码器        描述长度  平均预测误差  说明")
    for decoder in DECODERS:
        result = decoder(train, horizon)
        if not result.valid:
            print(f"{result.name:<12} {'∞':>8} {'—':>12}  {result.note}")
            continue
        error = prediction_error(result.predicted, hidden)
        error_text = f"{error:.3g}" if error is not None else "—"
        print(f"{result.name:<12} {result.description_length:>8.3g} {error_text:>12}  {result.note}")


def main() -> None:
    random.seed(7)
    cases = {
        "算术序列": [3 + 4 * i for i in range(10)],
        "周期序列": [1, 2, 3, 1, 2, 3, 1, 2, 3, 1],
        "二次序列": [i * i for i in range(10)],
        "随机序列": [random.randrange(10) for _ in range(10)],
    }
    for name, sequence in cases.items():
        run_case(name, sequence)


if __name__ == "__main__":
    main()
