import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/design-tokens.css'
import './styles/forms.css'
import './styles/upload.css'
import './styles/search-profile.css'
import './styles/dashboard.css'
import './styles/parent-detail.css'
import './styles/form-builder.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
