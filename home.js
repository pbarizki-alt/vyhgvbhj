/*
==================================================
HALAMAN BERANDA - DASHBOARD & BACKUP
==================================================
*/
function loadDashboard() {
    const transactions = JSON.parse(localStorage.getItem("angkringan_transactions")) || [];
    const expenses = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];
    const today = getTodayString();

    const todayTx = transactions.filter(tx => {
        if (tx.status === 'VOID') return false;
        const key = tx.dateKey || getDateKeyFromTimestamp(tx.id);
        return key === today;
    });

    const todayEx = expenses.filter(ex => ex.dateKey === today);

    let omset = 0, hpp = 0;
    todayTx.forEach(tx => {
        omset += tx.total || 0;
        if (Array.isArray(tx.items)) {
            tx.items.forEach(it => {
                hpp += (it.hpp || 0) * (it.quantity || 0);
            });
        }
    });

    const totalEx = todayEx.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totalKeluar = totalEx + hpp;
    const profit = omset - totalKeluar;

    document.getElementById("dashTxCount").innerText = todayTx.length;
    document.getElementById("dashOmset").innerText = rupiah(omset);
    document.getElementById("dashExpense").innerText = rupiah(totalKeluar);

    const profitEl = document.getElementById("dashProfit");
    if (profit < 0) {
        profitEl.innerText = "-" + rupiah(Math.abs(profit));
        profitEl.style.color = "#ff4d4d";
    } else {
        profitEl.innerText = rupiah(profit);
        profitEl.style.color = "#00e676";
    }
}

/*
==================================================
BACKUP / RESTORE
==================================================
*/
const BACKUP_KEYS = [
    "angkringan_menu_data",
    "angkringan_transactions",
    "angkringan_pending_orders",
    "angkringan_expenses",
    "angkringan_nota_counter",
    "angkringan_kas_shift",
    "angkringan_initialized"
];

function openBackupModal() {
    document.getElementById("backupModal").style.display = "flex";
}

function closeBackupModal() {
    document.getElementById("backupModal").style.display = "none";
    document.getElementById("importFile").value = "";
}

function exportBackup() {
    const backup = {};
    BACKUP_KEYS.forEach(k => {
        const v = localStorage.getItem(k);
        if (v !== null) backup[k] = v;
    });

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Backup_Angkringan_${getTodayString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importBackup() {
    const fileInput = document.getElementById("importFile");
    const file = fileInput.files[0];
    if (!file) { alert("Pilih file backup terlebih dahulu."); return; }

    if (!confirm("⚠️ Impor backup akan MENIMPA semua data saat ini. Lanjutkan?")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            let count = 0;
            Object.keys(backup).forEach(k => {
                if (k.startsWith("angkringan_")) {
                    localStorage.setItem(k, backup[k]);
                    count++;
                }
            });
            alert(`Backup berhasil diimpor (${count} entri)! Halaman akan dimuat ulang.`);
            location.reload();
        } catch (err) {
            alert("File backup tidak valid atau rusak.");
        }
    };
    reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", loadDashboard);