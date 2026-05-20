/**
 * TRADIXA - Supabase API Client
 * 
 * Interface tetap sama: api.entities.[Entity].filter/create/update/delete
 * Backend sekarang: Supabase (PostgreSQL)
 * 
 * PENTING: Semua 67 halaman TIDAK perlu diubah.
 */

import { supabase } from '@/lib/supabase';
import { ENTITY_TABLE_MAP, getTableName } from './entityTableMap';

// --- Helper: Convert entity filter to Supabase query ---
function applyFilters(query, filters) {
  if (!filters || typeof filters !== 'object') return query;
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  });
  return query;
}

// --- Helper: Convert sort string to Supabase order ---
function applySort(query, sortStr) {
  if (!sortStr) return query.order('created_at', { ascending: false });
  const desc = sortStr.startsWith('-');
  const column = desc ? sortStr.substring(1) : sortStr;
  
  query = query.order(column, { ascending: !desc });
  
  if (column !== 'created_at') {
    query = query.order('created_at', { ascending: false });
  }
  
  return query;
}

// --- Audit Log Helper ---
async function logActivity({ store_id, entity_name, entity_id, action_type, description, old_data, new_data }) {
  try {
    const user = authModule._currentUser || { id: 'system', full_name: 'System', email: 'system@tradixa.com' };
    
    if (entity_name === 'SystemAuditLog') return;

    const trimData = (d) => {
      if (!d) return null;
      try {
        const str = JSON.stringify(d);
        if (str.length > 5000) return { _trimmed: true, id: d.id, summary: `Data too large (${str.length} chars)` };
        return d;
      } catch { return null; }
    };

    const { error } = await supabase.from('system_audit_logs').insert({
      store_id: String(store_id || user.store_id || user.current_store_id || '00000000-0000-0000-0000-000000000000'),
      user_id: user.id?.toString() || 'system',
      user_name: user.full_name || 'System',
      user_email: user.email || 'system@tradixa.com',
      entity_name: String(entity_name),
      entity_id: entity_id?.toString() || null,
      action_type: String(action_type),
      description: String(description || ''),
      old_data: trimData(old_data),
      new_data: trimData(new_data),
      timestamp_wib: new Date().toISOString() // Let DB or UI handle conversion
    });
    
    if (error) {
      console.error('[Tradixa] Audit log insert error:', error.message, error.details);
    }
  } catch (err) {
    console.error('[Tradixa] Failed to log activity:', err);
  }
}

