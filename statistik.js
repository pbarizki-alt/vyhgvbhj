/*
==================================================
STATISTIK
================================================== */
let activeFilterMode = "today";

/*
==================================================
FILTER HELPERS
================================================== */
function getTodayStringLocal() { return getTodayString(); }

function filterToday() {
    activeFilterMode = "today";
    const t = getTodayString();
    document.getElementById("filterStart").value = t;
    document.getElementById("filterEnd").value = t;
    updateButtonStyles();
    loadStatistics();
}

function filterWeek() {
    activeFilterMode = "custom";
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);

    document.getElementById("filterStart").value = toDateStr(start);
    document.getElementById("filterEnd").value = toDateStr(end);
    updateButtonStyles();
    loadStatistics();
}

function filterMonth() {
    activeFilterMode = "custom";
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);

    document.getElementById("filterStart").value = toDateStr(start);
    document.getElementById("filterEnd").value = toDateStr(end);
    updateButtonStyles();
    loadStatistics();
}

function filterAll() {
    activeFilterMode = "all";
    document.getElementById("filterStart").value = "";
    document.getElementById("filterEnd").value = "";
    updateButtonStyles();
    loadStatistics();
}

function onDateInputChange() {
    activeFilterMode = "custom";
    updateButtonStyles();
    loadStatistics();
}

function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function updateButtonStyles() {
    document.getElementById("btnToday").classList.toggle("active", activeFilterMode === "today");
    document.getElementById("btnAll").classList.toggle("active", activeFilterMode === "all");
    document.getElementById("btnWeek").classList.remove("active");
    document.getElementById("btnMonth").classList.remove("active");
}

/*
==================================================
LOAD STATISTIK
================================================== */
function loadStatistics() {
    const transactions = JSON.parse(localStorage.getItem("angkringan_transactions")) || [];
    const expensesData = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];

    const startInput = document.getElementById("filterStart").value;
    const endInput = document.getElementById("filterEnd").value;

    let filteredTransactions = [];
    let filteredExpenses = [];

    if (activeFilterMode === "all") {
        filteredTransactions = transactions;
        filteredExpenses = expensesData;
        document.getElementById("historyTitle").innerText = "📑 Riwayat Transaksi (Semua Tanggal)";
    } else {
        filteredTransactions = transactions.filter(tx => {
            const key = tx.dateKey || getDateKeyFromTimestamp(tx.id);
            return key >= startInput && key <= endInput;
        });
        filteredExpenses = expensesData.filter(ex => {
            return ex.dateKey >= startInput && ex.dateKey <= endInput;
        });
        const label = startInput === endInput
            ? startInput.split('-').reverse().join('/')
            : `${startInput.split('-').reverse().join('/')} s/d ${endInput.split('-').reverse().join('/')}`;
        document.getElementById("historyTitle").innerText = `📑 Riwayat Transaksi (${label})`;
    }

    let grandTotal = 0, totalExpense = 0;
    let totalDana = 0, kasirDana = 0, rokokDana = 0;

    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    // Aggregator menu terlaris
    const itemSales = {};

    if (filteredTransactions.length === 0) {
        historyList.innerHTML = `<div class="empty">Tidak ada riwayat transaksi pada periode ini.</div>`;
    } else {
        filteredTransactions.slice().reverse().forEach((tx) => {
            if (tx.status === 'VOID') return;

            grandTotal += tx.total || 0;

            if (tx.paymentMethod === "Dana") {
                totalDana += tx.total;
                if (tx.source === "Rokok") rokokDana += tx.total;
                else kasirDana += tx.total;
            }

            if (Array.isArray(tx.items)) {
                tx.items.forEach(item => {
                    const key = item.name;
                    if (!itemSales[key]) {
                        itemSales[key] = { name: item.name, qty: 0, revenue: 0 };
                    }
                    itemSales[key].qty += item.quantity;
                    itemSales[key].revenue += item.price * item.quantity;
                });
            }

            const sourceClass = tx.source === "Rokok" ? "rokok" : "kasir";
            const methodText = tx.paymentMethod ? ` (${tx.paymentMethod})` : " (Cash)";

            const card = document.createElement("div");
            card.className = "history-card";

            let itemsHTML = "";
            tx.items.forEach((item) => {
                itemsHTML += `<div class="history-item-row"><span>${escapeHtml(item.name)} x ${item.quantity}</span><span>${rupiah(item.price * item.quantity)}</span></div>`;
            });

            card.innerHTML = `
                <div class="history-header">
                    <span>🕒 ${tx.date}</span>
                    <span style="display:flex; gap:6px; align-items:center;">
                        <span class="nota-badge">${tx.nota || '-'}</span>
                        <span class="history-source ${sourceClass}">${tx.source}</span>
                    </span>
                </div>
                <div class="history-items">${itemsHTML}</div>
                <div class="history-footer">
                    <span>TOTAL</span>
                    <span>${rupiah(tx.total)}${methodText}</span>
                </div>
            `;
            historyList.appendChild(card);
        });

        if (historyList.children.length === 0) {
            historyList.innerHTML = `<div class="empty">Semua transaksi pada periode ini berstatus VOID.</div>`;
        }
    }

    filteredExpenses.forEach(ex => { totalExpense += Number(ex.amount) || 0; });

    let netProfit = grandTotal - totalExpense;

    document.getElementById("grandTotalIncome").innerText = rupiah(grandTotal);
    document.getElementById("totalExpenseStat").innerText = rupiah(totalExpense);

    const netProfitEl = document.getElementById("netProfitStat");
    if (netProfit < 0) {
        netProfitEl.innerText = "-" + rupiah(Math.abs(netProfit));
        netProfitEl.style.color = "#ff4d4d";
    } else {
        netProfitEl.innerText = rupiah(netProfit);
        netProfitEl.style.color = "#00e676";
    }

    document.getElementById("totalTransactions").innerText = filteredTransactions.filter(t => t.status !== 'VOID').length;
    document.getElementById("totalDana").innerText = rupiah(totalDana);
    document.getElementById("kasirDana").innerText = rupiah(kasirDana);
    document.getElementById("rokokDana").innerText = rupiah(rokokDana);

    renderBestSeller(itemSales);
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
}

/*
==================================================
MENU TERLARIS
================================================== */
function renderBestSeller(itemSales) {
    const container = document.getElementById("bestSellerList");
    const arr = Object.values(itemSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

    if (arr.length === 0) {
        container.innerHTML = `<div class="empty">Belum ada data penjualan.</div>`;
        return;
    }

    container.innerHTML = "";
    arr.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "bestseller-item";

        const left = document.createElement("div");
        left.innerHTML = `<span class="bestseller-rank">#${idx + 1}</span>${escapeHtml(item.name)}`;

        const right = document.createElement("div");
        right.innerHTML = `<span class="bestseller-qty">${item.qty}x</span> <span style="color:#888; font-size:12px; margin-left:6px;">${rupiah(item.revenue)}</span>`;

        row.appendChild(left);
        row.appendChild(right);
        container.appendChild(row);
    });
}

/*
==================================================
HAPUS SEMUA
================================================== */
function clearAllHistory() {
    if (confirm("Apakah Anda yakin ingin menghapus SELURUH riwayat transaksi?")) {
        localStorage.removeItem("angkringan_transactions");
        loadStatistics();
    }
}

/*
==================================================
INIT
================================================== */
document.addEventListener("DOMContentLoaded", () => {
    filterToday();
});