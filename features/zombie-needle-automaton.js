// features/zombie-needle-automaton.js

(async function() {
    'use strict';

    // === DÜZELTİLMİŞ KISIM: Ayar kontrolü yeniden etkinleştirildi ===
    // Script artık çalışmadan önce uzantı ayarlarından özelliğin açık olup olmadığını kontrol edecek.
    const settings = await chrome.storage.sync.get({ 'zombie_needle_automaton_enable': false });
    if (!settings.zombie_needle_automaton_enable) {
        return; // Eğer ayar kapalıysa, script burada durur ve hiçbir arayüz göstermez.
    }
    // Teşhis için eklenen console.log mesajı kaldırıldı.

    const IS_INTERACT_PAGE = window.location.href.includes('/World/Popmundo.aspx/Interact/');

    const ITEMS = {
        NEEDLE: { name: 'Kan Dolu Tüp', interval: 10, isRunning: false, lastUseTime: null, nextUseTime: null, retryCount: 0 },
        SAMPLER: { name: 'Kan Örneği Alıcı', interval: 10, isRunning: false, lastUseTime: null, nextUseTime: null, retryCount: 0 }
    };
    let isProcessing = false;
    let currentIframe = null;
    const MAX_RETRIES = 3;
    const debug = (itemType, message) => { const itemName = itemType === 'SYSTEM' ? 'Sistem' : (ITEMS[itemType]?.name || 'Bilinmeyen'); console.log(`[${itemName}] ${message}`); };
    const saveState = () => { try { const state = {}; for (const key in ITEMS) { state[key] = { isRunning: ITEMS[key].isRunning, nextUseTime: ITEMS[key].nextUseTime?.getTime() || null, lastUseTime: ITEMS[key].lastUseTime?.getTime() || null, retryCount: ITEMS[key].retryCount }; } localStorage.setItem('zombieNeedleState', JSON.stringify(state)); } catch (e) { console.error('Durum kaydetme hatası:', e); } };
    const loadState = () => { try { const stateStr = localStorage.getItem('zombieNeedleState'); if (!stateStr) return false; const state = JSON.parse(stateStr); for (const key in ITEMS) { if (state[key]) { Object.assign(ITEMS[key], { ...state[key], nextUseTime: state[key].nextUseTime ? new Date(state[key].nextUseTime) : null, lastUseTime: state[key].lastUseTime ? new Date(state[key].lastUseTime) : null }); } } return Object.values(ITEMS).some(item => item.isRunning); } catch (e) { console.error('Durum yükleme hatası:', e); return false; } };
    async function createIframe() { if (currentIframe) { document.body.removeChild(currentIframe); } let iframe = document.createElement('iframe'); iframe.style.display = 'none'; iframe.src = window.location.href; document.body.appendChild(iframe); currentIframe = iframe; return new Promise((resolve) => { iframe.onload = async () => { await new Promise(r => setTimeout(r, 2000)); resolve(iframe); }; }); }
    function findItemButton(iframeDoc, itemName) { for (const row of iframeDoc.querySelectorAll('#checkedlist tr')) { if (row.textContent.includes(itemName)) { const button = row.querySelector('input[type="image"][title="Kullan"]'); if (button && !button.disabled) return button; } } return null; }

    function useSamplerOnInteractPage(itemType) {
        debug(itemType, 'Interact sayfasında nesne kullanımı deneniyor...');
        const selectElement = document.getElementById('ctl00_cphTopColumn_ctl00_ddlUseItem');
        const submitButton = document.getElementById('ctl00_cphTopColumn_ctl00_btnUseItem');

        if (!selectElement || !submitButton) {
            debug(itemType, 'Gerekli elementler (select/button) sayfada bulunamadı. Tekrar denenecek.');
            ITEMS[itemType].retryCount++;
            if (ITEMS[itemType].retryCount >= MAX_RETRIES) {
                ITEMS[itemType].nextUseTime = new Date(Date.now() + ITEMS[itemType].interval * 60 * 1000);
                ITEMS[itemType].retryCount = 0;
            } else {
                ITEMS[itemType].nextUseTime = new Date(Date.now() + 1 * 60 * 1000);
            }
            return;
        }

        let samplerOption = null;
        for (const option of selectElement.options) {
            if (option.text === ITEMS.SAMPLER.name) {
                samplerOption = option;
                break;
            }
        }

        if (samplerOption) {
            selectElement.value = samplerOption.value;
            debug(itemType, `"${ITEMS.SAMPLER.name}" seçildi, kullanılıyor...`);

            ITEMS[itemType].lastUseTime = new Date();
            ITEMS[itemType].nextUseTime = new Date(Date.now() + ITEMS[itemType].interval * 60 * 1000);
            ITEMS[itemType].retryCount = 0;
            updateStatus(itemType, 'Eşya kullanıldı');
            updateNextUse(itemType, ITEMS[itemType].nextUseTime);
            saveState();

            submitButton.click();
        } else {
            debug(itemType, `Açılır menüde "${ITEMS.SAMPLER.name}" bulunamadı.`);
            ITEMS[itemType].retryCount++;
            ITEMS[itemType].nextUseTime = new Date(Date.now() + 1 * 60 * 1000);
            saveState();
        }
    }

    async function useItem(itemType) {
        if (isProcessing) return;
        isProcessing = true;

        try {
            if (itemType === 'SAMPLER' && IS_INTERACT_PAGE) {
                useSamplerOnInteractPage(itemType);
                isProcessing = false;
                return;
            }

            const iframe = await createIframe();
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const button = findItemButton(iframeDoc, ITEMS[itemType].name);

            if (button) {
                button.click();
                ITEMS[itemType].lastUseTime = new Date();
                ITEMS[itemType].nextUseTime = new Date(Date.now() + ITEMS[itemType].interval * 60 * 1000);
                ITEMS[itemType].retryCount = 0;
                updateStatus(itemType, 'Eşya kullanıldı');
            } else {
                ITEMS[itemType].retryCount++;
                if (ITEMS[itemType].retryCount >= MAX_RETRIES) {
                    ITEMS[itemType].nextUseTime = new Date(Date.now() + ITEMS[itemType].interval * 60 * 1000);
                    ITEMS[itemType].retryCount = 0;
                } else {
                    ITEMS[itemType].nextUseTime = new Date(Date.now() + 1 * 60 * 1000);
                }
            }
            updateNextUse(itemType, ITEMS[itemType].nextUseTime);
            saveState();
        } catch (e) {
            console.error('Kullanım hatası:', e);
            ITEMS[itemType].nextUseTime = new Date(Date.now() + 1 * 60 * 1000);
        } finally {
            isProcessing = false;
        }
    }

    const createInterface = () => { const container = document.createElement('div'); container.innerHTML = `<div id="autoUseInterface" style="position:fixed;top:20px;right:20px;background:#2a2a2a;padding:15px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.5);z-index:9999;color:white;font-family:Arial,sans-serif;min-width:300px;"><div style="margin-bottom:10px;font-weight:bold;border-bottom:1px solid #444;padding-bottom:5px;">Zombi İğnesi Otomatı</div><div id="item-container"></div><div style="margin-top:10px;"><button id="resetButton" style="background:#ff9800;border:none;color:white;padding:8px 16px;border-radius:4px;cursor:pointer;width:100%;">Tüm Zamanlayıcıları Sıfırla</button></div></div>`; document.body.appendChild(container); const itemContainer = document.getElementById('item-container'); for (const [key, item] of Object.entries(ITEMS)) { const itemDiv = document.createElement('div'); itemDiv.style.marginBottom = '15px'; itemDiv.innerHTML = `<div style="font-weight:bold;margin-bottom:5px;">${item.name}</div><div id="${key.toLowerCase()}StatusText" class="statusText">Durum: Beklemede</div><div id="${key.toLowerCase()}NextUseText" class="nextUseText">Sonraki: -</div><div class="progressContainer"><progress id="${key.toLowerCase()}Progress" value="0" max="100" style="width:100%;"></progress></div><button id="${key.toLowerCase()}Button" class="actionButton" style="background:#4CAF50;width:100%;">Başlat</button>`; itemContainer.appendChild(itemDiv); } const style = document.createElement('style'); style.textContent = `.actionButton{border:none;color:white;padding:8px 16px;border-radius:4px;cursor:pointer;}.statusText,.nextUseText{margin-bottom:5px;font-size:14px;}.progressContainer{margin-bottom:10px;}`; document.head.appendChild(style); };
    const updateStatus = (itemType, text) => { const el = document.getElementById(`${itemType.toLowerCase()}StatusText`); if (el) el.textContent = `Durum: ${text}`; };
    const updateNextUse = (itemType, time) => { const el = document.getElementById(`${itemType.toLowerCase()}NextUseText`); if (el) el.textContent = time ? `Sonraki: ${time.toLocaleTimeString()}` : 'Sonraki: -'; };
    const updateProgress = (itemType, percent) => { const el = document.getElementById(`${itemType.toLowerCase()}Progress`); if (el) el.value = percent; };
    function updateTimer() { const now = new Date(); for (const [itemType, item] of Object.entries(ITEMS)) { if (!item.isRunning || !item.nextUseTime) continue; const timeDiff = item.nextUseTime - now; if (timeDiff <= 0) { useItem(itemType); continue; } const totalTime = item.interval * 60 * 1000; const progress = 100 - (timeDiff / totalTime * 100); updateProgress(itemType, Math.max(0, Math.min(100, progress))); } }
    function resetTimer() { for (const key in ITEMS) { toggleItem(key, true); ITEMS[key].nextUseTime = null; ITEMS[key].lastUseTime = null; ITEMS[key].retryCount = 0; updateStatus(key, 'Beklemede'); updateNextUse(key, null); updateProgress(key, 0); } saveState(); }
    function toggleItem(itemType, forceStop = false) { ITEMS[itemType].isRunning = forceStop ? false : !ITEMS[itemType].isRunning; const button = document.getElementById(`${itemType.toLowerCase()}Button`); if (ITEMS[itemType].isRunning) { if(button) { button.textContent = `${ITEMS[itemType].name} Durdur`; button.style.background = '#f44336'; } if (!ITEMS[itemType].nextUseTime) useItem(itemType); updateStatus(itemType, 'Çalışıyor...'); } else { if(button) { button.textContent = `${ITEMS[itemType].name} Başlat`; button.style.background = '#4CAF50'; } updateStatus(itemType, 'Durduruldu'); } saveState(); }

    function initialize() {
        loadState();

        if (IS_INTERACT_PAGE) {
            const sampler = ITEMS.SAMPLER;
            const allHeaders = document.querySelectorAll('h2');
            let targetHeader = null;

            for (const header of allHeaders) {
                if (header.textContent.trim() === 'Nesne kullan') {
                    targetHeader = header;
                    break;
                }
            }

            if (!targetHeader) {
                console.log('[Popmundo Araçları] Hedef "Nesne kullan" başlığı bulunamadı.');
                return;
            }

            const createIcon = (text, title, clickHandler) => {
                const icon = document.createElement('span');
                icon.textContent = text;
                icon.title = title;
                icon.style.cssText = 'cursor: pointer; margin-left: 8px; font-size: 0.9em; display: inline-block;';
                icon.addEventListener('click', clickHandler);
                return icon;
            };

            const playIcon = createIcon('▶️', 'Otomasyonu Başlat', () => {
                sampler.isRunning = true;
                if (!sampler.nextUseTime) {
                    useItem('SAMPLER');
                }
                saveState();
                updateIconState();
            });

            const stopIcon = createIcon('⏹️', 'Otomasyonu Durdur', () => {
                sampler.isRunning = false;
                saveState();
                updateIconState();
            });

            const updateIconState = () => {
                if (sampler.isRunning) {
                    playIcon.style.display = 'none';
                    stopIcon.style.display = 'inline-block';
                } else {
                    playIcon.style.display = 'inline-block';
                    stopIcon.style.display = 'none';
                }
            };

            targetHeader.appendChild(playIcon);
            targetHeader.appendChild(stopIcon);

            updateIconState();

        } else {
            createInterface();
            document.getElementById('resetButton').addEventListener('click', resetTimer);
            for (const key in ITEMS) {
                document.getElementById(`${key.toLowerCase()}Button`).addEventListener('click', () => toggleItem(key));
            }

            for (const [key, item] of Object.entries(ITEMS)) {
                if (item.isRunning) {
                    const button = document.getElementById(`${key.toLowerCase()}Button`);
                    if (button) {
                        button.textContent = `${item.name} Durdur`;
                        button.style.background = '#f44336';
                    }
                    if (item.nextUseTime) {
                        updateNextUse(key, item.nextUseTime);
                        updateStatus(key, 'Devam ediyor...');
                    }
                }
            }
        }

        setInterval(updateTimer, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();