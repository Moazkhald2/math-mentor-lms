interface Window {
  katex: {
    render(expression: string, element: HTMLElement, options?: { displayMode?: boolean; throwOnError?: boolean }): void
  }
}
