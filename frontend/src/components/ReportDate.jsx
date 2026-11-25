import { utcDate } from '../utils/utcDate.js'

const format = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium', hourCycle: 'h23',
})

export default function ReportDate({ value }) {
  const iso = utcDate(value)
  return iso ? <time dateTime={iso}>{format.format(new Date(iso))} UTC</time> : '—'
}
