document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    initApp();
});

function initApp() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Initialize all tabs
    initPOSTab();
    initReceiptsTab();
    initSummaryTab();
    initStockTab();
    initShiftTab();

    // Check if there's an active shift
    checkActiveShift();

    // Load low stock alerts
    checkLowStock();
}

function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Deactivate all tab buttons
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.remove('active');
    });

    // Activate the selected tab
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

    // Refresh the tab content if needed
    switch(tabId) {
        case 'pos':
            loadProducts();
            updateCartDisplay();
            break;
        case 'receipts':
            loadReceipts();
            break;
        case 'summary':
            loadSummary();
            break;
        case 'stock':
            loadStockItems();
            checkLowStock();
            break;
        case 'shift':
            updateShiftDisplay();
            break;
    }
}

// POS Tab Functions
function initPOSTab() {
    // Load products
    loadProducts();

    // Set up checkout button
    document.getElementById('checkout-btn').addEventListener('click', checkout);
}

function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';

    const products = getProducts();
    
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">No products available. Add some in the Stock tab.</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const stockClass = product.quantity < 5 ? 'low-stock' : '';
        
        productCard.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/200?text=No+Image'}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.price} RWF</p>
            <p class="stock-info ${stockClass}">Stock: ${product.quantity} ${product.quantity < 5 ? '(Low Stock!)' : ''}</p>
        `;
        
        productCard.addEventListener('click', () => addToCart(product.id));
        productsGrid.appendChild(productCard);
    });
}

function addToCart(productId) {
    const activeShift = getActiveShift();
    if (!activeShift) {
        alert('Please start a shift before making sales!');
        return;
    }

    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (!product || product.quantity <= 0) {
        alert('This item is out of stock!');
        return;
    }

    let cart = getCart();
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        if (existingItem.quantity >= product.quantity) {
            alert('Not enough stock available!');
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: productId,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

    saveCart(cart);
    updateCartDisplay();
}

function getCart() {
    const cart = localStorage.getItem('bakeryPosCart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('bakeryPosCart', JSON.stringify(cart));
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cart = getCart();
    const products = getProducts();

    cartItemsContainer.innerHTML = '';

    let total = 0;

    cart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <p>${item.price} RWF × ${item.quantity} = ${itemTotal} RWF</p>
            </div>
            <div class="cart-item-controls">
                <button class="decrease-btn" data-id="${item.productId}"><i class="fas fa-minus"></i></button>
                <span>${item.quantity}</span>
                <button class="increase-btn" data-id="${item.productId}"><i class="fas fa-plus"></i></button>
                <button class="remove-btn" data-id="${item.productId}"><i class="fas fa-times"></i></button>
            </div>
        `;

        cartItemsContainer.appendChild(cartItemElement);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.decrease-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            updateCartItemQuantity(productId, -1);
        });
    });

    document.querySelectorAll('.increase-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            updateCartItemQuantity(productId, 1);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            removeFromCart(productId);
        });
    });

    cartTotalElement.textContent = total;
    
    // Enable/disable checkout button based on cart and shift status
    const activeShift = getActiveShift();
    checkoutBtn.disabled = cart.length === 0 || !activeShift;
    
    // Show/hide shift closed alert
    const shiftAlert = document.getElementById('shift-closed-alert');
    if (cart.length > 0 && !activeShift) {
        shiftAlert.style.display = 'block';
    } else {
        shiftAlert.style.display = 'none';
    }
}

function updateCartItemQuantity(productId, change) {
    let cart = getCart();
    const itemIndex = cart.findIndex(item => item.productId === productId);
    
    if (itemIndex !== -1) {
        const newQuantity = cart[itemIndex].quantity + change;
        
        if (newQuantity <= 0) {
            cart.splice(itemIndex, 1);
        } else {
            // Check stock availability
            const products = getProducts();
            const product = products.find(p => p.id === productId);
            
            if (product && newQuantity > product.quantity) {
                alert('Not enough stock available!');
                return;
            }
            
            cart[itemIndex].quantity = newQuantity;
        }
        
        saveCart(cart);
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.productId !== productId);
    saveCart(cart);
    updateCartDisplay();
}

