import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import api from './api/client'

function BackendStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus('DOWN'))
  }, [])

  const colors = {
    UP: 'bg-green-100 text-green-800',
    DOWN: 'bg-red-100 text-red-800',
    checking: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <p className={`mt-6 rounded-lg px-4 py-2 ${colors[status] ?? colors.DOWN}`}>
      Backend: {status}
    </p>
  )
}

function Home() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h1 className="text-3xl font-bold text-indigo-600">EventHub</h1>
      <p className="mt-2 text-gray-600">Find and book college events.</p>
      <BackendStatus />
    </div>
  )
}

function About() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-2 text-gray-600">
        A practice project: React + Spring Boot + MySQL.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="flex gap-6 bg-indigo-600 px-6 py-4 text-white">
        <Link to="/" className="font-semibold">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <main className="mx-auto max-w-2xl p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  )
}
