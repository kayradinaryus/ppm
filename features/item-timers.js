// features/item-timers.js - TÜRKÇELEŞTİRİLMİŞ

/**
 * Bu fonksiyon, sayfanın üst kısmında gecikmeli bir bildirim olup olmadığını kontrol eder ve bunu
 * kullanıcılar için hatırlatıcılar oluşturmak amacıyla kullanır.
 *
 */
async function checkForTimer() {
    // Ayarlar ANAHTARI
    const TIMERS_STORAGE_VALUE = { 'timers': {} };

    // Zamanlayıcı Regex'leri
    const minRegex = new RegExp("(\\d{1,})\\s+minutes", "i");
    const hourRegex = new RegExp("(\\d{1,})\\s+hours", "i");
    const daysRegex = new RegExp("(\\d{1,})\\s+days", "i");
    const weeksRegex = new RegExp("(\\d{1,})\\s+weeks", "i");

    // Zamanlama birimleri
    const SECOND = 1000;
    const MINUTE = SECOND * 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;
    const WEEK = DAY * 7;

    // Eşya ID'si için URL Regex'i
    const itemIDRegex = /\d{2}.popmundo.com\/World\/Popmundo.aspx\/Character\/ItemDetails\/(\d+)/gi;

    // Eşya adı için XPath
    const ITEM_NAME_XPATH = '//div[@class="content"][1]/div[@class="box"][1]/h2';

    // Daha sonra ihtiyaç duyacağımız değişkenleri başlatıyoruz
    let minutes = 0;
    let hours = 0;
    let days = 0;
    let weeks = 0;
    let itemID;

    // Zamanlayıcıyı alıyoruz
    let notifications = new Notifications();
    let errors = notifications.getErrorsAsText();

    // Belki bir zamanlayıcı vardır
    if (errors.length > 0) {
        let idMatch = itemIDRegex.exec(window.location.href);
        itemID = idMatch ? parseInt(idMatch[1]) : 0;

        // Karakterimin ID'si
        let myID = Utils.getMyID();

        // Mevcut kayıtlı zamanlayıcılar
        let items = await chrome.storage.sync.get(TIMERS_STORAGE_VALUE);
        let timers = items.timers;

        // Zamanlayıcıları aramak için bildirimler arasında döngüye giriyoruz
        errors.forEach((errorTxt) => {
            let now = new Date();

            // Tüm regex'leri uyguluyoruz
            let minMatch = minRegex.exec(errorTxt);
            let hourMatch = hourRegex.exec(errorTxt);
            let daysMatch = daysRegex.exec(errorTxt);
            let weeksMatch = weeksRegex.exec(errorTxt);

            // Değerleri kontrol edip varsayılan olarak 0 atıyoruz
            minutes = minMatch ? parseInt(minMatch[1]) : 0;
            hours = hourMatch ? parseInt(hourMatch[1]) : 0;
            days = daysMatch ? parseInt(daysMatch[1]) : 0;
            weeks = weeksMatch ? parseInt(weeksMatch[1]) : 0;

            // Bir şey bulduğumuzda sadece zamanlayıcıyı güncelliyoruz
            if (minutes > 0 || hours > 0 || days > 0 || weeks > 0) {
                // yanlış bildirimleri önlemek için dakika ve saatleri yuvarlıyoruz
                if (minutes > 0) minutes += 1;
                if (hours > 0 && minutes == 0) hours += 1;
                if (days > 0 && hours == 0 && minutes == 0) days += 1;

                // Süreyi mevcut zamana ekliyoruz
                let nowTimeStamp = now.getTime();
                let timerTimeStamp = nowTimeStamp + (weeks * WEEK) + (days * DAY) + (hours * HOUR) + (minutes * MINUTE);
    
                // 2 saniyelik bir tampon ekliyoruz
                timerTimeStamp += (2 * SECOND);
    
                // Eşya için zamanlayıcı bulundu, veritabanındaki değerlerin güncellendiğinden emin oluyoruz
                if (timerTimeStamp > nowTimeStamp) {
    
                    // Eşya adını almak için XPATH kullanıyoruz. Bu, bildirim mesajında kullanılacak.
                    let xpathHelper = new XPathHelper(ITEM_NAME_XPATH);
                    let itemNameNode = xpathHelper.getFirstOrderedNode(document);
    
                    // Mevcut karakter için bir anahtarın olduğundan emin oluyoruz
                    if (!timers.hasOwnProperty(myID)) timers[myID] = {};
    
                    // Mevcut eşyalar için zamanlayıcıyı güncelliyoruz
                    timers[myID][itemID] = { 'timerTimeStamp': timerTimeStamp, 'name': itemNameNode.singleNodeValue.textContent, 'now': nowTimeStamp };
                }
            }
        });

        await chrome.storage.sync.set({ "timers": timers });
    }
}

/**
 * injectUseAndTimer() fonksiyonu tarafından eklenen HTML butonunun onclick olay yöneticisi.
 * Bu yeni butona tıklandığında, metod bir fetch çağrısı kullanarak bir form gönderimini taklit edecek ve ardından
 * standart eşya zamanlayıcı mantığının tetiklenmesi için normal butona tıklayacaktır.
 *
 * @param {*} btnNode - Orijinal Kullan/Akort Et butonu.
 */
async function timerOnClick(btnNode) {

    let docForm = document.getElementById('aspnetForm');
    let formData = new FormData(docForm);
    formData.set(btnNode.getAttribute('name'), btnNode.getAttribute('value'));

    let bgFetch = await fetch(location.href, {
        "body": formData,
        "method": "POST",
    }).then((response) => {
        if (response.ok && response.status >= 200 && response.status < 300) {
            return response.text();
        }
    }).then((html) => {
        console.log(html);
    });
    
    btnNode.click();
}

/**
 * Bu fonksiyon, sayfaya "Kullan ve Zamanlayıcı Kur" butonunu ekler.
 *
 */
async function injectUseAndTimer() {

    // Standart Kullan/Akort Et butonu
    const USE_BTN_XPATH = "//input[@type='submit' and contains(@name, 'ItemUse')]";
    let btnXPathHelper = new XPathHelper(USE_BTN_XPATH);
    let btnResult = btnXPathHelper.getAnyUnorderedNode(document);

    if (btnResult.singleNodeValue) {
        let btnNode = btnResult.singleNodeValue;

        let newBtn = document.createElement('input');
        newBtn.setAttribute('type', 'submit');
        newBtn.setAttribute('name', btnNode.getAttribute('name'));
        
        // === ÇEVİRİ ===
        // Orijinali: btnNode.getAttribute('value') + ' & Timer'
        newBtn.setAttribute('value', btnNode.getAttribute('value') + ' ve Zamanlayıcı Kur');
        
        newBtn.setAttribute('class', btnNode.getAttribute('class'));

        btnNode.parentNode.insertBefore(newBtn, btnResult.nextSibling);
        newBtn.onclick = () => { timerOnClick(btnNode); return false; };
    }
}

// Bildirimlerin yüklenmesi birkaç saniye sürebilir, bu yüzden onları kontrol etmeden önce birkaç saniye bekliyoruz
window.setTimeout(() => { checkForTimer(); }, 2000);
injectUseAndTimer();