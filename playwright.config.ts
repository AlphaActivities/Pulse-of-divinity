import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'tests/e2e',fullyParallel:true,reporter:'list',use:{baseURL:'http://127.0.0.1:4173',launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}},
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'android-emulation',use:{...devices['Pixel 7']}},{name:'iphone-layout-chromium',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
});
