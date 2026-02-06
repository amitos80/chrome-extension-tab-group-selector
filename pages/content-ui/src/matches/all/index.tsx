import inlineCss from '../../styles/all.css?inline';
import { initAppWithShadow } from '@extension/shared';
import { createRoot } from 'react-dom/client';
import App from '@src/matches/all/App';;
import tailwindcssOutput from '@pages/content-ui/style.css?inline';

initAppWithShadow({ id: 'CEB-extension-all', app: <App />, inlineCss });


const rootContainer = document.createElement('div');
rootContainer.id = 'tab-group-switcher-root';
document.body.appendChild(rootContainer);

const shadowRoot
  = rootContainer.attachShadow({ mode: 'open' });
const injectStyles = () => {
  const styleTag = document.createElement('style');
  styleTag.innerHTML = tailwindcssOutput;
  shadowRoot.appendChild(styleTag);
};

const renderApp = () => {
  const rootIntoShadow = document.createElement('div');
  shadowRoot.appendChild(rootIntoShadow);
  injectStyles();
  createRoot(rootIntoShadow).render(<App />);
};

renderApp();