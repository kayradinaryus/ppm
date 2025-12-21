// features/reminders-script.js
function getDayDetails(date = new Date()) {
    const YEAR_DAYS = 56;
    const DAY_DURATION = 1000 * 60 * 60 * 24;
    const DAY1 = new Date(2003, 0, 1, 0, 0, 0);
    let yesterday = new Date(date - DAY_DURATION);
    yesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
    let dayDifference = Math.ceil((yesterday - DAY1) / (DAY_DURATION)) + 1;
    let yearNumber = Math.ceil(dayDifference / YEAR_DAYS);
    let dayOfYear = parseInt(dayDifference % YEAR_DAYS);
    dayOfYear = dayOfYear === 0 ? 56 : dayOfYear;
    return { year: yearNumber, day: dayOfYear };
}
function checkReminders() {
    const TIMERS_STORAGE_VALUE = { 'timers': {} };
    let s = document.createElement('script');
    s.src = chrome.runtime.getURL('/injected-js/reminders-injected.js');
    s.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(s);
    document.addEventListener('deleteAndredirect', function (e) {
        let data = e.detail;
        chrome.storage.sync.get(TIMERS_STORAGE_VALUE)
            .then((items) => {
                if (items.timers.hasOwnProperty(data.characterID)) {
                    let timers = items.timers;
                    if (timers[data.characterID].hasOwnProperty(data.itemID)) {
                        delete timers[data.characterID][data.itemID];
                        chrome.storage.sync.set({ "timers": timers }, null);
                    }
                }
            });
        if (data.redirect) { window.location.href = `https://${window.location.host}/World/Popmundo.aspx/Character/ItemDetails/${data.itemID}`; }
    });

    let dateDetails = getDayDetails();
    if (!dateDetails) { console.error("Tarih detayları alınamadı!"); return; }

    let todayStr = `Bugün, ${dateDetails.year}. yılın ${dateDetails.day}. günü.`;
    const REMINDERS = [
        { dayNumber: 27, id: `day-27-${dateDetails.year}`, type: 'html', reminder: `3 tecrübe puanı almak için <a href="${Utils.getServerLink('/World/Popmundo.aspx/Locale/4141')}">Stockholm Mezarlığı'nı</a> ziyaret etmeyi ve <a href="${Utils.getServerLink('/World/Popmundo.aspx/Locale/ItemDetails/103487217')}">Frank Blomdahl Anıtı'nı</a> kullanmayı unutma.` },
        { dayNumber: 28, id: `day-28-${dateDetails.year}`, type: 'text', reminder: `Bugün Ölüler Günü!` },
        { dayNumber: 40, id: `day-40-${dateDetails.year}`, type: 'text', reminder: `Bugün Aziz Kobe Günü! Müzik türü yeteneklerini geliştirecek macera dolu bir görev için Johannesburg, Moskova, Singapur ve Tromsø'daki Göksel Güzellik Heykellerini araştır.` },
        { dayNumber: 48, id: `day-48-${dateDetails.year}`, type: 'text', reminder: `Halloween Horror'ını kullanmayı unutma!` },
        { dayNumber: 52, id: `day-52-${dateDetails.year}`, type: 'text', reminder: `Bugün Noel!` },
        { dayNumber: 54, id: `day-54-${dateDetails.year}`, type: 'text', reminder: `Yıldız kaliteni artırmak ve bir tecrübe puanı almak için Marvin Tişörtünü giymeyi unutma.` },
    ];

    if (typeof Utils !== 'undefined' && Utils.isGreatHeist && Utils.isGreatHeist()) {
        let nowDate = new Date();
        if (nowDate.getDay() == 4) {
            REMINDERS.push({ dayNumber: dateDetails.day, id: `tgh-card-day-${dateDetails.year}-${dateDetails.day}`, type: 'text', reminder: `Bugün Perşembe, ücretsiz kartlarını almayı unutma!`, });
        } 
    }

    let notificationData = [];
    REMINDERS.forEach((info) => {
        if (info.dayNumber == dateDetails.day) {
            notificationData.push({ id: info.id, type: info.type, content: `${todayStr} ${info.reminder}` });
        }
    });

    chrome.storage.sync.get(TIMERS_STORAGE_VALUE)
        .then((items) => {
            let nowTimeStamp = Date.now();
            let myID = (typeof Utils !== 'undefined' && Utils.getMyID) ? Utils.getMyID() : 0;
            if (myID && items.timers.hasOwnProperty(myID)) {
                let timers = items.timers[myID];
                for (const [itemID, itemDetails] of Object.entries(timers)) {
                    if (nowTimeStamp < itemDetails.timerTimeStamp) continue;
                    notificationData.push({ id: itemID, type: 'html', content: `"${itemDetails.name}" adlı eşyan kullanıma hazır. <a id='item-${itemID}' onclick='deleteAndredirect(${myID}, ${itemID}, true)'>Kullan</a> ya da <a id='${itemID}' onclick='deleteAndredirect(${myID}, ${itemID}, false)'>Bildirimi Kapat</a>.` });
                }
            }
            let notifications = new Notifications();
            notificationData.forEach((details) => {
                if ('text' === details.type)
                    notifications.notifySuccess(details.id, details.content);
                else if ('html' === details.type) {
                    let notificationNode = notifications.notifySuccess(details.id);
                    notificationNode.innerHTML = details.content;
                }
            });
        });
}
checkReminders();