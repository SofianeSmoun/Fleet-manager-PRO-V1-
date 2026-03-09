/* eslint-disable no-console */
import 'dotenv/config';
import { runBackup, restoreBackup } from '../services/backupService';
import { encrypt, decrypt } from '../lib/encryption';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'encrypt-test') {
    console.log('Testing AES-256-GCM encrypt/decrypt...');
    const testData = Buffer.from('FleetManager backup test — ' + new Date().toISOString());
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (testData.equals(decrypted)) {
      console.log('✅ Encryption/decryption round-trip OK');
    } else {
      console.error('❌ Encryption/decryption mismatch');
      process.exit(1);
    }
    return;
  }

  if (command === 'backup') {
    console.log('Running manual backup...');
    const result = await runBackup();
    console.log(`✅ Backup completed: ${result.filename} (ID: ${result.id})`);
    return;
  }

  if (command === 'restore') {
    const fileId = args[1];
    if (!fileId) {
      console.error('Usage: testBackup restore <driveFileId>');
      process.exit(1);
    }
    console.log(`Restoring from Google Drive file: ${fileId}...`);
    await restoreBackup(fileId);
    console.log('✅ Restore completed');
    return;
  }

  if (command === 'status') {
    const logs = await prisma.backupLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
    console.log('Last 10 backups:');
    for (const log of logs) {
      console.log(`  ${log.startedAt.toISOString()} | ${log.status.padEnd(11)} | ${log.filename} | ${log.sizeBytes} bytes`);
    }
    return;
  }

  console.log('Usage: tsx src/scripts/testBackup.ts <command>');
  console.log('Commands:');
  console.log('  encrypt-test  — Test AES-256-GCM round-trip');
  console.log('  backup        — Run a manual backup');
  console.log('  restore <id>  — Restore from a Google Drive file ID');
  console.log('  status        — Show last 10 backup logs');
}

void main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
