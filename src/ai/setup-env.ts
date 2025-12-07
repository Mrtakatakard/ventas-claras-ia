import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local explicitely since genkit runs in a separate process
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
