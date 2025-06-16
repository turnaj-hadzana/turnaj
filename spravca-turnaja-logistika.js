import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

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
    // Odstránené: findFirstAvailableTime() - podľa požiadavky užívateľa, zmena kategórie by nemala aktualizovať čas začiatku.
}

/**
 * Nájde prvý dostupný časový slot pre zápas na základe dátumu, miesta, trvania a časovej rezervy.
 */
async function findFirstAvailableTime() {
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchStartTimeInput = document.getElementById('matchStartTime');

    const selectedDate = matchDateSelect.value;
    const selectedLocationName = matchLocationSelect.value;
    const duration = parseInt(matchDurationInput.value) || 60;
    const bufferTime = parseInt(matchBufferTimeInput.value) || 5;

    if (!selectedDate || !selectedLocationName) {
        matchStartTimeInput.value = '';
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

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];

        let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
        const endSearchHour = 22;
        const intervalMinutes = 1;

        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName)
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

        const existingEvents = existingMatchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const [eventStartH, eventStartM] = data.startTime.split(':').map(Number);
            const startInMinutes = eventStartH * 60 + eventStartM;
            const endInMinutes = startInMinutes + (data.duration || 0) + (data.bufferTime || 0);
            return { start: startInMinutes, end: endInMinutes };
        });

        existingEvents.sort((a, b) => a.start - b.start);

        for (let hour = startH; hour <= endSearchHour; hour++) {
            const currentMinuteStart = (hour === startH) ? startM : 0;
            for (let minute = currentMinuteStart; minute < 60; minute += intervalMinutes) {
                const potentialStartInMinutes = hour * 60 + minute;
                const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                let overlap = false;
                for (const existingEvent of existingEvents) {
                    if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    const formattedHour = String(hour).padStart(2, '0');
                    const formattedMinute = String(minute).padStart(2, '0');
                    matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                    return;
                }
            }
        }
        matchStartTimeInput.value = '';
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
    let [prevH, prevM] = prevStartTime.split(':').map(Number);
    let totalMinutes = (prevH * 60) + prevM + duration + bufferTime;

    let newH = Math.floor(totalMinutes / 60);
    let newM = totalMinutes % 60;

    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}


