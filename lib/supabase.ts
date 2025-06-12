import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
console.log('Supabase URL:', supabaseUrl)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
console.log('Supabase Anon Key:', supabaseAnonKey)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
console.log('Supabase Service Key:', supabaseServiceKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)