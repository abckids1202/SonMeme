import { apiGet } from './client'

export type HealthResponse = {
  status: string
  device: string
  runtime: string
  models: {
    detector: boolean
    landmarks: boolean
    generator: boolean
  }
  metadata: {
    detector: string
    landmarks: string
    generator: string
  }
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health')
}
