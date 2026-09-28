import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AdminDataProvider } from './state/AdminDataContext'
import { OrganizerDataProvider } from './state/OrganizerDataContext'
import { StudentDataProvider } from './state/StudentDataContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StudentDataProvider>
        {/* admin reads the organizer's events, so it sits inside */}
        <OrganizerDataProvider>
          <AdminDataProvider>
            <App />
          </AdminDataProvider>
        </OrganizerDataProvider>
      </StudentDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
