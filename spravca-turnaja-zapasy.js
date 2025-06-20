import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
// Priamy import 'collection' a 'deleteField' z firebase-firestore.js
import { collection, deleteField, limit } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';


const SETTINGS_DOC_ID = 'matchTimeSettings';
// Nová referencia na kolekciu pre zablokované sloty
export const blockedSlotsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'blockedSlots');

/**
 * Animuje daný text tak, že ho postupne vypíše, zhrubí a potom postupne vymaže, v nekonečnej slučke.
 * @param {string} containerId ID HTML elementu, kde sa má zobraziť animovaný text.
 * @param {string} text Reťazec textu, ktorý sa má animovať.
 */
async function animateLoadingText(containerId, text) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Vyčistite predchádzajúci obsah a pripravte sa na animáciu
    container.innerHTML = '';

    const characters = text.split('');
    const charElements = characters.map(char => {
        const span = document.createElement('span');
        span.className = 'loading-char';
        // Nastavte innerHTML namiesto textContent, aby sa &nbsp; vykreslil ako medzera
        span.innerHTML = char === ' ' ? '&nbsp;' : char; 
        container.appendChild(span);
        return span;
    });

    // Pridajte štýly pre .loading-char do hlavičky dokumentu
    // Ak už existuje, nepridávajte znova
    if (!document.getElementById('loading-char-style')) {
        const style = document.createElement('style');
        style.id = 'loading-char-style';
        style.textContent = `
            .loading-char {
                opacity: 0;
                display: inline-block; /* Dôležité pre správne zobrazenie medzier */
                transition: opacity 0.1s ease-in-out, font-weight 0.3s ease-in-out;
                min-width: 0.5em; /* Zabezpečuje, že medzery majú viditeľnú šírku */
            }
            .loading-char.visible {
                opacity: 1;
            }
            .loading-char.bold {
                font-weight: bold;
            }
            /* Nové pravidlo pre posledný riadok v tabuľke */
            .footer-spacer-row {
                background-color: white !important; /* Vždy biely, prepíše všetko */
            }
            .footer-spacer-row:hover {
                background-color: white !important; /* Žiadny hover efekt */
                cursor: default; /* Žiadny kurzor ukazovateľa */
            }
        `;
        document.head.appendChild(style);
    }

    const typingSpeed = 70; // milisekundy na znak
    const boldingDuration = 500; // milisekundy pre efekt zhrubnutia
    const pauseAfterBolding = 500; // milisekundy pauza pred začiatkom mazania
    const untypingSpeed = 50; // milisekundy na znak
    const pauseBeforeLoop = 1000; // milisekundy pauza pred reštartovaním animácie

    let charIndex = 0;
    let animationActive = true; // Vlajka na kontrolu slučky

    const typeOut = () => {
        if (!animationActive) return;

        if (charIndex < charElements.length) {
            charElements[charIndex].classList.add('visible');
            charIndex++;
            setTimeout(typeOut, typingSpeed);
        } else {
            // Všetky znaky vypísané, teraz zhrubnú
            setTimeout(() => {
                if (!animationActive) return;
                charElements.forEach(span => span.classList.add('bold'));
                setTimeout(untypeOut, boldingDuration + pauseAfterBolding); // Počkajte na zhrubnutie a pauzu
            }, 500); // Krátka pauza pred začiatkom zhrubnutia
        }
    };

    const untypeOut = () => {
        if (!animationActive) return;

        if (charIndex > 0) {
            charIndex--;
            charElements[charIndex].classList.remove('bold'); // Najprv odstráňte zhrubnutie
            charElements[charIndex].classList.remove('visible');
            setTimeout(untypeOut, untypingSpeed);
        } else {
            // Všetky znaky vymazané, resetujte pre ďalšiu slučku
            setTimeout(() => {
                if (!animationActive) return;
                charElements.forEach(span => { // Zabezpečte, aby boli všetky resetované pre ďalšiu slučku
                    span.classList.remove('bold');
                    span.classList.remove('visible');
                });
                charIndex = 0;
                typeOut(); // Reštartujte animáciu
            }, pauseBeforeLoop);
        }
    };

    // Spustite animáciu
    typeOut();

    // Vráťte funkciu na zastavenie animácie, ak je to potrebné externe
    return () => {
        animationActive = false;
        // Ak je kontajner nahradený, všetky jeho timeouty prirodzene osirejú.
    };
}


/**
 * Naplní element select hracími dňami z Firestore.
 * @param {HTMLSelectElement} selectElement Element select, ktorý sa má naplniť.
 * @param {string} [selectedDate=''] Dátum, ktorý sa má predvoliť.
 */
async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
    try {
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        querySnapshot.forEach((doc) => {
            const day = doc.data();
            const option = document.createElement('option');
            option.value = day.date;            
            const dateObj = new Date(day.date);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
            option.textContent = formattedDate;            
            selectElement.appendChild(option);
        });
        if (selectedDate) {
            selectElement.value = selectedDate;
        }
    } catch (error) {
        console.error("Chyba pri načítaní hracích dní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní dátumov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Naplní element select športovými halami z Firestore.
 * @param {HTMLSelectElement} selectElement Element select, ktorý sa má naplniť.
 * @param {string} [selectedPlaceName=''] Názov miesta, ktoré sa má predvoliť.
 */
async function populateSportHallSelects(selectElement, selectedPlaceName = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto (športovú halu) --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne športové haly nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const place = { id: doc.id, ...doc.data() };
                const option = document.createElement('option');
                option.value = place.name;
                option.textContent = `${place.name}`;
                selectElement.appendChild(option);
            });
        }
        if (selectedPlaceName) {
            selectElement.value = selectedPlaceName;
        }
    } catch (error) {
        console.error("Chyba pri načítaní hál:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní hál --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Naplní element select všetkými miestami (športové haly, stravovanie, ubytovanie) z Firestore.
 * Táto funkcia zostáva, pretože miesta sú stále relevantné pre zápasy.
 * @param {HTMLSelectElement} selectElement Element select, ktorý sa má naplniť.
 * @param {string} [selectedPlaceCombined=''] Skombinovaná hodnota (názov:::typ) miesta, ktoré sa má predvoliť.
 */
async function populateAllPlaceSelects(selectElement, selectedPlaceCombined = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne miesta nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const place = { id: doc.id, ...doc.data() };
                const option = document.createElement('option');
                option.value = `${place.name}:::${place.type}`;
                option.textContent = `${place.name} (${place.type})`;
                selectElement.appendChild(option);
            });
        }
        if (selectedPlaceCombined) {
            selectElement.value = selectedPlaceCombined;
        }
    } catch (error) {
        console.error("Chyba pri načítaní miest:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní miest --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Získa nastavenia trvania zápasu a časovej rezervy pre danú kategóriu.
 * @param {string} categoryId ID kategórie.
 * @returns {Promise<{duration: number, bufferTime: number}>} Nastavenia zápasu.
*/
async function getCategoryMatchSettings(categoryId) {
    try {
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            const categorySettings = data.categoryMatchSettings && data.categoryMatchSettings[categoryId];
            if (categorySettings) {
                return {
                    duration: categorySettings.duration || 60,
                    bufferTime: categorySettings.bufferTime || 5
                };
            }
        }
    } catch (error) {
        console.error("Chyba pri načítaní nastavení kategórie:", error);
    }
    return { duration: 60, bufferTime: 5 };
}

/**
 * Aktualizuje vstupné polia trvania zápasu a časovej rezervy na základe vybranej kategórie.
 * Táto funkcia už neaktualizuje čas začiatku zápasu.
*/
async function updateMatchDurationAndBuffer() {
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategory'); // Get it here

    const selectedCategoryId = matchCategorySelect.value;

    if (selectedCategoryId) {
        const settings = await getCategoryMatchSettings(selectedCategoryId);
        matchDurationInput.value = settings.duration;
        matchBufferTimeInput.value = settings.bufferTime;
    } else {
        matchDurationInput.value = 60;
        matchBufferTimeInput.value = 5;
    }
}

/**
 * Nájde prvý dostupný časový interval pre zápas na základe dátumu, miesta, trvania a časovej rezervy.
 * Prioritou je nájsť voľný slot, ktorý má presne takú dĺžku, akú vyžaduje zápas (trvanie).
 * Ak taký interval neexistuje, čas sa nastaví hneď po poslednom existujúcom zápase v daný deň a na danom mieste,
 * alebo na počiatočný čas dňa, ak nie sú žiadne zápasy.
*/
async function findFirstAvailableTime() {
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration'); 
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); 

    console.log("findFirstAvailableTime called."); // Debugging
    const selectedDate = matchDateSelect.value;
    const selectedLocationName = matchLocationSelect.value;

    console.log("Selected Date:", selectedDate); // Debugging
    console.log("Selected Location:", selectedLocationName); // Debugging

    if (!selectedDate || !selectedLocationName) {
        matchStartTimeInput.value = '';
        console.log("Date or Location empty, clearing start time and returning."); // Debugging
        return;
    }

    try {
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        let firstDayStartTime = '08:00';
        let otherDaysStartTime = '08:00';

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            firstDayStartTime = data.firstDayStartTime || '08:00';
            otherDaysStartTime = data.otherDaysStartTime || '08:00';
        }
        console.log("First Day Start Time (global):", firstDayStartTime); // Debugging
        console.log("Other Days Start Time (global):", otherDaysStartTime); // Debugging

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];
        console.log("Is selected day the first playing day?", isFirstPlayingDay); // Debugging

        const initialStartTimeForDay = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;
        let [initialH, initialM] = initialStartTimeForDay.split(':').map(Number);
        let initialPointerMinutes = initialH * 60 + initialM; 
        console.log("Initial pointer minutes for selected day:", initialPointerMinutes); // Debugging

        const requiredMatchDuration = parseInt(matchDurationInput.value) || 0;
        const requiredBufferTime = parseInt(matchBufferTimeInput.value) || 0;
        console.log("Required Match Duration (from input):", requiredMatchDuration); // Debugging
        console.log("Required Buffer Time (from input):", requiredBufferTime); // Debugging

        const newMatchFullFootprint = requiredMatchDuration + requiredBufferTime;
        console.log("New Match Full Footprint (duration + buffer):", newMatchFullFootprint); // Debugging

        if (newMatchFullFootprint <= 0) { // Check for valid duration
            matchStartTimeInput.value = '';
            console.log("Required Match Full Footprint is 0 or less, clearing start time and returning."); // Debugging
            return;
        }

        // 1. Načítajte všetky udalosti (zápasy a VŠETKY zablokované sloty, aj true/false)
        const matchesQuery = query(
            matchesCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matches = matchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const startInMinutes = (parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]));
            const duration = Number(data.duration) || 0;
            const bufferTime = Number(data.bufferTime) || 0;
            return {
                start: startInMinutes,
                end: startInMinutes + duration + bufferTime, // Použite celú stopu pre zápasy
                type: 'match'
            };
        });

        const blockedSlotsQuery = query(
            blockedSlotsCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName)
        );
        const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
        const allSlots = blockedSlotsSnapshot.docs.map(doc => {
            const data = doc.data();
            const startInMinutes = (parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]));
            const endInMinutes = (parseInt(data.endTime.split(':')[0]) * 60 + parseInt(data.endTime.split(':')[1]));
            return {
                start: startInMinutes,
                end: endInMinutes,
                type: 'blocked_slot',
                isBlocked: data.isBlocked === true // Zabezpeč
            };
        });

        // Kombinujte všetky "pevné" obsadené obdobia (zápasy a isBlocked: true sloty)
        let occupiedPeriods = [];
        matches.forEach(m => occupiedPeriods.push({ start: m.start, end: m.end }));
        allSlots.filter(s => s.isBlocked === true).forEach(s => occupiedPeriods.push({ start: s.start, end: s.end }));

        // Zoraďte a zlúčte obsadené obdobia
        occupiedPeriods.sort((a, b) => a.start - b.start);
        const mergedOccupiedPeriods = [];
        if (occupiedPeriods.length > 0) {
            let currentMerged = { ...occupiedPeriods[0] }; // Kopírujte objekt, aby sa predišlo mutácii pôvodného
            for (let i = 1; i < occupiedPeriods.length; i++) {
                const nextPeriod = occupiedPeriods[i];
                if (nextPeriod.start <= currentMerged.end) { // Prekrývanie alebo dotyk
                    currentMerged.end = Math.max(currentMerged.end, nextPeriod.end);
                } else {
                    mergedOccupiedPeriods.push(currentMerged);
                    currentMerged = { ...nextPeriod }; // Kopírujte objekt
                }
            }
            mergedOccupiedPeriods.push(currentMerged);
        }
        console.log("Merged Occupied Periods:", mergedOccupiedPeriods);


        // Určite dostupné intervaly na základe zlúčených obsadených období
        const availableIntervals = [];
        let currentPointer = initialPointerMinutes; // Začnite od nakonfigurovaného času začiatku dňa

        for (const occupied of mergedOccupiedPeriods) {
            if (currentPointer < occupied.start) {
                // Nájdená medzera
                availableIntervals.push({ start: currentPointer, end: occupied.start });
            }
            currentPointer = Math.max(currentPointer, occupied.end);
        }
        // Pridajte zostávajúci čas do konca dňa
        if (currentPointer < 24 * 60) {
            availableIntervals.push({ start: currentPointer, end: 24 * 60 });
        }
        console.log("Available Intervals (based on hard conflicts):", availableIntervals);

        let proposedStartTimeInMinutes = -1;

        // Najprv skontrolujte, či je možné použiť niektorý z existujúcich slotov 'isBlocked: false'
        const freeSlots = allSlots.filter(s => s.isBlocked === false);
        freeSlots.sort((a, b) => a.start - b.start); // Zoraďte voľné sloty podľa času začiatku
        console.log("Existing Free Slots (isBlocked: false):", freeSlots);

        for (const freeSlot of freeSlots) {
            // ZMENA 1: Skontrolujte, či sa zápas zmestí len na základe requiredMatchDuration (bez bufferTime)
            if (freeSlot.end - freeSlot.start >= requiredMatchDuration) {
                let isFreeSlotTrulyAvailable = true;
                // ZMENA 2: Pri kontrole prekrývania použite celú stopu nového zápasu (duration + buffer)
                const potentialMatchEndWithBuffer = freeSlot.start + newMatchFullFootprint; 

                // Skontrolujte, či sa potenciálny nový zápas (s buffrom) prekrýva s akýmkoľvek zlúčeným obsadeným obdobím.
                for(const occupied of mergedOccupiedPeriods) {
                    if (freeSlot.start < occupied.end && potentialMatchEndWithBuffer > occupied.start) {
                        isFreeSlotTrulyAvailable = false;
                        console.log(`Free slot ${freeSlot.start}-${freeSlot.end} is too small or overlaps with occupied ${occupied.start}-${occupied.end} for a match ending at ${potentialMatchEndWithBuffer}. Not truly available.`);
                        break;
                    }
                }

                if (isFreeSlotTrulyAvailable) {
                    // Tento voľný slot je najskoršou dostupnou možnosťou medzi už existujúcimi zástupnými symbolmi
                    proposedStartTimeInMinutes = freeSlot.start;
                    console.log(`Found suitable existing free slot at: ${proposedStartTimeInMinutes}`);
                    break; // Našiel sa najskorší voľný slot, ukončite cyklus
                }
            }
        }

        // Ak sa nenašiel žiadny vhodný existujúci voľný slot, nájdite prvý dostupný interval z vypočítaných medzier
        if (proposedStartTimeInMinutes === -1) {
            for (const interval of availableIntervals) {
                // Tu vždy kontrolujeme celú stopu zápasu, pretože ide o "čisté" medzery, nie o placeholdery
                if (interval.end - interval.start >= newMatchFullFootprint) {
                    proposedStartTimeInMinutes = interval.start;
                    console.log(`No existing free slot, using first available calculated interval at: ${proposedStartTimeInMinutes}`);
                    break;
                }
            }
        }

        if (proposedStartTimeInMinutes !== -1) {
            const formattedHour = String(Math.floor(proposedStartTimeInMinutes / 60)).padStart(2, '0');
            const formattedMinute = String(proposedStartTimeInMinutes % 60).padStart(2, '0');
            matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
            console.log("Nastavený čas začiatku zápasu:", matchStartTimeInput.value);
        } else {
            matchStartTimeInput.value = '';
            await showMessage('Informácia', 'Na vybranom mieste a dátume nie je dostatok priestoru pre zápas v dostupnom čase. Skúste iné nastavenia.');
            console.log("No available slot found, clearing start time and informing user.");
        }

    } catch (error) {
        console.error("Chyba pri hľadaní prvého dostupného času:", error);
        matchStartTimeInput.value = '';
    }
}

