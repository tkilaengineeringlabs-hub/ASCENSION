import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
export default defineConfig({plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'ASCENSION — Personal Evolution OS',short_name:'ASCENSION',description:'Personal evolution operating system',theme_color:'#090c12',background_color:'#090c12',display:'standalone',start_url:'/',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},includeAssets:['icon.svg'],workbox:{navigateFallback:'/index.html',runtimeCaching:[]}})],server:{port:5173,proxy:{'/api':{target:'http://localhost:3001',changeOrigin:true},'/auth':{target:'http://localhost:3001',changeOrigin:true}}}});
