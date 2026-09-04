import { describe, expect, it } from '@jest/globals'
import { readdirSync, readFileSync, type Dirent } from 'node:fs'
import path from 'node:path'

const GRADIENT = /bg-(?:linear|gradient)-to-[a-z-]+|(?:linear|radial|conic)-gradient\(/g
const SRC_ROOT = path.resolve(__dirname, '../../..')

const SANCTIONED_GRADIENTS: Partial<Record<string, RegExp[]>> = {
  'src/shared/ui/sheet-footer/sheet-footer.tsx': [/bg-linear-to-t/g],
}

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

describe('flat-system guardrails', () => {
  it('keeps gradients out of src except the sanctioned utility cases', () => {
    const offenders = collectSourceFiles(SRC_ROOT)
      .map((file) => {
        const slug = path.relative(SRC_ROOT, file)
        let source = readFileSync(file, 'utf8')
        for (const pattern of SANCTIONED_GRADIENTS[slug] ?? []) {
          source = source.replace(pattern, '')
        }
        const hits = source.match(GRADIENT)
        return hits ? `${slug}: ${hits.join(', ')}` : null
      })
      .filter((line): line is string => line !== null)

    expect(offenders).toEqual([])
  })
})
