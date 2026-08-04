import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/CONTROLE-DE-FERRAMENTAS-ESTRELA-GEL-/sw.js')
      .then((reg) => console.log('Service Worker registrado!', reg))
      .catch((err) => console.error('Erro ao registrar Service Worker:', err));
  });
}
