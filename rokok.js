/*
==================================================
KASIR ROKOK
================================================== */

const allMenuData = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];
const rokokBungkus = allMenuData.filter(m => m.category === "Rokok");
const rokokEceran = allMenuData.filter(m => m.category === "Rokok Eceran");

let order = {};

function createMenu(menu, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = "";

    if (!menu || menu.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1;color:#888;text-align:center;font-size:14px;margin:10px 0;">Belum ada menu di kategori ini</p>`;
        return;
    }

    menu.forEach((item) => {
        const button = document.createElement("button");
        button.className = "menu-button";

        const nameSpan = document.createElement("span");
        nameSpan.className = "menu-name";
        nameSpan.textContent = item.name;

        const priceSpan = document.createElement("span");
        priceSpan.className = "menu-price";
        priceSpan.textContent = rupiah(item.price);

        button.appendChild(nameSpan);
        button.appendChild(priceSpan);

        button.onclick = () => addItem(item);
        container.appendChild(button);
    });
}

function addItem(item) {
    if (order[item.name]) {
        order[item.name].quantity++;
    } else {
        order[item.name] = {
            name: item.name,
            price: item.price,
            quantity: 1,
            hpp: item.hpp || 0,
            category: item.category || "Lainnya"   // ✅ SIMPAN KATEGORI
        };
    }
    renderOrder();
}

function changeQuantity(name, amount) {
    if (!order[name]) return;
    order[name].quantity += amount;
    if (order[name].quantity <= 0) delete order[name];
    renderOrder();
}

function renderOrder() {
    const orderList = document.getElementById("orderList");
    orderList.innerHTML = "";

    const items = Object.values(order);

    if (items.length === 0) {
        orderList.innerHTML = `<div class="empty">Belum ada pesanan</div>`;
        document.getElementById("totalItems").innerText = "0";
        document.getElementById("grandTotal").innerText = rupiah(0);
        document.getElementById("change").innerText = rupiah(0);
        return;
    }

    let total = 0, totalItems = 0;

    items.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        totalItems += item.quantity;

        const div = document.createElement("div");
        div.className = "order-item";
        div.dataset.name = item.name;

        const info = document.createElement("div");
        info.className = "order-info";

        const nameEl = document.createElement("div");
        nameEl.className = "order-name";
        nameEl.textContent = item.name;

        const priceEl = document.createElement("div");
        priceEl.className = "order-price";
        priceEl.textContent = rupiah(item.price) + " / pcs";

        info.appendChild(nameEl);
        info.appendChild(priceEl);

        const qty = document.createElement("div");
        qty.className = "quantity";
        qty.innerHTML = `
            <button data-action="minus">−</button>
            <span>${item.quantity}</span>
            <button data-action="plus">+</button>
        `;

        const totalEl = document.createElement("div");
        totalEl.className = "item-total";
        totalEl.textContent = rupiah(itemTotal);

        div.appendChild(info);
        div.appendChild(qty);
        div.appendChild(totalEl);
        orderList.appendChild(div);
    });

    document.getElementById("totalItems").innerText = totalItems;
    document.getElementById("grandTotal").innerText = rupiah(total);
    calculateChange();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("orderList").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const itemEl = btn.closest(".order-item");
        if (!itemEl) return;
        const name = itemEl.dataset.name;
        if (btn.dataset.action === "plus") changeQuantity(name, 1);
        else if (btn.dataset.action === "minus") changeQuantity(name, -1);
    });
});

function calculateChange() {
    const input = document.getElementById("paymentInput");
    const payment = formatNumberInput(input);
    const total = calculateTotal();
    const change = payment - total;

    const changeEl = document.getElementById("change");
    if (change >= 0) changeEl.innerText = rupiah(change);
    else changeEl.innerText = "Kurang " + rupiah(Math.abs(change));
}

function calculateTotal() {
    let total = 0;
    Object.values(order).forEach(item => total += item.price * item.quantity);
    return total;
}

function saveTransactionToStorage(sourceName, notaNumber) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID") + " " +
        now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const paymentMethod = document.getElementById("paymentMethod") ?
        document.getElementById("paymentMethod").value : "Cash";
    const payment = parseFormattedNumber(document.getElementById("paymentInput").value);

    const newTransaction = {
        id: Date.now(),
        nota: notaNumber,
        dateKey: getTodayString(),
        date: formattedDate,
        source: sourceName,
        items: Object.values(order).map(i => ({
            name: i.name, price: i.price, quantity: i.quantity, hpp: i.hpp || 0,
            category: i.category || "Lainnya"
        })),
        total: calculateTotal(),
        payment: payment,
        change: payment - calculateTotal(),
        paymentMethod: paymentMethod,
        status: "SUKSES"
    };

    const existing = JSON.parse(localStorage.getItem("angkringan_transactions")) || [];
    existing.push(newTransaction);
    localStorage.setItem("angkringan_transactions", JSON.stringify(existing));
}

function clearOrder() {
    if (Object.keys(order).length === 0) return;
    if (confirm("Hapus semua pesanan?")) {
        order = {};
        document.getElementById("paymentInput").value = "";
        renderOrder();
    }
}

function finishTransaction() {
    const total = calculateTotal();
    if (total === 0) { alert("Belum ada pesanan."); return; }

    const payment = parseFormattedNumber(document.getElementById("paymentInput").value);
    if (payment < total) {
        alert("Uang pembeli masih kurang " + rupiah(total - payment));
        return;
    }

    const change = payment - total;
    const nota = generateNotaNumber();
    saveTransactionToStorage("Rokok", nota);

    alert(
        `✅ Transaksi Berhasil!\n\n` +
        `Nota: ${nota}\n` +
        `Total: ${rupiah(total)}\n` +
        `Bayar: ${rupiah(payment)}\n` +
        `Kembalian: ${rupiah(change)}`
    );

    order = {};
    document.getElementById("paymentInput").value = "";
    document.getElementById("paymentMethod").value = "Cash";
    renderOrder();
}

function confirmOrder() {
    const total = calculateTotal();
    if (total === 0) { alert("Belum ada pesanan untuk dikonfirmasi."); return; }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID") + " " +
        now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const paymentMethod = document.getElementById("paymentMethod") ?
        document.getElementById("paymentMethod").value : "Cash";
    const nota = generateNotaNumber();

    const pendingOrder = {
        id: Date.now(),
        nota: nota,
        dateKey: getTodayString(),
        date: formattedDate,
        source: "Rokok",
        items: Object.values(order).map(i => ({
            name: i.name, price: i.price, quantity: i.quantity, hpp: i.hpp || 0,
            category: i.category || "Lainnya"
        })),
        total: total,
        paymentMethod: paymentMethod
    };

    const pendingList = JSON.parse(localStorage.getItem("angkringan_pending_orders")) || [];
    pendingList.push(pendingOrder);
    localStorage.setItem("angkringan_pending_orders", JSON.stringify(pendingList));

    alert(`📌 Pesanan dikonfirmasi!\nNota: ${nota}\nSilakan lanjut ke menu Pembayaran.`);

    order = {};
    document.getElementById("paymentInput").value = "";
    if (document.getElementById("paymentMethod")) document.getElementById("paymentMethod").value = "Cash";
    renderOrder();
}

createMenu(rokokBungkus, "packMenu");
createMenu(rokokEceran, "retailMenu");
renderOrder();