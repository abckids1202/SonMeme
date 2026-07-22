import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the generator shell', () => {
    const client = new QueryClient()

    render(
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Sonify' })).toBeInTheDocument()
    expect(screen.getByText('Upload a source image')).toBeInTheDocument()
    expect(screen.getByText('Generate preview')).toBeDisabled()
  })
})
