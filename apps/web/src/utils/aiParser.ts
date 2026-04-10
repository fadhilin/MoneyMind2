export type ParsedTransaction = {
  amount: number;
  category: string;
  description: string;
  corrected_text: string;
  confidence: number;
};

export type ParsedReceiptItem = {
  name: string;
  amount: number;
  category: string;
};

export async function parseTransactionWithAI(
  transcript: string
): Promise<ParsedTransaction | null> {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn("OpenRouter API key tidak ditemukan di .env");
      return null;
    }

    const prompt = `
Kamu adalah AI parser untuk aplikasi keuangan pribadi berbahasa Indonesia.

Tugasmu:
- Pahami ucapan user yang mungkin typo / salah tangkap speech-to-text
- Ambil nominal uang
- Tentukan kategori pengeluaran
- Buat deskripsi singkat pengeluaran
- Koreksi kalimat jika ada typo
- Remove filler words like: "tadi", "barusan", "aku", "saya"
- Remove numbers and nominal mentions from description
- Keep only the core activity (e.g. "beli bensin", "makan siang")
- Output description must be SHORT and CLEAN

Balas HANYA dalam format JSON valid tanpa markdown.
Return JSON:
{
  "amount": number,
  "category": string,
  "description": string,
  "corrected_text": string,
  "confidence": number
}

Kategori yang mungkin:
- Makan & Minum
- Transportasi
- Belanja
- Tagihan
- Hiburan
- Kesehatan
- Pendidikan
- Rumah
- Lainnya

Contoh:
Input: "tadi beli kopi delapan belas ribut"
Output:
{
  "amount": 18000,
  "category": "Makan & Minum",
  "description": "Beli kopi",
  "corrected_text": "tadi beli kopi delapan belas ribu",
  "confidence": 0.95
}

Input user:
"${transcript}"
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    return {
      amount: Number(parsed.amount || 0),
      category: String(parsed.category || "Lainnya"),
      description: String(parsed.description || transcript),
      corrected_text: String(parsed.corrected_text || transcript),
      confidence: Number(parsed.confidence || 0.7),
    };
  } catch (error) {
    console.error("parseTransactionWithAI error:", error);
    return null;
  }
}

export async function parseReceiptWithAI(
  base64Image: string
): Promise<ParsedReceiptItem[] | null> {
  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn("OpenRouter API key tidak ditemukan di .env");
      return null;
    }

    const prompt = `
Kamu adalah AI parser untuk aplikasi keuangan pribadi berbahasa Indonesia.

Tugasmu:
- Baca gambar struk belanja / nota pembayaran yang diberikan.
- Ekstrak setiap item barang yang dibeli beserta harga total dari item tersebut (bukan harga satuan, melainkan total untuk item tersebut).
- Berikan kategori yang cocok untuk setiap item.

Pilihan Kategori:
- Makan & Minum
- Transportasi
- Belanja
- Tagihan
- Hiburan
- Kesehatan
- Pendidikan
- Rumah
- Lainnya

Balas HANYA dengan format JSON TEPAT seperti berikut, tanpa markdown, penjelasan, atau teks tambahan apa pun. Pastikan Anda mengembalikan array of objects.
Contoh balasan:
[
  { "name": "Indomie Goreng", "amount": 3500, "category": "Belanja" },
  { "name": "Kopi Janji Jiwa", "amount": 18000, "category": "Makan & Minum" },
  { "name": "Sabun Mandi", "amount": 5000, "category": "Belanja" }
]
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
        console.error("OpenRouter Vision error:", response.status, await response.text());
        return null;
    }

    const data = await response.json();

    let content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    // Bersihkan markdown blok jika AI masih membandel
    content = content.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();

    const parsed: ParsedReceiptItem[] = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error("parseReceiptWithAI error:", error);
    return null;
  }
}
