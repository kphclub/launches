document.addEventListener('DOMContentLoaded', function () {
  const apiUrl = 'https://kph-mafia.microcompany.workers.dev/api/products';
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
  const dailyChartContainerEl = document.getElementById(
    'daily-chart-container'
  );
  const dailyChartEl = document.getElementById('daily-launches-chart');

  let allProducts = [];
  let allMakers = [];
  let recentMakers = [];
  let currentTab = 'most-launches';
  let dailyChart = null;

  // Hide leaderboard, tab switcher, and chart initially while loading
  if (fullLeaderboardEl) {
    fullLeaderboardEl.style.display = 'none';
  }
  if (tabSwitcherEl) {
    tabSwitcherEl.style.display = 'none';
  }
  if (dailyChartContainerEl) {
    dailyChartContainerEl.style.display = 'none';
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

  // Function to calculate daily launches for the past month
  function calculateDailyLaunches(products) {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);

    // Create a map to count launches per day
    const dailyCounts = {};

    products.forEach((product) => {
      const dateStr = product['Date'];
      if (dateStr) {
        const launchDate = new Date(dateStr);
        if (launchDate >= oneMonthAgo && launchDate <= today) {
          const dateKey = launchDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        }
      }
    });

    // Generate all dates in the range and fill in missing dates with 0
    const result = [];
    const currentDate = new Date(oneMonthAgo);

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        count: dailyCounts[dateKey] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  // Function to create and render the daily launches chart
  function renderDailyChart(dailyData) {
    if (!dailyChartEl || !dailyData || dailyData.length === 0) return;

    // Destroy existing chart if it exists
    if (dailyChart) {
      dailyChart.destroy();
    }

    const ctx = dailyChartEl.getContext('2d');

    // Prepare data for Chart.js
    const labels = dailyData.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    });

    const data = dailyData.map((item) => item.count);

    dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Launches',
            data: data,
            borderColor: '#ff6154',
            backgroundColor: 'rgba(255, 97, 84, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ff6154',
            pointBorderColor: '#ff6154',
            pointRadius: 2,
            pointHoverRadius: 4,
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
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              title: function (context) {
                const dataIndex = context[0].dataIndex;
                const date = new Date(dailyData[dataIndex].date);
                return date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                });
              },
              label: function (context) {
                const count = context.parsed.y;
                return `${count} launch${count !== 1 ? 'es' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 6,
              color: '#9CA3AF',
            },
          },
          y: {
            beginAtZero: true,
            display: false,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
              borderDash: [5, 5],
            },
            ticks: {
              display: false,
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });

    // Show the chart container
    if (dailyChartContainerEl) {
      dailyChartContainerEl.style.display = 'block';
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
        leaderboardTitle.textContent = 'Makers with Most Launches';
        leaderboardSubtitle.textContent =
          'Makers ranked by total number of products launched';
      } else {
        leaderboardTitle.textContent = 'Makers with Recent Launches';
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
  function renderStats(makers, totalProducts) {
    if (!statsOverviewEl) return;

    const totalMakersEl = document.getElementById('total-makers');
    const totalProductsEl = document.getElementById('total-products');
    const avgProductsEl = document.getElementById('avg-products');

    if (totalMakersEl) totalMakersEl.textContent = makers.length;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (avgProductsEl) {
      // Calculate weeks since January 1, 2025
      const startDate = new Date('2025-01-01');
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

    // Calculate ranks and medals separately
    const makersWithRanks = makers.map((item, index) => {
      const position = index + 1; // Always sequential position numbers

      // Calculate medal rank for most launches tab (consecutive ranks for ties)
      let medalRank = null;
      let medal = '';

      if (tabType === 'most-launches') {
        // Find unique product counts and assign consecutive medal ranks
        const uniqueCounts = [...new Set(makers.map((m) => m.count))].sort(
          (a, b) => b - a
        );
        medalRank = uniqueCounts.indexOf(item.count) + 1;

        if (medalRank === 1) medal = '🥇';
        else if (medalRank === 2) medal = '🥈';
        else if (medalRank === 3) medal = '🥉';
      }

      return {
        ...item,
        rank: position,
        medalRank: medalRank,
        medal: medal,
      };
    });

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
        <div class="flex items-center justify-between p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer" onclick="goToMakerProducts('${
          item.maker
        }')">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-3">
              <div class="text-lg font-bold text-gray-600 min-w-[3rem] flex items-center space-x-1">
                <span>${item.rank}</span>
                ${
                  item.medal ? `<span class="text-xl">${item.medal}</span>` : ''
                }
              </div>
            </div>
            <div>
              <div class="font-semibold text-gray-800 text-lg">${
                item.maker
              }</div>
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
        allProducts = data.data;
        allMakers = calculateAllMakers(allProducts);
        recentMakers = calculateRecentMakers(allProducts);

        // Calculate daily launches data
        const dailyLaunchesData = calculateDailyLaunches(allProducts);

        // Show leaderboard and tab switcher after data is loaded
        if (fullLeaderboardEl) {
          fullLeaderboardEl.style.display = 'block';
        }
        if (tabSwitcherEl) {
          tabSwitcherEl.style.display = 'flex';
        }

        // Render daily chart
        renderDailyChart(dailyLaunchesData);

        // Render stats overview
        renderStats(allMakers, allProducts.length);

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