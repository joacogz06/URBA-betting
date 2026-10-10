# URBA Betting

Web app personal para value betting en el Top 12 Superior de la URBA.

Reemplaza un sistema en Excel con una app full-stack que calcula probabilidades
reales usando un modelo de factores ponderados, compara contra las cuotas del
mercado, aplica el criterio de Kelly para el tamaño de la apuesta y lleva
historial de resultados.

## Stack

- **Backend:** FastAPI · SQLAlchemy · PostgreSQL · Docker
- **Frontend:** React · Vite · TypeScript · Tailwind CSS
- **Dev DB:** SQLite

## Funcionalidades

- Tabla de posiciones y fixture en tiempo real (URBA API)
- Calculadora de probabilidad con factores y pesos configurables
- Criterio de Kelly para stake sizing
- Historial de apuestas por fecha y temporada
- Módulo de análisis (próximamente)

## Estructura

\```
urba-betting/
├── backend/       # FastAPI + SQLAlchemy
├── frontend/      # React + Vite + TypeScript
└── docker-compose.yml
\```

## Setup

_Próximamente_