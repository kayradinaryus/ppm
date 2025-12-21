'use strict';

// Sadece senin istediğin ana özellikler kaldı
const globalOptions = {
    'fast_character_switch': true,
    'band_popularity_shortcut': true,
    'band_upcoming_shows': true,
    'character_send_message': true,
    'character_offer_an_item': true,
    'character_call': true,
    'city_book_regular_flight': true,
    'city_charter_vip_jet': true,
    'city_other_vehicles': true,
    'city_find_locales': true,
    'locale_characters_present': true,
    'move_to_shortcut': true,
    'crew_top_heist_shortcut': true,
    'locale_show_reconnaissance': true,
};

// İkon kontrol fonksiyonları
function checkCharLinks(aElem, elemID) {
    if (window.location.href.endsWith('/Conversations')) return false;
    let pageCharID = Utils.getMyID(); // utils.js'den gelir
    if (pageCharID != 0 && pageCharID == elemID) return false;
    return true;
}

function checkBandLinks() { return !Utils.isGreatHeist(); }
function checkCrewLinks() { return Utils.isGreatHeist(); }

// İkonları ekleyen ana fonksiyon
function handleIconLink(options) {
    let linkDB = [
        { 'option': 'band_upcoming_shows', 'xpath': "//a[contains(@href, 'Artist/')]", 're': /\/Artist\/(\d+)/m, 'urlCheck': '/Artist/UpcomingPerformances/', 'advanceCheckCB': checkBandLinks, 'href': '/World/Popmundo.aspx/Artist/UpcomingPerformances/', 'img': 'images/calendar-list.png', 'title': 'Gelecek Konserler' },
        { 'option': 'band_popularity_shortcut', 'xpath': "//a[contains(@href, 'Artist/')]", 're': /\/Artist\/(\d+)/m, 'urlCheck': '/Artist/Popularity/', 'advanceCheckCB': checkBandLinks, 'href': '/World/Popmundo.aspx/Artist/Popularity/', 'img': 'images/star.png', 'title': 'Popülerlik' },
        { 'option': 'crew_top_heist_shortcut', 'xpath': "//a[contains(@href, 'Artist/')]", 're': /\/Artist\/(\d+)/m, 'urlCheck': '/Artist/Popularity/', 'advanceCheckCB': checkCrewLinks, 'href': '/World/Popmundo.aspx/Artist/TopHeists/', 'img': 'images/star.png', 'title': 'En İyi Soygunlar' },
        { 'option': 'character_send_message', 'xpath': "//a[contains(@href, 'Character/')]", 're': /\/Character\/(\d+)/m, 'urlCheck': '/Conversation/', 'advanceCheckCB': checkCharLinks, 'href': '/World/Popmundo.aspx/Conversations/Conversation/', 'img': 'images/mail--arrow.png', 'title': 'Mesaj Gönder' },
        { 'option': 'character_offer_an_item', 'xpath': "//a[contains(@href, 'Character/')]", 're': /\/Character\/(\d+)/m, 'urlCheck': '/OfferItem/', 'advanceCheckCB': checkCharLinks, 'href': '/World/Popmundo.aspx/Character/OfferItem/', 'img': 'images/box--arrow.png', 'title': 'Eşya Teklif Et' },
        { 'option': 'character_call', 'xpath': "//a[contains(@href, 'Character/')]", 're': /\/Character\/(\d+)/m, 'urlCheck': '/Phone/', 'advanceCheckCB': checkCharLinks, 'href': '/World/Popmundo.aspx/Interact/Phone/', 'img': 'images/mobile-phone.png', 'title': 'Ara' },
        { 'option': 'city_other_vehicles', 'xpath': "//a[contains(@href, 'City/')]", 're': /\/City\/(\d+)/m, 'urlCheck': '/RoadTrip/', 'href': '/World/Popmundo.aspx/City/RoadTrip/', 'img': 'images/car--arrow.png', 'title': 'Diğer Araçlar' },
        { 'option': 'city_find_locales', 'xpath': "//a[contains(@href, 'City/')]", 're': /\/City\/(\d+)/m, 'urlCheck': '/City/Locales/', 'href': '/World/Popmundo.aspx/City/Locales/', 'img': 'images/magnifier.png', 'title': 'Mekan Bul' },
        { 'option': 'city_charter_vip_jet', 'xpath': "//a[contains(@href, 'City/')]", 're': /\/Artist\/(\d+)/m, 'urlCheck': '/PrivateJet/', 'href': '/World/Popmundo.aspx/City/PrivateJet/', 'img': 'images/paper-plane--plus.png', 'title': 'VIP Jet Kirala' },
        { 'option': 'city_book_regular_flight', 'xpath': "//a[contains(@href, 'City/')]", 're': /\/City\/(\d+)/m, 'urlCheck': '/BookFlight/', 'href': '/World/Popmundo.aspx/City/BookFlight/', 'img': 'images/paper-plane--arrow.png', 'title': 'Normal Uçuş Ayarla' },
        { 'option': 'locale_show_reconnaissance', 'xpath': "//a[contains(@href, 'Locale/')]", 're': /\/Locale\/(\d+)/m, 'urlCheck': '/Locale/', 'advanceCheckCB': checkCrewLinks, 'href': '/World/Popmundo.aspx/Locale/Reconnaissance/', 'img': 'images/binocular.png', 'title': 'Keşif' },
        { 'option': 'move_to_shortcut', 'xpath': "//a[contains(@href, 'Locale/')]", 're': /\/Locale\/(\d+)/m, 'urlCheck': '/Locale/', 'href': '/World/Popmundo.aspx/Locale/MoveToLocale/', 'img': 'images/movetolocale.png', 'title': 'Mekana Git' },
        { 'option': 'locale_characters_present', 'xpath': "//a[contains(@href, 'Locale/')]", 're': /\/Locale\/(\d+)/m, 'urlCheck': '/Locale/', 'href': '/World/Popmundo.aspx/Locale/CharactersPresent/', 'img': 'images/users.png', 'title': 'Mekandaki Karakterler' },
    ];

    for (let linkInfo of linkDB) {
        if (!options[linkInfo.option]) continue;
        let xpathHelper = new XPathHelper(linkInfo.xpath);
        let linkNodes = xpathHelper.getOrderedSnapshot(document);

        for (let i = 0; i < linkNodes.snapshotLength; i++) {
            let aElem = linkNodes.snapshotItem(i);
            if (aElem.getAttribute('data-processed')) continue;

            let linkMatch = linkInfo.re.exec(aElem.getAttribute('href'));
            if (!linkMatch) continue;
            if (window.location.href.includes(linkInfo.urlCheck + linkMatch[1])) continue;
            if (linkInfo.advanceCheckCB && !linkInfo.advanceCheckCB(aElem, linkMatch[1])) continue;

            let newA = document.createElement('a');
            newA.href = window.location.origin + linkInfo.href + linkMatch[1];
            let img = document.createElement('img');
            img.src = chrome.runtime.getURL(linkInfo.img);
            img.title = linkInfo.title;
            img.style.marginLeft = '3px';
            img.style.verticalAlign = 'middle';

            newA.appendChild(img);
            aElem.parentNode.insertBefore(newA, aElem.nextSibling);
            aElem.setAttribute('data-processed', 'true');
        }
    }
}

