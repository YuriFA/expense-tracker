import { useState } from 'react'
import { View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
  BottomSheetRef,
} from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import type { MockCashflowType } from '../model/mock-data'

export interface NewCategorySheetProps {
  ref: React.Ref<BottomSheetRef>
  onSubmit: (name: string, type: MockCashflowType) => void
}

/**
 * Minimal create-category form (mock): name + type. Icon and color get
 * neutral defaults - the real form lands with the API integration.
 */
export function NewCategorySheet({ ref, onSubmit }: NewCategorySheetProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<MockCashflowType>('expense')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, type)
    setName('')
    setType('expense')
  }

  return (
    <BottomSheet ref={ref} testID="home-new-category-sheet">
      <BottomSheetView testID="home-new-category-sheet">
        <BottomSheetHeader title="Новая категория" />
        <BottomSheetBody className="gap-4">
          <Input
            label="Название"
            placeholder="Например, Транспорт"
            value={name}
            onChangeText={setName}
            testID="home-new-category-name"
          />

          <View className="flex-row gap-2">
            <Button
              variant={type === 'expense' ? 'primary' : 'outline'}
              text="Расход"
              className="flex-1"
              onPress={() => setType('expense')}
              testID="home-new-category-type-expense"
            />
            <Button
              variant={type === 'income' ? 'primary' : 'outline'}
              text="Доход"
              className="flex-1"
              onPress={() => setType('income')}
              testID="home-new-category-type-income"
            />
          </View>

          <Button
            variant="primary"
            text="Создать"
            disabled={!name.trim()}
            onPress={submit}
            testID="home-new-category-submit"
          />
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
