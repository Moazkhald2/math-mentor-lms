import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StudentIdentity from '../../components/StudentIdentity'

describe('StudentIdentity badge (Real Name + Labeled Email)', () => {
  it('renders real student name beside labeled email, grade, and group chips', () => {
    render(
      <StudentIdentity
        name="Youssef Ahmed"
        email="youssef@gmail.com"
        grade={9}
        groupName="Sat/Tue 5PM"
      />
    )
    expect(screen.getByText(/Youssef Ahmed/)).toBeInTheDocument()
    expect(screen.getByText(/Email:/)).toBeInTheDocument()
    expect(screen.getByText(/youssef@gmail\.com/)).toBeInTheDocument()
    expect(screen.getByText('Grade 9')).toBeInTheDocument()
    expect(screen.getByText('Group: Sat/Tue 5PM')).toBeInTheDocument()
  })

  it('flags profiles missing a real name (or where name equals raw email)', () => {
    render(<StudentIdentity name="raw@gmail.com" email="raw@gmail.com" compact />)
    expect(screen.getByText('Name not set')).toBeInTheDocument()
    expect(screen.getByText('No name')).toBeInTheDocument()
    expect(screen.getByText('Email: raw@gmail.com')).toBeInTheDocument()
  })
})
