import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

export function convertToChinaTime(dateString: string): string {
  return dayjs(dateString).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
}
