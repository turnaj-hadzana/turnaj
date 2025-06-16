import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';

// Konštantné ID dokumentu pre nastavenia
const SETTINGS_DOC_ID = 'matchTimeSettings';

// DOM elementy pre hlavnú stránku logistiky
const playingDayModal = document.getElementById('playingDayModal');
const playingDayModalCloseBtn = playingDayModal ? playingDayModal.querySelector('.close') : null;
const playingDayForm = document.getElementById('playingDayForm');
const playingDayIdInput = document.getElementById('playingDayId');
const playingDayDateInput = document.getElementById('playingDayDate');
const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

const placeModal = document.getElementById('placeModal');
const placeModalCloseBtn = placeModal ? placeModal.querySelector('.close') : null;
const placeForm = document.getElementById('placeForm');
const placeIdInput = document.getElementById('placeId');
const placeNameInput = document.getElementById('placeName');
const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

const matchModal = document.getElementById('matchModal');
const matchModalCloseBtn = matchModal ? matchModal.querySelector('.close') : null;
const matchForm = document.getElementById('matchForm');
const matchIdInput = document.getElementById('matchId');
const matchPlayingDaySelect = document.getElementById('matchPlayingDay');
const matchCategorySelect = document.getElementById('matchCategory');
const matchGroupSelect = document.getElementById('matchGroup');
const matchTeam1Select = document.getElementById('matchTeam1');
const matchTeam2Select = document.getElementById('matchTeam2');
const matchPlaceSelect = document.getElementById('matchPlace');
const matchTimeInput = document.getElementById('matchTime');
const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

// Elementy pre modalné okno pre priradenie ubytovania
const accommodationAssignmentModal = document.getElementById('accommodationAssignmentModal');
const accommodationAssignmentCloseBtn = accommodationAssignmentModal ? accommodationAssignmentModal.querySelector('.close') : null;
const accommodationAssignmentForm = document.getElementById('accommodationAssignmentForm');
const accommodationAssignmentIdInput = document.getElementById('accommodationAssignmentId');
const accommodationTypeSelect = document.getElementById('accommodationTypeSelect'); // Typ ubytovania (napr. Ubytovňa 1, Ubytovňa 2)
const accommodationTeamCategorySelect = document.getElementById('accommodationTeamCategorySelect'); // Kategória tímu
const accommodationTeamGroupSelect = document.getElementById('accommodationTeamGroupSelect'); // Skupina tímu
const accommodationTeamSelect = document.getElementById('accommodationTeamSelect'); // Konkrétny tím
const accommodationSelect = document.getElementById('accommodationSelect'); // Ktorú ubytovňu priradiť
const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

// Elementy pre tlačidlá pridania
const addButton = document.getElementById('addButton');
const addOptions = document.getElementById('addOptions');
const addPlayingDayButton = document.getElementById('addPlayingDayButton');
const addPlaceButton = document.getElementById('addPlaceButton');
const addMatchButton = document.getElementById('addMatchButton');

// Funkcia na zobrazenie/skrytie dropdownu pre pridanie
const toggleAddOptions = () => {
    if (addOptions) {
        addOptions.style.display = addOptions.style.display === 'block' ? 'none' : 'block';
    }
};

// Zatvorí dropdown, ak sa klikne mimo neho
window.addEventListener('click', (event) => {
    if (addOptions && addButton && !addButton.contains(event.target) && !addOptions.contains(event.target)) {
        addOptions.style.display = 'none';
    }
});


/**
 * Populates a select element with playing days from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedDate=''] The date to pre-select.
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
 * Populates a select element with places from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceId=''] The ID of the place to pre-select.
 */
