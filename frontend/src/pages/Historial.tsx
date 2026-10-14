import { useEffect, useState } from 'react'
import { getApuestas, getPartidos, updateResultado, deleteApuesta } from '../api'
import type { Apuesta, Partido } from '../types'

const TEMPORADAS = ['2026']

export default function Historial() {
    const [apuestas, setApuestas] = useState<Apuesta[]>([])
    const [partidosMap, setPartidosMap] = useState<Record<number, Partido>>({})
    const [loading, setLoading] = useState(true)
    const [temporada, setTemporada] = useState('2026')
    const [fechaIdx, setFechaIdx] = useState(0)
    const [cancelConfirm, setCancelConfirm] = useState<number | null>(null)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true)
    }, [temporada])

    useEffect(() => {
        Promise.all([
            getApuestas(),
            getPartidos({ temporada }),
        ]).then(([apRes, pRes]) => {
            const apList: Apuesta[] = apRes.data
            const pMap: Record<number, Partido> = {}
            pRes.data.forEach((p: Partido) => { pMap[p.id] = p })
            setApuestas(apList)
            setPartidosMap(pMap)
            const fechas = getFechas(apList, pMap)
            setFechaIdx(fechas.length > 0 ? fechas.length - 1 : 0)
            setLoading(false)
        }).catch((err) => {
            console.error(err)
            setLoading(false)
        })
    }, [temporada])

    function getFechas(ap: Apuesta[], pm: Record<number, Partido>): number[] {
        const set = new Set<number>()
        ap.forEach(a => {
            const fn = pm[a.partido_id]?.fecha_num
            if (fn !== undefined) set.add(fn)
        })
        return Array.from(set).sort((a, b) => a - b)
    }

    const fechas = getFechas(apuestas, partidosMap)
    const fechaActual = fechas[fechaIdx] ?? null
    const apuestasFecha = fechaActual !== null
        ? apuestas.filter(a => partidosMap[a.partido_id]?.fecha_num === fechaActual)
        : []

    // Stats totales
    const tApostadas = apuestas.length
    const tGanadas = apuestas.filter(a => a.resultado === true).length
    const tPerdidas = apuestas.filter(a => a.resultado === false).length
    const tNeto = apuestas.reduce((s, a) => s + (a.ganancia_neta ?? 0), 0)
    const tApostado = apuestas.reduce((s, a) => s + a.stake, 0)

    // Stats fecha
    const fApostadas = apuestasFecha.length
    const fGanadas = apuestasFecha.filter(a => a.resultado === true).length
    const fPerdidas = apuestasFecha.filter(a => a.resultado === false).length
    const fNeto = apuestasFecha.reduce((s, a) => s + (a.ganancia_neta ?? 0), 0)
    const fApostado = apuestasFecha.reduce((s, a) => s + a.stake, 0)

    const fmt = (n: number) =>
        (n >= 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString('es-AR')

    const handleResultado = async (apuesta: Apuesta, resultado: boolean) => {
        const ganancia_neta = resultado
            ? apuesta.stake * (apuesta.cuota - 1)
            : -apuesta.stake
        await updateResultado(apuesta.id, { resultado, ganancia_neta })
        setApuestas(prev => prev.map(a =>
            a.id === apuesta.id ? { ...a, resultado, ganancia_neta } : a
        ))
    }

    const handleCancelar = async (id: number) => {
        await deleteApuesta(id)
        setApuestas(prev => prev.filter(a => a.id !== id))
        setCancelConfirm(null)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
    )

    return (
        <div className="p-6 space-y-5">

            {/* Selector temporada */}
            <div className="flex gap-2">
                {TEMPORADAS.map(t => (
                    <button
                        key={t}
                        onClick={() => setTemporada(t)}
                        className={`px-4 py-1.5 rounded text-sm font-semibold border transition-colors ${temporada === t
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'border-gray-600 text-gray-400 hover:border-gray-400'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Stats totales */}
            <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Temporada {temporada}
                </div>
                <div className="grid grid-cols-5 gap-3">
                    {[
                        { label: 'Apostadas', value: tApostadas, color: 'text-white' },
                        { label: 'Ganadas', value: tGanadas, color: 'text-green-400' },
                        { label: 'Perdidas', value: tPerdidas, color: 'text-red-400' },
                        { label: 'Resultado neto', value: fmt(tNeto), color: tNeto >= 0 ? 'text-green-400' : 'text-red-400' },
                        { label: 'Total apostado', value: '$' + tApostado.toLocaleString('es-AR'), color: 'text-white' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel por fecha */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">

                {/* Navegación */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                    <button
                        onClick={() => setFechaIdx(i => Math.max(0, i - 1))}
                        disabled={fechaIdx === 0 || fechas.length === 0}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 text-lg"
                    >
                        ←
                    </button>
                    <div className="text-sm font-semibold text-white">
                        {fechaActual !== null ? `Fecha ${fechaActual}` : 'Sin fechas'}
                    </div>
                    <button
                        onClick={() => setFechaIdx(i => Math.min(fechas.length - 1, i + 1))}
                        disabled={fechaIdx >= fechas.length - 1 || fechas.length === 0}
                        className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 text-lg"
                    >
                        →
                    </button>
                </div>

                {/* Stats de la fecha */}
                {fechaActual !== null && (
                    <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { label: 'Apostadas', value: fApostadas, color: 'text-white' },
                                { label: 'Ganadas', value: fGanadas, color: 'text-green-400' },
                                { label: 'Perdidas', value: fPerdidas, color: 'text-red-400' },
                                { label: 'Neto', value: fmt(fNeto), color: fNeto >= 0 ? 'text-green-400' : 'text-red-400' },
                                { label: 'Apostado', value: '$' + fApostado.toLocaleString('es-AR'), color: 'text-white' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="bg-gray-900 border border-gray-700 rounded px-3 py-2">
                                    <div className={`text-base font-bold ${color}`}>{value}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lista de apuestas de la fecha */}
                {apuestasFecha.length === 0 ? (
                    <div className="px-4 py-10 text-center text-gray-500 text-sm">
                        {fechaActual !== null ? 'No hay apuestas en esta fecha.' : 'No hay apuestas registradas todavía.'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {apuestasFecha.map(a => {
                            const partido = partidosMap[a.partido_id]
                            const cancelando = cancelConfirm === a.id
                            return (
                                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50">
                                    <div>
                                        <div className="font-medium text-sm">
                                            {partido
                                                ? `${partido.local} vs ${partido.visitante}`
                                                : `Partido #${a.partido_id}`}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {a.equipo_apostado} · ×{a.cuota}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">${a.stake.toLocaleString('es-AR')}</div>
                                            <div className="text-xs text-gray-500">Stake</div>
                                        </div>

                                        {cancelando ? (
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className="text-gray-400">¿Cancelar?</span>
                                                <button
                                                    onClick={() => handleCancelar(a.id)}
                                                    className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded"
                                                >
                                                    Sí
                                                </button>
                                                <button
                                                    onClick={() => setCancelConfirm(null)}
                                                    className="px-2 py-1 border border-gray-600 text-gray-400 hover:text-white rounded"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : a.resultado === null ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleResultado(a, true)}
                                                    className="text-xs px-3 py-1 border border-green-700 text-green-400 hover:bg-green-700 hover:text-white rounded transition-colors"
                                                >
                                                    ✓ Ganada
                                                </button>
                                                <button
                                                    onClick={() => handleResultado(a, false)}
                                                    className="text-xs px-3 py-1 border border-red-700 text-red-400 hover:bg-red-700 hover:text-white rounded transition-colors"
                                                >
                                                    ✕ Perdida
                                                </button>
                                                <button
                                                    onClick={() => setCancelConfirm(a.id)}
                                                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                                                    title="Cancelar apuesta"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${a.resultado ? 'text-green-400' : 'text-red-400'}`}>
                                                    {a.resultado ? '✓ Ganada' : '✕ Perdida'}
                                                </div>
                                                <div className={`text-xs ${(a.ganancia_neta ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {fmt(a.ganancia_neta ?? 0)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}