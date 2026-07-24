import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const scriptPath = join(process.cwd(), 'scripts', 'bootstrapStaffAdmin.mjs');

describe('staff administrator bootstrap utility', () => {
  it('documents required arguments, ADC, and explicit overwrite behavior', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--help'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('--uid <firebase-uid>');
    expect(result.stdout).toContain('--email <staff-email>');
    expect(result.stdout).toContain('--display-name "<display name>"');
    expect(result.stdout).toContain('Application Default Credentials');
    expect(result.stdout).toContain('--force');
  });

  it('rejects missing required identity arguments before using credentials', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--email', 'staff@example.com'], {
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('A valid --uid is required');
  });

  it('uses Admin SDK, the named database, atomic create, and the full contract', () => {
    const source = readFileSync(scriptPath, 'utf8');
    expect(source).toContain('applicationDefault()');
    expect(source).toContain('getFirestore(app, args.databaseId)');
    expect(source).toContain('staffRef.create(record)');
    expect(source).toContain("status: 'active'");
    expect(source).toContain("roles: ['administrator']");
    for (const permission of [
      'staff.portal.view',
      'books.view',
      'books.edit',
      'series.view',
      'series.edit',
      'payments.review',
      'publishing.manage',
      'audit.view',
      'team.view',
    ]) {
      expect(source).toContain(`'${permission}'`);
    }
    expect(source).not.toContain('private_key');
    expect(source).not.toContain('access_token');
  });
});
