import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('distribution security boundaries',()=>{
  it('Firestore is default-deny and service-controls entitlement/package writes',()=>{
    const rules=readFileSync(join(process.cwd(),'firestore.rules'),'utf8');
    expect(rules).toContain('match /publicSeries/{seriesId}');
    expect(rules).toContain('match /readerEntitlements/{entitlementId}');
    expect(rules).toMatch(/match \/issuedDataPacks\/\{packageId\}[\s\S]*allow create, update, delete: if false/);
    expect(rules).toMatch(/match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
    expect(rules).not.toContain('allow read, write: if true');
  });

  it('protected packages have no direct client Storage access',()=>{
    const rules=readFileSync(join(process.cwd(),'storage.rules'),'utf8');
    expect(rules).toMatch(/protected-packages[\s\S]*allow read, write: if false/);
  });

  it('30. frontend source and production inputs contain no private signing key',()=>{
    const roots=['src','public','config'].map((path)=>join(process.cwd(),path));
    const files:string[]=[];
    const visit=(path:string)=>readdirSync(path).forEach((name)=>{
      const child=join(path,name);statSync(child).isDirectory()?visit(child):files.push(child);
    });
    roots.forEach(visit);
    const content=files.map((path)=>readFileSync(path,'utf8')).join('\n');
    expect(content).not.toMatch(/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/);
    expect(content).not.toContain('VITE_' + 'PRIVATE_KEY');
  });

  it('Reader secure downloads flow through signed-v3 verification before SQLite writes',()=>{
    const source=readFileSync(join(process.cwd(),'src/components/reader/ReaderShell.tsx'),'utf8');
    const verification=source.indexOf('await verifyImportedBookDataPack(');
    const save=source.indexOf('await saveBookToSQLite(',verification);
    expect(verification).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(verification);
  });
});
