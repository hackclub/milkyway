
<script>
import { onMount } from 'svelte';

/** @type {{ onRewardsClaimed?: () => void }} */
let { onRewardsClaimed } = $props();

let announcements = $state(/** @type {any[]} */ ([]));
let isLoading = $state(true);
let currentAnnouncementIndex = $state(0);
let isRedeeming = $state(false);

// Get the current announcement to display
const currentAnnouncement = $derived(announcements[currentAnnouncementIndex] || null);
const hasPrizes = $derived(currentAnnouncement && currentAnnouncement.prize && currentAnnouncement.prize.trim() !== '');

onMount(async () => {
    try {
        const response = await fetch('/api/get-announcements');
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                announcements = result.announcements || [];
            }
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    } finally {
        isLoading = false;
    }
});

async function handleRedeem() {
    if (!currentAnnouncement || isRedeeming) return;
    
    isRedeeming = true;
    try {
        const response = await fetch('/api/redeem-announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                announcementId: currentAnnouncement.id,
                prize: currentAnnouncement.prize
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Remove the announcement from the list
                announcements = announcements.filter((_, i) => i !== currentAnnouncementIndex);
                // Reset index if needed
                if (currentAnnouncementIndex >= announcements.length) {
                    currentAnnouncementIndex = 0;
                }
                // Call the callback to update parent data
                if (onRewardsClaimed) {
                    await onRewardsClaimed();
                }
            }
        }
    } catch (error) {
        console.error('Error redeeming announcement:', error);
    } finally {
        isRedeeming = false;
    }
}

async function handleDismiss() {
    if (!currentAnnouncement || isRedeeming) return;
    
    isRedeeming = true;
    try {
        const response = await fetch('/api/redeem-announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                announcementId: currentAnnouncement.id,
                prize: ''
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Remove the announcement from the list
                announcements = announcements.filter((_, i) => i !== currentAnnouncementIndex);
                // Reset index if needed
                if (currentAnnouncementIndex >= announcements.length) {
                    currentAnnouncementIndex = 0;
                }
            }
        }
    } catch (error) {
        console.error('Error dismissing announcement:', error);
    } finally {
        isRedeeming = false;
    }
}
</script>

{#if !isLoading && currentAnnouncement}
<div class="announcements-container">
    <img src="/mimi_announce_back.png" alt="Announcement decoration" />
    <div class="announcement-content">
        <h3>what's new?</h3>
        <p class="announcement-description">{currentAnnouncement.description}</p>
        {#if hasPrizes}
            <button class="redeem-button" onclick={handleRedeem} disabled={isRedeeming}>
                {isRedeeming ? 'redeeming...' : 'redeem'}
            </button>
        {:else}
            <button class="dismiss-button" onclick={handleDismiss} disabled={isRedeeming}>
                {isRedeeming ? 'dismissing...' : 'dismiss'}
            </button>
        {/if}
        {#if announcements.length > 1}
            <p class="announcement-count">{currentAnnouncementIndex + 1} of {announcements.length}</p>
        {/if}
    </div>
    <img src="/mimi_announce.png" alt="Announcement character" />
</div>
{/if}

<style>
    .announcements-container {
        position: absolute;
        top: 140px;
        /* left: 20px; */
        z-index: 1;
    }
    .announcements-container img {
        position: absolute;
        top: 0;
        left: 0;
        width: 150px;
    }

    .announcement-content {
        position: absolute;
        top: 90px;
        left: 30px;
        background-color: #EDD4D4;
        border: 3px solid #E6819F;
        padding: 8px;
        border-radius: 6px;
        min-width: 200px;
        max-width: 300px;
        font-family: "Futura", sans-serif;
    }

    .announcement-content h3 {
        margin: 0 0 6px 0;
        font-size: 0.85em;
        font-weight: 800;
        color: #333;
    }

    .announcement-description {
        margin: 0 0 6px 0;
        font-size: 0.75em;
        line-height: 1.3;
        color: #333;
    }

    .redeem-button, .dismiss-button {
        width: 100%;
        padding: 6px;
        border-radius: 4px;
        font-weight: 800;
        font-size: 0.7em;
        cursor: pointer;
        font-family: "Futura", sans-serif;
        transition: all 0.2s ease;
    }

    .redeem-button {
        background-color: #E6819F;
        color: white;
        border: 3px solid #E6819F;
    }

    .redeem-button:hover:not(:disabled) {
        background-color: #d16e8a;
        transform: translateY(-1px);
    }

    .dismiss-button {
        background-color: #fff;
        color: #666;
        border: 3px solid #ccc;
    }

    .dismiss-button:hover:not(:disabled) {
        background-color: #f0f0f0;
        transform: translateY(-1px);
    }

    .redeem-button:disabled, .dismiss-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .announcement-count {
        margin: 8px 0 0 0;
        font-size: 0.75em;
        color: #666;
        text-align: center;
        font-style: italic;
    }
</style>