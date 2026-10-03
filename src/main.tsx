import { createRoot } from 'react-dom/client';
import { App } from './app';
import './styles/tokens.css';
import './styles/base.css';
import './styles/feed.css';
import './styles/player.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App />);
}
