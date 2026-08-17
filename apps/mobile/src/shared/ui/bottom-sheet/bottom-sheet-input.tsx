import { BottomSheetTextInput as GorhomBottomSheetTextInput } from '@gorhom/bottom-sheet'
import { withUniwind } from 'uniwind'
import { Input, type InputProps } from '@/shared/ui/input'

// Module-level wrap (never inside render): @gorhom's BottomSheetTextInput is a
// third-party component, so it needs withUniwind to accept className props.
const SheetTextInput = withUniwind(GorhomBottomSheetTextInput)

/**
 * `Input` for fields rendered inside a bottom sheet.
 *
 * @gorhom/bottom-sheet ignores keyboard-show events until the focused input
 * registers with the sheet's keyboard state, and only BottomSheetTextInput
 * does that registration — plain RN TextInputs leave `keyboardBehavior`
 * inert, so the sheet never adjusts for the software keyboard. See
 * https://gorhom.dev/react-native-bottom-sheet/keyboard-handling.
 */
export function BottomSheetInput(props: InputProps) {
  return <Input {...props} textInputComponent={SheetTextInput} />
}
