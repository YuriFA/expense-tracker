import React, { ComponentProps, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { withUniwind } from 'uniwind'
import { cn } from '@/shared/lib/utils'

const StyledBottomSheetModal = withUniwind<typeof BottomSheetModal<never>>(BottomSheetModal)

export type BottomSheetRef = {
  present: () => void
  dismiss: () => void
  snapToIndex: (index: number) => void
  expand: () => void
  collapse: () => void
}

export type BottomSheetProps = Omit<
  ComponentProps<typeof StyledBottomSheetModal>,
  'ref' | 'backdropComponent' | 'handleIndicatorStyle'
> & {
  ref?: React.Ref<BottomSheetRef>
  testID?: string
  /**
   * Snap points for the sheet.
   *
   * @default ['50%']
   */
  snapPoints?: Array<string | number>

  /**
   * Whether dragging the sheet down dismisses it.
   *
   * @default true
   */
  enablePanDownToClose?: boolean

  /**
   * Whether tapping the backdrop dismisses the sheet.
   *
   * @default true
   */
  enableBackdropPress?: boolean

  /**
   * Whether the sheet should dynamically adjust its height based on its content.
   *
   * @default false
   */
  enableDynamicSizing?: boolean

  /**
   * Present the sheet when it mounts (and whenever this flips to true). This
   * is the single place the imperative `present()` effect lives: a sheet
   * mounted conditionally with its subject must present itself, because a
   * parent-side present() would race the conditional mount and be lost
   * (forms.md §3). Call sites must not hand-roll this effect.
   *
   * @default false
   */
  presentOnMount?: boolean
}

// @gorhom v5 defaults the sheet content wrapper to `accessible` +
// role 'adjustable' + label 'Bottom Sheet'. On iOS that single accessible
// container swallows every non-accessible descendant — plain Text and
// TextInput vanish from the accessibility tree (Maestro ids, VoiceOver),
// while elements with their own accessibility role (buttons/chips) survive.
// Opting out exposes the real content; the sheet loses only the
// VoiceOver "adjustable" snap-point semantic, which no sheet here relies on.
export const BottomSheet = ({
  snapPoints = ['50%'],
  enablePanDownToClose = true,
  enableDynamicSizing = false,
  enableBackdropPress = true,
  presentOnMount = false,
  ref,
  children,
  className,
  handleClassName,
  ...props
}: BottomSheetProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)

  useEffect(() => {
    if (presentOnMount) bottomSheetRef.current?.present()
  }, [presentOnMount])

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        bottomSheetRef.current?.present()
      },

      dismiss: () => {
        bottomSheetRef.current?.dismiss()
      },

      snapToIndex: (index) => {
        bottomSheetRef.current?.snapToIndex(index)
      },

      expand: () => {
        bottomSheetRef.current?.expand()
      },

      collapse: () => {
        bottomSheetRef.current?.collapse()
      },
    }),
    [],
  )

  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints])

  const renderBackdrop = (backdropProps: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...backdropProps}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior={enableBackdropPress ? 'close' : 'none'}
    />
  )

  return (
    <StyledBottomSheetModal
      ref={bottomSheetRef}
      snapPoints={memoizedSnapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      accessible={false}
      backdropComponent={renderBackdrop}
      className={cn('rounded-4xl overflow-hidden', className)}
      handleClassName={cn('py-2', handleClassName)}
      {...props}
    >
      {children}
    </StyledBottomSheetModal>
  )
}

BottomSheet.displayName = 'BottomSheet'
