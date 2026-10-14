export interface Factor {
    id: number
    nombre: string
    peso: number
    activo: boolean
    orden: number
}

export interface Partido {
    id: number
    urba_id: string
    temporada: string
    fecha_num: number
    local: string
    visitante: string
    fecha_hora: string | null
    jugado: boolean
    score_local: number | null
    score_visitante: number | null
    cuota_local_betsson: number | null
    cuota_local_codere: number | null
    cuota_visitante_betsson: number | null
    cuota_visitante_codere: number | null
}

export interface Calculo {
    id: number
    partido_id: number
    probabilidad_local: number
    probabilidad_visitante: number
    valores_factores: Record<string, number | null>
    pesos_factores: Record<string, number>
    created_at: string
}

export interface Apuesta {
    id: number
    partido_id: number
    equipo_apostado: string
    stake: number
    cuota: number
    resultado: boolean | null
    ganancia_neta: number | null
    created_at: string
}

export interface FechaFactores {
    id: number
    temporada: string
    fecha_num: number
    factores: Array<{ factor_id: number; valor: number }>
}