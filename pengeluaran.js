/*
==================================================
PENGELUARAN - DENGAN FILTER PERIODE
================================================== */

let activeExpenseFilter = "today"; // 'today', 'week', 'month', 'all', 'custom'

/*
==================================================
HELPERS
================================================== */
function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr) {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
}

function getPeriodLabel(start, end) {
    if (!start && !end) return "Semua Periode";
    if (start === end) return `Tanggal ${formatDateLabel(start)}`;
    return `${formatDateLabel(start)} s/d ${formatDateLabel(end)}`;
}

/*
==================================================
FILTER CONTROLS
================================================== */
function filterExpenseToday() {
    activeExpenseFilter = "today";
    const t = getTodayString();
    document.getElementById("expenseStartDate").value = t;
    document.getElementById("expenseEndDate").value = t;
    updateExpenseBtnStyles();
    renderExpenses();
}

function filterExpenseWeek() {
    activeExpenseFilter = "week";
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    document.getElementById("expenseStartDate").value = toDateStr(start);
    document.getElementById("expenseEndDate").value = toDateStr(end);
    updateExpenseBtnStyles();
    renderExpenses();
}

function filterExpenseMonth() {
    activeExpenseFilter = "month";
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);

    document.getElementById("expenseStartDate").value = toDateStr(start);
    document.getElementById("expenseEndDate").value = toDateStr(end);
    updateExpenseBtnStyles();
    renderExpenses();
}

function filterExpenseAll() {
    activeExpenseFilter = "all";
    document.getElementById("expenseStartDate").value = "";
    document.getElementById("expenseEndDate").value = "";
    updateExpenseBtnStyles();
    renderExpenses();
}

function onExpenseDateChange() {
    activeExpenseFilter = "custom";
    updateExpenseBtnStyles();
    renderExpenses();
}

function updateExpenseBtnStyles() {
    document.getElementById("btnExpToday").classList.toggle("active", activeExpenseFilter === "today");
    document.getElementById("btnExpWeek").classList.toggle("active", activeExpenseFilter === "week");
    document.getElementById("btnExpMonth").classList.toggle("active", activeExpenseFilter === "month");
    document.getElementById("btnExpAll").classList.toggle("active", activeExpenseFilter === "all");
}

/*
==================================================
RENDER PENGELUARAN (dengan filter)
================================================== */
function renderExpenses() {
    const expenses = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];
    const today = getTodayString();

    // 1. Hitung total HARI INI (yang tampil di panel kiri)
    const todayTotal = expenses
        .filter(e => e.dateKey === today)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    document.getElementById("totalExpenseToday").innerText = rupiah(todayTotal);

    // 2. Filter untuk daftar riwayat berdasarkan mode
    const startInput = document.getElementById("expenseStartDate").value;
    const endInput = document.getElementById("expenseEndDate").value;

    let filtered = [];

    if (activeExpenseFilter === "all") {
        filtered = expenses;
    } else if (startInput && endInput) {
        filtered = expenses.filter(e => {
            return e.dateKey >= startInput && e.dateKey <= endInput;
        });
    } else {
        filtered = expenses;
    }

    // 3. Update label periode
    let labelText;
    if (activeExpenseFilter === "all") {
        labelText = "Periode: Semua";
    } else if (startInput && endInput) {
        labelText = "Periode: " + getPeriodLabel(startInput, endInput);
    } else {
        labelText = "Periode: Semua";
    }
    document.getElementById("periodLabel").innerText = labelText;

    // 4. Render list
    const list = document.getElementById("expenseList");
    list.innerHTML = "";

    let totalPeriod = 0;

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty">Belum ada pengeluaran pada periode ini.</div>`;
    } else {
        // Urutkan terbaru dulu
        const sorted = [...filtered].sort((a, b) => {
            if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
            return (b.id || 0) - (a.id || 0);
        });

        sorted.forEach((exp) => {
            totalPeriod += Number(exp.amount) || 0;

            const div = document.createElement("div");
            div.className = "order-item";
            div.style.alignItems = "center";

            const info = document.createElement("div");
            info.className = "order-info";

            const nameEl = document.createElement("div");
            nameEl.className = "order-name";
            nameEl.textContent = exp.name;

            const metaEl = document.createElement("div");
            metaEl.className = "order-price";
            metaEl.style.fontSize = "11px";
            const dateLabel = exp.dateKey === today ? "Hari ini" : formatDateLabel(exp.dateKey);
            metaEl.textContent = `${dateLabel} • ${exp.time}`;

            info.appendChild(nameEl);
            info.appendChild(metaEl);

            const totalEl = document.createElement("div");
            totalEl.className = "item-total";
            totalEl.style.color = "#ff8888";
            totalEl.textContent = "-" + rupiah(exp.amount);

            const delBtn = document.createElement("button");
            delBtn.className = "btn-clear";
            delBtn.style.cssText = "padding:5px 10px; font-size:12px; margin-left:10px; background:#1a1a1a;";
            delBtn.textContent = "❌";
            delBtn.onclick = () => deleteExpense(exp.id);

            div.appendChild(info);
            div.appendChild(totalEl);
            div.appendChild(delBtn);
            list.appendChild(div);
        });
    }

    // 5. Update total periode
    document.getElementById("periodTotal").innerText = rupiah(totalPeriod);
}

/*
==================================================
TAMBAH PENGELUARAN
================================================== */
function addExpense() {
    const name = document.getElementById("expenseName").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const expenseDate = document.getElementById("expenseDate").value || getTodayString();

    if (!name || amount <= 0) {
        alert("Mohon masukkan keterangan dan nominal pengeluaran dengan benar.");
        return;
    }

    // Validasi tanggal tidak melebihi hari ini (opsional)
    if (expenseDate > getTodayString()) {
        alert("Tanggal pengeluaran tidak boleh melebihi hari ini.");
        return;
    }

    const now = new Date();
    const newExpense = {
        id: Date.now(),
        name: name,
        amount: amount,
        dateKey: expenseDate,
        time: now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })
    };

    const expenses = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];
    expenses.push(newExpense);
    localStorage.setItem("angkringan_expenses", JSON.stringify(expenses));

    // Reset form
    document.getElementById("expenseName").value = "";
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseDate").value = getTodayString();

    renderExpenses();
    alert("Berhasil mencatat pengeluaran!");
}

/*
==================================================
HAPUS PENGELUARAN
================================================== */
function deleteExpense(id) {
    if (confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) {
        let expenses = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];
        expenses = expenses.filter(e => e.id !== id);
        localStorage.setItem("angkringan_expenses", JSON.stringify(expenses));
        renderExpenses();
    }
}

/*
==================================================
INIT
================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const today = getTodayString();
    document.getElementById("expenseDate").value = today;
    document.getElementById("expenseStartDate").value = today;
    document.getElementById("expenseEndDate").value = today;
    filterExpenseToday();
});