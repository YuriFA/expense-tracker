import { describe, expect, it, jest } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { SheetContentPortal, useSheetContentPickers } from './sheet-content-portal'

/**
 * The form-sheet composition the scope is designed for: the Provider wraps
 * the content handed to the sheet, `nodes` renders beside the sheet element
 * itself (here simplified to a plain View standing in for the sheet).
 */
function FormSheet({ children }: { children: React.ReactNode }) {
  const pickers = useSheetContentPickers()
  return (
    <View>
      {pickers.nodes}
      <View testID="sheet-content">
        <pickers.Provider>{children}</pickers.Provider>
      </View>
    </View>
  )
}

describe('useSheetContentPickers + SheetContentPortal', () => {
  it('renders portal content beside the sheet element, not inside it', () => {
    const view = render(
      <FormSheet>
        <Text>form root</Text>
        <SheetContentPortal>
          <Text testID="picker">picker content</Text>
        </SheetContentPortal>
      </FormSheet>,
    )

    // The content exists exactly once...
    expect(screen.getAllByText('picker content')).toHaveLength(1)
    // ...inside the outer View but outside the sheet-content View.
    const sheet = view.getByTestId('sheet-content')
    expect(screen.getByTestId('picker').parent).not.toBe(sheet)
    const outer = view.toJSON() as { children: Array<{ props?: { testID?: string } }> }
    expect(outer.children.map((child) => child.props?.testID)).toEqual(['picker', 'sheet-content'])
  })

  it('updates content in place without unmounting it', () => {
    const unmounts = jest.fn()
    function Picker({ label }: { label: string }) {
      useEffect(() => {
        return () => {
          unmounts()
        }
      }, [])
      return <Text testID="picker">{label}</Text>
    }
    function Form() {
      const [label, setLabel] = useState('initial')
      return (
        <FormSheet>
          <Text testID="bump" onPress={() => setLabel(label === 'initial' ? 'label-a' : 'label-b')}>
            bump
          </Text>
          <SheetContentPortal>
            <Picker label={label} />
          </SheetContentPortal>
        </FormSheet>
      )
    }

    render(<Form />)
    expect(screen.getByText('initial')).toBeTruthy()

    act(() => {
      screen.getByTestId('bump').props.onPress()
    })
    expect(screen.getByText('label-a')).toBeTruthy()

    act(() => {
      screen.getByTestId('bump').props.onPress()
    })
    expect(screen.getByText('label-b')).toBeTruthy()
    // Props updated twice, zero remounts of the portal content.
    expect(unmounts).not.toHaveBeenCalled()
  })

  it('unmounts content when the declaring site unmounts', () => {
    function Form({ withPicker }: { withPicker: boolean }) {
      return (
        <FormSheet>
          <Text>root</Text>
          {withPicker ? (
            <SheetContentPortal>
              <Text>ephemeral picker</Text>
            </SheetContentPortal>
          ) : null}
        </FormSheet>
      )
    }

    const view = render(<Form withPicker />)
    expect(screen.getByText('ephemeral picker')).toBeTruthy()

    view.rerender(<Form withPicker={false} />)
    expect(screen.queryByText('ephemeral picker')).toBeNull()
  })

  it('renders content in place when no scope is in scope', () => {
    render(
      <View>
        <Text>root</Text>
        <SheetContentPortal>
          <Text testID="picker">in place</Text>
        </SheetContentPortal>
      </View>,
    )

    expect(screen.getByTestId('picker').props.children).toBe('in place')
  })
})
