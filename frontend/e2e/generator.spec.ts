import { expect, test } from '@playwright/test'
import * as path from 'node:path'
import { readFileSync } from 'node:fs'

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

test('reviews and accepts one Instant AI result without another detection', async ({ page }) => {
  let detectionCalls = 0
  let generationCalls = 0
  await page.route('**/api/v1/detection', async (route) => {
    detectionCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        imageId: 'ai-image',
        imageWidth: 248,
        imageHeight: 285,
        faces: [{ id: 'face-0', confidence: 0.98, bbox: { x: 0.08, y: 0.08, width: 0.82, height: 0.86 }, bboxPixels: { x: 20, y: 23, width: 203, height: 245 }, landmarks: {} }],
        model: { production: true, customTrained: false, inputSize: 0, runtime: 'python' },
      }),
    })
  })
  await page.route('**/api/v1/generation/capabilities', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, configured: true, provider: 'mock', message: 'Instant AI is ready.' }) })
  })
  await page.route('**/api/v1/generation/jobs', async (route) => {
    generationCalls += 1
    await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ job_id: 'e2e-job', status: 'queued', result_url: null, error: null, provider: 'mock' }) })
  })
  await page.route('**/api/v1/generation/jobs/e2e-job', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job_id: 'e2e-job', status: 'complete', result_url: '/generation/jobs/e2e-job/result', error: null, provider: 'mock' }) })
  })
  await page.route('**/api/v1/generation/jobs/e2e-job/result', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/png', body: readFileSync(path.resolve('src/assets/anthony-mackie-face.png')) })
  })

  await page.goto('/')
  await page.getByLabel('Upload source image').setInputFiles(path.resolve('src/assets/anthony-mackie-face.png'))
  await expect(page.getByRole('button', { name: 'Instant AI blend' })).toBeVisible()
  await page.locator('.ai-notice input[type="checkbox"]').evaluate((element) => (element as HTMLInputElement).click())
  await page.getByRole('button', { name: 'Instant AI blend' }).click()
  await expect(page.getByText('Result ready to review')).toBeVisible()
  await page.getByRole('button', { name: 'Use result' }).click()
  await expect(page.getByText(/Instant AI result/)).toBeVisible()

  expect(detectionCalls).toBe(1)
  expect(generationCalls).toBe(1)
})
