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
}

export const BottomSheet = ({
  snapPoints = ['50%'],
  enablePanDownToClose = true,
  enableDynamicSizing = false,
  enableBackdropPress = true,
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
      backdropComponent={renderBackdrop}
      {...props}
    >
      {children}
    </BottomSheetModal>
  )
}

BottomSheet.displayName = 'BottomSheet'
