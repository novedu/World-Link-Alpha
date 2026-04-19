import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/stylekit-theme-v1.css'
import './index.css'
import AppContainer from './AppContainer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppContainer />
  </StrictMode>,
)