async function populatePlacesSelect(selectElement, selectedPlaceId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const place = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = place.name;
            selectElement.appendChild(option);
        });
        if (selectedPlaceId) {
            selectElement.value = selectedPlaceId;
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
 * Populates a select element with teams based on category and group from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} categoryId The ID of the selected category.
 * @param {string} groupId The ID of the selected group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamsSelect(selectElement, categoryId, groupId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!categoryId || !groupId) {
        selectElement.disabled = true;
        return;
    }
    selectElement.disabled = false;
    try {
        const q = query(clubsCollectionRef, where('categoryId', '==', categoryId), where('groupId', '==', groupId), orderBy('orderInGroup', 'asc'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne tímy v tejto skupine --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const team = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = team.name; // Zobrazí názov tímu
                selectElement.appendChild(option);
            });
            if (selectedTeamId) {
                selectElement.value = selectedTeamId;
            }
        }
    } catch (error) {
        console.error("Chyba pri načítaní tímov:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní tímov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with teams for accommodation assignments.
 * This can be filtered by category and group, or show all assigned teams.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} categoryId The ID of the selected category (optional).
 * @param {string} groupId The ID of the selected group (optional).
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 * @param {boolean} assignedOnly If true, only shows teams already assigned to a category/group.
 */
async function populateAccommodationTeamSelect(selectElement, categoryId = '', groupId = '', selectedTeamId = '', assignedOnly = false) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';

    try {
        let q;
        if (categoryId && groupId) {
            // Filter by specific category and group
            q = query(clubsCollectionRef, where('categoryId', '==', categoryId), where('groupId', '==', groupId), orderBy('name', 'asc'));
        } else if (assignedOnly) {
            // Only show teams that are assigned to any category and group
            q = query(clubsCollectionRef, where('categoryId', '!=', ''), where('groupId', '!=', ''), orderBy('name', 'asc'));
        } else {
            // Show all teams (including unassigned if needed, but in this context, it's typically assigned teams)
            q = query(clubsCollectionRef, orderBy('name', 'asc'));
        }

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne dostupné tímy --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const team = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = team.name;
                selectElement.appendChild(option);
            });
            if (selectedTeamId) {
                selectElement.value = selectedTeamId;
            }
        }
    } catch (error) {
        console.error("Chyba pri načítaní tímov pre ubytovanie:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní tímov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with accommodation types from settings.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodationType=''] The type to pre-select.
 */
async function populateAccommodationSelect(selectElement, selectedAccommodationType = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    try {
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        const accommodations = settingsDoc.exists() && settingsDoc.data().accommodations ? settingsDoc.data().accommodations : [];

        if (accommodations.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne ubytovne nie sú definované --';
            option.disabled = true;
            selectElement.appendChild(option);
            return;
        }

        accommodations.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.name; // Používame názov ako hodnotu
            option.textContent = acc.name;
            selectElement.appendChild(option);
        });

        if (selectedAccommodationType) {
            selectElement.value = selectedAccommodationType;
        }
    } catch (error) {
        console.error("Chyba pri načítaní ubytovní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní ubytovní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}


// --- Playing Day Modal Logic ---
let currentPlayingDayId = null;

/**
 * Otvorí modálne okno pre pridanie/úpravu hracieho dňa.
 * @param {string|null} id ID hracieho dňa pre úpravu, inak null pre pridanie.
 * @param {string} [date=''] Dátum pre predvyplnenie.
 */
function openPlayingDayModal(id = null, date = '') {
    if (!playingDayModal || !playingDayForm || !playingDayIdInput || !playingDayDateInput) return;
    currentPlayingDayId = id;
    playingDayIdInput.value = id || '';
    playingDayDateInput.value = date;
    document.getElementById('playingDayModalTitle').textContent = id ? 'Upraviť hrací deň' : 'Pridať hrací deň';
    deletePlayingDayButtonModal.style.display = id ? 'inline-block' : 'none';
    openModal(playingDayModal);
}

/**
 * Resetuje formulár pre hrací deň.
 */
function resetPlayingDayForm() {
    if (playingDayForm) playingDayForm.reset();
    currentPlayingDayId = null;
    if (deletePlayingDayButtonModal) deletePlayingDayButtonModal.style.display = 'none';
}

/**
 * Vymaže hrací deň a všetky priradené zápasy.
 * @param {string} playingDayId ID hracieho dňa na vymazanie.
 */
async function deletePlayingDay(playingDayId) {
    try {
        const batch = writeBatch(db);
        const dayRef = doc(playingDaysCollectionRef, playingDayId);
        batch.delete(dayRef);

        // Vymaže všetky zápasy priradené k tomuto hraciemu dňu
        const matchesToDeleteQuery = query(matchesCollectionRef, where('playingDayId', '==', playingDayId));
        const matchesSnapshot = await getDocs(matchesToDeleteQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        await batch.commit();
        await showMessage('Úspech', 'Hrací deň a priradené zápasy úspešne vymazané!');
        closeModal(playingDayModal);
        resetPlayingDayForm();
        await displayMatchesAsSchedule(); // Prekresliť rozpis
    } catch (error) {
        console.error("Chyba pri vymazávaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní hracieho dňa. Detail: ${error.message}`);
    }
}

// --- Place Modal Logic ---
let currentPlaceId = null;

/**
 * Otvorí modálne okno pre pridanie/úpravu miesta.
 * @param {string|null} id ID miesta pre úpravu, inak null pre pridanie.
 * @param {string} [name=''] Názov pre predvyplnenie.
 */
function openPlaceModal(id = null, name = '') {
    if (!placeModal || !placeForm || !placeIdInput || !placeNameInput) return;
    currentPlaceId = id;
    placeIdInput.value = id || '';
    placeNameInput.value = name;
    document.getElementById('placeModalTitle').textContent = id ? 'Upraviť miesto' : 'Pridať miesto';
    deletePlaceButtonModal.style.display = id ? 'inline-block' : 'none';
    openModal(placeModal);
}

/**
 * Resetuje formulár pre miesto.
 */
function resetPlaceForm() {
    if (placeForm) placeForm.reset();
    currentPlaceId = null;
    if (deletePlaceButtonModal) deletePlaceButtonModal.style.display = 'none';
}

/**
 * Vymaže miesto a odstráni jeho priradenie zo všetkých zápasov.
 * @param {string} placeId ID miesta na vymazanie.
 */
async function deletePlace(placeId) {
    try {
        const batch = writeBatch(db);
        const placeRef = doc(placesCollectionRef, placeId);
        batch.delete(placeRef);

        // Odstráni priradenie miesta zo všetkých zápasov, ktoré ho používajú
        const matchesUsingPlaceQuery = query(matchesCollectionRef, where('placeId', '==', placeId));
        const matchesSnapshot = await getDocs(matchesUsingPlaceQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.update(matchDoc.ref, { placeId: null }); // Nastaví placeId na null
        });

        await batch.commit();
        await showMessage('Úspech', 'Miesto úspešne vymazané a odstránené zo zápasov!');
        closeModal(placeModal);
        resetPlaceForm();
        await displayMatchesAsSchedule(); // Prekresliť rozpis
    } catch (error) {
        console.error("Chyba pri vymazávaní miesta:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní miesta. Detail: ${error.message}`);
    }
}

// --- Match Modal Logic ---
let currentMatchId = null;
let currentMatchData = null; // Uchováva pôvodné dáta zápasu pre porovnanie pri úprave

/**
 * Otvorí modálne okno pre pridanie/úpravu zápasu.
 * @param {string|null} id ID zápasu pre úpravu, inak null pre pridanie.
 * @param {object|null} matchData Dáta zápasu pre predvyplnenie.
 */
async function openMatchModal(id = null, matchData = null) {
    if (!matchModal || !matchForm) return;
    currentMatchId = id;
    currentMatchData = matchData; // Uložíme pôvodné dáta
    matchIdInput.value = id || '';
    document.getElementById('matchModalTitle').textContent = id ? 'Upraviť zápas' : 'Pridať zápas';
    deleteMatchButtonModal.style.display = id ? 'inline-block' : 'none';

    await populatePlayingDaysSelect(matchPlayingDaySelect, matchData ? matchData.playingDayId : '');
    await populateCategorySelect(matchCategorySelect, matchData ? matchData.categoryId : '');

    // Ak existujú dáta zápasu, predvyplníme skupinu a tímy
    if (matchData) {
        await populateGroupSelect(matchGroupSelect, matchData.categoryId, matchData.groupId);
        await populateTeamsSelect(matchTeam1Select, matchData.categoryId, matchData.groupId, matchData.team1Id);
        await populateTeamsSelect(matchTeam2Select, matchData.categoryId, matchData.groupId, matchData.team2Id);
        matchTimeInput.value = matchData.time || '';
        await populatePlacesSelect(matchPlaceSelect, matchData.placeId || '');
    } else {
        // Pre nový zápas vynulujeme a vypneme selekty skupiny a tímov
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchTeam1Select.disabled = true;
        matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchTeam2Select.disabled = true;
        matchTimeInput.value = '';
        await populatePlacesSelect(matchPlaceSelect);
    }

    openModal(matchModal);
}

/**
 * Resetuje formulár pre zápas.
 */
function resetMatchForm() {
    if (matchForm) matchForm.reset();
    currentMatchId = null;
    currentMatchData = null;
    if (deleteMatchButtonModal) deleteMatchButtonModal.style.display = 'none';
    // Resetuje aj dynamické selecty
    if (matchGroupSelect) {
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
    }
    if (matchTeam1Select) {
        matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchTeam1Select.disabled = true;
    }
    if (matchTeam2Select) {
        matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchTeam2Select.disabled = true;
    }
    if (matchPlayingDaySelect) {
        matchPlayingDaySelect.innerHTML = '<option value="">-- Vyberte dátum --</option>';
    }
    if (matchPlaceSelect) {
        matchPlaceSelect.innerHTML = '<option value="">-- Vyberte miesto --</option>';
    }
}

/**
 * Vymaže zápas.
 * @param {string} matchId ID zápasu na vymazanie.
 */
async function deleteMatch(matchId) {
    try {
        await deleteDoc(doc(matchesCollectionRef, matchId));
        await showMessage('Úspech', 'Zápas úspešne vymazaný!');
        closeModal(matchModal);
        resetMatchForm();
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní zápasu. Detail: ${error.message}`);
    }
}


// --- Accommodation Assignment Modal Logic ---
let currentAccommodationAssignmentId = null;

/**
 * Otvorí modálne okno pre priradenie ubytovania.
 * @param {string|null} assignmentId ID priradenia pre úpravu, inak null pre pridanie.
 * @param {object|null} assignmentData Dáta priradenia pre predvyplnenie.
 */
async function openAccommodationAssignmentModal(assignmentId = null, assignmentData = null) {
    if (!accommodationAssignmentModal || !accommodationAssignmentForm) return;

    currentAccommodationAssignmentId = assignmentId;
    accommodationAssignmentIdInput.value = assignmentId || '';
    document.getElementById('accommodationAssignmentModalTitle').textContent = assignmentId ? 'Upraviť priradenie ubytovania' : 'Pridať priradenie ubytovania';
    deleteAssignmentButtonModal.style.display = assignmentId ? 'inline-block' : 'none';

    await populateAccommodationSelect(accommodationSelect, assignmentData ? assignmentData.accommodationName : '');
    await populateCategorySelect(accommodationTeamCategorySelect, assignmentData ? assignmentData.categoryId : '');

    if (assignmentData) {
        // Ak sa upravuje existujúce priradenie
        if (assignmentData.categoryId) {
            await populateGroupSelect(accommodationTeamGroupSelect, assignmentData.categoryId, assignmentData.groupId);
            await populateAccommodationTeamSelect(accommodationTeamSelect, assignmentData.categoryId, assignmentData.groupId, assignmentData.teamId);
        } else {
            // Ak ide o priradenie bez kategórie/skupiny (napr. pre všetky tímy)
            accommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (nepovinné) --</option>';
            accommodationTeamGroupSelect.disabled = true;
            await populateAccommodationTeamSelect(accommodationTeamSelect, '', '', assignmentData.teamId, true); // Zobraziť len už priradené tímy, aby sa vybral ten konkrétny
        }
        accommodationTypeSelect.value = assignmentData.type || '';
    } else {
        // Pre nové priradenie
        accommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (nepovinné) --</option>';
        accommodationTeamGroupSelect.disabled = true;
        accommodationTeamSelect.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
        accommodationTeamSelect.disabled = true;
        accommodationTypeSelect.value = '';
    }

    openModal(accommodationAssignmentModal);
}

/**
 * Resetuje formulár pre priradenie ubytovania.
 */
function resetAccommodationAssignmentForm() {
    if (accommodationAssignmentForm) accommodationAssignmentForm.reset();
    currentAccommodationAssignmentId = null;
    if (deleteAssignmentButtonModal) deleteAssignmentButtonModal.style.display = 'none';

    if (accommodationTeamCategorySelect) {
        accommodationTeamCategorySelect.innerHTML = '<option value="">-- Vyberte kategóriu (nepovinné) --</option>';
    }
    if (accommodationTeamGroupSelect) {
        accommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (nepovinné) --</option>';
        accommodationTeamGroupSelect.disabled = true;
    }
    if (accommodationTeamSelect) {
        accommodationTeamSelect.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
        accommodationTeamSelect.disabled = true;
    }
    if (accommodationSelect) {
        accommodationSelect.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    }
}

/**
 * Vymaže priradenie ubytovania.
 * @param {string} assignmentId ID priradenia na vymazanie.
 */
async function deleteAccommodationAssignment(assignmentId) {
    try {
        const batch = writeBatch(db);
        const assignmentRef = doc(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments', assignmentId);
        batch.delete(assignmentRef);

        await batch.commit();
        await showMessage('Úspech', 'Priradenie ubytovania úspešne vymazané!');
        closeModal(accommodationAssignmentModal);
        resetAccommodationAssignmentForm();
        await loadAccommodationAssignments(); // Prekresliť tabuľku ubytovania
    } catch (error) {
        console.error("Chyba pri vymazávaní priradenia ubytovania:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní priradenia ubytovania. Detail: ${error.message}`);
    }
}


/**
 * Zobrazí zoznam zápasov ako rozpis podľa hracích dní a časov.
 * Načíta dáta z Firestore a dynamicky vytvorí tabuľku.
 */
async function displayMatchesAsSchedule() {
    const scheduleContentDiv = document.getElementById('scheduleContent');
    if (!scheduleContentDiv) return;

    scheduleContentDiv.innerHTML = ''; // Vyčistí aktuálny obsah

    try {
        // Načítanie všetkých potrebných dát
        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy("time", "asc")));
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const placesSnapshot = await getDocs(placesCollectionRef);
        const settingsDoc = await getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID));

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allCategories = categoriesSnapshot.docs.map(catDoc => ({ id: catDoc.id, ...catDoc.data() }));
        const allGroups = groupsSnapshot.docs.map(groupDoc => ({ id: groupDoc.id, ...groupDoc.data() }));
        const allPlaces = placesSnapshot.docs.map(placeDoc => ({ id: placeDoc.id, ...placeDoc.data() }));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};

        const categoryMatchSettings = settings.categoryMatchSettings || {};

        if (playingDays.length === 0) {
            scheduleContentDiv.innerHTML = '<p>Zatiaľ nie sú definované žiadne hracie dni.</p>';
            return;
        }

        // Vytvorenie map pre rýchle vyhľadávanie
        const clubsMap = new Map(allClubs.map(club => [club.id, club]));
        const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat]));
        const groupsMap = new Map(allGroups.map(group => [group.id, group]));
        const placesMap = new Map(allPlaces.map(place => [place.id, place]));

        playingDays.forEach(day => {
            const dayContainer = document.createElement('div');
            dayContainer.classList.add('date-group');
            dayContainer.setAttribute('data-day-id', day.id); // Pridanie ID pre drag-and-drop

            const dayHeader = document.createElement('h3');
            const dateObj = new Date(day.date);
            dayHeader.textContent = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
            dayContainer.appendChild(dayHeader);

            const dayActions = document.createElement('div');
            dayActions.classList.add('day-actions');

            const editDayBtn = document.createElement('button');
            editDayBtn.classList.add('action-button', 'edit-button');
            editDayBtn.textContent = 'Upraviť deň';
            editDayBtn.onclick = () => openPlayingDayModal(day.id, day.date);
            dayActions.appendChild(editDayBtn);

            const deleteDayBtn = document.createElement('button');
            deleteDayBtn.classList.add('action-button', 'delete-button');
            deleteDayBtn.textContent = 'Vymazať deň';
            deleteDayBtn.onclick = async () => {
                const confirmed = await showConfirmation('Potvrdenie', `Naozaj chcete vymazať hrací deň ${dayHeader.textContent}? Budú vymazané aj všetky priradené zápasy.`);
                if (confirmed) {
                    await deletePlayingDay(day.id);
                }
            };
            dayActions.appendChild(deleteDayBtn);

            dayContainer.appendChild(dayActions);


            const dayMatches = allMatches.filter(match => match.playingDayId === day.id);

            if (dayMatches.length > 0) {
                const table = document.createElement('table');
                table.classList.add('data-table', 'schedule-table');

                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Čas</th>
                        <th>Kategória</th>
                        <th>Skupina</th>
                        <th>Tím 1</th>
                        <th>Tím 2</th>
                        <th>Miesto</th>
                        <th>Akcie</th>
                    </tr>
                `;
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                dayMatches.forEach((match, index) => {
                    const tr = document.createElement('tr');
                    tr.classList.add('match-row');
                    tr.draggable = true; // Umožní presúvanie riadkov
                    tr.setAttribute('data-match-id', match.id);
                    tr.setAttribute('data-playing-day-id', match.playingDayId); // Pridá aj ID hracieho dňa

                    const categoryData = categoriesMap.get(match.categoryId);
                    const groupData = groupsMap.get(match.groupId);
                    const team1Data = clubsMap.get(match.team1Id);
                    const team2Data = clubsMap.get(match.team2Id);
                    const placeData = placesMap.get(match.placeId);

                    const team1DisplayName = team1Data ? team1Data.name : 'Neznámy Tím';
                    const team2DisplayName = team2Data ? team2Data.name : 'Neznámy Tím';
                    const categoryDisplayName = categoryData ? categoryData.name : 'Neznáma Kategória';
                    const groupDisplayName = groupData ? groupData.name : 'Neznáma Skupina';
                    const placeDisplayName = placeData ? placeData.name : 'Neznáme Miesto';

                    // Vytvorenie bunky pre čas
                    const timeTd = document.createElement('td');
                    timeTd.textContent = match.time;
                    timeTd.style.wordWrap = 'break-word'; // Zabezpečí zalamovanie pre čas
                    timeTd.style.overflowWrap = 'break-word';
                    timeTd.style.whiteSpace = 'normal';
                    tr.appendChild(timeTd);

                    // Vytvorenie a podfarbenie bunky pre kategóriu
                    const categoryTd = document.createElement('td');
                    categoryTd.textContent = categoryDisplayName;
                    categoryTd.style.wordWrap = 'break-word';
                    categoryTd.style.overflowWrap = 'break-word';
                    categoryTd.style.whiteSpace = 'normal';

                    let backgroundColor = '';
                    switch (categoryDisplayName.trim()) { // Používame .trim() pre istotu, aby sme odstránili biele znaky
                        case 'U12 D':
                            backgroundColor = '#FF9BC3';
                            break;
                        case 'U12 CH':
                            backgroundColor = '#33CCFF';
                            break;
                        case 'U10 D':
                            backgroundColor = '#FFD9E8';
                            break;
                        case 'U10 CH':
                            backgroundColor = '#AFEAFF';
                            break;
                        default:
                            backgroundColor = ''; // Žiadna špecifická farba
                    }

                    if (backgroundColor) {
                        categoryTd.style.backgroundColor = backgroundColor;
                    }
                    tr.appendChild(categoryTd);

                    // Vytvorenie bunky pre skupinu
                    const groupTd = document.createElement('td');
                    groupTd.textContent = groupDisplayName;
                    groupTd.style.wordWrap = 'break-word';
                    groupTd.style.overflowWrap = 'break-word';
                    groupTd.style.whiteSpace = 'normal';
                    tr.appendChild(groupTd);

                    // Vytvorenie bunky pre Tím 1
                    const team1Td = document.createElement('td');
                    team1Td.textContent = team1DisplayName;
                    team1Td.style.wordWrap = 'break-word';
                    team1Td.style.overflowWrap = 'break-word';
                    team1Td.style.whiteSpace = 'normal';
                    tr.appendChild(team1Td);

                    // Vytvorenie bunky pre Tím 2
                    const team2Td = document.createElement('td');
                    team2Td.textContent = team2DisplayName;
                    team2Td.style.wordWrap = 'break-word';
                    team2Td.style.overflowWrap = 'break-word';
                    team2Td.style.whiteSpace = 'normal';
                    tr.appendChild(team2Td);

                    // Vytvorenie bunky pre miesto
                    const placeTd = document.createElement('td');
                    placeTd.textContent = placeDisplayName;
                    placeTd.style.wordWrap = 'break-word';
                    placeTd.style.overflowWrap = 'break-word';
                    placeTd.style.whiteSpace = 'normal';
                    tr.appendChild(placeTd);

                    // Akcie bunka (úprava, vymazanie)
                    const actionsTd = document.createElement('td');
                    const editButton = document.createElement('button');
                    editButton.classList.add('action-button', 'edit-button');
                    editButton.textContent = 'Upraviť';
                    editButton.onclick = () => openMatchModal(match.id, match);
                    actionsTd.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('action-button', 'delete-button');
                    deleteButton.textContent = 'Vymazať';
                    deleteButton.onclick = async () => {
                        const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento zápas?');
                        if (confirmed) {
                            await deleteMatch(match.id);
                        }
                    };
                    actionsTd.appendChild(deleteButton);
                    tr.appendChild(actionsTd);

                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                dayContainer.appendChild(table);
            } else {
                const noMatchesMsg = document.createElement('p');
                noMatchesMsg.textContent = 'Pre tento deň nie sú naplánované žiadne zápasy.';
                dayContainer.appendChild(noMatchesMsg);
            }
            scheduleContentDiv.appendChild(dayContainer);
        });

        // Načítanie priradení ubytovania po zobrazení rozpisu zápasov
        await loadAccommodationAssignments();

    } catch (error) {
        console.error("Chyba pri načítaní a zobrazení rozpisu zápasov:", error);
        scheduleContentDiv.innerHTML = '<p>Chyba pri načítaní rozpisu zápasov.</p>';
    }
}


/**
 * Zobrazí zoznam definovaných ubytovaní a ich priradení.
 * Načíta dáta z Firestore a dynamicky vytvorí tabuľku.
 */
async function loadAccommodationAssignments() {
    const accommodationContentDiv = document.getElementById('accommodationContent');
    if (!accommodationContentDiv) return;

    accommodationContentDiv.innerHTML = ''; // Vyčistí aktuálny obsah

    try {
        const assignmentsSnapshot = await getDocs(query(collection(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments'), orderBy("accommodationName", "asc")));
        const allClubsSnapshot = await getDocs(clubsCollectionRef);
        const allCategoriesSnapshot = await getDocs(categoriesCollectionRef);
        const allGroupsSnapshot = await getDocs(groupsCollectionRef);

        const allClubs = new Map(allClubsSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const allCategories = new Map(allCategoriesSnapshot.docs.map(doc => [doc.id, doc.data()]));
        const allGroups = new Map(allGroupsSnapshot.docs.map(doc => [doc.id, doc.data()]));

        const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (assignments.length === 0) {
            accommodationContentDiv.innerHTML = '<p>Zatiaľ nie sú definované žiadne priradenia ubytovania.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('data-table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Typ Ubytovania</th>
                    <th>Názov Ubytovne</th>
                    <th>Kategória</th>
                    <th>Skupina</th>
                    <th>Tím</th>
                    <th>Akcie</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        assignments.forEach(assignment => {
            const tr = document.createElement('tr');
            const categoryName = assignment.categoryId ? allCategories.get(assignment.categoryId)?.name || 'Neznáma kategória' : 'Všetky kategórie';
            const groupName = assignment.groupId ? allGroups.get(assignment.groupId)?.name || 'Neznáma skupina' : 'Všetky skupiny';
            const teamName = assignment.teamId ? allClubs.get(assignment.teamId)?.name || 'Neznámy tím' : 'Všetky tímy';

            tr.innerHTML = `
                <td>${assignment.type || 'Nezadané'}</td>
                <td>${assignment.accommodationName || 'Nezadané'}</td>
                <td>${categoryName}</td>
                <td>${groupName}</td>
                <td>${teamName}</td>
                <td>
                    <button class="action-button edit-button" onclick="openAccommodationAssignmentModal('${assignment.id}', ${JSON.stringify(assignment).replace(/"/g, '&quot;')})">Upraviť</button>
                    <button class="action-button delete-button" onclick="deleteAccommodationAssignment('${assignment.id}')">Vymazať</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        accommodationContentDiv.appendChild(table);

    } catch (error) {
        console.error("Chyba pri načítaní priradení ubytovania:", error);
        accommodationContentDiv.innerHTML = '<p>Chyba pri načítaní priradení ubytovania.</p>';
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Inicializačné zobrazenie
    await displayMatchesAsSchedule();
    await loadAccommodationAssignments();

    // Event listener pre hlavné tlačidlo pridania
    if (addButton) {
        addButton.addEventListener('click', toggleAddOptions);
    }

    // Event listener pre tlačidlo "Pridať hrací deň"
    if (addPlayingDayButton) {
        addPlayingDayButton.addEventListener('click', () => {
            openPlayingDayModal();
            toggleAddOptions(); // Zatvorí dropdown
        });
    }

    // Event listener pre tlačidlo "Pridať miesto"
    if (addPlaceButton) {
        addPlaceButton.addEventListener('click', () => {
            openPlaceModal();
            toggleAddOptions(); // Zatvorí dropdown
        });
    }

    // Event listener pre tlačidlo "Pridať zápas"
    if (addMatchButton) {
        addMatchButton.addEventListener('click', () => {
            openMatchModal();
            toggleAddOptions(); // Zatvorí dropdown
        });
    }

    // Event listener pre tlačidlo "Pridať priradenie ubytovania"
    const addAccommodationAssignmentButton = document.getElementById('addAccommodationAssignmentButton');
    if (addAccommodationAssignmentButton) {
        addAccommodationAssignmentButton.addEventListener('click', () => {
            openAccommodationAssignmentModal();
        });
    }

    // Formulár pre hrací deň
    if (playingDayForm) {
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

                // Kontrola duplicity dátumu hracieho dňa
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
    }

    // Tlačidlo vymazania hracieho dňa v modálnom okne
    if (deletePlayingDayButtonModal) {
        deletePlayingDayButtonModal.addEventListener('click', async () => {
            if (currentPlayingDayId) {
                const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento hrací deň a všetky jeho zápasy?');
                if (confirmed) {
                    await deletePlayingDay(currentPlayingDayId);
                }
            }
        });
    }

    // Zatvorenie modálneho okna hracieho dňa
    if (playingDayModalCloseBtn) {
        playingDayModalCloseBtn.addEventListener('click', () => {
            closeModal(playingDayModal);
            resetPlayingDayForm();
        });
    }

    // Formulár pre miesto
    if (placeForm) {
        placeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('placeId').value;
            const name = document.getElementById('placeName').value.trim();

            // Základná validácia
            if (!name) {
                await showMessage('Chyba', 'Prosím, zadajte názov miesta.');
                return;
            }

            try {
                const q = query(placesCollectionRef, where("name", "==", name));
                const querySnapshot = await getDocs(q);

                // Kontrola duplicity názvu miesta
                if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                    await showMessage('Chyba', 'Miesto s týmto názvom už existuje!');
                    return;
                }

                const placeData = { name: name };

                if (id) {
                    await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                    await showMessage('Úspech', 'Miesto úspešne upravené!');
                } else {
                    await addDoc(placesCollectionRef, { ...placeData, createdAt: new Date() });
                    await showMessage('Úspech', 'Miesto úspešne pridané!');
                }
                closeModal(placeModal);
                await displayMatchesAsSchedule(); // Prekresliť rozpis, aby sa aktualizovali miesta
            } catch (error) {
                console.error("Chyba pri ukladaní miesta:", error);
                await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
            }
        });
    }

    // Tlačidlo vymazania miesta v modálnom okne
    if (deletePlaceButtonModal) {
        deletePlaceButtonModal.addEventListener('click', async () => {
            if (currentPlaceId) {
                const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto miesto? Bude odstránené zo všetkých zápasov, ktoré ho používajú.');
                if (confirmed) {
                    await deletePlace(currentPlaceId);
                }
            }
        });
    }

    // Zatvorenie modálneho okna miesta
    if (placeModalCloseBtn) {
        placeModalCloseBtn.addEventListener('click', () => {
            closeModal(placeModal);
            resetPlaceForm();
        });
    }

    // Formulár pre zápas
    if (matchForm) {
        matchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('matchId').value;
            const playingDayId = matchPlayingDaySelect.value;
            const categoryId = matchCategorySelect.value;
            const groupId = matchGroupSelect.value;
            const team1Id = matchTeam1Select.value;
            const team2Id = matchTeam2Select.value;
            const placeId = matchPlaceSelect.value;
            const time = matchTimeInput.value;

            // Validácia, že všetky potrebné polia sú vyplnené
            if (!playingDayId || !categoryId || !groupId || !team1Id || !team2Id || !placeId || !time) {
                await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre zápas.');
                return;
            }
            if (team1Id === team2Id) {
                await showMessage('Chyba', 'Tímy 1 a 2 nemôžu byť rovnaké!');
                return;
            }

            try {
                const matchData = {
                    playingDayId: playingDayId,
                    categoryId: categoryId,
                    groupId: groupId,
                    team1Id: team1Id,
                    team2Id: team2Id,
                    placeId: placeId,
                    time: time
                };

                if (id) {
                    // Úprava existujúceho zápasu
                    await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
                    await showMessage('Úspech', 'Zápas úspešne upravený!');
                } else {
                    // Pridanie nového zápasu
                    // Kontrola duplicity: nemôžu sa stretnúť rovnaké tímy v rovnakej kategórii, skupine, dni a čase
                    const existingMatchesQuery = query(matchesCollectionRef,
                        where('playingDayId', '==', playingDayId),
                        where('time', '==', time),
                        where('placeId', '==', placeId)
                    );
                    const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
                    const isDuplicate = existingMatchesSnapshot.docs.some(doc => {
                        const existingMatch = doc.data();
                        // Ak sa zhoduje tím 1 s existujúcim tímom 1 A tím 2 s existujúcim tímom 2, OR
                        // Ak sa zhoduje tím 1 s existujúcim tímom 2 A tím 2 s existujúcim tímom 1 (opačný poradie)
                        return (
                            (existingMatch.team1Id === team1Id && existingMatch.team2Id === team2Id) ||
                            (existingMatch.team1Id === team2Id && existingMatch.team2Id === team1Id)
                        );
                    });

                    if (isDuplicate) {
                        await showMessage('Chyba', 'Zápas medzi týmito dvoma tímami v rovnakom čase a mieste už existuje!');
                        return;
                    }

                    await addDoc(matchesCollectionRef, { ...matchData, createdAt: new Date() });
                    await showMessage('Úspech', 'Zápas úspešne pridaný!');
                }
                closeModal(matchModal);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri ukladaní zápasu:", error);
                await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
            }
        });
    }

    // Tlačidlo vymazania zápasu v modálnom okne
    if (deleteMatchButtonModal) {
        deleteMatchButtonModal.addEventListener('click', async () => {
            if (currentMatchId) {
                const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento zápas?');
                if (confirmed) {
                    await deleteMatch(currentMatchId);
                }
            }
        });
    }

    // Zatvorenie modálneho okna zápasu
    if (matchModalCloseBtn) {
        matchModalCloseBtn.addEventListener('click', () => {
            closeModal(matchModal);
            resetMatchForm();
        });
    }

    // Event listener pre zmenu kategórie v modále zápasu
    if (matchCategorySelect) {
        matchCategorySelect.addEventListener('change', async () => {
            const selectedCategoryId = matchCategorySelect.value;
            // Keď sa zmení kategória, resetuj a naplň skupiny a tímy
            if (selectedCategoryId) {
                await populateGroupSelect(matchGroupSelect, selectedCategoryId);
                matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam1Select.disabled = true;
                matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam2Select.disabled = true;
            } else {
                matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                matchGroupSelect.disabled = true;
                matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam1Select.disabled = true;
                matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam2Select.disabled = true;
            }
        });
    }

    // Event listener pre zmenu skupiny v modále zápasu
    if (matchGroupSelect) {
        matchGroupSelect.addEventListener('change', async () => {
            const selectedCategoryId = matchCategorySelect.value;
            const selectedGroupId = matchGroupSelect.value;
            // Keď sa zmení skupina, naplň tímy
            if (selectedCategoryId && selectedGroupId) {
                await populateTeamsSelect(matchTeam1Select, selectedCategoryId, selectedGroupId);
                await populateTeamsSelect(matchTeam2Select, selectedCategoryId, selectedGroupId);
            } else {
                matchTeam1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam1Select.disabled = true;
                matchTeam2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
                matchTeam2Select.disabled = true;
            }
        });
    }

    // Formulár pre priradenie ubytovania
    if (accommodationAssignmentForm) {
        accommodationAssignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = accommodationAssignmentIdInput.value;
            const accommodationName = accommodationSelect.value;
            const type = accommodationTypeSelect.value;
            const categoryId = accommodationTeamCategorySelect.value || null; // Môže byť null
            const groupId = accommodationTeamGroupSelect.value || null;     // Môže byť null
            const teamId = accommodationTeamSelect.value || null;         // Môže byť null

            if (!accommodationName || !type) {
                await showMessage('Chyba', 'Prosím, vyplňte typ ubytovania a názov ubytovne.');
                return;
            }

            try {
                // Kontrola duplicity pre kombináciu kategória/skupina/tím a typ ubytovania
                let q = query(collection(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments'),
                    where('type', '==', type),
                    where('accommodationName', '==', accommodationName)
                );

                if (categoryId) {
                    q = query(q, where('categoryId', '==', categoryId));
                } else {
                    q = query(q, where('categoryId', '==', null));
                }

                if (groupId) {
                    q = query(q, where('groupId', '==', groupId));
                } else {
                    q = query(q, where('groupId', '==', null));
                }

                if (teamId) {
                    q = query(q, where('teamId', '==', teamId));
                } else {
                    q = query(q, where('teamId', '==', null));
                }

                const querySnapshot = await getDocs(q);
                const isDuplicate = !querySnapshot.empty && (id ? querySnapshot.docs[0].id !== id : true);

                if (isDuplicate) {
                    let errorMessage = 'Toto priradenie ubytovania už existuje!';
                    if (!categoryId && !groupId && !teamId) {
                        errorMessage = `Ubytovňa "${accommodationName}" pre typ "${type}" už je priradená všetkým tímom.`;
                    } else if (categoryId && !groupId && !teamId) {
                        errorMessage = `Ubytovňa "${accommodationName}" pre typ "${type}" už je priradená celej kategórii "${accommodationTeamCategorySelect.options[accommodationTeamCategorySelect.selectedIndex].text}".`;
                    } else if (categoryId && groupId && !teamId) {
                        errorMessage = `Ubytovňa "${accommodationName}" pre typ "${type}" už je priradená celej skupine "${accommodationTeamGroupSelect.options[accommodationTeamGroupSelect.selectedIndex].text}" v kategórii "${accommodationTeamCategorySelect.options[accommodationTeamCategorySelect.selectedIndex].text}".`;
                    } else if (teamId) {
                         errorMessage = `Tím "${accommodationTeamSelect.options[accommodationTeamSelect.selectedIndex].text}" už má priradenú ubytovňu "${accommodationName}" pre typ "${type}".`;
                    }
                    await showMessage('Chyba', errorMessage);
                    return;
                }

                const assignmentData = {
                    type: type,
                    accommodationName: accommodationName,
                    categoryId: categoryId,
                    groupId: groupId,
                    teamId: teamId
                };

                if (id) {
                    await setDoc(doc(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments', id), assignmentData, { merge: true });
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
                } else {
                    await addDoc(collection(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments'), { ...assignmentData, createdAt: new Date() });
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne pridané!');
                }
                closeModal(accommodationAssignmentModal);
                await loadAccommodationAssignments();
            } catch (error) {
                console.error("Chyba pri ukladaní priradenia ubytovania:", error);
                await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
            }
        });
    }

    // Tlačidlo vymazania priradenia ubytovania v modálnom okne
    if (deleteAssignmentButtonModal) {
        deleteAssignmentButtonModal.addEventListener('click', async () => {
            if (currentAccommodationAssignmentId) {
                const confirmed = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto priradenie ubytovania?');
                if (confirmed) {
                    await deleteAccommodationAssignment(currentAccommodationAssignmentId);
                }
            }
        });
    }

    // Zatvorenie modálneho okna priradenia ubytovania
    if (accommodationAssignmentCloseBtn) {
        accommodationAssignmentCloseBtn.addEventListener('click', () => {
            closeModal(accommodationAssignmentModal);
            resetAccommodationAssignmentForm();
        });
    }

    // Event listener pre zmenu kategórie v modále priradenia ubytovania
    if (accommodationTeamCategorySelect) {
        accommodationTeamCategorySelect.addEventListener('change', async () => {
            const selectedCategoryId = accommodationTeamCategorySelect.value;
            // Keď sa zmení kategória, resetuj a naplň skupiny a tímy
            if (selectedCategoryId) {
                await populateGroupSelect(accommodationTeamGroupSelect, selectedCategoryId);
                accommodationTeamSelect.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
                accommodationTeamSelect.disabled = true;
            } else {
                accommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu (nepovinné) --</option>';
                accommodationTeamGroupSelect.disabled = true;
                accommodationTeamSelect.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
                accommodationTeamSelect.disabled = true;
            }
        });
    }

    // Event listener pre zmenu skupiny v modále priradenia ubytovania
    if (accommodationTeamGroupSelect) {
        accommodationTeamGroupSelect.addEventListener('change', async () => {
            const selectedCategoryId = accommodationTeamCategorySelect.value;
            const selectedGroupId = accommodationTeamGroupSelect.value;
            // Keď sa zmení skupina, naplň tímy
            if (selectedCategoryId && selectedGroupId) {
                await populateAccommodationTeamSelect(accommodationTeamSelect, selectedCategoryId, selectedGroupId);
            } else {
                accommodationTeamSelect.innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
                accommodationTeamSelect.disabled = true;
            }
        });
    }
});


// Drag and Drop Logic
let draggedMatch = null;

// Funkcie pre drag and drop
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('match-row')) {
        draggedMatch = e.target;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedMatch.dataset.matchId);
        // Pridaj triedu pre vizuálnu spätnú väzbu pri dragu
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }
});

