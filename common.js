/*
==================================================
COMMON UTILITIES - Kasir Angkringan
==================================================
*/

// Format Rupiah
function rupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0
    }).format(number || 0);
}

// Format tanggal ke YYYY-MM-DD
function getTodayString() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDateKeyFromTimestamp(ts) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Nomor Nota Otomatis (reset setiap hari)
function generateNotaNumber() {
    const today = getTodayString();
    let data = JSON.parse(localStorage.getItem("angkringan_nota_counter") || '{"date":"","counter":0}');
    if (data.date !== today) {
        data = { date: today, counter: 0 };
    }
    data.counter++;
    localStorage.setItem("angkringan_nota_counter", JSON.stringify(data));
    return "A-" + String(data.counter).padStart(3, "0");
}

// Format input uang dengan pemisah ribuan
function formatNumberInput(input) {
    let raw = String(input.value).replace(/\D/g, "");
    if (raw === "") { input.value = ""; return 0; }
    const num = parseInt(raw, 10);
    input.value = num.toLocaleString("id-ID");
    return num;
}

// Parse angka berformat ("20.000" → 20000)
function parseFormattedNumber(str) {
    if (typeof str === "number") return str;
    if (!str) return 0;
    const cleaned = String(str).replace(/[^\d]/g, "");
    return parseInt(cleaned, 10) || 0;
}