function checkout() {
    const activeShift = getActiveShift();
    if (!activeShift) {
        alert('Please start a shift before making sales!');
        return;
    }

    const cart = getCart();
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const products = getProducts();
    
    // Check stock availability
    for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product || product.quantity < item.quantity) {
            alert(`Not enough stock for ${item.name}!`);
            return;
        }
    }

    // Process the sale
    const sale = {
        id: Date.now(),
        date: new Date().toISOString(),
        items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        paymentMethod: paymentMethod,
        shiftId: activeShift.id
    };

    // Update stock
    cart.forEach(item => {
        const productIndex = products.findIndex(p => p.id === item.productId);
        if (productIndex !== -1) {
            products[productIndex].quantity -= item.quantity;
        }
    });

    // Save updated products
    saveProducts(products);

    // Record the sale
    const sales = getSales();
    sales.push(sale);
    saveSales(sales);

    // Record for current shift
    activeShift.sales.push(sale.id);
    activeShift.total += sale.total;
    if (paymentMethod === 'cash') {
        activeShift.cashTotal += sale.total;
    } else {
        activeShift.momoTotal += sale.total;
    }
    saveActiveShift(activeShift);

    // Clear the cart
    saveCart([]);
    updateCartDisplay();

    // Show receipt
    showReceipt(sale);

    // Reload products to update stock display
    loadProducts();
    
    // Check for low stock
    checkLowStock();
}

// Receipt Tab Functions
function initReceiptsTab() {
    // Set up date filter
    document.getElementById('filter-receipts-btn').addEventListener('click', loadReceipts);
    
    // Set today's date as default filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('receipt-date-filter').value = today;
}

function loadReceipts() {
    const receiptsList = document.getElementById('receipts-list');
    receiptsList.innerHTML = '';

    const dateFilter = document.getElementById('receipt-date-filter').value;
    const sales = getSales();

    // Filter sales by date if filter is set
    const filteredSales = dateFilter 
        ? sales.filter(sale => sale.date.split('T')[0] === dateFilter)
        : sales;

    if (filteredSales.length === 0) {
        receiptsList.innerHTML = '<p class="no-receipts">No receipts found for this date.</p>';
        return;
    }

    // Display receipts in reverse chronological order
    filteredSales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
        const receiptItem = document.createElement('div');
        receiptItem.className = 'receipt-item';
        receiptItem.innerHTML = `
            <h3>Receipt #${sale.id}</h3>
            <p><i class="far fa-clock"></i> ${new Date(sale.date).toLocaleString()}</p>
            <p><i class="fas fa-money-bill-wave"></i> ${sale.total} RWF (${sale.paymentMethod.toUpperCase()})</p>
            <p><i class="fas fa-boxes"></i> ${sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
        `;
        
        receiptItem.addEventListener('click', () => showReceipt(sale));
        receiptsList.appendChild(receiptItem);
    });
}

