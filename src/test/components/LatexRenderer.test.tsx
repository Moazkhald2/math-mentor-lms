import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import LatexRenderer from '../../components/LatexRenderer'

beforeEach(() => {
  ;(window as any).katex = {
    render: vi.fn((tex: string, el: HTMLElement, _: any) => {
      el.textContent = `[RENDERED: ${tex}]`
    }),
  }
})

describe('LatexRenderer', () => {
  it('renders plain text without math', () => {
    const { container } = render(<LatexRenderer content="Hello world" />)
    expect(container.textContent).toContain('Hello world')
  })

  it('renders inline math with $...$', () => {
    render(<LatexRenderer content="The value of $x$ is 5" />)
    const spans = document.querySelectorAll('span')
    const rendered = Array.from(spans).find(s => s.textContent?.includes('RENDERED'))
    expect(rendered).toBeTruthy()
  })

  it('renders display math with $$...$$', () => {
    render(<LatexRenderer content="Equation: $$E=mc^2$$" />)
    const rendered = document.querySelector('[class="katex-wrapper"]')
    expect(rendered?.textContent).toContain('RENDERED: E=mc^2')
  })

  it('handles text with no math blocks', () => {
    const { container } = render(<LatexRenderer content="Just text" />)
    expect(container.textContent).toBe('Just text')
  })

  it('does not crash on unclosed math', () => {
    const { container } = render(<LatexRenderer content="Unclosed $math" />)
    expect(container.textContent).toContain('Unclosed')
  })

  it('uses inline element when inline prop is true', () => {
    const { container } = render(<LatexRenderer content="Hello" inline />)
    expect(container.firstElementChild?.tagName).toBe('SPAN')
  })
})
