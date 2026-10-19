import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// macOS 기본 파일 시스템은 대소문자를 구분하지 않아 ProposalCard.tsx 와 proposalCard.ts 가 같은 모듈로 잡힌다.
function moduleNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return moduleNames(path);
    return [path.replace(/\.(test\.)?[^./]+$/, '').replace(/\.module$/, '')];
  });
}

describe('파일 이름', () => {
  it('대소문자만 다른 모듈 이름이 없다', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const name of new Set(moduleNames(join(__dirname)))) {
      const key = name.toLowerCase();
      const other = seen.get(key);
      if (other !== undefined && other !== name) clashes.push(`${other} ↔ ${name}`);
      seen.set(key, name);
    }
    expect(clashes).toEqual([]);
  });
});