/**
 * Function to check if a time slot overlaps with any existing match or *active* blocked slot.
 * This is a helper for findFirstAvailableTime to ensure proposed times are truly free.
 * @param {number} candidateStart Start time of the candidate slot in minutes.
 * @param {number} candidateEnd End time of the candidate slot in minutes.
 * @param {Array<Object>} matches Array of existing match objects.
 * @param {Array<Object>} blockedSlots Array of existing *active* blocked slot objects (isBlocked: true).
 * @returns {boolean} True if the slot is available (no overlap), false otherwise.
*/
const isSlotAvailable = (candidateStart, candidateEnd, matches, blockedSlots) => {
    // Check against existing matches
    for (const match of matches) {
        if (candidateStart < match.fullFootprintEnd && candidateEnd > match.start) { 
            console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with existing match ${match.start}-${match.fullFootprintEnd}`); // Debugging
            return false; // Overlaps with an existing match
        }
    }
    // Check against active blocked slots (isBlocked === true)
    for (const blockedSlot of blockedSlots) { // This array is already filtered
        if (candidateStart < blockedSlot.end && candidateEnd > blockedSlot.start) {
            console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with active blocked slot ${blockedSlot.start}-${blockedSlot.end}`); // Debugging
            return false; // Overlaps with an active blocked slot
        }
    }
    return true;
};


/**
 * Získa úplný zobrazovaný názov a informácie o klube pre tím.
 * @param {string} categoryId ID kategórie.
 * @param {string} groupId ID skupiny.
 * @param {number} teamNumber Poradové číslo tímu v skupine.
 * @param {Map<string, string>} categoriesMap Mapa ID kategórií na názvy.
 * @param {Map<string, string>} groupsMap Mapa ID skupín na názvy.
 * @returns {Promise<{fullDisplayName: string|null, clubName: string|null, clubId: string|null, shortDisplayName: string|null}>} Informácie o zobrazení tímu.
*/
const getTeamName = async (categoryId, groupId, teamNumber, categoriesMap, groupsMap) => {
    if (!categoryId || !groupId || !teamNumber) {
        return { fullDisplayName: null, clubName: null, clubId: null, shortDisplayName: null };
    }
    try {
        const categoryName = categoriesMap.get(categoryId) || categoryId;
        const groupName = groupsMap.get(groupId) || groupId;

        let clubName = `Tím ${teamNumber}`;
        let clubId = null;

        // Stále je potrebné získať kolekciu klubov špecificky pre číslo tímu v kategórii/skupine
        const clubsQuery = query(
            clubsCollectionRef,
            where("categoryId", "==", categoryId),
            where("groupId", "==", groupId),
            where("orderInGroup", "==", parseInt(teamNumber))
        );
        const clubsSnapshot = await getDocs(clubsQuery);

        if (!clubsSnapshot.empty) {
            const teamDocData = clubsSnapshot.docs[0].data();
            clubId = clubsSnapshot.docs[0].id;
            if (teamDocData.name) {
                clubName = teamDocData.name;
            }
        }

        let shortCategoryName = categoryName;
        if (shortCategoryName) {
            shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
        }

        let shortGroupName = '';
        if (groupName) {
            const match = groupName.match(/(?:skupina\s*)?([A-Z])/i);
            if (match && match[1]) {
                shortGroupName = match[1].toUpperCase();
            }
        }

        const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;
        const shortDisplayName = `${shortGroupName}${teamNumber}`; // Vráti nový krátky zobrazovaný názov

        return {
            fullDisplayName: fullDisplayName,
            clubName: clubName,
            clubId: clubId,
            shortDisplayName: shortDisplayName // Vráti nový krátky zobrazovaný názov
        };
    } catch (error) {
        console.error("Chyba pri získavaní názvu tímu:", error);
        return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null, shortDisplayName: `Chyba` };
    }
};

/**
 * Vypočíta ďalší dostupný čas začiatku pre zápas na základe času konca predchádzajúceho zápasu a rezervy.
 * @param {string} prevStartTime Reťazec HH:MM času konca predchádzajúceho zápasu.
 * @param {number} duration Trvanie predchádzajúceho zápasu v minútach.
 * @param {number} bufferTime Časová rezerva v minútach po predchádzajúcom zápase.
 * @returns {string} Reťazec HH:MM ďalšieho dostupného času začiatku.
*/
function calculateNextAvailableTime(prevStartTime, duration, bufferTime) {
    console.log(`calculateNextAvailableTime: Vstup - prevStartTime: ${prevStartTime}, duration: ${duration}, bufferTime: ${bufferTime}`);
    let [prevH, prevM] = prevStartTime.split(':').map(Number);
    let totalMinutes = (prevH * 60) + prevM + duration + bufferTime;

    let newH = Math.floor(totalMinutes / 60);
    let newM = totalMinutes % 60;

    const resultTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    console.log(`calculateNextAvailableTime: Výstup - ${resultTime}`);
    return resultTime;
}


/**
 * Prepočítava a preplánuje zápasy a manažuje všetky typy slotov (zápasy, zablokované, voľné placeholdery)
 * pre konkrétny dátum a miesto.
 *
 * @param {string} date Dátum, pre ktorý sa má prepočítať rozvrh.
 * @param {string} location Miesto, pre ktoré sa má prepočítať rozvrh.
 * @param {string|null} [excludedBlockedSlotId=null] ID zablokovaného slotu, ktorý sa má explicitne vylúčiť z výpočtov (napr. ten, ktorý bol práve presunutý a zmazaný).
 * @param {string|null} [movedMatchOriginalId=null] ID zápasu, ktorý bol presunutý (ak sa nejaký presunul).
 * @param {string|null} [movedMatchOriginalDate=null] Pôvodný dátum presunutého zápasu (YYYY-MM-DD).
 * @param {string|null} [movedMatchOriginalLocation=null] Pôvodné miesto presunutého zápasu (názov).
 * @param {string|null} [movedMatchOriginalStartTime=null] Pôvodný čas začiatku presunutého zápasu (HH:MM).
 * @param {string|null} [movedMatchNewStartTime=null] Nový čas začiatku presunutého zápasu (HH:MM).
 * @param {boolean} [wasDeletedPlaceholder=false] NOVÉ: True, ak slot, ktorý spustil prepočet, bol placeholder, ktorý bol vymazaný.
 */
async function recalculateAndSaveScheduleForDateAndLocation(date, location, excludedBlockedSlotId = null, movedMatchOriginalId = null, movedMatchOriginalDate = null, movedMatchOriginalLocation = null, movedMatchOriginalStartTime = null, movedMatchNewStartTime = null, wasDeletedPlaceholder = false) {
    console.log(`recalculateAndSaveScheduleForDateAndLocation: === SPUSTENÉ pre Dátum: ${date}, Miesto: ${location}. ` +
                `Vylúčený zablokovaný slot ID: ${excludedBlockedSlotId || 'žiadny'}. ` +
                `Presunutý zápas ID: ${movedMatchOriginalId || 'žiadny'}, Pôvodný dátum: ${movedMatchOriginalDate || 'N/A'}, Pôvodné miesto: ${movedMatchOriginalLocation || 'N/A'}, Pôvodný čas: ${movedMatchOriginalStartTime || 'N/A'}, Nový čas: ${movedMatchNewStartTime || 'N/A'}. ` +
                `Bol vymazaný placeholder: ${wasDeletedPlaceholder}. ===`);
    try {
        const batch = writeBatch(db); 

        // Fáza 1: Načítajte všetky udalosti pre aktuálny rozvrh
        const matchesQuery = query(matchesCollectionRef, where("date", "==", date), where("location", "==", location));
        const matchesSnapshot = await getDocs(matchesQuery);
        let currentMatches = matchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const startInMinutes = (parseInt(data.startTime.split(':')[0]) * 60 + parseInt(data.startTime.split(':')[1]));
            const duration = Number(data.duration) || 0;
            const bufferTime = Number(data.bufferTime) || 0;

            return {
                id: doc.id,
                type: 'match',
                docRef: doc.ref,
                ...data,
                startInMinutes: startInMinutes,
                duration: duration, // Uistite sa, že sú to čísla
                bufferTime: bufferTime
            };
        });
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Načítané ZÁPASY pre ${date}, ${location}:`, currentMatches.map(m => ({id: m.id, startTime: m.startTime})));


        // Načítajte VŠETKY zablokované sloty pre dané miesto a dátum
        const allBlockedSlotsQuery = query(blockedSlotsCollectionRef, where("date", "==", date), where("location", "==", location));
        const allBlockedSlotsSnapshot = await getDocs(allBlockedSlotsQuery);
        
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): ALL blocked slots BEFORE filter (for ${date}, ${location}):`, allBlockedSlotsSnapshot.docs.map(doc => ({id: doc.id, isBlocked: doc.data().isBlocked, startTime: doc.data().startTime, endTime: doc.data().endTime})));

        let allCurrentBlockedSlots = allBlockedSlotsSnapshot.docs
            .map(doc => ({
                id: doc.id,
                type: 'blocked_slot',
                isBlocked: doc.data().isBlocked === true, // Uistite sa, že je boolean
                docRef: doc.ref,
                ...doc.data(),
                startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])),
                endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60 + parseInt(doc.data().endTime.split(':')[1]))
            }))
            .filter(slot => slot.id !== excludedBlockedSlotId); // Vylúčte slot, ktorý bol presunutý (ak existuje)

        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): ALL blocked slots AFTER filter (for ${date}, ${location}, without excluded: ${excludedBlockedSlotId}):`, allCurrentBlockedSlots.map(e => ({id: e.id, isBlocked: e.isBlocked, startTime: e.startTime, endTime: e.endTime})));

        // Fáza 2: Identifikujte "pevné" udalosti (používateľom zablokované sloty) a "pohyblivé" udalosti (zápasy).
        // Zároveň pridajte všetky existujúce placeholdery na vymazanie.
        let fixedEventsTimeline = []; // Len používateľom zablokované sloty
        let matchesToReschedule = []; // Zápasy, ktorých čas sa môže zmeniť
        let placeholderSlotsToDelete = []; // Všetky isBlocked: false sloty na vymazanie

        for (const slot of allCurrentBlockedSlots) {
            if (slot.isBlocked === true) {
                fixedEventsTimeline.push(slot); // Skutočné zablokované sloty sú pevné
            } else {
                placeholderSlotsToDelete.push(slot); // Placeholdery vymazať
            }
        }
        matchesToReschedule.push(...currentMatches); // Všetky zápasy sú pohyblivé pre prepočet

        // Pred začiatkom prepočtu vymažeme VŠETKY existujúce placeholdery
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 2): Placeholders to DELETE:`, placeholderSlotsToDelete.map(s => s.id));
        for (const slotToDelete of placeholderSlotsToDelete) {
            batch.delete(slotToDelete.docRef);
            console.log(`Fáza 2: Pridané do batchu na vymazanie starého placeholder slotu ID: ${slotToDelete.id}`);
        }

        // Fáza 3: Konštrukcia timeline, aktualizácia časov zápasov a generovanie nových placeholderov
        const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(date);
        let currentTimePointer = initialScheduleStartMinutes;
        // Ak bol vymazaná prázdna medzera, nastavíme isSubsequentPushRequired na true, aby sa zápasy posunuli.
        let isSubsequentPushRequired = wasDeletedPlaceholder; 
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Počiatočný ukazovateľ času (currentTimePointer): ${currentTimePointer} minút. isSubsequentPushRequired inicializované na: ${isSubsequentPushRequired}`);

        // Zlúčenie pevnych udalostí (blokované sloty) a zápasov pre účely iterácie, ale s vedomím,
        // že len zápasy sa posúvať.
        let allTimelineEvents = [
            ...fixedEventsTimeline, // Tieto sa posúvať nebudú
            ...matchesToReschedule  // Tieto sa môžu posúvať
        ];

        // Zoradíme všetky udalosti, aby sme ich spracovali chronologicky.
        // Pridajte sekundárny kľúč pre stabilné zoradenie, napr. ID, ak sú startInMinutes rovnaké.
        allTimelineEvents.sort((a, b) => {
            if (a.startInMinutes !== b.startInMinutes) {
                return a.startInMinutes - b.startInMinutes;
            }
            // Ak sú časy začiatku zhodné, použite ID ako stabilný rozlišovací znak.
            // Toto zabezpečí deterministické poradie.
            return a.id.localeCompare(b.id);
        });

        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Initial allTimelineEvents before loop (sorted for ${date}, ${location}):`, allTimelineEvents.map(e => ({id: e.id, type: e.type, startInMinutes: e.startInMinutes, isBlocked: e.isBlocked || 'N/A', duration: e.duration || 'N/A', bufferTime: e.bufferTime || 'N/A'})));


        // Pridajte imaginárnu "udalosť" na konci dňa, aby ste zachytili poslednú medzeru
        allTimelineEvents.push({
            type: 'end_of_day',
            startInMinutes: 24 * 60,
        });

        for (const event of allTimelineEvents) {
            console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): SPRACÚVAM udalosť: ID: ${event.id || 'N/A'}, Typ: ${event.type}, Start (min): ${event.startInMinutes}, Aktuálny currentTimePointer: ${currentTimePointer}, isSubsequentPushRequired: ${isSubsequentPushRequired}`);

            if (event.type === 'end_of_day') {
                // Ak bola vymazaná prázdna medzera, na konci dňa by sa nemala vytvárať nová,
                // ak by to bránilo posunutiu zápasov.
                if (wasDeletedPlaceholder && !movedMatchOriginalId) {
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): WasDeletedPlaceholder je true a nie je movedMatch. Preskakujem generovanie koncového placeholderu.`);
                }
                else if (currentTimePointer < 24 * 60) {
                    const gapStart = currentTimePointer;
                    const gapEnd = 24 * 60; // Koniec dňa (polnoc)
                    const formattedGapStartTime = `${String(Math.floor(gapStart / 60)).padStart(2, '0')}:${String(gapStart % 60).padStart(2, '0')}`;
                    const formattedGapEndTime = `${String(Math.floor(gapEnd / 60)).padStart(2, '0')}:${String(gapEnd % 60).padStart(2, '0')}`;

                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): GENERUJEM koncový placeholder: Start: ${formattedGapStartTime}, End: ${formattedGapEndTime}.`);

                    const newPlaceholderDocRef = doc(blockedSlotsCollectionRef);
                    batch.set(newPlaceholderDocRef, {
                        date: date,
                        location: location,
                        startTime: formattedGapStartTime,
                        endTime: formattedGapEndTime,
                        startInMinutes: gapStart,
                        endInMinutes: gapEnd,
                        isBlocked: false,
                        createdAt: new Date()
                    });
                }
                break; // Koniec dňa, ukončite slučku
            }

            // Najprv spracujeme akúkoľvek medzeru pred aktuálnou udalosťou
            if (currentTimePointer < event.startInMinutes) {
                const gapStart = currentTimePointer;
                let gapEnd = event.startInMinutes; // Koniec medzery je začiatok ďalšej udalosti
                
                // Ak je ďalšia udalosť zápas, voľný slot končí PRED JEJ BUFFEROM
                if (event.type === 'match') {
                    const nextMatchBufferTime = Number(event.bufferTime) || 0;
                    gapEnd = Math.max(gapStart, event.startInMinutes - nextMatchBufferTime);
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Následná udalosť je zápas (${event.id}), upravujem gapEnd na ${gapEnd} (pôvodný ${event.startInMinutes} - buffer ${nextMatchBufferTime}).`);
                }

                const formattedGapStartTime = `${String(Math.floor(gapStart / 60)).padStart(2, '0')}:${String(gapStart % 60).padStart(2, '0')}`;
                const formattedGapEndTime = `${String(Math.floor(gapEnd / 60)).padStart(2, '0')}:${String(gapEnd % 60).padStart(2, '0')}`; 

                let shouldCreateFreeSlot = true;

                // NOVÁ LOGIKA: Ak bola vymazaná placeholder medzera a nie je to výsledok drag & drop,
                // NEgenerujeme nový placeholder, aby sa zápasy mohli posunúť dopredu.
                if (wasDeletedPlaceholder && !movedMatchOriginalId) {
                    shouldCreateFreeSlot = false;
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): WasDeletedPlaceholder je true a nie je movedMatch. NEGENERUJEM voľný slot pre medzeru ${formattedGapStartTime}-${formattedGapEndTime}.`);
                } else if (movedMatchOriginalId && 
                    date === movedMatchOriginalDate && 
                    location === movedMatchOriginalLocation) {
                    
                    const originalStartMinutes = (parseInt(movedMatchOriginalStartTime.split(':')[0]) * 60 + parseInt(movedMatchOriginalStartTime.split(':')[1]));
                    const originalMatchData = await getMatchData(movedMatchOriginalId);
                    const originalDuration = originalMatchData ? originalMatchData.duration || 0 : 0; 
                    const originalBuffer = originalMatchData ? originalMatchData.bufferTime || 0 : 0; 
                    const originalFootprintEnd = originalStartMinutes + originalDuration + originalBuffer;

                    // Ak sa medzera začína po pôvodnom zápase (alebo v ňom)
                    // A zároveň nový čas zápasu je neskôr ako pôvodný čas zápasu
                    if (gapStart >= originalStartMinutes && 
                        gapStart < originalFootprintEnd &&
                        (parseInt(movedMatchNewStartTime.split(':')[0]) * 60 + parseInt(movedMatchNewStartTime.split(':')[1])) > originalStartMinutes) {
                        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Detekovaný posun zápasu ${movedMatchOriginalId} z pôvodného miesta, generujem voľný slot.`);
                        shouldCreateFreeSlot = true; // Potvrdiť generovanie
                    } else if (originalFootprintEnd <= gapStart) {
                        // Ak je pôvodný zápas pred touto medzerou, tak táto medzera nevznikla jeho posunom,
                        // ale prirodzene (akoby nebol posunutý), takže ju NEgenerujeme.
                        shouldCreateFreeSlot = false;
                        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Medzera pred udalosťou ${event.id} NIE JE výsledkom posunu zápasu ${movedMatchOriginalId} (je pred ním). NEGENERUJEM voľný slot.`);
                    } else {
                        // Vo všetkých ostatných prípadoch (napr. presun dozadu, alebo je medzera príliš malá/ďaleká), negenerujeme.
                        shouldCreateFreeSlot = false;
                        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Medzera pred udalosťou ${event.id} NIE JE výsledkom posunu zápasu ${movedMatchOriginalId}. NEGENERUJEM voľný slot.`);
                    }
                } else {
                    // Ak sa zápas nepresúva v rámci rovnakého miesta a dňa, voľné sloty sa bežne NEgenerujú.
                    // Ak sa však presunul na úplne iné miesto/dátum, na pôvodnom mieste by mal vzniknúť voľný slot.
                    if (movedMatchOriginalId && 
                        (date !== movedMatchOriginalDate || location !== movedMatchOriginalLocation)) {
                        // Ak sme v pôvodnej hale/dni a zápas sa presunul preč, vznikne po ňom diera,
                        // ktorú by mal vyplniť voľný slot.
                        shouldCreateFreeSlot = true; // Zabezpečíme, že sa vytvorí na pôvodnom mieste
                        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Zápas ${movedMatchOriginalId} bol presunutý mimo pôvodného miesta/dňa. Generujem voľný slot na pôvodnom mieste.`);
                    } else {
                        // Ak je isSubsequentPushRequired true (t.j. zápasy sa posúvajú), nemali by sme generovať voľné sloty.
                        // Inak, generujeme voľné sloty ako zvyčajne.
                        shouldCreateFreeSlot = !isSubsequentPushRequired; 
                        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Nie je aktívny presunutý zápas alebo nie je v pôvodnom mieste/dňa. shouldCreateFreeSlot set to: ${shouldCreateFreeSlot} (based on isSubsequentPushRequired).`);
                    }
                }

                if (shouldCreateFreeSlot && gapStart < gapEnd) { // Vytvorí voľný slot len, ak má reálnu dĺžku
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): GENERUJEM placeholder pred udalosťou ${event.id}: Start: ${formattedGapStartTime}, End: ${formattedGapEndTime}.`);

                    const newPlaceholderDocRef = doc(blockedSlotsCollectionRef);
                    batch.set(newPlaceholderDocRef, {
                        date: date,
                        location: location,
                        startTime: formattedGapStartTime,
                        endTime: formattedGapEndTime,
                        startInMinutes: gapStart,
                        endInMinutes: gapEnd,
                        isBlocked: false,
                        createdAt: new Date()
                    });
                }
            }

            // Teraz spracujeme samotnú udalosť
            if (event.type === 'match') {
                let newMatchStartTimeMinutes;

                // Check if this is the dragged match being placed in its new spot
                const isTheDraggedMatch = movedMatchOriginalId && event.id === movedMatchOriginalId && date === movedMatchOriginalDate && location === movedMatchOriginalLocation;

                if (isTheDraggedMatch) {
                    // This is the newly placed (dragged) match.
                    // We force its start time to the droppedProposedStartTime.
                    const [newH, newM] = movedMatchNewStartTime.split(':').map(Number);
                    newMatchStartTimeMinutes = newH * 60 + newM;
                    // Activate the flag to push subsequent matches
                    isSubsequentPushRequired = true;
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Activated isSubsequentPushRequired for moved match ${event.id} at new time ${movedMatchNewStartTime}.`);
                } else if (isSubsequentPushRequired) {
                    // If the flag is active, and this is a subsequent match, force its start time to currentTimePointer.
                    // Ensure the new start time is not *before* the current pointer
                    newMatchStartTimeMinutes = currentTimePointer; // Still take max to avoid going backwards in case of very early original slot
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Pushing subsequent match ${event.id} to ${newMatchStartTimeMinutes} (from current pointer ${currentTimePointer}).`);
                } else {
                    // Normal behavior for other matches not affected by the "push" mode
                    newMatchStartTimeMinutes = Math.max(currentTimePointer, event.startInMinutes);
                }

                const newMatchStartTime = `${String(Math.floor(newMatchStartTimeMinutes / 60)).padStart(2, '0')}:${String(newMatchStartTimeMinutes % 60).padStart(2, '0')}`;
                const newMatchEndInMinutes = newMatchStartTimeMinutes + event.duration + event.bufferTime;

                // Only update if the time has actually changed to avoid unnecessary writes
                if (event.startTime !== newMatchStartTime) {
                    batch.update(event.docRef, { startTime: newMatchStartTime });
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Zápas ID: ${event.id} aktualizovaný v batchi na nový čas: ${newMatchStartTime}.`);
                } else {
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Zápas ID: ${event.id} čas sa nezmenil, preskakujem update.`);
                }
                
                currentTimePointer = newMatchEndInMinutes;

            } else if (event.type === 'blocked_slot') {
                // Používateľom zablokované sloty sú pevné, ich časy nemenia
                // If isSubsequentPushRequired is active, but we hit a blocked slot, we stop pushing.
                // This condition makes sure we only stop pushing if the fixed event is actually *after* the current pointer,
                // meaning it's a barrier for things *we are about to place*.
                if (isSubsequentPushRequired && event.startInMinutes > currentTimePointer) {
                     isSubsequentPushRequired = false;
                     console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Deactivated isSubsequentPushRequired due to fixed blocked slot ${event.id} starting at ${event.startInMinutes} (after current pointer ${currentTimePointer}).`);
                }
                currentTimePointer = Math.max(currentTimePointer, event.endInMinutes); // Uistite sa, že ukazovateľ prešiel za zablokovaný slot
                console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Zablokovaný slot ID: ${event.id} je pevný, ukazovateľ posunutý na: ${currentTimePointer}.`);
            }
            console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 3): Po spracovaní udalosti ${event.id || 'End of Day'}, currentTimePointer je teraz: ${currentTimePointer}`);
        }

        await batch.commit();
        console.log(`recalculateAndSaveScheduleForDateAndLocation: Batch commit úspešný.`);

        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("recalculateAndSaveScheduleForDateAndLocation: Chyba pri prepočítavaní a ukladaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri prepočítavaní rozvrhu: ${error.message}`);
    }
}

