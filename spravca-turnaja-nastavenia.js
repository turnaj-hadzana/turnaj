import { db, settingsCollectionRef, categoriesCollectionRef, getDoc, setDoc, doc, getDocs, query, orderBy } from './spravca-turnaja-common.js';

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
                // Nastav predvolené hodnoty, ak dokument neexistuje
                firstDayStartTimeInput.value = '12:00';
                otherDaysStartTimeInput.value = '08:00';
            }

            // Načítanie a zobrazenie nastavení pre kategórie
            await loadCategorySettings(currentSettings.categoryMatchSettings || {});

        } catch (error) {
            console.error("Chyba pri načítaní nastavení: ", error);
            settingsStatus.textContent = 'Chyba pri načítaní nastavení.';
            settingsStatus.style.color = 'red';
        }
    }

    // Funkcia na načítanie a zobrazenie nastavení pre kategórie
    async function loadCategorySettings(existingCategorySettings) {
        categorySettingsContainer.innerHTML = '<p>Načítavam kategórie...</p>';
        try {
            console.log("Pokúšam sa načítať kategórie z Firestore...");
            console.log(`Cesta ku kolekcii kategórií (z common.js): ${categoriesCollectionRef.path}`); 
            
            // Používame referenciu importovanú z common.js, bez orderBy
            const categoriesSnapshot = await getDocs(categoriesCollectionRef); // Zmenené: odstránené query a orderBy
            
            console.log(`Načítaných kategórií: ${categoriesSnapshot.docs.length}`);

            categorySettingsContainer.innerHTML = ''; // Vyčistíme pred pridaním

            if (categoriesSnapshot.empty) {
                console.log("categoriesSnapshot je prázdny. Žiadne kategórie neboli nájdené v kolekcii.");
                categorySettingsContainer.innerHTML = '<p>Žiadne kategórie neboli nájdené. Prosím, najprv vytvorte kategórie.</p>';
                return;
            }

            categoriesSnapshot.docs.forEach(categoryDoc => { // Prechádzame dokumentmi priamo
                const categoryId = categoryDoc.id;
                // Upravené: Ak categoryDoc.data().name je undefined, použije sa categoryId
                const categoryName = categoryDoc.data().name || categoryId; 
                console.log(`Spracovávam kategóriu: ID=${categoryId}, Názov=${categoryName}`);

                const categoryData = existingCategorySettings[categoryId] || { duration: 60, bufferTime: 5 }; // Predvolené hodnoty

                const categoryDiv = document.createElement('div');
                categoryDiv.classList.add('form-group', 'category-setting-group');
                categoryDiv.innerHTML = `
                    <h3>${categoryName}</h3>
                    <label for="duration-${categoryId}">Trvanie zápasu (minúty):</label>
                    <input type="number" id="duration-${categoryId}" data-category-id="${categoryId}" data-setting-type="duration" value="${categoryData.duration}" min="1" required>
                    
                    <label for="buffer-${categoryId}">Prestávka po zápase (minúty):</label>
                    <input type="number" id="buffer-${categoryId}" data-category-id="${categoryId}" data-setting-type="bufferTime" value="${categoryData.bufferTime}" min="0" required>
                `;
                categorySettingsContainer.appendChild(categoryDiv);
            });
            console.log("Kategórie úspešne zobrazené.");

        } catch (error) {
            console.error("Chyba pri načítaní nastavení kategórií: ", error);
            categorySettingsContainer.innerHTML = '<p>Chyba pri načítaní nastavení kategórií.</p>';
            categorySettingsStatus.textContent = 'Chyba pri načítaní nastavení kategórií.';
            categorySettingsStatus.style.color = 'red';
        }
    }

    // Načítaj nastavenia pri načítaní stránky
    await loadSettings();

    // Event listener pre odoslanie formulára hlavných nastavení
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstDayStartTime = firstDayStartTimeInput.value;
        const otherDaysStartTime = otherDaysStartTimeInput.value;

        if (!firstDayStartTime || !otherDaysStartTime) {
            settingsStatus.textContent = 'Prosím, vyplňte oba časy.';
            settingsStatus.style.color = 'red';
            return;
        }

        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            await setDoc(settingsDocRef, {
                firstDayStartTime: firstDayStartTime,
                otherDaysStartTime: otherDaysStartTime,
                updatedAt: new Date()
            }, { merge: true }); // Použi merge, aby si aktualizoval len tieto polia

            settingsStatus.textContent = 'Nastavenia úspešne uložené!';
            settingsStatus.style.color = 'green';
        } catch (error) {
            console.error("Chyba pri ukladaní nastavení: ", error);
            settingsStatus.textContent = 'Chyba pri ukladaní nastavení. Pozrite konzolu pre detaily.';
            settingsStatus.style.color = 'red';
        }
    });

    // Event listener pre odoslanie formulára nastavení kategórií
    categorySettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const categoryInputs = categorySettingsContainer.querySelectorAll('input[data-category-id]');
        const categoryMatchSettings = {};
        let allValid = true;

        categoryInputs.forEach(input => {
            const categoryId = input.dataset.categoryId;
            const settingType = input.dataset.settingType;
            const value = parseInt(input.value);

            if (isNaN(value) || (settingType === 'duration' && value < 1) || (settingType === 'bufferTime' && value < 0)) {
                allValid = false;
                input.style.borderColor = 'red';
                return;
            }
            input.style.borderColor = ''; // Reset border color

            if (!categoryMatchSettings[categoryId]) {
                categoryMatchSettings[categoryId] = {};
            }
            categoryMatchSettings[categoryId][settingType] = value;
        });

        if (!allValid) {
            categorySettingsStatus.textContent = 'Prosím, skontrolujte chyby vo vstupných poliach kategórií.';
            categorySettingsStatus.style.color = 'red';
            return;
        }

        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            await setDoc(settingsDocRef, {
                categoryMatchSettings: categoryMatchSettings,
                updatedAt: new Date()
            }, { merge: true });

            categorySettingsStatus.textContent = 'Nastavenia kategórií úspešne uložené!';
            categorySettingsStatus.style.color = 'green';
        } catch (error) {
            console.error("Chyba pri ukladaní nastavení kategórií: ", error);
            categorySettingsStatus.textContent = 'Chyba pri ukladaní nastavení kategórií. Pozrite konzolu pre detaily.';
            categorySettingsStatus.style.color = 'red';
        }
    });
});
