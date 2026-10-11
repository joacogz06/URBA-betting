import api from './client'
import type { Factor, Partido, Calculo, Apuesta, FechaFactores } from '../types'

// Factores
export const getFactores = () => api.get<Factor[]>('/factores')
export const createFactor = (data: Omit<Factor, 'id'>) => api.post<Factor>('/factores', data)
export const updateFactor = (id: number, data: Partial<Factor>) => api.patch<Factor>(`/factores/${id}`, data)
export const deleteFactor = (id: number) => api.delete(`/factores/${id}`)

// Partidos
export const getPartidos = (params?: { temporada?: string; fecha_num?: number }) =>
    api.get<Partido[]>('/partidos', { params })
export const getPartido = (id: number) => api.get<Partido>(`/partidos/${id}`)
export const updateCuotas = (id: number, data: { cuota_local_betsson?: number; cuota_local_codere?: number }) =>
    api.patch<Partido>(`/partidos/${id}/cuotas`, data)

// Calculos
export const createCalculo = (data: { partido_id: number; valores_factores: Record<string, number> }) =>
    api.post<Calculo>('/calculos', data)
export const getCalculosByPartido = (partido_id: number) =>
    api.get<Calculo[]>(`/calculos/partido/${partido_id}`)
export const getUltimosCalculos = () =>
    api.get<Record<number, { prob_local: number; prob_visitante: number }>>('/calculos/ultimos')

// Apuestas
export const getApuestas = () => api.get<Apuesta[]>('/apuestas')
export const createApuesta = (data: Omit<Apuesta, 'id' | 'resultado' | 'ganancia_neta' | 'created_at'>) =>
    api.post<Apuesta>('/apuestas', data)
export const updateResultado = (id: number, data: { resultado: boolean; ganancia_neta: number }) =>
    api.patch<Apuesta>(`/apuestas/${id}/resultado`, data)

// URBA
export const getPosiciones = (champ_id: string) => api.get(`/urba/posiciones?champ_id=${champ_id}`)
export const getFixture = (champ_id: string) => api.get(`/urba/fixture?champ_id=${champ_id}`)

// Historial
export const getFechaFactores = (temporada: string, fecha_num: number) =>
    api.get<FechaFactores>(`/historial/${temporada}/${fecha_num}`)
export const saveFechaFactores = (data: Omit<FechaFactores, 'id'>) =>
    api.post<FechaFactores>('/historial', data)

export const getFechaActual = () =>
    api.get('/urba/fecha-actual')