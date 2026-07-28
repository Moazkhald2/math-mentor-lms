import { useEffect, useRef } from 'react'

interface Props {
  content: string
  inline?: boolean
}

export default function LatexRenderer({ content, inline = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current || !window.katex) return
    const blocks = content.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g)
    ref.current.innerHTML = ''
    for (const block of blocks) {
      if (block.startsWith('$$') && block.endsWith('$$')) {
        try {
          const wrapper = document.createElement('div')
          window.katex.render(block.slice(2, -2), wrapper, { displayMode: true, throwOnError: false })
          ref.current.appendChild(wrapper)
        } catch { /* keep raw */ }
      } else if (block.startsWith('$') && block.endsWith('$')) {
        try {
          const wrapper = document.createElement('span')
          window.katex.render(block.slice(1, -1), wrapper, { displayMode: false, throwOnError: false })
          ref.current.appendChild(wrapper)
        } catch {
          ref.current.appendChild(document.createTextNode(block))
        }
      } else {
        ref.current.appendChild(document.createTextNode(block))
      }
    }
  }, [content])

  if (inline) {
    return <span ref={ref} />
  }
  return <span ref={ref} className="katex-wrapper" />
}
