/*
==================================================
REKAP TRANSAKSI
================================================== */
let semuaTransaksi = [];
let transaksiTampil = [];
let currentPage = 1;
const rowsPerPage = 20;
let selectedTxId = null;

let categoryMap = {};
let hppMap = {};

/*
==================================================
INIT
================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const menuData = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];
    menuData.forEach(m => {
        categoryMap[m.name] = m.category;
        hppMap[m.name] = m.hpp || 0;
    });

    const today = getTodayString();
    document.getElementById("startDate").value = today;
    document.getElementById("endDate").value = today;

    loadKasShift();
    loadTransactionReport();
});

/*
==================================================
FILTER & LOAD
================================================== */
function loadTransactionReport() {
    semuaTransaksi = JSON.parse(localStorage.getItem("angkringan_transactions")) || [];

    const startInput = document.getElementById("startDate").value;
    const endInput = document.getElementById("endDate").value;

    transaksiTampil = semuaTransaksi;

    if (startInput && endInput) {
        transaksiTampil = semuaTransaksi.filter(tx => {
            const key = tx.dateKey || getDateKeyFromTimestamp(tx.id);
            return key >= startInput && key <= endInput;
        });
    }

    currentPage = 1;
    calculateFinances();
    renderTable();
}

/*
==================================================
KALKULASI KEUANGAN
================================================== */
function calculateFinances() {
    let omset = 0, hpp = 0;
    let incomeMakanan = 0, incomeMinuman = 0, incomeRokok = 0, incomeRokokEceran = 0, incomeLainnya = 0;
    let kasMasukTunai = 0;

    transaksiTampil.forEach(tx => {
        if (tx.status === 'VOID') return;

        omset += (tx.total || 0);

        if (tx.paymentMethod === "Dana") {
            // tidak masuk kas tunai
        } else {
            kasMasukTunai += (tx.total || 0);
        }

        if (Array.isArray(tx.items)) {
            tx.items.forEach(item => {
                const subtotal = item.price * item.quantity;

                const itemHpp = (item.hpp !== undefined && item.hpp !== null)
                    ? item.hpp
                    : (hppMap[item.name] || 0);
                hpp += itemHpp * item.quantity;

                const cat = item.category || categoryMap[item.name] || "Lainnya";
                if (cat === "Makanan") incomeMakanan += subtotal;
                else if (cat === "Minuman") incomeMinuman += subtotal;
                else if (cat === "Rokok") incomeRokok += subtotal;
                else if (cat === "Rokok Eceran") incomeRokokEceran += subtotal;
                else incomeLainnya += subtotal;
            });
        }
    });

    // BACA PENGELUARAN DENGAN KEY & PROPERTI YANG BENAR
    const pengeluaranData = JSON.parse(localStorage.getItem("angkringan_expenses")) || [];
    let totalPengeluaran = 0;

    const startInput = document.getElementById("startDate").value;
    const endInput = document.getElementById("endDate").value;

    pengeluaranData.forEach(p => {
        if (startInput && endInput && p.dateKey) {
            if (p.dateKey >= startInput && p.dateKey <= endInput) {
                totalPengeluaran += (Number(p.amount) || 0);
            }
        } else {
            totalPengeluaran += (Number(p.amount) || 0);
        }
    });

    const labaBersih = omset - hpp - totalPengeluaran;

    document.getElementById("calcOmset").innerText = rupiah(omset);
    document.getElementById("calcHpp").innerText = "- " + rupiah(hpp);
    document.getElementById("calcPengeluaran").innerText = "- " + rupiah(totalPengeluaran);

    const labaEl = document.getElementById("calcLaba");
    labaEl.innerText = rupiah(labaBersih);
    labaEl.style.color = labaBersih < 0 ? "#ff4d4d" : "#00e676";

    document.getElementById("incomeMakanan").innerText = rupiah(incomeMakanan);
    document.getElementById("incomeMinuman").innerText = rupiah(incomeMinuman);
    document.getElementById("incomeRokok").innerText = rupiah(incomeRokok);
    document.getElementById("incomeRokokEceran").innerText = rupiah(incomeRokokEceran);
    document.getElementById("incomeLainnya").innerText = rupiah(incomeLainnya);

    window.dataKas = { masuk: kasMasukTunai, keluar: totalPengeluaran };
    calculateCashDrawer();
}

