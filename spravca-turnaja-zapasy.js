import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
// Priamy import 'collection' z firebase-firestore.js, keďže nie je exportovaný z common.js
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

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

    const selectedDate = matchDateSelect.value;
    const selectedLocationName = matchLocationSelect.value;

    console.log("findFirstAvailableTime called.");
    console.log("Selected Date:", selectedDate);
    console.log("Selected Location:", selectedLocationName);

    if (!selectedDate || !selectedLocationName) {
        matchStartTimeInput.value = '';
        console.log("Date or Location empty, clearing start time and returning.");
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
        console.log("First Day Start Time (global):", firstDayStartTime);
        console.log("Other Days Start Time (global):", otherDaysStartTime);

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];
        console.log("Is selected day the first playing day?", isFirstPlayingDay);

        const initialStartTimeForDay = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;
        let [initialH, initialM] = initialStartTimeForDay.split(':').map(Number);
        let initialPointerMinutes = initialH * 60 + initialM; 
        console.log("Initial pointer minutes for selected day:", initialPointerMinutes);

        const requiredMatchDuration = parseInt(matchDurationInput.value) || 0;
        const requiredBufferTime = parseInt(matchBufferTimeInput.value) || 0;
        console.log("Required Match Duration (from input):", requiredMatchDuration);
        console.log("Required Buffer Time (from input):", requiredBufferTime);

        if (requiredMatchDuration <= 0) {
            matchStartTimeInput.value = ''; 
            console.log("Required Match Duration is 0 or less, clearing start time and returning.");
            return;
        }
        const newMatchFullFootprint = requiredMatchDuration + requiredBufferTime;
        console.log("New Match Full Footprint (duration + buffer):", newMatchFullFootprint);


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
        console.log("Existing Matches for selected Location and Date (sorted by start time):", matchesForLocationAndDate);

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
            const [startH, startM] = data.startTime.split(':').map(Number);
            const startInMinutes = startH * 60 + startM;
            const [endH, endM] = data.endTime.split(':').map(Number);
            const endInMinutes = endH * 60 + endM;
            return { start: startInMinutes, end: endInMinutes, id: doc.id, ...data };
        }).filter(slot => slot.isBlocked === true || slot.isPhantom === true); // Only consider truly blocked slots or phantoms as obstacles
        console.log("Blocked Slots for selected Location and Date (filtered for isBlocked === true or isPhantom === true):", blockedSlotsForLocationAndDate);


        let exactMatchDurationFound = false;
        let bestCandidateStartTimeInMinutes = -1;

        // Function to check if a time slot overlaps with any existing match or *active* blocked slot
        const isSlotAvailable = (candidateStart, candidateEnd) => {
            // Check against existing matches
            for (const match of matchesForLocationAndDate) {
                if (candidateStart < match.end && candidateEnd > match.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with existing match ${match.start}-${match.end}`);
                    return false; // Overlaps with an existing match
                }
            }
            // Check against active blocked slots (isBlocked === true or isPhantom === true)
            for (const blockedSlot of blockedSlotsForLocationAndDate) { // This array is already filtered
                if (candidateStart < blockedSlot.end && candidateEnd > blockedSlot.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with active blocked slot ${blockedSlot.start}-${blockedSlot.end}`);
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
                console.log("Žiadne existujúce zápasy. Nastavujem čas začiatku na počiatočný čas dňa ako kandidáta na presné prispôsobenie (dostupný).");
            } else {
                console.log("Žiadne existujúce zápasy, ale počiatočný slot je zablokovaný.");
            }
        } else {
            const firstMatch = matchesForLocationAndDate[0];
            const gapBeforeFirstMatchDuration = firstMatch.start - initialPointerMinutes;
            console.log("Medzera pred prvým zápasom: Trvanie =", gapBeforeFirstMatchDuration, "minút.");

            // Skontrolujte, či táto medzera dokáže presne prispôsobiť požadované trvanie zápasu
            if (gapBeforeFirstMatchDuration >= requiredMatchDuration) {
                // A uistite sa, že sa rezerva tiež zmestí pred prvý skutočný zápas a nie je zablokovaný
                const candidateStartTime = initialPointerMinutes;
                const candidateEndTime = candidateStartTime + newMatchFullFootprint;
                if (candidateEndTime <= firstMatch.start && isSlotAvailable(candidateStartTime, candidateEndTime)) {
                    bestCandidateStartTimeInMinutes = candidateStartTime;
                    exactMatchDurationFound = true;
                    console.log("Našiel som presné prispôsobenie pre trvanie zápasu pred prvým zápasom:", bestCandidateStartTimeInMinutes);
                }
            }
        }
        
        // Hľadajte presné prispôsobenie v medzerách medzi existujúcimi zápasmi
        if (!exactMatchDurationFound) { 
            console.log("Hľadám presné prispôsobenie pre trvanie zápasu medzi existujúcimi zápasmi.");
            for (let i = 0; i < matchesForLocationAndDate.length - 1; i++) {
                const currentMatch = matchesForLocationAndDate[i];
                const nextMatch = matchesForLocationAndDate[i + 1];

                const gapStartInMinutes = currentMatch.end; // Koniec aktuálneho zápasu (vrátane jeho rezervy)
                const gapDuration = nextMatch.start - gapStartInMinutes; // Trvanie samotnej medzery
                console.log(`Kontrola medzery medzi zápasom ${currentMatch.id} (končí ${currentMatch.end}) a ${nextMatch.id} (začína ${nextMatch.start}): Trvanie = ${gapDuration}`);

                // Skontrolujte, či táto medzera dokáže presne prispôsobiť požadované trvanie zápasu
                if (gapDuration >= requiredMatchDuration) {
                    // A uistite sa, že sa rezerva tiež zmestí pred ďalší skutočný zápas a nie je zablokovaný
                    const candidateStartTime = gapStartInMinutes;
                    const candidateEndTime = candidateStartTime + newMatchFullFootprint;
                    if (candidateEndTime <= nextMatch.start && isSlotAvailable(candidateStartTime, candidateEndTime)) {
                        bestCandidateStartTimeInMinutes = candidateStartTime;
                        exactMatchDurationFound = true;
                        console.log("Našiel som presné prispôsobenie pre trvanie zápasu medzi zápasmi:", bestCandidateStartTimeInMinutes);
                        break; // Našiel sa prvý presný prispôsobenie, ukončite cyklus
                    }
                }
            }
        }
        
        if (exactMatchDurationFound && bestCandidateStartTimeInMinutes !== -1) {
            const formattedHour = String(Math.floor(bestCandidateStartTimeInMinutes / 60)).padStart(2, '0');
            const formattedMinute = String(bestCandidateStartTimeInMinutes % 60).padStart(2, '0');
            matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
            console.log("Nastavený čas začiatku zápasu na presné prispôsobenie (Priorita 1):", matchStartTimeInput.value);
        } else {
            // --- Krok 2: Náhradné umiestnenie po poslednom zápase, ak sa nenájde presné prispôsobenie ---
            let nextAvailableTimeInMinutes = initialPointerMinutes; // Default to initial day start time
            if (matchesForLocationAndDate.length > 0) {
                const lastMatch = matchesForLocationAndDate[matchesForLocationAndDate.length - 1];
                console.log("Fallback: Posledný existujúci zápas:", lastMatch);
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
                    console.log("No available time after last match, reverting to initial day start.");
                }

            } else { // No existing matches, just check if initial time is available
                if (!isSlotAvailable(initialPointerMinutes, initialPointerMinutes + newMatchFullFootprint)) {
                    // If initial slot is blocked and no matches, no automatic time can be set
                    nextAvailableTimeInMinutes = -1; // Indicate no available time
                    console.log("No existing matches, and initial day start slot is blocked.");
                }
            }

            if (nextAvailableTimeInMinutes === -1) {
                matchStartTimeInput.value = '';
                await showMessage('Informácia', 'Na vybranom mieste a dátume nie sú k dispozícii žiadne voľné sloty na vloženie zápasu, dokonca ani po poslednom zápase alebo od začiatku dňa.');
            } else {
                const formattedHour = String(Math.floor(nextAvailableTimeInMinutes / 60)).padStart(2, '0');
                const formattedMinute = String(nextAvailableTimeInMinutes % 60).padStart(2, '0');
                matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                console.log("Nenašlo sa presné prispôsobenie. Nastavujem čas začiatku zápasu na náhradný (po poslednom zápase alebo začiatku dňa):", matchStartTimeInput.value);
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
 * Prepočíta a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop alebo po zmene slotu.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * pričom rešpektuje zablokované sloty a zachováva relatívne poradie presunutých zápasov.
 * @param {string} date Dátum, pre ktorý sa má prepočítať rozvrh.
 * @param {string} location Miesto, pre ktoré sa má prepočítať rozvrh.
 */
async function recalculateAndSaveScheduleForDateAndLocation(date, location) {
    console.log(`recalculateAndSaveScheduleForDateAndLocation: Spustené pre Dátum: ${date}, Miesto: ${location}.`);
    try {
        const batch = writeBatch(db);

        // Fetch all matches for the given date and location
        const matchesQuery = query(matchesCollectionRef, where("date", "==", date), where("location", "==", location), orderBy("startTime", "asc"));
        const matchesSnapshot = await getDocs(matchesQuery);
        let currentMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

        // Fetch all blocked slots for the given date and location
        const blockedSlotsQuery = query(blockedSlotsCollectionRef, where("date", "==", date), where("location", "==", location), orderBy("startTime", "asc"));
        const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
        let allBlockedSlots = blockedSlotsSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'blocked_slot',
            isPhantom: doc.data().isPhantom === true,
            isBlocked: doc.data().isBlocked === true,
            ...doc.data(),
            startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60) + parseInt(doc.data().startTime.split(':')[1]),
            endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60) + parseInt(doc.data().endTime.split(':')[1])
        }));
        console.log("recalculateAndSaveScheduleForDateAndLocation: Všetky načítané blokované sloty:", JSON.stringify(allBlockedSlots.map(s => ({id:s.id, isBlocked:s.isBlocked, isPhantom:s.isPhantom}))));
        
        // Combine all events (matches and ALL types of blocked slots) for sorting and processing
        // Now, isBlocked:false, isPhantom:false slots are treated as fixed obstacles too.
        let eventsToProcess = [
            ...currentMatches.map(m => {
                const [h, mVal] = m.startTime.split(':').map(Number);
                const startMin = h * 60 + mVal;
                const duration = Number(m.duration) || 0;
                const bufferTime = Number(m.bufferTime) || 0;
                return { ...m, startInMinutes: startMin, endInMinutes: startMin + duration + bufferTime };
            }),
            ...allBlockedSlots.filter(slot => slot.isPhantom === false) // Include user-blocked AND persistent placeholders
        ];

        // Sort all events (matches and all non-phantom blocked slots) by their start time
        eventsToProcess.sort((a, b) => a.startInMinutes - b.startInMinutes);
        console.log(`recalculateAndSaveScheduleForDateAndLocation: Všetky udalosti po zoradení (vrátane všetkých non-phantom slotov):`, JSON.stringify(eventsToProcess.map(e => ({id: e.id, type: e.type, startInMinutes: e.startInMinutes, isPhantom: e.isPhantom, isBlocked: e.isBlocked}))));

        const initialScheduleStartMinutes = await getInitialScheduleStartMinutes(date);
        let currentTimePointer = initialScheduleStartMinutes;
        console.log(`recalculateAndSaveScheduleForDateAndLocation: Počiatočný ukazovateľ času rozvrhu: ${currentTimePointer} minút.`);

        const slotsToDeleteFromBatch = new Set(); // To collect IDs of slots that become redundant

        for (const event of eventsToProcess) {
            console.log(`recalculateAndSaveScheduleForDateAndLocation: Spracovávam udalosť: ID ${event.id}, Typ: ${event.type}, Pôvodný štart: ${event.startTime || event.startInMinutes}, Aktuálny currentTimePointer: ${currentTimePointer}`);

            if (event.type === 'blocked_slot') {
                // If this blocked slot is a persistent placeholder (isBlocked:false, isPhantom:false)
                // and it is being "overwritten" by currentTimePointer (meaning a match or previous blocked slot
                // has pushed time beyond its start), then this placeholder is redundant.
                if (event.isBlocked === false && event.isPhantom === false && currentTimePointer > event.startInMinutes) {
                    slotsToDeleteFromBatch.add(event.id);
                    console.log(`recalculateAndSaveScheduleForDateAndLocation: Označený na vymazanie redundantný placeholder slot (currentTimePointer > start): ${event.id}`);
                }
                
                // For all blocked slots (user-blocked and persistent placeholders), advance the pointer past their end time
                currentTimePointer = Math.max(currentTimePointer, event.endInMinutes);
                console.log(`recalculateAndSaveScheduleForDateAndLocation: Blokovaný slot ${event.id} (isBlocked:${event.isBlocked}, isPhantom:${event.isPhantom}), ukazovateľ posunutý na ${currentTimePointer} minút.`);
            } else if (event.type === 'match') {
                const matchRef = doc(matchesCollectionRef, event.id);
                
                // If a match's *current* start time (event.startInMinutes) is BEFORE currentTimePointer,
                // it means it needs to be shifted forward to avoid overlap.
                let newMatchStartTimeInMinutes = Math.max(currentTimePointer, event.startInMinutes);

                // Check for overlapping placeholder slots that this match is now covering
                allBlockedSlots.forEach(slot => {
                    if (slot.isBlocked === false && slot.isPhantom === false && slot.id !== event.id) { // Ensure it's a placeholder, not the match itself
                        // Check if the match (in its new potential position) completely covers the placeholder
                        if (newMatchStartTimeInMinutes <= slot.startInMinutes && (newMatchStartTimeInMinutes + event.duration + event.bufferTime) >= slot.endInMinutes) {
                            slotsToDeleteFromBatch.add(slot.id);
                            console.log(`recalculateAndSaveScheduleForDateAndLocation: Označený na vymazanie placeholder slot (prekrytý zápasom ${event.id}): ${slot.id}`);
                        }
                    }
                });

                const newStartTimeStr = `${String(Math.floor(newMatchStartTimeInMinutes / 60)).padStart(2, '0')}:${String(newMatchStartTimeInMinutes % 60).padStart(2, '0')}`;

                // Only update if the start time has actually changed
                if (event.startTime !== newStartTimeStr) {
                    batch.update(matchRef, { startTime: newStartTimeStr });
                    console.log(`recalculateAndSaveScheduleForDateAndLocation: Aktualizujem zápas ${event.id} s novým časom: ${newStartTimeStr}`);
                    // DÔLEŽITÉ: Aktualizujte objekt udalosti v pamäti pre následné výpočty
                    event.startTime = newStartTimeStr; // Aktualizujte reťazec
                    event.startInMinutes = newMatchStartTimeInMinutes; // Aktualizujte vypočítané minúty
                    // Prepočítajte endInMinutes na základe nového času začiatku
                    event.endInMinutes = newMatchStartTimeInMinutes + event.duration + event.bufferTime;
                } else {
                    console.log(`recalculateAndSaveScheduleForDateAndLocation: Zápas ${event.id} čas sa nezmenil, preskočené aktualizácie: ${newStartTimeStr}`);
                }
                

                // Advance the pointer past this match (including its duration and buffer)
                currentTimePointer = newMatchStartTimeInMinutes + event.duration + event.bufferTime;
                console.log(`recalculateAndSaveScheduleForDateAndLocation: Zápas ${event.id} preplánovaný na ${newStartTimeStr}, ukazovateľ posunutý na ${currentTimePointer} minút.`);
            }
        }

        // Final cleanup: Delete all phantom slots and any marked-for-deletion placeholders
        allBlockedSlots.forEach(slot => {
            if (slot.isPhantom === true || slotsToDeleteFromBatch.has(slot.id)) {
                batch.delete(doc(blockedSlotsCollectionRef, slot.id));
                console.log(`recalculateAndSaveScheduleForDateAndLocation: Pridané do batchu na finálne vymazanie slotu ID: ${slot.id} (Phantom: ${slot.isPhantom}, Marked for deletion: ${slotsToDeleteFromBatch.has(slot.id)})`);
            }
        });

        await batch.commit();
        console.log("recalculateAndSaveScheduleForDateAndLocation: Final batch commit (including specific slot deletions) successful.");

        // Reload the display to reflect changes
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
 * Prepočíta a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * pričom rešpektuje zablokované sloty a zachováva relatívne poradie presunutých zápasov.
 * @param {string} draggedMatchId ID presunutého zápasu.
 * @param {string} targetDate Dátum cieľového miesta.
 * @param {string} targetLocation Miesto cieľového miesta (názov).
 * @param {string|null} droppedProposedStartTime HH:MM string pre navrhovaný čas začiatku presunutého zápasu, alebo null pre pripojenie na koniec.
 * @param {string|null} targetBlockedSlotId ID zablokovaného slotu, na ktorý sa presúva (môže byť aj placeholder).
 */
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedProposedStartTime = null, targetBlockedSlotId = null) {
    console.log(`moveAndRescheduleMatch: Spustené pre zápas ID: ${draggedMatchId}, cieľ: ${targetDate}, ${targetLocation}, navrhovaný čas: ${droppedProposedStartTime}, cieľový zablokovaný slot ID: ${targetBlockedSlotId}`);
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

        // Get duration and bufferTime from the dragged match data, or default if not present
        const matchDuration = Number(draggedMatchData.duration) || 60;
        const matchBufferTime = Number(draggedMatchData.bufferTime) || 5;
        const [originalMatchStartH, originalMatchStartM] = draggedMatchData.startTime.split(':').map(Number);
        const originalMatchStartInMinutes = originalMatchStartH * 60 + originalMatchStartM;
        const originalMatchEndInMinutes = originalMatchStartInMinutes + matchDuration + matchBufferTime;

        // Vždy vytvorte placeholder slot na pôvodnom mieste zápasu
        // (bez ohľadu na to, či ide o cross-move alebo nie)
        const newPlaceholderSlotData = {
            date: originalDate,
            location: originalLocation,
            startTime: draggedMatchData.startTime,
            endTime: `${String(Math.floor(originalMatchEndInMinutes / 60)).padStart(2, '0')}:${String(originalMatchEndInMinutes % 60).padStart(2, '0')}`,
            startInMinutes: originalMatchStartInMinutes,
            endInMinutes: originalMatchEndInMinutes,
            isBlocked: false, // This is an empty slot, not an active block
            isPhantom: false, // This is NOT a phantom that should be auto-deleted by general cleanup
            createdAt: new Date()
        };
        await addDoc(blockedSlotsCollectionRef, newPlaceholderSlotData);
        console.log(`moveAndRescheduleMatch: Placeholder slot vytvorený na pôvodnom mieste: ${originalDate}, ${originalLocation}, ${draggedMatchData.startTime}`);
        
        // 2. Update the original match document to its new location/time
        const updatedMatchData = {
            ...draggedMatchData,
            date: targetDate,
            location: targetLocation,
            startTime: droppedProposedStartTime // This is the exact time of the dropped slot
        };
        batch.set(draggedMatchDocRef, updatedMatchData, { merge: true }); // Re-insert/update with same ID
        console.log(`moveAndRescheduleMatch: Pridané do batchu na aktualizáciu/opätovné vloženie zápasu: ${draggedMatchId} s novými dátami:`, updatedMatchData);

        // 3. Delete the target blocked slot if dropped on one
        if (targetBlockedSlotId) {
            batch.delete(doc(blockedSlotsCollectionRef, targetBlockedSlotId));
            console.log(`moveAndRescheduleMatch: Pridané do batchu na vymazanie cieľového zablokovaného slotu (pretože sa naň presúva): ${targetBlockedSlotId}`);
        }

        await batch.commit();
        console.log("moveAndRescheduleMatch: Batch commit úspešný pre presun zápasu.");

        // 4. Recalculate schedule for both original and target locations/dates
        // Pôvodné miesto (teraz s placeholderom)
        await recalculateAndSaveScheduleForDateAndLocation(originalDate, originalLocation);
        console.log(`moveAndRescheduleMatch: Prepočítanie pre pôvodnú lokáciu (${originalDate}, ${originalLocation}) dokončené.`);

        // Cieľové miesto
        if (originalDate !== targetDate || originalLocation !== targetLocation) { // Only recalculate target if different
            await recalculateAndSaveScheduleForDateAndLocation(targetDate, targetLocation);
            console.log(`moveAndRescheduleMatch: Prepočítanie pre cieľovú lokáciu (${targetDate}, ${targetLocation}) dokončené.`);
        }

        await showMessage('Úspech', 'Zápas úspešne presunutý a rozvrh prepočítaný!');
        closeModal(document.getElementById('messageModal')); // Close any message modal
    } catch (error) {
        console.error("moveAndRescheduleMatch: Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule(); // Refresh display to show current state even on error
    }
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
        let allSettings = {}; // Store all settings for easier access, including category-specific
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            globalFirstDayStartTime = data.firstDayStartTime || '08:00';
            globalOtherDaysStartTime = data.otherDaysStartTime || '08:00';
            allSettings = data; // Store all settings data
        }
        console.log(`displayMatchesAsSchedule: Globálny čas začiatku (prvý deň): ${globalFirstDayStartTime}, (ostatné dni): ${globalOtherDaysStartTime}`);

        const blockedSlotsSnapshot = await getDocs(query(blockedSlotsCollectionRef));
        const allBlockedSlots = blockedSlotsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            type: 'blocked_slot',
            isPhantom: doc.data().isPhantom === true, // Add this line to capture isPhantom flag
            isBlocked: doc.data().isBlocked === true, // NEW: Add this line to capture isBlocked flag
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
                const matchesByDateForLocation = groupedMatches.get(location) || new Map(); // Get matches for this location, or empty map if none

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
                    for (const date of allPlayingDayDates) { // Iterate through ALL playing days
                        const matchesForDateAndLocation = groupedMatches.get(location) ? groupedMatches.get(location).get(date) || [] : [];
                        
                        // Získajte zablokované sloty pre aktuálny dátum a miesto
                        const blockedSlotsForDateAndLocation = allBlockedSlots.filter(bs => bs.date === date && bs.location === location);

                        const displayDateObj = new Date(date);
                        const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                        const dayName = displayDateObj.toLocaleDateString('sk-SK', { weekday: 'long' });

                        // Initial currentTimePointerInMinutes for this day and location
                        const isFirstPlayingDayForDate = allPlayingDayDates.length > 0 && date === allPlayingDayDates[0];
                        const initialScheduleStartMinutes = (isFirstPlayingDayForDate ? globalFirstDayStartTime : globalOtherDaysStartTime).split(':').map(Number).reduce((h, m) => h * 60 + m);
                        let currentTimePointerInMinutes = initialScheduleStartMinutes;
                        let contentAddedForThisDate = false;

                        // Kombinujte zápasy a VŠETKY typy zablokovaných slotov na správne vykreslenie.
                        const currentEventsForRendering = [
                            ...matchesForDateAndLocation.map(m => ({
                                ...m,
                                type: 'match',
                                startInMinutes: (parseInt(m.startTime.split(':')[0]) * 60 + parseInt(m.startTime.split(':')[1])),
                                endInMinutes: (parseInt(m.startTime.split(':')[0]) * 60 + parseInt(m.startTime.split(':')[1])) + (m.duration || (allSettings.categoryMatchSettings?.[m.categoryId]?.duration || 60)) + (m.bufferTime || (allSettings.categoryMatchSettings?.[m.categoryId]?.bufferTime || 5))
                            })),
                            // Include ALL blocked slots (user-blocked, phantom, and placeholder) for rendering
                            ...blockedSlotsForDateAndLocation 
                        ];
                        currentEventsForRendering.sort((a, b) => a.startInMinutes - b.startInMinutes);
                        console.log(`displayMatchesAsSchedule: Udalosti pre render pre ${location} na ${date} (zoradené):`, JSON.stringify(currentEventsForRendering.map(e => ({id: e.id, type: e.type, startTime: e.startTime || e.startInMinutes, endTime: e.endTime || e.endInMinutes, isPhantom: e.isPhantom, isBlocked: e.isBlocked}))));

                        // Determine the end time of the last event in minutes for this specific date and location
                        let lastEventEndForDataAttribute = initialScheduleStartMinutes;
                        if (currentEventsForRendering.length > 0) {
                            // Find the actual end of the last *any* event that should occupy space
                            const lastActualEvent = currentEventsForRendering
                                .reduce((latest, current) => {
                                    return (latest === null || current.endInMinutes > latest.endInMinutes) ? current : latest;
                                }, null);

                            if (lastActualEvent) {
                                lastEventEndForDataAttribute = lastActualEvent.endInMinutes;
                            }
                        }

                        const formattedLastEventEndTime = `${String(Math.floor(lastEventEndForDataAttribute / 60)).padStart(2, '0')}:${String(lastEventEndForDataAttribute % 60).padStart(2, '0')}`;
                        
                        scheduleHtml += `<div class="date-group" data-date="${date}" data-location="${location}" data-last-event-end-time="${formattedLastEventEndTime}" data-initial-start-time="${String(Math.floor(initialScheduleStartMinutes / 60)).padStart(2, '0')}:${String(initialScheduleStartMinutes % 60).padStart(2, '0')}" style="margin: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">`;
                        scheduleHtml += `<h3 style="background-color: #eaeaea; padding: 15px; margin: 0; border-bottom: 1px solid #ddd;">${dayName} ${formattedDisplayDate}</h3>`;

                        scheduleHtml += `<table class="data-table match-list-table compact-table" style="width: 100%; border-collapse: collapse;">`;
                        scheduleHtml += `<thead><tr>`;
                        scheduleHtml += `<th>Čas</th>`;
                        scheduleHtml += `<th>Domáci</th>`;
                        scheduleHtml += `<th>Hostia</th>`;
                        scheduleHtml += `<th>ID Domáci</th>`;
                        scheduleHtml += `<th>ID Hostia</th></tr></thead><tbody>`;


                        for (const event of currentEventsForRendering) {
                            // Prázdne sloty pred udalosťou (iba ak nie sú obsadené ŽIADNYM DB záznamom)
                            // We now check against *all* events (matches and all blocked slots)
                            let isGapCoveredByDbEvent = false;
                            for (const existingEvent of currentEventsForRendering) {
                                if (existingEvent.startInMinutes <= currentTimePointerInMinutes && existingEvent.endInMinutes > currentTimePointerInMinutes && existingEvent.id !== event.id) {
                                     // If any existing event starts before or at current pointer, and ends after current pointer, it covers the gap
                                    isGapCoveredByDbEvent = true;
                                    break;
                                }
                            }
                            
                            if (currentTimePointerInMinutes < event.startInMinutes && !isGapCoveredByDbEvent) {
                                const formattedEmptySlotStartTime = `${String(Math.floor(currentTimePointerInMinutes / 60)).padStart(2, '0')}:${String(currentTimePointerInMinutes % 60).padStart(2, '0')}`;
                                const formattedEmptySlotEndTime = `${String(Math.floor(event.startInMinutes / 60)).padStart(2, '0')}:${String(event.startInMinutes % 60).padStart(2, '0')}`;
                                scheduleHtml += `
                                    <tr class="empty-slot-row" data-date="${date}" data-location="${location}" data-start-time="${formattedEmptySlotStartTime}" data-end-time="${formattedEmptySlotEndTime}">
                                        <td>${formattedEmptySlotStartTime} - ${formattedEmptySlotEndTime}</td>
                                        <td colspan="4" style="text-align: center; color: #888; font-style: italic;">Voľný slot dostupný</td>
                                    </tr>
                                `;
                                contentAddedForThisDate = true;
                                console.log(`displayMatchesAsSchedule: Pridaný PURE prázdny slot: ${formattedEmptySlotStartTime}-${formattedEmptySlotEndTime}`);
                            }

                            // Aktuálna udalosť
                            if (event.type === 'match') {
                                const match = event;
                                // Calculate endTime based on match.duration (if present) or category settings
                                const matchDuration = match.duration || (allSettings.categoryMatchSettings?.[match.categoryId]?.duration || 60);
                                // The displayed end time should NOT include the buffer time.
                                const displayedMatchEndTimeInMinutes = (parseInt(match.startTime.split(':')[0]) * 60 + parseInt(match.startTime.split(':')[1])) + matchDuration;
                                const formattedDisplayedEndTime = `${String(Math.floor(displayedMatchEndTimeInMinutes / 60)).padStart(2, '0')}:${String(displayedMatchEndTimeInMinutes % 60).padStart(2, '0')}`;
                                
                                const categoryColor = categoryColorsMap.get(match.categoryId) || 'transparent';
                                let textAlignStyle = '';
                                if (match.groupId && groupAlignmentMapForLocation.has(match.groupId)) {
                                    textAlignStyle = `text-align: ${groupAlignmentMapForLocation.get(match.groupId)};`;
                                } else if (groupIdsArrayInLocation.length > 3) {
                                     textAlignStyle = `text-align: center;`;
                                }
                                console.log(`displayMatchesAsSchedule: Renderujem zápas: ID ${match.id}, Čas: ${match.startTime}-${formattedDisplayedEndTime} (zobrazený), Miesto: ${match.location}, Dátum: ${match.date}`);

                                scheduleHtml += `
                                    <tr draggable="true" data-id="${match.id}" class="match-row" data-start-time="${match.startTime}">
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

                                let rowClass = '';
                                let cellStyle = '';
                                let displayText = '';
                                let dataAttributes = '';

                                if (isUserBlocked) { 
                                    rowClass = 'blocked-slot-row'; 
                                    cellStyle = 'text-align: center; color: white; background-color: #dc3545; font-style: italic;';
                                    displayText = 'Zablokovaný slot';
                                    dataAttributes = `data-is-blocked="true" data-is-phantom="${blockedSlot.isPhantom}"`;
                                } else if (blockedSlot.isPhantom === true) { // isBlocked === false && isPhantom === true
                                    rowClass = 'empty-slot-row phantom-slot-row'; // Style phantoms differently if needed
                                    cellStyle = 'text-align: center; color: #888; font-style: italic; border: 1px dashed #ffa000;'; // Example: dashed orange border
                                    displayText = 'Fantómový interval'; 
                                    dataAttributes = `data-is-blocked="false" data-is-phantom="true"`;
                                } else { // isBlocked === false && isPhantom === false (the new persistent placeholder from a moved match)
                                    rowClass = 'empty-slot-row moved-from-slot'; 
                                    cellStyle = 'text-align: center; color: #888; font-style: italic; background-color: #f0f0f0;'; // Different background for moved-from
                                    displayText = 'Voľný interval po presune'; 
                                    dataAttributes = `data-is-blocked="false" data-is-phantom="false"`; 
                                }

                                console.log(`displayMatchesAsSchedule: Renderujem blocked slot: ID ${blockedSlot.id}, Čas: ${blockedSlotStartHour}:${blockedSlotStartMinute}-${blockedSlotEndHour}:${blockedSlotEndMinute}, Miesto: ${blockedSlot.location}, Dátum: ${blockedSlot.date}, isPhantom: ${blockedSlot.isPhantom}, isBlocked: ${isUserBlocked}`);

                                scheduleHtml += `
                                    <tr class="${rowClass}" data-id="${blockedSlot.id}" data-date="${date}" data-location="${location}" data-start-time="${blockedSlotStartHour}:${blockedSlotStartMinute}" data-end-time="${blockedSlotEndHour}:${blockedSlotEndMinute}" ${dataAttributes}>
                                        <td>${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}</td>
                                        <td colspan="4" style="${cellStyle}">${displayText}</td>
                                    </tr>
                                `;
                            }
                            contentAddedForThisDate = true;
                            // Move the pointer past the current event's actual end time (including its buffer for matches)
                            currentTimePointerInMinutes = Math.max(currentTimePointerInMinutes, event.endInMinutes);
                        }
                        
                        // Prázdny slot na konci dňa, ak je priestor a nie je už pokrytý
                        const endOfDayMinutes = 24 * 60; // 24:00
                        if (currentTimePointerInMinutes < endOfDayMinutes) {
                            const formattedEmptySlotStartTime = `${String(Math.floor(currentTimePointerInMinutes / 60)).padStart(2, '0')}:${String(currentTimePointerInMinutes % 60).padStart(2, '0')}`;
                            const formattedEmptySlotEndTime = `24:00`; // Represent end of day
                            // Check if this final "empty slot" is covered by any existing DB entry
                            let isEndGapCovered = false;
                             for (const existingEvent of currentEventsForRendering) {
                                if (existingEvent.startInMinutes <= currentTimePointerInMinutes && existingEvent.endInMinutes > currentTimePointerInMinutes) {
                                    isEndGapCovered = true;
                                    break;
                                }
                            }
                            if (!isEndGapCovered) {
                                scheduleHtml += `
                                    <tr class="empty-slot-row" data-date="${date}" data-location="${location}" data-start-time="${formattedEmptySlotStartTime}" data-end-time="${formattedEmptySlotEndTime}">
                                        <td>${formattedEmptySlotStartTime} - ${formattedEmptySlotStartTime}</td>
                                        <td colspan="4" style="text-align: center; color: #888; font-style: italic;">Voľný slot dostupný</td>
                                    </tr>
                                `;
                                contentAddedForThisDate = true;
                                console.log(`displayMatchesAsSchedule: Pridaný koncový PURE prázdny slot: ${formattedEmptySlotStartTime}-24:00`);
                            }
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
                const blockedSlotId = event.currentTarget.dataset.id || null; // Capture ID if it's a phantom or unblocked placeholder slot

                openFreeSlotModal(date, location, startTime, endTime, blockedSlotId); 
            });
            // Add drop listeners to empty slots as well
            row.addEventListener('dragover', (event) => {
                event.preventDefault(); // Crucial to allow dropping
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
                const droppedProposedStartTime = event.currentTarget.dataset.startTime; // Use the start time of the empty slot
                const targetBlockedSlotId = event.currentTarget.dataset.id || null; // Get the ID of the empty slot, if it's a phantom or unblocked

                console.log(`Dropped match ${draggedMatchId} onto empty slot. New date: ${newDate}, new location: ${newLocation}, proposed start time: ${droppedProposedStartTime}. Target Blocked Slot ID: ${targetBlockedSlotId}`);
                await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime, targetBlockedSlotId); // Pass the ID
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
                // Zabezpečte, aby kliknutie na vnútorne prvky hlavičky (ak by boli pridané)
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
                    // If over a valid row (match or empty), highlight the row
                    targetRow.classList.add('drop-over-row');
                } else if (targetRow && targetRow.classList.contains('blocked-slot-row')) {
                    // If over a blocked row, indicate it's forbidden
                    targetRow.classList.add('drop-over-forbidden');
                } else {
                    // If over the date-group div itself (empty space), highlight the date-group
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
                    const droppedOnElement = event.target.closest('tr');
                    
                    // Log pre lepšie ladenie
                    console.log(`Drop event: Presúvané ID: ${draggedMatchId}`);
                    if (droppedOnElement) {
                        console.log(`Pustené NA element s ID: ${droppedOnElement.dataset.id}, Trieda: ${droppedOnElement.classList.value}, Čas začiatku: ${droppedOnElement.dataset.startTime}`);
                    } else {
                        console.log(`Pustené na pozadie dateGroupDiv.`);
                    }

                    // Ak sa presunie na zablokovaný slot, zamedzte presunu
                    if (droppedOnElement && droppedOnElement.classList.contains('blocked-slot-row')) {
                        console.log(`Pokus o presun zápasu ${draggedMatchId} na zablokovaný slot. Presun ZAMITNUTÝ.`);
                        await showMessage('Upozornenie', 'Tento časový interval je zablokovaný. Zápas naň nie je možné presunúť.');
                        return; // Zastaviť drop operáciu
                    }
                    
                    // NEW LOGIC FOR DROPPING BEFORE THE FIRST MATCH/SLOT - Robustnejšie nájdenie prvého obsahového riadku
                    const tableBody = dateGroupDiv.querySelector('tbody');
                    let firstContentRow = null;
                    if (tableBody) {
                        for (let i = 0; i < tableBody.rows.length; i++) {
                            const row = tableBody.rows[i];
                            // Consider only actual match rows or blocked slots (which also includes placeholders) as content
                            if (row.classList.contains('match-row') || row.classList.contains('blocked-slot-row') || row.classList.contains('moved-from-slot')) {
                                firstContentRow = row;
                                break;
                            }
                        }
                    }

                    const initialStartTime = dateGroupDiv.dataset.initialStartTime;
                    let dropBeforeFirstContent = false;

                    // getBoundingClientRect().top gives the distance from viewport top.
                    // clientY gives the mouse pointer's vertical coordinate.
                    // If the mouse pointer is close to or above the top of the first content row, consider it "before".
                    const droppedY = event.clientY; 

                    if (firstContentRow) {
                        const firstContentRowRect = firstContentRow.getBoundingClientRect();
                        // If dropped very near or above the first content row (added a slightly larger buffer)
                        if (droppedY < firstContentRowRect.top + 20) { // Increased buffer from 10 to 20
                            dropBeforeFirstContent = true;
                            droppedProposedStartTime = initialStartTime;
                            // If the first content row is an empty slot (placeholder or phantom), we should delete it as it's being "filled"
                            if (firstContentRow.classList.contains('empty-slot-row') && firstContentRow.dataset.id) {
                                targetBlockedSlotId = firstContentRow.dataset.id;
                                console.log(`Targeting the first empty slot with ID: ${targetBlockedSlotId} (when dropping before first content).`);
                            }
                            console.log(`Dropped before first actual content row. Proposed start time (initial start): ${droppedProposedStartTime}`);
                        }
                    }

                    if (dropBeforeFirstContent) {
                         // Logic already set for dropBeforeFirstContent
                    } else if (droppedOnElement && droppedOnElement.dataset.startTime) { 
                        // If dropped on any other row (match or empty/unblocked slot), use its start time
                        droppedProposedStartTime = droppedOnElement.dataset.startTime;
                        // If dropped on an empty/unblocked placeholder slot, get its ID to delete it
                        if (droppedOnElement.classList.contains('empty-slot-row') && droppedOnElement.dataset.id) {
                            targetBlockedSlotId = droppedOnElement.dataset.id;
                            console.log(`Detected drop on empty/unblocked slot with ID: ${targetBlockedSlotId}`);
                        }
                    } else {
                         // If dropped on the background of dateGroupDiv (not directly on a row),
                         // it should go to the very end of the existing schedule.
                        droppedProposedStartTime = dateGroupDiv.dataset.lastEventEndTime;
                        console.log(`Dropped on background (non-empty schedule). Proposed start time (last event end): ${droppedProposedStartTime}`);
                    }
                    
                    console.log(`Attempting to move and reschedule match ${draggedMatchId} to Date: ${newDate}, Location: ${newLocation}, Proposed Start Time: ${droppedProposedStartTime}, Target Blocked Slot ID: ${targetBlockedSlotId}`);
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
    // Get references to elements inside the function to ensure they are available
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
                delete deletePlayingDayButtonModal._currentHandler; // Clean up reference
            }
            const handler = () => deletePlayingDay(playingDayData.date);
            deletePlayingDayButtonModal.addEventListener('click', handler);
            deletePlayingDayButtonModal._currentHandler = handler; // Store reference
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
    // Get references to elements inside the function to ensure they are available
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
                delete deletePlaceButtonModal._currentHandler; // Clean up reference
            }
            const handler = () => deletePlace(placeData.name, placeData.type);
            deletePlaceButtonModal.addEventListener('click', handler);
            deletePlaceButtonModal._currentHandler = handler; // Store reference
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
    // Get references to elements inside the function to ensure they are available
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
    const matchForm = document.getElementById('matchForm'); // Ensure matchForm is accessible

    // Odstránenie predošlého poslucháča, aby sa predišlo viacnásobným priradeniam
    if (deleteMatchButtonModal && deleteMatchButtonModal._currentHandler) { // Check if element exists before accessing _currentHandler
        deleteMatchButtonModal.removeEventListener('click', deleteMatchButtonModal._currentHandler);
        delete deleteMatchButtonModal._currentHandler; // Clean up reference
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
        // If not editing, ensure no handler is mistakenly left
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
        // Ensure to pass select elements to populate functions
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
 * @param {string|null} blockedSlotId ID zablokovaného slotu, ak existuje (pre úpravu).
 */
async function openFreeSlotModal(date, location, startTime, endTime, blockedSlotId = null) {
    // Debugging logs
    console.log(`openFreeSlotModal: Volané pre Dátum: ${date}, Miesto: ${location}, Čas: ${startTime}-${endTime}, ID slotu: ${blockedSlotId}`);

    // Get references to elements inside the function to ensure they are available
    const freeSlotModal = document.getElementById('freeSlotModal');
    const freeSlotModalTitle = document.getElementById('freeSlotModalTitle');
    const freeSlotDateDisplay = document.getElementById('freeSlotDateDisplay');
    const freeSlotLocationDisplay = document.getElementById('freeSlotLocationDisplay');
    const freeSlotTimeRangeDisplay = document.getElementById('freeSlotTimeRangeDisplay');
    const freeSlotIdInput = document.getElementById('freeSlotId');
    
    // Získanie referencií na tlačidlá priamo z DOM
    const blockButton = document.getElementById('blockFreeSlotButton'); 
    const unblockButton = document.getElementById('unblockFreeSlotButton'); // This will be used for both Unblock and Delete Slot actions
    const deletePhantomButton = document.getElementById('phantomSlotDeleteButton'); 

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
    if (deletePhantomButton && deletePhantomButton._currentHandler) {
        deletePhantomButton.removeEventListener('click', deletePhantomButton._currentHandler);
        delete deletePhantomButton._currentHandler;
        console.log("openFreeSlotModal: Odstránený starý posluchovač pre 'deletePhantomButton'.");
    }


    // Nastaví ID slotu vo skrytom poli formulára
    freeSlotIdInput.value = blockedSlotId || '';
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
    if (deletePhantomButton) { 
        deletePhantomButton.style.display = 'none';
        deletePhantomButton.classList.remove('delete-button');
    }

    let isPhantom = false;
    let isUserBlockedFromDB = false;

    // Ak existuje blockedSlotId, skontroluje typ slotu
    if (blockedSlotId) {
        try {
            const blockedSlotDoc = await getDoc(doc(blockedSlotsCollectionRef, blockedSlotId));
            if (blockedSlotDoc.exists()) {
                const data = blockedSlotDoc.data();
                isPhantom = data.isPhantom === true;
                isUserBlockedFromDB = data.isBlocked === true;
                console.log(`openFreeSlotModal: Načítané dáta pre blockedSlotId=${blockedSlotId}: isPhantom=${isPhantom}, isBlocked=${isUserBlockedFromDB}`);
            } else {
                console.warn(`openFreeSlotModal: Dokument blockedSlotId=${blockedSlotId} neexistuje.`);
            }
        } catch (error) {
            console.error(`openFreeSlotModal: Chyba pri načítaní dokumentu pre blockedSlotId=${blockedSlotId}:`, error);
        }
    } else {
        console.log("openFreeSlotModal: blockedSlotId je null, jedná sa o nový vizuálny voľný slot.");
    }


    // Logika zobrazenia tlačidiel a titulku na základe typu slotu
    if (blockedSlotId === null) {
        // Skutočne prázdny interval (žiadne ID z datasetu, iba vizuálna medzera)
        freeSlotModalTitle.textContent = 'Spravovať voľný slot';
        console.log("openFreeSlotModal: Typ slotu: Skutočne prázdny vizuálny slot.");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať';
            const blockHandler = () => {
                console.log("openFreeSlotModal: Kliknuté na 'Zablokovať' pre nový voľný slot. Spúšťam createBlockedSlotAndRecalculate.");
                createBlockedSlotAndRecalculate(date, location, startTime, endTime);
            };
            blockButton.addEventListener('click', blockHandler);
            blockButton._currentHandler = blockHandler; 
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Zablokovať'.");
        }

        if (unblockButton) { 
            unblockButton.style.display = 'inline-block';
            unblockButton.textContent = 'Vymazať'; 
            unblockButton.classList.add('delete-button'); 
            const deleteHandler = () => { 
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať' pre vizuálny voľný interval. Spúšťam handleDeleteSlot.`);
                // Pass startTime and endTime for the visual gap
                handleDeleteSlot(blockedSlotId, date, location, startTime, endTime); // blockedSlotId will be null here
            };
            unblockButton.addEventListener('click', deleteHandler);
            unblockButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Vymazať'.");
        }
        // deletePhantomButton remains hidden

    } else if (isPhantom) {
        // Fantómový interval (zápas bol presunutý v rámci rovnakej haly/dňa, a zanechal za sebou tento DB záznam)
        freeSlotModalTitle.textContent = 'Spravovať fantómový slot';
        console.log("openFreeSlotModal: Typ slotu: Fantómový slot (temporary).");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať'; // Konvertuje fantóm na riadny zablokovaný
            const blockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Zablokovať' pre fantómový interval ID: ${blockedSlotId}. Spúšťam convertToRegularBlockedSlot.`);
                convertToRegularBlockedSlot(blockedSlotId, date, location);
            };
            blockButton.addEventListener('click', blockHandler);
            blockButton._currentHandler = blockHandler; 
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Zablokovať' pre fantómový slot.");
        }

        if (deletePhantomButton) {
            deletePhantomButton.style.display = 'inline-block';
            deletePhantomButton.textContent = 'Vymazať'; // Odstráni DB záznam pre fantóm
            deletePhantomButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať' pre fantómový interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deletePhantomButton.addEventListener('click', deleteHandler);
            deletePhantomButton._currentHandler = deleteHandler; 
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Vymazať' pre fantómový slot.");
        }
        if (unblockButton) { unblockButton.style.display = 'none'; } // This button is not for phantoms

    } else if (isUserBlockedFromDB) {
        // Normálny zablokovaný interval (blokovaný používateľom)
        freeSlotModalTitle.textContent = 'Upraviť zablokovaný slot';
        console.log("openFreeSlotModal: Typ slotu: Normálny zablokovaný slot (user blocked).");
        
        if (blockButton) blockButton.style.display = 'none'; // Already blocked

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
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Odblokovať'.");
        }
        if (deletePhantomButton) {
            deletePhantomButton.style.display = 'inline-block';
            deletePhantomButton.textContent = 'Vymazať slot'; // Completely deletes the user blocked slot from DB
            deletePhantomButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať slot' pre zablokovaný interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            deletePhantomButton.addEventListener('click', deleteHandler);
            deletePhantomButton._currentHandler = deleteHandler;
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Vymazať slot'.");
        }

    } else { // It's a placeholder empty slot (isBlocked === false and isPhantom === false)
        freeSlotModalTitle.textContent = 'Spravovať voľný interval'; // More neutral title
        console.log("openFreeSlotModal: Typ slotu: Placeholder voľný interval (cross-move result).");
        
        if (blockButton) {
            blockButton.style.display = 'inline-block';
            blockButton.textContent = 'Zablokovať'; // Changes isBlocked to true
            const reblockHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Zablokovať' (re-blokovať) pre odblokovaný interval ID: ${blockedSlotId}. Spúšťam reblockUnblockedSlot.`);
                reblockUnblockedSlot(blockedSlotId, date, location);
            };
            blockButton.addEventListener('click', reblockHandler);
            blockButton._currentHandler = reblockHandler;
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Zablokovať' pre placeholder slot.");
        }

        if (unblockButton) { // Renamed to unblockButton
            unblockButton.style.display = 'inline-block';
            unblockButton.textContent = 'Vymazať slot'; // Completely deletes the placeholder slot from DB
            unblockButton.classList.add('delete-button');
            const deleteHandler = () => {
                console.log(`openFreeSlotModal: Kliknuté na 'Vymazať slot' pre placeholder interval ID: ${blockedSlotId}. Spúšťam handleDeleteSlot.`);
                handleDeleteSlot(blockedSlotId, date, location);
            };
            unblockButton.addEventListener('click', deleteHandler);
            unblockButton._currentHandler = deleteHandler;
            console.log("openFreeSlotModal: Pridaný poslucháč a zobrazené tlačidlo 'Vymazať slot' pre placeholder slot.");
        }
        if (deletePhantomButton) { deletePhantomButton.style.display = 'none'; } // This button is not for placeholders
    }

    openModal(freeSlotModal); // Otvorí modálne okno
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
    const freeSlotModal = document.getElementById('freeSlotModal'); // Get reference here
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete tento fantómový interval zablokovať?');
    console.log(`convertToRegularBlockedSlot: Potvrdenie prijaté: ${confirmed}`);

    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, blockedSlotId);
            console.log(`convertToRegularBlockedSlot: Pokúšam sa aktualizovať interval ID: ${blockedSlotId} na isPhantom: false, isBlocked: true`);
            await setDoc(slotRef, { isPhantom: false, isBlocked: true }, { merge: true }); // Zmení isPhantom na false a isBlocked na true
            console.log(`convertToRegularBlockedSlot: Slot ID: ${blockedSlotId} úspešne aktualizovaný.`);
            await showMessage('Úspech', 'Fantómový interval bol úspešne zablokovaný!');
            closeModal(freeSlotModal);
            console.log("convertToRegularBlockedSlot: Modálne okno zatvorené.");
            await recalculateAndSaveScheduleForDateAndLocation(date, location); // Prepočíta rozvrh
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
    const freeSlotModal = document.getElementById('freeSlotModal'); // Get reference here
    const freeSlotIdInput = document.getElementById('freeSlotId'); 

    const slotData = {
        date: date,
        location: location,
        startTime: startTime,
        endTime: endTime,
        startInMinutes: (parseInt(startTime.split(':')[0]) * 60) + parseInt(startTime.split(':')[1]),
        endInMinutes: (parseInt(endTime.split(':')[0]) * 60) + parseInt(endTime.split(':')[1]),
        isPhantom: false, // Explicitne false pre novo vytvorený slot
        isBlocked: true,  // Explicitne true pre novo vytvorený slot
        createdAt: new Date()
    };

    try {
        // Pred pridaním alebo úpravou zablokovaného slotu skontrolujte prekrývanie s existujúcimi zápasmi a inými zablokovanými slotmi.
        const newSlotStart = slotData.startInMinutes;
        const newSlotEnd = slotData.endInMinutes;

        // 1. Získajte všetky existujúce zápasy pre daný dátum a miesto
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

        // 2. Získajte všetky existujúce AKTÍVNE zablokované sloty (okrem toho, ktorý možno práve upravujeme)
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
            .filter(bs => bs.id !== freeSlotIdInput.value && (bs.isBlocked === true || bs.isPhantom === true)); // Vylúčte aktuálne upravovaný interval a filtrujte len aktívne/fantóm

        // Funkcia na kontrolu prekrývania
        const isOverlapping = (slot1Start, slot1End, slot2Start, slot2End) => {
            return (slot1Start < slot2End && slot1End > slot2Start);
        };

        let overlapFound = false;
        let overlapDetails = null;

        // Kontrola prekrývania s existujúcimi zápasmi
        for (const match of matchesForLocationAndDate) {
            if (isOverlapping(newSlotStart, newSlotEnd, match.start, match.end)) {
                overlapFound = true;
                overlapDetails = { type: 'zápas', start: match.start, end: match.end };
                break;
            }
        }

        // Kontrola prekrývania s inými AKTÍVNYMI zablokovanými slotmi (ak sa ešte nenašlo prekrývanie so zápasom)
        if (!overlapFound) {
            for (const blockedSlot of otherActiveBlockedSlotsForLocationAndDate) { // Iterate over filtered array
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
            return; // Zastaviť operáciu uloženia
        }

        console.log(`createBlockedSlotAndRecalculate: Pokúšam sa pridať nový zablokovaný slot:`, slotData);
        await addDoc(blockedSlotsCollectionRef, slotData);
        console.log(`createBlockedSlotAndRecalculate: Nový zablokovaný interval úspešne pridaný.`);
        await showMessage('Úspech', 'Slot bol úspešne zablokovaný!');
        
        closeModal(freeSlotModal);
        await recalculateAndSaveScheduleForDateAndLocation(date, location); // Recalculate after blocking
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
    const freeSlotModal = document.getElementById('freeSlotModal'); // Get reference here
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete odblokovať tento slot? Zápasy sa môžu teraz naplánovať do tohto času.');
    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, slotId);
            console.log(`unblockBlockedSlot: Pokúšam sa aktualizovať interval ID: ${slotId} na isBlocked: false, isPhantom: false`);
            await setDoc(slotRef, { isBlocked: false, isPhantom: false }, { merge: true }); // Odblokovať a zabezpečiť, že nie je fantóm
            console.log(`unblockBlockedSlot: Interval ID: ${slotId} úspešne odblokovaný.`);
            await showMessage('Úspech', 'Slot bol úspešne odblokovaný!');
            closeModal(freeSlotModal);
            // After unblocking, we should recalculate the schedule for this date/location,
            // as this space might now be available for existing matches to shift into.
            await recalculateAndSaveScheduleForDateAndLocation(date, location); 
            console.log("unblockBlockedSlot: Zobrazenie rozvrhu obnovené a prepočítané.");
        } catch (error) {
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
    const freeSlotModal = document.getElementById('freeSlotModal'); // Get reference here
    const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete tento interval opäť zablokovať?');
    if (confirmed) {
        try {
            const slotRef = doc(blockedSlotsCollectionRef, slotId);
            // Pred opätovným zablokovaním skontrolujte prekrývanie s existujúcimi zápasmi
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
            await setDoc(slotRef, { isBlocked: true, isPhantom: false }, { merge: true }); // Znovu zablokovať
            console.log(`reblockUnblockedSlot: Interval ID: ${slotId} úspešne znovu zablokovaný.`);
            await showMessage('Úspech', 'Slot bol úspešne znovu zablokovaný!');
            closeModal(freeSlotModal);
            await recalculateAndSaveScheduleForDateAndLocation(date, location); // Prepočíta rozvrh
            console.log("reblockUnblockedSlot: Prepočet rozvrhu dokončený.");
        } catch (error) {
            console.error("Chyba pri opätovnom zablokovaní slotu:", error);
            await showMessage('Chyba', `Chyba pri opätovnom zablokovaní slotu: ${error.message}`);
        }
    }
}


