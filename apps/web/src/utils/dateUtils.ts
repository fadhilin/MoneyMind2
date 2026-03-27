import type { ReportPeriod } from '../hooks/useGlobalReportPeriod';

export const getReportLabel = (dateStr: string, period: ReportPeriod) => {
  const dateObj = new Date(dateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();
  const monthStr = dateStr.slice(0, 7);

  if (period === "daily") {
    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (period === "weekly") {
    const dCopy = new Date(year, month, day);
    const startOfYear = new Date(year, 0, 1);
    const diffTime = dCopy.getTime() - startOfYear.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(diffDays / 7);

    const wStart = new Date(year, 0, 1 + weekIndex * 7);
    const wEnd = new Date(year, 0, 1 + weekIndex * 7 + 6);

    const startMonthStr = wStart.toLocaleDateString("id-ID", { month: "short" });
    const endMonthStr = wEnd.toLocaleDateString("id-ID", { month: "short" });
    const sYearStr = wStart.getFullYear();
    const eYearStr = wEnd.getFullYear();

    if (wStart.getMonth() === wEnd.getMonth() && sYearStr === eYearStr) {
      return `${wStart.getDate()} - ${wEnd.getDate()} ${startMonthStr} ${eYearStr}`;
    } else if (sYearStr === eYearStr) {
      return `${wStart.getDate()} ${startMonthStr} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr}`;
    } else {
      return `${wStart.getDate()} ${startMonthStr} ${sYearStr.toString().slice(2)} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr.toString().slice(2)}`;
    }
  } else {
    // monthly
    return new Date(`${monthStr}-01`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
};
