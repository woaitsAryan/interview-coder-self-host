/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_JWT: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_WEBSITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
