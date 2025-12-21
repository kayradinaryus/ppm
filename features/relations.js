// Popmundo Araç Seti v1.0
// Dört script'in (call-all-friends, address-book-adder, jealous, mass-interact) birleştirilmiş hali.

(function($) {
    'use strict';
// ===================================================================================
// MODÜL 1: HERKESİ ARA (CALL ALL FRIENDS) - HIZLANDIRILMIŞ VERSİYON
// ===================================================================================
const CallAllFriends = {
    getRandomDelay: function(minMs, maxMs) {
        return Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    },
    checkAvailability: async function(characterId) {
        try {
            const profileUrl = `${window.location.origin}/World/Popmundo.aspx/Character/${characterId}`;
            const response = await fetch(profileUrl);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const statusText = doc.querySelector('.status')?.textContent || '';
            const unavailableStates = ['Sahnede', 'Uçuyor', 'Sakinleştirilmiş', 'Keşifte'];
            return !unavailableStates.some(state => statusText.includes(state));
        } catch (error) {
            console.error(`[Herkesi Ara] Durum kontrolü hatası: ${error.message}`);
            return false;
        }
    },
    start: async function() {
        if (!confirm("Tüm ilişki listenizdeki uygun kişiler aranacak. Bu işlem biraz zaman alabilir ve işlem bittiğinde sayfa yenilenecektir. Onaylıyor musunuz?")) return;

        console.log("[Herkesi Ara] Arama işlemi başlatıldı");
        let statusDiv = document.createElement('div');
        statusDiv.id = 'call-status';
        Object.assign(statusDiv.style, { position: 'fixed', bottom: '0', left: '0', width: '100%', padding: '5px 10px', backgroundColor: 'rgba(240, 240, 240, 0.9)', borderTop: '1px solid #ccc', fontSize: '0.9em', zIndex: '9999', boxSizing: 'border-box' });
        document.body.appendChild(statusDiv);

        const rows = Array.from(document.querySelectorAll('tr')).filter(row => row.querySelector('a[href*="/Character/"]'));
        let friendsInfo = [];
        for (const row of rows) {
            const idLink = row.querySelector('a[href*="/Character/"]');
            const href = idLink.getAttribute('href');
            const idMatch = href.match(/Character\/(\d+)/);
            if (!idMatch) continue;
            const bars = row.querySelectorAll('.progressBar');
            friendsInfo.push({
                id: parseInt(idMatch[1]),
                name: idLink.textContent.trim(),
                friendship: parseInt(bars[0]?.title?.replace('%', '') || '0'),
                romance: parseInt(bars[1]?.title?.replace('%', '') || '0')
            });
        }

        console.log(`[Herkesi Ara] ${friendsInfo.length} kişi bulundu`);
        for (let i = 0; i < friendsInfo.length; i++) {
            const friend = friendsInfo[i];
            statusDiv.textContent = `Kontrol ediliyor: ${friend.name} (${i + 1}/${friendsInfo.length})`;

            const isAvailable = await this.checkAvailability(friend.id);
            if (!isAvailable) {
                statusDiv.textContent = `${friend.name} şu anda müsait değil, atlanıyor...`;
                await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(1000, 1500))); // Müsait olmayanlar için kısa bir bekleme.
                continue;
            }

            try {
                const interactUrl = `${window.location.origin}/World/Popmundo.aspx/Interact/Phone/${friend.id}`;
                const response = await fetch(interactUrl);
                const html = await response.text();
                const doc = (new DOMParser()).parseFromString(html, "text/html");
                const form = doc.getElementById('aspnetForm');
                if (!form) continue;

                const formData = new FormData(form);
                let interactionType = '171';
                if (friend.romance > 50) interactionType = '165';
                else if (friend.romance > 1 && friend.romance < 50 && doc.querySelector('option[value="73"]')) interactionType = '73';
                else if (friend.friendship > 0 && doc.querySelector('option[value="24"]')) interactionType = '24';

                formData.set('ctl00$cphTopColumn$ctl00$ddlInteractionTypes', interactionType);
                formData.set('ctl00$cphTopColumn$ctl00$btnInteract', 'Interact');

                statusDiv.textContent = `${friend.name} aranıyor...`;

                await fetch(interactUrl, { method: 'POST', body: formData });

            } catch (error) {
                console.error(`[Herkesi Ara] Hata: ${friend.name} aranamadı`, error);
                statusDiv.textContent = `Hata: ${friend.name} aranamadı - ${error.message}`;
            }

            statusDiv.textContent = `${friend.name} ile işlem tamamlandı. Sonraki kişi için bekleniyor...`;
            if (i < friendsInfo.length - 1) { // Son kişiden sonra bekleme yapmaya gerek yok.
                await new Promise(resolve => setTimeout(resolve, this.getRandomDelay(4500, 5500)));
            }
        }
        statusDiv.textContent = 'Tüm aramalar tamamlandı! Sayfa 3 saniye içinde yenilenecek...';
        await new Promise(resolve => setTimeout(resolve, 3000));
        location.reload();
    }
};
    // ===================================================================================
    // MODÜL 2: ADRES DEFTERİNE EKLE (ADDRESS BOOK ADDER)
    // ===================================================================================
    const AddressBookAdder = {
        arkadaslarListesi: [],
        islemBasladi: false,
        rastgeleBekle: function(min, max) {
            return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
        },
        adreseEkle: async function(index, statusDiv) {
            if (index >= this.arkadaslarListesi.length) {
                statusDiv.innerHTML = "<b>Tüm işlemler tamamlandı!</b> Sayfa birkaç saniye içinde yenilenecek.";
                setTimeout(() => location.reload(), 3000);
                this.islemBasladi = false;
                return;
            }
            let karakter = this.arkadaslarListesi[index];
            statusDiv.innerHTML = `[${index + 1}/${this.arkadaslarListesi.length}] <b>${karakter.isim}</b> için işlem başlatılıyor...`;
            try {
                statusDiv.innerHTML = `[${index + 1}/${this.arkadaslarListesi.length}] <b>${karakter.isim}</b> için onay sayfası alınıyor...`;
                const response = await fetch(karakter.onaySayfasiLinki);
                const html = await response.text();
                const doc = (new DOMParser()).parseFromString(html, "text/html");
                const viewState = doc.querySelector('#__VIEWSTATE')?.value || '';
                if (!viewState) throw new Error('__VIEWSTATE verisi bulunamadı.');

                const formData = new FormData(doc.getElementById('aspnetForm'));
                formData.set('ctl00$cphLeftColumn$ctl00$btnSave', 'Adres defterine ekle');
                statusDiv.innerHTML = `[${index + 1}/${this.arkadaslarListesi.length}] <b>${karakter.isim}</b> adres defterine ekleniyor...`;
                await fetch(karakter.onaySayfasiLinki, { method: 'POST', body: formData });
                statusDiv.innerHTML = `[${index + 1}/${this.arkadaslarListesi.length}] <b style="color: green;">${karakter.isim}</b> başarıyla eklendi!`;
            } catch (error) {
                console.error(`[Adres Defteri] Hata: ${karakter.isim} eklenemedi.`, error);
                statusDiv.innerHTML = `[${index + 1}/${this.arkadaslarListesi.length}] <b style="color: red;">${karakter.isim}</b> eklenirken bir hata oluştu: ${error.message}`;
            } finally {
                await this.rastgeleBekle(2500, 4500);
                this.adreseEkle(index + 1, statusDiv);
            }
        },
        start: function() {
            if (this.islemBasladi) return;
            if (!confirm("Sayfadaki tüm arkadaşlar adres defterinize eklenecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?")) return;
            this.islemBasladi = true;
            this.arkadaslarListesi = [];
            let statusDiv = document.createElement('div');
            statusDiv.id = 'adres-ekleme-status';
            Object.assign(statusDiv.style, { position: 'fixed', bottom: '0', left: '0', width: '100%', padding: '5px 10px', backgroundColor: 'rgba(240, 240, 240, 0.9)', borderTop: '1px solid #ccc', fontSize: '0.9em', zIndex: '9999', boxSizing: 'border-box' });
            document.body.appendChild(statusDiv);
            statusDiv.innerHTML = "Arkadaş listesi taranıyor...";
            $("table.data tbody tr").each((i, el) => {
                let satir = $(el);
                let karakterIsmi = satir.find("td:first-child a").text().trim();
                let detayLinki = satir.find("td:nth-child(5) a[href*='/Interact/Details/']").attr("href");
                if (detayLinki) {
                    this.arkadaslarListesi.push({
                        isim: karakterIsmi,
                        onaySayfasiLinki: detayLinki.replace('/Interact/Details/', '/Character/AddToAddressBook/')
                    });
                }
            });
            if (this.arkadaslarListesi.length > 0) {
                statusDiv.innerHTML = `<b>${this.arkadaslarListesi.length}</b> kişi bulundu. Otomatik ekleme işlemi başlıyor...`;
                this.adreseEkle(0, statusDiv);
            } else {
                statusDiv.innerHTML = "Adres defterine eklenecek kimse bulunamadı.";
                this.islemBasladi = false;
                setTimeout(() => $(statusDiv).fadeOut(() => $(statusDiv).remove()), 3000);
            }
        }
    };

    // ===================================================================================
    // MODÜL 3: KISKANÇLIK AYARI (JEALOUSY)
    // ===================================================================================
    const Jealousy = {
        romantikKarakterler: [],
        iframe: null,
        iframeYuklenmesiniBekle: function(iframe) {
            return new Promise((resolve, reject) => {
                iframe.off("load error").on("load", () => {
                    try {
                        const doc = iframe[0].contentDocument || iframe[0].contentWindow.document;
                        resolve(doc);
                    } catch (e) {
                        resolve(null); // Sandbox hatası
                    }
                }).on("error", () => reject(new Error("Iframe yüklenemedi.")));
            });
        },
        karakterSayfasiniAc: async function(index, statusDiv) {
            if (index >= this.romantikKarakterler.length) {
                statusDiv.innerHTML = '<b>Tüm kıskançlık ayarları yapıldı!</b> Sayfa yenileniyor...';
                this.iframe.remove();
                setTimeout(() => location.reload(), 3000);
                return;
            }
            let karakter = this.romantikKarakterler[index];
            statusDiv.innerHTML = `[${index + 1}/${this.romantikKarakterler.length}] <b>${karakter.isim}</b> için ayarlar yapılıyor...`;
            this.iframe.attr("src", karakter.link);
            try {
                let iframeDoc = await this.iframeYuklenmesiniBekle(this.iframe);
                if (iframeDoc) {
                    let kiskancAyari = $(iframeDoc).find("#ctl00_cphTopColumn_ctl00_ddlSexCausesJealousy");
                    if (kiskancAyari.length > 0 && kiskancAyari.val() !== "0") {
                        $(iframeDoc).find("#ctl00_cphTopColumn_ctl00_btnSexCausesJealousy")[0].click();
                        await this.iframeYuklenmesiniBekle(this.iframe);
                        statusDiv.innerHTML = `[${index + 1}/${this.romantikKarakterler.length}] <b style="color: green;">${karakter.isim}</b> için kıskançlık kapatıldı!`;
                    } else {
                        statusDiv.innerHTML = `[${index + 1}/${this.romantikKarakterler.length}] <b style="color: orange;">${karakter.isim}</b> için ayar zaten kapalı.`;
                    }
                }
            } catch (hata) {
                console.error(`[Kıskançlık] Hata: ${karakter.isim} işlenemedi.`, hata);
                statusDiv.innerHTML = `[${index + 1}/${this.romantikKarakterler.length}] <b style="color: red;">${karakter.isim}</b> işlenirken hata oluştu.`;
            } finally {
                setTimeout(() => this.karakterSayfasiniAc(index + 1, statusDiv), 2000);
            }
        },
        start: function() {
            if ($('#jealousy-status').length > 0) return;
            let statusDiv = document.createElement('div');
            statusDiv.id = 'jealousy-status';
            Object.assign(statusDiv.style, { position: 'fixed', bottom: '0', left: '0', width: '100%', padding: '5px 10px', backgroundColor: 'rgba(240, 240, 240, 0.9)', borderTop: '1px solid #ccc', fontSize: '0.9em', zIndex: '9999', boxSizing: 'border-box' });
            document.body.appendChild(statusDiv);
            statusDiv.innerHTML = 'Romantik ilişkiler taranıyor...';
            this.romantikKarakterler = [];
            $("table.data tbody tr").each((i, el) => {
                let romantizmCubugu = $(el).find("td:nth-child(3) .progressBar");
                if (romantizmCubugu.length > 0 && parseInt(romantizmCubugu.attr("title")?.replace('%', '') || 0) > 20) {
                    this.romantikKarakterler.push({
                        isim: $(el).find("td:first-child a").text().trim(),
                        link: $(el).find("td:nth-child(5) a").attr("href")
                    });
                }
            });
            if (this.romantikKarakterler.length > 0) {
                statusDiv.innerHTML = `<b>${this.romantikKarakterler.length}</b> kişi bulundu. Ayarlar yapılıyor...`;
                this.karakterSayfasiniAc(0, statusDiv);
            } else {
                statusDiv.innerHTML = 'İşlem yapılacak kimse bulunamadı.';
                setTimeout(() => $(statusDiv).fadeOut(() => $(statusDiv).remove()), 3000);
            }
        },
        initIframe: function() {
            if (!this.iframe) {
                this.iframe = $("<iframe>", {
                    id: "jealousy-iframe",
                    sandbox: "allow-forms allow-scripts allow-same-origin",
                    css: { display: "none" }
                }).appendTo("body");
            }
        }
    };

    // ===================================================================================
    // MODÜL 4: TOPLU ETKİLEŞİM (MASS INTERACT)
    // ===================================================================================
    const MassInteract = {
        ETKILESIM_GECIKMESI: 1500,
        KISI_GECIKMESI: 3000,
        KULLANILACAK_ETKILESIMLER: [],
        iframe: null,
        statusDiv: null,
        getEnabledInteractions: async function() {
            const valueMap = { "mass_interact_greet": 1, "mass_interact_smile": 54, "mass_interact_wink": 161, "mass_interact_insult": 15, "mass_interact_share_opinions": 62, "mass_interact_gossip": 65, "mass_interact_have_profound_discussion": 34, "mass_interact_comfort": 51, "mass_interact_talk_to": 3, "mass_interact_tease": 5, "mass_interact_fraternize": 57, "mass_interact_offer_advice": 68, "mass_interact_compliment": 14, "mass_interact_hey_sexy_how_you_doin": 71, "mass_interact_praise": 75, "mass_interact_tell_naughty_joke": 76, "mass_interact_share_secrets": 69, "mass_interact_hang_out": 70, "mass_interact_play_with": 18, "mass_interact_pat_on_back": 63, "mass_interact_braid_hair": 66, "mass_interact_shake_hands": 55, "mass_interact_rub_elbows": 59, "mass_interact_hug": 8, "mass_interact_tickle": 12, "mass_interact_buy_a_drink": 7, "mass_interact_stroll_hand_in_hand": 129, "mass_interact_flex_biceps": 89, "mass_interact_caress": 30, "mass_interact_ask_for_a_dance": 35, "mass_interact_high_five": 60, "mass_interact_arm_wrestle": 67, "mass_interact_kiss_cheeks": 56, "mass_interact_embrace": 64, "mass_interact_kiss": 9, "mass_interact_kiss_passionately": 10, "mass_interact_enjoy_kobe_sutra": 164, "mass_interact_5_minute_quickie": 13, "mass_interact_tantric_sex": 19, "mass_interact_make_love": 11, "mass_interact_give_massage": 44, "mass_interact_bless": 39, "mass_interact_do_funny_magic": 33, "mass_interact_tell_joke": 4, "mass_interact_seek_apprenticeship": 29, "mass_interact_sing_to": 21, "mass_interact_serenade": 78, "mass_interact_guide": 94, "mass_interact_google": 6, "mass_interact_change_diapers": 95, "mass_interact_pick_up": 93, "mass_interact_kiss_on_forehead": 103 };
            const keys = Object.keys(valueMap);
            const settings = await chrome.storage.sync.get(keys);
            this.KULLANILACAK_ETKILESIMLER = keys.filter(key => settings[key] === true && valueMap[key]).map(key => valueMap[key]);
        },
        updateStatus: function(message) { if (this.statusDiv) this.statusDiv.innerHTML = message; console.log(`[Toplu Etkileşim] ${message}`); },
        iframeYuklemeBekle: function() { return new Promise(resolve => { this.iframe.onload = resolve; }); },
        cevrimiciKisileriAl: async function() {
            this.updateStatus('Şehirdeki çevrimiçi kişiler listesi alınıyor...');
            this.iframe.src = `/World/Popmundo.aspx/City/PeopleOnline/`;
            await this.iframeYuklemeBekle();
            let iframeDoc = this.iframe.contentDocument;
            const onlinePeople = [];
            $(iframeDoc).find('a[id*="_lnkCharacter"][href*="/Character/"]').each((i, el) => {
                const row = $(el).closest('tr');
                if (!row.length) return;
                const statusText = row.find('td:nth-child(3)').text().trim().toLowerCase();
                if (!["seyahatte", "keşifte", "uçuyor", "uyuyor", "çalışıyor"].some(s => statusText.includes(s))) {
                    onlinePeople.push({ id: el.href.match(/\/(\d+)$/)[1], name: el.textContent.trim() });
                }
            });
            this.updateStatus(`Etkileşim için uygun ${onlinePeople.length} kişi bulundu.`);
            return onlinePeople;
        },
        konumaGit: async function(kisi) {
            this.updateStatus(`${kisi.name} adlı kişinin yanına gidiliyor...`);
            this.iframe.src = `/World/Popmundo.aspx/Character/${kisi.id}`;
            await this.iframeYuklemeBekle();
            let locationLink = $(this.iframe.contentDocument).find('#ctl00_cphRightColumn_ctl00_lnkInteract, .characterPresentation a:last-of-type').attr('href');
            if (locationLink) {
                this.iframe.src = locationLink;
                await this.iframeYuklemeBekle();
                this.updateStatus(`${kisi.name} ile aynı mekana gelindi.`);
                return true;
            }
            this.updateStatus(`<b style="color:orange;">${kisi.name}</b> adlı kişinin konumu bulunamadı veya meşgul. Atlanıyor...`);
            return false;
        },
        tumEtkilesimleriYap: async function(kisi) {
            let etkilesimSayaci = 0;
            while (true) {
                await new Promise(resolve => setTimeout(resolve, this.ETKILESIM_GECIKMESI));
                let iframeDoc = this.iframe.contentDocument;
                const availableOptions = Array.from(iframeDoc.querySelectorAll('#ctl00_cphTopColumn_ctl00_ddlInteractionTypes option')).map(opt => parseInt(opt.value));
                const possibleInteractions = availableOptions.filter(val => this.KULLANILACAK_ETKILESIMLER.includes(val));
                if (possibleInteractions.length === 0) {
                    this.updateStatus(`${kisi.name} için yapılabilecek başka etkileşim kalmadı.`);
                    break;
                }
                const interactionId = possibleInteractions[0];
                const interactionName = iframeDoc.querySelector(`option[value="${interactionId}"]`).textContent;
                this.updateStatus(`- ${kisi.name} ile [${interactionName}] etkileşimi yapılıyor...`);
                iframeDoc.querySelector('#ctl00_cphTopColumn_ctl00_ddlInteractionTypes').value = interactionId;
                iframeDoc.querySelector('#ctl00_cphTopColumn_ctl00_btnInteract').click();
                await this.iframeYuklemeBekle();
                etkilesimSayaci++;
            }
            if(etkilesimSayaci > 0) this.updateStatus(`<b style="color:green;">${kisi.name}</b> ile toplam ${etkilesimSayaci} etkileşim gerçekleştirildi.`);
        },
        start: async function() {
            const button = $('#mass-interact-start-button');
            if (button.hasClass('running') || this.KULLANILACAK_ETKILESIMLER.length === 0) {
                if(this.KULLANILACAK_ETKILESIMLER.length === 0) alert("Toplu Etkileşim ayarlarından en az bir etkileşim türü seçmelisiniz.");
                return;
            }
            button.addClass('running').css('opacity', '0.5');
            this.statusDiv = document.createElement('div');
            Object.assign(this.statusDiv.style, { position: 'fixed', bottom: '0', left: '0', width: '100%', padding: '5px 10px', backgroundColor: 'rgba(240, 240, 240, 0.9)', borderTop: '1px solid #ccc', fontSize: '0.9em', zIndex: '9999', boxSizing: 'border-box' });
            document.body.appendChild(this.statusDiv);
            this.iframe = $('<iframe id="mass-interact-iframe" style="display: none;"></iframe>').appendTo('body')[0];
            try {
                const hedefKisiler = await this.cevrimiciKisileriAl();
                if (hedefKisiler.length > 0) {
                    for (let i = 0; i < hedefKisiler.length; i++) {
                        this.updateStatus(`--- Kişi ${i+1}/${hedefKisiler.length}: ${hedefKisiler[i].name} ---`);
                        if (await this.konumaGit(hedefKisiler[i])) {
                            await this.tumEtkilesimleriYap(hedefKisiler[i]);
                        }
                        await new Promise(resolve => setTimeout(resolve, this.KISI_GECIKMESI));
                    }
                }
                this.updateStatus("🎉 <b>Tüm işlemler tamamlandı!</b>");
                setTimeout(() => $(this.statusDiv).fadeOut(() => $(this.statusDiv).remove()), 5000);
            } catch (error) {
                this.updateStatus(`<b style="color:red;">Bir hata oluştu: ${error.message}</b>`);
                console.error(error);
            } finally {
                $(this.iframe).remove();
                button.removeClass('running').css('opacity', '1');
            }
        },
        init: async function() {
            await this.getEnabledInteractions();
            // initIframe'e gerek kalmadı, işlem başlayınca oluşturuluyor.
        }
    };
    
    // ===================================================================================
    // ANA BAŞLATICI (MASTER INITIALIZER)
    // ===================================================================================
    function initializeAllIcons() {
        const targetHeader = $('h1').filter(function() {
            return $(this).contents().filter(function() { return this.nodeType === 3; }).text().trim().startsWith('İlişkiler');
        });

        if (targetHeader.length > 0 && $('#popmundo-tool-container').length === 0) {
            const container = $('<span id="popmundo-tool-container" style="margin-left: 15px; display: inline-flex; gap: 8px; vertical-align: middle;"></span>');

            // 1. Herkesi Ara İkonu
            const callIcon = $('<img>', {
                src: 'https://i.ibb.co/YB4s4zyx/mobile-phone.png',
                title: 'Herkesi Ara',
                css: { height: '20px', width: '20px', cursor: 'pointer' },
                click: () => CallAllFriends.start()
            });

            // 2. Toplu Etkileşim İkonu
            const massInteractIcon = $('<img>', {
                src: 'https://www.popmundo.com/Static/Icons/store.png',
                title: 'Şehirdeki Çevrimiçi Kişilerle Etkileşime Gir',
                css: { height: '16px', width: '16px', cursor: 'pointer' },
                click: () => MassInteract.start()
            });

            // 3. Adres Defterine Ekle İkonu
            const addBookIcon = $('<img>', {
                src: 'https://popmundo.com/Static/Icons/users.png',
                title: 'Tüm arkadaşları adres defterine ekle',
                css: { height: '16px', width: '16px', cursor: 'pointer' },
                click: () => AddressBookAdder.start()
            });

            // 4. Kıskançlık Ayarı İkonu
            const jealousIcon = $('<img>', {
                src: 'https://www.popmundo.com/Static/Icons/cake.png',
                title: 'Tüm ilişkiler için kıskançlığı kapat',
                css: { height: '16px', width: '16px', cursor: 'pointer' },
                click: () => Jealousy.start()
            });
            
            container.append(callIcon, massInteractIcon, addBookIcon, jealousIcon);
            targetHeader.append(container);

            // Gerekli başlangıç ayarları
            Jealousy.initIframe();
            MassInteract.init();
        }
    }

    // Sayfa yüklendiğinde ikonları oluşturmayı dene
    $(document).ready(function() {
        const maxRetries = 20;
        let retries = 0;
        const interval = setInterval(() => {
            if ($('h1').filter(function() { return $(this).text().includes('İlişkiler'); }).length > 0) {
                clearInterval(interval);
                initializeAllIcons();
            } else if (++retries > maxRetries) {
                clearInterval(interval);
            }
        }, 250);
    });

})(jQuery);