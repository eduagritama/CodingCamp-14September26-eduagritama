// --- Buat nyimpen state / data sementara ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ['MAKANAN', 'TRANSPORTASI', 'HIBURAN', 'BELANJA'];
let currentTheme = localStorage.getItem('theme') || 'light';

// --- Ambil elemen-elemen HTML nya ---
const form = document.getElementById('transactionForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categorySelect = document.getElementById('category');

// Elemen buat modalnya
const openCategoryModalBtn = document.getElementById('openCategoryModalBtn');
const categoryModal = document.getElementById('categoryModal');
const newCategoryInput = document.getElementById('newCategoryInput');
const saveCategoryBtn = document.getElementById('saveCategoryBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');

const transactionsList = document.getElementById('transactionsList');
const totalBalanceEl = document.getElementById('totalBalance');
const themeToggle = document.getElementById('themeToggle');
const monthFilter = document.getElementById('monthFilter');
const clearFilterBtn = document.getElementById('clearFilter');

let expenseChart;

// --- Fungsi format ke Rupiah biar rapi ---
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// --- Pas pertama kali jalan ---
function init() {
    // Set tanggal default ke hari ini
    dateInput.value = new Date().toISOString().split('T')[0];
    const today = new Date();
    monthFilter.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    applyTheme(currentTheme);
    populateCategories();
    updateUI();
}

// --- Fungsi buat update tampilan (total duit, list, dll) ---
function updateUI() {
    const filteredTransactions = getFilteredTransactions();
    const total = filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
    
    // Terapin format rupiah ke total saldo
    totalBalanceEl.innerText = formatRupiah(total);
    
    renderTransactions(filteredTransactions);
    updateChart(filteredTransactions);
}

// Filter transaksi berdasarkan bulan
function getFilteredTransactions() {
    const filterValue = monthFilter.value;
    if (!filterValue) return transactions;
    return transactions.filter(t => t.date.startsWith(filterValue));
}

// Munculin list ke layar
function renderTransactions(data) {
    transactionsList.innerHTML = '';
    
    // Kalau kosong, tampilin teks ini
    if (data.length === 0) {
        transactionsList.innerHTML = '<p style="font-family: \'Space Mono\'; font-size: 12px; margin-top:10px;">BELUM ADA TRANSAKSI NIH.</p>';
        return;
    }
    
    // Urutin dari yang paling baru
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedData.forEach(transaction => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        item.innerHTML = `
            <div class="transaction-info">
                <h4>${transaction.name}</h4>
                <p class="amount">${formatRupiah(transaction.amount)}</p>
                <span class="badge">${transaction.category}</span>
                <span class="badge" style="background:var(--primary-color); margin-left:5px;">${transaction.date}</span>
            </div>
            <button class="btn-danger" onclick="deleteTransaction(${transaction.id})">HAPUS</button>
        `;
        transactionsList.appendChild(item);
    });
}

// --- Ini bagian CRUD nya ---

// Fungsi nampilin pesan error pake modal buatan
function showError(message) {
    modalTitle.innerText = 'PERHATIAN!';
    modalMessage.innerText = message;
    modalMessage.style.display = 'block';
    newCategoryInput.style.display = 'none';
    saveCategoryBtn.style.display = 'none';
    categoryModal.classList.add('active');
}

// Nambah transaksi
function addTransaction(e) {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const date = dateInput.value;

    // Validasi biar ga ada yang kosong atau minus
    if (name === '' || isNaN(amount) || amount <= 0 || category === '' || date === '') {
        showError('TOLONG ISI SEMUA DATA DENGAN BENAR (NOMINAL TIDAK BOLEH 0 ATAU MINUS).');
        return;
    }

    transactions.push({ id: Date.now(), name, amount, category, date });
    saveData();
    updateUI();
    
    // Kosongin inputan lagi habis disubmit
    itemNameInput.value = '';
    amountInput.value = '';
}

// Hapus transaksi
function deleteTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    saveData();
    updateUI();
}

// --- Logika buat nanganin Kategori ---

// Munculin opsi kategori ke dropdown
function populateCategories() {
    categorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        categorySelect.appendChild(option);
    });
}

// Buka modal buat nambah kategori
openCategoryModalBtn.addEventListener('click', () => {
    modalTitle.innerText = 'KATEGORI BARU';
    modalMessage.style.display = 'none';
    newCategoryInput.style.display = 'block';
    saveCategoryBtn.style.display = 'block';
    newCategoryInput.value = '';
    
    categoryModal.classList.add('active'); // Nampilin modal
    newCategoryInput.focus();
});

// Tutup modal
closeModalBtn.addEventListener('click', () => {
    categoryModal.classList.remove('active'); // Nyembunyiin modal
});

// Pas tombol 'SIMPAN' di modal diklik
saveCategoryBtn.addEventListener('click', () => {
    const newCategory = newCategoryInput.value.trim().toUpperCase();
    if (newCategory !== '') {
        // Cek dulu udah ada belum kategorinya
        if (!categories.includes(newCategory)) {
            categories.push(newCategory);
            localStorage.setItem('categories', JSON.stringify(categories));
            populateCategories();
            categorySelect.value = newCategory;
            categoryModal.classList.remove('active');
        } else {
            showError('KATEGORI UDAH ADA BOS!');
        }
    }
});

// --- Bagian bikin grafiknya ---
function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const categoryTotals = {};
    
    // Hitung total duit per kategori
    data.forEach(t => {
        if (categoryTotals[t.category]) categoryTotals[t.category] += t.amount;
        else categoryTotals[t.category] = t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#ffffff' : '#000000';
    const gridColor = isDark ? '#ffffff' : '#000000';

    // Palet warna (Merah, Hitam, Abu-abu)
    const backgroundColors = ['#e60000', '#000000', '#666666', '#cccccc', '#ff4d4d'];

    // Hancurin grafik lama sebelum bikin yang baru biar ga numpuk
    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.length ? labels : ['KOSONG'],
            datasets: [{
                data: values.length ? values : [1],
                backgroundColor: values.length ? backgroundColors : ['#e6e6e6'],
                borderWidth: 3,
                borderColor: gridColor,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: "'Space Mono', monospace", size: 12, weight: 'bold' } }
                },
                tooltip: {
                    backgroundColor: gridColor,
                    titleColor: isDark ? '#000' : '#fff',
                    bodyColor: isDark ? '#000' : '#fff',
                    bodyFont: { family: "'Space Mono', monospace" },
                    callbacks: {
                        label: function(context) {
                            if (!values.length) return ' BELUM ADA TRANSAKSI';
                            let label = context.label || '';
                            if (label) label += ': ';
                            if (context.parsed !== null) {
                                // Tampilin format rupiah pas di hover
                                label += formatRupiah(context.parsed);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- Buat tema sama simpen-simpen ke local storage ---

// Ganti-ganti terang ke gelap atau sebaliknya
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    saveData();
    updateChart(getFilteredTransactions());
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerText = 'LIGHT MODE';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerText = 'DARK MODE';
    }
}

// Simpen semua data ke memori browser
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('theme', currentTheme);
}

// --- Aksi pas di-klik dkk (Event Listeners) ---
form.addEventListener('submit', addTransaction);
themeToggle.addEventListener('click', toggleTheme);
monthFilter.addEventListener('change', updateUI);

// Pas tombol clear filter bulan dipencet
clearFilterBtn.addEventListener('click', () => {
    monthFilter.value = '';
    updateUI();
});

// Jalanin!
init();