document.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('match-row')) {
        e.target.classList.remove('dragging');
        draggedMatch = null;
        // Odstráni všetky dočasné zvýraznenia po drag&drop operácii
        document.querySelectorAll('.drop-over-row, .drop-target-active').forEach(el => {
            el.classList.remove('drop-over-row', 'drop-target-active');
        });
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault(); // Umožní drop
    if (draggedMatch) {
        const targetRow = e.target.closest('.match-row');
        const targetDayGroup = e.target.closest('.date-group');

        // Reset všetkých zvýraznení
        document.querySelectorAll('.drop-over-row').forEach(el => el.classList.remove('drop-over-row'));
        document.querySelectorAll('.drop-target-active').forEach(el => el.classList.remove('drop-target-active'));

        if (targetRow && targetRow !== draggedMatch) {
            // Zvýrazni riadok, nad ktorým je myš, pre vloženie medzi existujúce zápasy
            targetRow.classList.add('drop-over-row');
        } else if (targetDayGroup) {
            // Zvýrazni celú skupinu dňa, ak sa má pridať na koniec dňa
            targetDayGroup.classList.add('drop-target-active');
        }
    }
});

document.addEventListener('dragleave', (e) => {
    // Odstráni zvýraznenie, keď opustí cieľovú oblasť
    const targetRow = e.target.closest('.match-row');
    const targetDayGroup = e.target.closest('.date-group');
    if (targetRow) {
        targetRow.classList.remove('drop-over-row');
    }
    if (targetDayGroup) {
        targetDayGroup.classList.remove('drop-target-active');
    }
});


