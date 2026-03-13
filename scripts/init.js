import { execSync } from 'child_process';
import path from 'path';

console.log('[v0] Starting Prisma initialization...');

try {
  const projectRoot = path.resolve(process.cwd());
  
  console.log('[v0] Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: projectRoot });
  
  console.log('[v0] Pushing database schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit', cwd: projectRoot });
  
  console.log('[v0] ✅ Prisma initialization complete!');
  process.exit(0);
} catch (error) {
  console.error('[v0] ❌ Initialization failed:', error.message);
  process.exit(1);
}
