import { useEffect, useState } from 'react'
import { getPartidos, getPosiciones } from '../api'
import type { Partido } from '../types'

export default function Inicio() {
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [posiciones, setPosiciones] = useState<Record<string, unknown>[]>([])
    const [bankroll, setBankroll] = useState(150000)
    const [editingBankroll, setEditingBankroll] = useState(false)
    const [tempBankroll, setTempBankroll] = useState('')
    const [loading, setLoading] = useState(true)

    const CHAMP_ID = '2026'

    useEffect(() => {
        Promise.all([
            getPartidos({ temporada: '2026' }),
            getPosiciones(CHAMP_ID),
        ]).then(([partidosRes, posRes]) => {
            setPartidos(partidosRes.data)
            setPosiciones(posRes.data?.positions || posRes.data || [])
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const formatMoney = (n: number) =>
        '$' + n.toLocaleString('es-AR')

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
    )

    return (
        <div className="p-6 space-y-4">
            {/* Header bankroll */}
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

            {/* Contenido principal */}
            <div className="grid grid-cols-[1fr_2fr] gap-4">
                {/* Tabla de posiciones */}
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
                                    <td className="px-4 py-2">{String(p.team ?? p.nombre ?? p.name ?? '—')}</td>
                                    <td className="px-4 py-2 text-right text-gray-400">{String(p.played ?? p.pj ?? '—')}</td>
                                    <td className="px-4 py-2 text-right font-bold text-green-400">{String(p.points ?? p.pts ?? '—')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Partidos */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                            Partidos
                        </h2>
                        <button className="border border-green-600 text-green-400 hover:bg-green-600 hover:text-white text-xs px-3 py-1 rounded transition-colors">
                            ✏️ Editar cuotas
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 text-xs">
                                <th className="px-4 py-2 text-left">Partido</th>
                                <th className="px-4 py-2 text-right">Betsson</th>
                                <th className="px-4 py-2 text-right">Codere</th>
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
                                        {p.cuota_local_betsson ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300">
                                        {p.cuota_local_codere ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-gray-500 text-xs">Sin calcular</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button className="text-xs text-gray-400 hover:text-white">
                                            Calcular →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}