function showReceipt(sale) {
    const modal = document.getElementById('receipt-modal');
    const receiptContent = document.getElementById('receipt-content');
    
    // Format receipt content
    let itemsHtml = '';
    sale.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price} RWF</td>
                <td>${item.price * item.quantity} RWF</td>
            </tr>
        `;
    });

    receiptContent.innerHTML = `
        <h2><i class="fas fa-receipt"></i> Receipt #${sale.id}</h2>
        <p><i class="far fa-clock"></i> ${new Date(sale.date).toLocaleString()}</p>
        <p><i class="fas fa-money-bill-wave"></i> Payment Method: ${sale.paymentMethod.toUpperCase()}</p>
        <p><i class="fas fa-user-clock"></i> Shift ID: ${sale.shiftId || 'N/A'}</p>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right;"><strong>Grand Total:</strong></td>
                    <td><strong>${sale.total} RWF</strong></td>
                </tr>
            </tfoot>
        </table>
    `;

    // Set up copy receipt button
    document.getElementById('copy-receipt-btn').onclick = function() {
        const receiptText = `Receipt #${sale.id}\nDate: ${new Date(sale.date).toLocaleString()}\nPayment Method: ${sale.paymentMethod.toUpperCase()}\nShift ID: ${sale.shiftId || 'N/A'}\n\nItems:\n${
            sale.items.map(item => `${item.name} - ${item.quantity} × ${item.price} RWF = ${item.price * item.quantity} RWF`).join('\n')
        }\n\nGrand Total: ${sale.total} RWF`;
        
        navigator.clipboard.writeText(receiptText).then(() => {
            alert('Receipt copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy receipt: ', err);
            alert('Failed to copy receipt. Please try again.');
        });
    };

    modal.style.display = 'block';
}

// Close modal when clicking the X
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('receipt-modal').style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('receipt-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Summary Tab Functions
function initSummaryTab() {
    // Set up date range filter
    document.getElementById('filter-summary-btn').addEventListener('click', loadSummary);
    
    // Set default date range (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('start-date').value = today;
    document.getElementById('end-date').value = today;
}

function loadSummary() {
    const summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = '';

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const sales = getSales();

    // Filter sales by date range
    const filteredSales = sales.filter(sale => {
        const saleDate = sale.date.split('T')[0];
        return (!startDate || saleDate >= startDate) && (!endDate || saleDate <= endDate);
    });

    if (filteredSales.length === 0) {
        summaryContent.innerHTML = '<p class="no-summary">No sales found for this date range.</p>';
        return;
    }

    // Calculate summary data
    const cashTotal = filteredSales
        .filter(sale => sale.paymentMethod === 'cash')
        .reduce((sum, sale) => sum + sale.total, 0);

    const momoTotal = filteredSales
        .filter(sale => sale.paymentMethod === 'momo')
        .reduce((sum, sale) => sum + sale.total, 0);

    const grandTotal = cashTotal + momoTotal;
    const transactionCount = filteredSales.length;

    // Calculate item breakdown
    const itemBreakdown = {};
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemBreakdown[item.name]) {
                itemBreakdown[item.name] = {
                    quantity: 0,
                    total: 0,
                    price: item.price
                };
            }
            itemBreakdown[item.name].quantity += item.quantity;
            itemBreakdown[item.name].total += item.quantity * item.price;
        });
    });

    // Format item breakdown table
    let itemsHtml = '';
    for (const [name, data] of Object.entries(itemBreakdown)) {
        itemsHtml += `
            <tr>
                <td>${name}</td>
                <td>${data.quantity}</td>
                <td>${data.price} RWF</td>
                <td>${data.total} RWF</td>
            </tr>
        `;
    }

    // Display summary
    summaryContent.innerHTML = `
        <div class="summary-item">
            <h3><i class="fas fa-chart-pie"></i> Sales Summary</h3>
            <p><i class="far fa-calendar-alt"></i> Date Range: ${startDate} to ${endDate}</p>
            <p><i class="fas fa-exchange-alt"></i> Total Transactions: ${transactionCount}</p>
            <p><i class="fas fa-money-bill-wave"></i> Cash Total: ${cashTotal} RWF</p>
            <p><i class="fas fa-mobile-alt"></i> MoMo Total: ${momoTotal} RWF</p>
            <p><i class="fas fa-coins"></i> Grand Total: ${grandTotal} RWF</p>
        </div>
        
        <div class="summary-item">
            <h3><i class="fas fa-box-open"></i> Item Breakdown</h3>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>
    `;
}

// Stock Management Tab Functions
function initStockTab() {
    // Set up add item button
    document.getElementById('add-item-btn').addEventListener('click', addStockItem);
    
    // Load stock items
    loadStockItems();
}

function loadStockItems() {
    const stockItemsContainer = document.getElementById('stock-items');
    stockItemsContainer.innerHTML = '';

    const products = getProducts();
    
    if (products.length === 0) {
        stockItemsContainer.innerHTML = '<p class="no-items">No items in stock. Add some items to get started.</p>';
        return;
    }

    products.forEach(product => {
        const stockItem = document.createElement('div');
        stockItem.className = 'stock-item';
        stockItem.innerHTML = `
            <span>${product.name}</span>
            <span>${product.price} RWF</span>
            <span class="${product.quantity < 5 ? 'low-stock' : ''}">${product.quantity} ${product.quantity < 5 ? '(Low)' : ''}</span>
            <button class="edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="delete-btn" data-id="${product.id}"><i class="fas fa-trash"></i> Delete</button>
        `;
        
        stockItemsContainer.appendChild(stockItem);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            editStockItem(productId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.closest('button').getAttribute('data-id');
            deleteStockItem(productId);
        });
    });
}

function checkLowStock() {
    const lowStockAlerts = document.getElementById('low-stock-alerts');
    lowStockAlerts.innerHTML = '';
    
    const products = getProducts();
    const lowStockItems = products.filter(p => p.quantity < 5);
    
    if (lowStockItems.length === 0) {
        return;
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning';
    
    if (lowStockItems.length === 1) {
        alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Low stock alert: ${lowStockItems[0].name} has only ${lowStockItems[0].quantity} left!`;
    } else {
        const itemsList = lowStockItems.map(item => `${item.name} (${item.quantity})`).join(', ');
        alertDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Low stock alert for ${lowStockItems.length} items: ${itemsList}`;
    }
    
    lowStockAlerts.appendChild(alertDiv);
}

function addStockItem() {
    const nameInput = document.getElementById('item-name');
    const priceInput = document.getElementById('item-price');
    const quantityInput = document.getElementById('item-quantity');
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value);
    const quantity = parseInt(quantityInput.value);

    if (!name || isNaN(price) || isNaN(quantity)) {
        alert('Please fill in all fields with valid values!');
        return;
    }

    if (price <= 0 || quantity <= 0) {
        alert('Price and quantity must be positive numbers!');
        return;
    }

    const products = getProducts();
    
    // Check if item already exists
    const existingItem = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingItem) {
        if (confirm('Item already exists. Do you want to update its stock instead?')) {
            existingItem.quantity += quantity;
            saveProducts(products);
            loadStockItems();
            checkLowStock();
            
            // Clear inputs
            nameInput.value = '';
            priceInput.value = '';
            quantityInput.value = '';
            return;
        } else {
            return;
        }
    }

    // Add new item
    products.push({
        id: Date.now(),
        name: name,
        price: price,
        quantity: quantity,
        image: ''
    });

    saveProducts(products);
    loadStockItems();
    checkLowStock();
    
    // Clear inputs
    nameInput.value = '';
    priceInput.value = '';
    quantityInput.value = '';
}

function editStockItem(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === parseInt(productId));
    
    if (!product) return;

    const newName = prompt('Enter new name:', product.name);
    if (newName === null) return;
    
    const newPrice = parseFloat(prompt('Enter new price:', product.price));
    if (isNaN(newPrice) || newPrice <= 0) {
        alert('Price must be a positive number!');
        return;
    }
    
    const newQuantity = parseInt(prompt('Enter new quantity:', product.quantity));
    if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Quantity must be a positive number!');
        return;
    }

    product.name = newName;
    product.price = newPrice;
    product.quantity = newQuantity;

    saveProducts(products);
    loadStockItems();
    loadProducts(); // Update POS display
    checkLowStock();
}

function deleteStockItem(productId) {
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;

    const products = getProducts();
    const updatedProducts = products.filter(p => p.id !== parseInt(productId));
    
    saveProducts(updatedProducts);
    loadStockItems();
    loadProducts(); // Update POS display
    checkLowStock();
}

function getProducts() {
    const products = localStorage.getItem('bakeryPosProducts');
    return products ? JSON.parse(products) : [];
}

function saveProducts(products) {
    localStorage.setItem('bakeryPosProducts', JSON.stringify(products));
}

// Shift Management Tab Functions
function initShiftTab() {
    // Set up shift buttons
    document.getElementById('start-shift-btn').addEventListener('click', startShift);
    document.getElementById('end-shift-btn').addEventListener('click', endShift);
    document.getElementById('send-whatsapp-btn').addEventListener('click', sendWhatsAppSummary);
}

function checkActiveShift() {
    const activeShift = getActiveShift();
    const shiftStatus = document.getElementById('shift-status');
    const startBtn = document.getElementById('start-shift-btn');
    const endBtn = document.getElementById('end-shift-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const shiftAlert = document.getElementById('shift-closed-alert');
    
    if (activeShift) {
        shiftStatus.className = 'shift-status shift-on';
        shiftStatus.innerHTML = `<i class="fas fa-user-clock"></i> Shift: Active (Started ${new Date(activeShift.startTime).toLocaleTimeString()})`;
        startBtn.disabled = true;
        endBtn.disabled = false;
        checkoutBtn.disabled = getCart().length === 0;
        shiftAlert.style.display = 'none';
    } else {
        shiftStatus.className = 'shift-status shift-off';
        shiftStatus.innerHTML = '<i class="fas fa-user-clock"></i> Shift: Not Started';
        startBtn.disabled = false;
        endBtn.disabled = true;
        checkoutBtn.disabled = true;
        if (getCart().length > 0) {
            shiftAlert.style.display = 'block';
        }
    }
}

function startShift() {
    const activeShift = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        endTime: null,
        sales: [],
        cashTotal: 0,
        momoTotal: 0,
        total: 0
    };

    saveActiveShift(activeShift);
    checkActiveShift();
    updateShiftDisplay();
    
    // Show notification
    alert(`Shift #${activeShift.id} started at ${new Date(activeShift.startTime).toLocaleTimeString()}`);
}

