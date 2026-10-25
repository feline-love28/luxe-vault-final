/**
 * Luxe Vault - Clothes Catalog & Detail Module
 * Dynamic multi-filtering, search, sorting, and multi-image gallery detail page rendering.
 */

// Active filter state
const catalogState = {
    search: "",
    category: "all",
    size: "all",
    gender: "all",
    color: "all",
    availability: "all",
    maxPrice: 3000,
    sortBy: "default"
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. PRODUCTS CATALOG PAGE INITIALIZATION
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        initProductsCatalog();
    }

    // 2. PRODUCT DETAILS PAGE INITIALIZATION
    const productDetailsWrapper = document.getElementById('product-details-content');
    if (productDetailsWrapper) {
        initProductDetailsPage();
    }

    // 3. HOME PAGE FEATURED CLOTHES GRID
    const homeFeaturedGrid = document.getElementById('home-featured-grid');
    if (homeFeaturedGrid) {
        loadHomeFeaturedClothes();
    }
});

// -------------------------------------------------------------
// 1. PRODUCTS CATALOG FUNCTIONALITY
// -------------------------------------------------------------
async function initProductsCatalog() {
    setupFilterEventListeners();
    await fetchAndRenderClothes();
}

async function fetchAndRenderClothes() {
    const productsGrid = document.getElementById('products-grid');
    const resultsCountEl = document.getElementById('results-count');

    if (!productsGrid) return;

    // Show loading state
    productsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0;">
            <div class="spinner"></div>
            <p style="color:var(--text-muted); font-weight:500;">Loading Luxe Vault collection...</p>
        </div>
    `;

    try {
        const clothes = await apiService.clothes.getAll(catalogState);

        if (resultsCountEl) {
            resultsCountEl.textContent = `Showing ${clothes.length} items`;
        }

        if (clothes.length === 0) {
            productsGrid.innerHTML = `
                <div style="grid-column: 1 / -1;" class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No Clothes Found</h3>
                    <p style="color:var(--text-muted); margin-bottom:1.5rem;">We couldn't find any clothing items matching your active search or filter criteria.</p>
                    <button onclick="resetAllFilters()" class="btn btn-primary btn-sm">Reset All Filters</button>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = clothes.map(item => createClothingCardHTML(item)).join('');

    } catch (err) {
        console.error("Error fetching clothes catalog:", err);
        productsGrid.innerHTML = `
            <div style="grid-column: 1 / -1;" class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Failed to Load Clothes</h3>
                <p style="color:var(--text-muted);">${err.message}</p>
            </div>
        `;
    }
}

function setupFilterEventListeners() {
    // Real-time Search Input (Case Insensitive)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                catalogState.search = e.target.value;
                fetchAndRenderClothes();
            }, 200);
        });
    }

    // Category Filter Radios
    const categoryInputs = document.querySelectorAll('input[name="filter-category"]');
    categoryInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            catalogState.category = e.target.value;
            fetchAndRenderClothes();
        });
    });

    // Size Filter
    const sizeInputs = document.querySelectorAll('input[name="filter-size"]');
    sizeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            catalogState.size = e.target.value;
            fetchAndRenderClothes();
        });
    });

    // Gender Filter
    const genderInputs = document.querySelectorAll('input[name="filter-gender"]');
    genderInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            catalogState.gender = e.target.value;
            fetchAndRenderClothes();
        });
    });

    // Availability Filter
    const availInputs = document.querySelectorAll('input[name="filter-availability"]');
    availInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            catalogState.availability = e.target.value;
            fetchAndRenderClothes();
        });
    });

    // Price Range Slider
    const priceSlider = document.getElementById('price-slider');
    const priceValDisplay = document.getElementById('price-slider-val');
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            catalogState.maxPrice = val;
            if (priceValDisplay) priceValDisplay.textContent = formatCurrency(val);
            fetchAndRenderClothes();
        });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            catalogState.sortBy = e.target.value;
            fetchAndRenderClothes();
        });
    }

    // Clear Filters Button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', resetAllFilters);
    }
}

function resetAllFilters() {
    catalogState.search = "";
    catalogState.category = "all";
    catalogState.size = "all";
    catalogState.gender = "all";
    catalogState.color = "all";
    catalogState.availability = "all";
    catalogState.maxPrice = 3000;
    catalogState.sortBy = "default";

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = "";

    const priceSlider = document.getElementById('price-slider');
    if (priceSlider) priceSlider.value = 3000;
    const priceValDisplay = document.getElementById('price-slider-val');
    if (priceValDisplay) priceValDisplay.textContent = formatCurrency(3000);

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = "default";

    document.querySelectorAll('input[type="radio"][value="all"]').forEach(r => r.checked = true);

    fetchAndRenderClothes();
    showToast("Filters reset", "info");
}

