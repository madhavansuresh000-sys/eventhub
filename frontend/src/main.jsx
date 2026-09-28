import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { StudentDataProvider } from './state/StudentDataContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StudentDataProvider>
        <App />
      </StudentDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
