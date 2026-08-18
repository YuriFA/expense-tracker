import React, { useImperativeHandle, useMemo, useRef } from 'react'

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet'

export type BottomSheetRef = {
  present: () => void
  dismiss: () => void
  snapToIndex: (index: number) => void
  expand: () => void
  collapse: () => void
}

export type BottomSheetProps = Omit<
  BottomSheetModalProps,
  'backdropComponent' | 'handleIndicatorStyle' | 'backgroundStyle'
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
   * Overrides the sheet surface style (e.g. a larger top radius). Leave
   * undefined to keep @gorhom's default surface.
   */
  backgroundStyle?: BottomSheetModalProps['backgroundStyle']
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
  backgroundStyle,
  children,
  ref,
  ...props
}: BottomSheetProps) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null)

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
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={memoizedSnapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      accessible={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={backgroundStyle}
      {...props}
    >
      {children}
    </BottomSheetModal>
  )
}

BottomSheet.displayName = 'BottomSheet'