document.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!draggedMatch) return;

    const matchId = draggedMatch.dataset.matchId;
    const originalPlayingDayId = draggedMatch.dataset.playingDayId;
    let newPlayingDayId = originalPlayingDayId;
    let targetMatchId = null; // Zápas, pred ktorý sa má vložiť

    const targetRow = e.target.closest('.match-row');
    const targetDayGroup = e.target.closest('.date-group');

    // Určenie nového hracieho dňa a pozície
    if (targetRow) {
        // Drop na iný zápas -> vložiť pred neho
        newPlayingDayId = targetRow.dataset.playingDayId;
        targetMatchId = targetRow.dataset.matchId;
    } else if (targetDayGroup) {
        // Drop na hlavičku dňa alebo prázdnu oblasť dňa -> pridať na koniec tohto dňa
        newPlayingDayId = targetDayGroup.dataset.dayId;
        targetMatchId = null; // Žiadny konkrétny cieľový zápas pre vloženie
    } else {
        // Drop mimo platnú oblasť
        return;
    }

    // Ak sa zápas presúva v rámci rovnakého dňa a na rovnakú pozíciu, nerob nič
    if (originalPlayingDayId === newPlayingDayId && !targetMatchId) {
        // Ak sa presúva na koniec rovnakého dňa, kde už je
        const matchesInTargetDay = Array.from(document.querySelectorAll(`.date-group[data-day-id="${newPlayingDayId}"] .match-row`));
        if (matchesInTargetDay.length > 0 && matchesInTargetDay[matchesInTargetDay.length - 1] === draggedMatch) {
            return; // Už je na konci, nič sa nemení
        }
    }


    try {
        const batch = writeBatch(db);
        const matchRef = doc(matchesCollectionRef, matchId);
        const currentMatchDoc = await getDoc(matchRef);
        const currentMatchData = currentMatchDoc.data();

        // Ak sa zmenil hrací deň, aktualizujeme playingDayId
        if (originalPlayingDayId !== newPlayingDayId) {
            batch.update(matchRef, { playingDayId: newPlayingDayId });
        }

        // Preorganizovanie poradia zápasov
        const matchesInNewDayQuery = query(matchesCollectionRef, where('playingDayId', '==', newPlayingDayId), orderBy('time', 'asc'));
        const matchesInNewDaySnapshot = await getDocs(matchesInNewDayQuery);
        let updatedMatches = matchesInNewDaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Odstráň presunutý zápas z pôvodného zoznamu (ak bol v tom istom dni)
        updatedMatches = updatedMatches.filter(m => m.id !== matchId);

        // Nájdi index, kam vložiť presunutý zápas
        let insertIndex = updatedMatches.length; // Predvolene na koniec
        if (targetMatchId) {
            const targetIndex = updatedMatches.findIndex(m => m.id === targetMatchId);
            if (targetIndex !== -1) {
                insertIndex = targetIndex;
            }
        }

        // Vlož presunutý zápas do nového zoznamu na správnu pozíciu
        updatedMatches.splice(insertIndex, 0, { id: matchId, ...currentMatchData });

        // Prepočítať a aktualizovať časy
        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, newPlayingDayId));
        const playingDayDate = playingDayDoc.exists() ? playingDayDoc.data().date : null;

        if (!playingDayDate) {
            await showMessage('Chyba', 'Nepodarilo sa nájsť dátum cieľového hracieho dňa.');
            return;
        }

        const settingsDoc = await getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID));
        const settings = settingsDoc.exists() ? settingsDoc.data() : {};
        const categorySettings = settings.categoryMatchSettings || {};
        const firstDayStartTime = settings.firstDayStartTime || '08:00';
        const otherDaysStartTime = settings.otherDaysStartTime || '09:00';

        const matchDate = new Date(playingDayDate);
        const currentDayFormatted = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;
        const firstDayDate = new Date(Object.values(playingDaysCollectionRef._firestore._databaseId.persistenceKey)
            .find(day => day.name === 'tournamentData')
            ?.properties?.firstDayDate); // Toto je skôr placeholder, reálne by bolo treba načítať zo settings alebo prvého dňa
        
        let startTime = otherDaysStartTime;
        if (firstDayDate && playingDayDate === firstDayDate) { // Potrebujeme definovať, ktorý je "prvý deň"
             startTime = firstDayStartTime;
        }


        let currentTime = parseTimeToMinutes(startTime);

        for (const match of updatedMatches) {
            const matchCategorySettings = categorySettings[match.categoryId];
            const duration = matchCategorySettings ? matchCategorySettings.duration : 15; // Predvolene 15 minút
            const bufferTime = matchCategorySettings ? matchCategorySettings.bufferTime : 5; // Predvolene 5 minút

            match.time = formatMinutesToTime(currentTime);
            batch.update(doc(matchesCollectionRef, match.id), { time: match.time, playingDayId: newPlayingDayId });

            currentTime += duration + bufferTime;
        }

        await batch.commit();
        await showMessage('Úspech', 'Zápas úspešne presunutý a rozpis aktualizovaný!');
        await displayMatchesAsSchedule(); // Prekresliť po úspešnej operácii
    } catch (error) {
        console.error("Chyba pri presúvaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu. Detail: ${error.message}`);
    }
    draggedMatch = null;
    document.querySelectorAll('.drop-over-row, .drop-target-active').forEach(el => {
        el.classList.remove('drop-over-row', 'drop-target-active');
    });
});

/**
 * Pomocná funkcia na konverziu času (HH:MM) na minúty od polnoci.
 * @param {string} timeString Čas vo formáte HH:MM.
 * @returns {number} Minúty od polnoci.
 */
function parseTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Pomocná funkcia na konverziu minút od polnoci na čas (HH:MM).
 * @param {number} totalMinutes Minúty od polnoci.
 * @returns {string} Čas vo formáte HH:MM.
 */
function formatMinutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
