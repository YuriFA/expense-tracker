import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSyncRunPolicy, LOCAL_DATA_QUERY_KEY_ROOTS } from './run-policy'

type CompletionListener = (result: { wroteLocalData: boolean }) => void

function createHarness(overrides: { ensureHouseholdCurrent?: never } | object = {}) {
  const run = vi.fn().mockResolvedValue(undefined)
  const resume = vi.fn()
  const isAuthenticated = vi.fn(() => true)
  const ensureHouseholdCurrent = vi.fn().mockResolvedValue(undefined)
  const invalidateKeys = vi.fn()
  let completionListener: CompletionListener | null = null
  const stopOnRunComplete = vi.fn()
  const onRunComplete = vi.fn((cb: CompletionListener) => {
    completionListener = cb
    return stopOnRunComplete
  })
  const policy = createSyncRunPolicy({
    engine: { run, resume },
    isAuthenticated,
    ensureHouseholdCurrent,
    invalidateKeys,
    onRunComplete,
    ...overrides,
  })
  return {
    policy,
    run,
    resume,
    isAuthenticated,
    ensureHouseholdCurrent,
    invalidateKeys,
    stopOnRunComplete,
    complete: (wroteLocalData: boolean) => completionListener?.({ wroteLocalData }),
  }
}

/** Flushes the policy's async gate chain under fake timers. */
const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createSyncRunPolicy', () => {
  it('coalesces a burst of local mutations into one debounced run', async () => {
    const h = createHarness()
    h.policy.notifyLocalMutation()
    h.policy.notifyLocalMutation()
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_499)
    expect(h.run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(h.run).toHaveBeenCalledTimes(1)
  })

  it('restarts the debounce window on each mutation', async () => {
    const h = createHarness()
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_000)
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(500)
    expect(h.run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(h.run).toHaveBeenCalledTimes(1)
  })

  it('schedules a new run for a mutation after a completed one', async () => {
    const h = createHarness()
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).toHaveBeenCalledTimes(1)
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).toHaveBeenCalledTimes(2)
  })

  it('never runs while unauthenticated', async () => {
    const h = createHarness()
    h.isAuthenticated.mockReturnValue(false)
    h.policy.notifySessionBoundary()
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).not.toHaveBeenCalled()
    expect(h.ensureHouseholdCurrent).not.toHaveBeenCalled()
  })

  it('resumes the engine and gates the first run on authentication', async () => {
    const h = createHarness()
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.resume).toHaveBeenCalledTimes(1)
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(1)
    expect(h.run).toHaveBeenCalledTimes(1)
    const order = [h.resume.mock.invocationCallOrder[0], h.ensureHouseholdCurrent.mock.invocationCallOrder[0], h.run.mock.invocationCallOrder[0]]
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('parks runs behind a pending household choice', async () => {
    const h = createHarness()
    let resolveGate!: () => void
    h.ensureHouseholdCurrent.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveGate = resolve
      }),
    )
    h.policy.notifyAuthChange(true)
    await flush()
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).not.toHaveBeenCalled()
    resolveGate()
    await flush()
    expect(h.run).toHaveBeenCalled()
  })

  it('skips the run when the household check fails and retries at the next boundary', async () => {
    const h = createHarness()
    h.ensureHouseholdCurrent.mockRejectedValue(new Error('offline'))
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.run).not.toHaveBeenCalled()
    // Unknown household currency also blocks in-session mutation runs.
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).not.toHaveBeenCalled()
    // Connectivity returns: the next boundary re-checks and runs.
    h.ensureHouseholdCurrent.mockResolvedValue(undefined)
    h.policy.notifySessionBoundary()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.run).toHaveBeenCalledTimes(1)
  })

  it('re-checks household currency at session boundaries but not within a session', async () => {
    const h = createHarness()
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(1)
    h.policy.notifyLocalMutation()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(1)
    h.policy.notifySessionBoundary()
    await vi.advanceTimersByTimeAsync(0)
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(2)
    // Auth flip + in-session mutation + boundary = three gated runs.
    expect(h.run).toHaveBeenCalledTimes(3)
  })

  it('invalidates sync status on every cycle and entity roots only on writes', () => {
    const h = createHarness()
    h.complete(true)
    expect(h.invalidateKeys).toHaveBeenLastCalledWith([['sync'], ...LOCAL_DATA_QUERY_KEY_ROOTS])
    h.complete(false)
    expect(h.invalidateKeys).toHaveBeenLastCalledWith([['sync']])
  })

  it('manual refresh skips the household re-check', async () => {
    const h = createHarness()
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(1)
    h.policy.runNow(true)
    await flush()
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(1)
    expect(h.run).toHaveBeenLastCalledWith({ force: true })
  })

  it('re-checks the household after logout on the next login', async () => {
    const h = createHarness()
    h.policy.notifyAuthChange(true)
    await flush()
    h.policy.notifyAuthChange(false)
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.ensureHouseholdCurrent).toHaveBeenCalledTimes(2)
  })

  it('treats a missing household gate as always current', async () => {
    const h = createHarness({ ensureHouseholdCurrent: undefined })
    h.policy.notifyAuthChange(true)
    await flush()
    expect(h.run).toHaveBeenCalledTimes(1)
  })

  it('dispose cancels pending timers and the completion subscription', async () => {
    const h = createHarness()
    h.policy.notifyLocalMutation()
    h.policy.dispose()
    await vi.advanceTimersByTimeAsync(2_500)
    expect(h.run).not.toHaveBeenCalled()
    expect(h.stopOnRunComplete).toHaveBeenCalledTimes(1)
  })
})