/*
==================================================
KAS LACI
================================================== */
function calculateCashDrawer() {
    if (!window.dataKas) return;

    const kasAwal = parseFloat(document.getElementById('kasAwal').value) || 0;
    const kasFisik = parseFloat(document.getElementById('kasFisik').value) || 0;

    const estimasi = kasAwal + window.dataKas.masuk - window.dataKas.keluar;
    const selisih = kasFisik - estimasi;

    document.getElementById('kasMasukTunai').innerText = rupiah(window.dataKas.masuk);
    document.getElementById('kasKeluarTunai').innerText = "- " + rupiah(window.dataKas.keluar);
    document.getElementById('estimasiKas').innerText = rupiah(estimasi);

    const elSelisih = document.getElementById('statusSelisih');
    elSelisih.innerText = rupiah(selisih);
    elSelisih.style.color = selisih < 0 ? '#ff4d4d' : (selisih > 0 ? '#4da6ff' : '#00e676');
}

function onKasInputChange() {
    calculateCashDrawer();
    saveKasShift();
}

function saveKasShift() {
    const data = {
        date: getTodayString(),
        kasAwal: parseFloat(document.getElementById('kasAwal').value) || 0,
        kasFisik: parseFloat(document.getElementById('kasFisik').value) || 0
    };
    localStorage.setItem("angkringan_kas_shift", JSON.stringify(data));
}

function loadKasShift() {
    const data = JSON.parse(localStorage.getItem("angkringan_kas_shift") || "null");
    if (data && data.date === getTodayString()) {
        document.getElementById('kasAwal').value = data.kasAwal || 0;
        document.getElementById('kasFisik').value = data.kasFisik || 0;
    }
}

