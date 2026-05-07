/**
 * Tradixa Dedicated API Client
 * Reverted to Mock/Local Storage Mode
 */

// Generate a random ID
const uuid = () => Math.random().toString(36).substring(2, 15);

// Delay simulator to mimic network latency
const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// Simple Local Storage wrapper
const getStorage = (key) => JSON.parse(localStorage.getItem(`tradixa_mock_${key}`) || '[]');
const setStorage = (key, data) => localStorage.setItem(`tradixa_mock_${key}`, JSON.stringify(data));

// Factory for creating a mocked Entity collection
const createMockEntity = (entityName) => {
  return {
    async filter(filters = {}, sortStr = null) {
      await delay();
      let data = getStorage(entityName);
      
      // Perform simple filtering
      for (const [key, val] of Object.entries(filters)) {
        if (val === undefined || val === null) continue;
        data = data.filter(item => item[key] === val);
      }
      
      // Perform simple sorting (-field or field)
      if (sortStr) {
        const isDesc = sortStr.startsWith('-');
        const field = isDesc ? sortStr.substring(1) : sortStr;
        data.sort((a, b) => {
          if (a[field] < b[field]) return isDesc ? 1 : -1;
          if (a[field] > b[field]) return isDesc ? -1 : 1;
          return 0;
        });
      } else {
        // Default: urutkan dari yang terbaru (reverse array)
        data = [...data].reverse();
      }
      
      return data;
    },
    
    async get(id) {
      await delay();
      const data = getStorage(entityName);
      return data.find(item => item.id === id) || null;
    },
    
    async create(payload) {
      await delay();
      const data = getStorage(entityName);
      const newItem = { 
        ...payload, 
        id: uuid(),
        created_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      setStorage(entityName, [...data, newItem]);
      return newItem;
    },
    
    async update(id, payload) {
      await delay();
      const data = getStorage(entityName);
      const idx = data.findIndex(item => item.id === id);
      if (idx === -1) throw new Error(`${entityName} not found`);
      
      const updatedItem = { ...data[idx], ...payload, updated_date: new Date().toISOString() };
      data[idx] = updatedItem;
      setStorage(entityName, data);
      return updatedItem;
    },
    
    async delete(id) {
      await delay();
      const data = getStorage(entityName);
      setStorage(entityName, data.filter(item => item.id !== id));
      return { success: true };
    }
  };
};

// Initial admin data if not exists
const MOCK_ADMIN_EMAIL = 'admin@tradixa.com';
const MOCK_ADMIN_PASS = '123456';

const initializeAuth = () => {
    let users = getStorage('User');
    if (users.length === 0) {
        users.push({
            id: 'mock-admin-id',
            email: MOCK_ADMIN_EMAIL,
            password: MOCK_ADMIN_PASS,
            name: 'Super Admin',
            role: 'owner',
            is_store_setup_completed: false
        });
        setStorage('User', users);
    }
}
initializeAuth();

// Mock API Client Interface
export const api = {
  auth: {
    async login(email, password) {
      await delay(500);
      const users = getStorage('User');
      const user = users.find(u => u.email === email && u.password === password);
      
      if (!user) throw new Error('Email atau password salah');
      
      // Save session to localStorage
      localStorage.setItem('tradixa_session', JSON.stringify(user));
      return user;
    },
    
    async me() {
      await delay(100);
      const session = localStorage.getItem('tradixa_session');
      if (!session) throw new Error('Not authenticated');
      return JSON.parse(session);
    },
    
    async updateMe(payload) {
      await delay(300);
      const session = JSON.parse(localStorage.getItem('tradixa_session'));
      const updated = { ...session, ...payload };
      localStorage.setItem('tradixa_session', JSON.stringify(updated));
      
      // Also update in User storage
      const users = getStorage('User');
      const idx = users.findIndex(u => u.id === session.id);
      if (idx !== -1) {
        users[idx] = updated;
        setStorage('User', users);
      }
      
      return updated;
    },
    
    async logout() {
      localStorage.removeItem('tradixa_session');
      return true;
    }
  },
  
  storage: {
    async upload(file) {
      await delay(800);
      // Jika file adalah gambar, kita bisa mengembalikan placeholder produk yang lebih relevan
      // daripada avatar "File Upload" (FU) yang membingungkan user.
      const productPlaceholders = [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80', // Watch
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80', // Headphones
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80', // Sneakers
        'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=300&q=80', // Sunglasses
      ];
      const randomIdx = Math.floor(Math.random() * productPlaceholders.length);
      return { url: productPlaceholders[randomIdx] };
    }
  },
  
  // Dynamic proxy to handle any entity name like `api.entities.Product.filter()`
  entities: new Proxy({}, {
    get(target, prop) {
      if (typeof prop === 'string') {
        if (!target[prop]) {
          // Always use mock entity
          target[prop] = createMockEntity(prop);
        }
        return target[prop];
      }
      return Reflect.get(target, prop);
    }
  })
};
