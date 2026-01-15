/**
 * Main application logic
 */
let trendChart = null;
let currentTimeframe = 'all_time';
let currentPlayerId = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayers();
    
    const loadStatsBtn = document.getElementById('loadStatsBtn');
    loadStatsBtn.addEventListener('click', loadPlayerStats);
    
    const playerSelect = document.getElementById('playerSelect');
    playerSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPlayerStats();
        }
    });
    
    // Setup timeframe selector
    setupTimeframeSelector();
});

async function loadPlayers() {
    try {
        showLoading(true);
        const data = await api.getPlayers();
        const select = document.getElementById('playerSelect');
        
        select.innerHTML = '<option value="">Select a player...</option>';
        data.players.forEach(playerId => {
            const option = document.createElement('option');
            option.value = playerId;
            option.textContent = playerId.substring(0, 20) + '...';
            select.appendChild(option);
        });
        
        // Auto-select first player if available
        if (data.players.length > 0) {
            select.value = data.players[0];
        }
    } catch (error) {
        showError('Failed to load players: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function setupTimeframeSelector() {
    const buttons = document.querySelectorAll('.timeframe-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update timeframe and reload stats
            currentTimeframe = btn.dataset.timeframe;
            if (currentPlayerId) {
                loadPlayerStats();
            }
        });
    });
}

async function loadPlayerStats() {
    const playerSelect = document.getElementById('playerSelect');
    const playerId = playerSelect.value;
    
    if (!playerId) {
        showError('Please select a player');
        return;
    }
    
    currentPlayerId = playerId;
    
    try {
        showLoading(true);
        hideError();
        
        // Load stats with current timeframe
        const [avgHsRate, stability, matches] = await Promise.all([
            api.getAvgHsRate(playerId, currentTimeframe),
            api.getStability(playerId, currentTimeframe),
            api.getMatches(playerId, 100, currentTimeframe)  // Get more matches for filtering
        ]);
        
        // Check if this is an empty timeframe (no matches)
        const isEmpty = stability.empty || matches.empty || matches.count === 0;
        
        // Display average HS rate (handles empty state)
        displayAverageHsRate(avgHsRate, isEmpty);
        
        // Display stability analysis (handles empty state)
        displayStabilityAnalysis(stability, isEmpty);
        
        // Display recent matches (handles empty state)
        displayRecentMatches(matches, isEmpty);
        
        showStats();
    } catch (error) {
        showError('Failed to load stats: ' + error.message);
        console.error('Error loading stats:', error);
    } finally {
        showLoading(false);
    }
}

function displayAverageHsRate(data, isEmpty = false) {
    if (data.error) {
        showError(data.error);
        return;
    }
    
    const hsRateEl = document.getElementById('hsRate');
    const sublabel = document.getElementById('hsRateSublabel');
    
    if (isEmpty || data.empty) {
        hsRateEl.textContent = '—';
        hsRateEl.classList.add('muted-value');
        sublabel.textContent = 'No data for ' + getTimeframeLabel(currentTimeframe);
    } else {
        hsRateEl.textContent = data.avg_hs_rate.toFixed(1) + '%';
        hsRateEl.classList.remove('muted-value');
        sublabel.textContent = getTimeframeLabel(currentTimeframe) + ' Average';
    }
}

function getTimeframeLabel(timeframe) {
    const labels = {
        'today': 'Today',
        'yesterday': 'Yesterday',
        'week': 'Week',
        'month': 'Month',
        'season': 'Season',
        'all_time': 'All Time'
    };
    return labels[timeframe] || 'Average';
}

function displayStabilityAnalysis(data, isEmpty = false) {
    const stabilityCard = document.getElementById('stabilityCard');
    const stabilityScoreEl = document.getElementById('stabilityScore');
    const stabilityBadgeEl = document.getElementById('stabilityBadge');
    const stabilityLabelEl = document.getElementById('stabilityLabel');
    const stabilityDescriptionEl = document.getElementById('stabilityDescription');
    const volatilityEl = document.getElementById('volatility');
    const avgHsRateEl = document.getElementById('avgHsRate');
    const matchCountEl = document.getElementById('matchCount');
    
    if (isEmpty || data.empty || data.match_count === 0) {
        // Empty state - show muted placeholders
        stabilityScoreEl.textContent = '—';
        stabilityScoreEl.style.color = '#666666';
        stabilityScoreEl.classList.add('muted-value');
        
        stabilityLabelEl.textContent = 'No Data';
        stabilityBadgeEl.style.backgroundColor = '#666666';
        stabilityBadgeEl.style.color = '#FFFFFF';
        
        stabilityDescriptionEl.textContent = 'No matches played during this time frame.';
        
        volatilityEl.textContent = '—';
        avgHsRateEl.textContent = '—';
        matchCountEl.textContent = '0';
        
        // Show empty chart placeholder
        updateTrendChartEmpty();
    } else {
        // Normal state with data
        stabilityScoreEl.classList.remove('muted-value');
        
        // Update score (now 0-100 integer)
        stabilityScoreEl.textContent = data.score;
        stabilityScoreEl.style.color = data.color;
        
        // Update badge
        stabilityLabelEl.textContent = data.label;
        stabilityBadgeEl.style.backgroundColor = data.color;
        stabilityBadgeEl.style.color = '#FFFFFF';
        
        // Update description
        stabilityDescriptionEl.textContent = data.description;
        
        // Update details
        volatilityEl.textContent = data.volatility + '%';
        avgHsRateEl.textContent = (data.avg_hs_rate || data.current_hs_rate) + '%';
        matchCountEl.textContent = data.match_count;
        
        // Update chart with filtered data
        updateTrendChart(data.trend);
    }
}

