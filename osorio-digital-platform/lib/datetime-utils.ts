/**
 * Helpers para <input type="datetime-local">.
 *
 * O input não envia timezone; trata o valor como hora local do navegador.
 * Postgres TIMESTAMPTZ guarda em UTC. Se gravar o valor cru do input,
 * o backend interpreta como UTC (sessão default) e o render volta com offset.
 *
 * - `isoToLocalDatetime`: ISO UTC do banco → "YYYY-MM-DDTHH:mm" no fuso do browser.
 * - `localDatetimeToISO`: "YYYY-MM-DDTHH:mm" do input → ISO UTC pra gravar.
 */

export function isoToLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

export function localDatetimeToISO(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
