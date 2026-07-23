import '@testing-library/jest-dom/vitest'
import React from 'react'
import { vi } from 'vitest'

vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Group: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <div onClick={onClick}>{children}</div>,
  Rect: () => <div data-testid="face-rect" />,
  Text: ({ text, onClick }: { text: string; onClick?: () => void }) => <span onClick={onClick}>{text}</span>,
  Image: () => <div data-testid="konva-image" />,
  Label: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tag: () => <span />,
  Circle: () => <span />,
  Transformer: () => <div data-testid="transformer" />,
}))
