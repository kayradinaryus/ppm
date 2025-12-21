// features/mass-offer.js

(async function() {
    'use strict';

    // Bu özelliğin ayarlardan açılıp açılmadığını kontrol et
    const settings = await chrome.storage.sync.get({ 'mass_offer_enable': false });
    if (!settings.mass_offer_enable) {
        return; // Eğer özellik kapalıysa, scripti çalıştırma.
    }

    // =================================================================================
    // --- YARDIMCI FONKSİYONLAR (STORAGE VE STİL) ---
    // =================================================================================

    const storage = {
        setValue: (key, value) => chrome.storage.session.set({[key]: value}),
        getValue: async (key, defaultValue) => (await chrome.storage.session.get({[key]: defaultValue}))[key],
        deleteValue: (key) => chrome.storage.session.remove(key)
    };

    function addGlobalStyle(css) {
        if (document.getElementById('mass-offer-styles')) return;
        const head = document.head || document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.id = 'mass-offer-styles';
        style.type = 'text/css';
        style.appendChild(document.createTextNode(css));
        head.appendChild(style);
    }

    function loadFontAwesome() {
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const fontAwesomeLink = document.createElement('link');
            fontAwesomeLink.rel = 'stylesheet';
            fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
            document.head.appendChild(fontAwesomeLink);
        }
    }

    // =================================================================================
    // --- ANA YÖNLENDİRİCİ (ROUTER) ---
    // =================================================================================
    function initializeScript() {
        const currentUrl = window.location.href;
        if (currentUrl.includes('/Character/OfferItem/')) {
            initOfferPage();
        } else if (currentUrl.includes('/Character/ItemsOffered')) {
            initAcceptPage();
        }
    }

    // =================================================================================
    // --- ÖZELLİK 1: TOPLU EŞYA TEKLİF ETME ---
    // =================================================================================
    function initOfferPage() {
        const OFFER_BUTTON_SELECTOR = '#ctl00_cphLeftColumn_ctl00_btnGive';
        const PRICE_INPUT_SELECTOR = '#ctl00_cphLeftColumn_ctl00_txtPriceTag';
        const ITEM_DROPDOWN_SELECTOR = '#ctl00_cphLeftColumn_ctl00_ddlItem';
        const FORM_CONTENT_DIV_SELECTOR = '#ctl00_cphLeftColumn_ctl00_updMain';
        const BASE_DELAY_MS = 2000;
        const POST_PRICE_SET_DELAY_MS = 100;
        const STORAGE_KEY_ITEMS_OFFER = 'popmundo_massOffer_items';
        const STORAGE_KEY_RUNNING_OFFER = 'popmundo_massOffer_running';
        const STORAGE_KEY_PRICE_OFFER = 'popmundo_massOffer_price';

        function createOfferUI() {
            if (document.getElementById('bulkOfferUIScript')) return;
            const mainBoxWithForm = document.querySelector(FORM_CONTENT_DIV_SELECTOR)?.closest('.box');
            if (!mainBoxWithForm) { console.error("Yardımcı: Ana form kutusu bulunamadı."); return; }
            const scriptUIArea = document.createElement('div');
            scriptUIArea.id = 'bulkOfferUIScript';
            scriptUIArea.className = 'bulk-helper-wrapper';
            scriptUIArea.innerHTML = `
                <div class="panel-header"><h2><i class="fa-solid fa-dolly"></i>Toplu Teklif Yardımcısı</h2></div>
                <div class="automation-panel-compact">
                    <div class="config-container offer-config">
                        <div class="config-item"><label for="itemNameInputScript">Eşya Adı:</label><input type="text" id="itemNameInputScript" placeholder="Örn: İlaç"></div>
                        <div class="config-item"><label for="itemQuantityInputScript">Miktar:</label><input type="number" id="itemQuantityInputScript" min="1" value="1"></div>
                        <div class="config-item config-item-full"><label for="itemPriceInputScript">Fiyat (M$):</label><input type="number" id="itemPriceInputScript" min="0" step="1" value="0"></div>
                    </div>
                    <div class="action-buttons">
                        <button id="startOfferBtn" type="button" class="btn-start"><i class="fa-solid fa-play"></i> Teklif Et</button>
                        <button id="stopOfferBtn" type="button" class="btn-stop"><i class="fa-solid fa-stop"></i> Durdur</button>
                    </div>
                    <div id="bulkOfferStatus" class="status-display">Durum: Hazır.</div>
                </div>
            `;
            mainBoxWithForm.insertBefore(scriptUIArea, mainBoxWithForm.firstChild);
            document.getElementById('startOfferBtn').addEventListener('click', startOffer);
            document.getElementById('stopOfferBtn').addEventListener('click', stopOffer);
        }
        
        function autoCheckDeliveryBox() {
            const deliveryCheckbox = document.getElementById('ctl00_cphLeftColumn_ctl00_chkDelivery');
            if (deliveryCheckbox) {
                deliveryCheckbox.checked = true;
            }
        }

        function disableOfferButtons(disabled) {
             document.getElementById('startOfferBtn').disabled = disabled;
             document.getElementById('stopOfferBtn').disabled = !disabled;
             document.getElementById('itemNameInputScript').disabled = disabled;
             document.getElementById('itemQuantityInputScript').disabled = disabled;
             document.getElementById('itemPriceInputScript').disabled = disabled;
        }

        async function startOffer() {
            const itemName = document.getElementById('itemNameInputScript').value.trim();
            const quantity = parseInt(document.getElementById('itemQuantityInputScript').value, 10);
            const price = parseInt(document.getElementById('itemPriceInputScript').value, 10);
            const statusDiv = document.getElementById('bulkOfferStatus');
            if (!itemName) { statusDiv.textContent = "Hata: Eşya adı girin."; return; }
            if (isNaN(quantity) || quantity < 1) { statusDiv.textContent = "Hata: Geçersiz miktar."; return; }
            if (isNaN(price) || price < 0) { statusDiv.textContent = "Hata: Geçersiz fiyat."; return; }
            const allItemsFound = Array.from(document.querySelector(ITEM_DROPDOWN_SELECTOR).options)
                .filter(o => o.value && o.value !== "-1" && o.textContent.trim().toLowerCase().startsWith(itemName.toLowerCase()))
                .map(o => ({ value: o.value, text: o.textContent.trim() }));
            if (allItemsFound.length === 0) { statusDiv.textContent = `Durum: "${itemName}" ile başlayan eşya bulunamadı.`; return; }
            const itemsToOffer = allItemsFound.slice(0, quantity);
            statusDiv.textContent = `${allItemsFound.length} bulundu. ${itemsToOffer.length} tanesi ${price}M$ fiyatla teklif edilecek...`;
            await storage.setValue(STORAGE_KEY_PRICE_OFFER, price);
            await storage.setValue(STORAGE_KEY_ITEMS_OFFER, JSON.stringify(itemsToOffer));
            await storage.setValue(STORAGE_KEY_RUNNING_OFFER, true);
            disableOfferButtons(true);
            await processNextOffer();
        }

        async function stopOffer() {
            await storage.deleteValue(STORAGE_KEY_ITEMS_OFFER);
            await storage.deleteValue(STORAGE_KEY_RUNNING_OFFER);
            await storage.deleteValue(STORAGE_KEY_PRICE_OFFER);
            const statusDiv = document.getElementById('bulkOfferStatus');
            if (statusDiv) statusDiv.textContent = "Durum: Kullanıcı tarafından durduruldu.";
            disableOfferButtons(false);
        }

        async function processNextOffer() {
            if (!await storage.getValue(STORAGE_KEY_RUNNING_OFFER, false)) { disableOfferButtons(false); return; }
            let itemsToOffer = JSON.parse(await storage.getValue(STORAGE_KEY_ITEMS_OFFER, '[]'));
            const statusDiv = document.getElementById('bulkOfferStatus');
            if (itemsToOffer.length === 0) {
                statusDiv.textContent = "Durum: Tüm teklifler tamamlandı!";
                await stopOffer(); return;
            }
            const itemDropdown = document.querySelector(ITEM_DROPDOWN_SELECTOR);
            const offerButton = document.querySelector(OFFER_BUTTON_SELECTOR);
            const pagePriceInput = document.querySelector(PRICE_INPUT_SELECTOR);
            if (!itemDropdown || !offerButton) { await stopOffer(); return; }
            const itemToOffer = itemsToOffer.shift();
            const targetPrice = await storage.getValue(STORAGE_KEY_PRICE_OFFER, 0);
            if (pagePriceInput) pagePriceInput.value = String(targetPrice);
            await new Promise(r => setTimeout(r, POST_PRICE_SET_DELAY_MS));
            statusDiv.textContent = `Teklif ediliyor: '${itemToOffer.text}'...`;
            itemDropdown.value = itemToOffer.value;
            await storage.setValue(STORAGE_KEY_ITEMS_OFFER, JSON.stringify(itemsToOffer));
            await new Promise(r => setTimeout(r, BASE_DELAY_MS));
            if (await storage.getValue(STORAGE_KEY_RUNNING_OFFER, false)) offerButton.click();
        }
        
        async function checkOfferStateOnLoad() {
            createOfferUI();
            autoCheckDeliveryBox();
            if (await storage.getValue(STORAGE_KEY_RUNNING_OFFER, false)) {
                disableOfferButtons(true);
                document.getElementById('bulkOfferStatus').textContent = "Durum: Sayfa yenilendi, devam ediliyor...";
                await new Promise(r => setTimeout(r, 500));
                await processNextOffer();
            } else {
                disableOfferButtons(false);
            }
        }
        checkOfferStateOnLoad();
    }

    // =================================================================================
    // --- ÖZELLİK 2: TOPLU TEKLİF KABUL/REDDETME ---
    // =================================================================================
    function initAcceptPage() {
        const BASE_DELAY_MS = 2000;
        const STORAGE_KEY_RUNNING = 'popmundo_massAction_running';
        const STORAGE_KEY_MODE = 'popmundo_massAction_mode';
        const STORAGE_KEY_ITEM_NAME = 'popmundo_massAction_itemName';
        const STORAGE_KEY_PROCESSED_COUNT = 'popmundo_massAction_processedCount';
        const STORAGE_KEY_MAX_COUNT = 'popmundo_massAction_maxCount';
        const STORAGE_KEY_TOTAL_SPENT = 'popmundo_massAction_totalSpent';

        function createAcceptUI() {
            if (document.getElementById('bulkAcceptUIScript')) return;
            const offersSection = Array.from(document.querySelectorAll('.box h2')).find(h2 => h2.textContent.trim() === 'Teklif edilen eşyalar')?.closest('.box');
            if (!offersSection) return;
            const scriptUIArea = document.createElement('div');
            scriptUIArea.id = 'bulkAcceptUIScript';
            scriptUIArea.className = 'bulk-helper-wrapper';
            
            scriptUIArea.innerHTML = `
                <div class="panel-header"><h2><i class="fa-solid fa-check-circle"></i>Toplu Kabul/Red Yardımcısı</h2></div>
                <div class="automation-panel-compact">
                    <div class="config-container accept-config">
                        <div class="config-item"><label for="itemNameInputAccept">Eşya Adı (İsteğe bağlı):</label><input type="text" id="itemNameInputAccept" placeholder="Tümü için boş bırakın"></div>
                        <div class="config-item"><label for="itemQuantityInputAccept">Miktar:</label><input type="number" id="itemQuantityInputAccept" min="1" value="1"></div>
                    </div>
                    <div class="action-buttons">
                        <button id="startAcceptBtn" type="button" class="btn-start"><i class="fa-solid fa-play"></i> Kabul Et</button>
                        <button id="startRejectBtn" type="button" class="btn-stop"><i class="fa-solid fa-times"></i> Reddet</button>
                    </div>
                    <div id="bulkActionStatus" class="status-display">Durum: Hazır.</div>
                    <div id="bulkActionSpent" class="spent-display">Toplam Harcama: 0 M$</div>
                </div>
            `;
            offersSection.insertBefore(scriptUIArea, offersSection.firstChild);
            document.getElementById('startAcceptBtn').addEventListener('click', () => startBulkAction('accept'));
            document.getElementById('startRejectBtn').addEventListener('click', () => startBulkAction('reject'));
        }

        function disableActionButtons(disabled) {
            document.getElementById('startAcceptBtn').disabled = disabled;
            document.getElementById('startRejectBtn').disabled = disabled;
            document.getElementById('itemNameInputAccept').disabled = disabled;
            document.getElementById('itemQuantityInputAccept').disabled = disabled;
        }

        function parseCurrency(valueStr) {
            const integerPart = (valueStr || "0").replace(/\./g, '').split(',')[0];
            return parseInt(integerPart, 10) || 0;
        }

        async function startBulkAction(mode) {
            const targetName = document.getElementById('itemNameInputAccept').value.trim().toLowerCase();
            const maxCount = parseInt(document.getElementById('itemQuantityInputAccept').value, 10);
            const statusDiv = document.getElementById('bulkActionStatus');
            if (isNaN(maxCount) || maxCount < 1) {
                statusDiv.textContent = "Hata: Geçerli bir miktar girin.";
                return;
            }
            const actionText = mode === 'accept' ? 'kabul edilecek' : 'reddedilecek';
            statusDiv.textContent = `Başlatılıyor... En fazla ${maxCount} adet teklif ${actionText}.`;
            document.getElementById('bulkActionSpent').style.display = (mode === 'accept') ? 'block' : 'none';
            document.getElementById('bulkActionSpent').textContent = `Toplam Harcama: 0 M$`;
            await storage.setValue(STORAGE_KEY_MODE, mode);
            await storage.setValue(STORAGE_KEY_ITEM_NAME, targetName);
            await storage.setValue(STORAGE_KEY_MAX_COUNT, maxCount);
            await storage.setValue(STORAGE_KEY_RUNNING, true);
            await storage.setValue(STORAGE_KEY_PROCESSED_COUNT, 0);
            await storage.setValue(STORAGE_KEY_TOTAL_SPENT, 0);
            disableActionButtons(true);
            await processNextAction();
        }

        async function finishBulkAction(message) {
            const totalSpent = await storage.getValue(STORAGE_KEY_TOTAL_SPENT, 0);
            const processedCount = await storage.getValue(STORAGE_KEY_PROCESSED_COUNT, 0);
            const mode = await storage.getValue(STORAGE_KEY_MODE, 'accept');
            await storage.deleteValue(STORAGE_KEY_RUNNING);
            await storage.deleteValue(STORAGE_KEY_MODE);
            await storage.deleteValue(STORAGE_KEY_ITEM_NAME);
            await storage.deleteValue(STORAGE_KEY_PROCESSED_COUNT);
            await storage.deleteValue(STORAGE_KEY_MAX_COUNT);
            await storage.deleteValue(STORAGE_KEY_TOTAL_SPENT);
            const statusDiv = document.getElementById('bulkActionStatus');
            const actionText = mode === 'accept' ? 'Kabul edilen' : 'Reddedilen';
            let finalMessage = `${message} ${actionText}: ${processedCount}.`;
            if (mode === 'accept') finalMessage += ` Harcanan: ${totalSpent}M$.`;
            if (statusDiv) statusDiv.textContent = finalMessage;
            disableActionButtons(false);
        }

        async function processNextAction() {
            if (!await storage.getValue(STORAGE_KEY_RUNNING, false)) { disableActionButtons(false); return; }
            const mode = await storage.getValue(STORAGE_KEY_MODE, 'accept');
            const targetName = await storage.getValue(STORAGE_KEY_ITEM_NAME, '');
            let processedCount = await storage.getValue(STORAGE_KEY_PROCESSED_COUNT, 0);
            let totalSpent = await storage.getValue(STORAGE_KEY_TOTAL_SPENT, 0);
            const maxCount = await storage.getValue(STORAGE_KEY_MAX_COUNT, 0);
            const statusDiv = document.getElementById('bulkActionStatus');
            const spentDiv = document.getElementById('bulkActionSpent');
            if (maxCount > 0 && processedCount >= maxCount) {
                await finishBulkAction("Belirtilen miktar işlendi. İşlem tamamlandı!");
                return;
            }
            const offersSection = Array.from(document.querySelectorAll('.box h2')).find(h2 => h2.textContent.trim() === 'Teklif edilen eşyalar')?.closest('.box');
            if (!offersSection) { await finishBulkAction("Hata: Teklif kutusu bulunamadı."); return; }
            const offerParagraphs = Array.from(offersSection.querySelectorAll('p.nobmargin, td.forceround > p')).filter(p => p.querySelector('input[type="submit"]'));
            if (offerParagraphs.length === 0) {
                await finishBulkAction("Başka teklif bulunamadı. İşlem tamamlandı!"); return;
            }
            let foundItemToAction = false;
            for (const p of offerParagraphs) {
                const itemName = p.querySelector('a[id*="lnkItem"]')?.textContent.trim() || '';
                if (!itemName) continue;
                const isNameOk = (targetName === '' || itemName.toLowerCase().includes(targetName));
                if (isNameOk) {
                    let actionButton;
                    if (mode === 'accept') {
                        actionButton = p.querySelector('input[value="Satın Al"], input[value="Satın al ve kargo ücretini öde"], input[value="Hediyeyi kabul et"], input[value="Kabul et ve kargo ücretini öde"]');
                    } else {
                        actionButton = p.querySelector('input[value="Reddet"]');
                    }
                    if (!actionButton) continue;
                    processedCount++;
                    const costMatch = p.textContent.match(/Tutar:\s*([\d.,]+)\s*M\$/) || p.textContent.match(/ücret:\s*([\d.,]+)\s*M\$/);
                    const itemPrice = costMatch ? parseCurrency(costMatch[1]) : 0;
                    if (mode === 'accept') totalSpent += itemPrice;
                    await storage.setValue(STORAGE_KEY_PROCESSED_COUNT, processedCount);
                    await storage.setValue(STORAGE_KEY_TOTAL_SPENT, totalSpent);
                    const actionText = mode === 'accept' ? 'Kabul ediliyor' : 'Reddediliyor';
                    statusDiv.textContent = `${actionText} ${processedCount}/${maxCount}: '${itemName}'...`;
                    if (mode === 'accept') spentDiv.textContent = `Toplam Harcama: ${totalSpent} M$`;
                    foundItemToAction = true;
                    await new Promise(r => setTimeout(r, BASE_DELAY_MS));
                    if (await storage.getValue(STORAGE_KEY_RUNNING, false)) actionButton.click();
                    return;
                }
            }
            if (!foundItemToAction) {
                await finishBulkAction("Uygun başka teklif yok. İşlem tamamlandı!");
            }
        }

        async function checkActionStateOnLoad() {
            createAcceptUI();
            if (await storage.getValue(STORAGE_KEY_RUNNING, false)) {
                disableActionButtons(true);
                const processedCount = await storage.getValue(STORAGE_KEY_PROCESSED_COUNT, 0);
                const totalSpent = await storage.getValue(STORAGE_KEY_TOTAL_SPENT, 0);
                const maxCount = await storage.getValue(STORAGE_KEY_MAX_COUNT, 0);
                const mode = await storage.getValue(STORAGE_KEY_MODE, 'accept');
                document.getElementById('bulkActionStatus').textContent = `Sayfa yenilendi, devam ediliyor... (${processedCount}/${maxCount})`;
                if (mode === 'accept') {
                    document.getElementById('bulkActionSpent').textContent = `Toplam Harcama: ${totalSpent} M$`;
                } else {
                    document.getElementById('bulkActionSpent').style.display = 'none';
                }
                await new Promise(r => setTimeout(r, 500));
                await processNextAction();
            } else {
                disableActionButtons(false);
            }
        }
        checkActionStateOnLoad();
    }
    
    // Bu fonksiyon artık kullanılmıyor, ancak diğer sayfalardaki olası
    // kalıntıları temizlemek için boş bir fonksiyon olarak bırakılabilir.
    function cleanOfferedItemsList() {
        // "Daha önce teklif edilenleri gizle" özelliği kaldırıldığı için bu fonksiyon boşa çıktı.
    }


    // =================================================================================
    // --- STİLLER VE BAŞLATMA ---
    // =================================================================================
    addGlobalStyle(`
        .bulk-helper-wrapper { margin-bottom: 20px; }
        .panel-header { border-bottom: 1px solid #EEE; padding-bottom: 4px; margin-bottom: 10px; }
        .panel-header h2 { font-size: 1em; font-weight: normal; margin: 0; color: #000; display: flex; align-items: center; }
        .panel-header h2 i { margin-right: 8px; color: #555; }
        
        .automation-panel-compact {
            background-color: #f0f0f0; border: 1px solid #dcdcdc; border-radius: 6px; padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            font-family: "Lucida Grande", Verdana, sans-serif;
            font-size: 10px;
        }
        .config-container { display: grid; gap: 10px; margin-bottom: 12px; }
        .config-container.offer-config { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .config-container.accept-config { grid-template-columns: 1fr 100px; }
        .config-item-full { grid-column: 1 / -1; }
        .config-item label { display: block; font-weight: bold; margin-bottom: 4px; color: #555; font-size: 10px; }
        .config-item input[type="number"], .config-item input[type="text"] { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-size: 10px; }
        .action-buttons { display: flex; gap: 8px; margin-bottom: 10px; }
        .action-buttons button { display: inline-flex; align-items: center; justify-content: center; flex-grow: 1; padding: 8px 12px; border: 1px solid #555; border-radius: 4px; font-weight: bold; cursor: pointer; transition: all 0.2s; color: #333; text-shadow: 1px 1px 1px #fff; font-size: 10px; }
        .action-buttons button:hover:not(:disabled) { border-color: #333; }
        .action-buttons button:disabled { background: #e9ecef !important; border-color: #ccc !important; color: #999 !important; cursor: not-allowed; opacity: 0.7; }
        .action-buttons button i { margin-right: 6px; }
        .btn-start { background: linear-gradient(to bottom, #d4edda, #c3e6cb); border-color: #28a745; }
        .btn-start:hover:not(:disabled) { background: linear-gradient(to bottom, #c3e6cb, #b1dfbb); }
        .btn-stop { background: linear-gradient(to bottom, #f8d7da, #f5c6cb); border-color: #dc3545; }
        .btn-stop:hover:not(:disabled) { background: linear-gradient(to bottom, #f5c6cb, #f1b0b7); }
        .status-display, .spent-display { font-size: 10px; text-align: center; background-color: #e9ecef; padding: 6px; border-radius: 4px; margin-bottom: 5px; font-weight: 500; color: #495057; }
        .spent-display { background-color: #d1fae5; color: #065f46; }
    `);
    
    loadFontAwesome();
    initializeScript();

})();