<script lang="ts">
    export let data: any;

    let user = data.user ?? {};
    let submission = data.submission;
    let loadingAction: 'approve' | 'reject' | null = null;
    let message = '';

    const s = submission;

    function formatDate(dt: string | null | undefined) {
        if (!dt) return '';
        const d = new Date(dt);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString();
    }

    async function handleApprove() {
        loadingAction = 'approve';
        message = '';

        try {
            const res = await fetch('/api/blackhole/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: s.id,
                    reviewer: user.username ?? 'reviewer'
                })
            });

            if () {
                c
                t
            }

            c 
            m
        } catch (err) {
            c
            m
        } finally {
            l
        }
    }
    
    async function handleReject() {
        const reason = window.prompt('Reason for rejection? (optional)', s.reason ?? '') ?? '';

        loadingAction = 'reject';
        message = '';

        try {
            const res = await fetch('/api/blackhole/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: s.id,
                    reviewer: username ?? 'reviewer',
                    reason
                })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to reject');
            }

            const updated = await res.json();
            message = `Rejected submission ${updated.id}`;
        } catch (err) {
            const e = err as Error;
            message = e.message ?? 'Error rejecting';
        } finally {
            loadingAction = null;
        }
    }

    function getEggSrc(egg: string | undefined) {
        if (!egg) return '/projects/sparkle_egg1.png';
        return egg.startsWith('/') ? egg : `/${egg}`;
    }
</script>

<svelte:head>
    <title>Review - {submission.project?.name ?? 'Project'}</title>
</svelte:head>

<main class= "page">
    <header class="header">
        <div>
            <a
        </div>
    </header>
</main>

<style>
    . page {
        min-height: 100vh;

    }

    .header {
        display: flex;

    }

    .actions button:disabled{ 
        opacity: 0.6;
        
    }

    @media (max-width: 800px) {
        .header {
            flex-direction: column;
        }
        .top {
            flex-direction: column;
        }
    }
</style>