import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: dirname })

export default [
  { ignores: ['.next/**', 'node_modules/**', 'media/**', 'payload-types.ts', 'app/(payload)/**'] },
  ...compat.extends('next/core-web-vitals'),
]
