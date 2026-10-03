import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 3001 so this can run alongside cherrytree-cofounder-agreement on 3000.
  server: { port: 3001, strictPort: true },
});
