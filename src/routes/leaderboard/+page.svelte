<script>
import { onMount } from 'svelte';
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

let users = $state(/** @type {any[]} */ ([]));
let isLoading = $state(true);
let currentPage = $state(1);
let sortBy = $state('coins'); // 'coins', 'hours', or 'referrals'

// Weekly stats for bento box
let weeklyStats = $state(/** @type {Array<{date: string, codeHours: number, artHours: number, totalHours: number, codeProjectBreakdown?: Array<{name: string, hours: number}>, artProjectBreakdown?: Array<{name: string, hours: number}>}> | null} */ (null));
let isLoadingStats = $state(true);
let chartInstance = $state(/** @type {Chart | null} */ (null));
let chartCanvas = $state(/** @type {HTMLCanvasElement | null} */ (null));

async function loadWeeklyStats() {
    try {
        isLoadingStats = true;
        // Get user's timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const response = await fetch('/api/get-weekly-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ timezone })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result && result.success && result.dailyStats) {
                weeklyStats = result.dailyStats;
            } else {
                // User not logged in or no stats available
                weeklyStats = null;
            }
        } else if (response.status === 401) {
            // User not logged in - don't show chart
            weeklyStats = null;
        } else {
            console.error('Failed to load weekly stats:', response.status);
            weeklyStats = null;
        }
    } catch (error) {
        console.error('Error loading weekly stats:', error);
        weeklyStats = null;
    } finally {
        isLoadingStats = false;
    }
}

function updateChart() {
    if (!chartCanvas || !weeklyStats || weeklyStats.length === 0) {
        // Try again after a short delay if canvas isn't ready
        if (weeklyStats && weeklyStats.length > 0 && !isLoadingStats) {
            setTimeout(updateChart, 100);
        }
        return;
    }
    
    // Destroy existing chart if it exists
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    // Prepare data
    const labels = weeklyStats.map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    
    const codeHoursData = weeklyStats.map(day => day.codeHours);
    const artHoursData = weeklyStats.map(day => day.artHours);
    
    // Create chart
    chartInstance = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'code hours',
                    data: codeHoursData,
                    backgroundColor: '#5A9BD4',
                    borderColor: '#5A9BD4',
                    borderWidth: 0
                },
                {
                    label: 'art hours',
                    data: artHoursData,
                    backgroundColor: '#E6819F',
                    borderColor: '#E6819F',
                    borderWidth: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            family: 'Futura, sans-serif',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        family: 'Futura, sans-serif',
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Futura, sans-serif',
                        size: 12
                    },
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const date = new Date(weeklyStats[index].date);
                            return date.toLocaleDateString('en-US', { 
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                            }).toLowerCase();
                        },
                        label: function(context) {
                            const index = context.dataIndex;
                            const day = weeklyStats[index];
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            // Get project breakdown based on dataset
                            let breakdown = [];
                            if (label === 'code hours' && day.codeProjectBreakdown) {
                                breakdown = day.codeProjectBreakdown;
                            } else if (label === 'art hours' && day.artProjectBreakdown) {
                                breakdown = day.artProjectBreakdown;
                            }
                            
                            // If there's a breakdown, show it
                            if (breakdown.length > 0) {
                                if (breakdown.length === 1) {
                                    // Single project: show inline
                                    return `${label}: ${value.toFixed(2)}h (${breakdown[0].name})`;
                                } else {
                                    // Multiple projects: show list
                                    const lines = [`${label}: ${value.toFixed(2)}h`];
                                    breakdown.forEach(project => {
                                        lines.push(`${project.name}: ${project.hours.toFixed(2)}h`);
                                    });
                                    return lines;
                                }
                            } else {
                                return `${label}: ${value.toFixed(2)}h`;
                            }
                        },
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            const day = weeklyStats[index];
                            return `total: ${day.totalHours.toFixed(2)}h`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Futura, sans-serif',
                            size: 11,
                            weight: '600'
                        },
                        color: '#333'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(129, 160, 247, 0.3)'
                    },
                    ticks: {
                        font: {
                            family: 'Futura, sans-serif',
                            size: 10
                        },
                        color: '#333',
                        callback: function(value) {
                            return value + 'h';
                        }
                    }
                }
            }
        }
    });
}

async function loadLeaderboardData() {
    try {
    // Load top users for current page and sort
    const leaderboardResponse = await fetch(`/api/get-users-sorted-by-coins?limit=100&page=${currentPage}&sort=${encodeURIComponent(sortBy)}`);
    
        if (leaderboardResponse.ok) {
            const leaderboardResult = await leaderboardResponse.json();
            if (leaderboardResult && leaderboardResult.userList) {
                users = leaderboardResult.userList;
            }
        } else {
            console.error('Failed to load leaderboard:', leaderboardResponse.status);
        }

    } catch (error) {
        console.error('Error loading leaderboard data:', error);
    } finally {
        isLoading = false;
    }
}

