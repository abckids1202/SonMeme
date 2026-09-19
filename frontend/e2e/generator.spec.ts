import { expect, test } from '@playwright/test'
import * as path from 'node:path'
import { readFileSync } from 'node:fs'

const imagePath = path.resolve('src/assets/anthony-mackie-face.png')

test('opens the focused AI generator', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Make any image a Sonify meme' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse files' })).toBeVisible()
  await expect(page.getByText('Drop, browse or paste an image')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ideal' })).not.toBeVisible()
})

test('uploads once, receives one AI result, edits the caption, and exposes export', async ({ page }) => {
  let sonifyCalls = 0
  const imageBase64 = readFileSync(imagePath).toString('base64')
  await page.route('**/api/v1/sonify', async (route) => {
    sonifyCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        image_base64: imageBase64,
        media_type: 'image/png',
        width: 248,
        height: 285,
        analysis: { target_type: 'face', confidence: 0.98, region: { x: 0.08, y: 0.08, width: 0.82, height: 0.86 }, description: 'A portrait.' },
        model: 'gpt-image-2',
      }),
    })
  })
  await page.goto('/')
  await page.getByLabel('Upload source image').setInputFiles(imagePath)
  await expect(page.getByRole('heading', { name: 'Your Sonify image' })).toBeVisible()
  await expect(page.getByText('AI-integrated face ready')).toBeVisible()
  const caption = page.getByLabel('Caption text')
  await caption.fill('SONami 😭')
  await expect(caption).toHaveValue('SONami 😭')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('anthony-mackie-face-son.png')
  expect(sonifyCalls).toBe(1)
})
