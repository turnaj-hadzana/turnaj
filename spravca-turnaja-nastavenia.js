import { db, settingsCollectionRef, categoriesCollectionRef, getDoc, setDoc, doc, getDocs, query, orderBy, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const settingsForm = document.getElementById('settingsForm');
    const firstDayStartTimeInput = document.getElementById('firstDayStartTimeInput');
    const otherDaysStartTimeInput = document.getElementById('otherDaysStartTimeInput');
    const settingsStatus = document.getElementById('settingsStatus');

    const categorySettingsForm = document.getElementById('categorySettingsForm');
    const categorySettingsContainer = document.getElementById('categorySettingsContainer');
    const categorySettingsStatus = document.getElementById('categorySettingsStatus');

    const SETTINGS_DOC_ID = 'matchTimeSettings'; // Konštantné ID dokumentu pre nastavenia

    // Funkcia na načítanie existujúcich nastavení
    async function loadSettings() {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            let currentSettings = {};

            if (settingsDoc.exists()) {
                currentSettings = settingsDoc.data();
                firstDayStartTimeInput.value = currentSettings.firstDayStartTime || '';
                otherDaysStartTimeInput.value = currentSettings.otherDaysStartTime || '';
            } else {
                console.log("Dokument nastavení neexistuje, použijú sa predvolené hodnoty.");
                firstDayStartTimeInput.value = '';
                otherDaysStartTimeInput.value = '';
            }

            // Načítanie nastavení pre kategórie (trvanie zápasu, buffer, farba)
            await loadCategorySettings();

        } catch (error) {
            console.error("Chyba pri načítaní nastavení:", error);
            settingsStatus.textContent = 'Chyba pri načítaní nastavení. Pozrite konzolu pre detaily.';
            settingsStatus.style.color = 'red';
        }
    }

    // Funkcia na načítanie a zobrazenie nastavení kategórií (trvanie, buffer, farba)
    async function loadCategorySettings() {
        categorySettingsContainer.innerHTML = '<p>Načítavam kategórie...</p>';
        try {
            const categoriesSnapshot = await getDocs(query(categoriesCollectionRef, orderBy('name', 'asc')));
            if (categoriesSnapshot.empty) {
                categorySettingsContainer.innerHTML = '<p>Žiadne kategórie neboli nájdené.</p>';
                return;
            }

            categorySettingsContainer.innerHTML = ''; // Vyčistíme obsah

            categoriesSnapshot.forEach(categoryDoc => {
                const categoryData = categoryDoc.data();
                const categoryId = categoryDoc.id;
                const categoryName = categoryData.name;

                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-settings-item';
                categoryDiv.innerHTML = `
                    <h3>${categoryName}</h3>
                    <div class="form-group">
                        <label for="duration-${categoryId}">Trvanie zápasu (minúty):</label>
                        <input type="number" id="duration-${categoryId}" class="category-setting-input" data-category-id="${categoryId}" data-setting-type="duration" value="${categoryData.matchDuration || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label for="bufferTime-${categoryId}">Čas na prípravu (minúty):</label>
                        <input type="number" id="bufferTime-${categoryId}" class="category-setting-input" data-category-id="${categoryId}" data-setting-type="bufferTime" value="${categoryData.bufferTime || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label for="color-${categoryId}">Farba kategórie:</label>
                        <input type="color" id="color-${categoryId}" class="category-setting-input" data-category-id="${categoryId}" data-setting-type="color" value="${categoryData.color || '#000000'}">
                    </div>
                `;
                categorySettingsContainer.appendChild(categoryDiv);
            });
        } catch (error) {
            console.error("Chyba pri načítaní nastavení kategórií:", error);
            categorySettingsContainer.innerHTML = '<p style="color: red;">Chyba pri načítaní nastavení kategórií.</p>';
        }
    }


    // Načítanie nastavení pri načítaní stránky
    await loadSettings();

    // Ukladanie všeobecných nastavení turnaja
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstDayStartTime = firstDayStartTimeInput.value;
            const otherDaysStartTime = otherDaysStartTimeInput.value;

            if (!firstDayStartTime || !otherDaysStartTime) {
                settingsStatus.textContent = 'Prosím, vyplňte oba časy začiatku.';
                settingsStatus.style.color = 'red';
                return;
            }

            try {
                const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
                await setDoc(settingsDocRef, {
                    firstDayStartTime: firstDayStartTime,
                    otherDaysStartTime: otherDaysStartTime,
                    updatedAt: new Date()
                }, { merge: true });

                settingsStatus.textContent = 'Nastavenia úspešne uložené!';
                settingsStatus.style.color = 'green';
            } catch (error) {
                console.error("Chyba pri ukladaní nastavení turnaja: ", error);
                settingsStatus.textContent = 'Chyba pri ukladaní nastavení turnaja. Pozrite konzolu pre detaily.';
                settingsStatus.style.color = 'red';
            }
        });
    }

    // Ukladanie nastavení kategórií (trvanie zápasu, buffer, farba)
    if (categorySettingsForm) {
        categorySettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const inputs = categorySettingsContainer.querySelectorAll('.category-setting-input');
            let allValid = true;
            const batch = writeBatch(db); // Použijeme batch pre efektívne ukladanie viacerých dokumentov

            const updatedCategoriesData = {};

            inputs.forEach(input => {
                const categoryId = input.dataset.categoryId;
                const settingType = input.dataset.settingType;
                const value = input.value;

                if (settingType === 'duration' || settingType === 'bufferTime') {
                    const numValue = parseInt(value);
                    if (isNaN(numValue) || numValue < 0) { // Duration must be >= 0, buffer time >= 0
                        allValid = false;
                        input.style.borderColor = 'red';
                        return;
                    }
                    if (!updatedCategoriesData[categoryId]) {
                        updatedCategoriesData[categoryId] = {};
                    }
                    updatedCategoriesData[categoryId][settingType] = numValue;
                } else if (settingType === 'color') {
                    // Pre farbu stačí validovať, že nie je prázdna (input[type="color"] to zvyčajne zabezpečí)
                    if (!value) {
                         allValid = false;
                         input.style.borderColor = 'red';
                         return;
                    }
                    if (!updatedCategoriesData[categoryId]) {
                        updatedCategoriesData[categoryId] = {};
                    }
                    updatedCategoriesData[categoryId][settingType] = value;
                }
                input.style.borderColor = ''; // Reset border color
            });

            if (!allValid) {
                categorySettingsStatus.textContent = 'Prosím, skontrolujte chyby vo vstupných poliach kategórií.';
                categorySettingsStatus.style.color = 'red';
                return;
            }

            try {
                // Prejdeme cez zozbierané dáta a vykonáme aktualizácie v batchi
                for (const categoryId in updatedCategoriesData) {
                    const categoryDocRef = doc(categoriesCollectionRef, categoryId);
                    batch.update(categoryDocRef, updatedCategoriesData[categoryId]);
                }
                await batch.commit();

                categorySettingsStatus.textContent = 'Nastavenia kategórií úspešne uložené!';
                categorySettingsStatus.style.color = 'green';
                await loadCategorySettings(); // Znovu načítame nastavenia, aby sa prejavili zmeny
            } catch (error) {
                console.error("Chyba pri ukladaní nastavení kategórií: ", error);
                categorySettingsStatus.textContent = 'Chyba pri ukladaní nastavení kategórií. Pozrite konzolu pre detaily.';
                categorySettingsStatus.style.color = 'red';
            }
        });
    }
});
