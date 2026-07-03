import { describe, expect, it, beforeEach } from 'vitest'
import { createLocalStorageAdapter } from './local-storage-adapter'

describe('createLocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates an adapter with get, set, and remove methods', () => {
    const adapter = createLocalStorageAdapter('testKey', 0, {
      read: (value) => Number(value),
      write: (value) => value.toString(),
    })

    expect(typeof adapter.get).toBe('function')
    expect(typeof adapter.set).toBe('function')
    expect(typeof adapter.remove).toBe('function')
  })

  it('returns default value if key does not exist', () => {
    const adapter = createLocalStorageAdapter('nonExistentKey', 42, {
      read: (value) => Number(value),
      write: (value) => value.toString(),
    })

    expect(adapter.get()).toBe(42)
  })

  it('roundtrips number value through serializer', () => {
    const adapter = createLocalStorageAdapter('testKey', 0, {
      read: (value) => Number(value),
      write: (value) => value.toString(),
    })

    adapter.set(42)
    expect(adapter.get()).toBe(42)
    expect(localStorage.getItem('testKey')).toBe('42')
  })

  it('removes the key from localStorage', () => {
    const adapter = createLocalStorageAdapter('testKey', 0, {
      read: (value) => Number(value),
      write: (value) => value.toString(),
    })

    adapter.set(42)
    adapter.remove()
    expect(adapter.get()).toBe(0)
    expect(localStorage.getItem('testKey')).toBeNull()
  })

  it('roundtrips complex objects through custom JSON serializer', () => {
    const adapter = createLocalStorageAdapter('testKey', { a: 1 }, {
      read: (value) => JSON.parse(value) as { a: number; b?: number },
      write: (value) => JSON.stringify(value),
    })

    const obj = { a: 1, b: 2 }
    adapter.set(obj)
    expect(adapter.get()).toEqual(obj)
  })

  it('roundtrips nested objects', () => {
    const adapter = createLocalStorageAdapter('testKey', { a: { b: 1 } }, {
      read: (value) => JSON.parse(value) as { a: { b: number; c?: number } },
      write: (value) => JSON.stringify(value),
    })

    const obj = { a: { b: 1, c: 2 } }
    adapter.set(obj)
    expect(adapter.get()).toEqual(obj)
  })

  it('roundtrips arrays', () => {
    const adapter = createLocalStorageAdapter('testKey', [], {
      read: (value) => JSON.parse(value) as number[],
      write: (value) => JSON.stringify(value),
    })

    const arr = [1, 2, 3]
    adapter.set(arr)
    expect(adapter.get()).toEqual(arr)
  })

  it('treats empty string stored value as missing (returns default)', () => {
    // Documents existing adapter behavior: the `if (!item) return defaultValue`
    // check in get() treats empty string as falsy, so storing '' is treated
    // like a missing key. This is a known quirk, not a bug — but worth pinning down.
    const adapter = createLocalStorageAdapter('testKey', 'default', {
      read: (value) => value,
      write: (value) => value,
    })

    adapter.set('')
    expect(localStorage.getItem('testKey')).toBe('')
    expect(adapter.get()).toBe('default')
  })

  it('roundtrips null value through sentinel-based serializer', () => {
    const adapter = createLocalStorageAdapter<string | null>('testKey', null, {
      read: (value) => (value === 'null' ? null : value),
      write: (value) => (value === null ? 'null' : value),
    })

    adapter.set(null)
    expect(localStorage.getItem('testKey')).toBe('null')
    expect(adapter.get()).toBeNull()

    adapter.set('hello')
    expect(adapter.get()).toBe('hello')
  })

  it('roundtrips boolean values through serializer', () => {
    const adapter = createLocalStorageAdapter<boolean>('testKey', false, {
      read: (value) => value === 'true',
      write: (value) => (value ? 'true' : 'false'),
    })

    adapter.set(true)
    expect(localStorage.getItem('testKey')).toBe('true')
    expect(adapter.get()).toBe(true)

    adapter.set(false)
    expect(localStorage.getItem('testKey')).toBe('false')
    expect(adapter.get()).toBe(false)
  })
})
