import Store from "electron-store"

interface StoreSchema {
  openaiApiKey: string | null
}

const store = new Store<StoreSchema>({
  defaults: {
    openaiApiKey: null
  },
  encryptionKey: "your-encryption-key"
}) as Store<StoreSchema> & {
  store: StoreSchema
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

export { store }
