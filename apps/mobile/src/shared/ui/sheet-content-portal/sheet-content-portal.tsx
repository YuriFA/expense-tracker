import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'

// Why this exists (fix-accessibility-tree-collapse): dismissing a
// `BottomSheetModal` whose React component is rendered inside ANOTHER
// sheet's portal content (a "sheet-in-sheet", e.g. a picker mounted next to
// its field row inside a form sheet) collapses the app's accessibility
// exposure after a confirmed create+sync — the UI keeps rendering but
// XCUITest/VoiceOver see only the native backdrops until restart. The same
// picker rendered as a direct child of the owning form-sheet component
// (outside the sheet's children) is safe; re-parenting to an app-root slot
// is NOT (verified experimentally). `useSheetContentPickers` gives a form
// exactly that placement while keeping pickers authored next to their rows:
// wrap the sheet's content subtree with the scope's Provider and render
// `nodes` as a sibling of the `<BottomSheet>` element.
//
// Content MUST be self-contained (props only, no ambient React contexts):
// it is rendered outside the subtree it is declared in.

interface SlotHandle {
  getChildren: () => ReactNode
  setChildren: (children: ReactNode) => void
  subscribe: (listener: () => void) => () => void
}

function createSlotHandle(): SlotHandle {
  let children: ReactNode = null
  const listeners = new Set<() => void>()
  return {
    getChildren: () => children,
    setChildren: (next) => {
      children = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function SlotRenderer({ handle }: { handle: SlotHandle }) {
  const [, forceUpdate] = useReducer((tick: number) => tick + 1, 0)
  useEffect(() => handle.subscribe(forceUpdate), [handle])
  return <>{handle.getChildren()}</>
}

interface SheetContentPortalRegistry {
  mount: (id: number, handle: SlotHandle) => void
  unmount: (id: number) => void
}

const SheetContentPortalContext = createContext<SheetContentPortalRegistry | null>(null)

let nextPortalId = 0

export interface SheetContentPickersScope {
  /** Wraps the sheet's content subtree so rows can register pickers. */
  Provider: (props: { children: ReactNode }) => React.JSX.Element
  /** The registered pickers; render as a sibling of the sheet element. */
  nodes: React.JSX.Element | null
}

/**
 * The per-form re-parenting scope. The Provider must wrap the content
 * passed to the sheet (it flows into @gorhom's portal like a FormProvider
 * would); `nodes` must render directly under the form-sheet component,
 * outside the sheet's children.
 *
 * The scope's state tracks only which pickers are mounted; children updates
 * are delivered imperatively to each picker's slot, so re-parented pickers
 * re-render on prop changes without re-rendering the form (which would loop
 * the scope's own state).
 */
export function useSheetContentPickers(): SheetContentPickersScope {
  const [slots, setSlots] = useState<Map<number, SlotHandle>>(() => new Map())

  const registry = useMemo<SheetContentPortalRegistry>(
    () => ({
      mount: (id, handle) =>
        setSlots((current) => {
          const next = new Map(current)
          next.set(id, handle)
          return next
        }),
      unmount: (id) =>
        setSlots((current) => {
          if (!current.has(id)) return current
          const next = new Map(current)
          next.delete(id)
          return next
        }),
    }),
    [],
  )

  const Provider = useMemo(
    () =>
      function SheetContentPickersProvider({ children }: { children: ReactNode }) {
        return (
          <SheetContentPortalContext.Provider value={registry}>
            {children}
          </SheetContentPortalContext.Provider>
        )
      },
    [registry],
  )

  const nodes = useMemo(
    () =>
      slots.size === 0 ? null : (
        <>
          {Array.from(slots.entries(), ([id, handle]) => (
            <SlotRenderer key={id} handle={handle} />
          ))}
        </>
      ),
    [slots],
  )

  return { Provider, nodes }
}

/**
 * Declares a picker modal inside sheet content; the enclosing scope
 * re-parents it outside the sheet's portal content. Without a scope in
 * scope the children render in place (the pre-fix behavior), so a missing
 * scope is a behavioral no-op.
 */
export function SheetContentPortal({ children }: { children: ReactNode }) {
  const registry = useContext(SheetContentPortalContext)
  const [id] = useState(() => nextPortalId++)
  const [handle] = useState(createSlotHandle)

  useEffect(() => {
    if (!registry) return
    registry.mount(id, handle)
    return () => registry.unmount(id)
  }, [registry, id, handle])

  useEffect(() => {
    if (registry) handle.setChildren(children)
  }, [registry, handle, children])

  if (!registry) return <>{children}</>
  return null
}