onMount(() => {
    loadLeaderboardData();
    loadWeeklyStats();
    
    // Cleanup chart on unmount
    return () => {
        if (chartInstance) {
            chartInstance.destroy();
        }
    };
});

// Update chart when data changes
$effect(() => {
    if (!isLoadingStats && weeklyStats && weeklyStats.length > 0) {
        // Small delay to ensure canvas is rendered
        setTimeout(updateChart, 50);
    }
});

function nextPage() {
    currentPage = currentPage + 1;
    isLoading = true;
    loadLeaderboardData();
}

/**
 * @param {string} mode
 */
function setSort(mode) {
    if (mode !== 'hours' && mode !== 'coins' && mode !== 'referrals') return;
    sortBy = mode;
    currentPage = 1;
    isLoading = true;
    loadLeaderboardData();
}



function prevPage() {
    if (currentPage > 1) {
        currentPage = currentPage - 1;
        isLoading = true;
        loadLeaderboardData();
    }
}

/**
 * @param {string} username
 */
function viewUserProfile(username) {
  window.location.href = `/u/${username}`;
}
</script>


<svelte:head>
  <title>Leaderboard ✦ Milkyway</title>
</svelte:head>

<main>
    <div class="axolotl-container">
        <img class="axolotl-top" src="/prompts/axolotl.png" alt="axolotl up top"/>
        <a class="back-button" href="/home">← back</a>
        <div class="title-container">
            <h1>stats!</h1>
            
        </div>
        
        <!-- Bento Box: Weekly Stats Chart -->
        {#if isLoadingStats || (weeklyStats && weeklyStats.length > 0)}
            <div class="bento-container">
                <div class="bento-box">
                    <h2>your past week</h2>
                    {#if isLoadingStats}
                        <div class="chart-placeholder">
                            <div class="placeholder-text">loading your coding stats...</div>
                        </div>
                    {:else if weeklyStats && weeklyStats.length > 0}
                        <div class="chart-container">
                            <canvas bind:this={chartCanvas}></canvas>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
        
        <div class="main-container">
            <div class="leaderboard-header">
                <div class="col-rank">#</div>
                <div class="col-name">name</div>
                                <div class="col-hours" role="button" tabindex="0" onclick={() => setSort('hours')}>
									<div class="hours-button">
                                    	<span>hours</span>
                                    	<span class="sort-arrow">{sortBy === 'hours' ? '▾' : ' '}</span>
									</div>
                                </div>
                                <div class="col-coins" role="button" tabindex="0" onclick={() => setSort('coins')}>
									<div class="coins-button">
                                    <span>coins</span>
                                    <span class="sort-arrow">{sortBy === 'coins' ? '▾' : ' '}</span>
									</div>
                                </div>
                                <div class="col-referrals" role="button" tabindex="0" onclick={() => setSort('referrals')}>
									<div class="referrals-button">
                                    <span>referrals</span>
                                    <span class="sort-arrow">{sortBy === 'referrals' ? '▾' : ' '}</span>
									</div>
                                </div>
            </div>
            {#if isLoading}
                <div class="loading">loading...</div>
            {:else if users.length === 0}
                <div class="user">no users found</div>
            {:else}
                <div class="user-container">
                {#each users as u, i}
                    <div onclick={() => viewUserProfile(u.username)} class="user">
                        <div class="col-rank">#{i + 1}</div>
                        <div class="col-name">{u.username}</div>
                        <div class="col-hours">{Math.trunc(u.hours)}</div>
                        <div class="col-coins">{u.coins}</div>
                        <div class="col-referrals">{u.referrals}</div>
                    </div>
                {/each}
                </div>
                <div class="pagination-controls bottom">
                    <button class="pagination-btn" onclick={prevPage} disabled={currentPage === 1}>← Prev</button>
                    <span class="page-indicator">Page {currentPage}</span>
                    <button class="pagination-btn" onclick={nextPage}>Next →</button>
                </div>
            {/if}
        </div>
    </div>
</main>

<style>

    main {
        background-image: url("/milkyway bg.png");
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;

        position: relative;

        overflow-y: auto;
        overflow-x: hidden;
    }
    .main-container {
        margin-top: 20px;
        width: 80%;
        transition: all 0.2s ease;
        font-family: "Futura", sans-serif;
        background-color: #bfd7fb;
        border: 4px solid #81a0f7;
        border-radius: 8px;
        padding: 8px;
    }

    .leaderboard-header {
        display: grid;
        /* rank / name / hours / coins / referrals */
        grid-template-columns: 48px 1fr 120px 120px 120px;
        gap: 12px;
        width: 100%;
        align-items: center;
        margin-bottom: 8px;
        padding: 8px 12px;
        box-sizing: border-box;
    }
    .leaderboard-header .sort-arrow { font-size: 0.9em; }
    .leaderboard-header .col-name { font-weight: 800; justify-self: start; text-align: left; }
    .leaderboard-header .col-hours { font-weight: 800; justify-self: center; text-align: center; }
    .leaderboard-header .col-coins { font-weight: 800; justify-self: center; text-align: center; }
    .leaderboard-header .col-referrals { font-weight: 800; justify-self: center; text-align: center; }

    .user {
        background-color: #d5e2f6;
        border: 2px solid #81a0f7;
        padding-top: 8px;
		padding-bottom: 8px;
		padding-left: 18px;
		padding-right: 10px;
        display: grid;
        grid-template-columns: 48px 1fr 120px 120px 120px;
        gap: 12px;
        font-size: large;
        margin-top: 8px;
        border-radius: 8px;
        align-items: center;
        transition: transform 0.08s ease, box-shadow 0.08s ease;
    }
	.loading {
        background-color: #d5e2f6;
        border: 2px solid #81a0f7;
        padding-top: 10px;
		padding-left: 18px;
		padding-right: 10px;
        display: grid;
        grid-template-columns: 48px 1fr 120px 120px 120px;
        gap: 12px;
        font-size: large;
        margin-top: 8px;
        border-radius: 8px;
        align-items: center;
            transition: transform 0.08s ease, box-shadow 0.08s ease;
    }
	.hours-button, .coins-button, .referrals-button {
		padding: 6px;
		padding-left: 14px;
		padding-right: 16px;
		border-radius: 16px;
		background-color: #d5e2f6;
		border: 3px solid #81a0f7;
	}
	.hours-button:hover, .coins-button:hover, .referrals-button:hover {
		cursor: pointer;
	}
    /* Ensure cell contents are vertically centered within each grid cell */
    .user > div { display: flex; align-items: center; }

    .user .col-name { justify-self: start; text-align: left; font-weight:800; }
    .user .col-hours { justify-self: center; text-align: center; }
    .user .col-coins { justify-self: center; text-align: center; font-weight: 800; }
    .user .col-referrals { justify-self: center; text-align: center; font-weight: 800; }
        .user:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
			cursor: pointer;
        }
    .pagination-controls { display:flex; gap:12px; align-items:center; justify-content:center; margin: 12px 0; }
    .pagination-btn { padding:8px 12px; border-radius:6px; border:2px solid #5A9BD4; background:#73ACE0; color:white; cursor:pointer; }
    .pagination-btn:disabled { opacity:0.4; cursor:not-allowed; }
    .page-indicator { font-weight:700; }
    .axolotl-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
    .title-container {
        margin: 0;
        border: 4px solid #E6819F;
        background-color: #EED4D4;
        padding: 10px;
        border-radius: 8px;
        width: 80%;
        text-align: center;
    }
    
    .bento-container {
        width: 80%;
        margin-top: 20px;
    }
    
    .bento-box {
        background-color: #bfd7fb;
        border: 4px solid #81a0f7;
        border-radius: 8px;
        padding: 20px;
        font-family: "Futura", sans-serif;
    }
    
    .bento-box h2 {
        margin: 0 0 16px 0;
        font-size: 1.5em;
        color: #333;
        text-align: center;
    }
    
    .chart-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
    }
    
    .chart-container canvas {
        max-height: 300px;
    }
    
    .chart-placeholder {
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #d5e2f6;
        border: 2px dashed #81a0f7;
        border-radius: 8px;
    }
    
    .placeholder-text {
        color: #666;
        font-size: 1em;
    }
    
    .axolotl-top {
        margin: 0;
        padding: 0;
        display: block;
        height: 20vw;
    }
    .back-button {
        position: absolute;
        left: 11vw;
        top: 18vw;
        color: white;
    }

    .shop-title h1 {
        margin: 0 0 16px 0;
        font-family: "Futura", sans-serif;
        color: #333;
    }
    @media (max-width: 768px) {
        .axolotl-top {
            height: 35vw;
        }

        .back-button {
            left: 5vw;
            top: 30vw;
        }

        .shop-title {
            width: 90%;
            padding: 20px;
        }
    }
</style>