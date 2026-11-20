import { supabase } from './supabase'

export async function fetchClasses() {
  const { data, error } = await supabase
    .from('classes')
    .select('*, profiles!left(email, full_name)')
    .order('grade')
    .order('name')
  if (error) throw error
  return data
}

export async function createClass(name: string, grade: number, teacherId?: string) {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, grade, teacher_id: teacherId ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

export async function updateClassTeacher(classId: string, teacherId: string | null) {
  const { data, error } = await supabase
    .from('classes')
    .update({ teacher_id: teacherId })
    .eq('id', classId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchClassMembers(classId: string) {
  const { data, error } = await supabase
    .from('class_members')
    .select('*, profiles!inner(id, email, full_name)')
    .eq('class_id', classId)
  if (error) throw error
  return data
}

export async function addStudentToClass(classId: string, studentId: string) {
  const { error } = await supabase.from('class_members').insert({ class_id: classId, student_id: studentId })
  if (error) throw error
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const { error } = await supabase
    .from('class_members')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)
  if (error) throw error
}

export async function fetchAvailableStudents() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'student')
    .order('full_name')
  if (error) throw error
  return data
}

export async function fetchAvailableTeachers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('role', ['teacher', 'admin'])
    .order('full_name')
  if (error) throw error
  return data
}

export async function moveStudentToClass(fromClassId: string, toClassId: string, studentId: string) {
  if (fromClassId === toClassId) return
  const { error: insertError } = await supabase
    .from('class_members')
    .insert({ class_id: toClassId, student_id: studentId })
  // Ignore unique violation if student is already in target group
  if (insertError && insertError.code !== '23505') throw insertError

  const { error: deleteError } = await supabase
    .from('class_members')
    .delete()
    .eq('class_id', fromClassId)
    .eq('student_id', studentId)
  if (deleteError) throw deleteError
}

export interface StudentAttemptSummary {
  id: string
  exam_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  total_points: number | null
  status: 'in_progress' | 'completed' | 'abandoned'
  attempt_number: number | null
  exams?: { id: string; title: string; type: 'exam' | 'practice' } | null
}

export async function fetchStudentRecentAttempts(studentId: string): Promise<StudentAttemptSummary[]> {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('id, exam_id, started_at, completed_at, score, total_points, status, attempt_number, exams(id, title, type)')
    .eq('user_id', studentId)
    .order('started_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as unknown as StudentAttemptSummary[]
}

export async function resetStudentAttempt(attemptId: string): Promise<void> {
  const { error } = await supabase
    .from('exam_attempts')
    .delete()
    .eq('id', attemptId)
  if (error) throw error
}
