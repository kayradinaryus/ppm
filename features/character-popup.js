// features/character-popup.js - TÜRKÇELEŞTİRİLMİŞ

const charPopupOptionsValues = { 'character_popup': true };

var showCharacterPopUp = false;

/**
 * Karakter bilgi penceresinin ana mantığı. Bu özellik tippy.js kütüphanesini kullanır.
 *
 */
function manageCharacterTooltips() {

    let popupTheme = Utils.getPopupTheme();
    let fetcher = new TimedFetch();

    // Tippy elementinin başlatılması
    tippy('a[href^="/World/Popmundo.aspx/Character/"]', {
        'arrow': false,
        'content': showCharacterPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '', // <- ÇEVRİLDİ
        'allowHTML': true,
        'followCursor': true,
        'maxWidth': 600,
        // 'delay': [0, 500000], // Hata ayıklamak için gerekirse bu satırı açın
        'theme': popupTheme.LOADING_THEME,

        'onCreate': function (instance) {
            // Kendi özel durum özelliklerimizi ayarlayalım
            instance._isFetching = false;
            instance._src = null;
            instance._error = null;
        },

        'onShow': function (instance) {
            // Popup'ı sadece karakter linklerinde gösterdiğimizden emin olalım. Bu gereklidir çünkü
            // karakter sayfasında bu css seçicisiyle eşleşen birçok link bulunur.
            let charHref = instance.reference.getAttribute('href');
            if (!/\/World\/Popmundo.aspx\/Character\/\d+/gm.test(charHref)) return false;

            if (!showCharacterPopUp) {
                instance.setContent('');
                return false
            };

            // Fetch'in birden çok kez çağrılmadığından emin olalım
            if (instance._isFetching || instance._src || instance._error) {
                return;
            }
            instance._isFetching = true;

            // Tippy popup'ı, fare ile yetenek linklerinin üzerine gelindiğinde tetiklenir. Detayları anlamak için,
            // yetenek bilgisini içeren sayfanın tamamını bilmemiz gerekir.
            let href = instance.reference.getAttribute('href');

            let theme = popupTheme.DATA_THEME;
            
            fetcher.fetch(href)
                .then(async (html) => {

                    html = html.replace(Utils.progressBarJSRE, Utils.createProgressBar);

                    // DOM parser'ı başlat
                    let parser = new DOMParser();

                    // Metni parse et
                    let doc = parser.parseFromString(html, "text/html");

                    // İlerleme çubuğu yüzdelerini uygula
                    let scoring = new Scoring();
                    await scoring.applyBarPercentage(doc);

                    // Bu xpath, popup'ta göstermek istediğimiz içeriği yönetir
                    let divXpathHelper = new XPathHelper('//*[@id="ppm-content"]/div[position()<3]');

                    // Bu xpath, popup'taki resimlerin doğru src'ye sahip olmasını sağlar
                    let imgSrcXpathHelper = new XPathHelper("//img[contains(@src, '../')]");

                    let infoHTML = '';
                    let divNodes = divXpathHelper.getOrderedSnapshot(doc);
                    if (divNodes.snapshotLength > 0) {

                        for (let i = 0; i < divNodes.snapshotLength; i++) {
                            let divNode = divNodes.snapshotItem(i);

                            // Gerektiğinde resimlerin src'lerini düzeltelim
                            let imgNodes = imgSrcXpathHelper.getOrderedSnapshot(divNode);
                            for (let j = 0; j < imgNodes.snapshotLength; j++) {
                                let imgNode = imgNodes.snapshotItem(j);

                                imgNode.setAttribute('src', '/' + imgNode.getAttribute('src').replaceAll('../', '') );
                            }

                            // Aracın ipucunun doğru şekilde oluşturulduğundan emin olmak için stilleri manuel olarak ekliyoruz
                            divNode.setAttribute('style', `font-size: ${popupTheme.FONT_SIZE}; color:${popupTheme.COLOR};`);
   
                            infoHTML += divNode.outerHTML;
                        }

                        // Her şeyin https olduğundan emin olalım. Bazen eski karakterlerin http:// portreleri olabilir
                        infoHTML = infoHTML.replaceAll('http://', 'https://')

                    } else {
                        // Karakter bilgisi mevcut değil
                        infoHTML = `<span style="color: ${popupTheme.COLOR};">Bilgi bulunamadı.</span>`; // <- ÇEVRİLDİ
                        theme = popupTheme.NO_DATA_THEME;
                    }

                    instance._src = infoHTML;
                    instance.setProps({ 'theme': theme });
                    instance.setContent(infoHTML);

                }).catch((error) => {
                    instance._error = error;
                    instance.setContent(`<span style="color: ${popupTheme.COLOR};">İstek başarısız oldu. ${error}</span>`); // <- ÇEVRİLDİ
                })
                .finally(() => {
                    instance._isFetching = false;
                });
        },

        'onHidden': function (instance) {
            instance.setProps({ 'theme': popupTheme.LOADING_THEME });
            instance.setContent(showCharacterPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '',); // <- ÇEVRİLDİ
            // Yeni ağ isteklerinin başlatılabilmesi için bu özellikleri sıfırla
            instance._src = null;
            instance._error = null;
        },
    })
}

// Ayarlar değiştirildiğinde, global showPopUp değişkenini güncelliyoruz
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace == 'sync') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key == 'character_popup') showCharacterPopUp = newValue;
        }
    }

});

// Sayfa yüklendiğinde ayarlardan değeri alıp tippy mantığını başlatıyoruz.
chrome.storage.sync.get(charPopupOptionsValues, items => {
    showCharacterPopUp = items.character_popup;

    manageCharacterTooltips();
});