/**
 * Odstráni (vymaže) interval a prepočíta rozvrh. Používa sa pre "Vymazať" (voľný slot) aj "Vymazať slot" (fantóm/odblokovaný slot).
 * @param {string|null} slotId ID slotu na vymazanie. Ak je null (pre voľný slot, ktorý nemá DB záznam), nič sa nevymaže z DB, len sa prepočíta.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
 * @param {string|null} visualGapStartTime Voliteľné: Čas začiatku vizuálnej medzery (ak slotId je null).
 * @param {string|null} visualGapEndTime Voliteľné: Čas konca vizuálnej medzery (ak slotId je null).
 */
async function handleDeleteSlot(slotId, date, location, visualGapStartTime = null, visualGapEndTime = null) {
    console.log(`handleDeleteSlot: === SPUŠTENÁ FUNKCIA NA SPRACovanie VYMAZANIA SLOTU ===`);
    console.log(`handleDeleteSlot: ID slotu: ${slotId}, Dátum: ${date}, Miesto: ${location}, Visual Gap Start: ${visualGapStartTime}, Visual Gap End: ${visualGapEndTime}`);
    const freeSlotModal = document.getElementById('freeSlotModal');

    // Confirm deletion with the user
    let confirmationMessage = 'Naozaj chcete vymazať tento interval?';
    if (slotId === null) {
        confirmationMessage = 'Naozaj chcete odstrániť túto voľnú medzeru a prípadne posunúť nasledujúce zápasy?';
    } else {
        confirmationMessage = 'Naozaj chcete vymazať tento interval z databázy?';
    }

    const confirmed = await showConfirmation('Potvrdenie vymazania', confirmationMessage);
    if (!confirmed) {
        console.log(`handleDeleteSlot: Vymazanie zrušené používateľom.`);
        return;
    }

    try {
        const batch = writeBatch(db); // Use batch for potentially multiple operations

        if (slotId) { // If it's a DB-backed slot (blocked, phantom, or placeholder)
            console.log(`handleDeleteSlot: Pokúšam sa vymazať dokument blockedSlot ID: ${slotId}`);
            batch.delete(doc(blockedSlotsCollectionRef, slotId));
            await showMessage('Úspech', 'Slot bol úspešne vymazaný z databázy!');
        } else { // It's a purely visual "Voľný slot dostupný"
            console.log(`handleDeleteSlot: Vizuálny voľný interval, bez DB záznamu na vymazanie. Hľadám priľahlý slot na vymazanie.`);
            // Calculate the start of the next potential event (which would be the end of this visual gap)
            const nextEventStartTimeInMinutes = (parseInt(visualGapEndTime.split(':')[0]) * 60) + parseInt(visualGapEndTime.split(':')[1]);

            // Query for any phantom or placeholder slot that starts *exactly* at this visual gap's end time
            const adjacentSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", date),
                where("location", "==", location),
                where("startInMinutes", "==", nextEventStartTimeInMinutes)
            );
            const adjacentSlotsSnapshot = await getDocs(adjacentSlotsQuery);

            let adjacentSlotToDeleteId = null;
            if (!adjacentSlotsSnapshot.empty) {
                // Find the first adjacent slot that is either a phantom or a non-blocked placeholder
                adjacentSlotsSnapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.isPhantom === true || data.isBlocked === false) { // This is a phantom or a placeholder that can be removed
                        adjacentSlotToDeleteId = docSnap.id;
                        console.log(`handleDeleteSlot: Nájdený priľahlý slot na vymazanie: ID ${adjacentSlotToDeleteId}, typ: ${data.isPhantom ? 'fantóm' : 'placeholder'}`);
                        return; // Found one, can stop
                    }
                });
            }

            if (adjacentSlotToDeleteId) {
                // If an adjacent phantom/placeholder is found, delete it from the batch
                batch.delete(doc(blockedSlotsCollectionRef, adjacentSlotToDeleteId));
                await showMessage('Úspech', 'Priľahlý interval bol odstránený. Rozvrh sa prepočítava!');
            } else {
                await showMessage('Úspech', 'Voľný interval odstránený. Rozvrh sa prepočítava pre posun zápasov!');
            }
        }

        // Commit all batched operations (deletion and/or update)
        await batch.commit();
        console.log("handleDeleteSlot: Batch commit successful.");

        closeModal(freeSlotModal);
        // After any deletion or shift, recalculate the schedule to re-render it correctly
        await recalculateAndSaveScheduleForDateAndLocation(date, location);
        console.log("handleDeleteSlot: Prepočet rozvrhu dokončený.");

    } catch (error) {
        console.error("handleDeleteSlot: Chyba pri odstraňovaní/posúvaní slotu:", error);
        await showMessage('Chyba', `Chyba pri odstraňovaní/posúvaní slotu: ${error.message}`);
    }
}


