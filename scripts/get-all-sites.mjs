import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { sites } from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const allSites = await db.select().from(sites).orderBy(sites.id);

console.log(JSON.stringify(allSites.map(s => ({
  id: s.id,
  name: s.name,
  duid: s.duid,
  latitude: s.latitude,
  longitude: s.longitude,
  dcCapacityMw: s.dcCapacityMw
})), null, 2));

await connection.end();
process.exit(0);
