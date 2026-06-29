import { useStorage, type RemovableRef } from '@vueuse/core'
export interface LocalStorageSerializer<T> {
  read(raw: string): T
  write(value: T): string
}

export interface UseLocalStorageOptions<T> {
  storageKey: string
  initialValue: T
  serializer: LocalStorageSerializer<T>
}

export function useLocalStorageRef<T>(options: UseLocalStorageOptions<T>): RemovableRef<T> {
  return useStorage<T>(options.storageKey, options.initialValue, localStorage, {
    serializer: {
      read: options.serializer.read,
      write: options.serializer.write,
    },
  })
}
