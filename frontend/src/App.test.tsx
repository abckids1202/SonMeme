import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the focused empty generator state', () => {
    const client = new QueryClient()
    render(<QueryClientProvider client={client}><App /></QueryClientProvider>)
    expect(screen.getByRole('link', { name: 'Sonify Generator' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ideal' })).not.toBeInTheDocument()
    expect(screen.queryByText('Model Lab')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Turn someone into son 😭' })).toBeInTheDocument()
    expect(screen.getByText('Drop or paste an image, i guess bro')).toBeInTheDocument()
  })
})