// Karakter değiştirme logic
function fastCharSwitch(autoClick = false) {
    const SELECT_XPATH = "//select[contains(@name, 'CurrentCharacter')]";
    const SUBMIT_XPATH = "//input[@type = 'image' and contains(@name, 'ChangeCharacter')]";
    let selectHelper = new XPathHelper(SELECT_XPATH);
    let selectElem = selectHelper.getFirstOrderedNode(document).singleNodeValue;

    if (selectElem) {
        selectElem.addEventListener('change', async () => {
            if (chrome.storage.session) await chrome.storage.session.remove('my_char_id');
            let submitHelper = new XPathHelper(SUBMIT_XPATH);
            let submitElem = submitHelper.getFirstOrderedNode(document).singleNodeValue;
            if (submitElem && autoClick) submitElem.click();
        });
    }
}

// Ayarlar butonu
function ayarlarIkonunuEkle() {
    const targetDiv = document.getElementById('character-tools-account');
    if (!targetDiv || document.getElementById('ppm-settings-btn')) return;
    const optionsLink = document.createElement('a');
    optionsLink.id = 'ppm-settings-btn';
    optionsLink.className = 'icon';
    optionsLink.href = '#';
    optionsLink.innerHTML = `<img title="Popmundo Araçları Ayarlar" src="https://74.popmundo.com/Static/Icons/notebook.png" style="border-width:0px;">`;
    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'cmd', payload: 'open-options' });
    });
    targetDiv.appendChild(optionsLink);
}

// Başlatıcı
if (window.top === window.self) {
    chrome.storage.sync.get(globalOptions, items => {
        handleIconLink(items);
        fastCharSwitch(items.fast_character_switch);
        ayarlarIkonunuEkle();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes['hot-reload']?.newValue) location.reload();
    });
}