function endShift() {
    const activeShift = getActiveShift();
    if (!activeShift) return;

    if (getCart().length > 0) {
        if (!confirm('You have items in the cart. Are you sure you want to end the shift?')) {
            return;
        }
    }

    activeShift.endTime = new Date().toISOString();
    saveActiveShift(activeShift);

    // Save to shift history
    const shiftHistory = getShiftHistory();
    shiftHistory.push(activeShift);
    saveShiftHistory(shiftHistory);

    // Clear active shift
    localStorage.removeItem('bakeryPosActiveShift');

    checkActiveShift();
    updateShiftDisplay();
    
    // Show WhatsApp button
    document.getElementById('whatsapp-section').style.display = 'block';
    
    // Show notification
    alert(`Shift #${activeShift.id} ended at ${new Date(activeShift.endTime).toLocaleTimeString()}\nTotal Sales: ${activeShift.total} RWF`);
}

function updateShiftDisplay() {
    const shiftSummary = document.getElementById('shift-summary');
    const activeShift = getActiveShift();

    if (activeShift) {
        const sales = getSales().filter(sale => activeShift.sales.includes(sale.id));
        
        // Calculate item breakdown
        const itemBreakdown = {};
        sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!itemBreakdown[item.name]) {
                    itemBreakdown[item.name] = {
                        quantity: 0,
                        total: 0
                    };
                }
                itemBreakdown[item.name].quantity += item.quantity;
                itemBreakdown[item.name].total += item.quantity * item.price;
            });
        });

        // Format item breakdown table
        let itemsHtml = '';
        for (const [name, data] of Object.entries(itemBreakdown)) {
            itemsHtml += `
                <tr>
                    <td>${name}</td>
                    <td>${data.quantity}</td>
                    <td>${data.total} RWF</td>
                </tr>
            `;
        }

        shiftSummary.innerHTML = `
            <h3><i class="fas fa-clipboard-list"></i> Current Shift Summary</h3>
            <p><i class="fas fa-id-badge"></i> Shift ID: ${activeShift.id}</p>
            <p><i class="fas fa-play"></i> Started: ${new Date(activeShift.startTime).toLocaleString()}</p>
            <p><i class="fas fa-coins"></i> Total Sales: ${activeShift.total} RWF</p>
            <p><i class="fas fa-money-bill-wave"></i> Cash: ${activeShift.cashTotal} RWF</p>
            <p><i class="fas fa-mobile-alt"></i> MoMo: ${activeShift.momoTotal} RWF</p>
            <p><i class="fas fa-exchange-alt"></i> Transactions: ${activeShift.sales.length}</p>
            
            <h4><i class="fas fa-box-open"></i> Item Breakdown</h4>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        `;
    } else {
        const shiftHistory = getShiftHistory();
        if (shiftHistory.length > 0) {
            const lastShift = shiftHistory[shiftHistory.length - 1];
            shiftSummary.innerHTML = `
                <h3><i class="fas fa-clipboard-list"></i> Last Shift Summary</h3>
                <p><i class="fas fa-id-badge"></i> Shift ID: ${lastShift.id}</p>
                <p><i class="fas fa-play"></i> Started: ${new Date(lastShift.startTime).toLocaleString()}</p>
                <p><i class="fas fa-stop"></i> Ended: ${new Date(lastShift.endTime).toLocaleString()}</p>
                <p><i class="fas fa-coins"></i> Total Sales: ${lastShift.total} RWF</p>
                <p><i class="fas fa-money-bill-wave"></i> Cash: ${lastShift.cashTotal} RWF</p>
                <p><i class="fas fa-mobile-alt"></i> MoMo: ${lastShift.momoTotal} RWF</p>
                <p><i class="fas fa-exchange-alt"></i> Transactions: ${lastShift.sales.length}</p>
            `;
        } else {
            shiftSummary.innerHTML = '<p class="no-shift">No active shift. Start a new shift to track sales.</p>';
        }
    }
}

