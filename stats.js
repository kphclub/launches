function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  if (!value) return '#';
  const raw = String(value).trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '#';
    return url.href;
  } catch (e) {
    return '#';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const apiUrl = 'https://kph.shyjal.com/api/products';
  const leaderboardListEl = document.getElementById('leaderboard-list');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const logoEl = document.getElementById('logo');
  const pageTitleEl = document.getElementById('page-title');
  const statsOverviewEl = document.getElementById('stats-overview');
  const tabMostLaunches = document.getElementById('tab-most-launches');
  const tabRecentLaunches = document.getElementById('tab-recent-launches');
  const leaderboardTitle = document.getElementById('leaderboard-title');
  const leaderboardSubtitle = document.getElementById('leaderboard-subtitle');
  const fullLeaderboardEl = document.getElementById('full-leaderboard');
  const tabSwitcherEl = document.querySelector(
    '.flex.border-b.border-gray-200.mb-6'
  );
  const monthlyChartContainerEl = document.getElementById(
    'monthly-chart-container'
  );
  const monthlyChartEl = document.getElementById('monthly-launches-chart');
  const topProductsEl = document.getElementById('top-products');
  const topProductsListEl = document.getElementById('top-products-list');
  const topMakersEl = document.getElementById('top-makers');
  const topMakersListEl = document.getElementById('top-makers-list');

  let allProducts = [];
  let allMakers = [];
  let recentMakers = [];
  let currentTab = 'most-launches';
  let monthlyChart = null;

  // Hide leaderboard, tab switcher, and chart initially while loading
  if (fullLeaderboardEl) {
    fullLeaderboardEl.style.display = 'none';
  }
  if (tabSwitcherEl) {
    tabSwitcherEl.style.display = 'none';
  }
  if (monthlyChartContainerEl) {
    monthlyChartContainerEl.style.display = 'none';
  }

  // Function to clear search
  function clearSearch() {
    if (searchInput) {
      searchInput.value = '';
      const currentMakers =
        currentTab === 'most-launches' ? allMakers : recentMakers;
      renderLeaderboard(currentMakers, currentTab);
      if (clearSearchBtn) {
        clearSearchBtn.classList.add('hidden');
      }
    }
  }

  // Add event listeners for clear functionality
  if (logoEl) {
    logoEl.addEventListener('click', clearSearch);
  }

  if (pageTitleEl) {
    pageTitleEl.addEventListener('click', clearSearch);
  }

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

  // Function to calculate all makers with their stats
  function calculateAllMakers(products) {
    const makerCounts = {};

    products.forEach((product) => {
      const maker = product['Maker'];
      if (maker) {
        makerCounts[maker] = (makerCounts[maker] || 0) + 1;
      }
    });

    return Object.entries(makerCounts)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .map(([maker, count]) => ({ maker, count }));
  }

  // Function to calculate recent makers (sorted by most recent launch)
  function calculateRecentMakers(products) {
    const makerLastLaunch = {};
    const makerCounts = {};

    products.forEach((product) => {
      const maker = product['Maker'];
      const dateStr = product['Date']; // Fixed: use 'Date' instead of 'Launch Date'
      if (maker && dateStr) {
        const launchDate = new Date(dateStr);
        if (!makerLastLaunch[maker] || launchDate > makerLastLaunch[maker]) {
          makerLastLaunch[maker] = launchDate;
        }
        makerCounts[maker] = (makerCounts[maker] || 0) + 1;
      }
    });

    return Object.entries(makerLastLaunch)
      .sort(([, a], [, b]) => b - a) // Sort by most recent date
      .map(([maker, lastLaunchDate]) => ({
        maker,
        count: makerCounts[maker],
        lastLaunchDate: lastLaunchDate,
      }));
  }

  // Function to pick the products with the most reactions
  function calculateTopProducts(products, limit = 5) {
    return products
      .filter((product) => product['Product Link'])
      .sort((a, b) => (b['Reaction Count'] ?? 0) - (a['Reaction Count'] ?? 0))
      .slice(0, limit);
  }

  // Function to rank makers by the total reactions across their launches
  function calculateTopMakers(products, limit = 5) {
    const makerStats = {};

    products.forEach((product) => {
      const maker = product['Maker'];
      if (!maker || maker === 'Unknown') return;
      makerStats[maker] = makerStats[maker] || { maker, reactions: 0, count: 0 };
      makerStats[maker].reactions += product['Reaction Count'] ?? 0;
      makerStats[maker].count += 1;
    });

    return Object.values(makerStats)
      .sort((a, b) => b.reactions - a.reactions || b.count - a.count)
      .slice(0, limit);
  }

  // Function to count launches in each month of 2026, leaving future months empty
  function calculateMonthlyLaunches(products) {
    const counts = Array(12).fill(0);
    products.forEach((product) => {
      const dateStr = product['Date'];
      if (dateStr) counts[new Date(dateStr).getMonth()] += 1;
    });

    const today = new Date();
    const isCurrentYear = today.getFullYear() === 2026;
    const lastMonth = isCurrentYear ? today.getMonth() : 11;

    return counts.map((count, month) => ({
      month,
      count: month <= lastMonth ? count : null,
      inProgress: isCurrentYear && month === lastMonth,
    }));
  }

  // Function to create and render the monthly launches chart
  function renderMonthlyChart(monthlyData) {
    if (!monthlyChartEl || monthlyData.length === 0) return;

    if (monthlyChart) {
      monthlyChart.destroy();
    }

    const monthName = (month, style) =>
      new Date(2026, month, 1).toLocaleDateString('en-US', { month: style });

    monthlyChart = new Chart(monthlyChartEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: monthlyData.map((item) => monthName(item.month, 'short')),
        datasets: [
          {
            data: monthlyData.map((item) => item.count),
            backgroundColor: monthlyData.map((item) =>
              item.inProgress ? 'rgba(255, 97, 84, 0.45)' : '#ff6154'
            ),
            hoverBackgroundColor: monthlyData.map((item) =>
              item.inProgress ? 'rgba(255, 97, 84, 0.6)' : '#e5564a'
            ),
            borderRadius: 4,
            categoryPercentage: 0.8,
            barPercentage: 0.9,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            displayColors: false,
            filter: (context) => context.raw !== null,
            callbacks: {
              title: () => '',
              label: function (context) {
                const item = monthlyData[context.dataIndex];
                const count = context.parsed.y;
                return `${monthName(item.month, 'long')}${
                  item.inProgress ? ' so far' : ''
                }: ${count} launch${count !== 1 ? 'es' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#9CA3AF',
            },
          },
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',
            },
            ticks: {
              color: '#9CA3AF',
              maxTicksLimit: 5,
              precision: 0,
            },
          },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      },
    });

    if (monthlyChartContainerEl) {
      monthlyChartContainerEl.style.display = 'block';
    }
  }

  // Function to switch tabs
  function switchTab(tabName) {
    currentTab = tabName;

    // Update tab appearance
    if (tabMostLaunches && tabRecentLaunches) {
      if (tabName === 'most-launches') {
        tabMostLaunches.classList.add('border-primary', 'text-primary');
        tabMostLaunches.classList.remove('border-transparent', 'text-gray-500');
        tabRecentLaunches.classList.add('border-transparent', 'text-gray-500');
        tabRecentLaunches.classList.remove('border-primary', 'text-primary');
      } else {
        tabRecentLaunches.classList.add('border-primary', 'text-primary');
        tabRecentLaunches.classList.remove(
          'border-transparent',
          'text-gray-500'
        );
        tabMostLaunches.classList.add('border-transparent', 'text-gray-500');
        tabMostLaunches.classList.remove('border-primary', 'text-primary');
      }
    }

    // Update leaderboard title and subtitle based on active tab
    if (leaderboardTitle && leaderboardSubtitle) {
      if (tabName === 'most-launches') {
        leaderboardTitle.textContent = 'Makers with Most Launches in 2026';
        leaderboardSubtitle.textContent =
          'Makers ranked by total number of products launched';
      } else {
        leaderboardTitle.textContent = 'Makers with Recent Launches in 2026';
        leaderboardSubtitle.textContent =
          'Makers sorted by their most recent product launch';
      }
    }

    // Clear search and render appropriate data
    clearSearch();
    const currentMakers =
      tabName === 'most-launches' ? allMakers : recentMakers;
    renderLeaderboard(currentMakers, tabName);
  }

  // Function to render stats overview
  function renderStats(totalMakers, totalProducts) {
    if (!statsOverviewEl) return;

    const totalMakersEl = document.getElementById('total-makers');
    const totalProductsEl = document.getElementById('total-products');
    const avgProductsEl = document.getElementById('avg-products');

    if (totalMakersEl) totalMakersEl.textContent = totalMakers;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (avgProductsEl) {
      // Calculate weeks since January 1, 2026
      const startDate = new Date('2026-01-01');
      const currentDate = new Date();
      const daysDifference = Math.ceil(
        (currentDate - startDate) / (1000 * 60 * 60 * 24)
      );
      const weeksDifference = daysDifference / 7;

      const avgPerWeek =
        weeksDifference > 0 ? (totalProducts / weeksDifference).toFixed(1) : 0;
      avgProductsEl.textContent = avgPerWeek;
    }

    statsOverviewEl.classList.remove('hidden');
  }

  // Function to render the top products card
  function renderTopProducts(products) {
    if (!topProductsEl || !topProductsListEl || products.length === 0) return;

    const medals = ['🥇', '🥈', '🥉'];

    topProductsListEl.innerHTML = products
      .map((product, index) => {
        const productLink = safeUrl(product['Product Link']);
        let domain = '';
        try {
          domain = new URL(productLink).hostname;
        } catch (e) {
          domain = '';
        }
        const launchDate = new Date(product['Date']).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        return `
        <a href="${escapeHtml(productLink)}" target="_blank" rel="noopener" class="flex items-center gap-3 md:gap-4 p-4 md:px-6 hover:bg-gray-50 transition-colors group">
          <div class="text-lg font-bold text-gray-600 min-w-[3rem] flex items-center justify-center">
            ${medals[index] ? `<span class="text-2xl">${medals[index]}</span>` : `<span>${index + 1}</span>`}
          </div>
          <div class="min-w-0 flex-grow">
            <div class="flex items-center font-semibold text-gray-800 text-base md:text-lg group-hover:text-primary">
              <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}" alt="" class="mr-2 h-4 w-4 shrink-0" />
              <span class="truncate">${escapeHtml(product['Product Name'])}</span>
            </div>
            <div class="text-sm text-gray-500 truncate">${escapeHtml(product['Maker'])} · ${launchDate}</div>
          </div>
          <div class="flex items-center gap-1.5 text-gray-700 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="font-semibold">${product['Reaction Count'] ?? 0}</span>
          </div>
        </a>
      `;
      })
      .join('');

    topProductsEl.classList.remove('hidden');
  }

  // Function to render the top makers card
  function renderTopMakers(makers) {
    if (!topMakersEl || !topMakersListEl || makers.length === 0) return;

    const medals = ['🥇', '🥈', '🥉'];

    topMakersListEl.innerHTML = makers
      .map(
        (item, index) => `
        <div class="flex items-center gap-3 md:gap-4 p-4 md:px-6 hover:bg-gray-50 transition-colors cursor-pointer group" data-maker="${escapeHtml(item.maker)}" onclick="goToMakerProducts(this.dataset.maker)">
          <div class="text-lg font-bold text-gray-600 min-w-[3rem] flex items-center justify-center">
            ${medals[index] ? `<span class="text-2xl">${medals[index]}</span>` : `<span>${index + 1}</span>`}
          </div>
          <div class="min-w-0 flex-grow">
            <div class="font-semibold text-gray-800 text-base md:text-lg truncate group-hover:text-primary">${escapeHtml(item.maker)}</div>
            <div class="text-sm text-gray-500">${item.count} launch${item.count !== 1 ? 'es' : ''}</div>
          </div>
          <div class="flex items-center gap-1.5 text-gray-700 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="font-semibold">${item.reactions}</span>
          </div>
        </div>
      `
      )
      .join('');

    topMakersEl.classList.remove('hidden');
  }

  // Function to render full leaderboard
  function renderLeaderboard(makers, tabType = 'most-launches') {
    if (!leaderboardListEl) return;

    if (makers.length === 0) {
      leaderboardListEl.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          No makers found matching your search.
        </div>
      `;
      return;
    }

    const makersWithRanks = makers.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // Helper function to format date
    function formatDate(date) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    leaderboardListEl.innerHTML = makersWithRanks
      .map(
        (item) => `
        <div class="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer" data-maker="${escapeHtml(item.maker)}" onclick="goToMakerProducts(this.dataset.maker)">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-3">
              <div class="text-lg font-bold text-gray-600 min-w-[3rem] flex items-center justify-center">
                <span>${item.rank}</span>
              </div>
            </div>
            <div>
              <div class="font-semibold text-gray-800 text-lg">${escapeHtml(item.maker)}</div>
              <div class="text-sm text-gray-500">
                ${
                  tabType === 'most-launches'
                    ? `${item.count} product${
                        item.count !== 1 ? 's' : ''
                      } launched`
                    : `Last launch: ${formatDate(item.lastLaunchDate)}`
                }
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2 text-gray-400">
            <span class="text-sm hidden md:inline">View products</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `
      )
      .join('');
  }

  // Function to navigate to maker's products on main page
  function goToMakerProducts(makerName) {
    // Navigate to main page with maker search
    const encodedMaker = encodeURIComponent(makerName.replace(/ /g, '-'));
    window.location.href = `index.html#${encodedMaker}`;
  }

  // Make function available globally
  window.goToMakerProducts = goToMakerProducts;

  // Function to filter makers based on search query
  function filterMakers(query) {
    if (!query) {
      return currentTab === 'most-launches' ? allMakers : recentMakers;
    }

    query = query.toLowerCase();
    const sourceData =
      currentTab === 'most-launches' ? allMakers : recentMakers;
    return sourceData.filter((maker) => {
      return maker.maker.toLowerCase().includes(query);
    });
  }

  // Add event listener for search input
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      const query = e.target.value.trim();
      const filteredMakers = filterMakers(query);
      renderLeaderboard(filteredMakers, currentTab);
      toggleClearButton();
    });
  }

  // Add event listeners for tab buttons
  if (tabMostLaunches) {
    tabMostLaunches.addEventListener('click', () => switchTab('most-launches'));
  }

  if (tabRecentLaunches) {
    tabRecentLaunches.addEventListener('click', () =>
      switchTab('recent-launches')
    );
  }

  // Fetch and load data
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
        // Filter products to only include 2026 data
        allProducts = data.data.filter((product) => {
          const dateStr = product['Date'];
          if (!dateStr) return false;
          const year = new Date(dateStr).getFullYear();
          return year === 2026;
        });
        allMakers = calculateAllMakers(allProducts);
        recentMakers = calculateRecentMakers(allProducts);


        // Show leaderboard and tab switcher after data is loaded
        if (fullLeaderboardEl) {
          fullLeaderboardEl.style.display = 'block';
        }
        if (tabSwitcherEl) {
          tabSwitcherEl.style.display = 'flex';
        }

        renderTopProducts(calculateTopProducts(allProducts));
        renderTopMakers(calculateTopMakers(allProducts));

        renderMonthlyChart(calculateMonthlyLaunches(allProducts));

        // Calculate total unique makers (including single-launch makers)
        const uniqueMakerNames = new Set(
          allProducts.map((p) => p['Maker']).filter(Boolean)
        );

        // Render stats overview
        renderStats(uniqueMakerNames.size, allProducts.length);

        // Render full leaderboard (default to most launches tab)
        renderLeaderboard(allMakers, currentTab);
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
