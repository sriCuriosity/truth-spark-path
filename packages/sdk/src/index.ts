import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import './components/consent-gate';
import './components/cortex-button';


// 1. Zod validation schemas for SDK inputs
export const cortexEntrySchema = z.object({
  entry_type: z.enum(['action', 'perspective_shift', 'experiment', 'contribution']),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  outcome: z.string().optional().nullable(),
  what_i_learned: z.string().optional().nullable(),
  previous_belief: z.string().optional().nullable(),
  new_belief: z.string().optional().nullable(),
  domains: z.array(z.string()).min(1, "At least one domain tag is required"),
  is_public: z.boolean().default(false),
  happened_at: z.string().datetime().optional().nullable()
});

export type CortexEntryInput = z.infer<typeof cortexEntrySchema>;

// 2. Exponential backoff retry helper for network boundaries
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

export class CortexClient {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createEntry(data: CortexEntryInput) {
    // Validate payload structure
    const validated = cortexEntrySchema.parse(data);

    // Call database function with retry policy
    return fetchWithRetry(async () => {
      const { data: entry, error } = await this.supabase
        .from('cortex_entries')
        .insert(validated)
        .select()
        .single();

      if (error) throw error;
      return entry;
    });
  }

  async getEntries(userId: string) {
    return fetchWithRetry(async () => {
      const { data, error } = await this.supabase
        .from('cortex_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    });
  }

  async updateEntry(entryId: string, data: Partial<CortexEntryInput>) {
    return fetchWithRetry(async () => {
      const { data: entry, error } = await this.supabase
        .from('cortex_entries')
        .update(data)
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return entry;
    });
  }

  async deleteEntry(entryId: string) {
    return fetchWithRetry(async () => {
      const { error } = await this.supabase
        .from('cortex_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
    });
  }
}

export { createClient };