function sendWhatsAppSummary() {
    const shiftHistory = getShiftHistory();
    if (shiftHistory.length === 0) {
        alert('No shift history found!');
        return;
    }

    const lastShift = shiftHistory[shiftHistory.length - 1];
    const sales = getSales().filter(sale => lastShift.sales.includes(sale.id));
    
    // Calculate item breakdown
    const itemBreakdown = {};
    sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemBreakdown[item.name]) {
                itemBreakdown[item.name] = {
                    quantity: 0,
                    total: 0
                };
            }
            itemBreakdown[item.name].quantity += item.quantity;
            itemBreakdown[item.name].total += item.quantity * item.price;
        });
    });

    // Format summary message
    let message = `*🍞 Bakery Shift Summary 🍞*\n\n`;
    message += `*Shift ID:* ${lastShift.id}\n`;
    message += `*Start Time:* ${new Date(lastShift.startTime).toLocaleString()}\n`;
    message += `*End Time:* ${new Date(lastShift.endTime).toLocaleString()}\n\n`;
    message += `*Total Sales:* ${lastShift.total} RWF\n`;
    message += `- 💵 Cash: ${lastShift.cashTotal} RWF\n`;
    message += `- 📱 MoMo: ${lastShift.momoTotal} RWF\n`;
    message += `*Transactions:* ${lastShift.sales.length}\n\n`;
    message += `*Item Breakdown:*\n`;
    
    for (const [name, data] of Object.entries(itemBreakdown)) {
        message += `- ${name}: ${data.quantity} × ${(data.total/data.quantity).toFixed(2)} RWF = ${data.total} RWF\n`;
    }

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
}

