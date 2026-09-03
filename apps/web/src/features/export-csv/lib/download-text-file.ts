// Client-side file download (the app's only one): a UTF-8 text Blob with a
// BOM so RU-locale Excel detects the encoding, saved through an anchor click.

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoking synchronously can cancel an in-flight download (observed in
  // Firefox); give the browser a grace period to materialize the file.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
