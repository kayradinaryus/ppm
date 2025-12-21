/**
 * Otomatik Tarif Yapıcı v9 - Nova Maximoff
 * CSS Enjeksiyonu ile Piksel Kusursuzluğunda İkiz Buton
 */

let isCrafting = false;

async function startAutoCrafting() {
    if (isCrafting) return;
    
    const recipeLinks = document.querySelectorAll('#tblrecipes tbody tr td a[id*="lnkRecipe"]');
    if (recipeLinks.length === 0) {
        alert("Yapılacak tarif bulunamadı.");
        return;
    }

    isCrafting = true;
    const timedFetch = new TimedFetch(false);
    updateStatusDisplay(0, recipeLinks.length, "Başlatılıyor...");

    for (let i = 0; i < recipeLinks.length; i++) {
        const recipeUrl = recipeLinks[i].href;
        const recipeName = recipeLinks[i].innerText;

        updateStatusDisplay(i + 1, recipeLinks.length, `Kontrol: ${recipeName}`);

        try {
            const html = await timedFetch.fetch(recipeUrl);
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const useBtn = doc.querySelector('#ctl00_cphLeftColumn_ctl00_btnUseRecipe');

            if (useBtn && !useBtn.disabled && useBtn.getAttribute('type') !== 'hidden') {
                updateStatusDisplay(i + 1, recipeLinks.length, `Yapılıyor: ${recipeName}`);
                
                const formData = new FormData();
                formData.append('__EVENTTARGET', '');
                formData.append('__EVENTARGUMENT', '');
                formData.append('ctl00$cphLeftColumn$ctl00$btnUseRecipe', 'Tarifi kullan');
                
                doc.querySelectorAll('input[type="hidden"]').forEach(input => {
                    formData.append(input.name, input.value);
                });

                await fetch(recipeUrl, { method: 'POST', body: formData });
            }
        } catch (err) { console.error(err); }

        const dynamicDelay = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
        if (i < recipeLinks.length - 1) {
            updateStatusDisplay(i + 1, recipeLinks.length, `Sıradaki Bekleniyor... (${Math.round(dynamicDelay/1000)}s)`);
            await Utils.sleep(dynamicDelay);
        }
    }

    updateStatusDisplay(recipeLinks.length, recipeLinks.length, "Tamamlandı!");
    isCrafting = false;
    alert("İşlem tamamlandı.");
}

function updateStatusDisplay(current, total, name) {
    let statusDiv = document.getElementById('ppm-recipe-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'ppm-recipe-status';
        statusDiv.style = "position: fixed; bottom: 0; left: 0; width: 100%; background: #eee; color: #444; padding: 3px 10px; z-index: 10000; border-top: 1px solid #bbb; font-family: Verdana, Arial, sans-serif; font-size: 10px; display: flex; justify-content: space-between; align-items: center; height: 20px; box-sizing: border-box;";
        document.body.appendChild(statusDiv);
    }
    const percent = Math.round((current / total) * 100);
    statusDiv.innerHTML = `<div style="flex: 1;"><strong>Otomatik Tarif:</strong> ${name}</div><div style="flex: 1; text-align: center;"><div style="display: inline-block; background: #ccc; width: 200px; height: 4px; position: relative; vertical-align: middle; margin-right: 10px;"><div style="background: #666; width: ${percent}%; height: 100%; transition: width 0.5s;"></div></div><span>%${percent}</span></div><div style="flex: 1; text-align: right;">${current} / ${total}</div>`;
}

function injectAutoCraftButton() {
    const originalBtn = document.getElementById('ctl00_cphLeftColumn_ctl00_btnChoseCategory');
    if (originalBtn && !document.getElementById('btnStartAutoCraft')) {
        const btn = document.createElement('input');
        btn.type = 'submit'; // Orijinal buton gibi 'submit' tipinde yapıyoruz
        btn.id = 'btnStartAutoCraft';
        btn.value = 'Hepsini Yap';
        
        // 1. Orijinal sınıfları al
        btn.className = originalBtn.className;
        
        // 2. CSS özelliklerini gönderdiğin değerlerle zorla
        // Popmundo'nun 'actionbuttons' içindeki otomatik margin-left: 10px kuralını da simüle ediyoruz.
        btn.style.cssText = `
            overflow-wrap: break-word !important;
            color: #000 !important;
            font-family: "Lucida Grande", Verdana, Sans-Serif !important;
            font-size: 10px !important;
            margin-left: 10px !important;
            cursor: pointer !important;
            vertical-align: middle !important;
        `;

        originalBtn.parentNode.insertBefore(btn, originalBtn.nextSibling);
        
        // Submit tipinde olduğu için sayfanın yenilenmesini engelliyoruz
        btn.onclick = (e) => {
            e.preventDefault();
            startAutoCrafting();
        };
    }
}

injectAutoCraftButton();