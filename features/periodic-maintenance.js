// features/periodic-maintenance.js

(async function() {
    'use strict';

    // Öncelikle bu özelliğin ayarlardan aktif edilip edilmediğini kontrol edelim.
    const settings = await chrome.storage.sync.get({ 'periodic_maintenance_enable': false });
    if (!settings.periodic_maintenance_enable) {
        return; // Eğer özellik kapalıysa, scriptin geri kalanını çalıştırma.
    }

    // === Sizin kodunuzun tamamı burada başlıyor ===
    let isRunning = false;
    let lastUseTime = null;
    let nextUseTime = null;
    let isProcessing = false;
    let timerID = null;
    let currentIframe = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const debug = (message) => { console.log(`[Periyodik Bakım Scripti] ${message}`); };

    const saveState = () => {
        try {
            const state = { isRunning, nextUseTime: nextUseTime ? nextUseTime.getTime() : null, lastUseTime: lastUseTime ? lastUseTime.getTime() : null, retryCount };
            localStorage.setItem('periodicMaintenanceState', JSON.stringify(state));
        } catch (error) { console.error('Durum kaydetme hatası:', error); }
    };

    const loadState = () => {
        try {
            const stateStr = localStorage.getItem('periodicMaintenanceState');
            if (!stateStr) return false;
            const state = JSON.parse(stateStr);
            isRunning = state.isRunning;
            nextUseTime = state.nextUseTime ? new Date(state.nextUseTime) : null;
            lastUseTime = state.lastUseTime ? new Date(state.lastUseTime) : null;
            retryCount = state.retryCount || 0;
            return isRunning;
        } catch (error) { console.error('Durum yükleme hatası:', error); return false; }
    };

    async function createIframe() {
        if (currentIframe) { document.body.removeChild(currentIframe); }
        let iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = window.location.href;
        document.body.appendChild(iframe);
        currentIframe = iframe;
        return new Promise((resolve) => { iframe.onload = async () => { await new Promise(r => setTimeout(r, 2000)); resolve(iframe); }; });
    }

    function findUseButton(iframeDoc) {
        const checkedList = iframeDoc.querySelector('#checkedlist');
        if (!checkedList) return null;
        const rows = checkedList.querySelectorAll('tr');
        for (const row of rows) {
            if (row.textContent.toLowerCase().includes('dolu sigara')) {
                const button = row.querySelector('input[type="image"]');
                if (button && !button.disabled) return button;
            }
        }
        return null;
    }

    async function useItem() {
        if (isProcessing) return;
        isProcessing = true;
        let successCount = 0;
        try {
            const iframe = await createIframe();
            for (let i = 0; i < 3; i++) {
                updateStatus(`${i + 1}. kullanım deneniyor...`);
                if (i > 0) { iframe.src = iframe.src; await new Promise(r => setTimeout(r, 3000)); }
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const button = findUseButton(iframeDoc);
                if (!button) continue;
                try {
                    button.click();
                    successCount++;
                    updateStatus(`${i + 1}. kullanım başarılı! (${successCount}/3)`);
                    await new Promise(r => setTimeout(r, 3000));
                } catch (error) { debug(`Buton tıklama hatası: ${error.message}`); }
            }
            if (successCount > 0) {
                lastUseTime = new Date();
                nextUseTime = new Date(lastUseTime.getTime() + 62 * 60 * 1000);
                retryCount = 0;
            } else {
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    nextUseTime = new Date(Date.now() + 62 * 60 * 1000);
                    retryCount = 0;
                } else {
                    nextUseTime = new Date(Date.now() + 5 * 60 * 1000);
                }
            }
            updateNextUse(nextUseTime);
            updateStatus(`${successCount} kullanım tamamlandı. Sonraki: ${nextUseTime.toLocaleTimeString()}`);
            saveState();
        } catch (error) {
            console.error('Kullanım hatası:', error);
            nextUseTime = new Date(Date.now() + 5 * 60 * 1000);
            updateNextUse(nextUseTime);
            saveState();
        } finally { isProcessing = false; }
    }

    const createInterface = () => {
        const container = document.createElement('div');
        container.innerHTML = `
            <div id="autoUseInterface" style="position: fixed; top: 20px; right: 20px; background: #2a2a2a; padding: 15px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 9999; color: white; font-family: Arial, sans-serif; min-width: 250px;">
                <div style="margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #444; padding-bottom: 5px;">Periyodik Bakım</div>
                <div id="statusText" style="margin-bottom: 10px; font-size: 14px;">Durum: Beklemede</div>
                <div id="nextUseText" style="margin-bottom: 10px; font-size: 14px;">Sonraki: -</div>
                <div id="progressContainer" style="margin-bottom: 10px;"><progress id="timeProgress" value="0" max="100" style="width: 100%;"></progress></div>
                <div style="display: flex; gap: 10px;">
                    <button id="toggleButton" style="background: #4CAF50; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; flex: 1;">Başlat</button>
                    <button id="resetButton" style="background: #ff9800; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 80px;">Sıfırla</button>
                </div>
            </div>`;
        document.body.appendChild(container);
    };

    const updateStatus = (text) => { const el = document.getElementById('statusText'); if (el) el.textContent = `Durum: ${text}`; };
    const updateNextUse = (time) => { const el = document.getElementById('nextUseText'); if (el) el.textContent = time ? `Sonraki: ${time.toLocaleTimeString()}` : 'Sonraki: -'; };
    const updateProgress = (percent) => { const el = document.getElementById('timeProgress'); if (el) el.value = percent; };

    function updateTimer() {
        if (!isRunning || !nextUseTime) return;
        const now = new Date();
        const timeDiff = nextUseTime - now;
        if (timeDiff <= 0) { useItem(); return; }
        const totalTime = 62 * 60 * 1000;
        const progress = 100 - (timeDiff / totalTime * 100);
        updateProgress(Math.max(0, Math.min(100, progress)));
    }

    function resetTimer() {
        nextUseTime = null; lastUseTime = null; retryCount = 0;
        updateStatus('Sayaç sıfırlandı'); updateNextUse(null); updateProgress(0);
        saveState();
    }

    function toggleScript() {
        isRunning = !isRunning;
        const button = document.getElementById('toggleButton');
        if (isRunning) {
            button.textContent = 'Durdur'; button.style.background = '#f44336';
            if (!nextUseTime) useItem();
            timerID = setInterval(updateTimer, 1000);
        } else {
            button.textContent = 'Başlat'; button.style.background = '#4CAF50';
            if (timerID) clearInterval(timerID);
            updateStatus('Beklemede');
        }
        saveState();
    }

    window.addEventListener('load', () => {
        createInterface();
        const button = document.getElementById('toggleButton');
        const resetBtn = document.getElementById('resetButton');
        button.addEventListener('click', toggleScript);
        resetBtn.addEventListener('click', resetTimer);
        if (loadState()) {
            button.textContent = 'Durdur'; button.style.background = '#f44336';
            timerID = setInterval(updateTimer, 1000);
            if (nextUseTime) { updateNextUse(nextUseTime); updateStatus('Script devam ediyor...'); }
        }
    });
})();