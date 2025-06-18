import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
// Priamy import 'collection' a 'deleteField' z firebase-firestore.js
import { collection, deleteField } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';


const SETTINGS_DOC_ID = 'matchTimeSettings';
// Nová referencia na kolekciu pre zablokované sloty
export const blockedSlotsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'blockedSlots');


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

        if (requiredMatchDuration <= 0) {
            matchStartTimeInput.value = ''; 
            console.log("Required Match Duration is 0 or less, clearing start time and returning."); // Debugging
            return;
        }
        const newMatchFullFootprint = requiredMatchDuration + requiredBufferTime;
        console.log("New Match Full Footprint (duration + buffer):", newMatchFullFootprint); // Debugging


        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName),
            orderBy("startTime", "asc")
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
        const matchesForLocationAndDate = existingMatchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const [startH, startM] = data.startTime.split(':').map(Number);
            const startInMinutes = startH * 60 + startM;
            // Explicitne zabezpečte, že duration a bufferTime sú čísla
            const duration = Number(data.duration) || 0;
            const bufferTime = Number(data.bufferTime) || 0;
            const endInMinutes = startInMinutes + duration + bufferTime; 
            return { start: startInMinutes, end: endInMinutes, id: doc.id, duration: duration, bufferTime: bufferTime };
        });
        console.log("Existing Matches for selected Location and Date (sorted by start time):", matchesForLocationAndDate); // Debugging

        // Fetch blocked slots for the selected date and location
        const blockedSlotsQuery = query(
            blockedSlotsCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName),
            orderBy("startTime", "asc")
        );
        const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
        const blockedSlotsForLocationAndDate = blockedSlotsSnapshot.docs.map(doc => {
            const data = doc.data();
            const [startH, endM] = data.startTime.split(':').map(Number);
            const startInMinutes = startH * 60 + endM;
            const [endH, startM] = data.endTime.split(':').map(Number);
            const endInMinutes = endH * 60 + startM;
            return { start: startInMinutes, end: endInMinutes, id: doc.id, ...data };
        }).filter(slot => slot.isBlocked === true || slot.isPhantom === true); // Only consider truly blocked slots or phantoms as obstacles
        console.log("Blocked Slots for selected Location and Date (filtered for isBlocked === true or isPhantom === true):", blockedSlotsForLocationAndDate); // Debugging


        let exactMatchDurationFound = false;
        let bestCandidateStartTimeInMinutes = -1;

        // Function to check if a time slot overlaps with any existing match or *active* blocked slot
        const isSlotAvailable = (candidateStart, candidateEnd) => {
            // Check against existing matches
            for (const match of matchesForLocationAndDate) {
                if (candidateStart < match.end && candidateEnd > match.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with existing match ${match.start}-${match.end}`); // Debugging
                    return false; // Overlaps with an existing match
                }
            }
            // Check against active blocked slots (isBlocked === true or isPhantom === true)
            for (const blockedSlot of blockedSlotsForLocationAndDate) { // This array is already filtered
                if (candidateStart < blockedSlot.end && candidateEnd > blockedSlot.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with active blocked slot ${blockedSlot.start}-${blockedSlot.end}`); // Debugging
                    return false; // Overlaps with an active blocked slot
                }
            }
            return true;
        };

        // --- Krok 1: Uprednostnite presné prispôsobenie pre 'requiredMatchDuration' (samotný zápas) ---
        // Skontrolujte medzeru pred prvým zápasom (ak existuje) alebo ak nie sú žiadne zápasy
        if (matchesForLocationAndDate.length === 0) {
            // Ak nie sú žiadne existujúce zápasy, počiatočný čas dňa je prvý dostupný.
            // Skontrolujte, či je tento slot dostupný (nie je zablokovaný)
            if (isSlotAvailable(initialPointerMinutes, initialPointerMinutes + newMatchFullFootprint)) {
                bestCandidateStartTimeInMinutes = initialPointerMinutes;
                exactMatchDurationFound = true; 
                console.log("Žiadne existujúce zápasy. Nastavujem čas začiatku na počiatočný čas dňa ako kandidáta na presné prispôsobenie (dostupný)."); // Debugging
            } else {
                console.log("Žiadne existujúce zápasy, ale počiatočný slot je zablokovaný."); // Debugging
            }
        } else {
            const firstMatch = matchesForLocationAndDate[0];
            const gapBeforeFirstMatchDuration = firstMatch.start - initialPointerMinutes;
            console.log("Medzera pred prvým zápasom: Trvanie =", gapBeforeFirstMatchDuration, "minút."); // Debugging

            // Skontrolujte, či táto medzera dokáže presne prispôsobiť požadované trvanie zápasu
            if (gapBeforeFirstMatchDuration >= requiredMatchDuration) {
                // A uistite sa, že sa rezerva tiež zmestí pred prvý skutočný zápas a nie je zablokovaný
                const candidateStartTime = initialPointerMinutes;
                const candidateEndTime = candidateStartTime + newMatchFullFootprint;
                if (candidateEndTime <= firstMatch.start && isSlotAvailable(candidateStartTime, candidateEndTime)) {
                    bestCandidateStartTimeInMinutes = candidateStartTime;
                    exactMatchDurationFound = true;
                    console.log("Našiel som presné prispôsobenie pre trvanie zápasu pred prvým zápasom:", bestCandidateStartTimeInMinutes); // Debugging
                }
            }
        }
        
        // Hľadajte presné prispôsobenie v medzerách medzi existujúcimi zápasmi
        if (!exactMatchDurationFound) { 
            console.log("Hľadám presné prispôsobenie pre trvanie zápasu medzi existujúcimi zápasmi."); // Debugging
            for (let i = 0; i < matchesForLocationAndDate.length - 1; i++) {
                const currentMatch = matchesForLocationAndDate[i];
                const nextMatch = matchesForLocationAndDate[i + 1];

                const gapStartInMinutes = currentMatch.end; // Koniec aktuálneho zápasu (vrátane jeho rezervy)
                const gapDuration = nextMatch.start - gapStartInMinutes; // Trvanie samotnej medzery
                console.log(`Kontrola medzery medzi zápasom ${currentMatch.id} (končí ${currentMatch.end}) a ${nextMatch.id} (začína ${nextMatch.start}): Trvanie = ${gapDuration}`); // Debugging

                // Skontrolujte, či táto medzera dokáže presne prispôsobiť požadované trvanie zápasu
                if (gapDuration >= requiredMatchDuration) {
                    // A uistite sa, že sa rezerva tiež zmestí pred ďalší skutočný zápas a nie je zablokovaný
                    const candidateStartTime = gapStartInMinutes;
                    const candidateEndTime = candidateStartTime + newMatchFullFootprint;
                    if (candidateEndTime <= nextMatch.start && isSlotAvailable(candidateStartTime, candidateEndTime)) {
                        bestCandidateStartTimeInMinutes = candidateStartTime;
                        exactMatchDurationFound = true;
                        console.log("Našiel som presné prispôsobenie pre trvanie zápasu medzi zápasmi:", bestCandidateStartTimeInMinutes); // Debugging
                        break; // Našiel sa prvý presný prispôsobenie, ukončite cyklus
                    }
                }
            }
        }
        
        if (exactMatchDurationFound && bestCandidateStartTimeInMinutes !== -1) {
            const formattedHour = String(Math.floor(bestCandidateStartTimeInMinutes / 60)).padStart(2, '0');
            const formattedMinute = String(bestCandidateStartTimeInMinutes % 60).padStart(2, '0');
            matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
            console.log("Nastavený čas začiatku zápasu na presné prispôsobenie (Priorita 1):", matchStartTimeInput.value); // Debugging
        } else {
            // --- Krok 2: Náhradné umiestnenie po poslednom zápase, ak sa nenájde presné prispôsobenie ---
            let nextAvailableTimeInMinutes = initialPointerMinutes; // Default to initial day start time
            if (matchesForLocationAndDate.length > 0) {
                const lastMatch = matchesForLocationAndDate[matchesForLocationAndDate.length - 1];
                console.log("Fallback: Posledný existujúci zápas:", lastMatch); // Debugging
                // Calculate time after the last match, and convert to minutes for checks
                const lastMatchEndTimeInMinutes = lastMatch.end; // This already includes its duration + bufferTime

                // Find the first available time *after* the last match, skipping any blocked slots
                let potentialStartTime = lastMatchEndTimeInMinutes;
                let foundNextAvailable = false;
                // Loop up to 24:00 (1440 minutes) to find the next available slot
                while (potentialStartTime < 1440) { 
                    const candidateEndTime = potentialStartTime + newMatchFullFootprint;
                    if (isSlotAvailable(potentialStartTime, candidateEndTime)) {
                        nextAvailableTimeInMinutes = potentialStartTime;
                        foundNextAvailable = true;
                        break;
                    }
                    // Move to the next minute if current slot is blocked or occupied
                    potentialStartTime++; 
                }

                if (!foundNextAvailable) {
                    // If no available slot is found until end of day, revert to initial day start for the field
                    // (though this means the user might need to pick a different day/location)
                    nextAvailableTimeInMinutes = initialPointerMinutes; 
                    console.log("No available time after last match, reverting to initial day start."); // Debugging
                }

            } else { // No existing matches, just check if initial time is available
                if (!isSlotAvailable(initialPointerMinutes, initialPointerMinutes + newMatchFullFootprint)) {
                    // If initial slot is blocked and no matches, no automatic time can be set
                    nextAvailableTimeInMinutes = -1; // Indicate no available time
                    console.log("No existing matches, and initial day start slot is blocked."); // Debugging
                }
            }

            if (nextAvailableTimeInMinutes === -1) {
                matchStartTimeInput.value = '';
                await showMessage('Informácia', 'Na vybranom mieste a dátume nie sú k dispozícii žiadne voľné sloty na vloženie zápasu, dokonca ani po poslednom zápase alebo od začiatku dňa.');
            } else {
                const formattedHour = String(Math.floor(nextAvailableTimeInMinutes / 60)).padStart(2, '0');
                const formattedMinute = String(nextAvailableTimeInMinutes % 60).padStart(2, '0');
                matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                console.log("Nenašlo sa presné prispôsobenie. Nastavujem čas začiatku zápasu na náhradný (po poslednom zápase alebo začiatku dňa):", matchStartTimeInput.value); // Debugging
            }
        }

    } catch (error) {
        console.error("Chyba pri hľadaní prvého dostupného času:", error);
        matchStartTimeInput.value = '';
    }
}


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
        const shortDisplayName = `${shortGroupName}${teamNumber}`; // Zobrazovaný názov bez kategórie

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
 * Prepočítava a preplánuje zápasy a manažuje všetky typy slotov (zápasy, zablokované, fantómové, voľné placeholdery)
 * pre konkrétny dátum a miesto.
 * Zabezpečuje, že zápasy sa posúvajú dopredu, aby vyplnili medzery, pričom rešpektuje používateľom zablokované sloty.
 *
 * @param {string} date Dátum, pre ktorý sa má prepočítať rozvrh.
 * @param {string} location Miesto, pre ktoré sa má prepočítať rozvrh.
 * @param {string|null} [triggeringMatchId=null] ID zápasu, ktorý vyvolal prepočet (napr. presunutý zápas). Ak je zadaný, použije sa na inteligentné posúvanie.
 * @param {string|null} [targetStartTime=null] Nový čas začiatku `triggeringMatchId`. Používa sa s `triggeringMatchId` na definovanie bodu vloženia.
 * @param {string|null} [excludedBlockedSlotId=null] ID zablokovaného slotu, ktorý sa má explicitne vylúčiť z výpočtov (napr. ten, ktorý bol cieľom presunu a je vymazaný).
 * @param {boolean} [wasDeletedFreePlaceholder=false] True, ak bol excludedBlockedSlotId práve vymazaný voľný placeholder.
 * @param {string|null} [deletedPlaceholderStartTime=null] Čas začiatku vymazaného voľného placeholderu.
 * @param {string|null} [deletedPlaceholderEndTime=null] Čas konca vymazaného voľného placeholderu.
 * @param {object|null} [originalMatchTimeRange=null] Objekt s `date`, `location`, `start` a `end` (v minútach) pôvodného časového rozsahu presunutého zápasu. Používa sa na vytvorenie fantómového slotu.
 */