// -------------------------------------------------------------
// 2. PRODUCT DETAILS PAGE WITH MULTI-IMAGE GALLERY
// -------------------------------------------------------------
async function initProductDetailsPage() {
    const container = document.getElementById('product-details-content');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 1;

    try {
        container.innerHTML = `
            <div style="text-align:center; padding:5rem 0;">
                <div class="spinner"></div>
                <p>Loading outfit details...</p>
            </div>
        `;

        const item = await apiService.clothes.getById(productId);
        const isAvailable = item.availability === "Available";
        const galleryImages = item.images && item.images.length > 0 ? item.images : [item.image];

        container.innerHTML = `
            <div class="product-details-grid">
                <!-- Gallery Column -->
                <div class="product-gallery">
                    <img src="${galleryImages[0]}" id="main-product-img-el" alt="${item.name}" class="main-product-img">
                    
                    <!-- Thumbnails bar -->
                    ${galleryImages.length > 1 ? `
                        <div class="product-gallery-thumbnails" style="display:flex; gap:0.65rem; margin-top:0.75rem;">
                            ${galleryImages.map((imgUrl, idx) => `
                                <img src="${imgUrl}" 
                                     class="gallery-thumb ${idx === 0 ? 'active' : ''}" 
                                     style="width:75px; height:90px; object-fit:cover; border-radius:var(--radius-sm); border:2px solid ${idx === 0 ? 'var(--primary-900)' : 'var(--border-color)'}; cursor:pointer; transition:var(--transition);" 
                                     onclick="switchMainProductImage('${imgUrl}', this)">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- Product Details Column -->
                <div class="product-info-column">
                    <span class="product-category-badge">${item.category}</span>
                    <h1 class="product-detail-title">${item.name}</h1>
                    
                    <div class="product-detail-meta">
                        <span class="card-rating" style="font-size:1.1rem;">★ ${item.rating}</span>
                        <span>(${item.reviewsCount} customer reviews)</span>
                        <span class="badge ${isAvailable ? 'badge-available' : 'badge-rented'}">${item.availability}</span>
                    </div>

                    <!-- Price Card -->
                    <div class="detail-price-card">
                        <div class="detail-price-item">
                            <span class="label">Daily Rental Rate</span>
                            <span class="val">${formatCurrency(item.rentalPrice)} <span style="font-size:0.9rem;font-weight:500;">/ day</span></span>
                        </div>
                        <div class="detail-price-item" style="text-align:right;">
                            <span class="label">Security Deposit (Refundable)</span>
                            <span class="val" style="font-size:1.3rem; color:var(--text-muted);">${formatCurrency(item.securityDeposit)}</span>
                        </div>
                    </div>

                    <p style="font-size:1rem; color:var(--text-body); line-height:1.7;">
                        ${item.description}
                    </p>

                    <!-- Specs Grid -->
                    <div class="specs-grid">
                        <div class="spec-item">
                            <span class="label">Size</span>
                            <span class="val">${item.size}</span>
                        </div>
                        <div class="spec-item">
                            <span class="label">Gender Section</span>
                            <span class="val">${item.gender}</span>
                        </div>
                        <div class="spec-item">
                            <span class="label">Color</span>
                            <span class="val">${item.color}</span>
                        </div>
                        <div class="spec-item">
                            <span class="label">Care Instructions</span>
                            <span class="val">Professional Dry Clean Included</span>
                        </div>
                    </div>

                    <!-- Highlights Features -->
                    <div>
                        <h4 style="font-size:0.95rem; font-weight:700; margin-bottom:0.6rem;">Key Highlights:</h4>
                        <ul class="features-list">
                            ${(item.features || ["100% Inspected Quality", "Sanitized & Pressed"]).map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>

                    <!-- Action CTA -->
                    <div style="margin-top:1.5rem; display:flex; gap:1rem;">
                        ${isAvailable 
                            ? `<a href="rental.html?id=${item.id}" class="btn btn-accent btn-lg btn-full">Proceed to Rent (${formatCurrency(item.rentalPrice)}/day)</a>`
                            : `<button class="btn btn-outline btn-lg btn-full" disabled style="opacity:0.6; cursor:not-allowed;">Currently Rented Out</button>`
                        }
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error("Product detail render error:", err);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h2>Product Not Found</h2>
                <p style="color:var(--text-muted); margin-bottom:1.5rem;">The requested clothing item could not be retrieved.</p>
                <a href="products.html" class="btn btn-primary">Back to Catalog</a>
            </div>
        `;
    }
}

// Global Image Thumbnail Switcher
function switchMainProductImage(imgUrl, thumbEl) {
    const mainImg = document.getElementById('main-product-img-el');
    if (mainImg) mainImg.src = imgUrl;

    const allThumbs = document.querySelectorAll('.gallery-thumb');
    allThumbs.forEach(t => {
        t.style.borderColor = 'var(--border-color)';
    });
    if (thumbEl) thumbEl.style.borderColor = 'var(--primary-900)';
}

// -------------------------------------------------------------
// 3. HOME PAGE FEATURED SECTION
// -------------------------------------------------------------
async function loadHomeFeaturedClothes() {
    const homeFeaturedGrid = document.getElementById('home-featured-grid');
    if (!homeFeaturedGrid) return;

    try {
        const clothes = await apiService.clothes.getAll();
        const featured = clothes.slice(0, 4);
        homeFeaturedGrid.innerHTML = featured.map(item => createClothingCardHTML(item)).join('');
    } catch (err) {
        console.error("Failed to load featured items:", err);
    }
}