/**
 * Pomocná funkcia na získanie počiatočného času rozvrhu pre daný dátum.
 * @param {string} date Dátum.
 * @returns {Promise<number>} Počiatočný čas rozvrhu v minútach od polnoci.
*/
async function getInitialScheduleStartMinutes(date) {
    const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsDocRef);
    let firstDayStartTime = '08:00';
    let otherDaysStartTime = '08:00';

    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        firstDayStartTime = data.firstDayStartTime || '08:00';
        otherDaysStartTime = data.otherDaysStartTime || '08:00';
    }

    const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
    const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
    const isFirstPlayingDay = sortedPlayingDays.length > 0 && date === sortedPlayingDays[0];

    const initialStartTimeStr = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;
    const [initialH, initialM] = initialStartTimeStr.split(':').map(Number);
    return initialH * 60 + initialM;
}

/**
 * Získa dáta zápasu podľa ID.
 * @param {string} matchId ID zápasu.
 * @returns {Promise<Object|null>} Dáta zápasu alebo null, ak sa nenájde.
 */
async function getMatchData(matchId) {
    try {
        const matchDoc = await getDoc(doc(matchesCollectionRef, matchId));
        if (matchDoc.exists()) {
            return matchDoc.data();
        }
    } catch (error) {
        console.error("Chyba pri získavaní dát zápasu:", error);
    }
    return null;
}


