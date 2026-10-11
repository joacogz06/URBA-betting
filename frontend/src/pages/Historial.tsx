import { useEffect, useState } from 'react'
import { getApuestas, getPartidos, updateResultado } from '../api'
import type { Apuesta, Partido } from '../types'

export default function Historial() {
    const [apuestas, setApuestas] = useState<Apuesta[]>([])
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            getApuestas(),
            getPartidos({ temporada: '2026' }),
        ]).then(([apRes, pRes]) => {
            setApuestas(apRes.data)
            setPartidos(pRes.data)
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const getPartido = (id: number) => partidos.find(p => p.id === id)

    const apostadas = apuestas.length
    const ganadas = apuestas.filter(a => a.resultado === true).length
    const perdidas = apuestas.filter(a => a.resultado === false).length
    const neto = apuestas.reduce((s, a) => s + (a.ganancia_neta ?? 0), 0)
    const totalApostado = apuestas.reduce((s, a) => s + a.stake, 0)

    const formatMoney = (n: number) =>
        (n >= 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString('es-AR')

    const handleResultado = async (apuesta: Apuesta, resultado: boolean) => {
        const cuota = apuesta.cuota
        const ganancia_neta = resultado
            ? apuesta.stake * (cuota - 1)
            : -apuesta.stake
        await updateResultado(apuesta.id, { resultado, ganancia_neta })
        setApuestas(apuestas.map(a =>
            a.id === apuesta.id ? { ...a, resultado, ganancia_neta } : a
        ))
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
    )

    return (
        <div className="p-6 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'Apostadas', value: apostadas, color: 'text-white' },
                    { label: 'Ganadas', value: ganadas, color: 'text-green-400' },
                    { label: 'Perdidas', value: perdidas, color: 'text-red-400' },
                    { label: 'Resultado neto', value: formatMoney(neto), color: neto >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Total apostado', value: '$' + totalApostado.toLocaleString('es-AR'), color: 'text-white' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                        <div className={`text-2xl font-bold ${color}`}>{value}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
                    </div>
                ))}
            </div>

            {/* Lista de apuestas */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                    <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                        Apuestas
                    </h2>
                </div>

                {apuestas.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-500 text-sm">
                        No hay apuestas registradas todavía.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {apuestas.map(a => {
                            const partido = getPartido(a.partido_id)
                            return (
                                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50">
                                    <div>
                                        <div className="font-medium text-sm">
                                            {partido ? `${partido.local} vs ${partido.visitante}` : `Partido #${a.partido_id}`}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {a.equipo_apostado} · ×{a.cuota}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">${a.stake.toLocaleString('es-AR')}</div>
                                            <div className="text-xs text-gray-500">Stake</div>
                                        </div>

                                        {a.resultado === null ? (
                                            <div className="flex gap-2">
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
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <div className={`text-sm font-bold ${a.resultado ? 'text-green-400' : 'text-red-400'}`}>
                                                    {a.resultado ? '✓ Ganada' : '✕ Perdida'}
                                                </div>
                                                <div className={`text-xs ${(a.ganancia_neta ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {formatMoney(a.ganancia_neta ?? 0)}
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