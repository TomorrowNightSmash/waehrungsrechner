export const currencies = ['AUD','BRL','CAD','CHF','CNY','CZK','DKK','EUR','GBP','HKD','HUF','IDR','ILS','INR','ISK','JPY','KRW','MXN','MYR','NOK','NZD','PHP','PLN','RON','SEK','SGD','THB','TRY','USD','ZAR'];
export const periods = [7, 30, 90];
const endpoint = 'https://api.frankfurter.dev/v2/rates';
export function validPair(from, to, period) {
  return currencies.includes(from) && currencies.includes(to) && periods.includes(period);
}
export function convert(amount, rate) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate <= 0) throw new Error('Ungültiger Betrag oder Kurs.');
  const result = amount * rate;
  if (!Number.isFinite(result)) throw new Error('Betrag zu groß.');
  return result;
}
export function startDate(days, now = new Date()) {
  const d = new Date(now); d.setUTCDate(d.getUTCDate() - days + 1); return d.toISOString().slice(0, 10);
}
function rowsFor(rows, base, quote) {
  if (!Array.isArray(rows)) throw new Error('Unerwartetes API-Format.');
  return rows.filter(r => r.base === base && r.quote === quote && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && Number.isFinite(r.rate) && r.rate > 0).sort((a,b) => a.date.localeCompare(b.date));
}
async function fetchRows(params, signal) {
  const url = new URL(endpoint); url.search = new URLSearchParams({providers:'ecb', ...params});
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`API-Fehler (${response.status})`);
  return response.json();
}
export async function getFxRates(from, to, period, signal) {
  if (!validPair(from,to,period)) throw new Error('Ungültiges Währungspaar oder Zeitraum.');
  if (from === to) return {base:from, quote:to, rate:1, date:null, rates:{[from]:1}, history:[], sample:false};
  const [latest, historical] = await Promise.all([
    fetchRows({base:from,quotes:to},signal),
    fetchRows({base:from,quotes:to,from:startDate(period)},signal)
  ]);
  const row = rowsFor(latest,from,to).at(-1);
  if (!row) throw new Error('Kein aktueller Referenzkurs verfügbar.');
  const history = rowsFor(historical,from,to).map(r => ({date:r.date,rate:r.rate}));
  return {base:from,quote:to,rate:row.rate,date:row.date,rates:{[from]:1,[to]:row.rate},history,sample:false};
}
// Fiktive Kurse, ausschließlich für die ausdrücklich gewählte Demo.
const example = {EUR:1, USD:1.1, GBP:.85, CHF:.95, TRY:35, JPY:160, CAD:1.45, AUD:1.62, CNY:7.9, BRL:5.6, CZK:25, DKK:7.45, HKD:8.6, HUF:395, IDR:17000, ILS:4, INR:90, ISK:150, KRW:1450, MXN:19, MYR:4.8, NOK:11.5, NZD:1.75, PHP:63, PLN:4.3, RON:5, SEK:11.2, SGD:1.48, THB:38, ZAR:20};
export function sampleRates(from,to,period) {
  if (!validPair(from,to,period)) throw new Error('Ungültiges Währungspaar oder Zeitraum.');
  const rate=example[to]/example[from], history=[];
  for(let i=0;i<period;i++) {
    const date=new Date(Date.UTC(2025,0,31-period+1+i)).toISOString().slice(0,10);
    const variation=from===to ? 1 : 1+.012*Math.sin(i*.55)*(1-i/period);
    history.push({date,rate:rate*variation});
  }
  history.at(-1).rate=rate;
  return {base:from,quote:to,rate,date:history.at(-1).date,rates:{[from]:1,[to]:rate},history,sample:true};
}