async function recalculateAndSaveScheduleForDateAndLocation(date, location, triggeringMatchId = null, targetStartTime = null, excludedBlockedSlotId = null, wasDeletedFreePlaceholder = false, deletedPlaceholderStartTime = null, deletedPlaceholderEndTime = null, originalMatchTimeRange = null) {
    console.log(`recalculateAndSaveScheduleForDateAndLocation: Spustené pre Dátum: ${date}, Miesto: ${location}. ` +
                `Triggering Match ID: ${triggeringMatchId}, Target Start Time: ${targetStartTime}, Excluded Blocked Slot ID: ${excludedBlockedSlotId}. ` +
                `Was Deleted Free Placeholder: ${wasDeletedFreePlaceholder}, Deleted Placeholder Time: ${deletedPlaceholderStartTime}-${deletedPlaceholderEndTime}.` +
                `Original Match Time Range: ${originalMatchTimeRange ? `[${originalMatchTimeRange.start}-${originalMatchTimeRange.end}]` : 'null'}`);
    try {
        const batch1 = writeBatch(db); // Batch pre vyčistenie dynamických slotov

        // Fáza 1: Vyčistite staré dynamické sloty
        // 1a. Vymažte VŠETKY dynamické sloty (placeholdery), KTORÉ NIE SÚ POUŽÍVATEĽOM ZABLOKOVANÉ (isBlocked: true).
        // To znamená, že vymažeme AJ fantómové sloty, aj bežné "Voľný slot dostupný" placeholdery.
        // Následne ich (alebo fantóm) pridáme späť v Fáze 2, ak sú potrebné.
        const allDynamicSlotsToCleanupQuery = query(
            blockedSlotsCollectionRef,
            where("date", "==", date),
            where("location", "==", location),
            where("isBlocked", "==", false) // Targeting all non-user-blocked slots (free placeholders and phantoms)
        );
        const allDynamicSlotsToCleanupSnapshot = await getDocs(allDynamicSlotsToCleanupQuery);
        allDynamicSlotsToCleanupSnapshot.docs.forEach(docToDelete => {
            // Only delete if it's not the target blocked slot that was just used and will be explicitly handled
            if (docToDelete.id !== excludedBlockedSlotId) { // excludedBlockedSlotId is the ID of the TARGET slot if a match was dropped on it
                batch1.delete(doc(blockedSlotsCollectionRef, docToDelete.id));
                console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Pridané do batchu na vymazanie starého dynamického slotu (vrátane fantómov) ID: ${docToDelete.id}`);
            } else {
                console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Preskočené vymazanie excludedBlockedSlotId: ${excludedBlockedSlotId} (už ho tam nemá byť).`);
            }
        });
        
        // Commit this cleanup first. This ensures a clean slate before attempting to re-add.
        await batch1.commit();
        console.log("recalculateAndSaveScheduleForDateAndLocation (Fáza 1a): Prvý batch commit úspešný (agresívne vyčistenie dynamických slotov).");

        // Now, proceed with fetching matches and user-blocked slots (which were NOT deleted)
        const matchesQuery = query(matchesCollectionRef, where("date", "==", date), where("location", "==", location));
        const matchesSnapshot = await getDocs(matchesQuery);
        let currentMatches = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'match',
            docRef: doc.ref,
            ...doc.data(),
            startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])),
            endInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])) + (Number(doc.data().duration) || 0) + (Number(doc.data().bufferTime) || 0)
        }));

        const blockedSlotsQuery = query(blockedSlotsCollectionRef, where("date", "==", date), where("location", "==", location));
        const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
        // After aggressive cleanup, allBlockedSlots should now only contain user-blocked slots
        let allBlockedSlots = blockedSlotsSnapshot.docs
            .map(doc => ({
                id: doc.id,
                type: 'blocked_slot',
                isBlocked: doc.data().isBlocked === true,
                isPhantom: doc.data().isPhantom === true, // Will be false for all after cleanup from above
                ...doc.data(),
                startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])),
                endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60 + parseInt(doc.data().endTime.split(':')[1]))
            }))
            .filter(slot => slot.id !== excludedBlockedSlotId && slot.isBlocked === true); // Filtered for only user-blocked here
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Načítané a filtrované allBlockedSlots (len zablokované používateľom po vyčistení dynamických slotov):`, allBlockedSlots.map(e => ({id: e.id, isBlocked: e.isBlocked, isPhantom: e.isPhantom})));


        let eventsForTimeline = [];
        let movedMatch = null;

        if (triggeringMatchId && targetStartTime) {
            const targetStartMinutes = (parseInt(targetStartTime.split(':')[0]) * 60 + parseInt(targetStartTime.split(':')[1]));
            const originalMovedMatchIndex = currentMatches.findIndex(m => m.id === triggeringMatchId);
            if (originalMovedMatchIndex !== -1) {
                movedMatch = { ...currentMatches[originalMovedMatchIndex], startTime: targetStartTime, startInMinutes: targetStartMinutes, endInMinutes: targetStartMinutes + (Number(currentMatches[originalMovedMatchIndex].duration) || 0) + (Number(currentMatches[originalMovedMatchIndex].bufferTime) || 0) };
                
                // Remove the moved match from currentMatches so it's only handled as 'movedMatch'
                currentMatches.splice(originalMovedMatchIndex, 1);
            }
        }

        // Zlúčte všetky udalosti do jednej timeline (matches a user-blocked slots)
        eventsForTimeline.push(...currentMatches);
        eventsForTimeline.push(...allBlockedSlots); // Only user-blocked slots
        if (movedMatch) {
            eventsForTimeline.push(movedMatch); // Add the moved match to the timeline for shifting
        }

        eventsForTimeline.sort((a, b) => a.startInMinutes - b.startInMinutes);
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Zoradené udalosti pre časovú os (vrátane presunutého zápasu na novom mieste):`, JSON.stringify(eventsForTimeline.map(e => ({id: e.id, type: e.type, startInMinutes: e.startInMinutes, isBlocked: e.isBlocked}))));

        const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(date);
        let currentTimePointer = initialScheduleStartMinutes;
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Počiatočný ukazovateľ času pre posun: ${currentTimePointer} minút.`);

        const batch2 = writeBatch(db); // Batch for match updates

        for (const event of eventsForTimeline) {
            let proposedStartTimeInMinutes;
            if (event.type === 'match' && event.id === triggeringMatchId && movedMatch) {
                // Toto je presunutý zápas, použite jeho cieľový čas, ale uistite sa, že nezačína pred currentTimePointer
                proposedStartTimeInMinutes = Math.max(currentTimePointer, movedMatch.startInMinutes);
            } else if (event.type === 'match') {
                // Ostatné zápasy sa posúvajú, aby vyplnili medzery
                proposedStartTimeInMinutes = currentTimePointer;
            } else { // Zablokované sloty sú "pevné"
                proposedStartTimeInMinutes = Math.max(currentTimePointer, event.startInMinutes);
            }

            const proposedStartTimeStr = `${String(Math.floor(proposedStartTimeInMinutes / 60)).padStart(2, '0')}:${String(proposedStartTimeInMinutes % 60).padStart(2, '0')}`;
            
            if (event.type === 'match') {
                if (event.startTime !== proposedStartTimeStr) {
                    batch2.update(event.docRef, { startTime: proposedStartTimeStr });
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Aktualizujem zápas ${event.id} z ${event.startTime} na ${proposedStartTimeStr}`);
                }
                currentTimePointer = proposedStartTimeInMinutes + (Number(event.duration) || 0) + (Number(event.bufferTime) || 0);
            } else { // Zablokované sloty
                currentTimePointer = proposedStartTimeInMinutes + (event.endInMinutes - event.startInMinutes); // Dĺžka blokovaného slotu
                console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Spracovaný pevný bod ${event.id} (typ: ${event.type}). currentTimePointer posunutý na ${currentTimePointer}`);
            }
        }
        
        await batch2.commit(); // Commit the second batch (match updates)
        console.log("recalculateAndSaveScheduleForDateAndLocation (Fáza 1): Druhý batch commit úspešný (posun zápasov).");


        // Fáza 2: Generovanie placeholderov a fantómov
        const batch3 = writeBatch(db); // Nový batch pre pridanie placeholderov a fantómov

        // Re-fetch all events to get their final, shifted positions.
        const allMatchesForFinalTimeline = (await getDocs(query(matchesCollectionRef, where("date", "==", date), where("location", "==", location)))).docs.map(doc => ({
            id: doc.id,
            type: 'match',
            ...doc.data(),
            startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])),
            endInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])) + (Number(doc.data().duration) || 0) + (Number(doc.data().bufferTime) || 0)
        }));

        const allUserBlockedSlotsForFinalTimeline = (await getDocs(query(blockedSlotsCollectionRef, where("date", "==", date), where("location", "==", location), where("isBlocked", "==", true)))).docs
            .map(doc => ({
                id: doc.id,
                type: 'blocked_slot',
                isBlocked: true,
                isPhantom: false, // User-blocked cannot be phantom, by definition
                ...doc.data(),
                startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60 + parseInt(doc.data().startTime.split(':')[1])),
                endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60 + parseInt(doc.data().endTime.split(':')[1]))
            }));

        let finalTimelineEventsForGapDetection = [
            ...allMatchesForFinalTimeline,
            ...allUserBlockedSlotsForFinalTimeline
        ];

        finalTimelineEventsForGapDetection.sort((a, b) => a.startInMinutes - b.startInMinutes);
        console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 2): Pevné udalosti timeline pre generovanie medzier (len zápasy a používateľom zablokované sloty):`, JSON.stringify(finalTimelineEventsForGapDetection.map(e => ({id: e.id, type: e.type, startInMinutes: e.startInMinutes, isBlocked: e.isBlocked}))));

        currentTimePointer = initialScheduleStartMinutes;
        
        // Special handling for the phantom slot: create it ONLY if a match was moved from this date/location
        // Ensure originalMatchTimeRange is not null before accessing its properties
        if (triggeringMatchId && originalMatchTimeRange && originalMatchTimeRange.date === date && originalMatchTimeRange.location === location) {
             const phantomSlotData = {
                date: originalMatchTimeRange.date,
                location: originalMatchTimeRange.location,
                startTime: `${String(Math.floor(originalMatchTimeRange.start / 60)).padStart(2, '0')}:${String(originalMatchTimeRange.start % 60).padStart(2, '0')}`,
                endTime: `${String(Math.floor(originalMatchTimeRange.end / 60)).padStart(2, '0')}:${String(originalMatchTimeRange.end % 60).padStart(2, '0')}`,
                startInMinutes: originalMatchTimeRange.start,
                endInMinutes: originalMatchTimeRange.end,
                isBlocked: false,
                isPhantom: true,
                createdAt: new Date(),
                originalMatchId: triggeringMatchId // Reference to the moved match
            };
            batch3.set(doc(blockedSlotsCollectionRef), phantomSlotData); // Add to the third batch
            console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 2): Pridané do batchu na Vytvorenie fantómového slotu na pôvodnom mieste zápasu ${triggeringMatchId}:`, phantomSlotData);
        }

        for (const event of finalTimelineEventsForGapDetection) {
            if (currentTimePointer < event.startInMinutes) {
                const potentialGapStart = currentTimePointer;
                const potentialGapEnd = event.startInMinutes;

                // Check if this gap is *fully covered* by the original match's time range (where the phantom slot should be)
                let isGapCoveredByExistingPhantom = false;
                // Ensure originalMatchTimeRange is not null before accessing its properties
                if (triggeringMatchId && originalMatchTimeRange && originalMatchTimeRange.date === date && originalMatchTimeRange.location === location) {
                     // If the potential gap falls within or exactly matches the phantom slot's range, it's covered by the phantom.
                     if (potentialGapStart >= originalMatchTimeRange.start && potentialGapEnd <= originalMatchTimeRange.end) {
                         isGapCoveredByExistingPhantom = true;
                     }
                }

                if (!isGapCoveredByExistingPhantom) { // Only create a free placeholder if it's NOT covered by a phantom
                    const newPlaceholderData = {
                        date: date,
                        location: location,
                        startTime: `${String(Math.floor(potentialGapStart / 60)).padStart(2, '0')}:${String(potentialGapStart % 60).padStart(2, '0')}`,
                        endTime: `${String(Math.floor(potentialGapEnd / 60)).padStart(2, '0')}:${String(potentialGapEnd % 60).padStart(2, '0')}`,
                        startInMinutes: potentialGapStart,
                        endInMinutes: potentialGapEnd,
                        isBlocked: false,
                        isPhantom: false,
                        createdAt: new Date()
                    };
                    batch3.set(doc(blockedSlotsCollectionRef), newPlaceholderData);
                    console.log(`recalculateAndSaveScheduleForDateAndLocation (Fáza 2): Vytvorený placeholder: Čas: ${newPlaceholderData.startTime}-${newPlaceholderData.endTime}`);
                } else {
                    console.log(`Fáza 2: Medzera [${potentialGapStart}-${potentialGapEnd}] JE pokrytá existujúcim fantómom. Preskakujem vytvorenie placeholderu.`);
                }
            }
            currentTimePointer = Math.max(currentTimePointer, event.endInMinutes);
        }
        
        // Final commit for new placeholders and the phantom slot
        await batch3.commit();
        console.log("recalculateAndSaveScheduleForDateAndLocation (Fáza 2): Tretí batch commit úspešný (nové placeholdery a fantóm).");

        await displayMatchesAsSchedule(); // Obnovte zobrazenie
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
 * Prepočítava a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * pričom rešpektuje zablokované sloty a zachováva relatívne poradie presunutých zápasov.
 * @param {string} draggedMatchId ID presunutého zápasu.
 * @param {string} targetDate Dátum cieľového miesta.
 * @param {string} targetLocation Miesto cieľového miesta (názov).
 * @param {string|null} [droppedProposedStartTime=null] HH:MM string pre navrhovaný čas začiatku presunutého zápasu, alebo null pre pripojenie na koniec.
 * @param {string|null} [targetBlockedSlotId=null] ID zablokovaného slotu, na ktorý sa presúva (môže byť aj placeholder).
*/
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedProposedStartTime = null, targetBlockedSlotId = null) {
    console.log(`moveAndRescheduleMatch: Spustené pre zápas ID: ${draggedMatchId}, cieľ: ${targetDate}, ${targetLocation}, navrhovaný čas: ${droppedProposedStartTime}, cieľový zablokovaný slot ID: ${targetBlockedSlotId}`);
    try {
        // Capture original date/location/time range of the dragged match
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
        const originalStartTime = draggedMatchData.startTime;
        const originalDuration = Number(draggedMatchData.duration) || 0;
        const originalBufferTime = Number(draggedMatchData.bufferTime) || 0;

        const [originalStartH, originalStartM] = originalStartTime.split(':').map(Number);
        const originalStartInMinutes = originalStartH * 60 + originalStartM;
        const originalEndInMinutes = originalStartInMinutes + originalDuration + originalBufferTime;
        
        // Now, before committing anything, get the target blocked slot data if it exists.
        let targetBlockedSlotDocData = null;
        if (targetBlockedSlotId) {
            const targetDoc = await getDoc(doc(blockedSlotsCollectionRef, targetBlockedSlotId));
            if (targetDoc.exists()) {
                targetBlockedSlotDocData = targetDoc.data();
            }
        }

        const batch = writeBatch(db);

        // If a target blocked slot was used, delete it.
        if (targetBlockedSlotId && targetBlockedSlotDocData) {
            batch.delete(doc(blockedSlotsCollectionRef, targetBlockedSlotId));
            console.log(`moveAndRescheduleMatch: Pridané do batchu na vymazanie cieľového zablokovaného slotu (ID: ${targetBlockedSlotId}).`);
        }

        // Update the dragged match's document with new location/time
        const updatedMatchData = {
            ...draggedMatchData,
            date: targetDate,
            location: targetLocation,
            startTime: droppedProposedStartTime
        };
        batch.set(draggedMatchDocRef, updatedMatchData, { merge: true });
        console.log(`moveAndRescheduleMatch: Pridané do batchu na aktualizáciu/opätovné vloženie zápasu: ${draggedMatchId} s novými dátami:`, updatedMatchData);

        await batch.commit(); // Commit these two operations first.
        console.log("moveAndRescheduleMatch: Batch commit úspešný pre presun zápasu a vymazanie cieľového slotu.");

        // Now, call recalculateAndSaveScheduleForDateAndLocation
        // For original location: pass originalMatchTimeRange and triggeringMatchId
        // Only pass originalMatchTimeRange if the match was actually moved FROM this date/location.
        const originalMatchTimeRangeForRecalculation = (originalDate === date && originalLocation === location) ? 
            { date: originalDate, location: originalLocation, start: originalStartInMinutes, end: originalEndInMinutes } : null;

        await recalculateAndSaveScheduleForDateAndLocation(
            originalDate, 
            originalLocation, 
            draggedMatchId, // The match that was moved
            originalStartTime, // Its original start time (relevant for phantom creation context)
            null, // No excluded blocked slot for original location recalculation in this call
            false, 
            null,
            null,
            originalMatchTimeRangeForRecalculation // Pass original time range for phantom creation
        );
        console.log(`moveAndRescheduleMatch: Prepočítanie pre pôvodnú lokáciu (${originalDate}, ${originalLocation}) dokončené.`);

        if (originalDate !== targetDate || originalLocation !== targetLocation) {
            // For target location: pass the match that was moved and its new time
            await recalculateAndSaveScheduleForDateAndLocation(
                targetDate, 
                targetLocation, 
                draggedMatchId, // The match that was moved
                droppedProposedStartTime, // Its new start time
                targetBlockedSlotId, // Exclude the now-deleted target slot from initial cleanup (though it's already deleted)
                targetBlockedSlotDocData && (!targetBlockedSlotDocData.isBlocked && !targetBlockedSlotDocData.isPhantom), // Was it a free placeholder?
                targetBlockedSlotDocData ? targetBlockedSlotDocData.startTime : null,
                targetBlockedSlotDocData ? targetBlockedSlotDocData.endTime : null,
                null // No original match time range for the target location
            );
            console.log(`moveAndRescheduleMatch: Prepočítanie pre cieľovú lokáciu (${targetDate}, ${targetLocation}) dokončené.`);
        } else {
            // If moved within the same location, only one recalculation needed.
            // The first call covers it all.
            console.log(`moveAndRescheduleMatch: Presunuté v rámci rovnakej lokality, jedno prepočítanie pokrýva.`)
        }

        await showMessage('Úspech', 'Zápas úspešne presunutý a rozvrh prepočítaný!');
        closeModal(document.getElementById('messageModal'));
    } catch (error) {
        console.error("moveAndRescheduleMatch: Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule();
    }
}


/**
 * Helper to generate a comparable display string for an event row.
 * @param {object} event The event object (match or blocked slot).
 * @param {object} allSettings All global settings, including categoryMatchSettings.
 * @param {Map<string, string>} categoryColorsMap Map of category IDs to colors.
 * @returns {string} A string representation of the event's displayed content.
 */
function getEventDisplayString(event, allSettings, categoryColorsMap) {
    if (event.type === 'match') {
        const matchDuration = event.duration || (allSettings.categoryMatchSettings?.[event.categoryId]?.duration || 60);
        // Note: displayedMatchEndTimeInMinutes should NOT include buffer time for display purposes
        const displayedMatchEndTimeInMinutes = (parseInt(event.startTime.split(':')[0]) * 60 + parseInt(event.startTime.split(':')[1])) + matchDuration;
        const formattedDisplayedEndTime = `${String(Math.floor(displayedMatchEndTimeInMinutes / 60)).padStart(2, '0')}:${String(displayedMatchEndTimeInMinutes % 60).padStart(2, '0')}`;
        
        // This string represents the visible text content of a match row
        return `${event.startTime} - ${formattedDisplayedEndTime}|${event.team1ClubName || 'N/A'}|${event.team2ClubName || 'N/A'}|${event.team1ShortDisplayName || 'N/A'}|${event.team2ShortDisplayName || 'N/A'}`;
    } else if (event.type === 'blocked_slot') {
        const blockedSlotStartHour = String(Math.floor(event.startInMinutes / 60)).padStart(2, '0');
        const blockedSlotStartMinute = String(event.startInMinutes % 60).padStart(2, '0');
        const blockedSlotEndHour = String(Math.floor(event.endInMinutes / 60)).padStart(2, '0');
        const blockedSlotEndMinute = String(event.endInMinutes % 60).padStart(2, '0');

        let displayText = '';
        if (event.isBlocked === true) {
            displayText = 'Zablokovaný slot';
        } else if (event.isPhantom === true) {
            // For phantom slots, the time range is part of the display text, so include it for uniqueness
            displayText = `Slot po presunutom zápase`; 
        } else {
            // This is the "Voľný slot dostupný" placeholder
            displayText = 'Voľný slot dostupný';
        }
        // Include time range for comparison for all blocked slot types
        return `${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}|${displayText}`;
    }
    return '';
}


/**
 * Zobrazí kompletný rozvrh zápasov.
*/
async function displayMatchesAsSchedule() {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    matchesContainer.innerHTML = '';
    matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam zoznam zápasov...</p>');
    console.log('displayMatchesAsSchedule: Spustené.');

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

        const blockedSlotsSnapshot = await getDocs(query(blockedSlotsCollectionRef));
        const allBlockedSlots = blockedSlotsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            type: 'blocked_slot',
            isPhantom: doc.data().isPhantom === true, // Pridajte tento riadok pre zachytenie príznaku isPhantom
            isBlocked: doc.data().isBlocked === true, // NOVÉ: Pridajte tento riadok pre zachytenie príznaku isBlocked
            ...doc.data(),
            startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60) + parseInt(doc.data().startTime.split(':')[1]),
            endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60) + parseInt(doc.data().endTime.split(':')[1])
        }));
        console.log("displayMatchesAsSchedule: Načítané zablokované sloty:", JSON.stringify(allBlockedSlots.map(s => ({id: s.id, date: s.date, location: s.location, startTime: s.startTime, endTime: s.endTime, isPhantom: s.isPhantom, isBlocked: s.isBlocked}))));


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
            scheduleHtml += '<p>Žiadne športové haly na zobrazenie. Pridajte nové miesta typu "Športová hala" pomocou tlačidla "+".</p>';
        } else {
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
                    scheduleHtml += `<p style="margin: 20px; text-align: center; color: #888;">Žiadne hracie dni boli definované.</p>`;
                } else {
                    for (const date of allPlayingDayDates) { // Iterujte cez VŠETKY hracie dni
                        const matchesForDateAndLocation = groupedMatches.get(location) ? groupedMatches.get(location).get(date) || [] : [];
                        
                        // Získajte zablokované sloty pre aktuálny dátum a miesto
                        const blockedSlotsForDateAndLocation = allBlockedSlots.filter(bs => bs.date === date && bs.location === location);

                        const displayDateObj = new Date(date);
                        const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                        const dayName = displayDateObj.toLocaleDateString('sk-SK', { weekday: 'long' });

                        // Zlúčte zápasy a VŠETKY typy zablokovaných slotov pre renderovanie.
                        const currentEventsForRendering = [
                            ...matchesForDateAndLocation.map(m => ({
                                ...m,
                                type: 'match',
                                startInMinutes: (parseInt(m.startTime.split(':')[0]) * 60 + parseInt(m.startTime.split(':')[1])),
                                endInMinutes: (parseInt(m.startTime.split(':')[0]) * 60 + parseInt(m.startTime.split(':')[1])) + (m.duration || (allSettings.categoryMatchSettings?.[m.categoryId]?.duration || 60)) + (m.bufferTime || (allSettings.categoryMatchSettings?.[m.categoryId]?.bufferTime || 5))
                            })),
                            // Zahrňte VŠETKY zablokované sloty (blokované používateľom, fantómové a placeholdery) pre renderovanie
                            ...blockedSlotsForDateAndLocation 
                        ];
                        currentEventsForRendering.sort((a, b) => a.startInMinutes - b.startInMinutes);
                        console.log(`displayMatchesAsSchedule: Udalosti pre render pre ${location} na ${date} (zoradené):`, JSON.stringify(currentEventsForRendering.map(e => ({id: e.id, type: e.type, startTime: e.startTime || e.startInMinutes, endTime: e.endTime || e.endInMinutes, isPhantom: e.isPhantom, isBlocked: e.isBlocked}))));

                        // NOVINKA: Proces pre odstránenie po sebe idúcich identických záznamov
                        const finalEventsToRender = [];
                        let lastEventDisplayString = null;

                        for (const event of currentEventsForRendering) {
                            const currentEventDisplayString = getEventDisplayString(event, allSettings, categoryColorsMap); 
                            
                            // Pridajte udalosť len ak jej zobrazovací reťazec je odlišný od predchádzajúceho,
                            // alebo ak ide o prvú udalosť, A NESMIE BYŤ TRAILING FREE/PHANTOM SLOT.
                            // Tu je kľúčová zmena: filter pre koncové "Voľné sloty" a "Fantómové sloty"
                            const isTrailingFreeOrPhantom = (
                                event.type === 'blocked_slot' &&
                                (event.isBlocked === false || event.isPhantom === true) && // This includes phantoms and regular free slots
                                // Kontrola, či je to posledná udalosť pre tento deň/miesto
                                // Ak je to posledná udalosť a je to voľný/fantómový slot, preskoč ju.
                                currentEventsForRendering.indexOf(event) === currentEventsForRendering.length -1
                            );


                            if (isTrailingFreeOrPhantom) {
                                console.log(`displayMatchesAsSchedule: Preskakujem koncový voľný/fantómový slot: ${currentEventDisplayString}`);
                                continue; 
                            }
                            
                            // Pridajte udalosť len ak jej zobrazovací reťazec je odlišný od predchádzajúceho,
                            // alebo ak ide o prvú udalosť.
                            if (currentEventDisplayString !== lastEventDisplayString) {
                                finalEventsToRender.push(event);
                                lastEventDisplayString = currentEventDisplayString;
                            } else {
                                console.log(`displayMatchesAsSchedule: Preskakujem duplicitný po sebe idúci riadok pre zobrazenie: ${currentEventDisplayString}`);
                            }
                        }
                        console.log(`displayMatchesAsSchedule: FinalEventsToRender (po odstránení duplicitných po sebe idúcich riadkov a koncových voľných/fantómových):`, JSON.stringify(finalEventsToRender.map(e => ({id: e.id, type: e.type, startTime: e.startTime || e.startInMinutes, endTime: e.endTime || e.endInMinutes, isPhantom: e.isPhantom, isBlocked: e.isBlocked}))));


                        // Použite funkciu getInitialScheduleStartMinutes na určenie správneho počiatočného času začiatku.
                        const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(date); 
                        let currentTimePointerInMinutes = initialScheduleStartMinutes;
                        let contentAddedForThisDate = false;
                        
                        scheduleHtml += `<div class="date-group" data-date="${date}" data-location="${location}" data-initial-start-time="${String(Math.floor(initialScheduleStartMinutes / 60)).padStart(2, '0')}:${String(initialScheduleStartMinutes % 60).padStart(2, '0')}" style="margin: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">`;
                        scheduleHtml += `<h3 style="background-color: #eaeaea; padding: 15px; margin: 0; border-bottom: 1px solid #ddd;">${dayName} ${formattedDisplayDate}</h3>`;

                        scheduleHtml += `<table class="data-table match-list-table compact-table" style="width: 100%; border-collapse: collapse;">`;
                        scheduleHtml += `<thead><tr>`;
                        scheduleHtml += `<th>Čas</th>`;
                        scheduleHtml += `<th>Domáci</th>`;
                        scheduleHtml += `<th>Hostia</th>`;
                        scheduleHtml += `<th>ID Domáci</th>`;
                        scheduleHtml += `<th>ID Hostia</th></tr></thead><tbody>`;


                        for (const event of finalEventsToRender) { // Iterujeme cez finalEventsToRender
                            // Aktuálna udalosť
                            if (event.type === 'match') {
                                const match = event;
                                // Vypočítajte endTime na základe match.duration (ak je prítomné) alebo nastavení kategórie
                                const matchDuration = match.duration || (allSettings.categoryMatchSettings?.[match.categoryId]?.duration || 60);
                                // Zobrazovaný čas konca by NEMAL zahŕňať časovú rezervu.
                                const displayedMatchEndTimeInMinutes = (parseInt(match.startTime.split(':')[0]) * 60 + parseInt(match.startTime.split(':')[1])) + matchDuration;
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
                                    <tr draggable="true" data-id="${match.id}" class="match-row" data-start-time="${match.startTime}" data-duration="${match.duration}" data-buffer-time="${match.bufferTime}">
                                        <td>${match.startTime} - ${formattedDisplayedEndTime}</td>
                                        <td style="${textAlignStyle}">${match.team1ClubName || 'N/A'}</td>
                                        <td style="${textAlignStyle}">${match.team2ClubName || 'N/A'}</td>
                                        <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team1ShortDisplayName || 'N/A'}</td>
                                        <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team2ShortDisplayName || 'N/A'}</td>
                                    </tr>
                                `;
                            } else if (event.type === 'blocked_slot') {
                                const blockedSlot = event;
                                const blockedSlotStartHour = String(Math.floor(blockedSlot.startInMinutes / 60)).padStart(2, '0');
                                const blockedSlotStartMinute = String(blockedSlot.startInMinutes % 60).padStart(2, '0');
                                const blockedSlotEndHour = String(Math.floor(blockedSlot.endInMinutes / 60)).padStart(2, '0');
                                const blockedSlotEndMinute = String(blockedSlot.endInMinutes % 60).padStart(2, '0');
                                
                                const isUserBlocked = blockedSlot.isBlocked === true; 
                                const isPhantom = blockedSlot.isPhantom === true;

                                let rowClass = '';
                                let cellStyle = '';
                                let displayText = '';
                                let dataAttributes = '';

                                if (isUserBlocked) { 
                                    rowClass = 'blocked-slot-row'; 
                                    cellStyle = 'text-align: center; color: white; background-color: #dc3545; font-style: italic;';
                                    displayText = 'Zablokovaný slot';
                                    dataAttributes = `data-is-blocked="true" data-is-phantom="${isPhantom}"`;
                                } else if (isPhantom) { // isBlocked === false && isPhantom === true
                                    rowClass = 'empty-slot-row phantom-slot-row'; // Štýl pre fantómy inak, ak je potrebné
                                    cellStyle = 'text-align: center; color: #888; font-style: italic; border: 1px dashed #ffa000;'; // Príklad: prerušovaný oranžový okraj
                                    displayText = `Slot po presunutom zápase`; 
                                    dataAttributes = `data-is-blocked="false" data-is-phantom="true"`;
                                } else { // isBlocked === false && isPhantom === false (nový perzistentný placeholder alebo pôvodný presunutý slot)
                                    // Toto je placeholder "Voľný slot dostupný"
                                    rowClass = 'empty-slot-row free-slot-available-row'; // NOVÁ TRIEDA pre všetky perzistentné prázdne sloty
                                    cellStyle = 'text-align: center; color: #888; font-style: italic; background-color: #f0f0f0;'; 
                                    displayText = 'Voľný slot dostupný'; // Toto je teraz vždy záznam v DB
                                    dataAttributes = `data-is-blocked="false" data-is-phantom="false"`; 
                                }

                                console.log(`displayMatchesAsSchedule: Vykresľujem zablokovaný slot: ID ${blockedSlot.id}, Čas: ${blockedSlotStartHour}:${blockedSlotStartMinute}-${blockedSlotEndHour}:${blockedSlot.endMinute}, Miesto: ${blockedSlot.location}, Dátum: ${blockedSlot.date}, isPhantom: ${blockedSlot.isPhantom}, isBlocked: ${isUserBlocked}`);

                                scheduleHtml += `
                                    <tr class="${rowClass}" data-id="${blockedSlot.id}" data-date="${date}" data-location="${location}" data-start-time="${blockedSlotStartHour}:${blockedSlotStartMinute}" data-end-time="${blockedSlotEndHour}:${blockedSlotEndMinute}" ${dataAttributes}>
                                        <td>${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}</td>
                                        <td colspan="4" style="${cellStyle}">${displayText}</td>
                                    </tr>
                                `;
                            }
                            contentAddedForThisDate = true;
                            // Posuňte ukazovateľ za skutočný čas konca aktuálnej udalosti (vrátane jej rezervy pre zápasy)
                            currentTimePointerInMinutes = Math.max(currentTimePointerInMinutes, event.endInMinutes);
                        }
                        
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
        matchesContainer.querySelectorAll('.empty-slot-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
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
                const targetBlockedSlotId = event.currentTarget.dataset.id; // Teraz má vždy ID

                console.log(`Presunutý zápas ${draggedMatchId} na prázdny slot. Nový dátum: ${newDate}, nové miesto: ${newLocation}, navrhovaný čas začiatku: ${droppedProposedStartTime}. ID cieľového zablokovaného slotu: ${targetBlockedSlotId}`);
                await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime, targetBlockedSlotId); // Pošlite ID
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

        // Pridajte poslucháčov dragover a drop pre divy skupiny dátumov (obsahujúce tabuľky)
        matchesContainer.querySelectorAll('.date-group').forEach(dateGroupDiv => {
            dateGroupDiv.addEventListener('dragover', (event) => {
                event.preventDefault(); // Kľúčové pre povolenie umiestnenia
                event.dataTransfer.dropEffect = 'move';
                
                // Vizuálna spätná väzba pre bod vloženia (napr. orámovanie)
                const targetRow = event.target.closest('tr');
                if (targetRow && !targetRow.classList.contains('blocked-slot-row')) {
                    // Ak je nad platným riadkom (zápas alebo prázdny), zvýraznite riadok
                    targetRow.classList.add('drop-over-row');
                } else if (targetRow && targetRow.classList.contains('blocked-slot-row')) {
                    // Ak je nad zablokovaným riadkom, označte, že drop nie je povolený
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

                if (draggedMatchId) {
                    // Ak sa presunie na zablokovaný slot, zamedzte presunu
                    if (targetRow && targetRow.classList.contains('blocked-slot-row')) {
                        console.log(`Pokus o presun zápasu ${draggedMatchId} na zablokovaný slot. Presun ZAMITNUTÝ.`);
                        await showMessage('Upozornenie', 'Tento časový interval je zablokovaný. Zápas naň nie je možné presunúť.');
                        return; // Zastaviť drop operáciu
                    }

                    // Logika určenia miesta vloženia
                    if (targetRow && (targetRow.classList.contains('match-row') || targetRow.classList.contains('empty-slot-row'))) {
                        // Vždy použiť čas začiatku cieľového riadku pre vloženie
                        droppedProposedStartTime = targetRow.dataset.startTime;
                        // Ak je to prázdny slot, získajte jeho ID pre vymazanie
                        if (targetRow.classList.contains('empty-slot-row') && targetRow.dataset.id) {
                            targetBlockedSlotId = targetRow.dataset.id;
                            console.log(`Cieľový prázdny slot ID: ${targetBlockedSlotId} (vkladanie pred alebo do neho).`);
                        }
                        console.log(`Presunuté na riadok. Navrhovaný čas začiatku: ${droppedProposedStartTime}`);
                    } else {
                        // Ak sa presunie na pozadie dateGroupDiv (nebol zacielený žiadny konkrétny riadok)
                        // Vyhľadajte najbližší voľný slot na začiatku dňa
                        const initialStartTime = dateGroupDiv.dataset.initialStartTime;
                        const initialStartTimeMinutes = (parseInt(initialStartTime.split(':')[0]) * 60) + parseInt(initialStartTime.split(':')[1]);
                        
                        // Načítajte všetky sloty pre tento dátum a miesto
                        const allSlotsQuery = query(
                            blockedSlotsCollectionRef,
                            where("date", "==", newDate),
                            where("location", "==", newLocation),
                            orderBy("startInMinutes", "asc")
                        );
                        const allSlotsSnapshot = await getDocs(allSlotsQuery);
                        const allSlots = allSlotsSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));

                        // Nájdite prvý voľný slot (placeholder) na začiatku rozvrhu
                        const firstFreeSlot = allSlots.find(slot => 
                            slot.isBlocked === false && 
                            slot.isPhantom === false &&
                            slot.startInMinutes === initialStartTimeMinutes // Musí začínať na začiatku dňa
                        );

                        if (firstFreeSlot) {
                            droppedProposedStartTime = firstFreeSlot.startTime;
                            targetBlockedSlotId = firstFreeSlot.id;
                            console.log(`Presunuté na pozadie (na začiatok dňa), cieľový počiatočný prázdny slot s ID: ${targetBlockedSlotId}.`);
                        } else {
                            // Ak neexistuje počiatočný placeholder, použite initialStartTime, ale bez targetBlockedSlotId
                            droppedProposedStartTime = initialStartTime;
                            targetBlockedSlotId = null; // Dôležité: Ak sa nevkladá do existujúceho slotu, tento musí byť null
                            console.log("Žiadny počiatočný placeholder prázdneho slotu na zacielenie, vkladanie na počiatočný čas začiatku dňa.");
                        }
                    }

                    console.log(`Pokus o presun a preplánovanie zápasu ${draggedMatchId} na Dátum: ${newDate}, Miesto: ${newLocation}, Navrhovaný čas začiatku: ${droppedProposedStartTime}, ID cieľového zablokovaného slotu: ${targetBlockedSlotId}`);
                    await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime, targetBlockedSlotId);
                }
            });
        });


        // Nasledujúce poslucháči udalostí pre hlavičky dátumu a miesta by mali stále fungovať koncepčne,
        // ale ich ciele kliknutia môžu vyžadovať úpravu, ak sa štruktúra HTML pre hlavičky výrazne zmení.
        // Zatiaľ ich nechávam tak, ako sú, za predpokladu, že stále existujú klikateľné prvky, ktoré ich reprezentujú.
        // Ak sa stanú nadbytočnými alebo problematickými s novým rozložením, môžu byť odstránené alebo upravené.
        matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => {
            header.addEventListener('click', (event) => {
                if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                    return;
                }
                if (event.target === header || event.target.closest('.schedule-date-header-content')) {
                    const dateToEdit = header.dataset.date;
                    editPlayingDay(dateToEdit);
                }
            });
        });
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
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
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
                delete deletePlayingDayButtonModal._currentHandler; 
            }
            const handler = () => deletePlayingDay(playingDayData.date);
            deletePlayingDayButtonModal.addEventListener('click', handler);
            deletePlayingDayButtonModal._currentHandler = handler; 
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
                delete deletePlaceButtonModal._currentHandler; 
            }
            const handler = () => deletePlace(placeData.name, placeData.type);
            deletePlaceButtonModal.addEventListener('click', handler);
            deletePlaceButtonModal._currentHandler = handler; 
            openModal(placeModal);
        } else {
            await showMessage('Informácia', "Miesto sa nenašlo.");
        }
    } catch (error) {
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
    // Získajte referencie na DOM elementy vo vnútri funkcie
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
    const matchForm = document.getElementById('matchForm'); 

    // Reset formulára a ID zápasu
    matchForm.reset(); 
    matchIdInput.value = matchId || ''; 
    deleteMatchButtonModal.style.display = matchId ? 'inline-block' : 'none'; 

    // Odstránenie predošlého poslucháča, aby sa predišlo viacnásobným priradeniam
    if (deleteMatchButtonModal && deleteMatchButtonModal._currentHandler) {
        deleteMatchButtonModal.removeEventListener('click', deleteMatchButtonModal._currentHandler);
        delete deleteMatchButtonModal._currentHandler; 
    }
    
    // Pridanie event listeneru pre tlačidlo deleteMatchButtonModal
    if (matchId) {
        const handler = () => deleteMatch(matchId);
        deleteMatchButtonModal.addEventListener('click', handler);
        deleteMatchButtonModal._currentHandler = handler; 
    } else {
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
            matchStartTimeInput.value = prefillStartTime; 
        }

    } else { // Pridanie nového zápasu
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
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
        let defaultDuration = 60; 
        let defaultBufferTime = 5; 
        
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
    // Zobrazí informácie o slote
    freeSlotDateDisplay.textContent = date;
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

    let isPhantom = false;
    let isUserBlockedFromDB = false;

    // Ak existuje blockedSlotId, skontroluje typ slotu
    try {
        const blockedSlotDoc = await getDoc(doc(blockedSlotsCollectionRef, blockedSlotId));
        if (blockedSlotDoc.exists()) {
            const data = blockedSlotDoc.data();
            isPhantom = data.isPhantom === true;
            isUserBlockedFromDB = data.isBlocked === true;
            console.log(`openFreeSlotModal: Načítané dáta pre blockedSlotId=${blockedSlotId}: isPhantom=${isPhantom}, isBlocked=${isUserBlockedFromDB}`);
        } else {
            console.warn(`openFreeSlotModal: Dokument blockedSlotId=${blockedSlotId} neexistuje (už bol odstránený?).`);
            // Náhradné riešenie: Ak sa nenájde, považujte ho za placeholder na účely zobrazenia
            isPhantom = false;
            isUserBlockedFromDB = false;
        }
    } catch (error) {
        console.error(`openFreeSlotModal: Chyba pri načítaní dokumentu pre blockedSlotId=${blockedSlotId}:`, error);
        // Predpokladáme neblokovaný, nefantómový stav pri chybe
        isPhantom = false;
        isUserBlockedFromDB = false;
    }


    // Logika zobrazenia tlačidiel a titulku na základe typu slotu
    if (isPhantom) {
        // Fantómový interval (zápas bol presunutý v rámci rovnakej haly/dňa a zanechal za sebou tento záznam v DB)
        freeSlotModalTitle.textContent = 'Spravovať presunutý slot'; 
        console.log("openFreeSlotModal: Typ slotu: Fantómový slot (dočasný).");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať'; 
            const blockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Zablokovať' pre fantómový interval ID: ${blockedSlotId}. Spúšťam convertToRegularBlockedSlot.`);
                convertToRegularBlockedSlot(blockedSlotId, date, location);
            };
            blockButton.addEventListener('click', blockHandler);
            blockButton._currentHandler = blockHandler; 
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Zablokovať' pre fantómový slot.");
        }

        if (deleteButton) { 
            deleteButton.style.display = 'inline-block';
            deleteButton.textContent = 'Vymazať'; 
            deleteButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať' pre fantómový interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deleteButton.addEventListener('click', deleteHandler); 
            deleteButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Vymazať' pre fantómový slot.");
        }
        if (unblockButton) { unblockButton.style.display = 'none'; } 

    } else if (isUserBlockedFromDB) {
        // Normálny zablokovaný interval (blokovaný používateľom)
        freeSlotModalTitle.textContent = 'Upraviť zablokovaný slot';
        console.log("openFreeSlotModal: Typ slotu: Normálny zablokovaný slot (blokovaný používateľom).");
        
        if (blockButton) blockButton.style.display = 'none'; 

        if (unblockButton) {
            unblockButton.style.display = 'inline-block';
            unblockButton.textContent = 'Odblokovať'; 
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
            deleteButton.textContent = 'Vymazať slot'; 
            deleteButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať slot' pre zablokovaný interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deleteButton.addEventListener('click', deleteHandler); 
            deleteButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Vymazať slot'.");
        }

    } else { // Je to placeholder prázdny slot (isBlocked === false a isPhantom === false) - teraz zahŕňa aj "Voľný slot dostupný"
        freeSlotModalTitle.textContent = 'Spravovať voľný interval'; 
        console.log("openFreeSlotModal: Typ slotu: Placeholder voľný interval ('Voľný slot dostupný' alebo 'Voľný interval po presuné').");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať'; 
            const reblockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Zablokovať' (znovu zablokovať) pre odblokovaný interval ID: ${blockedSlotId}. Spúšťam reblockUnblockedSlot.`);
                reblockUnblockedSlot(blockedSlotId, date, location);
            };
            blockButton.addEventListener('click', reblockHandler);
            blockButton._currentHandler = reblockHandler;
            console.log("openFreeSlotModal: Pridaný posluchovač a zobrazené tlačidlo 'Zablokovať' pre placeholder slot.");
        }

        if (deleteButton) { 
            deleteButton.style.display = 'inline-block';
            deleteButton.textContent = 'Vymazať slot'; 
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

    openModal(freeSlotModal); 
    console.log("openFreeSlotModal: Modálne okno otvorené.");
}


