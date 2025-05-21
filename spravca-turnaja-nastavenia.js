import { db, settingsCollectionRef, getDoc, setDoc, doc } from './spravca-turnaja-common.js';

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

        const SETTINGS_DOC_ID = 'matchTimeSettings'; // Konštantné ID dokumentu pre nastavenia

        // Funkcia na načítanie existujúcich nastavení
        async function loadSettings() {
            try {
                const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
                const settingsDoc = await getDoc(settingsDocRef);

                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    firstDayStartTimeInput.value = data.firstDayStartTime || '';
                    otherDaysStartTimeInput.value = data.otherDaysStartTime || '';
                } else {
                    // Nastav predvolené hodnoty, ak dokument neexistuje
                    firstDayStartTimeInput.value = '12:00';
                    otherDaysStartTimeInput.value = '08:00';
                }
            } catch (error) {
                console.error("Chyba pri načítaní nastavení: ", error);
                settingsStatus.textContent = 'Chyba pri načítaní nastavení.';
                settingsStatus.style.color = 'red';
            }
        }

        // Načítaj nastavenia pri načítaní stránky
        await loadSettings();

        // Event listener pre odoslanie formulára
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
    });
    