/**
 * Prepočítava a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * pričom rešpektuje zablokované sloty a zachováva relatívne poradie presunutých zápasov.
 * @param {string} draggedMatchId ID presunutého zápasu.
 * @param {string} targetDate Dátum cieľového miesta.
 * @param {string} targetLocation Miesto cieľového miesta (názov).
 * @param {string|null} [droppedProposedStartTime=null] HH:MM string pre navrhovaný čas začiatku presunutého zápasu, alebo null pre pripojenie na koniec.
 * @param {string|null} [targetBlockedSlotId=null] ID zablokovaného slotu, na ktorý sa presúva (môže byť aj placeholder).
 * @param {string|null} [targetMatchIdToDisplace=null] ID zápasu, na ktorý bol presunutý, a ktorý je potrebné posunúť.
 */
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedProposedStartTime = null, targetBlockedSlotId = null, targetMatchIdToDisplace = null) {
    console.log(`moveAndRescheduleMatch: === SPUSTENÉ pre zápas ID: ${draggedMatchId}, cieľ: ${targetDate}, ${targetLocation}, navrhovaný čas: ${droppedProposedStartTime}, cieľový zablokovaný slot ID: ${targetBlockedSlotId}, cieľový zápas na posunutie ID: ${targetMatchIdToDisplace} ===`);
    try {
        const batch = writeBatch(db);

        const draggedMatchDocRef = doc(matchesCollectionRef, draggedMatchId);
        const draggedMatchDoc = await getDoc(draggedMatchDocRef);
        if (!draggedMatchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            console.error('moveAndRescheduleMatch: Presúvaný zápas nenájdený!', draggedMatchId);
            return;
        }
        const draggedMatchData = draggedMatchDoc.data();
        const originalDate = draggedMatchData.date;
        const originalLocation = draggedMatchData.location;
        const originalMatchStartTime = draggedMatchData.startTime; // Uložiť pôvodný čas zápasu


        let excludedBlockedSlotIdFromRecalculation = null;

        if (targetBlockedSlotId) {
            // Vymazanie cieľového slotu, či už je to starý voľný placeholder alebo čokoľvek iné
            batch.delete(doc(blockedSlotsCollectionRef, targetBlockedSlotId));
            console.log(`moveAndRescheduleMatch: Pridané do batchu na vymazanie cieľového zablokovaného slotu (ID: ${targetBlockedSlotId}).`);
            excludedBlockedSlotIdFromRecalculation = targetBlockedSlotId;
        } else if (targetMatchIdToDisplace && draggedMatchId !== targetMatchIdToDisplace) { // Bol pustený na existujúci zápas a nie je to ten istý zápas
            const displacedMatchDocRef = doc(matchesCollectionRef, targetMatchIdToDisplace);
            const displacedMatchDoc = await getDoc(displacedMatchDocRef);
            if (displacedMatchDoc.exists()) {
                const displacedMatchData = displacedMatchDoc.data();
                const draggedMatchDuration = Number(draggedMatchData.duration) || 0;
                const draggedMatchBufferTime = Number(draggedMatchData.bufferTime) || 0;
                
                const [displacedH, displacedM] = displacedMatchData.startTime.split(':').map(Number);
                const displacedStartInMinutes = displacedH * 60 + displacedM;
                // Posunúť existujúci zápas o dĺžku presúvaného zápasu + jeho rezervu
                const newDisplacedStartInMinutes = displacedStartInMinutes + draggedMatchDuration + draggedMatchBufferTime;
                const newDisplacedStartTime = `${String(Math.floor(newDisplacedStartInMinutes / 60)).padStart(2, '0')}:${String(newDisplacedStartInMinutes % 60).padStart(2, '0')}`;

                batch.update(displacedMatchDocRef, { startTime: newDisplacedStartTime });
                console.log(`moveAndRescheduleMatch: Pridané do batchu na posunutie cieľového zápasu (${targetMatchIdToDisplace}) na ${newDisplacedStartTime}`);
            }
        }

        // Aktualizujte dokument pôvodného zápasu na jeho nové miesto/čas
        const updatedMatchData = {
            ...draggedMatchData,
            date: targetDate,
            location: targetLocation,
            startTime: droppedProposedStartTime // Toto je presný čas dropnutého slotu
        };
        batch.set(draggedMatchDocRef, updatedMatchData, { merge: true });
        console.log(`moveAndRescheduleMatch: Pridané do batchu na aktualizáciu/opätovné vloženie zápasu: ${draggedMatchId} s novými dátami:`, updatedMatchData);

        await batch.commit();
        console.log("moveAndRescheduleMatch: Batch commit úspešný pre presun zápasu a prípadné vymazanie cieľového slotu.");

        // Prepočítajte rozvrh pre pôvodné miesta/dátumy (len ak sa zápas presunul inam)
        if (originalDate !== targetDate || originalLocation !== targetLocation) {
            await recalculateAndSaveScheduleForDateAndLocation(originalDate, originalLocation); 
            console.log(`moveAndRescheduleMatch: Prepočítanie pre pôvodnú lokáciu (${originalDate}, ${originalLocation}) dokončené.`);
        }
        // Prepočítajte rozvrh pre cieľové miesto/dátum
        await recalculateAndSaveScheduleForDateAndLocation(
            targetDate, 
            targetLocation, 
            excludedBlockedSlotIdFromRecalculation,
            draggedMatchId, // ID presunutého zápasu
            originalDate, // Pôvodný dátum
            originalLocation, // Pôvodné miesto
            originalMatchStartTime, // Pôvodný čas presunutého zápasu
            droppedProposedStartTime // Nový čas presunutého zápasu
        ); 
        console.log(`moveAndRescheduleMatch: Prepočítanie pre cieľovú lokáciu (${targetDate}, ${targetLocation}) dokončené.`);

        await showMessage('Úspech', 'Zápas úspešne presunutý a rozvrh prepočítaný!');
        closeModal(document.getElementById('messageModal'));
    } catch (error) {
        console.error("moveAndRescheduleMatch: Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule();
    }
}


/**
 * Pomocná funkcia na generovanie porovnateľného reťazca pre zobrazenie riadku udalosti.
 * @param {object} event Objekt udalosti (zápas alebo zablokovaný slot).
 * @param {object} allSettings Všetky globálne nastavenia, vrátane nastavení zápasov pre kategórie.
 * @param {Map<string, string>} categoryColorsMap Mapa ID kategórií na farby.
 * @returns {string} Reťazcová reprezentácia zobrazeného obsahu udalosti.
 */
function getEventDisplayString(event, allSettings, categoryColorsMap) {
    if (event.type === 'match') {
        const matchDuration = event.duration || (allSettings.categoryMatchSettings?.[event.categoryId]?.duration || 60);
        // ZMENA: Použite endOfPlayInMinutes pre zobrazený čas konca
        const displayedMatchEndTimeInMinutes = event.endOfPlayInMinutes; 
        const formattedDisplayedEndTime = `${String(Math.floor(displayedMatchEndTimeInMinutes / 60)).padStart(2, '0')}:${String(displayedMatchEndTimeInMinutes % 60).padStart(2, '0')}`;
        
        // Tento reťazec predstavuje viditeľný textový obsah riadku zápasu
        return `${event.startTime} - ${formattedDisplayedEndTime}|${event.team1ClubName || 'N/A'}|${event.team2ClubName || 'N/A'}|${event.team1ShortDisplayName || 'N/A'}|${event.team2ShortDisplayName || 'N/A'}`;
    } else if (event.type === 'blocked_slot') {
        let displayText = '';
        if (event.isBlocked === true) {
            displayText = 'Zablokovaný slot';
            const blockedSlotStartHour = String(Math.floor(event.startInMinutes / 60)).padStart(2, '0');
            const blockedSlotStartMinute = String(event.startInMinutes % 60).padStart(2, '0');
            const blockedSlotEndHour = String(Math.floor(event.endInMinutes / 60)).padStart(2, '0');
            const blockedSlotEndMinute = String(Math.floor(event.endInMinutes % 60)).padStart(2, '0');
            return `${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}|${displayText}`;
        } else {
            // Zmena: Použite uložené startTime a endTime pre voľné sloty
            displayText = 'Voľný slot dostupný'; 
            return `${event.startTime} - ${event.endTime}|${displayText}`; 
        }
    }
    return '';
}


/**
 * Zobrazí kompletný rozvrh zápasov.
*/
async function displayMatchesAsSchedule() {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    // Pridajte element pre animovaný načítací text
    matchesContainer.innerHTML = `<p id="loadingAnimationText" style="text-align: center; font-size: 1.2em; color: #555;"></p>`;
    // Spustite animáciu
    animateLoadingText('loadingAnimationText', 'Načítavam zoznam zápasov...');
    console.log('displayMatchesAsSchedule: Spustené načítavanie dát.');

    try {
        // Načítajte všetky údaje potrebné pre rozvrh
        const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
        const matchesSnapshot = await getDocs(matchesQuery);
        let allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané zápasy (po fetchData):", JSON.stringify(allMatches.map(m => ({id: m.id, date: m.date, location: m.location, startTime: m.startTime}))));

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        const categoryColorsMap = new Map(); // Nová mapa pre farby
        categoriesSnapshot.forEach(doc => {
            const categoryData = doc.data();
            categoriesMap.set(doc.id, categoryData.name || doc.id);
            categoryColorsMap.set(doc.id, categoryData.color || null); // Uložte farbu, predvolene na null
        });
        console.log("displayMatchesAsSchedule: Načítané kategórie:", Array.from(categoriesMap.entries()));

        // Zaznamenajte farby kategórií
        console.log("Farby pre Kategórie:");
        categoriesSnapshot.docs.forEach(doc => {
            const categoryData = doc.data();
            console.log(`ID kategórie: ${doc.id}, Názov: ${categoryData.name}, Farba: ${categoryData.color || 'N/A'}`);
        });

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));
        console.log("displayMatchesAsSchedule: Načítané skupiny:", Array.from(groupsMap.entries()));

        // Naplňte zobrazované názvy tímov pre zápasy
        const updatedMatchesPromises = allMatches.map(async match => {
            const [team1Data, team2Data] = await Promise.allSettled([
                getTeamName(match.categoryId, match.groupId, match.team1Number, categoriesMap, groupsMap),
                getTeamName(match.categoryId, match.groupId, match.team2Number, categoriesMap, groupsMap)
            ]);

            return {
                ...match,
                team1DisplayName: team1Data.status === 'fulfilled' ? team1Data.value.fullDisplayName : 'N/A',
                team1ShortDisplayName: team1Data.status === 'fulfilled' ? team1Data.value.shortDisplayName : 'N/A', // Nový krátky zobrazovaný názov
                team1ClubName: team1Data.status === 'fulfilled' ? team1Data.value.clubName : 'N/A',
                team1ClubId: team1Data.status === 'fulfilled' ? team1Data.value.clubId : null,
                team2DisplayName: team2Data.status === 'fulfilled' ? team2Data.value.fullDisplayName : 'N/A',
                team2ShortDisplayName: team2Data.status === 'fulfilled' ? team2Data.value.shortDisplayName : 'N/A', // Nový krátky zobrazovaný názov
                team2ClubName: team2Data.status === 'fulfilled' ? team2Data.value.clubName : 'N/A',
                team2ClubId: team2Data.status === 'fulfilled' ? team2Data.value.clubId : null,
            };
        });

        allMatches = await Promise.all(updatedMatchesPromises);
        console.log("displayMatchesAsSchedule: Všetky zápasy s naplnenými zobrazovanými názvami:", JSON.stringify(allMatches.map(m => ({id: m.id, date: m.date, location: m.location, startTime: m.startTime, team1DisplayName: m.team1DisplayName}))));

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const allPlayingDayDates = playingDaysSnapshot.docs.map(doc => doc.data().date);
        allPlayingDayDates.sort(); // Zoraďte dátumy chronologicky pre správne poradie zobrazenia
        console.log("displayMatchesAsSchedule: Načítané hracie dni (len dátumy):", allPlayingDayDates);

        const sportHallsSnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
        const allSportHalls = sportHallsSnapshot.docs.map(doc => doc.data().name);
        console.log("displayMatchesAsSchedule: Načítané športové haly:", allSportHalls);

        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        let globalFirstDayStartTime = '08:00';
        let globalOtherDaysStartTime = '08:00';
        let allSettings = {}; // Uložte všetky nastavenia pre ľahší prístup, vrátane špecifických pre kategórie
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            globalFirstDayStartTime = data.firstDayStartTime || '08:00';
            globalOtherDaysStartTime = data.otherDaysStartTime || '08:00';
            allSettings = data; // Uložte všetky dáta nastavení
        }
        console.log(`displayMatchesAsSchedule: Globálny čas začiatku (prvý deň): ${globalFirstDayStartTime}, (ostatné dni): ${globalOtherDaysStartTime}`);

        // Zmena: Načítajte len aktívne zablokované sloty (už žiadne fantómy tu)
        const blockedSlotsSnapshot = await getDocs(query(blockedSlotsCollectionRef));
        const allBlockedSlots = blockedSlotsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            type: 'blocked_slot',
            isBlocked: doc.data().isBlocked === true, // NOVÉ: Pridajte tento riadok pre zachytenie príznaku isBlocked
            ...doc.data(),
            startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60) + parseInt(doc.data().startTime.split(':')[1]),
            endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60) + parseInt(doc.data().endTime.split(':')[1])
        }));
        console.log("displayMatchesAsSchedule: Načítané zablokované sloty:", JSON.stringify(allBlockedSlots.map(s => ({id: s.id, date: s.date, location: s.location, startTime: s.startTime, endTime: s.endTime, isBlocked: s.isBlocked}))));


        // Zoskupte zápasy: {location -> {date -> [matches]}}
        const groupedMatches = new Map();
        allMatches.forEach(match => {
            if (match.locationType === 'Športová hala') {
                if (!groupedMatches.has(match.location)) {
                    groupedMatches.set(match.location, new Map());
                }
                const dateMap = groupedMatches.get(match.location);
                if (!dateMap.has(match.date)) {
                    dateMap.set(match.date, []);
                }
                dateMap.get(match.date).push(match);
            } else {
                console.warn(`displayMatchesAsSchedule: Zápas ${match.id} s neplatným typom miesta "${match.locationType}" bol preskočený z rozvrhu športových hál.`);
            }
        });
        console.log('displayMatchesAsSchedule: Zoskupené zápasy (podľa miesta a dátumu):', groupedMatches);

        let scheduleHtml = '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start;">'; // Hlavný flex kontajner

        if (allSportHalls.length === 0) {
            scheduleHtml += '<p style="margin: 20px; text-align: center; color: #888;">Žiadne športové haly na zobrazenie. Pridajte nové miesta typu "Športová hala" pomocou tlačidla "+".</p>';
        } else if (allPlayingDayDates.length === 0) {
            scheduleHtml += '<p style="margin: 20px; text-align: center; color: #888;">Žiadne hracie dni neboli definované. Najprv pridajte hracie dni.</p>';
        }
        else {
            const isOddNumberOfLocations = allSportHalls.length % 2 !== 0;

            for (let i = 0; i < allSportHalls.length; i++) {
                const location = allSportHalls[i];
                const matchesByDateForLocation = groupedMatches.get(location) || new Map(); // Získajte zápasy pre toto miesto, alebo prázdnu mapu, ak žiadne neexistujú

                // Určite jedinečné skupiny pre logiku zarovnania pre celé miesto (pre skupiny v zápasoch, ktoré existujú v tejto hale)
                const uniqueGroupIdsInLocation = new Set();
                matchesByDateForLocation.forEach(dateMap => {
                    dateMap.forEach(match => {
                        if (match.groupId) {
                            uniqueGroupIdsInLocation.add(match.groupId);
                        }
                    });
                });
                const groupIdsArrayInLocation = Array.from(uniqueGroupIdsInLocation).sort();
                let groupAlignmentMapForLocation = new Map();

                if (groupIdsArrayInLocation.length === 2) {
                    groupAlignmentMapForLocation.set(groupIdsArrayInLocation[0], 'left');
                    groupAlignmentMapForLocation.set(groupIdsArrayInLocation[1], 'right');
                } else if (groupIdsArrayInLocation.length === 3) {
                    groupAlignmentMapForLocation.set(groupIdsArrayInLocation[0], 'left');
                    groupAlignmentMapForLocation.set(groupIdsArrayInLocation[1], 'right');
                    groupAlignmentMapForLocation.set(groupIdsArrayInLocation[2], 'center');
                }


                let locationGroupStyle = "flex: 1 1 45%; min-width: 300px; margin-bottom: 0; border: 1px solid #ccc; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);";
                // Ak je nepárny počet hál a toto je posledná hala, pridajte margin-right: auto
                if (isOddNumberOfLocations && i === allSportHalls.length - 1) {
                    locationGroupStyle += " margin-right: 25.25%;";
                    locationGroupStyle += " margin-left: 25.25%;";
                }

                scheduleHtml += `<div class="location-group" style="${locationGroupStyle}">`;
                // Pridanie data- atribútov a triedy pre klikateľnosť na hlavičku haly
                scheduleHtml += `<h2 class="location-header-clickable" data-location="${location}" data-type="Športová hala" style="background-color: #007bff; color: white; padding: 18px; margin: 0; text-align: center; cursor: pointer;">${location}</h2>`;

                if (allPlayingDayDates.length === 0) {
                    scheduleHtml += `<p style="margin: 20px; text-align: center; color: #888;">Žiadne hracie dni neboli definované. Najprv pridajte hracie dni.</p>`;
                } else {
                    for (const date of allPlayingDayDates) { // Iterujte cez VŠETKY hracie dni
                        const matchesForDateAndLocation = groupedMatches.get(location) ? groupedMatches.get(location).get(date) || [] : [];
                        
                        // Získajte zablokované sloty pre aktuálny dátum a miesto (len isBlocked: true)
                        const blockedSlotsForDateAndLocation = allBlockedSlots.filter(bs => bs.date === date && bs.location === location && bs.isBlocked === true);

                        const displayDateObj = new Date(date);
                        const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                        const dayName = displayDateObj.toLocaleDateString('sk-SK', { weekday: 'long' });


                        // Zlúčte zápasy a VŠETKY typy zablokovaných slotov pre renderovanie.
                        const currentEventsForRendering = [
                            ...matchesForDateAndLocation.map(m => {
                                const startInMinutes = (parseInt(m.startTime.split(':')[0]) * 60 + parseInt(m.startTime.split(':')[1]));
                                const duration = (m.duration || (allSettings.categoryMatchSettings?.[m.categoryId]?.duration || 60));
                                const bufferTime = (m.bufferTime || (allSettings.categoryMatchSettings?.[m.categoryId]?.bufferTime || 5));
                                return {
                                    ...m,
                                    type: 'match',
                                    startInMinutes: startInMinutes,
                                    endOfPlayInMinutes: startInMinutes + duration, // Koniec hracieho času
                                    footprintEndInMinutes: startInMinutes + duration + bufferTime, // Koniec obsadeného slotu
                                    bufferTime: bufferTime // Pridajte bufferTime sem pre logiku zobrazenia voľných slotov
                                };
                            }),
                            ...allBlockedSlots.filter(bs => bs.date === date && bs.location === location) // Zahrňte VŠETKY typy blocked_slot pre renderovanie, aj neblokované placeholdery
                        ];
                        currentEventsForRendering.sort((a, b) => a.startInMinutes - b.startInMinutes);
                        console.log(`displayMatchesAsSchedule: Udalosti pre render pre ${location} na ${date} (zoradené):`, JSON.stringify(currentEventsForRendering.map(e => ({id: e.id, type: e.type, startTime: e.startTime || e.startInMinutes, endTime: e.endTime || e.endInMinutes, isBlocked: e.isBlocked, endOfPlayInMinutes: e.endOfPlayInMinutes, footprintEndInMinutes: e.footprintEndInMinutes}))));


                        // NOVINKA: Proces pre odstránenie po sebe idúcich identických záznamov
                        const finalEventsToRender = [];
                        let lastEvent = null;

                        for (const event of currentEventsForRendering) {
                            if (lastEvent) {
                                // Kontrola duplicitných po sebe idúcich voľných slotov
                                const isCurrentFreeSlot = event.type === 'blocked_slot' && event.isBlocked === false;
                                const isLastFreeSlot = lastEvent.type === 'blocked_slot' && lastEvent.isBlocked === false;

                                if (isCurrentFreeSlot && isLastFreeSlot && 
                                    event.startInMinutes === lastEvent.startInMinutes && 
                                    event.endInMinutes === lastEvent.endInMinutes) {
                                    console.log(`displayMatchesAsSchedule: Preskakujem duplicitný po sebe idúci voľný slot: ${event.id}`);
                                    continue; // Preskočte duplikát
                                }
                            }
                            finalEventsToRender.push(event);
                            lastEvent = event;
                        }
                        console.log(`displayMatchesAsSchedule: FinalEventsToRender (po odstránení duplicitných po sebe idúcich riadkov a koncových voľných):`, JSON.stringify(finalEventsToRender.map(e => ({id: e.id, type: e.type, startTime: e.startTime || e.startInMinutes, endTime: e.endTime || e.endInMinutes, isBlocked: e.isBlocked, endOfPlayInMinutes: e.endOfPlayInMinutes, footprintEndInMinutes: e.footprintEndInMinutes}))));


                        // Použite funkciu getInitialScheduleStartMinutes na určenie správneho počiatočného času začiatku.
                        const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(date); 
                        let currentTimePointerInMinutes = initialScheduleStartMinutes;
                        let contentAddedForThisDate = false;
                        
                        scheduleHtml += `<div class="date-group" data-date="${date}" data-location="${location}" data-initial-start-time="${String(Math.floor(initialScheduleStartMinutes / 60)).padStart(2, '0')}:${String(initialScheduleStartMinutes % 60).padStart(2, '0')}">`; // Style prenesené do CSS
                        // Pridaná trieda 'playing-day-header-clickable' a kurzor: pointer
                        scheduleHtml += `<h3 class="playing-day-header-clickable" style="background-color: #eaeaea; padding: 15px; margin: 0; border-bottom: 1px solid #ddd; cursor: pointer;">${dayName} ${formattedDisplayDate}</h3>`;

                        scheduleHtml += `<table class="data-table match-list-table compact-table" style="width: 100%; border-collapse: collapse;">`;
                        scheduleHtml += `<thead><tr>`;
                        scheduleHtml += `<th>Čas</th>`;
                        scheduleHtml += `<th>Domáci</th>`;
                        scheduleHtml += `<th>Hostia</th>`;
                        scheduleHtml += `<th>ID Domáci</th>`;
                        scheduleHtml += `<th>ID Hostia</th></tr></thead><tbody>`;


                        for (let i = 0; i < finalEventsToRender.length; i++) { // Iterujeme cez finalEventsToRender
                            const event = finalEventsToRender[i];

                            // Pridajte voľný slot, ak je medzera
                            // ZMENA: currentTimPoitnerInMinutes už musí byť posunutý za footprint predchádzajúceho zápasu.
                            // Tu kontrolujeme, či je medzera pred aktuálnym eventom.
                            if (currentTimePointerInMinutes < event.startInMinutes) {
                                const gapStart = currentTimePointerInMinutes;
                                let gapEnd = event.startInMinutes;

                                // Ak je ďalšia udalosť zápas, voľný slot končí PRED JEJ BUFFEROM
                                if (event.type === 'match') {
                                    const nextMatchBufferTime = Number(event.bufferTime) || 0;
                                    gapEnd = Math.max(gapStart, event.startInMinutes - nextMatchBufferTime);
                                }
                                
                                const formattedGapStartTime = `${String(Math.floor(gapStart / 60)).padStart(2, '0')}:${String(gapStart % 60).padStart(2, '0')}`;
                                const formattedGapEndTime = `${String(Math.floor(gapEnd / 60)).padStart(2, '0')}:${String(gapEnd % 60).padStart(2, '0')}`; 

                                // Determine how to display the time and the colspan
                                let displayTimeHtml = `<td>${formattedGapStartTime} - ${formattedGapEndTime}</td>`;
                                let textColspan = '4'; // Default colspan for the text cell

                                if (gapEnd === 24 * 60) {
                                    displayTimeHtml = ''; // No <td> for time
                                    textColspan = '5'; // Text spans all columns
                                }

                                if (gapStart < gapEnd) { 
                                    const existingFreeSlot = allBlockedSlots.find(s => 
                                        s.date === date && 
                                        s.location === location && 
                                        s.isBlocked === false && 
                                        s.startInMinutes === gapStart && 
                                        s.endInMinutes === gapEnd
                                    );
                                    // Ponechajte pôvodné ID ak existuje, inak generujte nové pre modal
                                    const freeSlotId = existingFreeSlot ? existingFreeSlot.id : 'generated-slot-' + Math.random().toString(36).substr(2, 9); 

                                    scheduleHtml += `
                                        <tr class="empty-slot-row free-slot-available-row" 
                                            data-id="${freeSlotId}" 
                                            data-date="${date}" 
                                            data-location="${location}" 
                                            data-start-time="${formattedGapStartTime}" 
                                            data-end-time="${formattedGapEndTime}" 
                                            data-is-blocked="false">
                                            ${displayTimeHtml}
                                            <td colspan="${textColspan}" style="text-align: center; color: #888; font-style: italic; background-color: #f0f0f0;">Voľný slot dostupný</td>
                                        </tr>
                                    `;
                                    contentAddedForThisDate = true;
                                }
                            }

                            // Aktuálna udalosť
                            if (event.type === 'match') {
                                const match = event;
                                // ZMENA: Použite endOfPlayInMinutes pre zobrazený čas konca
                                const displayedMatchEndTimeInMinutes = match.endOfPlayInMinutes; 
                                const formattedDisplayedEndTime = `${String(Math.floor(displayedMatchEndTimeInMinutes / 60)).padStart(2, '0')}:${String(displayedMatchEndTimeInMinutes % 60).padStart(2, '0')}`;
                                
                                const categoryColor = categoryColorsMap.get(match.categoryId) || 'transparent';
                                let textAlignStyle = '';
                                if (match.groupId && groupAlignmentMapForLocation.has(match.groupId)) {
                                    textAlignStyle = `text-align: ${groupAlignmentMapForLocation.get(match.groupId)};`;
                                } else if (groupIdsArrayInLocation.length > 3) {
                                     textAlignStyle = `text-align: center;`;
                                }
                                console.log(`displayMatchesAsSchedule: Vykresľujem zápas: ID ${match.id}, Čas: ${match.startTime}-${formattedDisplayedEndTime} (zobrazený), Miesto: ${match.location}, Dátum: ${match.date}`);

                                scheduleHtml += `
                                    <tr draggable="true" data-id="${match.id}" class="match-row" data-start-time="${match.startTime}" data-duration="${match.duration}" data-buffer-time="${match.bufferTime}" data-footprint-end-time="${String(Math.floor(match.footprintEndInMinutes / 60)).padStart(2, '0')}:${String(match.footprintEndInMinutes % 60).padStart(2, '0')}">
                                        <td>${match.startTime} - ${formattedDisplayedEndTime}</td>
                                        <td style="${textAlignStyle}">${match.team1ClubName || 'N/A'}</td>
                                        <td style="${textAlignStyle}">${match.team2ClubName || 'N/A'}</td>
                                        <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team1ShortDisplayName || 'N/A'}</td>
                                        <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team2ShortDisplayName || 'N/A'}</td>
                                    </tr>
                                `;
                                // Posuňte ukazovateľ na koniec tohto zápasu (vrátane rezervy)
                                currentTimePointerInMinutes = match.footprintEndInMinutes;
                                contentAddedForThisDate = true;

                            } else if (event.type === 'blocked_slot') {
                                const blockedSlot = event;
                                const blockedSlotStartHour = String(Math.floor(blockedSlot.startInMinutes / 60)).padStart(2, '0');
                                const blockedSlotStartMinute = String(blockedSlot.startInMinutes % 60).padStart(2, '0');
                                const blockedSlotEndHour = String(Math.floor(blockedSlot.endInMinutes / 60)).padStart(2, '0');
                                const blockedSlotEndMinute = String(Math.floor(blockedSlot.endInMinutes % 60).padStart(2, '0');
                                
                                const isUserBlocked = blockedSlot.isBlocked === true; 

                                let rowClass = '';
                                let cellStyle = '';
                                let displayText = ''; 
                                let dataAttributes = `data-is-blocked="${isUserBlocked}"`;

                                let displayTimeHtml = `<td>${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}</td>`;
                                let textColspan = '4';

                                if (blockedSlot.endInMinutes === 24 * 60) {
                                    displayTimeHtml = ''; // No <td> for time
                                    textColspan = '5'; // Text spans all columns
                                }

                                if (isUserBlocked) { 
                                    rowClass = 'blocked-slot-row'; 
                                    cellStyle = 'text-align: center; color: white; background-color: #dc3545; font-style: italic;';
                                    displayText = 'Zablokovaný slot'; 
                                } else { // Toto pokrýva len bežné voľné placeholdery
                                    rowClass = 'empty-slot-row free-slot-available-row'; 
                                    cellStyle = 'text-align: center; color: #888; font-style: italic; background-color: #f0f0f0;'; 
                                    displayText = 'Voľný slot dostupný'; 
                                }

                                console.log(`displayMatchesAsSchedule: Vykresľujem zablokovaný slot: ID ${blockedSlot.id}, Čas: ${blockedSlotStartHour}:${blockedSlotStartMinute}-${blockedSlotEndHour}:${blockedSlotEndMinute}, Miesto: ${blockedSlot.location}, Dátum: ${blockedSlot.date}, isBlocked: ${isUserBlocked}, Display Text: "${displayText}"`);

                                scheduleHtml += `
                                    <tr class="${rowClass}" data-id="${blockedSlot.id}" data-date="${date}" data-location="${location}" data-start-time="${blockedSlotStartHour}:${blockedSlotStartMinute}" data-end-time="${blockedSlotEndHour}:${blockedSlotEndMinute}" ${dataAttributes}>
                                        ${displayTimeHtml}
                                        <td colspan="${textColspan}" style="${cellStyle}">${displayText}</td>
                                    </tr>
                                `;
                                // Posuňte ukazovateľ na koniec zablokovaného slotu
                                currentTimePointerInMinutes = blockedSlot.endInMinutes;
                                contentAddedForThisDate = true;
                            }
                        }
                        
                        // Po spracovaní všetkých udalostí skontrolujte, či existuje voľný slot až do konca dňa (24:00)
                        // A LEN AK JE NEjaký VOĽNÝ SLOT DOSTUPNÝ (t.j. currentEventForRendering.length > 0
                        // a posledný event nie je na konci dňa), potom sa ZOBRAZÍ.
                        if (currentTimePointerInMinutes < 24 * 60 && finalEventsToRender.length > 0) {
                            const lastEventInRenderedList = finalEventsToRender[finalEventsToRender.length - 1];
                            const lastEventEndTime = lastEventInRenderedList.type === 'match' 
                                ? lastEventInRenderedList.footprintEndInMinutes 
                                : lastEventInRenderedList.endInMinutes;

                            // Ak posledná udalosť NEKONČÍ na 24:00 a po nej ostáva nejaká medzera,
                            // a zároveň aktuálny časový ukazovateľ je menší ako 24:00
                            if (lastEventEndTime < 24 * 60 && currentTimePointerInMinutes < 24 * 60) {
                                const gapStart = currentTimePointerInMinutes;
                                const gapEnd = 24 * 60; // Koniec dňa (polnoc)
                                const formattedGapStartTime = `${String(Math.floor(gapStart / 60)).padStart(2, '0')}:${String(gapStart % 60).padStart(2, '0')}`;
                                const formattedGapEndTime = `${String(Math.floor(gapEnd / 60)).padStart(2, '0')}:${String(gapEnd % 60).padStart(2, '0')}`; 

                                const existingFreeSlot = allBlockedSlots.find(s => 
                                    s.date === date && 
                                    s.location === location && 
                                    s.isBlocked === false && 
                                    s.startInMinutes === gapStart && 
                                    s.endInMinutes === gapEnd
                                );
                                // Ponechajte pôvodné ID ak existuje, inak generujte nové pre modal
                                const freeSlotId = existingFreeSlot ? existingFreeSlot.id : 'generated-slot-' + Math.random().toString(36).substr(2, 9); 
                                
                                // Determine how to display the time and the colspan
                                let displayTimeHtml = ''; // Always empty for the very end-of-day slot
                                let textColspan = '5'; // Always spans all columns

                                if (gapStart < gapEnd) { // Still ensure it's a valid duration
                                    scheduleHtml += `
                                        <tr class="empty-slot-row free-slot-available-row end-of-day-free-slot-row" 
                                            data-id="${freeSlotId}" 
                                            data-date="${date}" 
                                            data-location="${location}" 
                                            data-start-time="${formattedGapStartTime}" 
                                            data-end-time="${formattedGapEndTime}" 
                                            data-is-blocked="false">
                                            ${displayTimeHtml}
                                            <td colspan="${textColspan}" style="text-align: center; color: #888; font-style: italic; background-color: #f0f0f0;">Voľný slot dostupný</td>
                                        </tr>
                                    `;
                                    contentAddedForThisDate = true;
                                }
                            }
                        }


                        // PRIDANIE: Prázdny riadok za posledný riadok každého dňa (za 24:00)
                        // Tento riadok nemá mať funkciu hover a vždy musí byť biely
                        scheduleHtml += `
                            <tr class="footer-spacer-row" style="height: 15px; background-color: white;">
                                <td colspan="5"></td>
                            </tr>
                        `;


                        if (!contentAddedForThisDate) {
                            scheduleHtml += `<tr><td colspan="5" style="text-align: center; color: #888; font-style: italic; padding: 15px;">Žiadne zápasy ani zablokované sloty pre tento deň.</td></tr>`;
                        }

                        scheduleHtml += `</tbody></table></div>`; // Zavrieť tabuľku a div skupiny dátumov
                    }
                }
                scheduleHtml += `</div>`; // Zavrieť div skupiny miest
            }
        }
        scheduleHtml += '</div>'; // Zavrieť hlavný flex kontajner

        matchesContainer.innerHTML = scheduleHtml;
        console.log('displayMatchesAsSchedule: HTML rozvrhu aktualizované.');

        // Pridajte poslucháčov udalostí pre každý riadok zápasu pre kliknutie (úpravu)
        matchesContainer.querySelectorAll('.match-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const matchId = event.currentTarget.dataset.id;
                openMatchModal(matchId); // Zavolajte refaktorovanú openMatchModal
            });
            // Pridajte poslucháča dragstart
            row.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', event.target.dataset.id);
                event.dataTransfer.effectAllowed = 'move';
                // Voliteľné: Pridajte triedu k presúvanému elementu pre vizuálnu spätnú väzbu
                event.target.classList.add('dragging');
                console.log(`Drag started for match ID: ${event.target.dataset.id}`);
            });

            // Voliteľné: Odstráňte triedu dragging po dragend
            row.addEventListener('dragend', (event) => {
                event.target.classList.remove('dragging');
                console.log(`Drag ended for match ID: ${event.target.dataset.id}`);
            });
        });

        // Pridajte poslucháčov udalostí pre prázdne riadky slotov pre kliknutie
        // ZMENA: Vyberte VŠETKY .empty-slot-row, OKREM tých, ktoré majú aj .end-of-day-free-slot-row
        matchesContainer.querySelectorAll('.empty-slot-row:not(.end-of-day-free-slot-row)').forEach(row => {
            row.addEventListener('click', (event) => {
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
                // Pre free slot modal použite pôvodné start/end z dátových atribútov, nie z upraveného zobrazenia
                const startTime = event.currentTarget.dataset.startTime; 
                const endTime = event.currentTarget.dataset.endTime; 
                const blockedSlotId = event.currentTarget.dataset.id; // Teraz má vždy ID

                openFreeSlotModal(date, location, startTime, endTime, blockedSlotId); 
            });
            // Pridajte poslucháčov drop aj na prázdne sloty
            row.addEventListener('dragover', (event) => {
                event.preventDefault(); // Kľúčové pre povolenie dropu
                event.dataTransfer.dropEffect = 'move';
                event.currentTarget.classList.add('drop-over-row');
            });
            row.addEventListener('dragleave', (event) => {
                event.currentTarget.classList.remove('drop-over-row');
            });
            row.addEventListener('drop', async (event) => {
                event.preventDefault();
                event.currentTarget.classList.remove('drop-over-row');

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const newDate = event.currentTarget.dataset.date;
                const newLocation = event.currentTarget.dataset.location;
                const droppedProposedStartTime = event.currentTarget.dataset.startTime; // Použite čas začiatku prázdneho slotu
                const targetBlockedSlotId = event.currentTarget.dataset.id; // Tento prázdny slot bude vymazaný

                console.log(`Presunutý zápas ${draggedMatchId} na prázdny slot. Nový dátum: ${newDate}, nové miesto: ${newLocation}, navrhovaný čas začiatku: ${droppedProposedStartTime}. ID cieľového zablokovaného slotu: ${targetBlockedSlotId}`);
                await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime, targetBlockedSlotId, null); // targetMatchIdToDisplace je null
            });
        });

        // Pridajte poslucháčov udalostí pre zablokované riadky slotov pre kliknutie
        matchesContainer.querySelectorAll('.blocked-slot-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const blockedSlotId = event.currentTarget.dataset.id;
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
                const startTime = event.currentTarget.dataset.startTime;
                const endTime = event.currentTarget.dataset.endTime;
                openFreeSlotModal(date, location, startTime, endTime, blockedSlotId); // Otvoriť modál na úpravu zablokovaného slotu
            });
            // UPRAVENÉ: Poslucháči dragover a drop pre zablokované sloty
            row.addEventListener('dragover', (event) => {
                event.preventDefault(); // Povoliť drop
                event.dataTransfer.dropEffect = 'none'; // Zmeniť efekt na "none" pre vizuálne označenie, že drop nie je povolený
                event.currentTarget.classList.add('drop-over-forbidden'); // Pridajte triedu pre vizuálnu spätnú väzbu
            });
            row.addEventListener('dragleave', (event) => {
                event.currentTarget.classList.remove('drop-over-forbidden'); // Odstrániť triedu po opustení
            });
            row.addEventListener('drop', async (event) => {
                event.preventDefault();
                event.currentTarget.classList.remove('drop-over-forbidden'); // Vyčistiť vizuálnu spätnú väzbu

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
                const startTime = event.currentTarget.dataset.startTime;
                const endTime = event.currentTarget.dataset.endTime;

                console.log(`Pokus o presun zápasu ${draggedMatchId} na zablokovaný slot: Dátum ${date}, Miesto ${location}, Čas ${startTime}-${endTime}. Presun ZAMITNUTÝ.`);
                await showMessage('Upozornenie', 'Tento časový interval je zablokovaný. Zápas naň nie je možné presunúť.');
                // NIE JE potrebné volať moveAndRescheduleMatch, zápas zostane na pôvodnom mieste
            });
        });

        // NOVINKA: Poslucháč udalostí pre hlavičku športovej haly
        matchesContainer.querySelectorAll('.location-header-clickable').forEach(header => {
            header.addEventListener('click', (event) => {
                // Zabezpečte, aby kliknutie na vnútorné prvky hlavičky (ak by boli pridané)
                // nespôsobilo nežiaduce správanie, ak by mali vlastných poslucháčov.
                // V tomto prípade by celá oblasť mala otvoriť modál.
                const locationToEdit = header.dataset.location;
                const locationTypeToEdit = header.dataset.type; // Toto by malo byť "Športová hala"
                editPlace(locationToEdit, locationTypeToEdit);
            });
        });

        // NOVINKA: Poslucháč udalostí pre hlavičky hracích dní (dátumov)
        matchesContainer.querySelectorAll('.playing-day-header-clickable').forEach(header => {
            header.addEventListener('click', (event) => {
                // Nájde najbližší rodičovský div s dátovým atribútom 'data-date', čo je div .date-group
                const dateGroupDiv = event.currentTarget.closest('.date-group');
                if (dateGroupDiv) {
                    const dateToEdit = dateGroupDiv.dataset.date;
                    editPlayingDay(dateToEdit);
                }
            });
        });

        // Pridajte poslucháčov dragover a drop pre divy skupiny dátumov (obsahujúce tabuľky)
        matchesContainer.querySelectorAll('.date-group').forEach(dateGroupDiv => { // Použite matchesContainer na vyhľadanie
            dateGroupDiv.addEventListener('dragover', (event) => {
                event.preventDefault(); // Kľúčové pre povolenie umiestnenia
                event.dataTransfer.dropEffect = 'move';
                
                // Vizuálna spätná väzba pre bod vloženia (napr. orámovanie)
                const targetRow = event.target.closest('tr');
                // ZMENA: Ak je to riadok s footer-spacer-row alebo end-of-day-free-slot-row, nepovoliť drop efekt.
                if (targetRow && (targetRow.classList.contains('footer-spacer-row') || targetRow.classList.contains('end-of-day-free-slot-row'))) {
                    event.dataTransfer.dropEffect = 'none';
                    targetRow.classList.add('drop-over-forbidden');
                } else if (targetRow && !targetRow.classList.contains('blocked-slot-row')) {
                    // Ak je nad platným riadkom (zápas alebo prázdny), zvýraznite riadok
                    targetRow.classList.add('drop-over-row');
                } else if (targetRow && targetRow.classList.contains('blocked-slot-row')) {
                    // Ak je nad zablokovaným riadkom, označte, že drop nie je povolený
                    targetRow.classList.remove('drop-over-row'); // remove just in case
                    targetRow.classList.add('drop-over-forbidden');
                } else {
                    // Ak je nad samotným divom date-group (prázdny priestor), zvýraznite date-group
                    dateGroupDiv.classList.add('drop-target-active');
                }
            });

            dateGroupDiv.addEventListener('dragleave', (event) => {
                const targetRow = event.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.remove('drop-over-row');
                    targetRow.classList.remove('drop-over-forbidden');
                }
                dateGroupDiv.classList.remove('drop-target-active');
            });

            dateGroupDiv.addEventListener('drop', async (event) => {
                event.preventDefault();
                // Vyčistite vizuálnu spätnú väzbu
                const targetRow = event.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.remove('drop-over-row');
                    targetRow.classList.remove('drop-over-forbidden');
                }
                dateGroupDiv.classList.remove('drop-target-active');

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const newDate = dateGroupDiv.dataset.date;
                const newLocation = dateGroupDiv.dataset.location;
                let droppedProposedStartTime = null;
                let targetBlockedSlotId = null; 
                let targetMatchIdToDisplace = null; // NOVÉ

                if (draggedMatchId) {
                    // ZMENA: Ak sa presunie na zablokovaný slot ALEBO na footer-spacer-row ALEBO na end-of-day-free-slot-row, zamedzte presunu
                    if (targetRow && (targetRow.classList.contains('blocked-slot-row') || targetRow.classList.contains('footer-spacer-row') || targetRow.classList.contains('end-of-day-free-slot-row'))) {
                        console.log(`Pokus o presun zápasu ${draggedMatchId} na zablokovaný slot, spacer row alebo end-of-day free slot. Presun ZAMITNUTÝ.`);
                        await showMessage('Upozornenie', 'Na tento časový interval nie je možné presunúť zápas.');
                        return; // Zastaviť drop operáciu
                    }

                    const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(newDate);
                    const initialScheduleStartTimeStr = `${String(Math.floor(initialScheduleStartMinutes / 60)).padStart(2, '0')}:${String(initialScheduleStartMinutes % 60).padStart(2, '0')}`;

                    if (targetRow && targetRow.classList.contains('match-row')) {
                        // Pustené na existujúci riadok zápasu.
                        droppedProposedStartTime = targetRow.dataset.startTime;
                        targetMatchIdToDisplace = targetRow.dataset.id; // Zaznamenajte ID zápasu, ktorý sa má posunúť
                        targetBlockedSlotId = null; // Žiadny zablokovaný slot na vymazanie
                        console.log(`Pustené na existujúci zápas (${targetRow.dataset.startTime}). Navrhujem jeho čas začiatku ako nový štart a cieľový zápas označený na posunutie: ${targetMatchIdToDisplace}`);
                    } else if (targetRow && targetRow.classList.contains('empty-slot-row')) {
                        // Pustené priamo na riadok prázdneho slotu. Nahradiť tento prázdny slot.
                        droppedProposedStartTime = targetRow.dataset.startTime;
                        targetBlockedSlotId = targetRow.dataset.id; // Tento prázdny slot bude vymazaný
                        targetMatchIdToDisplace = null; // Žiadny zápas na posunutie
                        console.log(`Pustené na prázdny slot (${droppedProposedStartTime}). ID cieľového zablokovaného slotu: ${targetBlockedSlotId} na vymazanie.`);

                    } else {
                        // Pustené na pozadie divu skupiny dátumov (znamená pripojenie na koniec, alebo na začiatok, ak nie sú žiadne zápasy)
                        // Tento prípad spracováva pustenie do "prázdneho priestoru", nie priamo na riadok.
                        let nextAvailableTimeAfterLastMatch = initialScheduleStartTimeStr; // Predvolené na začiatok dňa
                        
                        const currentMatchesQuery = query(
                            matchesCollectionRef,
                            where("date", "==", newDate),
                            where("location", "==", newLocation),
                            orderBy("startTime", "desc"), // Order by desc to get the last match
                            limit(1) 
                        );
                        const lastMatchSnapshot = await getDocs(currentMatchesQuery);
                        if (!lastMatchSnapshot.empty) {
                            const lastMatch = lastMatchSnapshot.docs[0].data();
                            const lastMatchStartInMinutes = (parseInt(lastMatch.startTime.split(':')[0]) * 60 + parseInt(lastMatch.startTime.split(':')[1]));
                            const lastMatchFootprintEndInMinutes = lastMatchStartInMinutes + (Number(lastMatch.duration) || 0) + (Number(lastMatch.bufferTime) || 0); // Ensure numbers
                            nextAvailableTimeAfterLastMatch = `${String(Math.floor(lastMatchFootprintEndInMinutes / 60)).padStart(2, '0')}:${String(lastMatchFootprintEndInMinutes % 60).padStart(2, '0')}`;
                            console.log(`Nájdený posledný zápas o ${lastMatch.startTime}, navrhujem čas: ${nextAvailableTimeAfterLastMatch}`);
                        } else {
                             console.log(`Žiadne zápasy pre ${newDate} na ${newLocation}, navrhujem počiatočný čas dňa: ${initialScheduleStartTimeStr}`);
                        }
                        
                        // Zistite, či existuje prázdny slot začínajúci presne na nextAvailableTimeAfterLastMatch
                        const allBlockedSlotsForLocation = (await getDocs(query(blockedSlotsCollectionRef, where("date", "==", newDate), where("location", "==", newLocation), orderBy("startInMinutes", "asc")))).docs
                            .map(doc => ({id: doc.id, ...doc.data()}));
                        
                        const targetEmptySlot = allBlockedSlotsForLocation.find(s => 
                            s.isBlocked === false && 
                            s.startTime === nextAvailableTimeAfterLastMatch
                        );

                        if (targetEmptySlot) {
                            droppedProposedStartTime = targetEmptySlot.startTime;
                            targetBlockedSlotId = targetEmptySlot.id;
                            targetMatchIdToDisplace = null;
                            console.log(`Pustené na pozadie skupiny dátumov. Nájdený prázdny slot na zacielenie: ${droppedProposedStartTime}, ID: ${targetBlockedSlotId}`);
                        } else {
                            droppedProposedStartTime = nextAvailableTimeAfterLastMatch;
                            targetBlockedSlotId = null; // No specific slot to delete
                            targetMatchIdToDisplace = null; // No match to displace
                            console.log(`Pustené na pozadie skupiny dátumov. Nenašiel sa žiadny konkrétny prázdny slot na konci, používam: ${droppedProposedStartTime}`);
                        }
                    }

                    console.log(`Pokúšam sa presunúť a preplánovať zápas ${draggedMatchId} na Dátum: ${newDate}, Miesto: ${newLocation}, Navrhovaný čas začiatku: ${droppedProposedStartTime}, ID cieľového zablokovaného slotu: ${targetBlockedSlotId}, ID cieľového zápasu na posunutie: ${targetMatchIdToDisplace}`);
                    await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime, targetBlockedSlotId, targetMatchIdToDisplace);
                }
            });
        });


        // STARÝ poslucháč pre date-header-clickable je odstránený z DOMContentLoaded,
        // pretože je nahradený novým `.playing-day-header-clickable` poslucháčom vyššie.
        // Tým sa zabezpečí, že kliknutie na hlavičku dňa funguje správne.

    } catch (error) {
        console.error("Chyba pri načítaní rozvrhu zápasov (zachytená chyba):", error);
        matchesContainer.innerHTML = `
            <div class="error-message">
                <h3>Chyba pri načítaní rozvrhu zápasov!</h3>
                <p>Prosím, skontrolujte konzolu prehliadača (F12 > Konzola) pre detaily.</p>
                <p>Možné príčiny:</p>
                <ul>
                    <li>Chýbajúce indexy vo Firestore. Skontrolujte záložku "Sieť" v konzole a Firebase Console.</li>
                    <li>Problém s pripojením k databáze alebo bezpečnostné pravidlá.</li>
                    <li>Žiadne dáta v kolekciách.</li>
                </ul>
                <p>Detail chyby: ${error.message}</p>
            </div>
        `;
        // Ak sa chyba týka offline režimu alebo problémov s pripojením, zobrazte konkrétnejšiu správu
        if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
             matchesContainer.innerHTML += '<p class="error-message">Zdá sa, že nie ste pripojení k internetu, alebo je problém s pripojením k Firebase.</p>';
        }
    }
}

