import { parseLocalDate, localDateKey } from './stats';
export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'short' },
) {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat('zh-CN', options).format(date) : value;
}
export function durationLabel(minutes: number) {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} 小时${minutes % 60 ? ` ${minutes % 60} 分钟` : ''}`
    : `${minutes} 分钟`;
}
export function greeting() {
  const hour = new Date().getHours();
  return hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
}
export function today() {
  return localDateKey();
}
export const MOOD_LABELS = {
  great: '充满能量',
  good: '状态不错',
  okay: '平稳发挥',
  tired: '有些疲惫',
};
