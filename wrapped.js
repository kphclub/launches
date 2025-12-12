document.addEventListener('DOMContentLoaded', function () {
  const apiUrl = 'https://kph-mafia.microcompany.workers.dev/api/products';
  const statsApiUrl =
    'https://kph-mafia.microcompany.workers.dev/api/products/stats';
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const cardsWrapper = document.getElementById('cards-wrapper');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressDots = document.getElementById('progress-dots');
  const shareBtns = document.querySelectorAll('.share-btn');
  const toast = document.getElementById('toast');

  let allProducts = [];
  let categoryData = null;
  let aiProducts = [];
  let currentCardIndex = 0;
  const totalCards = 10;

  // Story auto-advance settings
  const STORY_DURATION = 6000; // 6 seconds per card
  let storyTimer = null;
  let isPaused = false;
  let pauseStartTime = 0;
  let remainingTime = STORY_DURATION;
  // Initialize progress dots with fill elements
  function initProgressDots() {
    progressDots.innerHTML = '';
    for (let i = 0; i < totalCards; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.innerHTML = '<div class="dot-fill"></div>';
      dot.style.setProperty('--duration', `${STORY_DURATION}ms`);
      dot.addEventListener('click', () => goToCard(i));
      progressDots.appendChild(dot);
    }
  }

  // Start auto-advance timer
  function startStoryTimer() {
    clearTimeout(storyTimer);
    remainingTime = STORY_DURATION;
    isPaused = false;

    storyTimer = setTimeout(() => {
      if (currentCardIndex < totalCards - 1) {
        goToCard(currentCardIndex + 1);
      } else {
        // Loop back to start or stop
        goToCard(0);
      }
    }, STORY_DURATION);
  }

  // Pause story
  function pauseStory() {
    if (isPaused) return;
    isPaused = true;
    pauseStartTime = Date.now();
    clearTimeout(storyTimer);

    const activeDot = progressDots.querySelector('.progress-dot.active');
    if (activeDot) {
      activeDot.classList.add('paused');
    }
  }

  // Resume story
  function resumeStory() {
    if (!isPaused) return;
    isPaused = false;

    const pausedDuration = Date.now() - pauseStartTime;
    remainingTime = Math.max(0, remainingTime - pausedDuration);

    const activeDot = progressDots.querySelector('.progress-dot.active');
    if (activeDot) {
      activeDot.classList.remove('paused');
    }

    storyTimer = setTimeout(() => {
      if (currentCardIndex < totalCards - 1) {
        goToCard(currentCardIndex + 1);
      } else {
        goToCard(0);
      }
    }, remainingTime);
  }

  // Update progress dots with animation
  function updateProgressDots() {
    const dots = progressDots.children;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const fill = dot.querySelector('.dot-fill');

      dot.classList.remove('completed', 'active', 'paused');

      if (i < currentCardIndex) {
        dot.classList.add('completed');
        if (fill) fill.style.width = '100%';
      } else if (i === currentCardIndex) {
        dot.classList.add('active');
        if (fill) {
          fill.style.width = '';
          // Reset animation
          fill.style.animation = 'none';
          fill.offsetHeight; // Trigger reflow
          fill.style.animation = '';
        }
      } else {
        if (fill) fill.style.width = '0%';
      }
    }
  }

  // Navigate to specific card
  function goToCard(index) {
    // Loop around for continuous navigation
    if (index < 0) {
      index = totalCards - 1;
    } else if (index >= totalCards) {
      index = 0;
    }

    const cards = document.querySelectorAll('.card-container');
    currentCardIndex = index;

    cards.forEach((card, i) => {
      card.classList.remove('active', 'hidden-left', 'hidden-right');
      if (i < currentCardIndex) {
        card.classList.add('hidden-left');
      } else if (i > currentCardIndex) {
        card.classList.add('hidden-right');
      } else {
        card.classList.add('active');
        // Trigger counter animation for current card
        animateCounters(card);
        // Reset and replay all animations on this card
        resetAnimations(card);
      }
    });

    // Navigation buttons always enabled for looping
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    updateProgressDots();
    startStoryTimer();
  }

  // Animate counter numbers
  function animateCounters(card) {
    const counters = card.querySelectorAll('.counter');
    counters.forEach((counter) => {
      const target = parseInt(counter.dataset.target) || 0;
      const duration = 1500;
      const startTime = performance.now();
      const startValue = 0;

      function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(
          startValue + (target - startValue) * easeOutQuart
        );
        counter.textContent = currentValue.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      }

      requestAnimationFrame(updateCounter);
    });
  }

  // Reset and replay animations on card
  function resetAnimations(card) {
    const animatedElements = card.querySelectorAll('.anim-element');
    animatedElements.forEach((el) => {
      // Get current animation classes
      const classes = el.className;
      // Force reflow by removing and re-adding animation classes
      el.style.animation = 'none';
      el.offsetHeight; // Trigger reflow
      el.style.animation = '';
    });
  }

  // Calculate longest shipping streak
  function calculateStreak(dailyCounts) {
    const dates = Object.keys(dailyCounts).sort();
    if (dates.length === 0) return { days: 0, startDate: null, endDate: null };

    let maxStreak = 0;
    let currentStreak = 0;
    let streakStart = dates[0];
    let bestStreakStart = dates[0];
    let bestStreakEnd = dates[0];
    let prevDate = null;

    dates.forEach((dateStr) => {
      const currentDate = new Date(dateStr);

      if (prevDate) {
        const diffDays = Math.round(
          (currentDate - prevDate) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            bestStreakStart = streakStart;
            bestStreakEnd = new Date(prevDate).toISOString().split('T')[0];
          }
          currentStreak = 1;
          streakStart = dateStr;
        }
      } else {
        currentStreak = 1;
        streakStart = dateStr;
      }

      prevDate = currentDate;
    });

    // Check last streak
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      bestStreakStart = streakStart;
      bestStreakEnd = dates[dates.length - 1];
    }

    return {
      days: maxStreak,
      startDate: bestStreakStart,
      endDate: bestStreakEnd,
    };
  }

  // Calculate weekend vs weekday stats
  function calculateWeekendStats(products) {
    let weekendCount = 0;
    let weekdayCount = 0;

    products.forEach((product) => {
      const dateStr = product.Date;
      if (dateStr) {
        const date = new Date(dateStr);
        const day = date.getDay();
        if (day === 0 || day === 6) {
          weekendCount++;
        } else {
          weekdayCount++;
        }
      }
    });

    const total = weekendCount + weekdayCount;
    const weekendPercent =
      total > 0 ? Math.round((weekendCount / total) * 100) : 0;

    return {
      weekendCount,
      weekdayCount,
      weekendPercent,
    };
  }

  // Calculate stats from products
  function calculateStats(products) {
    const stats = {
      totalProducts: products.length,
      totalMakers: 0,
      busiestMonth: { month: '', count: 0 },
      favoriteWeekday: { day: '', count: 0, percentage: 0 },
      weekdayCounts: {},
      topShippers: [],
      dailyCounts: {},
      monthlyCounts: {},
      streak: { days: 0, startDate: null, endDate: null },
      weekend: { weekendCount: 0, weekdayCount: 0, weekendPercent: 0 },
    };

    // Track makers
    const makers = {};
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayFull = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const weekdayCounts = {
      Sun: 0,
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
    };
    const dailyCounts = {};

    products.forEach((product) => {
      // Count makers
      const maker = product['Maker'];
      if (maker) {
        makers[maker] = (makers[maker] || 0) + 1;
      }

      // Count by date and weekday
      const dateStr = product['Date'];
      if (dateStr) {
        const date = new Date(dateStr);
        const dateKey = date.toISOString().split('T')[0];
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;

        const dayIndex = date.getDay();
        weekdayCounts[weekdays[dayIndex]]++;
      }
    });

    // Total unique makers
    stats.totalMakers = Object.keys(makers).length;

    // Busiest day
    let maxDate = '';
    let maxCount = 0;
    Object.entries(dailyCounts).forEach(([date, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxDate = date;
      }
    });
    stats.dailyCounts = dailyCounts;

    // Calculate monthly counts
    const monthlyCounts = {};
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    products.forEach((product) => {
      const dateStr = product['Date'];
      if (dateStr) {
        const date = new Date(dateStr);
        const monthIndex = date.getMonth();
        const monthName = monthNames[monthIndex];
        monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
      }
    });

    // Find busiest month
    let busiestMonth = '';
    let busiestMonthCount = 0;
    Object.entries(monthlyCounts).forEach(([month, count]) => {
      if (count > busiestMonthCount) {
        busiestMonthCount = count;
        busiestMonth = month;
      }
    });
    stats.busiestMonth = { month: busiestMonth, count: busiestMonthCount };
    stats.monthlyCounts = monthlyCounts;

    // Favorite weekday
    let maxWeekday = '';
    let maxWeekdayCount = 0;
    Object.entries(weekdayCounts).forEach(([day, count]) => {
      if (count > maxWeekdayCount) {
        maxWeekdayCount = count;
        maxWeekday = day;
      }
    });
    const weekdayIndex = weekdays.indexOf(maxWeekday);
    stats.favoriteWeekday = {
      day: weekdayFull[weekdayIndex] || maxWeekday,
      count: maxWeekdayCount,
      percentage:
        products.length > 0
          ? Math.round((maxWeekdayCount / products.length) * 100)
          : 0,
    };
    stats.weekdayCounts = weekdayCounts;

    // Top shippers with shared medals for ties (based on score tiers)
    const sortedMakers = Object.entries(makers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Get unique score tiers for medal assignment
    const uniqueScores = [...new Set(sortedMakers.map(([, count]) => count))];
    const scoreTiers = {};
    uniqueScores.forEach((score, idx) => {
      scoreTiers[score] = idx + 1; // tier 1, 2, 3...
    });

    stats.topShippers = sortedMakers.map(([maker, count], index) => {
      const tier = scoreTiers[count];

      // Assign medal based on score tier
      let medal = '';
      if (tier === 1) medal = '🥇';
      else if (tier === 2) medal = '🥈';
      else if (tier === 3) medal = '🥉';

      return { maker, count, rank: index + 1, medal };
    });

    // Calculate new stats
    stats.streak = calculateStreak(dailyCounts);
    stats.weekend = calculateWeekendStats(products);

    return stats;
  }

  // Render stats to cards
  function renderStats(stats) {
    // Card 1: Total Products
    const totalProductsEl = document.getElementById('stat-total-products');
    if (totalProductsEl) {
      totalProductsEl.dataset.target = stats.totalProducts;
    }

    // Card 2: Total Makers
    const totalMakersEl = document.getElementById('stat-total-makers');
    if (totalMakersEl) {
      totalMakersEl.dataset.target = stats.totalMakers;
    }

    // Card 3: Busiest Month
    const busiestMonthEl = document.getElementById('stat-busiest-month');
    const busiestCountEl = document.getElementById('stat-busiest-count');
    if (busiestMonthEl && stats.busiestMonth.month) {
      busiestMonthEl.textContent = stats.busiestMonth.month;
    }
    if (busiestCountEl) {
      busiestCountEl.dataset.target = stats.busiestMonth.count;
    }

    // Card 4: Favorite Weekday
    const favoriteDayEl = document.getElementById('stat-favorite-day');
    const dayPercentageEl = document.getElementById('stat-day-percentage');
    const weekdayBarsEl = document.getElementById('weekday-bars');

    if (favoriteDayEl) {
      favoriteDayEl.textContent = stats.favoriteWeekday.day;
    }
    if (dayPercentageEl) {
      dayPercentageEl.textContent = `${stats.favoriteWeekday.percentage}% of all launches`;
    }
    if (weekdayBarsEl) {
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const maxCount = Math.max(...Object.values(stats.weekdayCounts));
      weekdayBarsEl.innerHTML = weekdays
        .map((day, index) => {
          const count = stats.weekdayCounts[day] || 0;
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const isMax = count === maxCount && count > 0;
          const delay = 0.1 * index;
          return `
          <div class="flex items-center gap-2 anim-element animate-fade-up" style="animation-delay: ${delay}s">
            <span class="w-8 text-xs text-white/60">${day}</span>
            <div class="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full ${
                isMax ? 'bg-white' : 'bg-white/40'
              } rounded-full animate-bar" style="width: ${width}%; animation-delay: ${
            delay + 0.2
          }s"></div>
            </div>
            <span class="w-8 text-xs text-white/60 text-right">${count}</span>
          </div>
        `;
        })
        .join('');
    }

    // Card 5: Top Shippers
    const topShippersEl = document.getElementById('top-shippers');
    if (topShippersEl) {
      topShippersEl.innerHTML = stats.topShippers
        .map(
          (shipper, index) => `
        <div class="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2.5 anim-element animate-fade-up" style="animation-delay: ${
          0.1 * index
        }s">
          <span class="text-xl w-7 ${index < 3 ? 'animate-trophy' : ''}">${
            shipper.medal || shipper.rank
          }</span>
          <p class="flex-1 font-semibold text-white truncate text-base">${
            shipper.maker
          }</p>
          <span class="text-sm text-white/70 whitespace-nowrap">${
            shipper.count
          } products</span>
        </div>
      `
        )
        .join('');
    }

    // Card 6: Heatmap
    renderHeatmap(stats.dailyCounts);

    // Card 7: Streak
    const streakEl = document.getElementById('stat-streak');
    const streakDatesEl = document.getElementById('stat-streak-dates');
    if (streakEl) {
      streakEl.dataset.target = stats.streak.days;
    }
    if (streakDatesEl && stats.streak.startDate && stats.streak.endDate) {
      const start = new Date(stats.streak.startDate).toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric' }
      );
      const end = new Date(stats.streak.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      streakDatesEl.textContent = `${start} - ${end}`;
    }

    // Card 9: Weekend Warriors
    const weekendRatioEl = document.getElementById('stat-weekend-ratio');
    const weekendCountEl = document.getElementById('stat-weekend-count');
    if (weekendRatioEl && stats.weekend.weekendPercent > 0) {
      // Calculate "1 in X" ratio from percentage
      const ratio = Math.round(100 / stats.weekend.weekendPercent);
      weekendRatioEl.textContent = ratio;
    }
    if (weekendCountEl) {
      weekendCountEl.textContent = `${stats.weekend.weekendCount} products on Sat & Sun`;
    }
  }

  // Render category breakdown from stats API
  function renderCategories(categoryBreakdown) {
    const categoryBarsEl = document.getElementById('category-bars');
    const topCategoryEl = document.getElementById('stat-top-category');

    if (!categoryBreakdown) return;

    // Sort categories by count - show 8 categories for better readability
    const sortedCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (sortedCategories.length === 0) return;

    const topCategory = sortedCategories[0];
    const maxCount = topCategory[1];
    const totalProducts = sortedCategories.reduce(
      (sum, [, count]) => sum + count,
      0
    );
    const topPercent = Math.round((topCategory[1] / totalProducts) * 100);

    // Vibrant colors for category bars
    const barColors = [
      'bg-gradient-to-r from-yellow-400 to-orange-400', // #1 - Gold
      'bg-gradient-to-r from-emerald-400 to-teal-400', // #2 - Green
      'bg-gradient-to-r from-pink-400 to-rose-400', // #3 - Pink
      'bg-gradient-to-r from-cyan-400 to-blue-400', // #4 - Blue
      'bg-gradient-to-r from-purple-400 to-violet-400', // #5 - Purple
      'bg-gradient-to-r from-amber-400 to-yellow-400', // #6 - Amber
      'bg-gradient-to-r from-lime-400 to-green-400', // #7 - Lime
      'bg-gradient-to-r from-fuchsia-400 to-pink-400', // #8 - Fuchsia
    ];

    if (categoryBarsEl) {
      categoryBarsEl.innerHTML = sortedCategories
        .map(([category, count], index) => {
          const width = Math.max(25, (count / maxCount) * 100); // Min 25% width for readability
          const isTop = index === 0;
          // Shorten long category names
          const shortName =
            category.length > 16 ? category.substring(0, 14) + '...' : category;
          const colorClass = barColors[index] || barColors[0];
          const delay = 0.1 * index;
          return `
          <div class="flex items-center gap-3 anim-element animate-fade-up" style="animation-delay: ${delay}s">
            <span class="w-32 text-sm font-medium text-white truncate" title="${category}">${shortName}</span>
            <div class="flex-1 h-7 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full ${colorClass} rounded-full animate-bar flex items-center justify-end pr-3" style="width: ${width}%; animation-delay: ${
            delay + 0.2
          }s">
                <span class="text-sm font-bold text-white drop-shadow-md">${count}</span>
              </div>
            </div>
          </div>
        `;
        })
        .join('');
    }
  }

  // Render AI trend chart
  function renderAITrendChart(aiProductsList, totalProducts) {
    const chartEl = document.getElementById('ai-trend-chart');
    const aiCountEl = document.getElementById('stat-ai-count');

    if (!chartEl || !aiProductsList || aiProductsList.length === 0) return;

    // Update AI count
    if (aiCountEl) {
      aiCountEl.textContent = aiProductsList.length;
    }

    // Group AI products by month
    const monthCounts = {};
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Initialize all months with 0
    months.forEach((m) => (monthCounts[m] = 0));

    aiProductsList.forEach((product) => {
      const dateStr = product.createdAt;
      if (dateStr) {
        const date = new Date(dateStr);
        const monthIndex = date.getMonth();
        const monthName = months[monthIndex];
        monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
      }
    });

    // Get current month to limit display
    const today = new Date();
    const currentMonthIndex = today.getMonth();
    const displayMonths = months.slice(0, currentMonthIndex + 1);
    const data = displayMonths.map((m) => monthCounts[m] || 0);

    // Create chart
    const ctx = chartEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: displayMonths,
        datasets: [
          {
            data: data,
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fbbf24',
            pointBorderColor: '#fbbf24',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} AI products`;
              },
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { display: false },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              font: { size: 10 },
            },
          },
          y: {
            display: false,
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Render GitHub-style heatmap (7 rows for days of week, columns for weeks)
  function renderHeatmap(dailyCounts) {
    const heatmapContainer = document.getElementById('github-heatmap');
    if (!heatmapContainer) return;

    const today = new Date();
    const currentYear = 2025;
    const startDate = new Date(currentYear, 0, 1); // Jan 1, 2025
    const endDate = new Date(currentYear, 11, 31); // Dec 31, 2025

    // Determine max count for color intensity
    const maxCount = Math.max(1, ...Object.values(dailyCounts));

    // Build all days of the year starting from Jan 1, 2025
    const allDays = [];

    // Generate dates using string format to avoid timezone issues
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(month + 1).padStart(
          2,
          '0'
        )}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(currentYear, month, day);
        const count = dailyCounts[dateKey] || 0;
        const isInRange = dateObj <= today;
        allDays.push({ date: dateKey, count, isInRange, month });
      }
    }

    // Group into rows of 7 days each (starting from Jan 1, not Sunday)
    const rows = [];
    for (let i = 0; i < allDays.length; i += 7) {
      rows.push(allDays.slice(i, i + 7));
    }

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    // Use smaller cells: 7px with 1px gap to fit all rows with spacing
    const cellSize = 7;
    const gap = 1;

    let html =
      '<div class="flex flex-col items-center" style="gap: ' + gap + 'px;">';

    // Track which month we're in for labels
    let lastMonth = -1;

    // Render each row (7 days per row, starting from Jan 1)
    rows.forEach((row) => {
      const firstDay = row[0];
      const month = firstDay.month;

      // Check if we should show month label (first occurrence of this month)
      let monthLabel = '';
      if (month !== lastMonth) {
        monthLabel = months[month];
        lastMonth = month;
      }

      html += '<div class="flex items-center" style="gap: ' + gap + 'px;">';
      html += `<div style="width: 24px;" class="text-[7px] text-white/40 text-right pr-1">${monthLabel}</div>`;

      row.forEach((cell) => {
        const intensity =
          cell.count > 0 ? Math.ceil((cell.count / maxCount) * 4) : 0;
        const colorClass = !cell.isInRange
          ? 'bg-white/5'
          : intensity === 0
          ? 'bg-white/10'
          : intensity === 1
          ? 'bg-emerald-900'
          : intensity === 2
          ? 'bg-emerald-700'
          : intensity === 3
          ? 'bg-emerald-500'
          : 'bg-emerald-300';

        html += `<div style="width: ${cellSize}px; height: ${cellSize}px;" class="rounded-[2px] ${colorClass}" title="${
          cell.isInRange ? `${cell.date}: ${cell.count} launches` : ''
        }"></div>`;
      });
      html += '</div>';
    });

    html += '</div>';

    heatmapContainer.innerHTML = html;
  }

  // Download card as image
  async function downloadCard(cardIndex) {
    const card = document.getElementById(`card-${cardIndex}`);
    if (!card) return;

    // Show loading state
    const btn = document.querySelector(`[data-card-index="${cardIndex}"]`);
    const originalHTML = btn.innerHTML;
    btn.innerHTML =
      '<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>';
    btn.disabled = true;

    // Hide share and download buttons for screenshot
    const shareBtn = card.querySelector('.share-btn');
    const downloadBtn = card.querySelector('.download-btn');
    if (shareBtn) shareBtn.style.display = 'none';
    if (downloadBtn) downloadBtn.style.display = 'none';

    // Temporarily disable all animations and force visibility for screenshot
    const animatedElements = card.querySelectorAll(
      '.anim-element, .animate-fade-up, .animate-pop, .animate-glow, .animate-bar, .animate-bounce-slow, .animate-fire, .animate-trophy, .animate-rocket, .animate-robot, .animate-moon'
    );
    const originalStyles = [];
    animatedElements.forEach((el) => {
      originalStyles.push({
        element: el,
        animation: el.style.animation,
        opacity: el.style.opacity,
        transform: el.style.transform,
      });
      el.style.animation = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    try {
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: card.offsetWidth,
        height: card.offsetHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: card.offsetWidth,
        windowHeight: card.offsetHeight,
      });

      const link = document.createElement('a');
      link.download = `kph-wrapped-2025-${cardIndex + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to download:', error);
      showToast('Failed to download image');
    } finally {
      // Restore animation styles
      originalStyles.forEach(({ element, animation, opacity, transform }) => {
        element.style.animation = animation;
        element.style.opacity = opacity;
        element.style.transform = transform;
      });
      // Restore buttons
      if (shareBtn) shareBtn.style.display = '';
      if (downloadBtn) downloadBtn.style.display = '';
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }

  // Share functionality
  async function shareWrapped() {
    const shareData = {
      title: 'KPH 2025 Wrapped',
      text: 'Check out how the KPH maker community shipped in 2025!',
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // User didn't cancel, try clipboard fallback
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Link copied to clipboard!');
        } catch {
          showToast('Failed to share');
        }
      }
    }
  }

  // Show toast notification
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('opacity-0');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
    }, 2000);
  }

  // Event Listeners
  prevBtn.addEventListener('click', () => goToCard(currentCardIndex - 1));
  nextBtn.addEventListener('click', () => goToCard(currentCardIndex + 1));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goToCard(currentCardIndex - 1);
    if (e.key === 'ArrowRight') goToCard(currentCardIndex + 1);
  });

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  cardsWrapper.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  cardsWrapper.addEventListener(
    'touchend',
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goToCard(currentCardIndex + 1);
        } else {
          goToCard(currentCardIndex - 1);
        }
      }
    },
    { passive: true }
  );

  // Download buttons
  document.querySelectorAll('.download-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardIndex = parseInt(btn.dataset.cardIndex);
      downloadCard(cardIndex);
    });
  });

  // Share buttons (on all cards)
  shareBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareWrapped();
    });
  });

  // Click on card to advance
  document.querySelectorAll('.card-container').forEach((container) => {
    container.addEventListener('click', (e) => {
      // Don't advance if clicking buttons
      if (e.target.closest('button')) return;
      goToCard(currentCardIndex + 1);
    });
  });

  // Initialize
  initProgressDots();

  // Pause/resume on mouse/touch interactions
  cardsWrapper.addEventListener('mousedown', pauseStory);
  cardsWrapper.addEventListener('mouseup', resumeStory);
  cardsWrapper.addEventListener('mouseleave', resumeStory);
  cardsWrapper.addEventListener('touchstart', pauseStory, { passive: true });
  cardsWrapper.addEventListener('touchend', resumeStory, { passive: true });

  // Fetch both APIs in parallel
  Promise.all([
    fetch(apiUrl).then((res) => res.json()),
    fetch(statsApiUrl)
      .then((res) => res.json())
      .catch(() => null),
  ])
    .then(([productsData, statsData]) => {
      if (
        productsData.result === 'success' &&
        Array.isArray(productsData.data)
      ) {
        allProducts = productsData.data;
        const stats = calculateStats(allProducts);
        renderStats(stats);

        // Render category data from stats API
        if (
          statsData &&
          statsData.success &&
          statsData.data &&
          statsData.data.summary
        ) {
          categoryData = statsData.data.summary.categoryBreakdown;
          renderCategories(categoryData);
        }

        // Render AI trend chart from stats API
        if (
          statsData &&
          statsData.success &&
          statsData.data &&
          statsData.data.categories &&
          statsData.data.categories.AI
        ) {
          aiProducts = statsData.data.categories.AI;
          renderAITrendChart(aiProducts, allProducts.length);
        }

        // Hide loading, show first card
        loadingEl.classList.add('hidden');
        goToCard(0);
      } else {
        throw new Error('Invalid data');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      loadingEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
    });
});
