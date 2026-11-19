import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CartesianGrapher from '../../components/CartesianGrapher'
import CartesianGrapherModal from '../../components/CartesianGrapherModal'

describe('CartesianGrapher Component', () => {
  it('renders Cartesian graph paper with tools, axes, and coordinate badge', () => {
    render(<CartesianGrapher />)

    expect(screen.getByRole('region', { name: /Cartesian Coordinate Grapher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plot Point/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Line by 2 Points/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Function y = f\(x\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Shaded Inequality/i })).toBeInTheDocument()
    expect(screen.getByText(/Coords:/i)).toBeInTheDocument()
  })

  it('toggles snap to grid and step selector', () => {
    render(<CartesianGrapher />)

    const snapBtn = screen.getByRole('button', { name: /Snap:/i })
    expect(snapBtn).toHaveTextContent(/Snap: On/i)

    // Toggle snap off
    fireEvent.click(snapBtn)
    expect(snapBtn).toHaveTextContent(/Snap: Off/i)

    // Toggle snap back on
    fireEvent.click(snapBtn)
    expect(snapBtn).toHaveTextContent(/Snap: On/i)

    // Step selector is visible
    const select = screen.getByRole('combobox', { name: /Snap Step/i })
    expect(select).toBeInTheDocument()
    fireEvent.change(select, { target: { value: '0.5' } })
    expect(select).toHaveValue('0.5')
  })

  it('displays initial points, lines, and calculates crossing intersections', () => {
    const initialState = {
      points: [{ id: 'p1', label: 'A', x: 1, y: 3, color: '#0A9396' }],
      lines: [
        { id: 'l1', label: 'L1', m: 2, b: 1, color: 'blue' },
        { id: 'l2', label: 'L2', m: -1, b: 4, color: 'red' },
      ],
      functions: [],
      snapStep: 1,
      snapEnabled: true,
    }

    render(<CartesianGrapher initialState={initialState} />)

    // Point A(1, 3) should be listed on SVG plane and in items legend
    expect(screen.getAllByText(/A\(1, 3\)/i).length).toBeGreaterThanOrEqual(1)

    // Lines L1 and L2 should be listed
    expect(screen.getByText('L1')).toBeInTheDocument()
    expect(screen.getByText('L2')).toBeInTheDocument()

    // Intersection at (1, 3) should be computed and displayed in the summary
    expect(screen.getByText(/Crossing: \(1, 3\)/i)).toBeInTheDocument()
  })

  it('triggers onInsertAnswer with serialized graph summary when button is clicked', () => {
    const handleInsert = vi.fn()
    const initialState = {
      points: [{ id: 'p1', label: 'A', x: 2, y: 4, color: 'blue' }],
      lines: [],
      functions: [],
      snapStep: 1,
      snapEnabled: true,
    }

    render(<CartesianGrapher initialState={initialState} onInsertAnswer={handleInsert} />)

    const insertBtn = screen.getByRole('button', { name: /Use Graph as Answer/i })
    expect(insertBtn).toBeInTheDocument()
    fireEvent.click(insertBtn)

    expect(handleInsert).toHaveBeenCalledWith(expect.stringContaining('Points: A(2, 4)'))
  })
})

describe('CartesianGrapherModal Component', () => {
  it('opens and closes modal graph paper correctly', () => {
    render(<CartesianGrapherModal triggerLabel="📈 Test Grapher" />)

    const trigger = screen.getByRole('button', { name: /Test Grapher/i })
    expect(trigger).toBeInTheDocument()

    // Open modal
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: /Cartesian Coordinate Grapher/i })).toBeInTheDocument()

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close Graph Paper/i })
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('dialog', { name: /Cartesian Coordinate Grapher/i })).not.toBeInTheDocument()
  })
})
