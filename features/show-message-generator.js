// features/show-message-generator.js - TÜRKÇELEŞTİRİLMİŞ

const showMessageOptionsValues = { 'show_msg_helper': false };

let showMessageArea = false;

function manageShowArea() {
    if (!showMessageArea) return;

    // Bu XPath, mesaj içeren metin alanının yalnızca Sanatçımın gelecekteki konserleri için görüntülenmesini sağlar
    const IS_BAND_SHOW_XPATH = "boolean(count(//div[@class='box']) = 7)"

    let isBandXpathHelper = new XPathHelper(IS_BAND_SHOW_XPATH);
    let isBandXpath = isBandXpathHelper.getBoolean(document);

    if (isBandXpath.booleanValue) {
        const VENUE_A_XPATH = "//a[@id='ctl00_cphLeftColumn_ctl01_lnkVenue']";
        const CITY_A_XPATH = "//a[@id='ctl00_cphLeftColumn_ctl01_lnkVenueCity']";
        const TIME_TD_XPATH = "/html/body/form/div[3]/div[4]/div[2]/div[2]/table/tbody/tr[3]/td[2]";
        const SCORE_A_XPATH = "//a[contains(@href, '/World/Popmundo.aspx/Help/Scoring/')]";
        const BAND_ID_DIV_PATH = "//div[@class='idHolder']";
        const TXT_AREA_DIV_XPATH = "//div[@id='ppm-content']/div[2]";

        // Mekan detaylarını alıyoruz
        let msgXpathHelper = new XPathHelper(VENUE_A_XPATH);
        let venueAFirstNode = msgXpathHelper.getFirstOrderedNode(document);

        let venueANode = venueAFirstNode.singleNodeValue
        let venueId = parseInt(venueANode.getAttribute('href').replace(/[^0-9]/g, ''));
        let venueName = venueANode.textContent;

        // Şehir detaylarını alıyoruz
        msgXpathHelper.xpath = CITY_A_XPATH;
        let cityAFirstNode = msgXpathHelper.getFirstOrderedNode(document);

        let cityANode = cityAFirstNode.singleNodeValue;
        let cityId = parseInt(cityANode.getAttribute('href').replace(/[^0-9]/g, ''));
        let cityName = cityANode.textContent;

        // Konser zamanı detaylarını alıyoruz
        msgXpathHelper.xpath = TIME_TD_XPATH;
        let timeTDFirstNode = msgXpathHelper.getFirstOrderedNode(document);

        let timeTDNode = timeTDFirstNode.singleNodeValue;
        let dateArray = timeTDNode.textContent.match(/(\d{1,2}\/\d{1,2}\/\d{4}),\s+([0-9:]+)/);
        let dateString = (dateArray != null) ? dateArray[1] : 'Bilinmeyen tarih';
        let timeString = (dateArray != null) ? dateArray[2] : 'Bilinmeyen saat';

        // Puan detaylarını alıyoruz
        msgXpathHelper.xpath = SCORE_A_XPATH;
        let scoreAFirstNode = msgXpathHelper.getFirstOrderedNode(document);

        let scoreANode = scoreAFirstNode.singleNodeValue;
        let fame = scoreANode.href.match(/Scoring\/([0-9]{1,2})/)[1];
        let priceStr = "0 M$";

        // Fiyatlandırma mantığı... (Yorumlar çevrildi)
        switch (fame) {
            case "1": // Gerçekten Çok Kötü
                priceStr = "6M$";
                break;
            case "2": // Çok Kötü
                priceStr = "6.5 M$";
                break;
            // ... diğer case'ler ...
            case "26":
                priceStr = "100 M$";
                break;
            default:
                // === ÇEVİRİ ===
                alert("Şöhret seviyesiyle ilgili bir sorun oluştu!");
                break;
        }

        // Grup ID'sini alıyoruz
        msgXpathHelper.xpath = BAND_ID_DIV_PATH;
        let bandIdDivFirstNode = msgXpathHelper.getFirstOrderedNode(document);
        let bandIdDiv = bandIdDivFirstNode.singleNodeValue;
        let bandId = bandIdDiv.textContent;

        msgXpathHelper.xpath = TXT_AREA_DIV_XPATH;
        let txtAreaDivFirstNode = msgXpathHelper.getFirstOrderedNode(document);
        let txtAreaDivNode = txtAreaDivFirstNode.singleNodeValue;

        let textArea1 = document.createElement('textarea');
        textArea1.setAttribute('cols', 55);
        textArea1.setAttribute('rows', 9);
        textArea1.setAttribute('id', 'show_message');

        // === ÇEVİRİ: Mesaj şablonu Türkçeleştirildi ===
        textArea1.innerHTML = `Merhaba,\n[artistid=${bandId} name=grubum] grubumun ${dateString} tarihinde, saat ${timeString} itibarıyla [cityid=${cityId} name=${cityName}] şehrindeki [localeid=${venueId} name=${venueName}] mekanında bir konseri planlanmıştır.\n\nBilet fiyatını ${priceStr} olarak ayarlayabilir misiniz?\n\nTeşekkürler!`;

        txtAreaDivNode.appendChild(document.createElement('br'));
        txtAreaDivNode.appendChild(document.createElement('br'));
        txtAreaDivNode.appendChild(textArea1);
    }
}

// Ayarlar değiştirildiğinde, global değişkeni güncelliyoruz
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace == 'sync') {
        let reload = false;

        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key == 'show_msg_helper') {
                showMessageArea = newValue;
                reload = true;
            }
        }

        if (reload) location.reload();
    }
});

// Sayfa yüklendiğinde ayarlardan değeri alıp mantığı başlatıyoruz.
chrome.storage.sync.get(showMessageOptionsValues, items => {
    showMessageArea = items.show_msg_helper;

    manageShowArea();
});