/*
==================================================
TABEL + PAGINASI
================================================== */
function renderTable() {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    if (transaksiTampil.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">Belum ada riwayat transaksi pada periode ini.</td></tr>`;
        document.getElementById("pageInfo").innerText = "Halaman 1 dari 1";
        return;
    }

    const sortedTx = [...transaksiTampil].reverse();
    const totalPages = Math.ceil(sortedTx.length / rowsPerPage);

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedTx = sortedTx.slice(startIndex, startIndex + rowsPerPage);

    paginatedTx.forEach(tx => {
        const isVoid = tx.status === 'VOID';
        const methodClass = tx.paymentMethod === 'Dana' ? 'badge-dana' : 'badge-success';
        const statusHtml = isVoid
            ? `<span class="badge badge-void">VOID</span>`
            : `<span class="badge badge-success">SUKSES</span>`;

        const tr = document.createElement("tr");
        tr.style.opacity = isVoid ? "0.6" : "1";
        tr.innerHTML = `
            <td>${tx.date || '-'}</td>
            <td style="font-family: monospace; color: #00e676;">${tx.nota || '-'}</td>
            <td style="font-weight: bold; color: ${isVoid ? '#888' : '#00e676'};">${rupiah(tx.total || 0)}</td>
            <td><span class="badge ${methodClass}">${tx.paymentMethod || 'Cash'}</span></td>
            <td>${statusHtml}</td>
            <td><button class="btn" style="background: #444; color: #fff; padding: 4px 8px; font-size: 12px;" onclick="showDetail(${tx.id})">Detail</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("pageInfo").innerText = `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById("btnPrev").disabled = currentPage === 1;
    document.getElementById("btnNext").disabled = currentPage === totalPages;
    document.getElementById("btnPrev").style.opacity = currentPage === 1 ? "0.3" : "1";
    document.getElementById("btnNext").style.opacity = currentPage === totalPages ? "0.3" : "1";
}

function changePage(direction) {
    const totalPages = Math.ceil(transaksiTampil.length / rowsPerPage);
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    renderTable();
}

/*
==================================================
DETAIL & VOID
================================================== */
function showDetail(id) {
    const tx = semuaTransaksi.find(t => t.id === id);
    if (!tx) return;
    selectedTxId = id;

    document.getElementById("detailDate").innerText = tx.date + " | Sumber: " + (tx.source || 'Kasir');
    document.getElementById("detailNota").innerText = "Nota: " + (tx.nota || '-');
    document.getElementById("detailTotal").innerText = rupiah(tx.total || 0);
    document.getElementById("detailMethod").innerText = tx.paymentMethod || 'Cash';
    document.getElementById("detailBayar").innerText = rupiah(tx.payment || 0);

    const ul = document.getElementById("detailItems");
    ul.innerHTML = "";
    if (tx.items) {
        tx.items.forEach(item => {
            const sub = item.price * item.quantity;
            ul.innerHTML += `<li><span>${item.name} x${item.quantity}</span> <span>${rupiah(sub)}</span></li>`;
        });
    }

    if (tx.status === 'VOID' && tx.voidReason) {
        ul.innerHTML += `<li style="color:#ff8888; border:none; margin-top:8px;"><span>Alasan Void:</span> <span>${tx.voidReason}</span></li>`;
    }

    const btnVoid = document.getElementById("btnVoid");
    btnVoid.style.display = tx.status === 'VOID' ? 'none' : 'block';

    document.getElementById("modalOverlay").style.display = "block";
    document.getElementById("modalDetail").style.display = "block";
}

function closeDetail() {
    document.getElementById("modalOverlay").style.display = "none";
    document.getElementById("modalDetail").style.display = "none";
    selectedTxId = null;
}

function voidTransaction() {
    if (!selectedTxId) return;

    const reason = prompt("Alasan pembatalan (VOID):\nContoh: Salah input / pelanggan batal");
    if (reason === null) return;
    if (!reason.trim()) { alert("Alasan wajib diisi."); return; }

    const index = semuaTransaksi.findIndex(t => t.id === selectedTxId);
    if (index > -1) {
        semuaTransaksi[index].status = 'VOID';
        semuaTransaksi[index].voidReason = reason.trim();
        semuaTransaksi[index].voidAt = new Date().toLocaleString('id-ID');
        localStorage.setItem("angkringan_transactions", JSON.stringify(semuaTransaksi));

        alert("Transaksi berhasil dibatalkan (VOID).");
        closeDetail();
        loadTransactionReport();
    }
}

/*
==================================================
EKSPOR CSV RINGKAS
================================================== */
function exportCSV() {
    if (transaksiTampil.length === 0) return alert("Tidak ada data untuk diekspor!");

    let csvContent = "Nota,Waktu,Metode Bayar,Total Belanja,Status\n";
    transaksiTampil.forEach(t => {
        const status = t.status === 'VOID' ? 'VOID' : 'SUKSES';
        csvContent += `"${t.nota || ''}","${t.date}",${t.paymentMethod || 'Cash'},${t.total},${status}\r\n`;
    });

    downloadCSV(csvContent, `Rekap_Angkringan_${document.getElementById('startDate').value}.csv`);
}

/*
==================================================
EKSPOR CSV DETAIL (per item)
================================================== */
function exportCSVDetail() {
    if (transaksiTampil.length === 0) return alert("Tidak ada data untuk diekspor!");

    let csvContent = "Nota,Waktu,Sumber,Metode,Status,Item,Qty,Harga Satuan,Subtotal,HPP Satuan,Total HPP\n";

    transaksiTampil.forEach(t => {
        const status = t.status === 'VOID' ? 'VOID' : 'SUKSES';
        const source = t.source || 'Kasir';
        const method = t.paymentMethod || 'Cash';

        if (t.items && t.items.length) {
            t.items.forEach(it => {
                const sub = it.price * it.quantity;
                const hppSat = (it.hpp !== undefined && it.hpp !== null) ? it.hpp : (hppMap[it.name] || 0);
                const totalHpp = hppSat * it.quantity;
                csvContent += `"${t.nota || ''}","${t.date}","${source}","${method}","${status}","${it.name}",${it.quantity},${it.price},${sub},${hppSat},${totalHpp}\r\n`;
            });
        }
    });

    downloadCSV(csvContent, `Rekap_Detail_Angkringan_${document.getElementById('startDate').value}.csv`);
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/*
==================================================
CETAK THERMAL
================================================== */
function printRekap() {
    if (transaksiTampil.length === 0) return alert("Tidak ada data untuk dicetak!");

    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const periode = start === end ? start : `${start} s/d ${end}`;

    const omset = document.getElementById('calcOmset').innerText;
    const laba = document.getElementById('calcLaba').innerText;
    const estimasiLaci = document.getElementById('estimasiKas').innerText;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
        <html><head><style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; }
            .center { text-align: center; }
            hr { border-style: dashed; margin: 10px 0; }
        </style></head><body>
            <div class="center">
                <h3>REKAP PENJUALAN</h3>
                <p>Periode: ${periode}</p>
                <p>Cetak: ${new Date().toLocaleString('id-ID')}</p>
            </div>
            <hr>
            <p>Total Penjualan : ${omset}</p>
            <p>Kas Tunai Masuk : ${document.getElementById('kasMasukTunai').innerText}</p>
            <p>Kas Tunai Keluar: ${document.getElementById('kasKeluarTunai').innerText}</p>
            <hr>
            <p>Laba Bersih     : ${laba}</p>
            <hr>
            <p><strong>ESTIMASI LACI : ${estimasiLaci}</strong></p>
            <hr>
            <div class="center"><p>--- Terima Kasih ---</p></div>
            <script>window.onload = function(){ window.print(); window.close(); }<\/script>
        </body></html>
    `);
    printWindow.document.close();
}

/*
==================================================
HAPUS SEMUA
================================================== */
function clearAllTransactions() {
    if (confirm("Apakah Anda yakin ingin menghapus SELURUH riwayat transaksi secara permanen?")) {
        localStorage.removeItem("angkringan_transactions");
        loadTransactionReport();
    }
}