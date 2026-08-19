import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ToastProvider } from './components/Toast.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <ToastProvider>
      <App />
    </ToastProvider>
  </HashRouter>,
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl)
        .then((reg) => {
          reg.update();
          console.log('Service Worker registrado com sucesso!', reg);
        })
        .catch((err) => console.error('Erro ao registrar Service Worker:', err));
    });
  } else {
    // Em desenvolvimento, desregistra service workers anteriores para não interferir no HMR/Vite
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