// --- Entity CRUD Factory ---
function createEntityProxy(entityName) {
  const table = getTableName(entityName);

  return {
    /**
     * filter(filters, sort, options)
     * @param {Object} filters - Key-value pairs for .eq() filtering
     * @param {string|null} sort - Sort string, e.g. '-created_date'
     * @param {Object} options - { columns: 'id,name,...', limit: 100 }
     */
    async filter(filters = {}, sort = null, options = {}) {
      const columns = options.columns || '*';
      const limit = options.limit || null;
      let query = supabase.from(table).select(columns);
      query = applyFilters(query, filters);
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) {
        console.error(`[Tradixa] ${entityName}.filter error:`, error.message);
        return [];
      }
      return data || [];
    },

    /**
     * get(id, columns)
     * @param {string} id - Record ID
     * @param {string} columns - Optional column projection, e.g. 'id,name,status'
     */
    async get(id, columns = '*') {
      const { data, error } = await supabase.from(table).select(columns).eq('id', id).single();
      if (error) {
        console.error(`[Tradixa] ${entityName}.get error:`, error.message);
        return null;
      }
      return data;
    },

    async create(record, options = {}) {
      const now = new Date();
      const payload = { ...record };
      const skipDateEntities = ['WarehouseTransfer', 'PickList'];
      if (!skipDateEntities.includes(entityName)) {
        payload.created_date = record.created_date || now.toISOString().split('T')[0];
        payload.updated_date = now.toISOString().split('T')[0];
      }

      // Auto-inject store_id if missing (required for RLS store-scoping)
      // Skip entities whose tables don't have a store_id column
      const skipStoreId = ['Store', 'User', 'JournalLine', 'StockOpnameItem', 'LoyaltyTransaction'];
      if (!payload.store_id && !skipStoreId.includes(entityName)) {
        const currentUser = authModule._currentUser;
        if (currentUser?.current_store_id) {
          payload.store_id = currentUser.current_store_id;
        } else if (currentUser?.store_id) {
          payload.store_id = currentUser.store_id;
        }
      }
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) {
        console.error(`[Tradixa] ${entityName}.create error:`, error.message);
        throw error;
      }

      // Log Activity (lightweight — only log the new data returned from insert)
      logActivity({
        store_id: data.store_id,
        entity_name: entityName,
        entity_id: data.id,
        action_type: 'create',
        description: options.via_ai 
          ? `Created new ${entityName} record (via Tradixa AI Assistant)` 
          : `Created new ${entityName} record`,
        new_data: data
      });

      return data;
    },

    async update(id, updates, options = {}) {
      // OPTIMIZED: No longer fetching old_data before update (saves 1 full select('*') per update)
      const payload = { ...updates };
      const skipDateEntities = ['WarehouseTransfer', 'PickList'];
      if (!skipDateEntities.includes(entityName)) {
        payload.updated_date = new Date().toISOString().split('T')[0];
      }
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) {
        console.error(`[Tradixa] ${entityName}.update error:`, error.message);
        throw error;
      }

      // Log Activity — uses the updates payload as context instead of fetching old_data
      logActivity({
        store_id: data.store_id,
        entity_name: entityName,
        entity_id: id,
        action_type: 'update',
        description: options.via_ai 
          ? `Updated ${entityName} record (via Tradixa AI Assistant)` 
          : `Updated ${entityName} record`,
        old_data: { _optimized: true, changed_fields: Object.keys(updates) },
        new_data: data
      });

      return data;
    },

    async delete(id) {
      // OPTIMIZED: No longer fetching full old_data before delete
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        console.error(`[Tradixa] ${entityName}.delete error:`, error.message);
        throw error;
      }

      // Log Activity with minimal info
      logActivity({
        entity_name: entityName,
        entity_id: id,
        action_type: 'delete',
        description: `Deleted ${entityName} record (id: ${id})`
      });

      return true;
    },
  };
}

const authModule = {
  _currentUser: null,

  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('*').eq('email', user.email).single();
      if (data) {
        this._currentUser = { ...data, auth_id: user.id };
        return this._currentUser;
      }
      // If users table query fails (e.g. RLS), use Supabase Auth data
      this._currentUser = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'owner',
        auth_id: user.id,
        is_store_setup_completed: false,
      };
      return this._currentUser;
    }
    // No Supabase Auth session at all
    return null;
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return this.me();
  },

  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('tradixa_user');
    this._currentUser = null;
  },

  async updateMe(updates) {
    const user = this._currentUser || await this.me();
    if (!user || user.id === 'admin') return user;
    
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_date: new Date().toLocaleDateString('en-CA') })
      .eq('email', user.email)
      .select()
      .single();
    
    if (!error && data) {
      this._currentUser = { ...this._currentUser, ...data };
      return this._currentUser;
    }
    return user;
  }
};

const storageModule = {
  /**
   * upload(file, type)
   * type can be 'product', 'profile', 'logo', 'document'
   */
  async upload(file, type = 'document') {
    try {
      const { uploadFile } = await import('@/utils/storageService');
      const url = await uploadFile(file, type);
      return { url };
    } catch (err) {
      console.error('[Tradixa] storageModule.upload error:', err);
      // Fallback to direct Supabase upload if utility fails
      return this._directSupabaseUpload(file);
    }
  },

  async _directSupabaseUpload(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from('public')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    return { url: publicUrl };
  }
};

const preferencesModule = {
  async get(userId, storeId) {
    if (!userId || !storeId) return null;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('settings')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (error) {
        console.error('[Tradixa] Error fetching preferences:', error.message);
        return null;
      }
      return data?.settings || null;
    } catch (err) {
      console.error('[Tradixa] Preferences fetch error:', err);
      return null;
    }
  },

  async save(userId, storeId, settings) {
    if (!userId || !storeId) return false;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          store_id: storeId,
          settings: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,store_id' });
      
      if (error) {
        console.error('[Tradixa] Error saving preferences:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Tradixa] Preferences save error:', err);
      return false;
    }
  }
};

