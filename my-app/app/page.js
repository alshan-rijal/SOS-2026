import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('your_table').select('*')

  if (error) {
    return <pre>Error: {error.message}</pre>
  }

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}