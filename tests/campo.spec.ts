import { expect, test } from '@playwright/test'

test.describe('CampoListo en modo demo', () => {
  test('el técnico registra un servicio completo sin señal y se sube al volver la conexión', async ({ page, context }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Luis/ }).click()
    await expect(page.getByRole('heading', { name: /Hola, Luis/ })).toBeVisible()

    // Abre la orden que está en sitio
    await page.getByRole('link', { name: /Limpieza de paneles/ }).first().click()
    await expect(page.getByText('1. Evidencia')).toBeVisible()

    // Se pierde la señal
    await context.setOffline(true)
    await expect(page.getByTestId('estado-sync')).toContainText('Sin señal')

    await page.getByPlaceholder('Nota: qué hiciste').fill('Se limpiaron los 8 paneles y se apretaron conexiones.')
    await page.getByRole('button', { name: 'Agregar', exact: true }).click()
    await expect(page.getByText('Se limpiaron los 8 paneles')).toBeVisible()

    await page.getByPlaceholder('Ej. Conector MC4').fill('Cinchos plásticos')
    await page.getByRole('button', { name: '+ Agregar pieza' }).click()
    await expect(page.getByText('• Cinchos plásticos — 1 pza')).toBeVisible()

    await page.getByPlaceholder('Nombre de quien recibe').fill('Sra. Morales')
    const firma = page.getByTestId('firma')
    const caja = (await firma.boundingBox())!
    await page.mouse.move(caja.x + 20, caja.y + 60)
    await page.mouse.down()
    for (let x = 30; x < 250; x += 15) await page.mouse.move(caja.x + x, caja.y + 50 + ((x / 15) % 2) * 25)
    await page.mouse.up()
    await page.getByRole('button', { name: 'Guardar firma' }).click()
    await expect(page.getByText('Sra. Morales')).toBeVisible()

    await page.getByPlaceholder('Resultados').fill('Paneles limpios y produciendo.')
    await page.getByRole('button', { name: '✓ Terminé' }).click()
    await expect(page.getByRole('heading', { name: 'Recibido' })).toBeVisible()
    await expect(page.getByTestId('estado-sync')).toContainText('guardados')

    // Vuelve la señal: la cola se vacía sola
    await context.setOffline(false)
    await expect(page.getByTestId('estado-sync')).toContainText('Al día', { timeout: 15_000 })
  })

  test('el encargado crea una orden, la asigna y genera la hoja de servicio', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Encargado en turno/ }).click()
    await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
    await expect(page.getByText(/quedó abierta|quedaron abiertas/)).toBeVisible()

    await page.getByRole('link', { name: 'Nueva orden' }).first().click()
    await page.getByRole('combobox').first().selectOption({ label: 'Empacadora Valle Norte' })
    await page.getByPlaceholder('Ej. Revisión de inversor').fill('Revisión de tablero eléctrico')
    await page.locator('textarea').first().fill('Revisar breakers del tablero principal.')
    await page.getByLabel(/Ramón/).check()
    await page.getByRole('button', { name: 'Crear orden' }).click()
    await expect(page.getByText(/Orden creada con folio 6/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Avisar al cliente por WhatsApp/ })).toHaveAttribute('href', /wa\.me\/526370000004/)

    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: /Hoja de servicio/ }).click()
    expect((await descarga).suggestedFilename()).toBe('hoja-servicio-6.pdf')
  })
})