function displayRecentMatches(data, isEmpty = false) {
    const matchesList = document.getElementById('matchesList');
    matchesList.innerHTML = '';
    
    if (isEmpty || !data.matches || data.matches.length === 0) {
        matchesList.innerHTML = `
            <div class="empty-matches-state">
                <p class="empty-message">No matches played during this time frame</p>
                <p class="empty-hint">Try selecting a different time period above</p>
            </div>
        `;
        return;
    }
    
    data.matches.forEach((match, index) => {
        const matchItem = document.createElement('div');
        matchItem.className = 'match-item';
        
        matchItem.innerHTML = `
            <div>
                <div class="match-item-label">Match ${data.count - index}</div>
                <div class="match-item-value">${new Date(match.match_date).toLocaleDateString()}</div>
            </div>
            <div>
                <div class="match-item-label">HS Rate</div>
                <div class="match-item-value">${match.hs_rate.toFixed(1)}%</div>
            </div>
            <div>
                <div class="match-item-label">Kills</div>
                <div class="match-item-value">${match.total_kills}</div>
            </div>
            <div>
                <div class="match-item-label">Total Shots</div>
                <div class="match-item-value">${match.total_shots}</div>
            </div>
        `;
        
        matchesList.appendChild(matchItem);
    });
}

function updateTrendChart(trendData) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const chartContainer = document.getElementById('trendChart').parentElement;
    
    // Remove empty state class if present
    chartContainer.classList.remove('chart-empty');
    
    // Destroy existing chart if it exists
    if (trendChart) {
        trendChart.destroy();
    }
    
    const labels = trendData.dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString();
    });
    
    // Use new color palette
    const redHighlight = '#ff5052';
    const redHighlightLight = 'rgba(255, 80, 82, 0.1)';
    const successColor = '#10B981';
    const successColorLight = 'rgba(16, 185, 129, 0.1)';
    const textSecondary = '#B8B8B8';
    const borderColor = '#1e2d3d';
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Stability Score (0-100)',
                    data: trendData.stability_scores,  // Already 0-100 scale
                    borderColor: redHighlight,
                    backgroundColor: redHighlightLight,
                    tension: 0.4,
                    yAxisID: 'y',
                    borderWidth: 2
                },
                {
                    label: 'HS Rate (%)',
                    data: trendData.hs_rates,
                    borderColor: successColor,
                    backgroundColor: successColorLight,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textSecondary
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#15202e',
                    borderColor: borderColor,
                    borderWidth: 1,
                    titleColor: '#FFFFFF',
                    bodyColor: textSecondary,
                    padding: 12
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textSecondary
                    },
                    grid: {
                        color: borderColor
                    },
                    border: {
                        color: borderColor
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Stability Score (0-100)',
                        color: redHighlight
                    },
                    ticks: {
                        color: textSecondary
                    },
                    grid: {
                        color: borderColor
                    },
                    border: {
                        color: borderColor
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'HS Rate (%)',
                        color: successColor
                    },
                    ticks: {
                        color: textSecondary
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    border: {
                        color: borderColor
                    }
                }
            }
        }
    });
}

function updateTrendChartEmpty() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const chartContainer = document.getElementById('trendChart').parentElement;
    
    // Destroy existing chart if it exists
    if (trendChart) {
        trendChart.destroy();
        trendChart = null;
    }
    
    // Add empty state styling to container
    chartContainer.classList.add('chart-empty');
    
    // Create an empty chart with placeholder grid
    const textSecondary = '#B8B8B8';
    const borderColor = '#1e2d3d';
    const mutedColor = '#666666';
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['', '', '', '', ''],
            datasets: [
                {
                    label: 'Stability Score (0-100)',
                    data: [],
                    borderColor: mutedColor,
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y',
                    borderWidth: 1
                },
                {
                    label: 'HS Rate (%)',
                    data: [],
                    borderColor: mutedColor,
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: mutedColor
                    }
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: mutedColor
                    },
                    grid: {
                        color: borderColor
                    },
                    border: {
                        color: borderColor,
                        dash: [4, 4]
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Stability Score (0-100)',
                        color: mutedColor
                    },
                    ticks: {
                        color: mutedColor
                    },
                    grid: {
                        color: borderColor
                    },
                    border: {
                        color: borderColor,
                        dash: [4, 4]
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'HS Rate (%)',
                        color: mutedColor
                    },
                    ticks: {
                        color: mutedColor
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    border: {
                        color: borderColor,
                        dash: [4, 4]
                    }
                }
            }
        }
    });
}

function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
}

function showStats() {
    document.getElementById('statsContent').style.display = 'block';
}

function hideStats() {
    document.getElementById('statsContent').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}
