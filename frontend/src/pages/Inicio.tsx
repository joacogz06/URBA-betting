import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPartidos, getPosiciones, getFechaActual, getUltimosCalculos, createApuesta, getBankroll, updateBankroll } from '../api'
import type { UltimoCalculo, AnalisisCasa } from '../api'
import api from '../api/client'
import type { Partido } from '../types'

type MisCalculos = Record<number, UltimoCalculo>

interface ModalApuesta {
    partido: Partido
    calculo: UltimoCalculo
    bankrollActual: number
}

export default function Inicio() {
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [posiciones, setPosiciones] = useState<Record<string, unknown>[]>([])
    const [bankroll, setBankroll] = useState<number | null>(null)
    const [editingBankroll, setEditingBankroll] = useState(false)
    const [tempBankroll, setTempBankroll] = useState('')
    const [loading, setLoading] = useState(true)
    const [fechaActual, setFechaActual] = useState<number | null>(null)
    const [editandoCuotas, setEditandoCuotas] = useState(false)
    const [cuotasTemp, setCuotasTemp] = useState<Record<number, { betsson: string; codere: string }>>({})
    const [misCalculos, setMisCalculos] = useState<MisCalculos>({})
    const [modalApuesta, setModalApuesta] = useState<ModalApuesta | null>(null)
    const [casaSeleccionada, setCasaSeleccionada] = useState<'betsson' | 'codere'>('betsson')
    const [stakeCustom, setStakeCustom] = useState('')

    const CHAMP_ID = '2025176'
    const navigate = useNavigate()

    useEffect(() => {
        const cargar = async () => {
            try {
                const [posRes, fechaRes, bankrollRes] = await Promise.all([
                    getPosiciones(CHAMP_ID),
                    getFechaActual(),
                    getBankroll(),
                ])
                setPosiciones(posRes.data?.positions || posRes.data || [])
                setBankroll(bankrollRes.data.bankroll_inicial)
                const fechaNum: number | null = fechaRes.data?.fecha_num ?? null
                setFechaActual(fechaNum)
                const params = fechaNum
                    ? { temporada: '2026', fecha_num: fechaNum }
                    : { temporada: '2026' }
                const [partidosRes, calcRes] = await Promise.all([
                    getPartidos(params),
                    getUltimosCalculos(),
                ])
                setPartidos(partidosRes.data)
                setMisCalculos(calcRes.data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        cargar()
    }, [])

    const formatMoney = (n: number) => '$' + Math.round(n).toLocaleString('es-AR')

    const abrirEditorCuotas = () => {
        const init: Record<number, { betsson: string; codere: string }> = {}
        partidos.forEach(p => {
            init[p.id] = {
                betsson: p.cuota_local_betsson?.toString() ?? '',
                codere: p.cuota_local_codere?.toString() ?? '',
            }
        })
        setCuotasTemp(init)
        setEditandoCuotas(true)
    }

    const guardarCuota = async (partidoId: number) => {
        const c = cuotasTemp[partidoId]
        await api.patch(`/partidos/${partidoId}/cuotas`, {
            cuota_local_betsson: c.betsson ? Number(c.betsson) : null,
            cuota_local_codere: c.codere ? Number(c.codere) : null,
        })
        setPartidos(prev => prev.map(p =>
            p.id === partidoId
                ? { ...p, cuota_local_betsson: c.betsson ? Number(c.betsson) : null, cuota_local_codere: c.codere ? Number(c.codere) : null }
                : p
        ))
    }

    const guardarBankroll = async () => {
        const nuevo = Number(tempBankroll)
        if (!nuevo || nuevo <= 0) return
        const res = await updateBankroll(nuevo)
        setBankroll(res.data.bankroll_inicial)
        setEditingBankroll(false)
    }

    const abrirModalApuesta = (partido: Partido) => {
        const calculo = misCalculos[partido.id]
        if (!calculo || bankroll === null) return
        // Seleccionar por defecto la mejor casa con valor, o la primera disponible
        const defaultCasa = calculo.mejor_casa
            ?? (calculo.betsson ? 'betsson' : calculo.codere ? 'codere' : 'betsson')
        setCasaSeleccionada(defaultCasa as 'betsson' | 'codere')
        setStakeCustom('')
        setModalApuesta({ partido, calculo, bankrollActual: bankroll })
    }

    const confirmarApuesta = async () => {
        if (!modalApuesta) return
        const analisis = modalApuesta.calculo[casaSeleccionada] as AnalisisCasa
        if (!analisis) return
        const stake = stakeCustom ? Number(stakeCustom) : Math.round(analisis.kelly_fraccion * modalApuesta.bankrollActual)
        if (!stake || stake <= 0) return
        await createApuesta({
            partido_id: modalApuesta.partido.id,
            equipo_apostado: analisis.apostar_a ?? 'local',
            stake,
            cuota: analisis.cuota,
        })
        setModalApuesta(null)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
    )

    return (
        <div className="p-6 space-y-4">
            {/* Bankroll */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-6 py-4 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-400 tracking-widest uppercase">Bankroll inicial</div>
                    {editingBankroll ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                value={tempBankroll}
                                onChange={e => setTempBankroll(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && guardarBankroll()}
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-green-400 text-2xl font-bold w-44"
                                autoFocus
                            />
                            <button onClick={guardarBankroll} className="text-sm text-green-400 hover:text-green-300">Guardar</button>
                            <button onClick={() => setEditingBankroll(false)} className="text-sm text-gray-500 hover:text-gray-300">Cancelar</button>
                        </div>
                    ) : (
                        <div
                            className="text-2xl font-bold text-green-400 cursor-pointer hover:text-green-300"
                            onClick={() => { setTempBankroll(String(bankroll ?? '')); setEditingBankroll(true) }}
                        >
                            {bankroll !== null ? formatMoney(bankroll) : '—'}
                        </div>
                    )}
                </div>
                {!editingBankroll && (
                    <button
                        onClick={() => { setTempBankroll(String(bankroll ?? '')); setEditingBankroll(true) }}
                        className="border border-gray-600 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded transition-colors"
                    >
                        ✏️ Editar
                    </button>
                )}
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4">
                {/* Tabla posiciones */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">Tabla — Temporada 2026</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-xs">
                                <th className="px-4 py-2 text-left">#</th>
                                <th className="px-4 py-2 text-left">Club</th>
                                <th className="px-4 py-2 text-right">PJ</th>
                                <th className="px-4 py-2 text-right">PTS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posiciones.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">Sin datos de posiciones</td></tr>
                            ) : posiciones.map((p, i) => (
                                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                                    <td className="px-4 py-2 font-medium">{String((p.team as Record<string, unknown>)?.name ?? '—')}</td>
                                    <td className="px-4 py-2 text-right text-gray-400">{String(p.played ?? '—')}</td>
                                    <td className="px-4 py-2 text-right font-bold text-green-400">{String(p.points_total ?? '—')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Partidos */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                            {fechaActual ? `Fecha ${fechaActual}` : 'Partidos'}
                        </h2>
                        <button
                            onClick={abrirEditorCuotas}
                            className="border border-green-600 text-green-400 hover:bg-green-600 hover:text-white text-xs px-3 py-1 rounded transition-colors"
                        >
                            ✏️ Editar cuotas
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-xs">
                                <th className="px-4 py-2 text-left">Partido</th>
                                <th className="px-4 py-2 text-right">Prob. Betsson</th>
                                <th className="px-4 py-2 text-right">Prob. Codere</th>
                                <th className="px-4 py-2 text-right">Mi prob.</th>
                                <th className="px-4 py-2 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partidos.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">Sin partidos cargados</td></tr>
                            ) : partidos.map(p => {
                                const calc = misCalculos[p.id]
                                return (
                                    <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{p.local} vs {p.visitante}</div>
                                            <div className="text-xs text-gray-500">Fecha {p.fecha_num}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-300">
                                            {p.cuota_local_betsson ? `${(1 / p.cuota_local_betsson * 100).toFixed(1)}%` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-300">
                                            {p.cuota_local_codere ? `${(1 / p.cuota_local_codere * 100).toFixed(1)}%` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {calc ? (
                                                <span className="text-green-400 font-medium">{calc.prob_local.toFixed(1)}%</span>
                                            ) : (
                                                <span className="text-gray-500 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/calculadora?partido=${p.id}`)}
                                                    className="text-xs text-gray-400 hover:text-white"
                                                >
                                                    Calcular →
                                                </button>
                                                {calc && (
                                                    <button
                                                        onClick={() => abrirModalApuesta(p)}
                                                        className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${calc.hay_valor
                                                                ? 'bg-green-700 hover:bg-green-600 text-white'
                                                                : 'bg-red-900/60 hover:bg-red-800/60 text-red-300'
                                                            }`}
                                                    >
                                                        Apostar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal editar cuotas */}
            {editandoCuotas && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-green-400 tracking-widest uppercase">Editar cuotas</h2>
                            <button onClick={() => setEditandoCuotas(false)} className="text-gray-500 hover:text-white text-lg">✕</button>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500 text-xs">
                                    <th className="py-2 text-left">Partido</th>
                                    <th className="py-2 text-center">Betsson</th>
                                    <th className="py-2 text-center">Codere</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {partidos.map(p => (
                                    <tr key={p.id} className="border-t border-gray-800">
                                        <td className="py-2 pr-4 text-xs">{p.local} vs {p.visitante}</td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number" step="0.01"
                                                value={cuotasTemp[p.id]?.betsson ?? ''}
                                                onChange={e => setCuotasTemp(prev => ({ ...prev, [p.id]: { ...prev[p.id], betsson: e.target.value } }))}
                                                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white text-xs"
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number" step="0.01"
                                                value={cuotasTemp[p.id]?.codere ?? ''}
                                                onChange={e => setCuotasTemp(prev => ({ ...prev, [p.id]: { ...prev[p.id], codere: e.target.value } }))}
                                                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white text-xs"
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="py-2 pl-2">
                                            <button onClick={() => guardarCuota(p.id)} className="text-xs text-green-400 hover:text-green-300">Guardar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex justify-end">
                            <button onClick={() => setEditandoCuotas(false)} className="text-xs text-gray-400 hover:text-white">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal apostar */}
            {modalApuesta && (() => {
                const { partido, calculo, bankrollActual } = modalApuesta
                const casas: Array<{ key: 'betsson' | 'codere'; label: string; data: AnalisisCasa }> = [
                    { key: 'betsson', label: 'Betsson', data: calculo.betsson },
                    { key: 'codere', label: 'Codere', data: calculo.codere },
                ].filter(c => c.data !== null) as Array<{ key: 'betsson' | 'codere'; label: string; data: AnalisisCasa }>

                const analisisActual = calculo[casaSeleccionada] as AnalisisCasa
                const stakeKelly = analisisActual ? Math.round(analisisActual.kelly_fraccion * bankrollActual) : 0
                const stakeUsado = stakeCustom ? Number(stakeCustom) : stakeKelly

                return (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-green-400 tracking-widest uppercase">Análisis de apuesta</h2>
                                <button onClick={() => setModalApuesta(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-white">{partido.local} vs {partido.visitante}</div>
                                <div className="text-xs text-gray-500 mt-0.5">Fecha {partido.fecha_num}</div>
                            </div>

                            {/* Mis probabilidades */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800 rounded p-3 text-center">
                                    <div className="text-xs text-gray-500 mb-1">{partido.local}</div>
                                    <div className="text-2xl font-bold text-green-400">{calculo.prob_local.toFixed(1)}%</div>
                                </div>
                                <div className="bg-gray-800 rounded p-3 text-center">
                                    <div className="text-xs text-gray-500 mb-1">{partido.visitante}</div>
                                    <div className="text-2xl font-bold text-gray-300">{calculo.prob_visitante.toFixed(1)}%</div>
                                </div>
                            </div>

                            {/* Tabs por casa */}
                            {casas.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm py-4">Sin cuotas cargadas para este partido</div>
                            ) : (
                                <>
                                    <div className="flex gap-2">
                                            {casas.map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => { setCasaSeleccionada(key); setStakeCustom('') }}
                                                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors relative ${casaSeleccionada === key
                                                        ? 'bg-gray-700 border-gray-500 text-white'
                                                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                                                    }`}
                                            >
                                                {label}
                                                {calculo.mejor_casa === key && (
                                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-yellow-400 bg-gray-900 px-1 tracking-wider">
                                                        MEJOR
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {analisisActual && (
                                        <div className="space-y-3">
                                            {/* Info de la casa */}
                                            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                                                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                                                    <div>
                                                        <div className="text-gray-500 mb-1">Cuota</div>
                                                        <div className="text-white font-bold text-lg">{analisisActual.cuota}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-500 mb-1">Prob. casa</div>
                                                        <div className="text-gray-300 font-bold text-lg">{analisisActual.prob_casa.toFixed(1)}%</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-gray-500 mb-1">Edge</div>
                                                        <div className={`font-bold text-lg ${Math.abs(analisisActual.edge) >= 5 ? (analisisActual.edge > 0 ? 'text-green-400' : 'text-green-400') : 'text-red-400'}`}>
                                                            {analisisActual.edge > 0 ? '+' : ''}{analisisActual.edge.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </div>

                                                {analisisActual.hay_valor ? (
                                                    <div className="border-t border-gray-700 pt-3">
                                                        <div className="text-xs text-gray-500 mb-2">Recomendación</div>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-xs text-gray-400">Apostar a </span>
                                                                <span className="text-white font-semibold">
                                                                    {analisisActual.apostar_a === 'local' ? partido.local : partido.visitante}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-gray-500">Quarter Kelly</div>
                                                                <div className="text-green-400 font-bold">{formatMoney(stakeKelly)}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="border-t border-gray-700 pt-3 text-center">
                                                        <span className="text-xs text-red-400">Sin valor suficiente en esta casa (edge {'<'} 5%)</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stake editable */}
                                            {analisisActual.hay_valor && (
                                                <div>
                                                    <div className="text-xs text-gray-500 mb-1">
                                                        Stake a apostar <span className="text-gray-600">(podés modificarlo)</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={stakeCustom || stakeKelly}
                                                        onChange={e => setStakeCustom(e.target.value)}
                                                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                                                    />
                                                    {stakeUsado > 0 && analisisActual.cuota && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Ganancia potencial: <span className="text-green-400 font-semibold">{formatMoney(stakeUsado * analisisActual.cuota - stakeUsado)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-3 justify-end pt-1">
                                <button onClick={() => setModalApuesta(null)} className="text-xs text-gray-400 hover:text-white px-3 py-2">
                                    Cancelar
                                </button>
                                {analisisActual?.hay_valor && (
                                    <button
                                        onClick={confirmarApuesta}
                                        disabled={stakeUsado <= 0}
                                        className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded"
                                    >
                                        Confirmar apuesta
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}