/**
 * Zmaže zápas z Firestore.
 * @param {string} matchId ID zápasu na zmazanie.
 */
async function deleteMatch(matchId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento zápas?');
    if (confirmed) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);
            let date = null;
            let location = null;
            if (matchDoc.exists()) {
                date = matchDoc.data().date;
                location = matchDoc.data().location;
            }

            console.log(`deleteMatch: Pokúšam sa vymazať dokument zápasu ID: ${matchId}`);
            await deleteDoc(matchDocRef);
            console.log(`deleteMatch: Dokument zápasu ID: ${matchId} úspešne vymazaný.`);
            await showMessage('Úspech', 'Zápas vymazaný!');
            closeModal(document.getElementById('matchModal'));
            
            // Only recalculate if date and location are known, which they should be
            if (date && location) {
                console.log(`deleteMatch: Spúšťam prepočet rozvrhu pre dátum: ${date}, miesto: ${location}`);
                await recalculateAndSaveScheduleForDateAndLocation(date, location);
            } else {
                console.warn('deleteMatch: Chýbajú dáta o dátume alebo mieste zápasu, len obnovujem zobrazenie rozvrhu.');
                // Fallback if match details are missing for some reason
                displayMatchesAsSchedule(); 
            }

        }
        catch (error) {
            console.error("Chyba pri mazaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri mazaní zápasu. Detail: ${error.message}`);
        }
    }
}

