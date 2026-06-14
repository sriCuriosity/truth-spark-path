import { createClient } from '@supabase/supabase-js';

export class CortexClient {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createEntry(data: {
    entry_type: string;
    title: string;
    body: string;
    outcome?: string;
    what_i_learned?: string;
    previous_belief?: string;
    new_belief?: string;
    domains?: string[];
    is_public?: boolean;
    happened_at?: string;
  }) {
    const { data: entry, error } = await this.supabase
      .from('cortex_entries')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return entry;
  }

  async getEntries(userId: string) {
    const { data, error } = await this.supabase
      .from('cortex_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateEntry(entryId: string, data: Partial<{
    title: string;
    body: string;
    outcome: string;
    what_i_learned: string;
    previous_belief: string;
    new_belief: string;
    domains: string[];
    is_public: boolean;
  }>) {
    const { data: entry, error } = await this.supabase
      .from('cortex_entries')
      .update(data)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return entry;
  }

  async deleteEntry(entryId: string) {
    const { error } = await this.supabase
      .from('cortex_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  }
}

export { createClient };
