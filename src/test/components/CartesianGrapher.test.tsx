import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CartesianGrapher from '../../components/CartesianGrapher'
import CartesianGrapherModal from '../../components/CartesianGrapherModal'

describe('CartesianGrapher Component', () => {
  it('renders Cartesian graph paper with tools, axes, and coordinate badge', () => {
    render(<CartesianGrapher defaultGradeMode="senior" />)

    expect(screen.getByRole('region', { name: /Cartesian Coordinate Grapher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plot Point/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Line by 2 Points/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Function y = f\(x\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Shaded Inequality/i })).toBeInTheDocument()
    expect(screen.getByText(/Coords:/i)).toBeInTheDocument()
  })

  it('renders Junior Mode with simplified tools for Grades 6-8', () => {
    render(<CartesianGrapher defaultGradeMode="junior" />)

    expect(screen.getByRole('button', { name: /Plot Points/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Connect Shape/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dilation \(Scale Factor\)/i })).toBeInTheDocument()
  })

  it('switches between Junior and Senior grade modes seamlessly', () => {
    render(<CartesianGrapher defaultGradeMode="junior" />)

    // Initially in Junior mode
    expect(screen.getByRole('button', { name: /Connect Shape/i })).toBeInTheDocument()

    // Switch to Senior mode
    const seniorBtn = screen.getByRole('button', { name: /Senior \(Grades 9–12\)/i })
    fireEvent.click(seniorBtn)

    expect(screen.getByRole('button', { name: /Line by 2 Points/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Function y = f\(x\)/i })).toBeInTheDocument()
  })

  it('applies geometric dilation (Before & After) with factor k = 1/3 in Junior Mode', () => {
    const initialState = {
      gradeMode: 'junior' as const,
      points: [
        { id: 'p1', label: 'A', x: 3, y: 6, color: '#3B82F6' },
        { id: 'p2', label: 'B', x: 6, y: 3, color: '#3B82F6' },
        { id: 'p3', label: 'C', x: 0, y: 0, color: '#3B82F6' },
      ],
      lines: [],
      functions: [],
      polygons: [
        {
          id: 'poly-1',
          label: 'Triangle ABC',
          points: [
            { x: 3, y: 6, label: 'A' },
            { x: 6, y: 3, label: 'B' },
            { x: 0, y: 0, label: 'C' },
          ],
          color: '#3B82F6',
          closed: true,
        },
      ],
      snapStep: 1,
      snapEnabled: true,
    }

    render(<CartesianGrapher initialState={initialState} defaultGradeMode="junior" />)

    // Open dilation tool
    const dilationToolBtn = screen.getByRole('button', { name: /Dilation \(Scale Factor\)/i })
    fireEvent.click(dilationToolBtn)

    // Apply Dilation with default k = 1/3
    const applyBtn = screen.getByRole('button', { name: /Apply Dilation/i })
    fireEvent.click(applyBtn)

    // Verification: Transformation rule and dilated points A'(1, 2) and B'(2, 1) displayed
    expect(screen.getByText(/Transformation Rule:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/A\(3, 6\)/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/A'\(1, 2\)/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/B'\(2, 1\)/i).length).toBeGreaterThanOrEqual(1)
  })

  it('opens embedded Math Keypad for equations in Senior Mode', () => {
    render(<CartesianGrapher defaultGradeMode="senior" />)

    // Select function tool
    const fnToolBtn = screen.getByRole('button', { name: /Function y = f\(x\)/i })
    fireEvent.click(fnToolBtn)

    // Keypad button is available
    const keypadToggle = screen.getByRole('button', { name: /Math Keypad/i })
    fireEvent.click(keypadToggle)

    // Keypad is open
    expect(screen.getByRole('region', { name: /Math Keypad/i })).toBeInTheDocument()
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

    render(<CartesianGrapher initialState={initialState} defaultGradeMode="senior" />)

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

    const insertBtn = screen.getByRole('button', { name: /Attach Graph to Answer|Use Graph as Answer/i })
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
