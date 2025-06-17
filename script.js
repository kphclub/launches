// Function to search by maker name
function searchByMaker(makerName) {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = makerName;
    // Trigger the input event to filter products
    searchInput.dispatchEvent(new Event('input'));

    // Scroll to the top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const apiUrl = 'https://kph-mafia.microcompany.workers.dev/api/products';
  const productListEl = document.getElementById('product-list');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const logoEl = document.getElementById('logo');
  const pageTitleEl = document.getElementById('page-title');

  let allProducts = [];
  let hashSearchFound = false;

  // Function to clear search
  function clearSearch() {
    if (searchInput) {
      searchInput.value = '';
      // Update URL by removing hash
      history.pushState(
        '',
        document.title,
        window.location.pathname + window.location.search
      );
      // Render all products
      renderProducts(allProducts);
      // Hide clear button
      if (clearSearchBtn) {
        clearSearchBtn.classList.add('hidden');
      }
    }
  }

  // Add event listener for logo click
  if (logoEl) {
    logoEl.addEventListener('click', clearSearch);
  }

  // Add event listener for page title click
  if (pageTitleEl) {
    pageTitleEl.addEventListener('click', clearSearch);
  }

  // Add event listener for clear button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  // Function to toggle clear button visibility
  function toggleClearButton() {
    if (clearSearchBtn) {
      if (searchInput && searchInput.value.trim() !== '') {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }
    }
  }

  // Function to update URL hash with search term
  function updateUrlHash(searchTerm) {
    if (searchTerm && searchTerm.trim() !== '') {
      // Replace spaces with hyphens before encoding
      const formatted = searchTerm.replace(/ /g, '-');
      window.location.hash = encodeURIComponent(formatted);
    } else {
      // Remove hash if search is empty
      history.pushState(
        '',
        document.title,
        window.location.pathname + window.location.search
      );
    }
  }

  // Function to get search term from URL hash
  function getSearchFromHash() {
    if (window.location.hash) {
      // Replace hyphens with spaces after decoding
      const decoded = decodeURIComponent(window.location.hash.substring(1));
      return decoded.replace(/-/g, ' ');
    }
    return '';
  }

  // Check if there's a hash in the URL and set search input value immediately
  const hashSearch = getSearchFromHash();
  if (hashSearch && searchInput) {
    searchInput.value = hashSearch;
    hashSearchFound = true;
    toggleClearButton(); // Show clear button if search has value
  }

  // Function to ensure URL has https prefix
  function ensureHttps(url) {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }

  // Function to get month and year from a date
  function getMonthYear(utcDate) {
    if (!utcDate) return 'Current Month';

    try {
      const date = new Date(utcDate);
      if (isNaN(date.getTime())) return 'Current Month';

      // Format as "Month Year" (e.g., "June 2025")
      const options = { month: 'long', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Current Month';
    }
  }

  // Function to format a date from UTC to a readable format
  function formatDate(utcDate) {
    if (!utcDate) return 'Today';

    try {
      const date = new Date(utcDate);
      if (isNaN(date.getTime())) return 'Today';

      // Format date as "Month Day, Year" (e.g., "June 15, 2025")
      const options = { month: 'long', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return 'Today';
    }
  }

  // Function to group products by month
  function groupProductsByMonth(products) {
    const grouped = {};

    products.forEach((product) => {
      const monthYear = getMonthYear(product['Date']);
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(product);
    });

    // Sort months chronologically (most recent first)
    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Current Month') return -1;
        if (b === 'Current Month') return 1;

        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB - dateA;
      })
      .map((month) => ({
        month,
        products: grouped[month],
        count: grouped[month].length,
      }));
  }

  // Function to render filtered products grouped by month
  function renderProducts(products) {
    productListEl.innerHTML = '';

    if (products.length === 0) {
      productListEl.innerHTML =
        '<div class="py-8 text-center text-gray-500">No products found matching your search.</div>';
      return;
    }

    // Group products by month
    const groupedByMonth = groupProductsByMonth(products);

    // Render products by month groups
    groupedByMonth.forEach((group) => {
      // Add month header with count
      productListEl.innerHTML += `
        <div class="py-4">
          <h2 class="text-xl font-semibold text-primary mb-4">${
            group.month
          } <span class="text-sm font-normal text-gray-500">(${
        group.count
      })</span></h2>
          <div class="flex flex-col divide-y divide-gray-100">
            ${renderProductGroup(group.products)}
          </div>
        </div>
      `;
    });
  }

  // Function to render a group of products
  function renderProductGroup(products) {
    let html = '';

    products.forEach((product, index) => {
      // Ensure product link has https
      const productLink = ensureHttps(product['Product Link']);

      // Extract domain for favicon
      let domain = '';
      try {
        domain = new URL(productLink).hostname;
      } catch (e) {
        // If URL parsing fails, use the whole link
        domain = productLink;
      }

      // Get formatted date from the Date key
      const launchDate = formatDate(product['Date']);

      // SVG icon for external link
      const externalLinkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>`;

      html += `
        <div class="flex flex-col md:flex-row items-start md:items-center gap-4 py-6">
            <div class="flex-grow">
                <h2 class="text-base md:text-lg font-semibold mb-1">
                    <a href="${productLink}" target="_blank" class="text-gray-800 hover:text-red-500 inline-flex items-center group">
                      <img src="https://www.google.com/s2/favicons?domain=${domain}" alt="" class="mr-2 h-4 w-4" />
                      ${product['Product Name']}
                      <span class="md:hidden text-gray-500">${externalLinkSvg}</span>
                      <span class="hidden md:inline-block opacity-0 group-hover:opacity-100 text-gray-500 transition-opacity">${externalLinkSvg}</span>
                    </a>
                </h2>
                <div class="text-xs md:text-sm text-gray-500 mb-1">
                  <span class="cursor-pointer hover:text-primary" onclick="searchByMaker('${product['Maker']}')">${product['Maker']}</span>
                </div>
                <p class="text-gray-800 text-sm md:text-base max-w-5xl mb-1">${product['Product Description']}</p>
                <div class="text-xs text-gray-400">${launchDate}</div>
            </div>
            <div class="hidden md:flex ml-auto">
                <a href="${productLink}" target="_blank" class="flex flex-col items-center p-2 border border-gray-200 rounded-lg min-w-[60px] hover:bg-gray-50">
                    <div class="text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </div>
                </a>
            </div>
        </div>
      `;
    });

    return html;
  }

  // Function to filter products based on search query
  function filterProducts(query) {
    if (!query) return allProducts;

    query = query.toLowerCase();
    return allProducts.filter((product) => {
      const name = product['Product Name'].toLowerCase();
      const description = product['Product Description'].toLowerCase();
      const maker = product['Maker'].toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query) ||
        maker.includes(query)
      );
    });
  }

  // Add event listener for search input
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.trim();
      const filteredProducts = filterProducts(query);
      renderProducts(filteredProducts);

      // Update URL hash with search term
      updateUrlHash(query);

      // Toggle clear button visibility
      toggleClearButton();
    });
  }

  fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      loadingEl.style.display = 'none';

      if (data.result === 'success' && Array.isArray(data.data)) {
        // Store all products (removed slice to show all)
        allProducts = data.data;

        // Update the main heading with total count
        const mainHeading = document.querySelector('h1');
        if (mainHeading) {
          mainHeading.innerHTML = `KPH Product Launches - 2025 🚀 <span class="text-sm font-normal text-gray-500">(${allProducts.length})</span>`;
        }

        // If hash search was found on page load, filter products now
        if (hashSearchFound) {
          const filteredProducts = filterProducts(hashSearch);
          renderProducts(filteredProducts);
        } else {
          renderProducts(allProducts);
        }
      } else {
        errorEl.style.display = 'block';
      }
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'block';
    });
});
