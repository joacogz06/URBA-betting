def calcular_probabilidad(valores: dict[str, float], pesos: dict[str, float]) -> tuple[float, float]:
    """
    Calcula la probabilidad del equipo local usando la fórmula:
    prob = (suma_obtenida + suma_maxima) / (2 * suma_maxima) * 100

    valores: {"Localía": 2, "Historial": -1, ...}
    pesos:   {"Localía": 2.0, "Historial": 1.0, ...}
    """
    suma_obtenida = sum(valores[k] * pesos[k] for k in valores if k in pesos)
    suma_maxima = sum(2 * pesos[k] for k in pesos)  # valor máximo posible = 2

    if suma_maxima == 0:
        return 50.0, 50.0

    prob_local = (suma_obtenida + suma_maxima) / (2 * suma_maxima) * 100
    prob_local = max(0.0, min(100.0, prob_local))
    prob_visitante = 100.0 - prob_local

    return round(prob_local, 2), round(prob_visitante, 2)


def kelly_stake(prob: float, cuota: float, bankroll: float, fraccion: float = 0.25) -> float:
    """
    Kelly criterion fraccionado.
    prob: probabilidad estimada (0-100)
    cuota: cuota decimal del bookmaker
    bankroll: capital total
    fraccion: fracción de Kelly a usar (0.25 = cuarto Kelly)
    """
    p = prob / 100
    q = 1 - p
    b = cuota - 1  # ganancia neta por unidad apostada

    kelly = (b * p - q) / b if b > 0 else 0
    kelly = max(0.0, kelly)  # nunca apostar si Kelly es negativo

    stake = kelly * fraccion * bankroll
    return round(stake, 2)