import { useState, useEffect, useRef } from "react";
import { useCreateTransaction } from "../hooks/useTransactions";
import { useBudgets, useCreateBudget } from "../hooks/useBudgets";
import { useMonthlySummary } from "../hooks/useReports";
import { useGlobalDate } from "../hooks/useGlobalDate";
import { useQuickTemplates } from "../hooks/useQuickTemplates";
import type { QuickTemplate } from "../hooks/useQuickTemplates";
import { formatCurrencyInput } from "../utils/formatters";
import type { TransactionType } from "../types/finance";

interface QuickInputProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "numpad" | "template" | "voice";

export default function QuickInput({ isOpen, onClose }: QuickInputProps) {
  const [activeTab, setActiveTab] = useState<TabType>("numpad");

  // Global hooks
  const [globalDate] = useGlobalDate();
  const txMonth = globalDate.slice(0, 7);
  const { data: budgets = [] } = useBudgets(txMonth);
  const { data: summary } = useMonthlySummary({ month: txMonth });
  const createTransaction = useCreateTransaction();
  const { templates, addTemplate, removeTemplate } = useQuickTemplates();

  const totalIncome = summary?.totalIncome ?? 0;
  const globalBalance = summary?.globalBalance ?? 0;
  const safetySpend = summary?.safetySpend ?? 0;

  // Numpad state
  const type: TransactionType = "expense";
  const [amountStr, setAmountStr] = useState<string>("0");
  const [category, setCategory] = useState<string>("");
  const [step, setStep] = useState<"amount" | "category" | "name">("amount");
  const [expenseName, setExpenseName] = useState<string>("");

  // New Category State
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const createBudget = useCreateBudget();

  // Template entry state
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [tempName, setTempName] = useState("");

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceResult, setVoiceResult] = useState<string>("");
  const [parsedVoice, setParsedVoice] = useState<{ amount: number; category: string } | null>(null);
  const [isEditingVoiceCategory, setIsEditingVoiceCategory] = useState(false);
  const recognitionRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>("");

  const resetForm = () => {
    setActiveTab("numpad");
    setStep("amount");
    setAmountStr("0");
    setCategory("");
    setExpenseName("");
    setIsAddingTemplate(false);
    setIsAddingNewCategory(false);
    setNewCatName("");
    setTempName("");
    setVoiceResult("");
    setParsedVoice(null);
    setIsRecording(false);
    setIsEditingVoiceCategory(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const displayCategories = budgets.map((b) => ({
    name: b.category,
    icon: b.icon,
    color: b.color,
  }));

  const handleSaveTransaction = (
    txAmount: number,
    txType: TransactionType,
    txCategory: string,
    txIcon: string,
    txNote: string = ""
  ) => {
    if (txAmount <= 0) return alert("Nominal tidak valid");

    if (txType === "expense") {
      if (totalIncome === 0 && globalBalance <= 0) {
        return alert("Gagal! Saldo Anda kosong. Silahkan input pemasukan terlebih dahulu.");
      }
      if (txAmount > safetySpend) {
        if (!window.confirm("Melebihi safety spend. Tetap simpan?")) {
          return;
        }
      }
    }

    createTransaction.mutate(
      {
        amount: txAmount,
        type: txType,
        category: txCategory,
        icon: txIcon,
        date: globalDate,
        note: txNote || txCategory,
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          alert("Gagal menyimpan: " + err.message);
        },
      }
    );
  };

  // --- Numpad Logic ---
  const handleNumpadPress = (val: string) => {
    if (val === "DEL") {
      setAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
    } else if (val === "OK") {
      if (parseInt(amountStr) > 0) setStep("category");
    } else {
      setAmountStr((prev) => (prev === "0" ? val : prev + val));
    }
  };

  const numpadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "DEL"];

  // --- Template Logic ---
  const handleTemplateTap = (t: QuickTemplate) => {
    handleSaveTransaction(t.amount, t.type, t.category, t.icon, `Template: ${t.name}`);
  };

  const saveNewTemplate = async () => {
    if (!tempName || parseInt(amountStr) <= 0 || !category) {
      return alert("Mohon lengkapi nominal, kategori, dan nama template");
    }
    const catData = displayCategories.find((c) => c.name === category);
    await addTemplate({
      name: tempName,
      amount: parseInt(amountStr),
      category: category,
      icon: catData?.icon || "payments",
      type,
    });
    setIsAddingTemplate(false);
    resetForm();
    setActiveTab("template");
  };

  // --- Voice Logic ---
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung Web Speech API");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    // Reset memori cadangan setiap kali mulai merekam
    latestTranscriptRef.current = "";

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceResult("Mendengarkan...");
      setParsedVoice(null);
      setIsEditingVoiceCategory(false);
    };

    recognition.onaudiostart = () => setVoiceResult("Mulai merekam audio...");
    recognition.onsoundstart = () => setVoiceResult("Mendeteksi suara...");
    recognition.onspeechstart = () => setVoiceResult("Mendeteksi ucapan...");
    recognition.onspeechend = () => setVoiceResult("Berhenti bicara, memproses...");
    
    recognition.onnomatch = () => {
      setVoiceResult("Suara tidak dapat dikenali.");
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      let isFinalFound = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        currentTranscript += transcript;
        if (event.results[i].isFinal) {
          isFinalFound = true;
        }
      }

      // SIMPAN KE REF AGAR TIDAK HILANG/KOSONG SAAT ONEND DIPANGGIL
      latestTranscriptRef.current = currentTranscript;

      if (isFinalFound) {
        setVoiceResult(currentTranscript);
        parseVoiceCommand(currentTranscript);
      } else {
        // Tampilkan teks sementara di layar
        setVoiceResult(currentTranscript + "...");
      }
    };

    recognition.onerror = (event: Event | any) => {
      setVoiceResult("Error (" + event.error + "): Modul suara gagal");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      
      // JURUS PAMUNGKAS SAFARI:
      // Safari sering memutus mic tanpa isFinal. Jadi saat onend, 
      // kita paksa eksekusi dari memori cadangan (Ref).
      if (latestTranscriptRef.current) {
        parseVoiceCommand(latestTranscriptRef.current);
      }
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

    const parseVoiceCommand = (text: string) => {
      // 1. BERSIHKAN TEKS DARI SEGALA MACAM SAMPAH
      // Safari suka masukin huruf besar, titik, koma, spasi ganda, dll.
      let cleanText = text.toLowerCase()
        .replace(/\./g, '') // Buang semua titik (11.000 -> 11000)
        .replace(/,/g, '')  // Buang semua koma
        .replace(/rupiah/g, '') // Buang kata rupiah
        .replace(/\s+/g, ' ') // Ganti spasi ganda jadi spasi tunggal
        .trim();

      // 2. KONVERSI HURUF ANGKA JADI NOMOR ASLI
      const wordsToDigits: Record<string, string> = {
        'nol': '0', 'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4',
        'lima': '5', 'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9',
        'sepuluh': '10', 'sebelas': '11', 'dua belas': '12', 'tiga belas': '13',
        'empat belas': '14', 'lima belas': '15', 'enam belas': '16', 'tujuh belas': '17',
        'delapan belas': '18', 'sembilan belas': '19', 'dua puluh': '20',
        'tiga puluh': '30', 'empat puluh': '40', 'lima puluh': '50',
        'enam puluh': '60', 'tujuh puluh': '70', 'delapan puluh': '80', 'sembilan puluh': '90'
      };

      Object.entries(wordsToDigits).forEach(([word, digit]) => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        cleanText = cleanText.replace(regex, digit);
      });
      cleanText = cleanText.replace(/belas/g, "1").replace(/puluh/g, "0");

      // 3. JURUS PAMUNGKAS CARI ANGKA (Sangat Ampuh untuk iOS)
      let parsedAmount = 0;
      
      // Cari angka yang diikuti kata 'ribu' atau 'juta' (Contoh: 11 ribu)
      const ribuJutaMatch = cleanText.match(/(\d+)\s*(ribu|juta)/);
      
      if (ribuJutaMatch) {
        let num = parseInt(ribuJutaMatch[1], 10);
        if (ribuJutaMatch[2] === "ribu") num *= 1000;
        if (ribuJutaMatch[2] === "juta") num *= 1000000;
        parsedAmount = num;
      } else {
        // Cari SEMUA angka yang tersisa di dalam teks secara berurutan (Contoh: 11000)
        const numberMatches = cleanText.match(/\d+/g);
        
        if (numberMatches) {
          // Gabungkan semua deretan angka yang ditemukan (kalau terpisah spasi)
          const combinedNumbers = numberMatches.join('');
          parsedAmount = parseInt(combinedNumbers, 10);
          
          // Kalau angkanya di bawah 1000, anggap itu ribuan
          if (parsedAmount > 0 && parsedAmount < 1000) {
            parsedAmount *= 1000; 
          }
        }
      }

      // 4. CARI KATEGORI DENGAN AMAN
      let matchedCategory = displayCategories[0]?.name || "Lainnya"; 
      const categories = displayCategories.map(c => c.name.toLowerCase());
      
      // Coba cocokkan kata di teks dengan nama kategori yang ada
      const found = categories.find(c => cleanText.includes(c));
      if (found) {
        matchedCategory = displayCategories.find(c => c.name.toLowerCase() === found)?.name || matchedCategory;
      } else {
        // Sinonim kategori sehari-hari
        if (cleanText.includes("makan") || cleanText.includes("minum") || cleanText.includes("kopi") || cleanText.includes("jajan") || cleanText.includes("warteg")) {
          matchedCategory = "Makan & Minum"; 
        } else if (cleanText.includes("bensin") || cleanText.includes("parkir") || cleanText.includes("gojek") || cleanText.includes("grab") || cleanText.includes("tol")) {
          matchedCategory = "Transportasi";
        } else if (cleanText.includes("paket") || cleanText.includes("pulsa") || cleanText.includes("kuota") || cleanText.includes("internet")) {
          // Fallback ke "Tagihan" atau kategori pertama jika tidak ketemu
          const tagihanCat = displayCategories.find(c => c.name.includes("Tagihan") || c.name.includes("Lain"));
          matchedCategory = tagihanCat?.name || displayCategories[0]?.name || "Lainnya";
        }
      }

      // 5. SET HASIL AKHIR
      setParsedVoice({ amount: parsedAmount || 0, category: matchedCategory });
    };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-md select-none" onClick={handleClose}>
      <div
        className="relative w-full sm:max-w-md h-full sm:h-auto max-h-[95vh] flex flex-col glass-card rounded-2xl shadow-2xl bg-white dark:bg-[#151121]/95 border border-slate-200 dark:border-primary/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tab */}
        <div className="flex p-2 bg-slate-100 dark:bg-black/20 gap-2 shrink-0">
          {(["numpad", "template", "voice"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 text-sm font-bold capitalize rounded-xl transition-all ${
                activeTab === t
                  ? "bg-white dark:bg-white/10 text-primary shadow-sm"
                  : "text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5"
              }`}
            >
              {t === "numpad" ? "Numeric" : t === "template" ? "Template" : "Suara"}
            </button>
          ))}
          <button onClick={handleClose} className="p-3 text-slate-500 hover:text-rose-500 transition-colors">
             <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "numpad" && (
            <div className="flex flex-col h-full">
              {step === "amount" ? (
                <>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 bg-primary/5">
                    <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">
                       Nominal Pengeluaran
                    </div>
                    <div className="text-5xl font-black text-rose-500 text-center pb-8 border-b border-primary/10 w-full max-w-xs">
                      Rp {formatCurrencyInput(amountStr)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-4 bg-white dark:bg-[#151121]">
                    {numpadButtons.map((btn) => (
                      <button
                        key={btn}
                        onClick={() => handleNumpadPress(btn)}
                        className={`py-4 text-2xl font-black rounded-2xl active:scale-95 transition-all ${
                          btn === "DEL"
                            ? "text-rose-500 bg-rose-50 dark:bg-rose-500/10"
                            : "text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {btn === "DEL" ? <span className="material-symbols-outlined text-3xl">backspace</span> : btn}
                      </button>
                    ))}
                    <button
                      onClick={() => handleNumpadPress("OK")}
                      disabled={amountStr === "0"}
                      className="col-span-3 py-4 text-xl font-bold rounded-2xl bg-primary text-white shadow-lg disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all"
                    >
                      Pilih Kategori
                    </button>
                  </div>
                </>
              ) : step === "category" ? (
                <div className="p-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setStep("amount")} className="text-slate-500 p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                       <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="text-xl font-black text-primary">Rp {formatCurrencyInput(amountStr)}</div>
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Pilih Kategori</h3>
                  
                  <div className="grid grid-cols-3 gap-4 flex-1 overflow-y-auto content-start">
                    {displayCategories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => {
                           if (isAddingTemplate) {
                              setCategory(cat.name);
                           } else {
                              setCategory(cat.name);
                              setStep("name");
                           }
                        }}
                        className={`flex flex-col items-center gap-2 group transition-all p-2 rounded-2xl ${(isAddingTemplate && category === cat.name) || (!isAddingTemplate && category === cat.name) ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                      >
                        <div className="size-14 rounded-2xl border-2 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-all">
                          <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
                        </div>
                        <span className="text-xs font-bold text-center text-slate-600 dark:text-slate-400 line-clamp-2">
                          {cat.name}
                        </span>
                      </button>
                    ))}

                    <button
                       onClick={() => setIsAddingNewCategory(true)}
                       className="flex flex-col items-center gap-2 group transition-all p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                       <div className="size-14 rounded-2xl border-2 border-dashed bg-transparent border-slate-300 dark:border-white/20 text-slate-400 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-all">
                          <span className="material-symbols-outlined text-3xl">add</span>
                       </div>
                       <span className="text-xs font-bold text-center text-slate-500">Kategori Baru</span>
                    </button>
                  </div>

                  {isAddingNewCategory && (
                     <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10 animate-in slide-in-from-bottom-2">
                        <div className="flex flex-col gap-3">
                           <input 
                              value={newCatName}
                              onChange={e => setNewCatName(e.target.value)}
                              placeholder="Nama Kategori Baru"
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-hidden"
                              autoFocus
                           />
                           <div className="flex gap-2">
                              <button onClick={() => setIsAddingNewCategory(false)} className="flex-1 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-xl">Batal</button>
                              <button 
                                 onClick={() => {
                                    if(newCatName.trim()){
                                       createBudget.mutate({
                                          category: newCatName.trim(),
                                          date: txMonth + "-01",
                                          icon: "category",
                                          color: "slate-500"
                                       }, {
                                          onSuccess: () => {
                                             setCategory(newCatName.trim());
                                             setIsAddingNewCategory(false);
                                             setNewCatName("");
                                          }
                                       });
                                    }
                                 }}
                                 disabled={createBudget.isPending || !newCatName.trim()}
                                 className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                              >
                                 {createBudget.isPending ? "Menyimpan..." : "Tambah"}
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

                  {!isAddingNewCategory && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10">
                    {!isAddingTemplate ? (
                        <button 
                           onClick={() => setIsAddingTemplate(true)}
                           className="w-full py-3 rounded-xl border-2 border-dashed border-primary/50 text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/5"
                        >
                           <span className="material-symbols-outlined">bookmark_add</span>
                           Jadikan Template
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                            <input 
                               value={tempName}
                               onChange={e => setTempName(e.target.value)}
                               placeholder="Nama Template (mis: Kopi Pagi)"
                               className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary outline-hidden"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setIsAddingTemplate(false)} className="flex-1 py-3 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white font-bold rounded-xl">Batal</button>
                                <button onClick={saveNewTemplate} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg">Simpan</button>
                            </div>
                        </div>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                /* Step: Name - Beri nama pengeluaran */
                <div className="p-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setStep("category")} className="text-slate-500 p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                       <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="text-right">
                      <div className="text-xl font-black text-primary">Rp {formatCurrencyInput(amountStr)}</div>
                      <div className="text-xs text-slate-500 font-bold">{category}</div>
                    </div>
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Nama Pengeluaran</h3>
                  
                  <div className="flex-1 flex flex-col gap-4">
                    <input
                      value={expenseName}
                      onChange={e => setExpenseName(e.target.value)}
                      placeholder="Contoh: Ayam Geprek, Bensin Motor..."
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-lg font-bold focus:border-primary outline-hidden transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-black dark:text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && expenseName.trim()) {
                          const catData = displayCategories.find((c) => c.name === category);
                          handleSaveTransaction(parseInt(amountStr), type, category, catData?.icon || "payments", expenseName.trim());
                        }
                      }}
                    />
                    <p className="text-xs text-slate-400 italic px-1">Tulis nama pengeluaranmu agar mudah diingat di riwayat</p>
                  </div>

                  <button
                    onClick={() => {
                      const catData = displayCategories.find((c) => c.name === category);
                      handleSaveTransaction(parseInt(amountStr), type, category, catData?.icon || "payments", expenseName.trim() || category);
                    }}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 text-lg mt-4"
                  >
                    <span className="material-symbols-outlined">check</span>
                    Simpan Pengeluaran
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "template" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Template Anda</h3>
                 <button onClick={() => { setActiveTab("numpad"); setIsAddingTemplate(true); setStep("amount"); }} className="text-primary font-bold flex items-center gap-1 text-sm bg-primary/10 px-3 py-1 rounded-full">
                     <span className="material-symbols-outlined text-base">add</span> Baru
                 </button>
              </div>

              {templates.length === 0 ? (
                  <div className="text-center py-10 opacity-50 flex flex-col items-center">
                      <span className="material-symbols-outlined text-6xl mb-4">bookmarks</span>
                      <p className="font-bold">Belum ada template</p>
                      <p className="text-sm">Buat template untuk input instan</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-3">
                      {templates.map(t => (
                          <div key={t.id} className="relative group">
                              <button
                                 onClick={() => handleTemplateTap(t)}
                                 className="w-full flex flex-col items-start p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary hover:shadow-lg transition-all text-left"
                              >
                                  <div className="flex items-center gap-2 mb-2 w-full">
                                      <div className={`p-2 rounded-lg ${t.type === 'expense' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                          <span className="material-symbols-outlined text-sm">{t.icon}</span>
                                      </div>
                                      <span className="font-bold text-sm truncate flex-1 block">{t.name}</span>
                                  </div>
                                  <span className="text-lg font-black text-black dark:text-white">Rp {formatCurrencyInput(t.amount)}</span>
                                  <span className="text-xs text-slate-500 mt-1 truncate w-full">{t.category}</span>
                              </button>
                              <button onClick={() => removeTemplate(t.id)} className="absolute -top-2 -right-2 size-8 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-75 hover:scale-90 hover:bg-rose-500">
                                  <span className="material-symbols-outlined text-base">close</span>
                              </button>
                          </div>
                      ))}
                  </div>
              )}
            </div>
          )}

          {activeTab === "voice" && (
            <div className="p-6 flex flex-col h-full items-center justify-center">
                <div className="text-center mb-8">
                     <h2 className="text-2xl font-black mb-2">Input Suara</h2>
                     <p className="text-slate-500 text-sm">Ketuk tombol lalu sebutkan nominal dan kategori.<br/>Contoh: "Makan siang lima belas ribu"</p>
                </div>

                <div className="relative mb-12 flex items-center justify-center">
                    {isRecording && (
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full scale-150 animate-ping"></div>
                    )}
                    <button
                        onClick={() => {
                           if (isRecording) {
                               stopRecording();
                           } else {
                               startRecording();
                           }
                        }}
                        className={`relative z-10 size-32 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white scale-95 shadow-inner animate-pulse' : 'bg-primary text-white shadow-xl hover:scale-105'}`}
                    >
                        <span className="material-symbols-outlined text-6xl">mic</span>
                    </button>
                </div>

                <div className="w-full min-h-24 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 mb-4 transition-all">
                    <p className={`text-center italic ${isRecording ? 'text-primary' : 'text-slate-500'}`}>
                        {voiceResult || "Ketuk mikrofon untuk mulai bicara..."}
                    </p>
                </div>

                {parsedVoice && parsedVoice.amount > 0 && (
                    <div className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Terdeteksi</p>
                                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">Rp {formatCurrencyInput(parsedVoice.amount)}</p>
                            </div>
                        </div>

                        {!isEditingVoiceCategory ? (
                          <button 
                             onClick={() => setIsEditingVoiceCategory(true)}
                             className="w-full flex items-center justify-between p-3 mb-4 bg-white/50 dark:bg-black/10 hover:bg-white dark:hover:bg-black/20 rounded-xl transition-colors border border-emerald-200/50 dark:border-emerald-500/20 group"
                          >
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                   <span className="material-symbols-outlined text-xl">
                                       {displayCategories.find(c => c.name === parsedVoice.category)?.icon || "category"}
                                   </span>
                                </div>
                                <span className="font-bold text-emerald-800 dark:text-emerald-200 text-left line-clamp-1">{parsedVoice.category}</span>
                             </div>
                             <span className="material-symbols-outlined text-emerald-600/50 group-hover:text-emerald-600">edit</span>
                          </button>
                        ) : (
                          <div className="mb-4 animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-2">
                               <p className="text-xs font-bold text-emerald-600/80">Pilih Kategori yang Benar:</p>
                               <button onClick={() => setIsEditingVoiceCategory(false)} className="text-emerald-600/50 hover:text-emerald-600">
                                  <span className="material-symbols-outlined text-sm">close</span>
                               </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                               {displayCategories.map(cat => (
                                  <button
                                     key={cat.name}
                                     onClick={() => {
                                        setParsedVoice(prev => prev ? { ...prev, category: cat.name } : null);
                                        setIsEditingVoiceCategory(false);
                                     }}
                                     className={`flex flex-col items-center p-2 rounded-xl border transition-all ${parsedVoice.category === cat.name ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'border-transparent bg-white/40 dark:bg-black/10 text-emerald-600/70 hover:bg-white dark:hover:bg-black/20'}`}
                                  >
                                      <span className="material-symbols-outlined mb-1 text-lg">{cat.icon}</span>
                                      <span className="text-[10px] font-bold text-center leading-tight line-clamp-2">{cat.name}</span>
                                  </button>
                               ))}
                            </div>
                          </div>
                        )}

                        <button 
                            onClick={() => {
                              // Bersihkan trailing "..." dari voice result sebelum simpan
                              const cleanNote = voiceResult.replace(/\.{2,}$/g, '').trim();
                              handleSaveTransaction(parsedVoice.amount, "expense", parsedVoice.category, displayCategories.find(c => c.name === parsedVoice.category)?.icon || "category", cleanNote);
                            }}
                            className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                            Simpan Sekarang
                        </button>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