/**
 * Zmaže hrací deň a všetky súvisiace zápasy. Autobusové trasy a ubytovanie odstránené.
 * @param {string} dateToDelete Dátum hracieho dňa na zmazanie.
*/
async function deletePlayingDay(dateToDelete) {
    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy, ktoré sa konajú v tento deň?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Zmažte dokument hracieho dňa
            const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
            const playingDaySnapshot = await getDocs(playingDayQuery);
            if (!playingDaySnapshot.empty) {
                playingDaySnapshot.docs.forEach(docToDelete => {
                    batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                });
            }

            // Zmažte súvisiace zápasy
            const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            // Zmažte súvisiace zablokované sloty
            const blockedSlotsQuery = query(blockedSlotsCollectionRef, where("date", "==", dateToDelete));
            const blockedSlotsSnapshot = await getDocs(blockedSlotsCollectionRef);
            blockedSlotsSnapshot.docs.forEach(blockedSlotDoc => {
                batch.delete(doc(blockedSlotsCollectionRef, blockedSlotDoc.id));
            });


            await batch.commit();
            await showMessage('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy/sloty boli vymazané!`);
            closeModal(document.getElementById('playingDayModal'));
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri mazaní hracieho dňa. Detail: ${error.message}`);
        }
    }
}

/**
 * Zmaže miesto (športovú halu alebo stravovacie zariadenie) a všetky súvisiace zápasy. Autobusové trasy a ubytovanie odstránené.
 * @param {string} placeNameToDelete Názov miesta na zmazanie.
 * @param {string} placeTypeToDelete Typ miesta na zmazanie.
*/
async function deletePlace(placeNameToDelete, placeTypeToDelete) {
    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať miesto ${placeNameToDelete} (${placeTypeToDelete}) a VŠETKY zápasy, ktoré sa viažu na toto miesto?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Zmažte dokument miesta
            const placeQuery = query(placesCollectionRef, where("name", "==", placeNameToDelete), where("type", "==", placeTypeToDelete));
            const placeSnapshot = await getDocs(placeQuery);
            if (!placeSnapshot.empty) {
                placeSnapshot.docs.forEach(docToDelete => {
                    batch.delete(doc(placesCollectionRef, docToDelete.id));
                });
            }

            // Zmažte súvisiace zápasy
            const matchesQuery = query(matchesCollectionRef, where("location", "==", placeNameToDelete), where("locationType", "==", placeTypeToDelete));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            // Zmažte súvisiace zablokované sloty
            const blockedSlotsQuery = query(blockedSlotsCollectionRef, where("location", "==", placeNameToDelete));
            const blockedSlotsSnapshot = await getDocs(blockedSlotsCollectionRef);
            blockedSlotsSnapshot.docs.forEach(blockedSlotDoc => {
                batch.delete(doc(blockedSlotsCollectionRef, blockedSlotDoc.id));
            });


            await batch.commit();
            await showMessage('Úspech', `Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy boli vymazané!`);
            closeModal(document.getElementById('placeModal'));
            await displayMatchesAsSchedule();
        } catch (error) {
                console.error("Chyba pri mazaní miesta:", error);
                await showMessage('Chyba', `Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}). Detail: ${error.message}`);
        }
    }
}

/**
 * Otvorí modálne okno na úpravu existujúceho hracieho dňa.
 * @param {string} dateToEdit Dátum hracieho dňa na úpravu.
*/
async function editPlayingDay(dateToEdit) {
    // Získajte referencie na elementy vo vnútri funkcie, aby ste zabezpečili ich dostupnosť
    const playingDayModal = document.getElementById('playingDayModal');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    try {
        const q = query(playingDaysCollectionRef, where("date", "==", dateToEdit));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const playingDayDoc = querySnapshot.docs[0];
            const playingDayData = playingDayDoc.data();
            const playingDayId = playingDayDoc.id;

            playingDayIdInput.value = playingDayId;
            playingDayDateInput.value = playingDayData.date || '';
            playingDayModalTitle.textContent = 'Upraviť hrací deň';
            deletePlayingDayButtonModal.style.display = 'inline-block';
            // Odstráňte starý posluchovač pred pridaním nového
            if (deletePlayingDayButtonModal && deletePlayingDayButtonModal._currentHandler) {
                deletePlayingDayButtonModal.removeEventListener('click', deletePlayingDayButtonModal._currentHandler); 
                delete deletePlayingDayButtonModal._currentHandler; // Vyčistite referenciu
            }
            const handler = () => deletePlayingDay(playingDayData.date);
            deletePlayingDayButtonModal.addEventListener('click', handler);
            deletePlayingDayButtonModal._currentHandler = handler; // Uložte referenciu
            openModal(playingDayModal);
        } else {
            await showMessage('Informácia', "Hrací deň sa nenašiel.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát hracieho dňa:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát hracieho dňa. Skúste to znova.");
    }
}

/**
 * Otvorí modálne okno na úpravu existujúceho miesta.
 * @param {string} placeName Názov miesta na úpravu.
 * @param {string} placeType Typ miesta na úpravu.
*/
async function editPlace(placeName, placeType) {
    // Získajte referencie na elementy vo vnútri funkcie, aby ste zabezpečili ich dostupnosť
    const placeModal = document.getElementById('placeModal');
    const placeIdInput = document.getElementById('placeId');
    const placeTypeSelect = document.getElementById('placeTypeSelect');
    const placeNameInput = document.getElementById('placeName');
    const placeAddressInput = document.getElementById('placeAddress');
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

    try {
        const q = query(placesCollectionRef, where("name", "==", placeName), where("type", "==", placeType));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const placeDoc = querySnapshot.docs[0];
            const placeData = placeDoc.data();
            const placeId = placeDoc.id;

            placeIdInput.value = placeId;
            placeTypeSelect.value = placeData.type || '';
            placeNameInput.value = placeData.name || '';
            placeAddressInput.value = placeData.address || '';
            placeGoogleMapsUrlInput.value = placeData.googleMapsUrl || '';

            deletePlaceButtonModal.style.display = 'inline-block';
            // Odstráňte starý posluchovač pred pridaním nového
            if (deletePlaceButtonModal && deletePlaceButtonModal._currentHandler) {
                deletePlaceButtonModal.removeEventListener('click', deletePlaceButtonModal._currentHandler);
                delete deletePlaceButtonModal._currentHandler; // Vyčistite referenciu
            }
            const handler = () => deletePlace(placeData.name, placeData.type);
            deletePlaceButtonModal.addEventListener('click', handler);
            deletePlaceButtonModal._currentHandler = handler; // Uložte referenciu
            openModal(placeModal);
        } else {
            await showMessage('Informácia', "Miesto sa nenašlo.");
        }
    }
    catch (error) {
        console.error("Chyba pri načítavaní dát miesta:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát miesta. Skúste to znova.");
    }
}

/**
 * Otvorí modálne okno pre zápas na pridanie nového zápasu alebo úpravu existujúceho, s voliteľným predvyplnením.
 * @param {string|null} matchId ID zápasu na úpravu, alebo null pre nový zápas.
 * @param {string} [prefillDate=''] Voliteľné: Dátum na predvyplnenie modálneho okna.
 * @param {string} [prefillLocation=''] Voliteľné: Miesto na predvyplnenie modálneho okna.
 * @param {string} [prefillStartTime=''] Voliteľné: Čas začiatku na predvyplnenie modálneho okna.
*/
async function openMatchModal(matchId = null, prefillDate = '', prefillLocation = '', prefillStartTime = '') {
    // Získajte referencie na elementy vo vnútri funkcie, aby ste zabezpečili ich dostupnosť
    const matchModal = document.getElementById('matchModal');
    const matchIdInput = document.getElementById('matchId');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect'); 
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');
    const matchForm = document.getElementById('matchForm'); // Uistite sa, že matchForm je prístupný

    // Odstránenie predošlého poslucháča, aby sa predišlo viacnásobným priradeniam
    if (deleteMatchButtonModal && deleteMatchButtonModal._currentHandler) { // Skontrolujte, či element existuje pred prístupom k _currentHandler
        deleteMatchButtonModal.removeEventListener('click', deleteMatchButtonModal._currentHandler);
        delete deleteMatchButtonModal._currentHandler; // Vyčistite referenciu
    }

    matchForm.reset(); // Vždy resetujte formulár
    matchIdInput.value = matchId || ''; // Nastavte ID, ak sa upravuje, vymažte, ak sa pridáva
    deleteMatchButtonModal.style.display = matchId ? 'inline-block' : 'none'; // Zobrazte/skryte tlačidlo zmazať
    
    // Pridanie event listeneru pre tlačidlo deleteMatchButtonModal
    if (matchId) {
        const handler = () => deleteMatch(matchId);
        deleteMatchButtonModal.addEventListener('click', handler);
        deleteMatchButtonModal._currentHandler = handler; // Uložte referenciu na handler
    } else {
        // Ak sa neupravuje, uistite sa, že nezostal omylom žiadny handler
        deleteMatchButtonModal._currentHandler = null; 
    }


    if (matchId) { // Úprava existujúceho zápasu
        matchModalTitle.textContent = 'Upraviť zápas';
        const matchDocRef = doc(matchesCollectionRef, matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
            await showMessage('Informácia', "Zápas sa nenašiel.");
            return;
        }
        const matchData = matchDoc.data();
        await populatePlayingDaysSelect(matchDateSelect, matchData.date);
        // OPRAVA: Použite matchData.location namiesto matchData.date
        await populateSportHallSelects(matchLocationSelect, matchData.location);
        matchStartTimeInput.value = matchData.startTime || '';
        matchDurationInput.value = matchData.duration || '';
        matchBufferTimeInput.value = matchData.bufferTime || '';
        await populateCategorySelect(matchCategorySelect, matchData.categoryId);
        if (matchData.categoryId) {
            await populateGroupSelect(matchData.categoryId, matchGroupSelect, matchData.groupId);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }

        // Ak je skupina vybraná, odblokujte polia tímov, inak ich zablokujte
        if (matchGroupSelect.value) {
            team1NumberInput.disabled = false;
            team2NumberInput.disabled = false;
        } else {
            team1NumberInput.disabled = true;
            team2NumberInput.disabled = true;
        }

        team1NumberInput.value = matchData.team1Number || '';
        team2NumberInput.value = matchData.team2Number || '';

        // Ak sú poskytnuté novéDátum/novéMiesto (z drag & drop), prepíšu sa
        if (prefillDate && prefillLocation) {
            await populatePlayingDaysSelect(matchDateSelect, prefillDate);
            await populateSportHallSelects(matchLocationSelect, prefillLocation);
            matchStartTimeInput.value = prefillStartTime; // Použite prefillStartTime, ak je k dispozícii
            // Nepovolávajte findFirstAvailableTime, ak je poskytnutý prefillStartTime
        }

    } else { // Pridanie nového zápasu
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        // Uistite sa, že prechádzate vybranými prvkami na vyplnenie funkcií
        await populatePlayingDaysSelect(matchDateSelect, prefillDate); 
        await populateSportHallSelects(matchLocationSelect, prefillLocation);
        
        if (matchGroupSelect) {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }
        
        // Zablokujte a vymažte polia tímov pre nový zápas
        team1NumberInput.value = '';
        team1NumberInput.disabled = true;
        team2NumberInput.value = '';
        team2NumberInput.disabled = true;

        // Nastavte predvolené hodnoty pre trvanie a rezervu pre nový zápas
        // Tieto hodnoty budú použité findFirstAvailableTime
        let defaultDuration = 60; // Predvolené trvanie
        let defaultBufferTime = 5; // Predvolená rezerva
        
        // Pokúste sa načítať predvolené nastavenia z prvej kategórie, ak existuje
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            const categorySettings = data.categoryMatchSettings;
            if (categorySettings) {
                const firstCategoryIdWithSettings = Object.keys(categorySettings)[0];
                if (firstCategoryIdWithSettings) {
                    defaultDuration = categorySettings[firstCategoryIdWithSettings].duration || defaultDuration;
                    defaultBufferTime = categorySettings[firstCategoryIdWithSettings].bufferTime || defaultBufferTime;
                }
            }
        }
        matchDurationInput.value = defaultDuration;
        matchBufferTimeInput.value = defaultBufferTime;
        
        // Získajte čas začiatku po poslednom zápase alebo počiatočný čas dňa
        await findFirstAvailableTime();
    }
    openModal(matchModal);
}

/**
 * Otvorí modálne okno na správu voľného/zablokovaného slotu.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
 * @param {string} startTime Čas začiatku slotu (HH:MM).
 * @param {string} endTime Čas konca slotu (HH:MM).
 * @param {string} blockedSlotId ID zablokovaného slotu. Teraz vždy existuje.
*/
async function openFreeSlotModal(date, location, startTime, endTime, blockedSlotId) {
    // Debugging logs
    console.log(`openFreeSlotModal: Volané pre Dátum: ${date}, Miesto: ${location}, Čas: ${startTime}-${endTime}, ID slotu: ${blockedSlotId}`);

    // Získajte referencie na elementy vo vnútri funkcie, aby ste zabezpečili ich dostupnosť
    const freeSlotModal = document.getElementById('freeSlotModal');
    const freeSlotModalTitle = document.getElementById('freeSlotModalTitle');
    const freeSlotDateDisplay = document.getElementById('freeSlotDateDisplay');
    const freeSlotLocationDisplay = document.getElementById('freeSlotLocationDisplay');
    const freeSlotTimeRangeDisplay = document.getElementById('freeSlotTimeRangeDisplay');
    const freeSlotIdInput = document.getElementById('freeSlotId');
    
    // Získanie referencií na tlačidlá priamo z DOM
    const blockButton = document.getElementById('blockFreeSlotButton'); 
    const unblockButton = document.getElementById('unblockFreeSlotButton'); 
    const deleteButton = document.getElementById('phantomSlotDeleteButton'); 

    // Vyčistite všetky predchádzajúce poslucháče udalostí pre všetky tlačidlá
    if (blockButton && blockButton._currentHandler) {
        blockButton.removeEventListener('click', blockButton._currentHandler);
        delete blockButton._currentHandler;
        console.log("openFreeSlotModal: Odstránený starý posluchovač pre 'blockButton'.");
    }
    if (unblockButton && unblockButton._currentHandler) {
        unblockButton.removeEventListener('click', unblockButton._currentHandler);
        delete unblockButton._currentHandler;
        console.log("openFreeSlotModal: Odstránený starý posluchovač pre 'unblockButton'.");
    }
    if (deleteButton && deleteButton._currentHandler) { 
        deleteButton.removeEventListener('click', deleteButton._currentHandler);
        delete deleteButton._currentHandler;
        console.log("openFreeSlotModal: Odstránený starý posluchovač pre 'deleteButton'.");
    }


    // Nastaví ID slotu vo skrytom poli formulára
    freeSlotIdInput.value = blockedSlotId; 
    
    // Formátovanie dátumu na DD. MM. RRRR
    const dateObj = new Date(date);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;

    // Zobrazí informácie o slote
    freeSlotDateDisplay.textContent = formattedDate; // Použite formátovaný dátum
    freeSlotLocationDisplay.textContent = location;
    freeSlotTimeRangeDisplay.textContent = `${startTime} - ${endTime}`;

    // Reset štýlov a zobrazenia tlačidiel na začiatku
    if (blockButton) blockButton.style.display = 'none';
    if (unblockButton) {
        unblockButton.style.display = 'none';
        unblockButton.classList.remove('delete-button'); 
    }
    if (deleteButton) { 
        deleteButton.style.display = 'none';
        deleteButton.classList.remove('delete-button');
    }

    let isUserBlockedFromDB = false;

    // Ak existuje blockedSlotId a nie je to "generované" ID, skontrolujte typ slotu v DB
    if (blockedSlotId && !blockedSlotId.startsWith('generated-slot-')) {
        try {
            const blockedSlotDoc = await getDoc(doc(blockedSlotsCollectionRef, blockedSlotId));
            if (blockedSlotDoc.exists()) {
                const data = blockedSlotDoc.data();
                isUserBlockedFromDB = data.isBlocked === true;
                console.log(`openFreeSlotModal: Načítané dáta pre blockedSlotId=${blockedSlotId}: isBlocked=${isUserBlockedFromDB}`);
            } else {
                console.warn(`openFreeSlotModal: Dokument blockedSlotId=${blockedSlotId} neexistuje (už bol odstránený?). Považujem za placeholder.`);
                isUserBlockedFromDB = false; // Ak sa nenájde, považujte ho za placeholder
            }
        } catch (error) {
            console.error(`openFreeSlotModal: Chyba pri načítaní dokumentu pre blockedSlotId=${blockedSlotId}:`, error);
            isUserBlockedFromDB = false; // Predpokladáme neblokovaný stav pri chybe
        }
    } else {
        // Ak je to generované ID, je to automaticky placeholder
        isUserBlockedFromDB = false;
        console.log(`openFreeSlotModal: Zistilo sa generované ID slotu (${blockedSlotId}). Považujem za placeholder.`);
    }

    // Logika zobrazenia tlačidiel a titulku na základe typu slotu
    if (isUserBlockedFromDB) {
        // Normálny zablokovaný interval (blokovaný používateľom)
        freeSlotModalTitle.textContent = 'Upraviť zablokovaný slot';
        console.log("openFreeSlotModal: Typ slotu: Normálny zablokovaný slot (blokovaný používateľom).");
        
        if (blockButton) blockButton.style.display = 'none'; // Už zablokovaný

        if (unblockButton) {
            unblockButton.style.display = 'inline-block';
            unblockButton.textContent = 'Odblokovať'; // Zmení isBlocked na false
            unblockButton.classList.remove('delete-button'); 
            const unblockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Odblokovať' pre zablokovaný interval ID: ${blockedSlotId}. Spúšťam unblockBlockedSlot.`);
                unblockBlockedSlot(blockedSlotId, date, location);
            };
            unblockButton.addEventListener('click', unblockHandler);
            unblockButton._currentHandler = unblockHandler;
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Odblokovať'.");
        }
        if (deleteButton) { 
            deleteButton.style.display = 'inline-block';
            deleteButton.textContent = 'Vymazať slot'; // Úplne vymaže používateľom zablokovaný slot z DB
            deleteButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať slot' pre zablokovaný interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deleteButton.addEventListener('click', deleteHandler); 
            deleteButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Vymazať slot'.");
        }

    } else { // Je to placeholder prázdny slot (isBlocked === false)
        freeSlotModalTitle.textContent = 'Spravovať voľný interval'; // Neutrálnejší názov
        console.log("openFreeSlotModal: Typ slotu: Placeholder voľný interval ('Voľný slot dostupný').");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať'; // Zmení isBlocked na true
            const reblockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Zablokovať' (znovu zablokovať) pre odblokovaný interval ID: ${blockedSlotId}. Spúšťam blockFreeSlot.`);
                blockFreeSlot(blockedSlotId, date, location, startTime, endTime); // Pass startTime, endTime
            };
            blockButton.addEventListener('click', reblockHandler);
            blockButton._currentHandler = reblockHandler;
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Zablokovať' pre placeholder slot.");
        }

        if (deleteButton) { 
            deleteButton.style.display = 'inline-block';
            deleteButton.textContent = 'Vymazať slot'; // Úplne vymaže placeholder slot z DB
            deleteButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať slot' pre placeholder interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deleteButton.addEventListener('click', deleteHandler); 
            deleteButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Vymazať slot' pre placeholder slot.");
        }
        if (unblockButton) { unblockButton.style.display = 'none'; } 
    }

    openModal(freeSlotModal); // Otvorí modálne okno
    console.log("openFreeSlotModal: Modálne okno otvorené.");
}


