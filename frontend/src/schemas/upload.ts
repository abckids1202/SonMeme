import { z } from 'zod'

export const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
export const maxUploadBytes = 15 * 1024 * 1024

export const uploadFileSchema = z
  .instanceof(File)
  .refine((file) => acceptedImageTypes.includes(file.type as (typeof acceptedImageTypes)[number]), {
    message: 'Use a JPEG, PNG, or WebP image.',
  })
  .refine((file) => file.size <= maxUploadBytes, {
    message: 'Images must be 15 MB or smaller.',
  })
