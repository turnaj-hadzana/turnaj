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
    const selectedCategoryId = document.getElementById('matchCategory').value;
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');

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
 * Nájde prvý dostupný časový slot pre zápas na základe dátumu, miesta, trvania a časovej rezervy.
 * Prioritou je nájsť voľný slot, ktorý má presne takú dĺžku, akú vyžaduje zápas (trvanie).
 * Ak taký slot neexistuje, čas sa nastaví hneď po poslednom existujúcom zápase v daný deň a na danom mieste,
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
        });
        console.log("Blocked Slots for selected Location and Date:", blockedSlotsForLocationAndDate);


        let exactMatchDurationFound = false;
        let bestCandidateStartTimeInMinutes = -1;

        // Function to check if a time slot overlaps with any existing match or blocked slot
        const isSlotAvailable = (candidateStart, candidateEnd) => {
            // Check against existing matches
            for (const match of matchesForLocationAndDate) {
                if (candidateStart < match.end && candidateEnd > match.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with existing match ${match.start}-${match.end}`);
                    return false; // Overlaps with an existing match
                }
            }
            // Check against blocked slots
            for (const blockedSlot of blockedSlotsForLocationAndDate) {
                if (candidateStart < blockedSlot.end && candidateEnd > blockedSlot.start) {
                    console.log(`Slot ${candidateStart}-${candidateEnd} overlaps with blocked slot ${blockedSlot.start}-${blockedSlot.end}`);
                    return false; // Overlaps with a blocked slot
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
 * Prepočíta a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * pričom rešpektuje zablokované sloty a zachováva relatívne poradie presunutých zápasov.
 * @param {string} draggedMatchId ID presunutého zápasu.
 * @param {string} targetDate Dátum cieľového miesta.
 * @param {string} targetLocation Miesto cieľového miesta.
 * @param {string|null} droppedProposedStartTime HH:MM string pre navrhovaný čas začiatku presunutého zápasu, alebo null pre pripojenie na koniec.
 */
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedProposedStartTime = null) {
    try {
        const draggedMatchDocRef = doc(matchesCollectionRef, draggedMatchId);
        const draggedMatchDoc = await getDoc(draggedMatchDocRef);
        if (!draggedMatchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            return;
        }
        const movedMatchData = { id: draggedMatchDoc.id, type: 'match', ...draggedMatchDoc.data() };

        const originalDate = movedMatchData.date;
        const originalLocation = movedMatchData.location;
        const isMovingWithinSameSchedule = (originalDate === targetDate && originalLocation === targetLocation);

        const batch = writeBatch(db);

        // 1. If moving across dates/locations, delete the original match document.
        if (!isMovingWithinSameSchedule) {
            batch.delete(draggedMatchDocRef);
        }

        // 2. Get category settings for the moved match to ensure correct duration/buffer.
        const categorySettings = await getCategoryMatchSettings(movedMatchData.categoryId);
        movedMatchData.duration = categorySettings.duration;
        movedMatchData.bufferTime = categorySettings.bufferTime;
        
        // 3. Fetch all matches (excluding the dragged one if in the same schedule) and all blocked slots for the target date and location.
        const targetMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", targetDate),
            where("location", "==", targetLocation)
        );
        const targetMatchesSnapshot = await getDocs(targetMatchesQuery);
        let targetMatches = targetMatchesSnapshot.docs
            .map(doc => ({ id: doc.id, type: 'match', ...doc.data() }))
            .filter(match => match.id !== draggedMatchId); // Exclude the dragged match itself

        const targetBlockedSlotsQuery = query(
            blockedSlotsCollectionRef,
            where("date", "==", targetDate),
            where("location", "==", targetLocation)
        );
        const targetBlockedSlotsSnapshot = await getDocs(targetBlockedSlotsQuery);
        let targetBlockedSlots = targetBlockedSlotsSnapshot.docs
            .map(doc => ({ 
                id: doc.id, 
                type: 'blocked_slot', 
                ...doc.data(),
                startInMinutes: (parseInt(doc.data().startTime.split(':')[0]) * 60) + parseInt(doc.data().startTime.split(':')[1]),
                endInMinutes: (parseInt(doc.data().endTime.split(':')[0]) * 60) + parseInt(doc.data().endTime.split(':')[1])
            }));

        // 4. Determine the initial start time for the target day based on global settings.
        const settingsDoc = await getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID));
        let firstDayStartTime = '08:00';
        let otherDaysStartTime = '08:00';
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            firstDayStartTime = data.firstDayStartTime || '08:00';
            otherDaysStartTime = data.otherDaysStartTime || '08:00';
        }
        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && targetDate === sortedPlayingDays[0];
        const initialScheduleStartMinutes = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number).reduce((h, m) => h * 60 + m);

        // 5. Determine the *proposed* start time for the dragged match in minutes.
        let movedMatchProposedStartMinutes;
        if (droppedProposedStartTime) {
            movedMatchProposedStartMinutes = (parseInt(droppedProposedStartTime.split(':')[0]) * 60) + parseInt(droppedProposedStartTime.split(':')[1]);
        } else {
            // If droppedProposedStartTime is null, it means append to the end.
            // Find the end time of the last event in the current target schedule.
            let lastEventEndMinutes = initialScheduleStartMinutes;
            if (targetMatches.length > 0 || targetBlockedSlots.length > 0) {
                // Combine and sort temporarily to find the true last event
                const tempCombined = [...targetMatches, ...targetBlockedSlots].sort((a, b) => {
                    const aStart = a.type === 'match' ? (parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1])) : a.startInMinutes;
                    const bStart = b.type === 'match' ? (parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1])) : b.startInMinutes;
                    return aStart - bStart;
                });
                const lastEvent = tempCombined[tempCombined.length - 1];
                if (lastEvent.type === 'match') {
                    const [h, m] = lastEvent.startTime.split(':').map(Number);
                    lastEventEndMinutes = (h * 60 + m) + (lastEvent.duration || 0) + (lastEvent.bufferTime || 0);
                } else { // blocked_slot
                    lastEventEndMinutes = lastEvent.endInMinutes;
                }
            }
            movedMatchProposedStartMinutes = lastEventEndMinutes;
        }
        
        // 6. Create a combined list of all events for rescheduling, including the moved match.
        let eventsToReschedule = [];
        
        // Add existing matches, calculate their startInMinutes for sorting
        targetMatches.forEach(match => {
            const [h,m] = match.startTime.split(':').map(Number);
            eventsToReschedule.push({ ...match, startInMinutes: (h * 60 + m) });
        });

        // Add blocked slots (they already have startInMinutes/endInMinutes)
        targetBlockedSlots.forEach(slot => {
            eventsToReschedule.push({ ...slot });
        });

        // Add the moved match, assign its proposed start time in minutes
        movedMatchData.startInMinutes = movedMatchProposedStartMinutes;
        eventsToReschedule.push({ ...movedMatchData });

        // Sort all events by their startInMinutes. This ensures the dragged match
        // is conceptually placed at its dropped location relative to others.
        eventsToReschedule.sort((a, b) => a.startInMinutes - b.startInMinutes);


        // 7. Iterate through the sorted events and re-calculate actual start times for matches.
        let currentSchedulePointer = initialScheduleStartMinutes; // Start from the beginning of the day

        for (let i = 0; i < eventsToReschedule.length; i++) {
            const event = eventsToReschedule[i];

            if (event.type === 'blocked_slot') {
                // Blocked slots keep their original fixed times.
                // Just ensure our pointer moves past them if they are in the way.
                currentSchedulePointer = Math.max(currentSchedulePointer, event.endInMinutes);
            } else if (event.type === 'match') {
                const matchRef = doc(matchesCollectionRef, event.id);

                // The match's actual start time will be at least the current schedule pointer.
                // It also needs to be at least its own proposed start time if it's the dragged match
                // or if it was an existing match that needs to maintain its relative order.
                let newMatchStartTimeInMinutes = Math.max(currentSchedulePointer, event.startInMinutes);

                // Ensure no overlap with the immediately preceding event (if it's a blocked slot)
                if (i > 0) {
                    const prevEvent = eventsToReschedule[i-1];
                    if (prevEvent.type === 'blocked_slot') {
                        newMatchStartTimeInMinutes = Math.max(newMatchStartTimeInMinutes, prevEvent.endInMinutes);
                    } else if (prevEvent.type === 'match') {
                        // Calculate end time of previous match to ensure no overlap
                        const prevMatchEndMinutes = prevEvent.startInMinutes + (prevEvent.duration || 0) + (prevEvent.bufferTime || 0);
                        newMatchStartTimeInMinutes = Math.max(newMatchStartTimeInMinutes, prevMatchEndMinutes);
                    }
                }
                
                // If this is the dragged match, its proposed start time (from the drop) takes precedence
                // only if it's later than the calculated current pointer.
                if (event.id === draggedMatchId) {
                    newMatchStartTimeInMinutes = Math.max(newMatchStartTimeInMinutes, movedMatchProposedStartMinutes);
                }


                // Convert new start time back to HH:MM string
                const newStartTimeStr = `${String(Math.floor(newMatchStartTimeInMinutes / 60)).padStart(2, '0')}:${String(newMatchStartTimeInMinutes % 60).padStart(2, '0')}`;

                const matchDataToUpdate = {
                    date: targetDate,
                    location: targetLocation,
                    startTime: newStartTimeStr,
                    duration: event.duration,
                    bufferTime: event.bufferTime,
                    // Keep other match data
                    categoryId: event.categoryId,
                    categoryName: event.categoryName,
                    groupId: event.groupId,
                    groupName: event.groupName,
                    team1Category: event.team1Category,
                    team1Group: event.team1Group,
                    team1Number: event.team1Number,
                    team1DisplayName: event.team1DisplayName,
                    team1ClubName: event.team1ClubName,
                    team1ClubId: event.team1ClubId,
                    team2Category: event.team2Category,
                    team2Group: event.team2Group,
                    team2Number: event.team2Number,
                    team2DisplayName: event.team2DisplayName,
                    team2ClubName: event.team2ClubName,
                    team2ClubId: event.team2ClubId,
                    createdAt: event.createdAt // Preserve original creation time
                };

                batch.set(matchRef, matchDataToUpdate, { merge: true });
                currentSchedulePointer = newMatchStartTimeInMinutes + event.duration + event.bufferTime;
            }
        }
        
        await batch.commit();
        await displayMatchesAsSchedule();
        await showMessage('Úspech', 'Zápas úspešne presunutý a rozvrh prepočítaný!');

    } catch (error) {
        console.error("Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule(); // Obnoviť, aby sa zobrazil aktuálny stav aj pri chybe
    }
}


/**
 * Zobrazí kompletný rozvrh zápasov. Autobusové trasy a ubytovanie odstránené.
 * Zmenené na zobrazenie tabuľky (jeden riadok na zápas).
 */
async function displayMatchesAsSchedule() {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    matchesContainer.innerHTML = '';
    matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam zoznam zápasov...</p>');

    try {
        // Načítajte všetky údaje potrebné pre rozvrh
        const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
        const matchesSnapshot = await getDocs(matchesQuery);
        let allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané zápasy:", allMatches);

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

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
        console.log("displayMatchesAsSchedule: Načítané hracie dni (len dátumy):", existingPlayingDays);

        const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        const existingPlacesData = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané miesta:", existingPlacesData);

        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        let globalFirstDayStartTime = '08:00';
        let globalOtherDaysStartTime = '08:00';
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            globalFirstDayStartTime = data.firstDayStartTime || '08:00';
            globalOtherDaysStartTime = data.otherDaysStartTime || '08:00';
        }

        // Načítajte zablokované sloty pre všetky zobrazené dátumy a miesta
        const blockedSlotsSnapshot = await getDocs(query(blockedSlotsCollectionRef));
        const allBlockedSlots = blockedSlotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané zablokované sloty:", allBlockedSlots);


        // Zoskupte zápasy najprv podľa miesta, potom podľa dátumu
        const groupedMatchesByLocation = new Map(); // Kľúč: "miesto", Hodnota: Mapa (Kľúč: "dátum", Hodnota: Pole zápasov)
        allMatches.forEach(match => {
            if (match.locationType === 'Športová hala') { // Zobrazovať iba zápasy v športových halách
                const location = match.location;
                const date = match.date;

                if (!groupedMatchesByLocation.has(location)) {
                    groupedMatchesByLocation.set(location, new Map());
                }
                const matchesByDate = groupedMatchesByLocation.get(location);
                if (!matchesByDate.has(date)) {
                    matchesByDate.set(date, []);
                }
                matchesByDate.get(date).push(match);
            }
        });

        let scheduleHtml = '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start;">'; // Hlavný flex kontajner

        // Zoraďte miesta abecedne
        const sortedLocations = Array.from(groupedMatchesByLocation.keys()).sort((a, b) => a.localeCompare(b));

        if (sortedLocations.length === 0) {
            scheduleHtml += '<p>Žiadne zápasy na zobrazenie. Pridajte nové zápasy pomocou tlačidla "+".</p>';
        } else {
            for (const location of sortedLocations) { // Použite for...of pre asynchrónne vnútorné slučky
                const matchesByDateForLocation = groupedMatchesByLocation.get(location);
                // Zoraďte dátumy v rámci každého miesta
                const sortedDatesForLocation = Array.from(matchesByDateForLocation.keys()).sort((a, b) => a.localeCompare(b));

                // Určite jedinečné skupiny pre logiku zarovnania pre celé miesto
                const uniqueGroupIdsInLocation = new Set();
                sortedDatesForLocation.forEach(date => {
                    matchesByDateForLocation.get(date).forEach(match => {
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


                // Flex položka pre každú skupinu miest
                scheduleHtml += `<div class="location-group" style="flex: 1 1 45%; min-width: 300px; margin-bottom: 0; border: 1px solid #ccc; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">`;
                scheduleHtml += `<h2 style="background-color: #007bff; color: white; padding: 18px; margin: 0; text-align: center;">${location}</h2>`;

                for (const date of sortedDatesForLocation) { // Použite for...of pre asynchrónne vnútorné slučky
                    const matchesForDateAndLocation = matchesByDateForLocation.get(date);

                    // Zoraďte zápasy podľa času začiatku
                    matchesForDateAndLocation.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    const displayDateObj = new Date(date);
                    const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                    const dayName = displayDateObj.toLocaleDateString('sk-SK', { weekday: 'long' });

                    scheduleHtml += `<div class="date-group" data-date="${date}" data-location="${location}" style="margin: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">`;
                    scheduleHtml += `<h3 style="background-color: #f7f7f7; padding: 15px; margin: 0; border-bottom: 1px solid #ddd;">${dayName}, ${formattedDisplayDate}</h3>`;
                    scheduleHtml += `<table class="data-table match-list-table compact-table" style="width: 100%; border-collapse: collapse;">`;
                    scheduleHtml += `<thead><tr>`;
                    scheduleHtml += `<th>Čas</th>`;
                    scheduleHtml += `<th>Domáci klub</th>`;
                    scheduleHtml += `<th>Hostia klub</th>`;
                    scheduleHtml += `<th>ID Domáci</th>`;
                    scheduleHtml += `<th>ID Hostia</th>`;
                    scheduleHtml += `</tr></thead><tbody>`;

                    // Určite počiatočný čas pre tento konkrétny dátum
                    const isFirstPlayingDayForDate = existingPlayingDays.length > 0 && date === existingPlayingDays[0];
                    let currentTimePointer = isFirstPlayingDayForDate ? globalFirstDayStartTime : globalOtherDaysStartTime;
                    
                    for (let i = 0; i < matchesForDateAndLocation.length; i++) {
                        const match = matchesForDateAndLocation[i];
                        const [matchStartH, matchStartM] = match.startTime.split(':').map(Number);
                        const currentMatchStartInMinutes = matchStartH * 60 + matchStartM;

                        let [pointerH, pointerM] = currentTimePointer.split(':').map(Number);
                        let currentTimePointerInMinutes = pointerH * 60 + pointerM;

                        // Iterujte cez časové sloty medzi currentTimePointer a začiatkom aktuálneho zápasu
                        // Ak je pred aktuálnym zápasom prázdny slot, skontrolujte, či nejaká jeho časť nie je zablokovaná
                        while (currentTimePointerInMinutes < currentMatchStartInMinutes) {
                            const availableBlockedSlots = allBlockedSlots.filter(bs => 
                                bs.date === date && bs.location === location &&
                                // Check if blocked slot overlaps with the potential empty slot
                                (currentTimePointerInMinutes < bs.endInMinutes && (currentTimePointerInMinutes + 1) > bs.startInMinutes)
                            );

                            if (availableBlockedSlots.length > 0) {
                                // Ak je aktuálna minúta prekrytá zablokovaným slotom, zobrazte zablokovaný slot
                                const blockedSlot = availableBlockedSlots[0]; // Vezmite prvý pre zjednodušenie zobrazenia
                                const blockedSlotStartHour = String(Math.floor(blockedSlot.startInMinutes / 60)).padStart(2, '0');
                                const blockedSlotStartMinute = String(blockedSlot.startInMinutes % 60).padStart(2, '0');
                                const blockedSlotEndHour = String(Math.floor(blockedSlot.endInMinutes / 60)).padStart(2, '0');
                                const blockedSlotEndMinute = String(blockedSlot.endInMinutes % 60).padStart(2, '0');

                                scheduleHtml += `
                                    <tr class="blocked-slot-row" data-id="${blockedSlot.id}" data-date="${date}" data-location="${location}" data-start-time="${blockedSlotStartHour}:${blockedSlotStartMinute}" data-end-time="${blockedSlotEndHour}:${blockedSlotEndMinute}">
                                        <td>${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}</td>
                                        <td colspan="4" style="text-align: center; color: white; background-color: #dc3545; font-style: italic;">Zablokovaný slot</td>
                                    </tr>
                                `;
                                currentTimePointerInMinutes = blockedSlot.endInMinutes; // Posuňte ukazovateľ za zablokovaný slot
                                currentTimePointer = `${String(Math.floor(currentTimePointerInMinutes / 60)).padStart(2, '0')}:${String(currentTimePointerInMinutes % 60).padStart(2, '0')}`;
                            } else {
                                // Ak nie je zablokovaný, zobrazte prázdny slot až do ďalšieho zápasu/zablokovaného slotu
                                let nextOccupiedOrBlockedTime = currentMatchStartInMinutes;
                                const nextBlockedSlot = allBlockedSlots.find(bs => 
                                    bs.date === date && bs.location === location && bs.startInMinutes >= currentTimePointerInMinutes
                                );
                                if (nextBlockedSlot) {
                                    nextOccupiedOrBlockedTime = Math.min(nextOccupiedOrBlockedTime, nextBlockedSlot.startInMinutes);
                                }

                                const emptySlotStart = currentTimePointerInMinutes;
                                const emptySlotEnd = nextOccupiedOrBlockedTime;
                                if (emptySlotEnd > emptySlotStart) {
                                    const formattedEmptySlotStartTime = `${String(Math.floor(emptySlotStart / 60)).padStart(2, '0')}:${String(emptySlotStart % 60).padStart(2, '0')}`;
                                    const formattedEmptySlotEndTime = `${String(Math.floor(emptySlotEnd / 60)).padStart(2, '0')}:${String(emptySlotEnd % 60).padStart(2, '0')}`;
                                    scheduleHtml += `
                                        <tr class="empty-slot-row" data-date="${date}" data-location="${location}" data-start-time="${formattedEmptySlotStartTime}" data-end-time="${formattedEmptySlotEndTime}">
                                            <td>${formattedEmptySlotStartTime} - ${formattedEmptySlotEndTime}</td>
                                            <td colspan="4" style="text-align: center; color: #888; font-style: italic;">Voľný slot dostupný</td>
                                        </tr>
                                    `;
                                }
                                currentTimePointerInMinutes = nextOccupiedOrBlockedTime; // Posuňte ukazovateľ
                                currentTimePointer = `${String(Math.floor(currentTimePointerInMinutes / 60)).padStart(2, '0')}:${String(currentTimePointerInMinutes % 60).padStart(2, '0')}`;
                            }
                        }

                        const matchEndTime = new Date();
                        matchEndTime.setHours(matchStartH, matchStartM + match.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        // Získajte farbu pre kategóriu
                        const categoryColor = categoryColorsMap.get(match.categoryId) || 'transparent'; // Predvolene na transparentnú, ak nie je farba

                        let textAlignStyle = '';
                        if (match.groupId && groupAlignmentMapForLocation.has(match.groupId)) {
                            textAlignStyle = `text-align: ${groupAlignmentMapForLocation.get(match.groupId)};`;
                        } else if (groupIdsArrayInLocation.length > 3) {
                             textAlignStyle = `text-align: center;`;
                        }
                        // Ak je 1 skupina, textAlignStyle zostáva prázdny, predvolene na zarovnanie vľavo.


                        scheduleHtml += `
                            <tr draggable="true" data-id="${match.id}" class="match-row">
                                <td>${match.startTime} - ${formattedEndTime}</td>
                                <td style="${textAlignStyle}">${match.team1ClubName || 'N/A'}</td>
                                <td style="${textAlignStyle}">${match.team2ClubName || 'N/A'}</td>
                                <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team1ShortDisplayName || 'N/A'}</td>
                                <td style="background-color: ${categoryColor}; ${textAlignStyle}">${match.team2ShortDisplayName || 'N/A'}</td>
                            </tr>
                        `;

                        // Aktualizujte ukazovateľ aktuálneho času pre ďalšiu iteráciu
                        currentTimePointer = calculateNextAvailableTime(match.startTime, match.duration, match.bufferTime);
                    }

                    // Po poslednom zápase, pridajte zostávajúce prázdne/zablokované sloty do konca dňa (24:00)
                    let [finalPointerH, finalPointerM] = currentTimePointer.split(':').map(Number);
                    let finalPointerMinutes = finalPointerH * 60 + finalPointerM;
                    const endOfDayMinutes = 24 * 60; // 24:00

                    while (finalPointerMinutes < endOfDayMinutes) {
                        const availableBlockedSlots = allBlockedSlots.filter(bs => 
                            bs.date === date && bs.location === location &&
                            (finalPointerMinutes < bs.endInMinutes && (finalPointerMinutes + 1) > bs.startInMinutes)
                        );

                        if (availableBlockedSlots.length > 0) {
                            const blockedSlot = availableBlockedSlots[0];
                            const blockedSlotStartHour = String(Math.floor(blockedSlot.startInMinutes / 60)).padStart(2, '0');
                            const blockedSlotStartMinute = String(blockedSlot.startInMinutes % 60).padStart(2, '0');
                            const blockedSlotEndHour = String(Math.floor(blockedSlot.endInMinutes / 60)).padStart(2, '0');
                            const blockedSlotEndMinute = String(blockedSlot.endInMinutes % 60).padStart(2, '0');

                            scheduleHtml += `
                                <tr class="blocked-slot-row" data-id="${blockedSlot.id}" data-date="${date}" data-location="${location}" data-start-time="${blockedSlotStartHour}:${blockedSlotStartMinute}" data-end-time="${blockedSlotEndHour}:${blockedSlotEndMinute}">
                                    <td>${blockedSlotStartHour}:${blockedSlotStartMinute} - ${blockedSlotEndHour}:${blockedSlotEndMinute}</td>
                                    <td colspan="4" style="text-align: center; color: white; background-color: #dc3545; font-style: italic;">Zablokovaný slot</td>
                                    </tr>
                            `;
                            finalPointerMinutes = blockedSlot.endInMinutes;
                        } else {
                            let nextEventTime = endOfDayMinutes; // Predpokladajme koniec dňa
                            const nextBlockedSlot = allBlockedSlots.find(bs => 
                                bs.date === date && bs.location === location && bs.startInMinutes >= finalPointerMinutes
                            );
                            if (nextBlockedSlot) {
                                nextEventTime = Math.min(nextEventTime, nextBlockedSlot.startInMinutes);
                            }

                            const emptySlotStart = finalPointerMinutes;
                            const emptySlotEnd = nextEventTime;
                            // Zobraziť prázdny slot len ak nekončí presne o 24:00
                            if (emptySlotEnd > emptySlotStart && emptySlotEnd !== endOfDayMinutes) { 
                                const formattedEmptySlotStartTime = `${String(Math.floor(emptySlotStart / 60)).padStart(2, '0')}:${String(emptySlotStart % 60).padStart(2, '0')}`;
                                const formattedEmptySlotEndTime = `${String(Math.floor(emptySlotEnd / 60)).padStart(2, '0')}:${String(emptySlotEnd % 60).padStart(2, '0')}`;
                                scheduleHtml += `
                                    <tr class="empty-slot-row" data-date="${date}" data-location="${location}" data-start-time="${formattedEmptySlotStartTime}" data-end-time="${formattedEmptySlotEndTime}">
                                        <td>${formattedEmptySlotStartTime} - ${formattedEmptySlotEndTime}</td>
                                        <td colspan="4" style="text-align: center; color: #888; font-style: italic;">Voľný slot dostupný</td>
                                    </tr>
                                `;
                            }
                            finalPointerMinutes = nextEventTime;
                        }
                    }

                    scheduleHtml += `</tbody></table></div>`; // Zavrieť tabuľku a div skupiny dátumov
                }
                scheduleHtml += `</div>`; // Zavrieť div skupiny miest
            }
        }
        scheduleHtml += '</div>'; // Zavrieť hlavný flex kontajner

        matchesContainer.innerHTML = scheduleHtml;

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
            });

            // Voliteľné: Odstráňte triedu dragging po dragend
            row.addEventListener('dragend', (event) => {
                event.target.classList.remove('dragging');
            });
        });

        // Pridajte poslucháčov udalostí pre prázdne riadky slotov pre kliknutie
        matchesContainer.querySelectorAll('.empty-slot-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
                const startTime = event.currentTarget.dataset.startTime;
                const endTime = event.currentTarget.dataset.endTime; // Získať endTime
                openFreeSlotModal(date, location, startTime, endTime); // Otvoriť nový modál
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
        });

        // Pridajte poslucháčov dragover a drop pre divy skupiny dátumov (obsahujúce tabuľky)
        matchesContainer.querySelectorAll('.date-group').forEach(dateGroupDiv => {
            dateGroupDiv.addEventListener('dragover', (event) => {
                event.preventDefault(); // Kľúčové pre povolenie umiestnenia
                event.dataTransfer.dropEffect = 'move';
                // Vizuálna spätná väzba pre bod vloženia (napr. orámovanie)
                const targetRow = event.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.add('drop-over-row');
                } else {
                    dateGroupDiv.classList.add('drop-target-active');
                }
            });

            dateGroupDiv.addEventListener('dragleave', (event) => {
                const targetRow = event.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.remove('drop-over-row');
                } else {
                    dateGroupDiv.classList.remove('drop-target-active');
                }
            });

            dateGroupDiv.addEventListener('drop', async (event) => {
                event.preventDefault();
                // Vyčistite vizuálnu spätnú väzbu
                const targetRow = event.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.remove('drop-over-row');
                }
                dateGroupDiv.classList.remove('drop-target-active');

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const newDate = dateGroupDiv.dataset.date;
                const newLocation = dateGroupDiv.dataset.location;
                let droppedProposedStartTime = null; // This will hold the HH:MM string for the dropped match

                if (draggedMatchId) {
                    const droppedOnElement = event.target.closest('tr');
                    if (droppedOnElement) {
                        // If dropped on any row (match, empty slot, blocked slot), use its start time
                        droppedProposedStartTime = droppedOnElement.dataset.startTime;
                    } else {
                        // If dropped directly on the date-group div background (implies append to the end)
                        // In this case, droppedProposedStartTime remains null. The moveAndRescheduleMatch
                        // function will calculate the time after the last existing event in that date/location.
                    }
                    
                    await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedProposedStartTime);
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

        matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
            header.addEventListener('click', (event) => {
                if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                    return;
                }
                if (event.target === header || event.target.closest('.hall-name')) {
                    const locationToEdit = header.dataset.location;
                    const locationTypeToEdit = header.dataset.type;
                    editPlace(locationToEdit, locationTypeToEdit);
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
            await showMessage('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy boli vymazané!`);
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
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
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
    try {
        const playingDayModal = document.getElementById('playingDayModal');
        const playingDayIdInput = document.getElementById('playingDayId');
        const playingDayDateInput = document.getElementById('playingDayDate');
        const playingDayModalTitle = document.getElementById('playingDayModalTitle');
        const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

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
            deletePlayingDayButtonModal.onclick = () => deletePlayingDay(playingDayData.date);
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
    try {
        const placeModal = document.getElementById('placeModal');
        const placeIdInput = document.getElementById('placeId');
        const placeTypeSelect = document.getElementById('placeTypeSelect');
        const placeNameInput = document.getElementById('placeName');
        const placeAddressInput = document.getElementById('placeAddress');
        const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
        const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

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
            deletePlaceButtonModal.onclick = () => deletePlace(placeData.name, placeData.type);
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

    matchForm.reset(); // Vždy resetujte formulár
    matchIdInput.value = matchId || ''; // Nastavte ID, ak sa upravuje, vymažte, ak sa pridáva
    deleteMatchButtonModal.style.display = matchId ? 'inline-block' : 'none'; // Zobrazte/skryte tlačidlo zmazať

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
        await populateSportHallSelects(matchLocationSelect, matchData.date); // Správne je matchData.location
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

        // Ak je skupina vybratá, odblokujte polia tímov, inak ich zablokujte
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
    const freeSlotModal = document.getElementById('freeSlotModal');
    const freeSlotModalTitle = document.getElementById('freeSlotModalTitle');
    const freeSlotDateDisplay = document.getElementById('freeSlotDateDisplay');
    const freeSlotLocationDisplay = document.getElementById('freeSlotLocationDisplay');
    const freeSlotTimeRangeDisplay = document.getElementById('freeSlotTimeRangeDisplay');
    const blockSlotCheckbox = document.getElementById('blockSlotCheckbox');
    const freeSlotIdInput = document.getElementById('freeSlotId');
    const freeSlotSaveButton = document.getElementById('freeSlotSaveButton');
    const deleteFreeSlotButton = document.getElementById('deleteFreeSlotButton');

    freeSlotIdInput.value = blockedSlotId || '';
    freeSlotDateDisplay.textContent = date;
    freeSlotLocationDisplay.textContent = location;
    freeSlotTimeRangeDisplay.textContent = `${startTime} - ${endTime}`;

    if (blockedSlotId) {
        freeSlotModalTitle.textContent = 'Upraviť zablokovaný slot';
        blockSlotCheckbox.checked = true; // Ak existuje ID, je zablokovaný
        deleteFreeSlotButton.style.display = 'inline-block';
        deleteFreeSlotButton.onclick = async () => {
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete odblokovať tento slot?');
            if (confirmed) {
                await deleteDoc(doc(blockedSlotsCollectionRef, blockedSlotId));
                await showMessage('Úspech', 'Slot bol odblokovaný!');
                closeModal(freeSlotModal);
                displayMatchesAsSchedule();
            }
        };
    } else {
        freeSlotModalTitle.textContent = 'Spravovať voľný slot';
        blockSlotCheckbox.checked = false; // Predvolene odblokované pre nový voľný slot
        deleteFreeSlotButton.style.display = 'none'; // Skryť tlačidlo vymazať pre nový slot
    }

    // Odstráňte starý poslucháč pred pridaním nového, aby sa predišlo viacnásobným spusteniam
    freeSlotSaveButton.removeEventListener('click', handleFreeSlotSave);
    freeSlotSaveButton.addEventListener('click', () => handleFreeSlotSave(date, location, startTime, endTime));

    openModal(freeSlotModal);
}

/**
 * Handler pre uloženie stavu voľného/zablokovaného slotu.
 * @param {string} date Dátum slotu.
 * @param {string} location Miesto slotu.
 * @param {string} startTime Čas začiatku slotu (HH:MM).
 * @param {string} endTime Čas konca slotu (HH:MM).
 */
async function handleFreeSlotSave(date, location, startTime, endTime) {
    const freeSlotIdInput = document.getElementById('freeSlotId');
    const blockSlotCheckbox = document.getElementById('blockSlotCheckbox');
    const freeSlotModal = document.getElementById('freeSlotModal');

    const slotData = {
        date: date,
        location: location,
        startTime: startTime,
        endTime: endTime,
        startInMinutes: (parseInt(startTime.split(':')[0]) * 60) + parseInt(startTime.split(':')[1]),
        endInMinutes: (parseInt(endTime.split(':')[0]) * 60) + parseInt(endTime.split(':')[1]),
        createdAt: new Date()
    };

    try {
        if (blockSlotCheckbox.checked) {
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

            // 2. Získajte všetky existujúce zablokované sloty (okrem toho, ktorý možno práve upravujeme)
            const existingBlockedSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", date),
                where("location", "==", location)
            );
            const existingBlockedSlotsSnapshot = await getDocs(existingBlockedSlotsQuery);
            const otherBlockedSlotsForLocationAndDate = existingBlockedSlotsSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const [startH, startM] = data.startTime.split(':').map(Number);
                    const startInMinutes = startH * 60 + startM;
                    const [endH, endM] = data.endTime.split(':').map(Number);
                    const endInMinutes = endH * 60 + endM;
                    return { start: startInMinutes, end: endInMinutes, id: doc.id };
                })
                .filter(bs => bs.id !== freeSlotIdInput.value); // Vylúčte aktuálne upravovaný slot

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

            // Kontrola prekrývania s inými zablokovanými slotmi (ak sa ešte nenašlo prekrývanie so zápasom)
            if (!overlapFound) {
                for (const blockedSlot of otherBlockedSlotsForLocationAndDate) {
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
                await showMessage('Chyba', `Nový zablokovaný slot sa prekrýva s existujúcim ${overlapDetails.type} v rozsahu ${formatTime(overlapDetails.start)} - ${formatTime(overlapDetails.end)}.`);
                return; // Zastaviť operáciu uloženia
            }

            // Ak nedošlo k prekrývaniu, pokračujte s ukladaním/aktualizáciou
            if (freeSlotIdInput.value) {
                await setDoc(doc(blockedSlotsCollectionRef, freeSlotIdInput.value), slotData, { merge: true });
                await showMessage('Úspech', 'Zmeny v zablokovanom slote boli uložené!');
            } else {
                await addDoc(blockedSlotsCollectionRef, slotData);
                await showMessage('Úspech', 'Slot bol úspešne zablokovaný!');
            }
        } else {
            // Odblokovať slot (vymazať dokument)
            if (freeSlotIdInput.value) {
                await deleteDoc(doc(blockedSlotsCollectionRef, freeSlotIdInput.value));
                await showMessage('Úspech', 'Slot bol odblokovaný!');
            } else {
                // Ak nie je ID, skúste nájsť a vymazať podľa časového rozsahu
                const q = query(
                    blockedSlotsCollectionRef,
                    where("date", "==", slotData.date),
                    where("location", "==", slotData.location),
                    where("startTime", "==", slotData.startTime),
                    where("endTime", "==", slotData.endTime)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    await deleteDoc(doc(blockedSlotsCollectionRef, snapshot.docs[0].id));
                    await showMessage('Úspech', 'Slot bol odblokovaný!');
                } else {
                    await showMessage('Informácia', 'Tento slot nie je zablokovaný.');
                }
            }
        }
        closeModal(freeSlotModal);
        displayMatchesAsSchedule(); // Obnoviť rozvrh po zmene
    } catch (error) {
        console.error("Chyba pri ukladaní stavu voľného slotu:", error);
        await showMessage('Chyba', `Chyba pri ukladaní stavu slotu: ${error.message}`);
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
            await deleteDoc(doc(matchesCollectionRef, matchId));
            await showMessage('Úspech', 'Zápas vymazaný!');
            closeModal(document.getElementById('matchModal'));
            displayMatchesAsSchedule();
        }
        catch (error) {
            console.error("Chyba pri mazaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri mazaní zápasu. Detail: ${error.message}`);
        }
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
    const freeSlotSaveButton = document.getElementById('freeSlotSaveButton');

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
            team2NumberInput.value = '';
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
        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let alreadyPlayed = false;
            let overlappingExistingMatchDetails = null; // Premenná na uloženie detailov prekrývajúceho sa zápasu

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
                    alreadyPlayed = true;
                    overlappingExistingMatchDetails = existingMatch; // Uložte detaily existujúceho zápasu
                    return; // Nájdená duplicita zápasu, možno ukončiť cyklus
                }
            });

            if (alreadyPlayed) {
                const dateObj = new Date(overlappingExistingMatchDetails.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                await showMessage('Chyba', `Tímy ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už proti sebe hrali v kategórii ${categoriesMap.get(matchCategory)} a v skupine ${groupsMap.get(matchGroup)} dňa ${formattedDate} o ${overlappingExistingMatchDetails.startTime}. Prosím, zadajte iné tímy.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole existujúcich zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole, či tímy už hrali proti sebe. Skúste to znova.");
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

            // Kontrola prekrývania so zablokovanými slotmi
            const blockedSlotsQuery = query(
                blockedSlotsCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
            blockedSlotsSnapshot.docs.forEach(doc => {
                const blockedSlot = doc.data();
                const [blockedStartHour, blockedStartMinute] = blockedSlot.startTime.split(':').map(Number);
                const blockedSlotStartInMinutes = blockedStartHour * 60 + blockedStartMinute;
                const [blockedEndHour, blockedEndMinute] = blockedSlot.endTime.split(':').map(Number);
                const blockedSlotEndInMinutes = blockedEndHour * 60 + blockedEndMinute;

                if (newMatchStartInMinutes < blockedSlotEndInMinutes && newMatchEndInMinutesWithBuffer > blockedSlotStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = { ...blockedSlot, type: 'blocked_slot' }; // Označte ako zablokovaný slot
                    return;
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
                const durationOrEndTime = overlappingMatchDetails.type === 'blocked_slot' ? (overlappingMatchDetails.endInMinutes - (existingStartHour * 60 + existingStartMinute)) : (overlappingMatchDetails.duration || 0);
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
            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                // Žiadna správa o úspechu pre úpravu
            } else {
                await addDoc(matchesCollectionRef, matchData);
                // Žiadna správa o úspechu pre pridanie
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
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
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                await showMessage('Úspech', 'Miesto úspešne upravené!');
            } else {
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
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                await showMessage('Úspech', 'Hrací deň úspešne upravený!');
            } else {
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
