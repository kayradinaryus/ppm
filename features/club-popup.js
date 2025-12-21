// features/club-popup.js - TÜRKÇELEŞTİRİLMİŞ

const clubPopUpOptionsValues = { 'show_club_popup': true };

var showClubPopUp = false;

/**
 * Kulüp bilgi penceresinin ana mantığı. Bu özellik tippy.js kütüphanesini kullanır.
 *
 */
function manageClubTooltips() {

    let popupTheme = Utils.getPopupTheme();
    let fetcher = new TimedFetch();

    // Tippy elementinin başlatılması
    tippy('a[href^="/World/Popmundo.aspx/Locale/"]', {
        'arrow': false,
        'content': showClubPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '', // <- ÇEVRİLDİ
        'allowHTML': true,
        'followCursor': false,
        'hideOnClick': false,
        'interactive': true,
        'maxWidth': 500,
        // 'delay': [0, 500], // Tıklanacak ilginç bağlantılar olabileceğinden, ipucunu gizlemek için bir saniye bekleriz
        'theme': popupTheme.LOADING_THEME,

        'onCreate': function (instance) {
            // Kendi özel durum özelliklerimizi ayarlayalım
            instance._isFetching = false;
            instance._src = null;
            instance._error = null;
        },

        'onShow': function (instance) {

            if (!showClubPopUp) {
                instance.setContent('');
                return false
            };

            // Fetch'in birden çok kez çağrılmadığından emin olalım
            if (instance._isFetching || instance._src || instance._error) {
                return;
            }
            instance._isFetching = true;

            // Tippy popup'ı, fare ile kulüp linklerinin üzerine gelindiğinde tetiklenir. Detayları anlamak için,
            // kulüp bilgisini içeren sayfanın tamamını bilmemiz gerekir.
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
                    // await scoring.applyBarPercentage(doc);
                    await scoring.applyScoringNumbers(doc);

                    xpathHelper = new XPathHelper('//div[@class="box" and position() >1]');

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
                        // Kulüp bilgisi mevcut değil
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
            instance.setContent(showClubPopUp ? `<span style="color: ${popupTheme.COLOR};">Yükleniyor...</span>` : '',); // <- ÇEVRİLDİ
            // Yeni ağ isteklerinin başlatılabilmesi için bu özellikleri sıfırla
            instance._src = null;
            instance._error = null;
        },
    })
}

// Ayarlar değiştirildiğinde, global showClubPopUp değişkenini güncelliyoruz
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace == 'sync') {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key == 'show_club_popup') showClubPopUp = newValue;
        }
    }

});

// Sayfa yüklendiğinde ayarlardan değeri alıp tippy mantığını başlatıyoruz.
// Mantığı sadece Popmundo için uyguluyoruz, TGH için değil.
if (!Utils.isGreatHeist()) {
    chrome.storage.sync.get(clubPopUpOptionsValues, items => {
        showClubPopUp = items.show_club_popup;
    
        manageClubTooltips();
    });
}