/**
 * Zablokuje voľný slot (zmení isBlocked na true alebo vytvorí nový, ak je to placeholder).
 * @param {string} slotId ID slotu na zablokovanie (môže byť aj generované ID placeholderu).
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
 * @param {string} startTime Čas začiatku slotu (HH:MM).
 * @param {string} endTime Čas konca slotu (HH:MM).
*/
async function blockFreeSlot(slotId, date, location, startTime, endTime) {
    console.log(`blockFreeSlot: === FUNKCIA ZABLOKOVAŤ VOĽNÝ INTERVAL SPUSTENÁ ===`);
    console.log(`blockFreeSlot: ID slotu: ${slotId}, Dátum: ${date}, Miesto: ${location}, Začiatok: ${startTime}, Koniec: ${endTime}`);
    const freeSlotModal = document.getElementById('freeSlotModal'); 
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete tento voľný interval zablokovať?');
    console.log(`blockFreeSlot: Potvrdenie prijaté: ${confirmed}`);

    if (confirmed) {
        try {
            const isNewPlaceholder = slotId.startsWith('generated-slot-');
            let slotDataToSave = {
                date: date,
                location: location,
                startTime: startTime,
                endTime: endTime,
                isBlocked: true,
                startInMinutes: (parseInt(startTime.split(':')[0]) * 60) + parseInt(startTime.split(':')[1]),
                endInMinutes: (parseInt(endTime.split(':')[0]) * 60) + parseInt(endTime.split(':')[1]),
                createdAt: new Date()
            };

            // Pred zablokovaním skontrolujte prekrývanie s existujúcimi zápasmi
            const startInMinutes = slotDataToSave.startInMinutes;
            const endInMinutes = slotDataToSave.endInMinutes;

            const matchesQuery = query(
                matchesCollectionRef,
                where("date", "==", date),
                where("location", "==", location)
            );
            const matchesSnapshot = await getDocs(matchesQuery);
            const overlappingMatch = matchesSnapshot.docs.find(matchDoc => {
                const matchData = matchDoc.data();
                const [matchStartH, matchStartM] = matchData.startTime.split(':').map(Number);
                const matchStartInMinutes = matchStartH * 60 + matchStartM;
                const matchDuration = Number(matchData.duration) || 0; 
                const matchBufferTime = Number(matchData.bufferTime) || 0; 
                const matchFootprintEndInMinutes = matchStartInMinutes + matchDuration + matchBufferTime; 
                return (startInMinutes < matchFootprintEndInMinutes && endInMinutes > matchStartInMinutes);
            });

            if (overlappingMatch) {
                const formatTime = (minutes) => {
                    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
                    const m = String(minutes % 60).padStart(2, '0');
                    return `${h}:${m}`;
                };
                const matchStartTime = overlappingMatch.data().startTime;
                const matchDuration = Number(overlappingMatch.data().duration) || 0; 
                const matchBufferTime = Number(overlappingMatch.data().bufferTime) || 0; 
                const [msh,msm] = matchStartTime.split(':').map(Number);
                const matchFootprintEndInMinutes = (msh * 60) + msm + matchDuration + matchBufferTime;
                const formattedMatchEndTime = formatTime(matchFootprintEndInMinutes);

                await showMessage('Chyba', `Slot nemožno zablokovať, pretože sa prekrýva s existujúcim zápasom od ${matchStartTime} do ${formattedMatchEndTime}. Najprv presuňte alebo vymažte tento zápas.`);
                return;
            }

            if (isNewPlaceholder) {
                // Pridajte nový dokument do kolekcie
                console.log(`blockFreeSlot: Pridávam nový zablokovaný slot:`, slotDataToSave);
                await addDoc(blockedSlotsCollectionRef, slotDataToSave);
            } else {
                // Aktualizujte existujúci dokument
                const slotRef = doc(blockedSlotsCollectionRef, slotId);
                console.log(`blockFreeSlot: Aktualizujem existujúci slot ID: ${slotId} na isBlocked: true`);
                // Odstráňte originalMatchId, ak existuje, pre existujúce sloty
                if (slotDataToSave.originalMatchId) {
                    slotDataToSave.originalMatchId = deleteField();
                }
                await setDoc(slotRef, slotDataToSave, { merge: true }); // Použite setDoc pre merge
            }
            
            await showMessage('Úspech', 'Slot bol úspešne zablokovaný!');
            closeModal(freeSlotModal);
            console.log("blockFreeSlot: Modálne okno zatvorené.");
            await recalculateAndSaveScheduleForDateAndLocation(date, location); // Prepočíta rozvrh
            console.log("blockFreeSlot: Prepočet rozvrhu dokončený.");
        } catch (error) {
            console.error("Chyba pri zablokovaní slotu:", error);
            await showMessage('Chyba', `Chyba pri zablokovaní slotu: ${error.message}`);
        }
    }
}

