export function createLocalStorageAdapter<T>(
  key: string,
  defaultValue: T,
  serializer: {
    read: (value: string) => T
    write: (value: T) => string
  },
) {
  return {
    get: (): T => {
      const item = localStorage.getItem(key)
      if (!item) return defaultValue
      return serializer.read(item)
    },
    set: (value: T) => {
      localStorage.setItem(key, serializer.write(value))
    },
    remove: () => {
      localStorage.removeItem(key)
    },
  }
}
