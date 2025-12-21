// features/show-details-popup.js - TÜRKÇELEŞTİRİLMİŞ

const showDetailsPopUpOptionsValues = { 'show_details_popup': true };

var showDetailPopUp = false;

/**
 * Konser detayları açılır penceresinin ana mantığı. Bu özellik tippy.js kütüphanesini kullanır.
 *
 */
function manageDetailsTooltips() {

    let popupTheme = Utils.getPopupTheme();
    let fetcher = new TimedFetch();

    // Tippy elementinin başlatılması
    tippy('a[href^="/World/Popmundo.aspx/Artist/PerformanceDetails/"]', {
        'arrow': false,
        'content': showDetailPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '', // <- ÇEVRİLDİ
        'allowHTML': true,
        'followCursor': true,
        'maxWidth': 500,
        //'delay': [0, 500000], // Hata ayıklamak için gerekirse bu satırı açın
        'theme': popupTheme.LOADING_THEME,

        'onCreate': function (instance) {
            // Kendi özel durum özelliklerimizi ayarlayalım
            instance._isFetching = false;
            instance._src = null;
            instance._error = null;
        },

        'onShow': function (instance) {

            if (!showDetailPopUp) {
                instance.setContent('');
                return false
            };

            // Fetch'in birden çok kez çağrılmadığından emin olalım
            if (instance._isFetching || instance._src || instance._error) {
                return;
            }
            instance._isFetching = true;

            // Tippy popup'ı, fare ile "Detaylar" linklerinin üzerine gelindiğinde tetiklenir. Detayları anlamak için,
            // konser detay bilgisini içeren sayfanın tamamını bilmemiz gerekir.
            let href = instance.reference.getAttribute('href');

            let theme = popupTheme.DATA_THEME;
            fetcher.fetch(href)
                .then(async (html) => {
                    html = html.replace(Utils.starsJSRE, Utils.createStarCount);

                    // DOM parser'ı başlat
                    let parser = new DOMParser();

                    // Metni parse et
                    let doc = parser.parseFromString(html, "text/html");

                    let scoring = new Scoring();
                    await scoring.applyScoringNumbers(doc);

                    xpathHelper = new XPathHelper('//div[@class="box" and position() >1 and position() < 5]');

                    let infoHTML = '';
                    let divNodes = xpathHelper.getOrderedSnapshot(doc);
                    
                    if (divNodes.snapshotLength > 0) {
                        for (let i = 0; i < divNodes.snapshotLength; i++) {
                            let divNode = divNodes.snapshotItem(i);

                            // Aracın ipucunun doğru şekilde oluşturulduğundan emin olmak için stilleri manuel olarak ekliyoruz
                            divNode.setAttribute('style', `font-size: ${popupTheme.FONT_SIZE}; color:${popupTheme.COLOR};`);

                            // yıldızların doğru şekilde oluşturulduğundan emin oluyoruz
                            infoHTML += divNode.outerHTML;
                        }
                    } else {
                        // Konser detayı bilgisi mevcut değil
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
            instance.setContent(showDetailPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '',); // <- ÇEVRİLDİ
            // Yeni ağ isteklerinin başlatılabilmesi için bu özellikleri sıfırla
            instance._src = null;
            instance._error = null;
        },
    })
}

// Ayarlar değiştirildiğinde, global showDetailPopUp değişkenini güncelliyoruz
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace == 'sync') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key == 'show_details_popup') showDetailPopUp = newValue;
        }
    }

});

// Sayfa yüklendiğinde ayarlardan değeri alıp tippy mantığını başlatıyoruz.
chrome.storage.sync.get(showDetailsPopUpOptionsValues, items => {
    showDetailPopUp = items.show_details_popup;

    manageDetailsTooltips();
});