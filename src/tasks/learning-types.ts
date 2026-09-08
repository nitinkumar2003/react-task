export interface CodeSnippet {
  /** what this snippet demonstrates, e.g. "Stable callback via functional setState" */
  title: string
  /** the actual code, kept close to what's really in index.tsx/etc. */
  code: string
  /** plain-English explanation of *why* it's written this way, not just what it does */
  explanation: string
}

export interface InterviewQA {
  question: string
  answer: string
}

export interface LearningContent {
  /** short summary of the approach taken — empty until the task is implemented */
  summary: string
  /** concepts / hooks / patterns actually used while building this */
  concepts: string[]
  /** key code snippets worth remembering, with explanations — for revision */
  codeSnippets: CodeSnippet[]
  /** interview questions this task preps you for, WITH answers — shown as an accordion */
  interviewQuestions: InterviewQA[]
}

export const emptyLearning = (title: string): LearningContent => ({
  summary: `Not implemented yet — once you build "${title}", fill this in: what approach did you take, and why?`,
  concepts: [],
  codeSnippets: [],
  interviewQuestions: [],
})
