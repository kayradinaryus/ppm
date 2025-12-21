// features/jam-helper.js - TÜRKÇELEŞTİRİLMİŞ

// Ana XPath'ler
const SONGS_LEVELS_XPATH = '//tr[contains(@id, "ctl00_cphLeftColumn_ctl01_repArtistRepertoire")]/td[5]/div';
const BUTTON_TD_XPATH = '//p[@class="actionbuttons"][1]';
const BOOKING_ASSISTANT_XPATH = "boolean(count(//a[contains(@href, '/Artist/BookingAssistant')]) >= 1)";

/**
 * "Jam'i %100 olmayanları seç" butonunun geri arama (callback) fonksiyonu
 *
 */
function toggleNotFullyJamed() {
    // Tamamlanma durumunu bar DIV elementinden okuyoruz
    var songNodesXpathHelper = new XPathHelper(SONGS_LEVELS_XPATH);
    var songNodes = songNodesXpathHelper.getOrderedNodeIterator(document);

    let i = 0;
    let songRow;
    while ((songRow = songNodes.iterateNext())) {
        i += 1;

        // Tamamlanma yüzdesini almak için bir regex kullanıyoruz
        let percentJam = parseInt(songRow.getAttribute('title').match(/(\d{1,3})%/)[1]);
        
        // Onay kutusu için XPath'i dinamik olarak oluşturuyoruz
        const checkBoxXPATH = '//tr[contains(@id, "ctl00_cphLeftColumn_ctl")][' + i + ']/td[1]/input';
        let checkBoxXpathHelper = new XPathHelper(checkBoxXPATH);
        let checkBoxResult = checkBoxXpathHelper.getFirstOrderedNode(document);

        checkBoxResult.singleNodeValue.checked = (percentJam < 100) ? true : false;
    }
}

// Bu içerik script'ini sadece üyesi olduğunuz bir gruba uyguluyoruz
let isBandXpathHelper = new XPathHelper(BOOKING_ASSISTANT_XPATH);
let isBand = isBandXpathHelper.getBoolean(document, true);

if (isBand) {

    let btnXPathHelper = new XPathHelper(BUTTON_TD_XPATH);
    var buttonNodeResult = btnXPathHelper.getFirstOrderedNode(document);

    if (buttonNodeResult.singleNodeValue) {
        let buttonNode = buttonNodeResult.singleNodeValue;

        var toggleButton = document.createElement('input');
        toggleButton.setAttribute('type', 'button');
        
        // === ÇEVİRİ ===
        // Orijinali: 'Check not 100% Jammed'
        toggleButton.setAttribute('value', "Jam'i %100 olmayanları seç");
        
        toggleButton.addEventListener('click', toggleNotFullyJamed, false);
        buttonNode.insertBefore(toggleButton, buttonNode.firstChild);
    }
}