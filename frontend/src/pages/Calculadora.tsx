import { useEffect, useState } from 'react'
import { getFactores, createFactor, updateFactor, deleteFactor, getPartidos, createCalculo } from '../api'
import type { Factor, Partido } from '../types'

export default function Calculadora() {
    const [factores, setFactores] = useState<Factor[]>([])
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [editando, setEditando] = useState(false)
    const [nuevoFactor, setNuevoFactor] = useState('')
    const [partidoId, setPartidoId] = useState<number | null>(null)
    const [valores, setValores] = useState<Record<number, number>>({})
    const [resultado, setResultado] = useState<{ prob_local: number; prob_visitante: number; stake: number } | null>(null)

    useEffect(() => {
        getFactores().then(r => setFactores(r.data))
        getPartidos({ temporada: '2026' }).then(r => setPartidos(r.data))
    }, [])

    const sumaP = factores.reduce((s, f) => s + f.peso, 0)

    const handleAgregarFactor = async () => {
        if (!nuevoFactor.trim()) return
        const res = await createFactor({ nombre: nuevoFactor, peso: 1, activo: true, orden: factores.length })
        setFactores([...factores, res.data])
        setNuevoFactor('')
    }

    const handlePeso = async (f: Factor, peso: number) => {
        await updateFactor(f.id, { peso })
        setFactores(factores.map(x => x.id === f.id ? { ...x, peso } : x))
    }

    const handleEliminar = async (id: number) => {
        await deleteFactor(id)
        setFactores(factores.filter(f => f.id !== id))
    }

    const handleCalcular = async () => {
        if (!partidoId) return
        const valoresFactores: Record<string, number> = {}
        factores.forEach(f => { valoresFactores[f.nombre] = valores[f.id] ?? 0 })
        const res = await createCalculo({ partido_id: partidoId, valores_factores: valoresFactores })
        setResultado({
            prob_local: res.data.probabilidad_local,
            prob_visitante: res.data.probabilidad_visitante,
            stake: 0,
        })
    }

    const partidoSeleccionado = partidos.find(p => p.id === partidoId)

    return (
        <div className="p-6 space-y-4">
            {/* Factores y pesos */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                            Factores y pesos
                        </h2>
                        <span className="text-xs text-gray-500">
                            {factores.length} factores · Suma de pesos: {sumaP}
                        </span>
                    </div>
                    <button
                        onClick={() => setEditando(!editando)}
                        className="border border-gray-600 text-gray-400 hover:text-white text-xs px-3 py-1 rounded transition-colors"
                    >
                        {editando ? '✓ Guardando...' : '⚙ Editar'}
                    </button>
                </div>

                {editando ? (
                    <div className="p-4 space-y-2">
                        {factores.map(f => (
                            <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                                <span className="text-sm">{f.nombre}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">Peso</span>
                                    <select
                                        value={f.peso}
                                        onChange={e => handlePeso(f, Number(e.target.value))}
                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                                    >
                                        {[0.5, 1, 1.5, 2, 2.5, 3].map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleEliminar(f.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="text"
                                placeholder="Nuevo factor..."
                                value={nuevoFactor}
                                onChange={e => setNuevoFactor(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgregarFactor()}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm flex-1"
                            />
                            <button
                                onClick={handleAgregarFactor}
                                className="text-sm border border-gray-600 px-3 py-1 rounded hover:bg-gray-800"
                            >
                                + Agregar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                        {factores.map(f => (
                            <div key={f.id} className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm flex items-center gap-2">
                                <span>{f.nombre}</span>
                                <span className="text-green-400 font-medium">×{f.peso}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Calculadora */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                    <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                        Calculadora de partido
                    </h2>
                </div>
                <div className="p-4 space-y-6">
                    {/* Selector de partido */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Partido — Temporada 2026</div>
                        <select
                            value={partidoId ?? ''}
                            onChange={e => { setPartidoId(Number(e.target.value)); setResultado(null) }}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">— Elegí un partido —</option>
                            {partidos.map(p => (
                                <option key={p.id} value={p.id}>
                                    Fecha {p.fecha_num} — {p.local} vs {p.visitante}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sliders */}
                    {partidoId && (
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">
                                Puntaje relativo al <strong className="text-white">Local</strong>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {factores.map(f => (
                                    <div key={f.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300">{f.nombre}</span>
                                            <span className={`font-bold ${(valores[f.id] ?? 0) > 0 ? 'text-green-400' : (valores[f.id] ?? 0) < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                {valores[f.id] ?? 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <span>-2</span>
                                            <input
                                                type="range"
                                                min={-2}
                                                max={2}
                                                step={1}
                                                value={valores[f.id] ?? 0}
                                                onChange={e => setValores({ ...valores, [f.id]: Number(e.target.value) })}
                                                className="flex-1 accent-green-500"
                                            />
                                            <span>+2</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resultado */}
                    {resultado && partidoSeleccionado && (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">{partidoSeleccionado.local}</div>
                                    <div className="text-3xl font-bold text-green-400">{resultado.prob_local}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase mb-1">{partidoSeleccionado.visitante}</div>
                                    <div className="text-3xl font-bold text-gray-300">{resultado.prob_visitante}%</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botones */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => { setValores({}); setResultado(null) }}
                            className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={handleCalcular}
                            disabled={!partidoId}
                            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded font-medium"
                        >
                            Calcular →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}