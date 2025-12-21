// features/item-list-timers.js - TÜRKÇELEŞTİRİLMİŞ

/**
 * Bu fonksiyon, şu anda bir zamanlayıcıya sahip olan ögelerin yanına küçük bir saat ikonu çizer.
 *
 */
async function drawTimerIcon() {
    // Saat İkonu için Resim Kaynakları
    const TIMER_WARN_ICON_SRC = chrome.runtime.getURL('images/clock--exclamation.png');
    const TIMER_OK_ICON_SRC = chrome.runtime.getURL('images/clock-select-remain.png');

    // Mantığın gerektirdiği XPath'ler
    const ITEM_TR_XPATH = "//tr[contains(@id, 'trItemGroup')]";
    const ITEM_A_XPATH = "./td[2]/a";
    const ITEM_ICON_XPATH = "./td[3]";

    // Karakter ID'sini alıyoruz, bunu zamanlayıcıları kontrol etmek için kullanacağız
    let myID = Utils.getMyID();

    // Kayıtlı zamanlayıcıları alıyoruz
    let items = await chrome.storage.sync.get({ 'timers': {} });
    
    // Mevcut Karakterin kayıtlı zamanlayıcıları var
    if (items.timers.hasOwnProperty(myID)) {

        // Karakterimin zamanlayıcıları
        let myTimers = items.timers[myID];

        // Eşya satırlarını bulalım
        let trXpathHelper = new XPathHelper(ITEM_TR_XPATH);
        let trXpathResult = trXpathHelper.getUnorderedNodeSnapshot(document);

        // Bulunan satırlar üzerinde döngüye girelim
        for (let trCnt = 0; trCnt < trXpathResult.snapshotLength; trCnt++) {
            let trNode = trXpathResult.snapshotItem(trCnt);

            // Eşya ID'lerini almamız gerekiyor ve bunun için linklere bakıyoruz
            let aXpathHelper = new XPathHelper(ITEM_A_XPATH);
            let aXpathResult = aXpathHelper.getAnyUnorderedNode(trNode);

            if (aXpathResult.singleNodeValue) {
                // Eşya ID'si href özelliğinin bir parçasıdır
                let aNode = aXpathResult.singleNodeValue;
                let href = aNode.getAttribute('href');

                let itemIDRegex = new RegExp("/World/Popmundo.aspx/Character/ItemDetails/(\\d{1,})", "i");
                let itemIDMatch = itemIDRegex.exec(href);

                // Regex eşleşti, eşya id'si bulundu!
                if (itemIDMatch) {
                    let itemID = parseInt(itemIDMatch[1]);
                    
                    // Mevcut eşya için kayıtlı zamanlayıcılarımız var mı?
                    if (myTimers.hasOwnProperty(itemID)) {

                        // İkonu son TD'ye çizelim
                        let icontXpathHelper = new XPathHelper(ITEM_ICON_XPATH);
                        let iconXpathResult = icontXpathHelper.getAnyUnorderedNode(trNode);

                        if (iconXpathResult.singleNodeValue) {
                            let timerDate = new Date(myTimers[itemID]['timerTimeStamp']);
                            let nowTime = new Date();

                            let imgSrc = nowTime >= timerDate ? TIMER_WARN_ICON_SRC : TIMER_OK_ICON_SRC;
                            let imgTXT = "" + timerDate;
                            
                            // === ÇEVİRİ ===
                            if (nowTime >= timerDate) imgTXT = "Zamanlayıcı doldu: " + imgTXT;

                            let newImg = document.createElement('img');

                            newImg.setAttribute('src', imgSrc);
                            newImg.setAttribute('alt', imgTXT);
                            newImg.setAttribute('title', imgTXT);
                            iconXpathResult.singleNodeValue.appendChild(newImg);
                        }
                    }
                }
            }
        }
    }
}

drawTimerIcon();