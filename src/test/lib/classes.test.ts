import { describe, it, expect, vi, beforeEach } from 'vitest'

function createQueryBuilder(returnData: any[] = []) {
  const resolveValue = { data: returnData, error: null }
  const chain: any = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: returnData[0], error: null })),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    then: (onFulfilled: any) => Promise.resolve(resolveValue).then(onFulfilled),
  }
  return chain
}

vi.mock('../../lib/supabase', () => {
  const mockQuery = createQueryBuilder([])
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  }
})

import { supabase } from '../../lib/supabase'
import {
  fetchClasses,
  createClass,
  deleteClass,
  fetchClassMembers,
  addStudentToClass,
  removeStudentFromClass,
  fetchAvailableStudents,
  fetchAvailableTeachers,
} from '../../lib/classes'

describe('classes lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchClasses', () => {
    it('calls supabase.from("classes") with join and orders', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchClasses()
      expect(supabase.from).toHaveBeenCalledWith('classes')
      expect(qb.select).toHaveBeenCalledWith('*, profiles!left(email, full_name)')
      expect(qb.order).toHaveBeenCalledWith('grade')
      expect(qb.order).toHaveBeenCalledWith('name')
    })

    it('returns data from supabase', async () => {
      const mockData = [{ id: '1', name: 'Math 101' }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchClasses()
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.then = (onFulfilled: any) => Promise.resolve({ data: null, error: new Error('DB error') }).then(onFulfilled)
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchClasses()).rejects.toThrow('DB error')
    })
  })

  describe('createClass', () => {
    it('calls insert with name, grade, teacher_id, select, single', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await createClass('Math 101', 10, 'teacher-1')
      expect(supabase.from).toHaveBeenCalledWith('classes')
      expect(qb.insert).toHaveBeenCalledWith({ name: 'Math 101', grade: 10, teacher_id: 'teacher-1' })
      expect(qb.select).toHaveBeenCalled()
      expect(qb.single).toHaveBeenCalled()
    })

    it('defaults teacher_id to null when not provided', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await createClass('Math 101', 10)
      expect(qb.insert).toHaveBeenCalledWith({ name: 'Math 101', grade: 10, teacher_id: null })
    })

    it('returns the created class', async () => {
      const mockData = { id: '1', name: 'Math 101', grade: 10 }
      const qb = createQueryBuilder([mockData])
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await createClass('Math 101', 10)
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.single = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(createClass('Math 101', 10)).rejects.toThrow('Insert failed')
    })
  })

  describe('deleteClass', () => {
    it('calls delete().eq("id", id)', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await deleteClass('class-1')
      expect(supabase.from).toHaveBeenCalledWith('classes')
      expect(qb.delete).toHaveBeenCalled()
      expect(qb.eq).toHaveBeenCalledWith('id', 'class-1')
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.eq = vi.fn(() => Promise.resolve({ data: null, error: new Error('Delete failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(deleteClass('class-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('fetchClassMembers', () => {
    it('calls from("class_members") with join and eq filter', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchClassMembers('class-1')
      expect(supabase.from).toHaveBeenCalledWith('class_members')
      expect(qb.select).toHaveBeenCalledWith('*, profiles!inner(id, email, full_name)')
      expect(qb.eq).toHaveBeenCalledWith('class_id', 'class-1')
    })

    it('returns data from supabase', async () => {
      const mockData = [{ id: '1', student_id: 's-1', profiles: { email: 'a@b.com' } }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchClassMembers('class-1')
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.eq = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchClassMembers('class-1')).rejects.toThrow('DB error')
    })
  })

  describe('addStudentToClass', () => {
    it('calls insert with class_id and student_id', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await addStudentToClass('class-1', 'student-1')
      expect(supabase.from).toHaveBeenCalledWith('class_members')
      expect(qb.insert).toHaveBeenCalledWith({ class_id: 'class-1', student_id: 'student-1' })
    })

    it('resolves without returning data', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(addStudentToClass('class-1', 'student-1')).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.insert = vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(addStudentToClass('class-1', 'student-1')).rejects.toThrow('Insert failed')
    })
  })

  describe('removeStudentFromClass', () => {
    it('calls delete with eq class_id and eq student_id', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await removeStudentFromClass('class-1', 'student-1')
      expect(supabase.from).toHaveBeenCalledWith('class_members')
      expect(qb.delete).toHaveBeenCalled()
      expect(qb.eq).toHaveBeenCalledWith('class_id', 'class-1')
      expect(qb.eq).toHaveBeenCalledWith('student_id', 'student-1')
    })

    it('resolves without returning data', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(removeStudentFromClass('class-1', 'student-1')).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.eq = vi.fn()
        .mockReturnValueOnce(qb)
        .mockReturnValueOnce(Promise.resolve({ data: null, error: new Error('Delete failed') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(removeStudentFromClass('class-1', 'student-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('fetchAvailableStudents', () => {
    it('calls from("profiles") with role eq and order', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchAvailableStudents()
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(qb.select).toHaveBeenCalledWith('id, email, full_name')
      expect(qb.eq).toHaveBeenCalledWith('role', 'student')
      expect(qb.order).toHaveBeenCalledWith('full_name')
    })

    it('returns data from supabase', async () => {
      const mockData = [{ id: '1', email: 'a@b.com', full_name: 'Alice' }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchAvailableStudents()
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.order = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchAvailableStudents()).rejects.toThrow('DB error')
    })
  })

  describe('fetchAvailableTeachers', () => {
    it('calls from("profiles") with role in and order', async () => {
      const qb = createQueryBuilder([])
      vi.mocked(supabase.from).mockReturnValue(qb)
      await fetchAvailableTeachers()
      expect(supabase.from).toHaveBeenCalledWith('profiles')
      expect(qb.select).toHaveBeenCalledWith('id, email, full_name')
      expect(qb.in).toHaveBeenCalledWith('role', ['teacher', 'admin'])
      expect(qb.order).toHaveBeenCalledWith('full_name')
    })

    it('returns data from supabase', async () => {
      const mockData = [{ id: '1', email: 't@b.com', full_name: 'Teacher' }]
      const qb = createQueryBuilder(mockData)
      vi.mocked(supabase.from).mockReturnValue(qb)
      const result = await fetchAvailableTeachers()
      expect(result).toEqual(mockData)
    })

    it('throws on error', async () => {
      const qb = createQueryBuilder([])
      qb.order = vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
      vi.mocked(supabase.from).mockReturnValue(qb)
      await expect(fetchAvailableTeachers()).rejects.toThrow('DB error')
    })
  })
})
