interface Window {
  electron: {
    openExternal: (url: string) => Promise<void>
    // ... other electron APIs you might have
  }
}