/**
 * Vyčistí (vymaže) všetky Zvyšné fantómové sloty (`isPhantom: true`)
 * a placeholder sloty (`isBlocked: false, isPhantom: false`) na konci každého dňa a miesta pri načítaní stránky.
 */
async function cleanupTrailingBlockedSlotsOnLoad() {
    console.log("cleanupTrailingBlockedSlotsOnLoad: Spustená funkcia pre čistenie koncových slotov.");
    try {
        const allPlayingDayDatesSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const allPlayingDayDates = allPlayingDayDatesSnapshot.docs.map(doc => doc.data().date);

        const allSportHallsSnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
        const allSportHalls = allSportHallsSnapshot.docs.map(doc => doc.data().name);

        const cleanupBatch = writeBatch(db);
        let cleanedCount = 0;

        for (const date of allPlayingDayDates) {
            for (const location of allSportHalls) {
                console.log(`cleanupTrailingBlockedSlotsOnLoad: Kontrolujem dátum: ${date}, miesto: ${location}`);

                // 1. Získajte všetky zápasy pre aktuálny dátum a miesto
                const matchesQuery = query(matchesCollectionRef, where("date", "==", date), where("location", "==", location), orderBy("startTime", "asc"));
                const matchesSnapshot = await getDocs(matchesQuery);
                const matchesForLocationAndDate = matchesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const [startH, startM] = data.startTime.split(':').map(Number);
                    const startInMinutes = startH * 60 + startM;
                    const duration = Number(data.duration) || 0;
                    const bufferTime = Number(data.bufferTime) || 0;
                    const endInMinutes = startInMinutes + duration + bufferTime;
                    return { start: startInMinutes, end: endInMinutes, id: doc.id, type: 'match' };
                });

                // 2. Získajte všetky zablokované sloty (vrátane fantómov a odblokovaných)
                const blockedSlotsQuery = query(blockedSlotsCollectionRef, where("date", "==", date), where("location", "==", location), orderBy("startTime", "asc"));
                const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
                const allBlockedSlotsForLocationAndDate = blockedSlotsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const [startH, startM] = data.startTime.split(':').map(Number);
                    const startInMinutes = startH * 60 + startM;
                    const [endH, endM] = data.endTime.split(':').map(Number);
                    const endInMinutes = endH * 60 + endM;
                    return { start: startInMinutes, end: endInMinutes, id: doc.id, type: 'blocked_slot', isPhantom: data.isPhantom === true, isBlocked: data.isBlocked === true };
                });

                // Spojte zápasy a *aktívne* zablokované sloty pre určenie poslednej udalosti
                const activeEvents = [
                    ...matchesForLocationAndDate,
                    ...allBlockedSlotsForLocationAndDate.filter(s => s.isBlocked === true) // Only user-blocked are truly active obstacles
                ];
                activeEvents.sort((a, b) => a.start - b.start);

                let lastEventEndMinutes = await getInitialScheduleStartMinutes(date); // Default to start of day

                if (activeEvents.length > 0) {
                    lastEventEndMinutes = activeEvents.reduce((maxEnd, event) => Math.max(maxEnd, event.end), lastEventEndMinutes);
                }
                console.log(`cleanupTrailingBlockedSlotsOnLoad: Posledný koniec udalosti pre ${date}, ${location}: ${lastEventEndMinutes} minút`);

                // Vymažte *všetky* fantómové sloty A placeholder sloty, ktoré začínajú na alebo po `lastEventEndMinutes`
                allBlockedSlotsForLocationAndDate.forEach(slot => {
                    if (slot.startInMinutes >= lastEventEndMinutes && (slot.isPhantom === true || slot.isBlocked === false)) { // Check if it's after the last active event AND is a phantom or placeholder
                        console.log(`cleanupTrailingBlockedSlotsOnLoad: Označený na vymazanie koncový slot: ID ${slot.id}, typ: ${slot.isPhantom ? 'fantóm' : 'placeholder'}, začiatok: ${slot.startTime}`);
                        cleanupBatch.delete(doc(blockedSlotsCollectionRef, slot.id));
                        cleanedCount++;
                    }
                });
            }
        }
        if (cleanedCount > 0) {
            await cleanupBatch.commit();
            console.log(`cleanupTrailingBlockedSlotsOnLoad: Úspešne vymazaných ${cleanedCount} koncových fantómových a placeholder slotov.`);
        } else {
            console.log("cleanupTrailingBlockedSlotsOnLoad: Žiadne koncové fantómové ani placeholder sloty na vymazanie.");
        }

    } catch (error) {
        console.error("cleanupTrailingBlockedSlotsOnLoad: Chyba pri čistení koncových voľných slotov:", error);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Get all DOM element references INSIDE the DOMContentLoaded listener
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
    // Removed direct references to blockFreeSlotButton and unblockFreeSlotButton here
    // as they will be re-obtained and re-assigned handlers within openFreeSlotModal


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
    await cleanupTrailingBlockedSlotsOnLoad(); // Clean up old phantom slots first
    await displayMatchesAsSchedule();


    // Poslucháči udalostí pre tlačidlo "Pridať" a jeho možnosti
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Zabráňte okamžitému zatvoreniu možností kliknutím na dokument
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
        // Ensure no old handler is present before opening for add
        if (deletePlayingDayButtonModal && deletePlayingDayButtonModal._currentHandler) { // Check if handler exists before removing
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
        // Ensure no old handler is present before opening for add
        // OPRAVA PREKLEPU: Zmenené deletePlaceButtonButtonModal na deletePlaceButtonModal
        if (deletePlaceButtonModal && deletePlaceButtonModal._currentHandler) { // Check if handler exists before removing
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
            team2NumberInput.value = '';
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
        let existingDuplicateMatchId = null; // Store ID of the duplicate match
        let existingDuplicateMatchDetails = null; // Store details of the duplicate match

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
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return;
                }
            });

            // Kontrola prekrývania so zablokovanými slotmi (len aktívne alebo fantómy)
            const blockedSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
            blockedSlotsSnapshot.docs.forEach(doc => {
                const blockedSlot = doc.data();
                // Len ak je interval aktívne zablokovaný alebo je fantóm
                if (blockedSlot.isBlocked === true || blockedSlot.isPhantom === true) { 
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
                const existingMatchEndTimeObj = new Date();
                // If it's a blocked slot, use its endTime, otherwise calculate from duration
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
            if (currentMatchId && !existingDuplicateMatchId) { // Len aktualizujte, ak ide o úpravu A nebola to náhrada duplikátu
                console.log(`Ukladám existujúci zápas ID: ${currentMatchId}`, matchData);
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!'); 
            } else { // Toto zahŕňa nové zápasy A prípady, keď bol starý zápas nahradený
                console.log(`Pridávam nový zápas:`, matchData);
                await addDoc(matchesCollectionRef, matchData);
                await showMessage('Úspech', 'Zápas úspešne pridaný!'); 
            }
            closeModal(matchModal);
            await recalculateAndSaveScheduleForDateAndLocation(matchDate, matchLocationName); // Recalculate after match is added/updated
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
