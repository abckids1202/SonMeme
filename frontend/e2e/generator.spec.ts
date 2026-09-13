import { expect, test } from '@playwright/test'
import * as path from 'node:path'

test('opens the focused generator and offers one-image upload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Turn someone into “son 😭”' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse files' })).toBeVisible()
  await expect(page.getByText('Drop, browse or paste an image')).toBeVisible()
})

test('uploads once, selects the detected face, and exposes focused controls', async ({ page }) => {
  let detectionCalls = 0
  await page.route('**/api/v1/detection', async (route) => {
    detectionCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        imageId: 'e2e-image',
        imageWidth: 248,
        imageHeight: 285,
        faces: [{ id: 'face-0', confidence: 0.98, bbox: { x: 0.08, y: 0.08, width: 0.82, height: 0.86 }, bboxPixels: { x: 20, y: 23, width: 203, height: 245 }, landmarks: {} }],
        model: { production: true, customTrained: false, inputSize: 0, runtime: 'python' },
      }),
    })
  })
  await page.goto('/')
  await page.getByLabel('Upload source image').setInputFiles(path.resolve('src/assets/anthony-mackie-face.png'))
  await expect(page.getByRole('button', { name: 'Face 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Resize mode/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Distort mode/ })).toBeVisible()
  await expect(page.getByText('Liquify')).not.toBeVisible()
  expect(detectionCalls).toBe(1)
})
