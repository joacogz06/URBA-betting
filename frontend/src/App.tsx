import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Inicio from './pages/Inicio'
import Calculadora from './pages/Calculadora'
import Historial from './pages/Historial'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/calculadora" element={<Calculadora />} />
            <Route path="/historial" element={<Historial />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}