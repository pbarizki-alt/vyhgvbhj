/*
==================================================
HALAMAN PEMBAYARAN
================================================== */
let activeEditOrderId = null;

/*
==================================================
RENDER PENDING ORDERS
================================================== */
function renderPendingOrders() {
    const pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    const container = document.getElementById("pendingList");
    container.innerHTML = "";

    if (pendingOrders.length === 0) {
        container.innerHTML = `<div class="empty" style="grid-column:1/-1;">Tidak ada pesanan yang menunggu pembayaran.</div>`;
        return;
    }

    pendingOrders.forEach((order) => {
        let itemsHTML = "";
        order.items.forEach((item, idx) => {
            itemsHTML += `
                <div class="pending-item-row">
                    <span>${escapeHtml(item.name)} x ${item.quantity}</span>
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span>${rupiah(item.price * item.quantity)}</span>
                        <button class="btn-remove-item" onclick="removeItemFromOrder(${order.id}, ${idx})" title="Hapus item">✕</button>
                    </span>
                </div>
            `;
        });

        const sourceClass = order.source === "Rokok" ? "rokok" : "kasir";
        const initialMethod = order.paymentMethod || "Cash";
        const notaLabel = order.nota ? `<span class="nota-badge">${order.nota}</span>` : "";

        const card = document.createElement("div");
        card.className = "pending-card";
        card.innerHTML = `
            <div class="pending-header">
                <span>🕒 ${order.date}</span>
                <span style="display:flex; gap:6px; align-items:center;">
                    ${notaLabel}
                    <span class="history-source ${sourceClass}">${order.source}</span>
                </span>
            </div>

            <div class="pending-items">
                ${itemsHTML}
            </div>

            <div class="pending-action-row">
                <button class="btn-add-item-order" onclick="openAddItemModal(${order.id})">➕ Tambah</button>
                <div class="pending-total-row">
                    <span style="font-size:12px; color:#aaa; font-weight:normal;">TOTAL: </span>
                    <span>${rupiah(order.total)}</span>
                </div>
            </div>

            <div class="pending-payment">
                <div class="pending-field">
                    <label for="payInput_${order.id}">Uang Pembeli</label>
                    <input type="text" inputmode="numeric" id="payInput_${order.id}" placeholder="Contoh: 50.000" oninput="calculatePendingChange(${order.id}, ${order.total})">
                </div>

                <div class="pending-change-row">
                    <span>Kembalian</span>
                    <span id="changeVal_${order.id}" style="color:#ff0000;">${rupiah(0)}</span>
                </div>

                <div class="pending-field">
                    <label for="payMethod_${order.id}">Metode Pembayaran</label>
                    <select id="payMethod_${order.id}">
                        <option value="Cash" ${initialMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Dana" ${initialMethod === 'Dana' ? 'selected' : ''}>Dana</option>
                    </select>
                </div>
            </div>

            <div class="pending-buttons">
                <button class="btn-pay-pending" onclick="processPendingPayment(${order.id})">💰 Bayar</button>
                <button class="btn-cancel-pending" onclick="cancelPendingOrder(${order.id})">Batalkan</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
}

/*
==================================================
HAPUS ITEM DARI PENDING ORDER
================================================== */
function removeItemFromOrder(orderId, itemIdx) {
    let pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    const oi = pendingOrders.findIndex(o => o.id === orderId);
    if (oi === -1) return;

    const order = pendingOrders[oi];
    if (!confirm(`Hapus item "${order.items[itemIdx].name}" dari pesanan?`)) return;

    order.items.splice(itemIdx, 1);

    // Jika tidak ada item lagi, hapus seluruh order
    if (order.items.length === 0) {
        pendingOrders.splice(oi, 1);
        localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingOrders));
        renderPendingOrders();
        return;
    }

    order.total = order.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingOrders));
    renderPendingOrders();
}

/*
==================================================
TAMBAH ITEM
================================================== */
function openAddItemModal(orderId) {
    activeEditOrderId = orderId;
    const pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) return;

    const select = document.getElementById("selectMenuItem");
    select.innerHTML = `<option value="">-- Pilih Menu Tersedia --</option>`;

    const allMenus = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];

    let availableMenu = [];
    if (order.source === "Rokok") {
        availableMenu = allMenus.filter(m => m.category === "Rokok" || m.category === "Rokok Eceran");
    } else {
        availableMenu = allMenus.filter(m => m.category === "Makanan" || m.category === "Minuman");
    }

    availableMenu.forEach((menuItem, idx) => {
        const option = document.createElement("option");
        option.value = idx;
        option.textContent = `${menuItem.name} - ${rupiah(menuItem.price)}`;
        option.dataset.name = menuItem.name;
        option.dataset.price = menuItem.price;
        option.dataset.hpp = menuItem.hpp || 0;
        option.dataset.category = menuItem.category || "Lainnya";   // ✅ TAMBAH
        select.appendChild(option);
    });

    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "+ Input Manual / Lainnya";
    select.appendChild(customOption);

    document.getElementById("inputItemName").value = "";
    document.getElementById("inputItemPrice").value = "";
    document.getElementById("inputItemQty").value = 1;

    document.getElementById("addItemModal").style.display = "flex";
}

function onMenuItemSelect() {
    const select = document.getElementById("selectMenuItem");
    const opt = select.options[select.selectedIndex];

    if (select.value !== "" && select.value !== "custom") {
        document.getElementById("inputItemName").value = opt.dataset.name;
        document.getElementById("inputItemPrice").value = opt.dataset.price;
    } else {
        document.getElementById("inputItemName").value = "";
        document.getElementById("inputItemPrice").value = "";
    }
}

function closeAddItemModal() {
    document.getElementById("addItemModal").style.display = "none";
    activeEditOrderId = null;
}

function saveItemToPendingOrder() {
    if (!activeEditOrderId) return;

    const select = document.getElementById("selectMenuItem");
    const selectedOpt = select.options[select.selectedIndex];
    const name = document.getElementById("inputItemName").value.trim();
    const price = Number(document.getElementById("inputItemPrice").value) || 0;
    const qty = Number(document.getElementById("inputItemQty").value) || 1;

    // Ambil hpp & category dari data menu yang dipilih (bukan custom)
    const isFromMenu = (select.value !== "" && select.value !== "custom");
    const hpp = isFromMenu ? (Number(selectedOpt.dataset.hpp) || 0) : 0;
    const category = isFromMenu ? (selectedOpt.dataset.category || "Lainnya") : "Lainnya";

    if (!name || price <= 0 || qty <= 0) {
        alert("Mohon isi nama pesanan, harga, dan jumlah dengan benar.");
        return;
    }

    let pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    const oi = pendingOrders.findIndex(o => o.id === activeEditOrderId);
    if (oi === -1) return;

    const existing = pendingOrders[oi].items.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        existing.quantity += qty;
    } else {
        pendingOrders[oi].items.push({ name, price, quantity: qty, hpp, category });
    }

    pendingOrders[oi].total = pendingOrders[oi].items.reduce((s, it) => s + (it.price * it.quantity), 0);

    localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingOrders));
    closeAddItemModal();
    renderPendingOrders();
}

/*
==================================================
HITUNG KEMBALIAN
================================================== */
function calculatePendingChange(id, total) {
    const input = document.getElementById(`payInput_${id}`);
    const changeVal = document.getElementById(`changeVal_${id}`);
    const payment = formatNumberInput(input);
    const change = payment - total;

    if (change >= 0) {
        changeVal.innerText = rupiah(change);
        changeVal.style.color = "#00e676";
    } else {
        changeVal.innerText = "Kurang " + rupiah(Math.abs(change));
        changeVal.style.color = "#ff8888";
    }
}

/*
==================================================
PROSES PEMBAYARAN
================================================== */
function processPendingPayment(id) {
    let pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    const oi = pendingOrders.findIndex(o => o.id === id);
    if (oi === -1) return;

    const order = pendingOrders[oi];
    const input = document.getElementById(`payInput_${id}`);
    const methodSelect = document.getElementById(`payMethod_${id}`);

    const payment = parseFormattedNumber(input.value);
    const selectedMethod = methodSelect ? methodSelect.value : (order.paymentMethod || "Cash");

    if (payment < order.total) {
        alert("Uang pembeli masih kurang " + rupiah(order.total - payment));
        return;
    }

    const change = payment - order.total;
    const nota = order.nota || generateNotaNumber();

    const newTransaction = {
        id: order.id,
        nota: nota,
        dateKey: order.dateKey || getTodayString(),
        date: order.date,
        source: order.source,
        items: order.items,
        total: order.total,
        payment: payment,
        change: change,
        paymentMethod: selectedMethod,
        status: "SUKSES"
    };

    const existing = JSON.parse(localStorage.getItem("angkringan_transactions")) || [];
    existing.push(newTransaction);
    localStorage.setItem("angkringan_transactions", JSON.stringify(existing));

    pendingOrders.splice(oi, 1);
    localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingOrders));

    const lanjutKeBeranda = confirm(
        `✅ Pembayaran Berhasil!\n\n` +
        `Nota: ${nota}\n` +
        `Metode: ${selectedMethod}\n` +
        `Total: ${rupiah(order.total)}\n` +
        `Bayar: ${rupiah(payment)}\n` +
        `Kembalian: ${rupiah(change)}\n\n` +
        `Kembali ke Beranda?`
    );

    if (lanjutKeBeranda) {
        location.href = "index.html";
    } else {
        renderPendingOrders();
    }
}

/*
==================================================
BATALKAN
================================================== */
function cancelPendingOrder(id) {
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
        let pendingOrders = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
        pendingOrders = pendingOrders.filter(o => o.id !== id);
        localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingOrders));
        renderPendingOrders();
    }
}

document.addEventListener("DOMContentLoaded", renderPendingOrders);