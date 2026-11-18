import { defineConfig, devices } from '@playwright/test'

// Pruebas de extremo a extremo (tarea 8.2). Corren sobre el build en modo demo.
// Si Playwright no encuentra su navegador, define PW_CHROMIUM con la ruta de Chrome/Chromium.
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    permissions: ['geolocation'],
    geolocation: { latitude: 30.709, longitude: -112.152 },
    locale: 'es-MX',
    timezoneId: 'America/Hermosillo',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