/**
 * Prepočíta a preplánuje zápasy pre konkrétny dátum a miesto po operácii drag & drop.
 * Táto funkcia spracováva vloženie zápasu a posunutie časov následných zápasov,
 * snažiac sa zachovať existujúce časové medzery, kde je to možné.
 * @param {string} draggedMatchId ID presunutého zápasu.
 * @param {string} targetDate Dátum cieľového miesta.
 * @param {string} targetLocation Miesto cieľového miesta.
 * @param {string|null} droppedBeforeMatchId ID zápasu, pred ktorým bol presunutý zápas umiestnený, alebo null, ak bol umiestnený na koniec.
 */
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedBeforeMatchId = null) {
    try {
        const draggedMatchDocRef = doc(matchesCollectionRef, draggedMatchId);
        const draggedMatchDoc = await getDoc(draggedMatchDocRef);
        if (!draggedMatchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            return;
        }
        const movedMatchData = { id: draggedMatchDoc.id, ...draggedMatchDoc.data() };

        const originalDate = movedMatchData.date;
        const originalLocation = movedMatchData.location;

        const isMovingWithinSameSchedule = (originalDate === targetDate && originalLocation === targetLocation);

        const batch = writeBatch(db);

        // 1. Získajte všetky zápasy pre cieľový dátum a miesto, zapamätajte si ich pôvodné časy začiatku pre zachovanie medzier
        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", targetDate),
            where("location", "==", targetLocation),
            orderBy("startTime", "asc")
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
        let matchesForReschedule = existingMatchesSnapshot.docs
            .map(doc => ({ id: doc.id, originalStartTime: doc.data().startTime, ...doc.data() })) // Uloží originalStartTime
            .filter(match => match.id !== draggedMatchId); // Vylúči samotný presunutý zápas

        // 2. Určite počiatočný čas pre daný deň
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
        const initialStartTimeForDay = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;

        // 3. Určite bod vloženia a nový čas začiatku pre presunutý zápas
        let insertionIndex = matchesForReschedule.length; // Predvolene na pripojenie na koniec
        let newStartTimeForMovedMatch = null;

        if (droppedBeforeMatchId) {
            const targetMatchIndex = matchesForReschedule.findIndex(m => m.id === droppedBeforeMatchId);
            if (targetMatchIndex !== -1) {
                insertionIndex = targetMatchIndex;
                newStartTimeForMovedMatch = matchesForReschedule[targetMatchIndex].startTime; // Zápas sa vloží pred existujúci zápas, prevezme jeho čas
            } else {
                // Cieľový zápas nebol nájdený, pridajte na koniec
                const lastMatch = matchesForReschedule[matchesForReschedule.length - 1];
                newStartTimeForMovedMatch = lastMatch ? calculateNextAvailableTime(lastMatch.startTime, lastMatch.duration, lastMatch.bufferTime) : initialStartTimeForDay;
                insertionIndex = matchesForReschedule.length;
            }
        } else {
            // Umiestnené na koniec skupiny dátumov alebo do prázdnej oblasti
            const lastMatch = matchesForReschedule[matchesForReschedule.length - 1];
            newStartTimeForMovedMatch = lastMatch ? calculateNextAvailableTime(lastMatch.startTime, lastMatch.duration, lastMatch.bufferTime) : initialStartTimeForDay;
        }
        
        // Pripravte aktualizované údaje presunutého zápasu na vloženie
        const movedMatchUpdatedData = {
            ...movedMatchData,
            date: targetDate,
            location: targetLocation,
            // startTime bude nastavený v prepočítavacom cykle pre správne "zbalenie"
            duration: (await getCategoryMatchSettings(movedMatchData.categoryId)).duration,
            bufferTime: (await getCategoryMatchSettings(movedMatchData.categoryId)).bufferTime
        };

        // Vložte presunutý zápas do dočasného zoznamu rozvrhu na správnu logickú pozíciu
        matchesForReschedule.splice(insertionIndex, 0, movedMatchUpdatedData);

        // 4. Ak sa presúva z iného rozvrhu, zmažte pôvodný dokument
        if (!isMovingWithinSameSchedule) {
            batch.delete(draggedMatchDocRef);
        }

        // 5. Prejdite aktualizovaným zoznamom a aplikujte nové časy, čím zabezpečíte tesné "zbalenie"
        let currentPackTimePointer = initialStartTimeForDay;

        for (let i = 0; i < matchesForReschedule.length; i++) {
            const match = matchesForReschedule[i];
            const matchRef = doc(matchesCollectionRef, match.id);

            // Získajte trvanie a rezervu pre tento konkrétny zápas
            const categorySettings = await getCategoryMatchSettings(match.categoryId);
            const duration = categorySettings.duration;
            const bufferTime = categorySettings.bufferTime;

            // Priraďte aktuálny časový ukazovateľ ako nový čas začiatku
            match.startTime = currentPackTimePointer;
            match.duration = duration; 
            match.bufferTime = bufferTime; 

            // Aktualizujte dokument zápasu v dávke
            batch.set(matchRef, {
                ...match, 
                date: targetDate, 
                location: targetLocation,
            }, { merge: true });

            // Vypočítajte čas začiatku pre ďalší zápas
            currentPackTimePointer = calculateNextAvailableTime(match.startTime, duration, bufferTime);

            // Základná kontrola, aby sa predišlo príliš dlhým rozvrhom
            if (parseInt(currentPackTimePointer.split(':')[0]) >= 24) {
                console.warn(`Rozvrh pre ${targetDate} v ${targetLocation} presiahol 24:00.`);
            }
        }

        await batch.commit();
        await displayMatchesAsSchedule(); // Obnoviť zobrazenie pre všetky zmeny
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

                        // Skontrolujte, či je pred aktuálnym zápasom prázdny slot
                        if (currentMatchStartInMinutes > currentTimePointerInMinutes) {
                            const emptySlotDuration = currentMatchStartInMinutes - currentTimePointerInMinutes;
                            const emptySlotEndHour = Math.floor((currentTimePointerInMinutes + emptySlotDuration) / 60); 
                            const emptySlotEndMinute = (currentTimePointerInMinutes + emptySlotDuration) % 60;
                            const formattedEmptySlotEndTime = `${String(emptySlotEndHour).padStart(2, '0')}:${String(emptySlotEndMinute).padStart(2, '0')}`;

                            scheduleHtml += `
                                <tr class="empty-slot-row" data-date="${date}" data-location="${location}" data-start-time="${currentTimePointer}">
                                    <td>${currentTimePointer} - ${formattedEmptySlotEndTime}</td>
                                    <td colspan="4" style="text-align: center; color: #888; font-style: italic;">Voľný slot</td>
                                </tr>
                            `;
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
        // Toto zostáva pre možnosť KLIKNUTIA na slot pre vytvorenie nového zápasu
        matchesContainer.querySelectorAll('.empty-slot-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const date = event.currentTarget.dataset.date;
                const location = event.currentTarget.dataset.location;
                const startTime = event.currentTarget.dataset.startTime;
                openMatchModal(null, date, location, startTime); // Zavolajte openMatchModal pre nový zápas
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
                let droppedBeforeMatchId = null;

                if (draggedMatchId) { // Uistite sa, že sa niečo presúvalo
                    const droppedOnElement = event.target.closest('tr');
                    if (droppedOnElement) {
                        // Ak sa presúvalo na existujúci riadok zápasu
                        if (droppedOnElement.classList.contains('match-row')) {
                            droppedBeforeMatchId = droppedOnElement.dataset.id;
                        } else if (droppedOnElement.classList.contains('empty-slot-row')) {
                            // Ak sa presúvalo na prázdny slot, nájdite nasledujúci skutočný riadok zápasu v tbody
                            const tbody = droppedOnElement.closest('tbody');
                            let currentRow = droppedOnElement.nextElementSibling;
                            while(currentRow) {
                                if (currentRow.classList.contains('match-row')) {
                                    droppedBeforeMatchId = currentRow.dataset.id;
                                    break;
                                }
                                currentRow = currentRow.nextElementSibling;
                            }
                            // Ak sa nenájde žiadny nasledujúci zápas, droppedBeforeMatchId zostane null,
                            // čo správne signalizuje pripojenie na koniec.
                        }
                    }
                    // Ak sa presúvalo mimo akéhokoľvek riadku (napr. priamo na tbody alebo dateGroupDiv),
                    // droppedBeforeMatchId zostane null, signalizujúc pripojenie na koniec.

                    await moveAndRescheduleMatch(draggedMatchId, newDate, newLocation, droppedBeforeMatchId);
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
        await populatePlayingDaysSelect(matchDateSelect, prefillDate);
        await populateSportHallSelects(matchLocationSelect, prefillLocation);
        matchStartTimeInput.value = prefillStartTime; // Predvyplniť čas začiatku, ak je z prázdneho slotu

        if (matchGroupSelect) {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }
        
        // Zablokujte a vymažte polia tímov pre nový zápas
        team1NumberInput.value = '';
        team1NumberInput.disabled = true;
        team2NumberInput.value = '';
        team2NumberInput.disabled = true;

        matchDurationInput.value = ''; // Vymazať pre nový zápas, nastaví sa výberom kategórie
        matchBufferTimeInput.value = ''; // Vymazať pre nový zápas, nastaví sa výberom kategórie

        // Po nastavení predvyplnení sa uistite, že trvanie/rezerva sú aktualizované
        // Zavolajte findFirstAvailableTime iba ak nie je poskytnutý prefillStartTime
        if (!prefillStartTime) {
            // Už nevolajte findFirstAvailableTime priamo z výberu kategórie
            // Ak je kategória vybratá, aktualizujte trvanie/rezervu na základe kategórie
            if (matchCategorySelect.value) {
                await updateMatchDurationAndBuffer();
            } else {
                // Ak nie je vybraná žiadna kategória, pokúste sa nájsť čas s predvoleným trvaním/rezervou
                await findFirstAvailableTime();
            }
        }
    }
    openModal(matchModal);
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
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
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
            await updateMatchDurationAndBuffer(); // Aktualizuje trvanie a rezervu, ale nie čas začiatku
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team1NumberInput.disabled = true;
            team2NumberInput.value = '';
            team2NumberInput.disabled = true;
            matchDurationInput.value = 60; // Reset na predvolené, ak nie je kategória
            matchBufferTimeInput.value = 5; // Reset na predvolené, ak nie je kategória
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

            if (overlapFound) {
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                const existingMatchEndTimeObj = new Date();
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                await showMessage('Chyba', `Zápas sa prekrýva s existujúcim zápasom v mieste "${matchLocationName}" dňa ${matchDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`);
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