/**
 * Prevedie fantómový interval na riadny zablokovaný slot.
 * @param {string} blockedSlotId ID fantómového slotu na konverziu.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
*/
async function convertToRegularBlockedSlot(blockedSlotId, date, location) {
    console.log(`convertToRegularBlockedSlot: === FUNKCIA ZABLOKOVAŤ FANTÓMOVÝ INTERVAL SPUSTENÁ ===`);
    console.log(`convertToRegularBlockedSlot: ID slotu: ${blockedSlotId}, Dátum: ${date}, Miesto: ${location}`);
    const freeSlotModal = document.getElementById('freeSlotModal'); 
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete tento fantómový interval zablokovať?');
    console.log(`convertToRegularBlockedSlot: Potvrdenie prijaté: ${confirmed}`);

    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, blockedSlotId);
            console.log(`convertToRegularBlockedSlot: Pokúšam sa aktualizovať interval ID: ${blockedSlotId} na isPhantom: false, isBlocked: true`);
            await setDoc(slotRef, { isPhantom: false, isBlocked: true, originalMatchId: deleteField() }, { merge: true }); 
            console.log(`convertToRegularBlockedSlot: Slot ID: ${blockedSlotId} úspešne aktualizovaný.`);
            await showMessage('Úspech', 'Fantómový interval bol úspešne zablokovaný!');
            closeModal(freeSlotModal);
            console.log("convertToRegularBlockedSlot: Modálne okno zatvorené.");
            await recalculateAndSaveScheduleForDateAndLocation(date, location); 
            console.log("convertToRegularBlockedSlot: Prepočet rozvrhu dokončený.");
        } catch (error) {
            console.error("Chyba pri konverzii fantómového slotu na riadny zablokovaný slot:", error);
            await showMessage('Chyba', `Chyba pri zablokovaní slotu: ${error.message}`);
        }
    }
}

