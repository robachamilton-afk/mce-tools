import * as db from '../server/db.js';

const sites = await db.searchSites('Clare');
console.log(JSON.stringify(sites, null, 2));
