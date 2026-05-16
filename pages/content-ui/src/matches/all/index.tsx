import inlineCss from '../../../dist/all/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/all/App';

console.log('[CONTENT-UI] Script loaded on page:', window.location.href);
initAppWithShadow({ id: 'CEB-extension-all', app: <App />, inlineCss });
console.log('[CONTENT-UI] Shadow DOM initialized');
