import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  try {
    console.log('[v0] Running Prisma database migration...');
    const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate', {
      cwd: process.cwd()
    });
    console.log('[v0] Output:', stdout);
    if (stderr) console.error('[v0] Errors:', stderr);
    console.log('[v0] Database migration completed successfully');
  } catch (error) {
    console.error('[v0] Migration failed:', error.message);
    process.exit(1);
  }
}

main();
