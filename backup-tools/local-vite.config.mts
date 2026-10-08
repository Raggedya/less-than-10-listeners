// Optional desktop restore helper; not a change to the approved app config.
import approvedConfig from '../artifacts/less-than-10/vite.config';
export default {
  ...approvedConfig,
  server: {
    ...approvedConfig.server,
    proxy: { ...approvedConfig.server?.proxy, '/api': 'http://127.0.0.1:5000' },
  },
};
