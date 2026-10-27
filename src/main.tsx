import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

(window as any).__CAMPUS_OS_MOUNTED__ = true;

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.hasAttribute('data-mounted')) {
  rootElement.setAttribute('data-mounted', 'true');
  createRoot(rootElement).render(<App />);
}
