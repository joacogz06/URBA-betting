import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPartidos, getPosiciones, getFechaActual } from '../api'
import api from '../api/client'
import type { Partido } from '../types'

export default function Inicio() {
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [posiciones, setPosiciones] = useState<Record<string, unknown>[]>([])
    const [bankroll, setBankroll] = useState(150000)
    const [editingBankroll, setEditingBankroll] = useState(false)
    const [tempBankroll, setTempBankroll] = useState('')
    const [loading, setLoading] = useState(true)
    const [fechaActual, setFechaActual] = useState<number | null>(null)
    const [editandoCuotas, setEditandoCuotas] = useState(false)
    const [cuotasTemp, setCuotasTemp] = useState<Record<number, { betsson: string; codere: string }>>({})

    const CHAMP_ID = '2025176'
    const navigate = useNavigate()

    useEffect(() => {
        const cargar = async () => {
            try {
                const [posRes, fechaRes] = await Promise.all([
                    getPosiciones(CHAMP_ID),
                    getFechaActual(),
                ])
                setPosiciones(posRes.data?.positions || posRes.data || [])

                const fechaNum: number | null = fechaRes.data?.fecha_num ?? null
                setFechaActual(fechaNum)

                const params = fechaNum
                    ? { temporada: '2026', fecha_num: fechaNum }
                    : { temporada: '2026' }
                const partidosRes = await getPartidos(params)
                setPartidos(partidosRes.data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        cargar()
    }, [])

    const formatMoney = (n: number) =>
        '$' + n.toLocaleString('es-AR')

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

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
    )

    return (
        <div className="p-6 space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-6 py-4 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-400 tracking-widest uppercase">Bankroll</div>
                    {editingBankroll ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="number"
                                value={tempBankroll}
                                onChange={e => setTempBankroll(e.target.value)}
                                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-green-400 text-2xl font-bold w-40"
                                autoFocus
                            />
                            <button
                                onClick={() => { setBankroll(Number(tempBankroll)); setEditingBankroll(false) }}
                                className="text-sm text-green-400 hover:text-green-300"
                            >Guardar</button>
                        </div>
                    ) : (
                        <div
                            className="text-2xl font-bold text-green-400 cursor-pointer hover:text-green-300"
                            onClick={() => { setTempBankroll(String(bankroll)); setEditingBankroll(true) }}
                        >
                            {formatMoney(bankroll)}
                        </div>
                    )}
                </div>
                <button className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded">
                    Actualizar
                </button>
            </div>

            <div className="grid grid-cols-[1fr_2fr] gap-4">
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                            Tabla — Temporada 2026
                        </h2>
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
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">
                                        Sin datos de posiciones
                                    </td>
                                </tr>
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
                                <th className="px-4 py-2 text-right">Apostar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partidos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-xs">
                                        Sin partidos cargados
                                    </td>
                                </tr>
                            ) : partidos.map(p => (
                                <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{p.local} vs {p.visitante}</div>
                                        <div className="text-xs text-gray-500">Fecha {p.fecha_num}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300">
                                        {p.cuota_local_betsson
                                            ? `${(1 / p.cuota_local_betsson * 100).toFixed(1)}%`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300">
                                        {p.cuota_local_codere
                                            ? `${(1 / p.cuota_local_codere * 100).toFixed(1)}%`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-gray-500 text-xs">Sin calcular</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => navigate(`/calculadora?partido=${p.id}`)}
                                            className="text-xs text-gray-400 hover:text-white"
                                        >
                                            Calcular →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                                type="number"
                                                step="0.01"
                                                value={cuotasTemp[p.id]?.betsson ?? ''}
                                                onChange={e => setCuotasTemp(prev => ({ ...prev, [p.id]: { ...prev[p.id], betsson: e.target.value } }))}
                                                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white text-xs"
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cuotasTemp[p.id]?.codere ?? ''}
                                                onChange={e => setCuotasTemp(prev => ({ ...prev, [p.id]: { ...prev[p.id], codere: e.target.value } }))}
                                                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center text-white text-xs"
                                                placeholder="—"
                                            />
                                        </td>
                                        <td className="py-2 pl-2">
                                            <button
                                                onClick={() => guardarCuota(p.id)}
                                                className="text-xs text-green-400 hover:text-green-300"
                                            >Guardar</button>
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
        </div>
    )
}