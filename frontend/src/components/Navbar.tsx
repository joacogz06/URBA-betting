import { NavLink } from 'react-router-dom'

const links = [
    { to: '/', label: 'Inicio' },
    { to: '/calculadora', label: 'Calculadora' },
    { to: '/historial', label: 'Historial' },
]

export default function Navbar() {
    return (
        <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center gap-8">
            <span className="text-white font-bold text-lg tracking-tight">URBA Betting</span>
            <div className="flex gap-4">
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
        </nav>
    )
}