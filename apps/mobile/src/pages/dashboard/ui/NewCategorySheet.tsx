import { useState } from 'react'
import { View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { BottomSheet, Button, Input, Text } from '@/shared/ui'
import type { MockCashflowType } from '../model/mock-data'

export interface NewCategorySheetProps {
  visible: boolean
  onSubmit: (name: string, type: MockCashflowType) => void
  onClose: () => void
}

/**
 * Minimal create-category form (mock): name + type. Icon and color get
 * neutral defaults - the real form lands with the API integration.
 */
export function NewCategorySheet(props: NewCategorySheetProps) {
  const { visible, onSubmit, onClose } = props
  const [name, setName] = useState('')
  const [type, setType] = useState<MockCashflowType>('expense')

  const close = () => {
    setName('')
    setType('expense')
    onClose()
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed, type)
    setName('')
    setType('expense')
  }

  return (
    <BottomSheet visible={visible} onClose={close} testID="home-new-category-sheet">
      <BottomSheetView testID="home-new-category-sheet">
        <View className="gap-4 px-4 pb-8 pt-2">
          <Text variant="h3" className="mb-2">
            Новая категория
          </Text>
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
        </View>
      </BottomSheetView>
    </BottomSheet>
  )
}
