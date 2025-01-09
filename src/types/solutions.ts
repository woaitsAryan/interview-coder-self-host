export interface Solution {
  initial_thoughts: string[]
  thought_steps: string[]
  description: string
  code: string
}

export interface SolutionsResponse {
  [key: string]: Solution
}

export interface ProblemStatementData {
  problem_statement: string
  input_format: {
    description: string
    parameters: any[]
  }
  output_format: {
    description: string
    type: string
    subtype: string
  }
  complexity: {
    time: string
    space: string
  }
  test_cases: any[]
  validation_type: string
  difficulty: string
}

declare global {
  interface Window {
    electronAPI: {
      updateContentDimensions: (dimensions: {
        width: number
        height: number
      }) => Promise<void>
      clearStore: () => Promise<{ success: boolean; error?: string }>
      getScreenshots: () => Promise<{ path: string; preview: string }[]>
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      onSolutionsReady: (callback: (solutions: string) => void) => () => void
      onResetView: (callback: () => void) => () => void
      onSolutionStart: (callback: () => void) => () => void
      onDebugStart: (callback: () => void) => () => void
      onDebugSuccess: (callback: (data: any) => void) => () => void
      onSolutionError: (callback: (error: string) => void) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      onProblemExtracted: (callback: (data: any) => void) => () => void
      onSolutionSuccess: (callback: (data: any) => void) => () => void
      onUnauthorized: (callback: () => void) => () => void
      onDebugError: (callback: (error: string) => void) => () => void
      takeScreenshot: () => Promise<void>
      moveWindowLeft: () => Promise<void>
      moveWindowRight: () => Promise<void>
      openExternal: (url: string) => void
      toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
      triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
      triggerProcessScreenshots: () => Promise<{
        success: boolean
        error?: string
      }>
      triggerReset: () => Promise<{ success: boolean; error?: string }>
      triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
      triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
      triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
      triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
    }
  }
}
