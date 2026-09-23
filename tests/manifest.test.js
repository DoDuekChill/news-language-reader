import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Manifest V3 Configuration', () => {
  it('should have valid Manifest V3 structure and required permissions', () => {
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('News Language Reader');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('unlimitedStorage');
    expect(manifest.background.service_worker).toBe('src/background/service-worker.js');
    expect(manifest.content_scripts[0].js).toContain('dist/content-script.bundle.js');
    expect(manifest.action.default_title).toBe('Open News Language Reader');
  });
});
