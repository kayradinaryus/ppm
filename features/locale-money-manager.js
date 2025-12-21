// features/locale-money-manager.js

(async function() {
    'use strict';

    // Öncelikle bu özelliğin ayarlardan aktif edilip edilmediğini kontrol edelim.
    const settings = await chrome.storage.sync.get({ 'locale_money_manager_enable': false });
    if (!settings.locale_money_manager_enable) {
        return; // Eğer özellik kapalıysa, scriptin geri kalanını çalıştırma.
    }

    // === Sizin kodunuzun tamamı burada başlıyor ===
    jQuery(document).ready(function() {
        let availableFunds = 0;

        const fundsText = jQuery("#ppm-content p:nth-of-type(2) strong").text();
        if (fundsText) {
            availableFunds = parseFloat(fundsText.replace(/[^\d,]/g, '').replace(',', '.'));
            console.log("Mevcut fonlar:", availableFunds);
        }

        const tableLocales = jQuery("#tablelocales");

        if (tableLocales.length) {
            const newDiv = jQuery("<div>").addClass("box");
            const newH2 = jQuery("<h2>").text("Lokasyon Para Yöneticisi");
            newDiv.append(newH2);

            const hintParagraph = jQuery("<p>")
                .html("<strong>Talimatlar:</strong> Bu alanı şirketiniz ve kontrol ettiği lokasyonlar arasında para transferi yapmak için kullanın. <br>"
                      + "<strong>Pozitif</strong> bir değer girerek parayı <strong>şirketten lokasyonlara</strong> transfer edin. <br>"
                      + "<strong>Negatif</strong> bir değer girerek parayı <strong>lokasyonlardan şirkete</strong> transfer edin. <br>"
                      + "Aşağıda listelenen tüm lokasyonlara değeri uygulamak için <strong>Doldur</strong> butonuna tıklayın. <br>"
                      + "Onay kutusu işaretliyse, yeterli bakiyesi olmayan lokasyonlar için otomatik olarak mümkün olan maksimum değer ayarlanacaktır.");
            newDiv.append(hintParagraph);

            const inputNumber = jQuery("<input>").attr({type: "number", min: "0", placeholder: "Tam sayı değer girin", class: "round width100px", "data-custom-input": "true"});
            newDiv.append(inputNumber);

            const inputSubmit = jQuery("<input>").attr({type: "button", value: "Doldur"}).on("click", function(event) {
                event.preventDefault();
                const inputValue = parseFloat(inputNumber.val()) || 0;
                if (inputValue > 0 && availableFunds < inputValue * localeData.length) {
                    alert("Şirketin kasasında yeterli bakiye yok.");
                    return;
                }
                if (inputValue < 0 && !jQuery("#removePartial").is(":checked")) {
                    const insufficientLocales = localeData.filter(locale => locale.moneyAvailable + inputValue < 0);
                    if (insufficientLocales.length > 0) {
                        alert("Şu lokasyonlarda yeterli para yok:\n" + insufficientLocales.map(locale => locale.localeName).join("\n"));
                        return;
                    }
                }
                localeData.forEach(locale => {
                    if (jQuery("#removePartial").is(":checked") && inputValue < 0) {
                        const valueToFill = Math.min(Math.abs(inputValue), locale.moneyAvailable);
                        jQuery(`#${locale.inputId}`).val(-valueToFill);
                    } else {
                        jQuery(`#${locale.inputId}`).val(inputValue);
                    }
                });
                inputNumber.val(0);
            });
            newDiv.append(inputSubmit);

            const withdrawAllButton = jQuery("<input>").attr({type: "button", value: "Mekanlardaki Tüm Parayı Çek"}).css("margin-left", "10px").on("click", function(event) {
                event.preventDefault();
                localeData.forEach(locale => {
                    if (locale.moneyAvailable > 0) {
                        const amountToWithdraw = Math.max(Math.floor(locale.moneyAvailable) - 1, 0);
                        jQuery(`#${locale.inputId}`).val(-amountToWithdraw);
                    }
                });
            });
            newDiv.append(withdrawAllButton);

            const checkboxDiv = jQuery("<div>");
            const inputCheckbox = jQuery("<input>").attr({type: "checkbox", id: "removePartial"});
            const checkboxLabel = jQuery("<label>").attr("for", "removePartial").text(" Eğer lokasyonda yeterli para yoksa, mevcut olanı kullan");
            checkboxDiv.append(inputCheckbox).append(checkboxLabel);
            newDiv.append(checkboxDiv);

            const fundsParagraph = jQuery("<p>").html(`Şirketin Tahmini Kasası: <strong id="updatedFunds">${availableFunds.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} M$</strong>`);
            const warningMessage = jQuery("<span>").attr("id", "warningMessage").css({ color: "red", display: "none" }).text(" - Yeterli bakiye olmayacak");
            fundsParagraph.append(warningMessage);
            newDiv.append(fundsParagraph);

            const insufficientFundsList = jQuery("<ul>").attr("id", "insufficientFundsList").css("color", "red");
            newDiv.append(insufficientFundsList);
            tableLocales.before(newDiv);

            const localeData = [];
            tableLocales.find("tbody tr").each(function() {
                const row = jQuery(this);
                const localeId = row.find("input[type='hidden']").val();
                const localeName = row.find("td:first-child a").text();
                const moneyAvailable = parseFloat(row.find("td:nth-child(2)").text().replace(/[^\d,]/g, '').replace(',', '.'));
                const inputId = row.find("input[type='text']").attr("id");
                localeData.push({ localeId, localeName, moneyAvailable, inputId });
            });

            inputNumber.on("input", function() {
                const inputValue = parseFloat(inputNumber.val()) || 0;
                const totalCost = inputValue * localeData.length;
                const updatedFunds = availableFunds - totalCost;
                const updatedFundsElement = jQuery("#updatedFunds");
                const warningMessageElement = jQuery("#warningMessage");
                const insufficientFundsListElement = jQuery("#insufficientFundsList");
                updatedFundsElement.text(updatedFunds.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + " M$");
                if (updatedFunds < 0) {
                    updatedFundsElement.css("color", "red");
                    warningMessageElement.show();
                } else {
                    updatedFundsElement.css("color", "");
                    warningMessageElement.hide();
                }
                insufficientFundsListElement.empty();
                if (inputValue < 0) {
                    localeData.forEach(locale => {
                        const projectedFunds = locale.moneyAvailable + inputValue;
                        if (projectedFunds < 0) {
                            insufficientFundsListElement.append(jQuery("<li>").text(`${locale.localeName} için yeterli bakiye yok.`));
                        }
                    });
                }
            });
        }
    });
})();