/**
 * Vytvorí nový zablokovaný interval a prepočíta rozvrh.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
 * @param {string} startTime Čas začiatku slotu (HH:MM).
 * @param {string} endTime Čas konca slotu (HH:MM).
*/
async function createBlockedSlotAndRecalculate(date, location, startTime, endTime) {
    console.log(`createBlockedSlotAndRecalculate: === FUNKCIA ZABLOKOVAŤ VOĽNÝ INTERVAL SPUSTENÁ ===`);
    console.log(`createBlockedSlotAndRecalculate: Dátum: ${date}, Miesto: ${location}, Čas: ${startTime}-${endTime}`);
    const freeSlotModal = document.getElementById('freeSlotModal'); 

    const slotData = {
        date: date,
        location: location,
        startTime: startTime,
        endTime: endTime,
        startInMinutes: (parseInt(startTime.split(':')[0]) * 60) + parseInt(startTime.split(':')[1]),
        endInMinutes: (parseInt(endTime.split(':')[0]) * 60) + parseInt(endTime.split(':')[1]),
        isPhantom: false, 
        isBlocked: true,  
        createdAt: new Date()
    };

    try {
        const newSlotStart = slotData.startInMinutes;
        const newSlotEnd = slotData.endInMinutes;

        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", date),
            where("location", "==", location)
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
        const matchesForLocationAndDate = existingMatchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const [startH, startM] = data.startTime.split(':').map(Number);
            const startInMinutes = startH * 60 + startM;
            const duration = Number(data.duration) || 0;
            const bufferTime = Number(data.bufferTime) || 0;
            const endInMinutes = startInMinutes + duration + bufferTime; 
            return { start: startInMinutes, end: endInMinutes, id: doc.id };
        });

        const existingBlockedSlotsQuery = query(
            blockedSlotsCollectionRef,
            where("date", "==", date),
            where("location", "==", location)
        );
        const existingBlockedSlotsSnapshot = await getDocs(existingBlockedSlotsQuery);
        const otherActiveBlockedSlotsForLocationAndDate = existingBlockedSlotsSnapshot.docs
            .map(doc => {
                const data = doc.data();
                const [startH, startM] = data.startTime.split(':').map(Number);
                const startInMinutes = startH * 60 + startM;
                const [endH, endM] = data.endTime.split(':').map(Number);
                const endInMinutes = endH * 60 + endM;
                return { start: startInMinutes, end: endInMinutes, id: doc.id, isPhantom: data.isPhantom === true, isBlocked: data.isBlocked === true };
            })
            .filter(bs => bs.isBlocked === true || bs.isPhantom === true); 

        const isOverlapping = (slot1Start, slot1End, slot2Start, slot2End) => {
            return (slot1Start < slot2End && slot1End > slot2Start);
        };

        let overlapFound = false;
        let overlapDetails = null;

        for (const match of matchesForLocationAndDate) {
            if (isOverlapping(newSlotStart, newSlotEnd, match.start, match.end)) {
                overlapFound = true;
                overlapDetails = { type: 'zápas', start: match.start, end: match.end };
                break;
            }
        }

        if (!overlapFound) {
            for (const blockedSlot of otherActiveBlockedSlotsForLocationAndDate) { 
                if (isOverlapping(newSlotStart, newSlotEnd, blockedSlot.start, blockedSlot.end)) {
                    overlapFound = true;
                    overlapDetails = { type: 'zablokovaný slot', start: blockedSlot.start, end: blockedSlot.end };
                    break;
                }
            }
        }

        if (overlapFound) {
            const formatTime = (minutes) => {
                const h = String(Math.floor(minutes / 60)).padStart(2, '0');
                const m = String(minutes % 60).padStart(2, '0');
                return `${h}:${m}`;
            };
            await showMessage('Chyba', `Nový zablokovaný interval sa prekrýva s existujúcim ${overlapDetails.type} v rozsahu ${formatTime(overlapDetails.start)} - ${formatTime(overlapDetails.end)}.`);
            return; 
        }

        console.log(`createBlockedSlotAndRecalculate: Pokúšam sa pridať nový zablokovaný slot:`, slotData);
        await addDoc(blockedSlotsCollectionRef, slotData);
        console.log(`createBlockedSlotAndRecalculate: Nový zablokovaný interval úspešne pridaný.`);
        await showMessage('Úspech', 'Slot bol úspešne zablokovaný!');
        
        closeModal(freeSlotModal);
        await recalculateAndSaveScheduleForDateAndLocation(date, location); 
        console.log("createBlockedSlotAndRecalculate: Prepočet rozvrhu dokončený.");
    } catch (error) {
        console.error("Chyba pri ukladaní stavu voľného slotu (blokovanie):", error);
        await showMessage('Chyba', `Chyba pri blokovaní slotu: ${error.message}`);
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
            console.log(`unblockBlockedSlot: Pokúšam sa aktualizovať interval ID: ${slotId} na isBlocked: false, isPhantom: false`);
            await setDoc(slotRef, { isBlocked: false, isPhantom: false, originalMatchId: deleteField() }, { merge: true }); 
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
 * Znovu zablokuje predtým odblokovaný interval (zmení isBlocked na true).
 * @param {string} slotId ID slotu na znovu zablokovanie.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
*/
async function reblockUnblockedSlot(slotId, date, location) {
    console.log(`reblockUnblockedSlot: === FUNKCIA ZNOVU ZABLOKOVAŤ INTERVAL SPUSTENÁ ===`);
    console.log(`reblockUnblockedSlot: ID slotu: ${slotId}, Dátum: ${date}, Miesto: ${location}`);
    const freeSlotModal = document.getElementById('freeSlotModal'); 
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete tento interval opäť zablokovať?');
    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, slotId);
            const slotDoc = await getDoc(slotRef);
            if (!slotDoc.exists()) {
                await showMessage('Chyba', 'Slot na opätovné zablokovanie sa nenašiel.');
                return;
            }
            const slotData = slotDoc.data();
            const [startH, startM] = slotData.startTime.split(':').map(Number);
            const startInMinutes = startH * 60 + startM;
            const [endH, endM] = slotData.endTime.split(':').map(Number);
            const endInMinutes = endH * 60 + endM;

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
                const matchDuration = matchData.duration || 0;
                const matchBufferTime = matchData.bufferTime || 0;
                const matchEndInMinutes = matchStartInMinutes + matchDuration + matchBufferTime;
                return (startInMinutes < matchEndInMinutes && endInMinutes > matchStartInMinutes);
            });

            if (overlappingMatch) {
                const formatTime = (minutes) => {
                    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
                    const m = String(minutes % 60).padStart(2, '0');
                    return `${h}:${m}`;
                };
                const matchStartTime = overlappingMatch.data().startTime;
                const matchDuration = overlappingMatch.data().duration || 0;
                const matchBufferTime = overlappingMatch.data().bufferTime || 0;
                const [msh,msm] = matchStartTime.split(':').map(Number);
                const matchEndTimeInMinutes = (msh * 60) + msm + matchDuration + matchBufferTime;
                const formattedMatchEndTime = formatTime(matchEndTimeInMinutes);

                await showMessage('Chyba', `Slot nemožno zablokovať, pretože sa prekrýva s existujúcim zápasom od ${matchStartTime} do ${formattedMatchEndTime}. Najprv presuňte alebo vymažte tento zápas.`);
                return;
            }
            console.log(`reblockUnblockedSlot: Pokúšam sa aktualizovať interval ID: ${slotId} na isBlocked: true, isPhantom: false`);
            await setDoc(slotRef, { isBlocked: true, isPhantom: false, originalMatchId: deleteField() }, { merge: true }); 
            console.log(`reblockUnblockedSlot: Interval ID: ${slotId} úspešne znovu zablokovaný.`);
            await showMessage('Úspech', 'Slot bol úspešne znovu zablokovaný!');
            closeModal(freeSlotModal);
            await recalculateAndSaveScheduleForDateAndLocation(date, location); 
            console.log("reblockUnblockedSlot: Prepočet rozvrhu dokončený.");
        } catch (error) {
            console.error("Chyba pri opätovnom zablokovaní slotu:", error);
            await showMessage('Chyba', `Chyba pri opätovnom zablokovaní slotu: ${error.message}`);
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
        const slotDocRef = doc(blockedSlotsCollectionRef, slotId);
        const slotDoc = await getDoc(slotDocRef);
        let deletedSlotWasFreePlaceholder = false;
        let deletedSlotStartTime = null;
        let deletedSlotEndTime = null;

        if (slotDoc.exists()) {
            const slotData = slotDoc.data();
            if (slotData.isBlocked === false && slotData.isPhantom === false) {
                deletedSlotWasFreePlaceholder = true;
                deletedSlotStartTime = slotData.startTime;
                deletedSlotEndTime = slotData.endTime;
            }
        }

        const batch = writeBatch(db); 

        console.log(`handleDeleteSlot: Pokúšam sa vymazať dokument blockedSlot ID: ${slotId}`);
        batch.delete(slotDocRef);
        
        await batch.commit();
        console.log("handleDeleteSlot: Batch commit successful.");

        await showMessage('Úspech', 'Slot bol úspešne vymazaný z databázy!');
        closeModal(freeSlotModal);
        
        // Ensure to pass date and location correctly to recalculateAndSaveScheduleForDateAndLocation
        await recalculateAndSaveScheduleForDateAndLocation(
            date, 
            location, 
            null, 
            null, 
            slotId, 
            deletedSlotWasFreePlaceholder, 
            deletedSlotStartTime, 
            deletedSlotEndTime,
            null // Explicitly pass null for originalMatchTimeRange as we are deleting a slot, not moving a match
        );
        console.log("handleDeleteSlot: Prepočet rozvrhu dokončený.");

    } catch (error) {
        console.error("handleDeleteSlot: Chyba pri odstraňovaní/posúvaní slotu:", error);
        await showMessage('Chyba', `Chyba pri odstraňovaní/posúvaní slotu: ${error.message}`);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

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
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

    const freeSlotModal = document.getElementById('freeSlotModal');
    const closeFreeSlotModalButton = document.getElementById('closeFreeSlotModal');


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    await displayMatchesAsSchedule();


    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); 
        addOptions.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
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
        placeGoogleMapsUrlInput.value = '';
        deletePlaceButtonModal.style.display = 'none';
        if (deletePlaceButtonModal && deletePlaceButtonModal._currentHandler) { 
            deletePlaceButtonModal.removeEventListener('click', deletePlaceButtonModal._currentHandler);
            delete deletePlaceButtonModal._currentHandler;
        }
        openModal(placeModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        openMatchModal(); 
        addOptions.classList.remove('show');
    });

    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule(); 
    });

    closePlaceModalButton.addEventListener('click', () => {
        closeModal(placeModal);
        displayMatchesAsSchedule(); 
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule(); 
    });

    closeFreeSlotModalButton.addEventListener('click', () => {
        closeModal(freeSlotModal);
        displayMatchesAsSchedule(); 
    });

    matchCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.value = '';
            team2NumberInput.disabled = true;
            await updateMatchDurationAndBuffer(); 
            await findFirstAvailableTime(); 
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.disabled = true;
            matchDurationInput.value = 60; 
            matchBufferTimeInput.value = 5; 
            matchStartTimeInput.value = ''; 
        }
    });

    matchGroupSelect.addEventListener('change', () => {
        if (matchGroupSelect.value) {
            team1NumberInput.disabled = false;
            team2NumberInput.disabled = false;
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

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocationName || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Prestávka po zápase).');
            return;
        }

        if (team1Number === team2Number) {
            await showMessage('Chyba', 'Tím nemôže hrať sám proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
            return;
        }

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

        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            await showMessage('Chyba', 'Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        let existingDuplicateMatchId = null; 
        let existingDuplicateMatchDetails = null; 

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

                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const existingTeam1Number = existingMatch.team1Number;
                const existingTeam2Number = existingMatch.team2Number;

                const condition1 = (existingTeam1Number === team1Number && existingTeam2Number === team2Number);
                const condition2 = (existingTeam1Number === team2Number && existingTeam2Number === team1Number);

                if (condition1 || condition2) {
                    existingDuplicateMatchId = existingMatchId;
                    existingDuplicateMatchDetails = existingMatch; 
                    return; 
                }
            });

            if (existingDuplicateMatchId) {
                const dateObj = new Date(existingDuplicateMatchDetails.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                const message = `Tímy ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už proti sebe hrali v kategórii ${categoriesMap.get(matchCategory)} a v skupine ${groupsMap.get(matchGroup)} dňa ${formattedDate} o ${existingDuplicateMatchDetails.startTime}. Želáte si tento zápas vymazať a nahradiť ho novými údajmi?`;

                const confirmedReplace = await showConfirmation('Duplicita zápasu!', message);

                if (!confirmedReplace) {
                    return; 
                } else {
                    console.log(`Zápas ID: ${existingDuplicateMatchId} označený na vymazanie kvôli duplicitnej kontrole.`);
                    await deleteDoc(doc(matchesCollectionRef, existingDuplicateMatchId));
                    await showMessage('Potvrdenie', `Pôvodný zápas bol vymazaný. Nový zápas bude uložený.`);
                }
            }
        } catch (error) {
            console.error("Chyba pri kontrole existujúcich zápasov a spracovaní duplicity:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole, či tímy už hrali proti sebe, alebo pri spracovaní duplicity. Skúste to znova.");
            return;
        }

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
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return;
                }
            });

            const blockedSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
            blockedSlotsSnapshot.docs.forEach(doc => {
                const blockedSlot = doc.data();
                if (blockedSlot.isBlocked === true || blockedSlot.isPhantom === true) { 
                    const [blockedStartHour, blockedStartMinute] = blockedSlot.startTime.split(':').map(Number);
                    const blockedSlotStartInMinutes = blockedStartHour * 60 + blockedStartMinute;
                    const [blockedEndHour, blockedEndMinute] = blockedSlot.endTime.split(':').map(Number);
                    const blockedSlotEndInMinutes = blockedEndHour * 60 + blockedEndMinute;

                    if (newMatchStartInMinutes < blockedSlotEndInMinutes && newMatchEndInMinutesWithBuffer > blockedSlotStartInMinutes) {
                        overlapFound = true;
                        overlappingMatchDetails = { ...blockedSlot, type: 'blocked_slot' }; 
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
                const existingMatchEndTimeObj = new Date();
                const durationOrEndTime = (overlappingMatchDetails.type === 'blocked_slot' ? (overlappingMatchDetails.endInMinutes - (existingStartHour * 60 + existingStartMinute)) : (overlappingMatchDetails.duration || 0));
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + durationOrEndTime, 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

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

        const allPlacesSnapshot = await getDocs(placesCollectionRef);
        const allPlaces = allPlacesSnapshot.docs.map(doc => doc.data());
        const selectedPlaceData = allPlaces.find(p => p.name === matchLocationName && p.type === 'Športová hala');
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala'; 

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime,
            location: matchLocationName,
            locationType: matchLocationType,
            categoryId: matchCategory,
            categoryName: categoriesMap.get(matchCategory) || matchCategory, 
            groupId: matchGroup || null,
            groupName: matchGroup ? groupsMap.get(matchGroup).replace(/skupina /gi, '').trim() : null, 
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
            if (currentMatchId && !existingDuplicateMatchId) { 
                console.log(`Ukladám existujúci zápas ID: ${currentMatchId}`, matchData);
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!'); 
            } else { 
                console.log(`Pridávam nový zápas:`, matchData);
                await addDoc(matchesCollectionRef, matchData);
                await showMessage('Úspech', 'Zápas úspešne pridaný!'); 
            }
            closeModal(matchModal);
            await recalculateAndSaveScheduleForDateAndLocation(matchDate, matchLocationName, currentMatchId || null, matchStartTime);
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

        if (!type || !name || !address || !googleMapsUrl) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }
        if (type === 'Ubytovanie') {
            await showMessage('Chyba', 'Typ miesta "Ubytovanie" nie je podporovaný. Vyberte "Športová hala" alebo "Stravovacie zariadenie".');
            return;
        }

        try {
            new URL(googleMapsUrl); 
        } catch (_) {
            await showMessage('Chyba', 'Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

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

        if (!date) {
            await showMessage('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

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