/**
 * Odblokuje existujúci zablokovaný interval (zmení isBlocked na false).
 * @param {string} slotId ID slotu na odblokovanie.
 * @param {string} date Dátum slotu.
 * @param {string} string Miesto slotu.
*/
async function unblockBlockedSlot(slotId, date, location) {
    console.log(`unblockBlockedSlot: === FUNKCIA ODBLOKOVAŤ INTERVAL SPUSTENÁ ===`);
    console.log(`unblockBlockedSlot: ID slotu: ${slotId}, Dátum: ${date}, Miesto: ${location}`);
    const freeSlotModal = document.getElementById('freeSlotModal'); 
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete odblokovať tento slot? Zápasy sa môžu teraz naplánovať do tohto času.');
    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, slotId);
            console.log(`unblockBlockedSlot: Pokúšam sa aktualizovať interval ID: ${slotId} na isBlocked: false`);
            await setDoc(slotRef, { isBlocked: false, originalMatchId: deleteField() }, { merge: true }); // Odblokovať
            console.log(`unblockBlockedSlot: Interval ID: ${slotId} úspešne odblokovaný.`);
            await showMessage('Úspech', 'Slot bol úspešne odblokovaný!');
            closeModal(freeSlotModal);
            await recalculateAndSaveScheduleForDateAndLocation(date, location); 
            console.log("unblockBlockedSlot: Zobrazenie rozvrhu obnovené a prepočítané.");
        }
        catch (error) {
            console.error("Chyba pri odblokovaní slotu:", error);
            await showMessage('Chyba', `Chyba pri odblokovaní slotu: ${error.message}`);
        }
    }
}

/**
 * Odstráni (vymaže) interval a prepočíta rozvrh.
 * @param {string} slotId ID slotu na vymazanie. Teraz vždy existuje.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
*/
async function handleDeleteSlot(slotId, date, location) {
    console.log(`handleDeleteSlot: === SPUŠTENÁ FUNKCIA NA SPRACovanie VYMAZANIA SLOTU ===`);
    console.log(`handleDeleteSlot: ID slotu: ${slotId}, Dátum: ${date}, Miesto: ${location}`);
    const freeSlotModal = document.getElementById('freeSlotModal');

    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento interval?');
    if (!confirmed) {
        console.log(`handleDeleteSlot: Vymazanie zrušené používateľom.`);
        return;
    }

    try {
        const isGeneratedPlaceholder = slotId.startsWith('generated-slot-');
        let wasPlaceholder = false;

        if (!isGeneratedPlaceholder) {
            const slotDocRef = doc(blockedSlotsCollectionRef, slotId);
            // Získajte dáta slotu pred vymazaním, aby ste zistili, či to bol placeholder
            const slotDoc = await getDoc(slotDocRef);
            if (slotDoc.exists()) {
                wasPlaceholder = (slotDoc.data().isBlocked === false);
                const batch = writeBatch(db); 
                console.log(`handleDeleteSlot: Pokúšam sa vymazať dokument blockedSlot ID: ${slotId}`);
                batch.delete(slotDocRef);
                await batch.commit();
                console.log("handleDeleteSlot: Batch commit successful.");
            } else {
                console.log(`handleDeleteSlot: Slot s ID ${slotId} sa v databáze nenašiel (už mohol byť vymazaný).`);
                // Treat as if it was a placeholder that was "deleted" (i.e., not persisted)
                wasPlaceholder = true; 
            }
        } else {
            console.log(`handleDeleteSlot: Slot s generovaným ID ${slotId} nie je v databáze, nie je potrebné ho vymazať.`);
            wasPlaceholder = true; // It's a placeholder that was never persisted, so effectively "deleted" from view
        }
        
        await showMessage('Úspech', 'Slot bol úspešne vymazaný z databázy!');
        closeModal(freeSlotModal);
        
        // Po akomkoľvek vymazaní alebo posunutí prepočítajte rozvrh, aby sa správne prekreslil
        // Odovzdávame ID vymazaného slotu a informáciu, či to bol placeholder
        await recalculateAndSaveScheduleForDateAndLocation(
            date, 
            location, 
            slotId, // excludedBlockedSlotId
            null, null, null, null, null, // movedMatch original/new details (not relevant here)
            wasPlaceholder // NEW: Indicate if deleted slot was a placeholder
        );
        console.log("handleDeleteSlot: Prepočet rozvrhu dokončený.");

    } catch (error) {
        console.error("handleDeleteSlot: Chyba pri odstraňovaní/posúvaní slotu:", error);
        await showMessage('Chyba', `Chyba pri odstraňovaní/posúvaní slotu: ${error.message}`);
    }
}


