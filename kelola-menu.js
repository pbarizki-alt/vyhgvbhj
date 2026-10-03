/*
==================================================
KELOLA MENU
================================================== */

let currentFilter = 'Semua';

/*
==================================================
INISIALISASI MENU DEFAULT (hanya sekali)
================================================== */
function initDefaultMenu() {
    const initialized = localStorage.getItem("angkringan_initialized");
    const menus = JSON.parse(localStorage.getItem("angkringan_menu_data"));

    if (!initialized && (!menus || menus.length === 0)) {
        const defaults = [
            { id: 1, name: "Nasi Kucing Teri", price: 3000, hpp: 2000, category: "Makanan" },
            { id: 2, name: "Es Teh Manis", price: 4000, hpp: 1500, category: "Minuman" },
            { id: 3, name: "Surya 12", price: 23000, hpp: 21000, category: "Rokok" },
            { id: 4, name: "Surya 12 (Ecer)", price: 2500, hpp: 1800, category: "Rokok Eceran" }
        ];
        localStorage.setItem("angkringan_menu_data", JSON.stringify(defaults));
    }
    localStorage.setItem("angkringan_initialized", "1");
}

/*
==================================================
RENDER DAFTAR MENU
================================================== */
function renderMenuList(filterCategory = 'Semua') {
    currentFilter = filterCategory;
    const menus = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];
    const list = document.getElementById("menuList");
    const searchTerm = (document.getElementById("searchMenu")?.value || "").toLowerCase().trim();

    list.innerHTML = "";

    let filtered = filterCategory === 'Semua' ? menus : menus.filter(m => m.category === filterCategory);
    if (searchTerm) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(searchTerm));
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty">Belum ada menu di kategori ini.</div>`;
        return;
    }

    filtered.forEach(menu => {
        let badgeColor = "#ff4d4d";
        if (menu.category === "Makanan") badgeColor = "#4da6ff";
        else if (menu.category === "Minuman") badgeColor = "#00e676";
        else if (menu.category === "Rokok Eceran") badgeColor = "#ff9900";

        const div = document.createElement("div");
        div.className = "order-item";
        div.style.alignItems = "center";

        const info = document.createElement("div");
        info.className = "order-info";

        const nameEl = document.createElement("div");
        nameEl.className = "order-name";
        nameEl.textContent = menu.name;

        const priceEl = document.createElement("div");
        priceEl.className = "order-price";
        priceEl.innerHTML = `${rupiah(menu.price)} 
            <span style="background:${badgeColor}; color:#000; font-size:10px; padding:2px 5px; border-radius:3px; margin-left:5px;">${menu.category}</span>
            ${menu.hpp ? `<span style="color:#888; font-size:11px; margin-left:5px;">HPP: ${rupiah(menu.hpp)}</span>` : ''}`;

        info.appendChild(nameEl);
        info.appendChild(priceEl);

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "5px";

        const editBtn = document.createElement("button");
        editBtn.className = "btn-clear";
        editBtn.style.cssText = "padding:5px 10px; font-size:12px; background:#4da6ff; color:#000;";
        editBtn.textContent = "✏️ Edit";
        editBtn.onclick = () => editMenu(menu.id);

        const delBtn = document.createElement("button");
        delBtn.className = "btn-clear";
        delBtn.style.cssText = "padding:5px 10px; font-size:12px; background:#ff4d4d; color:#000;";
        delBtn.textContent = "🗑️";
        delBtn.onclick = () => deleteMenu(menu.id);

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        div.appendChild(info);
        div.appendChild(actions);
        list.appendChild(div);
    });
}

/*
==================================================
SIMPAN / UPDATE MENU
================================================== */
function saveMenu() {
    const idInput = document.getElementById("menuId").value;
    const name = document.getElementById("menuName").value.trim();
    const price = Number(document.getElementById("menuPrice").value);
    const hpp = Number(document.getElementById("menuHpp").value) || 0;
    const category = document.getElementById("menuCategory").value;

    if (!name || price <= 0) {
        alert("Nama dan harga menu harus diisi dengan benar.");
        return;
    }

    let menus = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];

    // Cek duplikat nama (kecuali saat edit menu yang sama)
    const duplicate = menus.find(m =>
        m.name.toLowerCase() === name.toLowerCase() &&
        String(m.id) !== String(idInput)
    );
    if (duplicate) {
        alert(`Menu dengan nama "${name}" sudah ada di kategori "${duplicate.category}".`);
        return;
    }

    if (idInput) {
        const index = menus.findIndex(m => m.id == idInput);
        if (index !== -1) {
            menus[index].name = name;
            menus[index].price = price;
            menus[index].hpp = hpp;
            menus[index].category = category;
        }
        alert("Menu berhasil diperbarui!");
    } else {
        menus.push({
            id: Date.now(),
            name: name,
            price: price,
            hpp: hpp,
            category: category
        });
        alert("Menu berhasil ditambahkan!");
    }

    localStorage.setItem("angkringan_menu_data", JSON.stringify(menus));
    resetForm();
    renderMenuList(currentFilter);
}

/*
==================================================
EDIT MENU
================================================== */
function editMenu(id) {
    const menus = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];
    const menuToEdit = menus.find(m => m.id == id);

    if (menuToEdit) {
        document.getElementById("formTitle").innerHTML = "✏️ Edit Menu";
        document.getElementById("menuId").value = menuToEdit.id;
        document.getElementById("menuName").value = menuToEdit.name;
        document.getElementById("menuPrice").value = menuToEdit.price;
        document.getElementById("menuHpp").value = menuToEdit.hpp || "";
        document.getElementById("menuCategory").value = menuToEdit.category;

        document.getElementById("btnSave").innerHTML = "💾 Update Menu";
        document.getElementById("btnSave").style.background = "#00e676";
        document.getElementById("btnCancel").style.display = "block";

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function resetForm() {
    document.getElementById("formTitle").innerHTML = "🍽️ Tambah Menu Baru";
    document.getElementById("menuId").value = "";
    document.getElementById("menuName").value = "";
    document.getElementById("menuPrice").value = "";
    document.getElementById("menuHpp").value = "";
    document.getElementById("menuCategory").value = "Makanan";

    document.getElementById("btnSave").innerHTML = "➕ Simpan Menu";
    document.getElementById("btnSave").style.background = "#4da6ff";
    document.getElementById("btnCancel").style.display = "none";
}

/*
==================================================
HAPUS MENU
================================================== */
function deleteMenu(id) {
    if (confirm("Yakin ingin menghapus menu ini?")) {
        let menus = JSON.parse(localStorage.getItem("angkringan_menu_data")) || [];
        menus = menus.filter(m => m.id !== id);
        localStorage.setItem("angkringan_menu_data", JSON.stringify(menus));
        renderMenuList(currentFilter);
    }
}

function deleteAllMenus() {
    if (!confirm("⚠️ Yakin ingin menghapus SEMUA menu? Tindakan ini tidak bisa dibatalkan.")) return;
    if (!confirm("Konfirmasi terakhir: Semua menu akan dihapus. Lanjutkan?")) return;

    localStorage.setItem("angkringan_menu_data", JSON.stringify([]));
    renderMenuList(currentFilter);
    alert("Semua menu telah dihapus.");
}

/*
==================================================
INIT
================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initDefaultMenu();
    renderMenuList();
});