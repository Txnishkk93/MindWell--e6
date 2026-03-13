#!/bin/bash
set -e

echo "[v0] Running Prisma database migration..."
cd /vercel/share/v0-project
npx prisma db push --skip-generate
echo "[v0] Database migration completed successfully"
