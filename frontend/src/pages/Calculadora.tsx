import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFactores, createFactor, updateFactor, deleteFactor, getPartidos, createCalculo, getFechaActual } from '../api'
import type { Factor, Partido } from '../types'

export default function Calculadora() {
    const [factores, setFactores] = useState<Factor[]>([])
    const [partidos, setPartidos] = useState<Partido[]>([])
    const [editando, setEditando] = useState(false)
    const [nuevoFactor, setNuevoFactor] = useState('')
    const [nuevoPeso, setNuevoPeso] = useState('')
    const [pesosTemp, setPesosTemp] = useState<Record<number, string>>({})
    const [partidoId, setPartidoId] = useState<number | null>(null)
    const [valores, setValores] = useState<Record<number, number>>({})
    const [resultado, setResultado] = useState<{ prob_local: number; prob_visitante: number; stake: number } | null>(null)
    const [searchParams] = useSearchParams()

    useEffect(() => {
        getFactores().then(r => setFactores(r.data))
        getFechaActual().then(fechaRes => {
            const fechaNum = fechaRes.data?.fecha_num
            const params = fechaNum
                ? { temporada: '2026', fecha_num: fechaNum }
                : { temporada: '2026' }
            getPartidos(params).then(r => {
                setPartidos(r.data)
                const partidoParam = searchParams.get('partido')
                if (partidoParam) setPartidoId(Number(partidoParam))
            })
        })
    }, [])

    // Peso que se está mostrando: el que se está tipeando o el guardado
    const pesoActual = (f: Factor): number => {
        const temp = pesosTemp[f.id]
        if (temp === undefined) return f.peso
        const n = Number(temp)
        return isNaN(n) || n < 0 ? 0 : n
    }

    const sumaP = factores.reduce((s, f) => s + pesoActual(f), 0)

    const porcentaje = (peso: number): string => {
        if (sumaP <= 0) return '0'
        return String(Number((peso / sumaP * 100).toFixed(1)))
    }

    const limpiarTemp = (id: number) => {
        setPesosTemp(prev => {
            const copia = { ...prev }
            delete copia[id]
            return copia
        })
    }

    const handleGuardarPeso = async (f: Factor) => {
        const raw = pesosTemp[f.id]
        if (raw === undefined) return
        const peso = Number(raw)
        if (raw.trim() === '' || isNaN(peso) || peso < 0 || peso === f.peso) {
            limpiarTemp(f.id)
            return
        }
        await updateFactor(f.id, { peso })
        setFactores(prev => prev.map(x => x.id === f.id ? { ...x, peso } : x))
        limpiarTemp(f.id)
    }

    const handleAgregarFactor = async () => {
        const peso = Number(nuevoPeso)
        if (!nuevoFactor.trim() || !nuevoPeso || isNaN(peso) || peso <= 0) return
        const res = await createFactor({ nombre: nuevoFactor.trim(), peso, activo: true, orden: factores.length })
        setFactores([...factores, res.data])
        setNuevoFactor('')
        setNuevoPeso('')
    }

    const handleEliminar = async (id: number) => {
        await deleteFactor(id)
        setFactores(factores.filter(f => f.id !== id))
        limpiarTemp(id)
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
    const nuevoPesoNum = Number(nuevoPeso)
    const puedeAgregar = nuevoFactor.trim() !== '' && nuevoPeso !== '' && !isNaN(nuevoPesoNum) && nuevoPesoNum > 0

    return (
        <div className="p-6 space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                            Factores y pesos
                        </h2>
                        <span className="text-xs text-gray-500">
                            {factores.length} factores · Total: {Number(sumaP.toFixed(2))}
                        </span>
                    </div>
                    <button
                        onClick={() => setEditando(!editando)}
                        className="border border-gray-600 text-gray-400 hover:text-white text-xs px-3 py-1 rounded transition-colors"
                    >
                        {editando ? '✓ Listo' : '⚙ Editar'}
                    </button>
                </div>

                {editando ? (
                    <div className="p-4 space-y-2">
                        <div className="flex items-center justify-end gap-3 text-[10px] text-gray-600 uppercase tracking-wider pr-7">
                            <span className="w-20 text-center">Peso</span>
                            <span className="w-14 text-right">% total</span>
                        </div>
                        {factores.map(f => (
                            <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                                <span className="text-sm">{f.nombre}</span>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={pesosTemp[f.id] ?? String(f.peso)}
                                        onChange={e => setPesosTemp(prev => ({ ...prev, [f.id]: e.target.value }))}
                                        onBlur={() => handleGuardarPeso(f)}
                                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                        className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                                    />
                                    <span className="w-14 text-right text-sm text-green-400 font-medium">
                                        {porcentaje(pesoActual(f))}%
                                    </span>
                                    <button onClick={() => handleEliminar(f.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                                </div>
                            </div>
                        ))}

                        {sumaP <= 0 && factores.length > 0 && (
                            <div className="text-xs text-red-400 pt-1">
                                La suma de pesos es 0: el cálculo va a dar siempre 50%.
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="text"
                                placeholder="Nuevo factor..."
                                value={nuevoFactor}
                                onChange={e => setNuevoFactor(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgregarFactor()}
                                className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm flex-1"
                            />
                            <input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="Peso"
                                value={nuevoPeso}
                                onChange={e => setNuevoPeso(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAgregarFactor()}
                                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-center"
                            />
                            <button
                                onClick={handleAgregarFactor}
                                disabled={!puedeAgregar}
                                className="text-sm border border-gray-600 px-3 py-1 rounded hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
                                <span className="text-green-400 font-medium">{porcentaje(f.peso)}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                    <h2 className="text-xs font-semibold text-green-400 tracking-widest uppercase">
                        Calculadora de partido
                    </h2>
                </div>
                <div className="p-4 space-y-6">
                    <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Partido — Fecha {searchParams.get('partido') ? partidoSeleccionado?.fecha_num : 'actual'}</div>
                        <select
                            value={partidoId ?? ''}
                            onChange={e => { setPartidoId(Number(e.target.value)); setResultado(null) }}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                        >
                            <option value="">— Elegí un partido —</option>
                            {partidos.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.local} vs {p.visitante}
                                </option>
                            ))}
                        </select>
                    </div>

                    {partidoId && (
                        <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">
                                Puntaje relativo al <strong className="text-white">Local</strong>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {factores.map(f => (
                                    <div key={f.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300">
                                                {f.nombre} <span className="text-xs text-gray-600">({porcentaje(f.peso)}%)</span>
                                            </span>
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