// ODSTRÁNENÁ FUNKCIA: cleanupTrailingBlockedSlotsOnLoad()
// Dôvod: Logika čistenia dynamických slotov je teraz plne integrovaná
// do recalculateAndSaveScheduleForDateAndLocation (Fáza 1a).


document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Získajte všetky referencie na DOM elementy vo vnútri poslucháča DOMContentLoaded
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions');
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addPlaceButton = document.getElementById('addPlaceButton');
    const addMatchButton = document.getElementById('addMatchButton');

    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect'); 
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');


    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    const placeModal = document.getElementById('placeModal');
    const closePlaceModalButton = document.getElementById('closePlaceModal');
    const placeForm = document.getElementById('placeForm'); 
    const placeIdInput = document.getElementById('placeId');
    const placeTypeSelect = document.getElementById('placeTypeSelect');
    const placeNameInput = document.getElementById('placeName');
    const placeAddressInput = document.getElementById('placeAddress');
    const googleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

    const freeSlotModal = document.getElementById('freeSlotModal');
    const closeFreeSlotModalButton = document.getElementById('closeFreeSlotModal');
    // Priame referencie na blockFreeSlotButton a unblockFreeSlotButton boli odstránené tu,
    // pretože sa budú znovu získavať a znovu priraďovať handlery v rámci openFreeSlotModal


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // Počiatočné zobrazenie rozvrhu po načítaní stránky
    await displayMatchesAsSchedule();

    // Dynamicky pridajte CSS pravidlo pre triedu .show, ak ešte neexistuje
    // Toto zabezpečuje, že rozbaľovacia ponuka bude správne zobrazená.
    if (!document.getElementById('add-options-show-style')) {
        const style = document.createElement('style');
        style.id = 'add-options-show-style';
        style.textContent = `
            .add-options-dropdown.show {
                display: flex !important; /* Ensure it overrides 'display: none' */
            }
        `;
        document.head.appendChild(style);
    }
    console.log("CSS rule for .add-options-dropdown.show injected.");


    // Poslucháči udalostí pre tlačidlo "Pridať" a jeho možnosti
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Zabráňte okamžitému zatvoreniu možností kliknutím na dokument
        addOptions.classList.toggle('show');
        console.log(`addButton clicked. addOptions now has class 'show': ${addOptions.classList.contains('show')}`);
    });

    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
            console.log("Clicked outside addOptions or addButton. addOptions class 'show' removed.");
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
        // Zabezpečte, aby nebol prítomný žiadny starý handler pred otvorením pre pridanie
        if (deletePlayingDayButtonModal && deletePlayingDayButtonModal._currentHandler) { 
            deletePlayingDayButtonModal.removeEventListener('click', deletePlayingDayButtonModal._currentHandler);
            delete deletePlayingDayButtonModal._currentHandler;
        }
        openModal(playingDayModal);
        addOptions.classList.remove('show');
    });

    addPlaceButton.addEventListener('click', () => {
        placeForm.reset();
        placeIdInput.value = '';
        placeTypeSelect.value = '';
        placeNameInput.value = '';
        placeAddressInput.value = '';
        googleMapsUrlInput.value = '';
        deletePlaceButtonModal.style.display = 'none';
        if (deletePlaceButtonModal && deletePlaceButtonModal._currentHandler) { // Check for _currentHandler
            deletePlaceButtonModal.removeEventListener('click', deletePlaceButtonModal._currentHandler);
            delete deletePlaceButtonModal._currentHandler;
        }
        openModal(placeModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        openMatchModal(); // Zavolajte refaktorovanú openMatchModal bez argumentov pre nový zápas
        addOptions.classList.remove('show');
    });

    // Poslucháči udalostí pre zatvorenie modálneho okna
    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule(); // Obnovte rozvrh po zatvorení
    });

    closePlaceModalButton.addEventListener('click', () => {
        closeModal(placeModal);
        displayMatchesAsSchedule(); // Obnovte rozvrh po zatvorení
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule(); // Obnovte rozvrh po zatvorení
    });

    closeFreeSlotModalButton.addEventListener('click', () => {
        closeModal(freeSlotModal);
        displayMatchesAsSchedule(); // Obnovte rozvrh po zatvorení
    });

    // Poslucháči udalostí pre dynamické aktualizácie vo formulári zápasu
    matchCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
            // Resetuj a zablokuj poradové čísla tímov, pretože sa zmenila kategória (a tým aj skupiny)
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.value = '';
            team2NumberInput.disabled = true;
            await updateMatchDurationAndBuffer(); // Aktualizuje trvanie a rezervu
            await findFirstAvailableTime(); // A teraz nájdite čas začiatku na základe nových hodnôt
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.disabled = true;
            matchDurationInput.value = 60; // Reset na predvolené, ak nie je kategória
            matchBufferTimeInput.value = 5; // Reset na predvolené, ak nie je kategória
            matchStartTimeInput.value = ''; // Vymažte čas začiatku, ak nie je vybraná kategória
        }
    });

    matchGroupSelect.addEventListener('change', () => {
        if (matchGroupSelect.value) {
            team1NumberInput.disabled = false;
            team2NumberInput.disabled = false;
            // Voliteľné: Vymažte hodnoty, ak sa zmenila skupina, aby sa predišlo chybnému predvyplneniu
            team1NumberInput.value = ''; 
            team2NumberInput.value = '';
        } else {
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.disabled = true;
        }
    });

    matchDateSelect.addEventListener('change', findFirstAvailableTime);
    matchLocationSelect.addEventListener('change', findFirstAvailableTime);
    matchDurationInput.addEventListener('change', findFirstAvailableTime);
    matchBufferTimeInput.addEventListener('change', findFirstAvailableTime);

    /**
     * Spracuje odoslanie formulára zápasu.
     */
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);
        const matchDate = matchDateSelect.value;
        const matchLocationName = matchLocationSelect.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value);
        const currentMatchId = matchIdInput.value;

        // Základná validácia pre povinné polia
        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocationName || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Prestávka po zápase).');
            return;
        }

        // Overte, či sú tímy rôzne
        if (team1Number === team2Number) {
            await showMessage('Chyba', 'Tím nemôže hrať sám proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
            return;
        }

        // Načítajte kategórie a skupiny raz na začiatku spracovania odoslania pre zobrazované názvy
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name || doc.id));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));

        let team1Result = null;
        let team2Result = null;
        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number, categoriesMap, groupsMap);
            team2Result = await await getTeamName(matchCategory, matchGroup, team2Number, categoriesMap, groupsMap);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }

        // Overte, či boli tímy nájdené
        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            await showMessage('Chyba', 'Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        // Skontrolujte, či už tímy hrali proti sebe v rovnakej kategórii a skupine
        let existingDuplicateMatchId = null; // Uložte ID duplicitného zápasu
        let existingDuplicateMatchDetails = null; // Uložte detaily duplicitného zápasu

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                // Ak sa upravuje existujúci zápas, vylúčte ho z kontroly duplikátov
                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const existingTeam1Number = existingMatch.team1Number;
                const existingTeam2Number = existingMatch.team2Number;

                // Skontrolujte obe možné kombinácie (Tím1 proti Tím2 alebo Tím2 proti Tím1)
                const condition1 = (existingTeam1Number === team1Number && existingTeam2Number === team2Number);
                const condition2 = (existingTeam1Number === team2Number && existingTeam2Number === team1Number);

                if (condition1 || condition2) {
                    existingDuplicateMatchId = existingMatchId;
                    existingDuplicateMatchDetails = existingMatch; // Uložte detaily pre potvrdzovaciu správu
                    return; // Nájdená duplicita zápasu, možno ukončiť cyklus
                }
            });

            if (existingDuplicateMatchId) {
                const dateObj = new Date(existingDuplicateMatchDetails.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                const message = `Tímy ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už proti sebe hrali v kategórii ${categoriesMap.get(matchCategory)} a v skupine ${groupsMap.get(matchGroup)} dňa ${formattedDate} o ${existingDuplicateMatchDetails.startTime}. Želáte si tento zápas vymazať a nahradiť ho novými údajmi?`;

                const confirmedReplace = await showConfirmation('Duplicita zápasu!', message);

                if (!confirmedReplace) {
                    return; // Používateľ sa rozhodol nenahradiť, nechať modálne okno otvorené
                } else {
                    // Používateľ potvrdil, vymazať starý zápas
                    console.log(`Zápas ID: ${existingDuplicateMatchId} označený na vymazanie kvôli duplicitnej kontrole.`);
                    await deleteDoc(doc(matchesCollectionRef, existingDuplicateMatchId));
                    await showMessage('Potvrdenie', `Pôvodný zápas bol vymazaný. Nový zápas bude uložený.`);
                    // Pokračovať v ukladaní nového zápasu nižšie
                }
            }
        } catch (error) {
            console.error("Chyba pri kontrole existujúcich zápasov a spracovaní duplicity:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole, či tímy už hrali proti sebe, alebo pri spracovaní duplicity. Skúste to znova.");
            return;
        }

        // Skontrolujte prekrývanie času na rovnakom mieste a dátume
        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime;

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.startTime.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                // ZMENA: Použite fullFootprintEnd pre kontrolu prekrývania
                const existingMatchFootprintEndInMinutes = existingMatchStartInMinutes + (Number(existingMatch.duration) || 0) + (Number(existingMatch.bufferTime) || 0);

                if (newMatchStartInMinutes < existingMatchFootprintEndInMinutes && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return;
                }
            });

            // Kontrola prekrývania so zablokovanými slotmi (len isBlocked: true)
            const blockedSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName),
                where("isBlocked", "==", true) // Zmena: Len isBlocked === true
            );
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
            blockedSlotsSnapshot.docs.forEach(doc => {
                const blockedSlot = doc.data();
                if (blockedSlot.isBlocked === true) { 
                    const [blockedStartHour, blockedStartMinute] = blockedSlot.startTime.split(':').map(Number);
                    const blockedSlotStartInMinutes = blockedStartHour * 60 + blockedStartMinute;
                    const [blockedEndHour, blockedEndMinute] = blockedSlot.endTime.split(':').map(Number);
                    const blockedSlotEndInMinutes = blockedEndHour * 60 + blockedEndMinute;

                    if (newMatchStartInMinutes < blockedSlotEndInMinutes && newMatchEndInMinutesWithBuffer > blockedSlotStartInMinutes) {
                        overlapFound = true;
                        overlappingMatchDetails = { ...blockedSlot, type: 'blocked_slot' }; // Označte ako zablokovaný slot
                        return;
                    }
                }
            });


            if (overlapFound) {
                let errorMessage = `Zápas sa prekrýva s existujúcim zápasom `;
                if (overlappingMatchDetails.type === 'blocked_slot') {
                    errorMessage += `alebo zablokovaným slotom `;
                }
                
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                // ZMENA: Pre prekrývajúci sa zápas použite fullFootprintEndInMinutes pre správny zobrazený čas
                const existingMatchEndTimeInMinutes = (overlappingMatchDetails.type === 'blocked_slot') 
                    ? (parseInt(overlappingMatchDetails.endTime.split(':')[0]) * 60 + parseInt(overlappingMatchDetails.endTime.split(':')[1]))
                    : (existingStartHour * 60 + existingStartMinute + (Number(overlappingMatchDetails.duration) || 0) + (Number(overlappingMatchDetails.bufferTime) || 0));

                const formattedExistingEndTime = `${String(Math.floor(existingMatchEndTimeInMinutes / 60)).padStart(2, '0')}:${String(existingMatchEndTimeInMinutes % 60).padStart(2, '0')}`;

                errorMessage += `v mieste "${matchLocationName}" dňa ${matchDate}:\n\n` +
                      `Existujúci časový rozsah: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n`;
                if (overlappingMatchDetails.type !== 'blocked_slot') {
                    errorMessage += `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n`;
                } else {
                    errorMessage += `(Zablokovaný slot)\n\n`;
                }
                errorMessage += `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`;
                await showMessage('Chyba', errorMessage);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }

        // Určite typ miesta
        const allPlacesSnapshot = await getDocs(placesCollectionRef);
        const allPlaces = allPlacesSnapshot.docs.map(doc => doc.data());
        const selectedPlaceData = allPlaces.find(p => p.name === matchLocationName && p.type === 'Športová hala');
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala'; // Predvolene na 'Športová hala', ak sa nenájde

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime,
            location: matchLocationName,
            locationType: matchLocationType,
            categoryId: matchCategory,
            categoryName: categoriesMap.get(matchCategory) || matchCategory, // Použite skutočný názov z mapy
            groupId: matchGroup || null,
            groupName: matchGroup ? groupsMap.get(matchGroup).replace(/skupina /gi, '').trim() : null, // Použite skutočný názov z mapy
            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: team1Number,
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,
            team1ClubId: team1Result.clubId,
            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: team2Number,
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,
            team2ClubId: team2Result.clubId,
            createdAt: new Date()
        };

        try {
            if (currentMatchId && !existingDuplicateMatchId) { // Aktualizujte iba vtedy, ak ide o úpravu A nebola to náhrada duplikátu
                console.log(`Ukladám existujúci zápas ID: ${currentMatchId}`, matchData);
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!'); 
            } else { // Toto zahŕňa nové zápasy A prípady, keď bol starý zápas nahradený
                console.log(`Pridávam nový zápas:`, matchData);
                await addDoc(matchesCollectionRef, matchData);
                await showMessage('Úspech', 'Zápas úspešne pridaný!'); 
            }
            closeModal(matchModal);
            // Prepočítajte rozvrh pre danú lokalitu s kontextom nového/aktualizovaného zápasu
            await recalculateAndSaveScheduleForDateAndLocation(matchDate, matchLocationName);
        }
        catch (error) {
            console.error("Chyba pri ukladaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
        }
    });

    /**
     * Spracuje odoslanie formulára miesta.
     */
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('placeId').value;
        const type = document.getElementById('placeTypeSelect').value.trim();
        const name = document.getElementById('placeName').value.trim();
        const address = document.getElementById('placeAddress').value.trim();
        const googleMapsUrl = document.getElementById('placeGoogleMapsUrl').value.trim();

        // Základná validácia
        if (!type || !name || !address || !googleMapsUrl) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }
        // Typ kontroly pre ubytovanie bol odstránený, pretože už nie je podporovaný
        if (type === 'Ubytovanie') {
            await showMessage('Chyba', 'Typ miesta "Ubytovanie" nie je podporovaný. Vyberte "Športová hala" alebo "Stravovacie zariadenie".');
            return;
        }

        try {
            new URL(googleMapsUrl); // Overte formát URL
        } catch (_) {
            await showMessage('Chyba', 'Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

            // Skontrolujte duplicitné miesto (kombinácia názvu a typu)
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessage('Chyba', `Miesto s názvom "${name}" a typom "${type}" už existuje!`);
                return;
            }

            const placeData = {
                type: type,
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            };

            if (id) {
                console.log(`Ukladám existujúce miesto ID: ${id}`, placeData);
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                await showMessage('Úspech', 'Miesto úspešne upravené!');
            } else {
                console.log(`Pridávam nové miesto:`, placeData);
                await addDoc(placesCollectionRef, placeData);
                await showMessage('Úspech', 'Miesto úspešne pridané!');
            }
            closeModal(placeModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní miesta:", error);
            await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
        }
    });

    /**
     * Spracuje odoslanie formulára hracieho dňa.
     */
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('playingDayId').value;
        const date = document.getElementById('playingDayDate').value;

        // Základná validácia
        if (!date) {
            await showMessage('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            // Skontrolujte duplicitný dátum hracieho dňa
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessage('Chyba', 'Hrací deň s týmto dátumom už existuje!');
                return;
            }

            const playingDayData = { date: date };

            if (id) {
                console.log(`Ukladám existujúci hrací deň ID: ${id}`, playingDayData);
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                await showMessage('Úspech', 'Hrací deň úspešne upravený!');
            } else {
                console.log(`Pridávam nový hrací deň:`, playingDayData);
                await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
                await showMessage('Úspech', 'Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri ukladaní hracieho dňa. Detail: ${error.message}`);
        }
    });
});
