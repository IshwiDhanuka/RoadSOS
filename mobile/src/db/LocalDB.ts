import SQLite from 'react-native-sqlite-storage';
import { ServiceRecord } from '../types';

SQLite.enablePromise(true);

class LocalDB {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDB() {
    this.db = await SQLite.openDatabase({ name: 'roadsos.db', location: 'default' });
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        phone TEXT,
        address TEXT,
        isVerified INTEGER DEFAULT 0,
        cachedAt INTEGER NOT NULL
      );
    `);
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        region_geohash TEXT PRIMARY KEY,
        last_synced INTEGER NOT NULL,
        record_count INTEGER
      );
    `);
  }

  async insertServices(services: ServiceRecord[]) {
    if (!this.db) return;
    this.db.transaction(tx => {
      services.forEach(s => {
        tx.executeSql(
          'INSERT OR REPLACE INTO services (id, name, category, lat, lng, phone, address, isVerified, cachedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.category, s.lat, s.lng, JSON.stringify(s.phone), s.address, s.isVerified ? 1 : 0, Date.now()]
        );
      });
    });
  }

  async getNearbyServices(lat: number, lng: number): Promise<ServiceRecord[]> {
    if (!this.db) return [];
    // Basic Euclidean distance approximation for sorting since SQLite lacks acos/cos functions by default
    const query = `
      SELECT *, ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) AS distSquared
      FROM services
      ORDER BY distSquared ASC
      LIMIT 20
    `;
    const [results] = await this.db.executeSql(query, [lat, lat, lng, lng]);
    const services: ServiceRecord[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      services.push({
        id: row.id,
        name: row.name,
        category: row.category as any,
        lat: row.lat,
        lng: row.lng,
        phone: row.phone ? JSON.parse(row.phone) : [],
        address: row.address,
        isVerified: row.isVerified === 1,
        distanceMeters: Math.sqrt(row.distSquared) * 111000, // rough approx
        source: 'offline',
      });
    }
    return services;
  }

  async searchServices(q: string, lat: number, lng: number, category?: string): Promise<ServiceRecord[]> {
    if (!this.db) return [];
    
    let query = `
      SELECT *, ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) AS distSquared
      FROM services
      WHERE 1=1
    `;
    const params: any[] = [lat, lat, lng, lng];
    
    if (q) {
      query += ` AND (name LIKE ? OR category LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY distSquared ASC LIMIT 20`;
    
    const [results] = await this.db.executeSql(query, params);
    const services: ServiceRecord[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      services.push({
        id: row.id,
        name: row.name,
        category: row.category as any,
        lat: row.lat,
        lng: row.lng,
        phone: row.phone ? JSON.parse(row.phone) : [],
        address: row.address,
        isVerified: row.isVerified === 1,
        distanceMeters: Math.sqrt(row.distSquared) * 111000, // rough approx
        source: 'offline',
      });
    }
    return services;
  }
}

export default new LocalDB();
