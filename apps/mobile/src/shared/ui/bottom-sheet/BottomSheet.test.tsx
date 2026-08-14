import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet'
import { Text } from 'react-native'
import { BottomSheet } from './BottomSheet'

function renderSheet(ui: React.ReactNode) {
  return render(<BottomSheetModalProvider>{ui}</BottomSheetModalProvider>)
}

// Mirrors how sheets consume the wrapper: content wrapped in a
// BottomSheetView (static) or BottomSheetScrollView (scrollable).
function SheetContent() {
  return (
    <BottomSheetView testID="sheet">
      <Text>Заголовок</Text>
      <Text>Контент</Text>
    </BottomSheetView>
  )
}

describe('BottomSheet', () => {
  it('renders the content when visible', () => {
    renderSheet(
      <BottomSheet visible onClose={jest.fn()} testID="sheet">
        <SheetContent />
      </BottomSheet>,
    )
    expect(screen.getByText('Заголовок')).toBeTruthy()
    expect(screen.getByText('Контент')).toBeTruthy()
    expect(screen.getByTestId('sheet')).toBeTruthy()
  })

  it('renders nothing when not visible', () => {
    renderSheet(
      <BottomSheet visible={false} onClose={jest.fn()} testID="sheet">
        <SheetContent />
      </BottomSheet>,
    )
    expect(screen.queryByText('Заголовок')).toBeNull()
    expect(screen.queryByTestId('sheet')).toBeNull()
  })

  it('closes when the scrim is pressed', () => {
    const onClose = jest.fn()
    renderSheet(
      <BottomSheet visible onClose={onClose} testID="sheet">
        <SheetContent />
      </BottomSheet>,
    )
    fireEvent.press(screen.getByTestId('sheet-scrim'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
