import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchQuestions } from '../../lib/questions'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface BankQuestion {
  id: string
  topic: string | null
  type: string
  difficulty: number
  grade: number | null
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Challenge',
}

export default function BankView() {
  // difficulty '' = all
  const [difficulty, setDifficulty] = useState('')

  const bankQ = useQuery({
    queryKey: ['td-bank'],
    queryFn: () => fetchQuestions(),
  })

  const questions = (bankQ.data ?? []) as unknown as BankQuestion[]
  const filtered = difficulty ? questions.filter((q) => q.difficulty === Number(difficulty)) : questions

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Question Bank</CardTitle>
          <p className="text-sm text-text-muted">
            <span>
              {filtered.length === questions.length
                ? `${questions.length} questions`
                : `${filtered.length} of ${questions.length} questions`}
            </span>
            {` · manage full bank under Admin → Questions`}
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="px-5 pb-4">
            <label className="text-xs font-medium text-text-muted" htmlFor="bank-difficulty">
              Difficulty
            </label>
            <select
              id="bank-difficulty"
              className="input mt-1"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">All</option>
              {[1, 2, 3, 4].map((d) => (
                <option key={d} value={String(d)}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">
              No questions match. Import from the vault to fill the bank.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.topic ?? '—'}</TableCell>
                    <TableCell>{q.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={q.difficulty >= 3 ? 'warning' : 'default'}>
                        {DIFFICULTY_LABELS[q.difficulty] ?? String(q.difficulty)}
                      </Badge>
                    </TableCell>
                    <TableCell>{q.grade ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