function getActiveShift() {
    const activeShift = localStorage.getItem('bakeryPosActiveShift');
    return activeShift ? JSON.parse(activeShift) : null;
}

function saveActiveShift(shift) {
    localStorage.setItem('bakeryPosActiveShift', JSON.stringify(shift));
}

function getShiftHistory() {
    const history = localStorage.getItem('bakeryPosShiftHistory');
    return history ? JSON.parse(history) : [];
}

function saveShiftHistory(history) {
    localStorage.setItem('bakeryPosShiftHistory', JSON.stringify(history));
}

// Sales Data Functions
function getSales() {
    const sales = localStorage.getItem('bakeryPosSales');
    return sales ? JSON.parse(sales) : [];
}

function saveSales(sales) {
    localStorage.setItem('bakeryPosSales', JSON.stringify(sales));
}

// Initialize with sample data if empty
function initializeSampleData() {
    if (localStorage.getItem('bakeryPosInitialized')) return;

    const sampleProducts = [
        { id: 1, name: "Bread", price: 1000, quantity: 20, image: "https://via.placeholder.com/200?text=Bread" },
        { id: 2, name: "Croissant", price: 1500, quantity: 15, image: "https://via.placeholder.com/200?text=Croissant" },
        { id: 3, name: "Cake", price: 5000, quantity: 5, image: "https://via.placeholder.com/200?text=Cake" },
        { id: 4, name: "Donut", price: 800, quantity: 30, image: "https://via.placeholder.com/200?text=Donut" },
        { id: 5, name: "Cookie", price: 300, quantity: 50, image: "https://via.placeholder.com/200?text=Cookie" }
    ];

    saveProducts(sampleProducts);
    localStorage.setItem('bakeryPosInitialized', 'true');
}

// Call initialization
initializeSampleData();