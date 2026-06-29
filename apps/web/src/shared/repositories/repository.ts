export interface Repository<T, CreatePayload, UpdatePayload> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(payload: CreatePayload): Promise<T>
  update(id: string, payload: UpdatePayload): Promise<boolean>
  remove(id: string): Promise<boolean>
}
