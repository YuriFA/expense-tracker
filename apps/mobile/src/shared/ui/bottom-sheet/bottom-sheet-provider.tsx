import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'

type Props = {
  children: React.ReactNode
}

export function BottomSheetProvider({ children }: Props) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
}
