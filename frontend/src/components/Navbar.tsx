import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getBankroll } from '../api'

const links = [
    { to: '/', label: 'Inicio' },
    { to: '/calculadora', label: 'Calculadora' },
    { to: '/historial', label: 'Historial' },
]

export default function Navbar() {
    const [bankroll, setBankroll] = useState<number | null>(null)
    const [ganancia, setGanancia] = useState<number>(0)

    useEffect(() => {
        getBankroll().then(r => {
            setBankroll(r.data.bankroll)
            setGanancia(r.data.ganancia_total)
        }).catch(() => { })
    }, [])

    return (
        <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-8">
            <span className="text-white font-bold text-lg tracking-tight">URBA Betting</span>
            <div className="flex gap-4 flex-1">
                {links.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                            }`
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </div>
            {bankroll !== null && (
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Bankroll</div>
                        <div className="text-sm font-bold text-white">${bankroll.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {ganancia !== 0 && (
                        <div className={`text-xs font-semibold px-2 py-1 rounded ${ganancia > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {ganancia > 0 ? '+' : ''}{ganancia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                    )}
                </div>
            )}
        </nav>
    )
}