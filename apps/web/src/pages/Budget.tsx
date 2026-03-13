import React, { useState, useRef, useEffect } from "react";
import type { Budget as BudgetType } from "../types/finance";
import {
  useBudgets,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
  useDepositBudget,
  useWithdrawBudget,
} from "../hooks/useBudgets";
import { useMonthlySummary } from "../hooks/useReports";
import { useDeleteTransactionsByDate } from "../hooks/useTransactions";
import { useGlobalDate } from "../hooks/useGlobalDate";

const Budget: React.FC = () => {
  const [globalDate] = useGlobalDate();
  const selectedMonth = globalDate.slice(0, 7);

  const { data: budgets = [], isLoading } = useBudgets(selectedMonth);
  const { data: monthSummary } = useMonthlySummary({ month: selectedMonth });
  const { data: dailySummary } = useMonthlySummary({
    month: selectedMonth,
    date: globalDate,
  });

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const depositBudget = useDepositBudget();
  const withdrawBudget = useWithdrawBudget();
  const deleteByDate = useDeleteTransactionsByDate();

  const [isEditing, setIsEditing] = useState(false);
  const [draftUpdates, setDraftUpdates] = useState<
    Record<string, { category?: string; limitAmount?: number }>
  >({});
  const [draftDeletes, setDraftDeletes] = useState<Set<string>>(new Set());

  const [newCatName, setNewCatName] = useState("");
  const [newCatLimit, setNewCatLimit] = useState("");

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [selectedBudget, setSelectedBudget] = useState<BudgetType | null>(null);
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(globalDate);
  const [newCatIcon, setNewCatIcon] = useState("category");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 1. Buat "penanda" untuk area dropdown kita
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Pasang telinga (listener) untuk mendeteksi klik di seluruh halaman
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Jika dropdown sedang terbuka, DAN yang diklik BUKAN bagian dari dropdown kita...
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false); // ...maka tutup dropdown-nya!
      }
    };

    // Aktifkan sensor klik
    document.addEventListener("mousedown", handleClickOutside);

    // Bersihkan sensor saat komponen tidak digunakan (best practice)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const listIcons = [
    { id: "shopping_cart", label: "Belanja" },
    { id: "flight", label: "Liburan" },
    { id: "build", label: "Service Kendaraan" },
    { id: "phonelink_setup", label: "Service HP" },
    { id: "payments", label: "Cicilan / Hutang" },
    { id: "home", label: "Kebutuhan Rumah" },
    { id: "self_improvement", label: "Self Reward" },
    { id: "wifi", label: "Paket Data" },
    { id: "health_and_safety", label: "Kesehatan" },
    { id: "school", label: "Pendidikan" },
    { id: "redeem", label: "Hadiah" },
  ];

  const realIncome = dailySummary?.realIncome ?? 0; // Pure daily realIncome
  const adjustedExpense = dailySummary?.adjustedExpense ?? 0; // Pure daily expenses
  const safetySpend = dailySummary?.safetySpend ?? 0;

  const monthlyIncome = monthSummary?.realIncome ?? 0;
  const remainingBudget = dailySummary?.globalBalance ?? 0; // Sync with wallet/global balance

  const handleAddCategory = () => {
    if (!newCatName || !newCatLimit) return alert("Lengkapi data");
    createBudget.mutate({
      category: newCatName,
      limitAmount: parseInt(newCatLimit),
      icon: newCatIcon,
      color: "blue-500",
      description: "Kategori kustom",
      date: globalDate,
    });
    setNewCatName("");
    setNewCatLimit("");
    setNewCatIcon("category");
  };

  const handleOpenTx = (b: BudgetType, type: "deposit" | "withdraw") => {
    setSelectedBudget(b);
    setTxType(type);
    setTxAmount("");
    setTxDate(globalDate);
    setIsTxModalOpen(true);
  };

  const handleTxSubmit = () => {
    if (!selectedBudget || !txAmount) return;
    const amount = parseInt(txAmount);
    if (txType === "deposit") {
      if (amount > remainingBudget) {
        return alert(
          `Oops! Saldo Anda tidak cukup. Sisa saldo: Rp ${remainingBudget.toLocaleString("id-ID")}`,
        );
      }
      depositBudget.mutate({ id: selectedBudget.id, amount, date: txDate });
    } else {
      withdrawBudget.mutate(
        { id: selectedBudget.id, amount, date: txDate },
        {
          onError: (err: Error) => alert(err.message || "Gagal refund budget"),
        },
      );
    }
    setIsTxModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in zoom-in-95 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">
            Budget Harian
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {new Date(globalDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex w-full sm:w-auto gap-4 bg-slate-50 dark:bg-white/5 py-2 px-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm justify-between sm:justify-end">
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Total Saldo
              </p>
              <p className="text-xs md:text-sm font-black text-black dark:text-white">
                Rp {monthlyIncome.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="w-px bg-slate-200 dark:bg-white/10 self-stretch my-1"></div>
            <div className="text-right">
              <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                Sisa Saldo
              </p>
              <p
                className={`text-xs md:text-sm font-black ${remainingBudget < 0 ? "text-rose-500" : "text-black dark:text-white"}`}
              >
                Rp {remainingBudget.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setDraftUpdates({});
                  setDraftDeletes(new Set());
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-500 font-semibold text-xs md:text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all"
                title="Batal Edit"
              >
                <span className="material-symbols-outlined text-base md:text-lg">
                  close
                </span>
                <span className="sm:inline">Batal</span>
              </button>
            )}
            <button
              onClick={() => {
                if (isEditing) {
                  // Save all drafts
                  Object.entries(draftUpdates).forEach(([id, input]) => {
                    updateBudget.mutate({ id, input });
                  });
                  draftDeletes.forEach((id) => {
                    deleteBudget.mutate({ id, month: selectedMonth });
                  });
                  setDraftUpdates({});
                  setDraftDeletes(new Set());
                }
                setIsEditing(!isEditing);
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-semibold text-xs md:text-sm active:scale-95 transition-all shrink-0 ${isEditing ? "bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20" : "border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-black dark:text-white"}`}
            >
              <span className="material-symbols-outlined text-base md:text-lg">
                {isEditing ? "check" : "edit"}
              </span>
              {isEditing ? "Selesai" : "Edit Budget"}
            </button>
          </div>
        </div>
      </header>

      <section className="mb-8 md:mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div
          className={`md:col-span-2 lg:col-span-3 glass rounded-3xl md:rounded-4xl p-6 md:p-8 grid grid-cols-2 items-center border-l-4 md:border-l-8 ${remainingBudget < 0 ? "border-l-rose-500 bg-rose-500/5" : "border-l-primary bg-primary/5"} shadow-xl md:shadow-2xl shadow-primary/5 relative group/header`}
        >
          <div className="flex flex-col items-center justify-start text-center relative px-2 md:px-6 lg:px-10 h-full">
            <div className="h-4 flex items-center justify-center mb-4 md:mb-6 relative w-full">
              <p className="text-[10px] md:text-[12px] font-bold text-primary dark:text-primary uppercase tracking-widest leading-none whitespace-nowrap">
                Masuk
              </p>
              {realIncome > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Hapus seluruh data keuangan hari ini?"))
                      deleteByDate.mutate(globalDate);
                  }}
                  className="absolute right-0 opacity-0 group-hover/header:opacity-100 p-1 hover:bg-rose-500/10 text-rose-500 rounded-md transition-all"
                  title="Hapus Pemasukan"
                >
                  <span className="material-symbols-outlined text-xs md:text-sm">
                    delete
                  </span>
                </button>
              )}
            </div>
            <div className="h-12 md:h-16 flex items-center justify-center -mt-2">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-primary leading-none tracking-tight flex items-center gap-1 md:gap-2">
                <span className="text-sm md:text-xl lg:text-3xl text-primary font-bold">
                  Rp
                </span>
                {realIncome.toLocaleString("id-ID")}
              </h3>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-16 md:h-28 w-px bg-slate-200 dark:bg-white/10"></div>
          </div>

          <div className="flex flex-col items-center justify-start text-center relative px-2 md:px-6 lg:px-10 h-full">
            <div className="h-4 flex items-center justify-center mb-4 md:mb-6">
              <p className="text-[10px] md:text-[12px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest leading-none">
                Keluar
              </p>
            </div>
            <div className="h-12 md:h-16 flex items-center justify-center -mt-2">
              <p className="text-xl md:text-2xl lg:text-3xl font-black text-rose-500 leading-none flex items-center gap-1 md:gap-2">
                <span className="text-sm md:text-xl lg:text-3xl font-bold">
                  Rp
                </span>
                {adjustedExpense.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl md:rounded-4xl p-6 md:p-8 bg-linear-to-br from-primary/10 to-transparent border border-primary/20 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span className="material-symbols-outlined text-primary text-xs md:text-sm">
              shield
            </span>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
              Safety Spend
            </p>
          </div>
          <h3 className="text-lg md:text-xl lg:text-2xl font-black text-black dark:text-white flex items-baseline gap-1 md:gap-1.5">
            <span className="text-sm md:text-lg lg:text-xl font-bold text-black dark:text-white">
              Rp
            </span>
            {safetySpend.toLocaleString("id-ID")}
          </h3>

          <p className="text-[9px] text-slate-400 mt-2 italic shadow-inner">
            *Batas aman per hari
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {[...budgets]
            .sort((a, b) => {
              const isMakan = (c: string) =>
                c.toLowerCase() === "makan & minum" ||
                c.toLowerCase() === "makan dan minum";
              const isTransport = (c: string) =>
                c.toLowerCase() === "transportasi";

              if (isMakan(a.category) && isMakan(b.category)) return 0;
              if (isMakan(a.category)) return -1;
              if (isMakan(b.category)) return 1;

              if (isTransport(a.category) && isTransport(b.category)) return 0;
              if (isTransport(a.category)) return -1;
              if (isTransport(b.category)) return 1;

              return a.id.localeCompare(b.id);
            })
            .map((b: BudgetType) => {
              const percent =
                b.limit > 0
                  ? Math.min(100, Math.round((b.spent / b.limit) * 100))
                  : 0;
              return (
                <div
                  key={b.id}
                  className="glass-card p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col h-full gap-3 md:gap-4 border-t-4 bg-white dark:bg-black border-slate-200 dark:border-white/10 relative group shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-xl md:text-2xl">
                        {b.icon}
                      </span>
                    </div>
                    {isEditing ? (
                      !(
                        b.category.toLowerCase() === "makan & minum" ||
                        b.category.toLowerCase() === "makan dan minum" ||
                        b.category.toLowerCase() === "transportasi"
                      ) ? (
                        <button
                          onClick={() => {
                            const newDeletes = new Set(draftDeletes);
                            if (newDeletes.has(b.id)) newDeletes.delete(b.id);
                            else newDeletes.add(b.id);
                            setDraftDeletes(newDeletes);
                          }}
                          className={`p-1 rounded-full transition-colors ${draftDeletes.has(b.id) ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-500/10"}`}
                        >
                          <span className="material-symbols-outlined text-xs md:text-sm">
                            {draftDeletes.has(b.id) ? "undo" : "delete"}
                          </span>
                        </button>
                      ) : (
                        <div className="p-1 px-2 bg-slate-100 dark:bg-white/5 rounded text-[8px] font-bold text-slate-400">
                          STATIC
                        </div>
                      )
                    ) : (
                      <span className="text-[9px] md:text-[10px] font-black px-2 py-0.5 md:py-1 bg-primary/10 text-primary rounded-full">
                        {percent}%
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    {isEditing &&
                    !(
                      b.category.toLowerCase() === "makan & minum" ||
                      b.category.toLowerCase() === "makan dan minum" ||
                      b.category.toLowerCase() === "transportasi"
                    ) ? (
                      <input
                        type="text"
                        className="text-base md:text-lg font-bold w-full bg-primary/5 border border-primary/20 rounded px-1 text-primary focus:outline-none"
                        value={draftUpdates[b.id]?.category ?? b.category}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setDraftUpdates((prev) => ({
                            ...prev,
                            [b.id]: { ...prev[b.id], category: e.target.value },
                          }));
                        }}
                        onKeyDown={(
                          e: React.KeyboardEvent<HTMLInputElement>,
                        ) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        disabled={draftDeletes.has(b.id)}
                      />
                    ) : (
                      <h4 className="text-base md:text-lg font-bold text-black dark:text-white truncate">
                        {b.category}
                      </h4>
                    )}
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs line-clamp-1">
                      {b.description}
                    </p>
                  </div>
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-[10px] md:text-xs font-bold gap-2">
                      <span className="text-slate-400 leading-tight">
                        Terpakai: <br />
                        Rp {b.spent.toLocaleString("id-ID")}
                      </span>
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 md:w-24 bg-primary/5 border border-primary/20 rounded px-1 text-right text-primary focus:outline-none h-7 md:h-auto"
                          value={draftUpdates[b.id]?.limitAmount ?? b.limit}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const val = parseInt(e.target.value) || 0;
                            setDraftUpdates((prev) => ({
                              ...prev,
                              [b.id]: { ...prev[b.id], limitAmount: val },
                            }));
                          }}
                          onKeyDown={(
                            e: React.KeyboardEvent<HTMLInputElement>,
                          ) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          disabled={draftDeletes.has(b.id)}
                        />
                      ) : (
                        <span className="text-black dark:text-white text-right leading-tight">
                          Batas: <br />
                          Rp {b.limit.toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                    <div className="h-2 md:h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-primary rounded-full transition-all duration-700 ${percent > 90 ? "bg-rose-500" : ""}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    {!isEditing && (
                      <div className="flex gap-2 mt-2 md:mt-4">
                        <button
                          onClick={() => handleOpenTx(b, "deposit")}
                          className="flex-1 text-[9px] md:text-[10px] py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg font-bold hover:bg-emerald-500 hover:text-white active:scale-95 transition-colors"
                        >
                          Tambah
                        </button>
                        <button
                          onClick={() => handleOpenTx(b, "withdraw")}
                          className="flex-1 text-[9px] md:text-[10px] py-1.5 bg-rose-500/10 text-rose-500 rounded-lg font-bold hover:bg-rose-500 hover:text-white active:scale-95 transition-colors"
                        >
                          Ambil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          <div className="glass-card rounded-2xl md:rounded-3xl p-5 md:p-6 border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 md:gap-3 bg-transparent hover:bg-primary/5 hover:border-primary transition-all group h-full min-h-55 md:min-h-62.5">
            <h4 className="text-xs md:text-sm font-bold text-slate-500 mb-1">
              Kategori Baru
            </h4>
            <div ref={dropdownRef} className="relative w-full mx-auto mb-1">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-transparent border-b border-slate-300 dark:border-white/10 focus:border-primary outline-none text-xs md:text-sm font-bold dark:text-white"
              >
                <span className="material-symbols-outlined text-base md:text-lg">
                  {newCatIcon}
                </span>
                <span className="material-symbols-outlined text-xs">
                  arrow_drop_down
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-lg py-2 z-50 max-h-40 overflow-y-auto">
                  {listIcons.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setNewCatIcon(item.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 text-black dark:text-white transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.id}
                      </span>
                      <span className="capitalize font-medium text-xs">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              placeholder="Nama Kategori"
              className="mx-auto text-center bg-transparent border-b border-slate-300 dark:border-white/10 focus:border-primary outline-none text-xs md:text-sm w-full font-bold dark:text-white placeholder:text-center mt-1"
              value={newCatName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewCatName(e.target.value)
              }
            />

            <input
              type="number"
              placeholder="Limit (Rp)"
              className="mx-auto text-center bg-transparent border-b border-slate-300 dark:border-white/10 focus:border-primary outline-none text-xs md:text-sm w-full font-bold dark:text-white placeholder:text-center mt-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none m-0"
              value={newCatLimit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewCatLimit(e.target.value)
              }
            />
            <button
              onClick={handleAddCategory}
              className="mt-3 md:mt-4 px-5 md:px-6 py-2 bg-primary text-white font-bold rounded-full hover:brightness-110 active:scale-95 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 text-[11px] md:text-sm"
            >
              <span className="material-symbols-outlined text-xs md:text-sm">
                add
              </span>{" "}
              Simpan
            </button>
          </div>
        </section>
      )}

      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#151121] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-white/10">
            <h3 className="text-2xl font-bold mb-6 text-black dark:text-white">
              {txType === "deposit" ? "Tambah Pengeluaran" : "Ambil/Refund"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Kategori:{" "}
              <span className="font-bold text-primary">
                {selectedBudget?.category}
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase px-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  autoFocus
                  value={txAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTxAmount(e.target.value)
                  }
                  className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-black dark:text-white focus:border-primary outline-none text-xl font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase px-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTxDate(e.target.value)
                  }
                  className="w-full mt-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-black dark:text-white focus:border-primary outline-none text-sm font-bold cursor-pointer"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleTxSubmit}
                  className={`flex-1 py-3 ${txType === "deposit" ? "bg-emerald-500" : "bg-primary"} text-white font-bold rounded-xl shadow-lg transition-all hover:brightness-110 active:scale-95`}
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
