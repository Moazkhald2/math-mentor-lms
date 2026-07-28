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
