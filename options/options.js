// options.js - Nova Maximoff Nihai Temizlenmiş Sürüm

const optionDetails = [
    // Gelişmiş Bağlantı Seçenekleri
    { 'name': 'band_popularity_shortcut', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'band_upcoming_shows', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'character_send_message', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'character_call', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'character_offer_an_item', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'city_book_regular_flight', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'city_charter_vip_jet', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'city_other_vehicles', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'city_find_locales', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'locale_characters_present', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'move_to_shortcut', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'locale_show_reconnaissance', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'crew_top_heist_shortcut', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },

    // Çeşitli Seçenekler
    { 'name': 'fast_character_switch', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'score_highlight', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'redirect_to_login', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'score_scale', 'default': "0_26", 'save_cb': saveSelect, 'load_cb': loadSelect },

    // Açılır Pencere (Popup) Seçenekleri
    { 'name': 'character_popup', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'song_popup', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'recent_progress_popup', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'show_club_popup', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'show_details_popup', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },

    // Tur Otobüsü Seçenekleri
    { 'name': 'tb_enable', 'default': true, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'tb_book_after', 'default': 'previous_event', 'save_cb': saveSelect, 'load_cb': loadSelect },
    { 'name': 'tb_hour_range', 'default': 1, 'save_cb': saveInteger, 'load_cb': loadInteger },
    
    // Özel Eklentiler
    { 'name': 'mass_offer_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'autograph_collector_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'locale_money_manager_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'advanced_inviter_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'zombie_needle_automaton_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'periodic_maintenance_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox },
    { 'name': 'graffiti_bot_enable', 'default': false, 'save_cb': saveCheckBox, 'load_cb': loadCheckBox }
];


// Yükleme ve Kaydetme Fonksiyonları (Orijinal yapı korundu)
function saveCheckBox(optionName) { return document.getElementById(optionName).checked; }
function loadCheckBox(optionName, optionValue) { document.getElementById(optionName).checked = optionValue; }
function loadInteger(optionName, optionValue) { document.getElementById(optionName).value = optionValue; }
function saveInteger(optionName) { return document.getElementById(optionName).value; }
function saveSelect(optionName) { return document.getElementById(optionName).value; }
function loadSelect(optionName, optionValue) { document.getElementById(optionName).value = optionValue; }

function save_options() {
    let optionsToSave = {};
    optionDetails.forEach(option => {
        if (option.hasOwnProperty('save_cb')) {
            optionsToSave[option.name] = option.save_cb(option.name);
        }
    });

    chrome.storage.sync.set(optionsToSave, function () {
        var status = document.getElementById('status');
        status.textContent = 'Ayarlar kaydedildi.';
        status.style.color = '#28a745';
        setTimeout(() => { status.textContent = ''; }, 1000);
    });
}

function restore_options() {
    let defaultOptions = {};
    let optionsLoadCB = {};
    optionDetails.forEach(option => {
        defaultOptions[option.name] = option.default;
        if (option.load_cb != null) optionsLoadCB[option.name] = option.load_cb;
    });
    chrome.storage.sync.get(defaultOptions, items => {
        for (let option in items) {
            if (optionsLoadCB.hasOwnProperty(option)) optionsLoadCB[option](option, items[option]);
        }
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);