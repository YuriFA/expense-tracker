// Debts screen (openspec mobile-local-data "Debts screen data behavior"):
// dual-total summary («Мне должны» / «Я должен», no period navigation), two
// direction sections of debtor rows, settled debtors behind reveal rows, and
// the sheet flows - debtor history, new/edit operation, new/edit debtor. A
// stack destination without the tab bar, so the collapsible ScreenHeader
// carries the title and back affordance.
//
// Performance invariant (design D7): the whole overview derives from ONE
// `useDebtOperations()` read - every figure is an in-memory selector; the
// repository is never called per debtor. The page owns all sheet refs and
// passes callbacks down (invariant #15).

import { useRef, useState } from 'react'
import { View } from 'react-native'
import type { DebtDirection, DebtOperation, DebtOperationKind, Debtor } from '@expense-tracker/api'
import { useDebtOperations, useDebtors } from '@/entities/debt'
import { Screen } from '@/shared/ui/screen'
import { ScreenHeader, ScreenScrollView } from '@/shared/ui/screen-header'
import { ScreenPlaceholder } from '@/shared/ui/screen-placeholder'
import { Button } from '@/shared/ui/button'
import type { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { DEBTS_COPY } from '../model/kind'
import { debtorSection, totalsByDirection } from '../model/selectors'
import { DebtorFormSheet } from './debtor-form-sheet'
import { DebtorHistorySheet } from './debtor-history-sheet'
import { DebtorSection } from './debtor-section'
import { DebtsSummaryCard } from './debts-summary-card'
import { OperationSheet } from './operation-sheet'

export function DebtsScreen() {
  const debtorsQuery = useDebtors()
  const operationsQuery = useDebtOperations()
  const debtors = debtorsQuery.data ?? []
  const operations = operationsQuery.data ?? []

  // Sheet composition state (invariant #15): the page owns every ref and the
  // selection each sheet acts on.
  const historyRef = useRef<BottomSheetRef>(null)
  const [historyContext, setHistoryContext] = useState<
    { debtorId: string; direction: DebtDirection } | undefined
  >(undefined)
  const newDebtorRef = useRef<BottomSheetRef>(null)
  const editDebtorRef = useRef<BottomSheetRef>(null)
  const [editingDebtor, setEditingDebtor] = useState<Debtor | undefined>(undefined)
  const newOperationRef = useRef<BottomSheetRef>(null)
  const [newOperationFixed, setNewOperationFixed] = useState<
    { debtorId: string; direction: DebtDirection } | undefined
  >(undefined)
  const [newOperationKind, setNewOperationKind] = useState<DebtOperationKind>('debt')
  const editOperationRef = useRef<BottomSheetRef>(null)
  const [editingOperation, setEditingOperation] = useState<DebtOperation | undefined>(undefined)

  const totals = totalsByDirection(operations)
  const receivableSection = debtorSection(debtors, operations, 'receivable')
  const payableSection = debtorSection(debtors, operations, 'payable')

  const openHistory = (debtorId: string, direction: DebtDirection) => {
    setHistoryContext({ debtorId, direction })
    historyRef.current?.present()
  }
  const historyDebtor = historyContext
    ? debtors.find((debtor) => debtor.id === historyContext.debtorId)
    : undefined

  const openNewOperation = () => {
    // Screen CTA: both pickers active, kind defaults to «Долг» (design D7).
    setNewOperationFixed(undefined)
    setNewOperationKind('debt')
    newOperationRef.current?.present()
  }
  const openNewRepayment = (debtorId: string, direction: DebtDirection) => {
    // From a debtor's sheet: debtor and direction fixed, kind preset to
    // «Списание» - the footer CTA's whole purpose.
    setNewOperationFixed({ debtorId, direction })
    setNewOperationKind('repayment')
    newOperationRef.current?.present()
  }
  const openEditOperation = (operation: DebtOperation) => {
    setEditingOperation(operation)
    editOperationRef.current?.present()
  }
  const openNewDebtor = () => newDebtorRef.current?.present()
  const openEditDebtor = (debtor: Debtor) => {
    setEditingDebtor(debtor)
    editDebtorRef.current?.present()
  }

  return (
    <Screen testID="screen-debts" topInset={false}>
      <ScreenHeader title={DEBTS_COPY.screenTitle} />

      <ScreenScrollView>
        <View className="gap-6 px-6 pb-8">
          {debtors.length === 0 ? (
            <View className="items-center gap-4 pt-8" testID="debts-empty">
              <ScreenPlaceholder title={DEBTS_COPY.emptyTitle} hint={DEBTS_COPY.emptyHint} />
              <Button
                variant="primary"
                text={DEBTS_COPY.addDebtor}
                testID="debts-add-debtor"
                onPress={openNewDebtor}
              />
            </View>
          ) : (
            <>
              <DebtsSummaryCard totals={totals} />
              <DebtorSection
                direction="receivable"
                section={receivableSection}
                onDebtorPress={openHistory}
              />
              <DebtorSection
                direction="payable"
                section={payableSection}
                onDebtorPress={openHistory}
              />
              <View className="flex-row gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  text={DEBTS_COPY.newOperation}
                  testID="debts-new-operation"
                  onPress={openNewOperation}
                />
                <Button
                  variant="outline"
                  className="flex-1"
                  text={DEBTS_COPY.addDebtor}
                  testID="debts-add-debtor"
                  onPress={openNewDebtor}
                />
              </View>
            </>
          )}
        </View>
      </ScreenScrollView>

      <DebtorHistorySheet
        ref={historyRef}
        debtor={historyDebtor}
        direction={historyContext?.direction ?? 'receivable'}
        operations={operations}
        onEditOperation={openEditOperation}
        onEditDebtor={openEditDebtor}
        onNewRepayment={openNewRepayment}
      />
      <DebtorFormSheet ref={newDebtorRef} />
      {editingDebtor ? <DebtorFormSheet ref={editDebtorRef} debtor={editingDebtor} /> : null}
      <OperationSheet
        ref={newOperationRef}
        fixed={newOperationFixed}
        defaultKind={newOperationKind}
      />
      {editingOperation ? (
        <OperationSheet ref={editOperationRef} operation={editingOperation} />
      ) : null}
    </Screen>
  )
}
