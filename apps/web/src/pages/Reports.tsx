import React, { useState, useMemo } from "react";
import {
  useMonthlySummary,
  useBudgetDistribution,
  useTransactionBreakdown,
} from "../hooks/useReports";
import { useGlobalDate } from "../hooks/useGlobalDate";
import { useBudgets } from "../hooks/useBudgets";
import ReportSection from "../components/ReportSection";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

type ReportPeriod = "daily" | "weekly" | "monthly";

const Reports: React.FC = () => {
  const [globalDate] = useGlobalDate();

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("monthly");
  const [reportDate, setReportDate] = useState<string>(globalDate);

  // Helper to format date string to YYYY-MM-DD
  const formatDate = (date: Date) => {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().split("T")[0];
  };

  const periodParams = useMemo(() => {
    const dateObj = new Date(reportDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    const monthStr = reportDate.slice(0, 7);

    // Default: Monthly
    let startDate = `${monthStr}-01`;
    let endDate = formatDate(new Date(year, month + 1, 0));
    let label = new Date(`${monthStr}-01`).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    if (reportPeriod === "daily") {
      startDate = reportDate;
      endDate = reportDate;
      label = new Date(reportDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } else if (reportPeriod === "weekly") {
      // 7-day rolling window based on days since start of year
      const dCopy = new Date(year, month, day);
      const startOfYear = new Date(year, 0, 1);

      // Calculate days difference (ignore sub-day precision)
      const diffTime = dCopy.getTime() - startOfYear.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Zero-indexed week
      const weekIndex = Math.floor(diffDays / 7);

      const wStart = new Date(year, 0, 1 + weekIndex * 7);
      const wEnd = new Date(year, 0, 1 + weekIndex * 7 + 6);

      startDate = formatDate(wStart);
      endDate = formatDate(wEnd);

      const startMonthStr = wStart.toLocaleDateString("id-ID", {
        month: "short",
      });
      const endMonthStr = wEnd.toLocaleDateString("id-ID", { month: "short" });
      const sYearStr = wStart.getFullYear();
      const eYearStr = wEnd.getFullYear();

      if (wStart.getMonth() === wEnd.getMonth() && sYearStr === eYearStr) {
        label = `${wStart.getDate()} - ${wEnd.getDate()} ${startMonthStr} ${eYearStr}`;
      } else if (sYearStr === eYearStr) {
        label = `${wStart.getDate()} ${startMonthStr} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr}`;
      } else {
        label = `${wStart.getDate()} ${startMonthStr} ${sYearStr.toString().slice(2)} - ${wEnd.getDate()} ${endMonthStr} ${eYearStr.toString().slice(2)}`;
      }
    }

    return { month: monthStr, startDate, endDate, label };
  }, [reportDate, reportPeriod]);

  // Sync date with globalDate when it changes
  React.useEffect(() => {
    setReportDate(globalDate);
  }, [globalDate]);

  const { data: summary } = useMonthlySummary({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate,
  });

  const { data: budgetDist = [] } = useBudgetDistribution({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate,
  });

  const { data: breakdown = [] } = useTransactionBreakdown({
    month: periodParams.month,
    startDate: periodParams.startDate,
    endDate: periodParams.endDate,
  });

  const { data: budgets = [] } = useBudgets(periodParams.month, reportDate);

  const totalIncome = summary?.realIncome ?? 0;
  const totalExpense = summary?.adjustedExpense ?? 0;
  const totalBalance = summary?.totalBalance ?? 0;
  const efficiency =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

  const exportToExcel = async () => {
    const todayDate = new Date().toISOString().split("T")[0];
    
    // 1. Prepare data for Excel sheets
    
    // Sheet 1: Summary
    const summaryData = [
      ["RINGKASAN LAPORAN KEUANGAN"],
      ["Periode", periodParams.label],
      ["Tanggal Unduh", new Date().toLocaleDateString("id-ID")],
      [],
      ["METRIK UTAMA"],
      ["Total Pemasukan", totalIncome],
      ["Total Pengeluaran", totalExpense],
      ["Selisih (Net)", totalBalance],
      ["Efisiensi Pengeluaran", efficiency + "%"],
      ["Sisa Saldo Dompet", summary?.globalBalance || 0],
      [],
    ];

    // Sheet 2: Budgets
    const budgetHeaders = [["DISTRIBUSI ANGGARAN"], ["Kategori", "Limit", "Terpakai", "Sisa", "Persentase"]];
    const budgetRows = budgetDist.length > 0 ? budgetDist.map((b: any) => [
      b.category,
      b.limit,
      b.spent,
      b.limit - b.spent,
      b.percent.toFixed(1) + "%"
    ]) : [["Tidak ada data anggaran"]];

    // Sheet 3: Transactions Breakdown
    const breakdownHeaders = [["BREAKDOWN TRANSAKSI"], ["Kategori", "Tipe", "Total (Rp)", "Frekuensi"]];
    const breakdownRows = breakdown.length > 0 ? breakdown.map((item: any) => [
      item.category,
      item.type === "income" ? "Pemasukan" : "Pengeluaran",
      item.total,
      item.count + "x"
    ]) : [["Tidak ada detail transaksi"]];

    // 2. Create Workbook and Sheets
    const wb = XLSX.utils.book_new();
    
    // Combine all into one main sheet for simplicity or use multiple
    const mainSheetData = [
      ...summaryData,
      ...budgetHeaders,
      ...budgetRows,
      [],
      ...breakdownHeaders,
      ...breakdownRows
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Keuangan");

    const fileName = `Laporan_Keuangan_${todayDate}.xlsx`;

    // 3. Handle Download based on Platform
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache, // Use Cache for temporary sharing
        });

        await Share.share({
          title: 'Unduh Laporan Keuangan',
          text: 'Berikut adalah laporan keuangan Anda.',
          url: savedFile.uri,
          dialogTitle: 'Simpan atau Bagikan Laporan',
        });
      } catch (error) {
        console.error("Error exporting to Excel on mobile:", error);
        alert("Gagal mengunduh laporan ke perangkat.");
      }
    } else {
      // Browser Download
      XLSX.writeFile(wb, fileName);
    }
  };

  const handlePrev = () => {
    const d = new Date(reportDate);
    if (reportPeriod === "daily") d.setDate(d.getDate() - 1);
    else if (reportPeriod === "weekly") d.setDate(d.getDate() - 7);
    else if (reportPeriod === "monthly") d.setMonth(d.getMonth() - 1);

    const newDateStr = formatDate(d);
    setReportDate(newDateStr);
  };

  const handleNext = () => {
    const d = new Date(reportDate);
    if (reportPeriod === "daily") d.setDate(d.getDate() + 1);
    else if (reportPeriod === "weekly") d.setDate(d.getDate() + 7);
    else if (reportPeriod === "monthly") d.setMonth(d.getMonth() + 1);

    const newDateStr = formatDate(d);
    setReportDate(newDateStr);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-6 md:mb-10 flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-start gap-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
              Laporan
            </h2>
            <div className="flex items-center group bg-slate-100 dark:bg-white/5 rounded-full px-2 py-1 w-full sm:w-auto justify-between sm:justify-center">
              <button
                onClick={handlePrev}
                className="flex items-center justify-center size-8 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors shrink-0 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">
                  chevron_left
                </span>
              </button>
              <div className="flex items-center justify-center px-4 min-w-30 text-center text-primary font-bold text-[13px] md:text-sm leading-none">
                {periodParams.label}
              </div>
              <button
                onClick={handleNext}
                className="flex items-center justify-center size-8 hover:bg-white dark:hover:bg-white/10 rounded-full transition-colors shrink-0 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            {/* Period Tabs */}
            <div className="flex p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl w-full sm:w-auto">
              {(["daily", "weekly", "monthly"] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 text-[11px] md:text-xs font-bold rounded-lg transition-all ${reportPeriod === p ? "bg-white dark:bg-slate-800 shadow-sm text-primary" : "text-slate-500 hover:text-black dark:hover:text-white"}`}
                >
                  {p === "daily"
                    ? "Harian"
                    : p === "weekly"
                      ? "7 Hari"
                      : "30 Hari"}
                </button>
              ))}
            </div>

            <button
              onClick={exportToExcel}
              className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              Unduh Spreadsheet
            </button>
          </div>
        </div>
      </header>

      {/* Charts Section */}
      <ReportSection
        summary={summary}
        budgetDist={budgetDist}
        breakdown={breakdown}
        periodLabel={periodParams.label}
        budgets={budgets}
        reportPeriod={reportPeriod}
      />

      {/* Transaction breakdown */}
      {breakdown.length > 0 && (
        <div className="mt-8 glass-card p-6 md:p-8 rounded-3xl md:rounded-4xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-lg md:text-xl font-bold mb-6 text-black dark:text-white">
            Breakdown Transaksi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {breakdown.map(
              (
                item: {
                  category: string;
                  type: string;
                  total: number;
                  count: number;
                },
                i: number,
              ) => (
                <div
                  key={i}
                  className="p-3 md:p-4 rounded-2xl bg-slate-50 dark:bg-white/5 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-xs md:text-sm text-black dark:text-white truncate max-w-30">
                      {item.category}
                    </p>
                    <p
                      className={`text-[10px] md:text-xs font-semibold mt-1 ${item.type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs md:text-sm text-black dark:text-white">
                      Rp {item.total.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.count}x</p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