const entityProxy = new Proxy({}, {
  get(target, entityName) {
    if (typeof entityName !== 'string') return undefined;
    if (!target[entityName]) {
      target[entityName] = createEntityProxy(entityName);
    }
    return target[entityName];
  }
});

const agentsModule = {
  async listConversations() {
    let convos = JSON.parse(localStorage.getItem('chat_conversations') || '[]');
    if (convos.length === 0) {
      convos = [{ id: 'default', metadata: { name: 'Chat Utama' }, created_date: new Date().toISOString() }];
      localStorage.setItem('chat_conversations', JSON.stringify(convos));
    }
    return convos;
  },
  async getConversation(id) {
    return { id, messages: JSON.parse(localStorage.getItem(`chat_${id}`) || '[]') };
  },
  async createConversation(options = {}) {
    const id = Math.random().toString(36).substring(7);
    const convo = { 
      id, 
      metadata: { 
        name: options.metadata?.name || `Chat Baru ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` 
      }, 
      created_date: new Date().toISOString() 
    };
    
    const convos = JSON.parse(localStorage.getItem('chat_conversations') || '[]');
    if (!convos.some(c => c.id === id)) {
      convos.unshift(convo);
      localStorage.setItem('chat_conversations', JSON.stringify(convos));
    }
    return convo;
  },
  async addMessage(conversation, message, options = {}) {
    const chatKey = `chat_${conversation.id}`;
    const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    
    // 1. Add User Message
    const newMessage = { ...message, created_date: new Date().toISOString() };
    const updatedMessages = [...messages, newMessage];
    localStorage.setItem(chatKey, JSON.stringify(updatedMessages));

    // Dispatch event to show user message immediately in chat window
    window.dispatchEvent(new CustomEvent(`chat_update_${conversation.id}`, { detail: { messages: updatedMessages } }));

    // 2. Call AI Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('tradixa-ai-assistant', {
        body: { 
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          is_crud_active: options.isCrudActive !== false
        }
      });

      if (error) throw error;

      // 3. Update Conversation Title if returned from AI
      if (data.title) {
        let convos = JSON.parse(localStorage.getItem('chat_conversations') || '[]');
        convos = convos.map(c => {
          if (c.id === conversation.id) {
            return { ...c, metadata: { ...c.metadata, name: data.title } };
          }
          return c;
        });
        localStorage.setItem('chat_conversations', JSON.stringify(convos));
        // Trigger event to refresh sidebar/list
        window.dispatchEvent(new CustomEvent('conversations_update', { detail: { conversations: convos } }));
      }

      // 4. Add AI Response
      const aiMessage = { role: 'assistant', content: data.reply, created_date: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMessage];
      localStorage.setItem(chatKey, JSON.stringify(finalMessages));
      
      // Trigger event for UI update
      window.dispatchEvent(new CustomEvent(`chat_update_${conversation.id}`, { detail: { messages: finalMessages } }));
    } catch (err) {
      console.error('[AI] Assistant error:', err);
      const errorMessage = { role: 'assistant', content: 'Maaf, saya sedang mengalami gangguan koneksi. Mohon coba lagi nanti.', created_date: new Date().toISOString() };
      const finalMessages = [...updatedMessages, errorMessage];
      localStorage.setItem(chatKey, JSON.stringify(finalMessages));
      window.dispatchEvent(new CustomEvent(`chat_update_${conversation.id}`, { detail: { messages: finalMessages } }));
    }
  },
  subscribeToConversation(id, callback) {
    const handler = (e) => callback(e.detail);
    window.addEventListener(`chat_update_${id}`, handler);
    return () => window.removeEventListener(`chat_update_${id}`, handler);
  }
};

export const api = {
  entities: entityProxy,
  auth: authModule,
  agents: agentsModule,
  storage: storageModule,
  preferences: preferencesModule,
  logActivity,
  client: supabase,
};

export { supabase };

export default api;
