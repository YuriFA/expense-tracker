// The import template (web-data-transfer): fixed Russian headers parsed by
// name, decimal comma, DD.MM.YYYY dates. An exported file re-imports as-is.

export const IMPORT_TEMPLATE_CSV = [
  'дата;тип;категория;сумма;примечание;счёт',
  '03.09.2026;расход;Продукты;1234,56;покупки;Наличка',
  '03.09.2026;доход;Зарплата;70000;;Без счета',
].join('\r\n')
