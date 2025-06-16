import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

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
            option.value = doc.id; // Používame ID dokumentu ako hodnotu
            option.textContent = place.name;
            selectElement.appendChild(option);
        });
        if (selectedPlaceId) {
            selectElement.value = selectedPlaceId;
        }
    } catch (error) {
        console.error("Chyba pri načítaní miest:", error);
    }
}

/**
 * Populates the accommodation select element with club names.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedClubId=''] The ID of the club to pre-select.
 * @param {string} [categoryId=''] Optional: Filter clubs by category.
 */
async function populateAccommodationClubsSelect(selectElement, selectedClubId = '', categoryId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
    try {
        let q = query(clubsCollectionRef, orderBy('baseName', 'asc'), orderBy('name', 'asc'));
        if (categoryId) {
            q = query(clubsCollectionRef, where('categoryId', '==', categoryId), orderBy('baseName', 'asc'), orderBy('name', 'asc'));
        }
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const club = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = club.name;
            selectElement.appendChild(option);
        });
        if (selectedClubId) {
            selectElement.value = selectedClubId;
        }
    } catch (error) {
        console.error("Chyba pri načítaní tímov pre ubytovanie:", error);
    }
}

/**
 * Populates the accommodation select element with accommodation names.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodation=''] The name of the accommodation to pre-select.
 */
async function populateAccommodationSelect(selectElement, selectedAccommodation = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    // Príklad statických ubytovní, alebo ich môžete načítať z Firestore
    const accommodations = [
        "Hotel Prameň", "Penzión Korytnačka", "Privát u Jozefa", "Športová hala Kvačany"
    ];
    accommodations.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc;
        option.textContent = acc;
        selectElement.appendChild(option);
    });
    if (selectedAccommodation) {
        selectElement.value = selectedAccommodation;
    }
}


const logistikaContentSection = document.getElementById('logistikaContentSection');
const addMatchButton = document.getElementById('addMatchButton');
const playingDayModal = document.getElementById('playingDayModal');
const playingDayForm = document.getElementById('playingDayForm');
const playingDayModalCloseBtn = playingDayModal ? playingDayModal.querySelector('.close') : null;
const placeModal = document.getElementById('placeModal');
const placeForm = document.getElementById('placeForm');
const placeModalCloseBtn = placeModal ? placeModal.querySelector('.close') : null;
const matchModal = document.getElementById('matchModal');
const matchForm = document.getElementById('matchForm');
const matchModalCloseBtn = matchModal ? matchModal.querySelector('.close') : null;
const playingDaySelectMatch = document.getElementById('playingDaySelectMatch');
const placeSelectMatch = document.getElementById('placeSelectMatch');
const categorySelectMatch = document.getElementById('categorySelectMatch');
const team1SelectMatch = document.getElementById('team1SelectMatch');
const team2SelectMatch = document.getElementById('team2SelectMatch');
const matchTimeInput = document.getElementById('matchTimeInput');
const matchNumberInput = document.getElementById('matchNumberInput');
const assignMatchNumberAutomaticallyCheckbox = document.getElementById('assignMatchNumberAutomatically');
const playingDayModalTitle = document.getElementById('playingDayModalTitle');
const placeModalTitle = document.getElementById('placeModalTitle');
const matchModalTitle = document.getElementById('matchModalTitle');
const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');
const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');
const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');
const addPlayingDayButton = document.getElementById('addPlayingDayButton');
const addPlaceButton = document.getElementById('addPlaceButton');
const addButton = document.getElementById('addButton');
const addOptions = document.getElementById('addOptions');

const accommodationModal = document.getElementById('accommodationModal');
const accommodationForm = document.getElementById('accommodationForm');
const accommodationModalCloseBtn = accommodationModal ? accommodationModal.querySelector('.close') : null;
const accommodationCategorySelect = document.getElementById('accommodationCategorySelect');
const accommodationClubSelect = document.getElementById('accommodationClubSelect');
const accommodationSelect = document.getElementById('accommodationSelect');
const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');
const addAccommodationAssignmentButton = document.getElementById('addAccommodationAssignmentButton');


let currentPlayingDayModalMode = 'add';
let editingPlayingDayId = null;
let currentPlaceModalMode = 'add';
let editingPlaceId = null;
let currentMatchModalMode = 'add';
let editingMatchId = null;
let currentAccommodationModalMode = 'add';
let editingAccommodationAssignmentId = null; // Stores the ID of the document being edited

// Global variable to store info about a recently ghosted match for display purposes
let ghostedMatchInfo = null;


/**
 * Opens the match modal for adding or editing a match.
 * @param {string|null} matchId - ID of the match, if editing an existing match.
 * @param {object|null} matchData - Data of the match, if editing an existing match.
 */
async function openMatchModal(matchId = null, matchData = null) {
    if (!matchModal || !matchForm || !playingDaySelectMatch || !placeSelectMatch || !categorySelectMatch || !team1SelectMatch || !team2SelectMatch || !matchTimeInput || !matchNumberInput || !matchModalTitle || !deleteMatchButtonModal) return;

    resetMatchModal(); // Reset the form first

    currentMatchModalMode = matchId ? 'edit' : 'add';
    editingMatchId = matchId;

    if (currentMatchModalMode === 'edit' && matchData) {
        matchModalTitle.textContent = 'Upraviť zápas';
        document.getElementById('playingDayIdMatch').value = matchId; // Set match ID for editing
        await populatePlayingDaysSelect(playingDaySelectMatch, matchData.playingDay);
        await populatePlacesSelect(placeSelectMatch, matchData.placeId);
        await populateCategorySelect(categorySelectMatch, matchData.categoryId);
        await populateTeamSelect(team1SelectMatch, matchData.categoryId, matchData.team1Id);
        await populateTeamSelect(team2SelectMatch, matchData.categoryId, matchData.team2Id);
        matchTimeInput.value = matchData.time;
        matchNumberInput.value = matchData.matchNumber || '';
        assignMatchNumberAutomaticallyCheckbox.checked = matchData.assignMatchNumberAutomatically || false;
        matchNumberInput.disabled = assignMatchNumberAutomaticallyCheckbox.checked;

        deleteMatchButtonModal.style.display = 'block'; // Show delete button for editing
        deleteMatchButtonModal.onclick = () => handleDeleteMatch(matchId);
    } else {
        matchModalTitle.textContent = 'Pridať zápas';
        deleteMatchButtonModal.style.display = 'none'; // Hide delete button for adding
        document.getElementById('playingDayIdMatch').value = ''; // Clear match ID
        await populatePlayingDaysSelect(playingDaySelectMatch);
        await populatePlacesSelect(placeSelectMatch);
        await populateCategorySelect(categorySelectMatch);
        // Team selects will be populated based on category selection
        matchNumberInput.disabled = assignMatchNumberAutomaticallyCheckbox.checked;

    }
    openModal(matchModal);
}

/**
 * Resets the match modal form fields and state.
 */
function resetMatchModal() {
    if (!matchForm || !matchNumberInput || !assignMatchNumberAutomaticallyCheckbox || !team1SelectMatch || !team2SelectMatch) return;
    matchForm.reset();
    matchNumberInput.disabled = false;
    assignMatchNumberAutomaticallyCheckbox.checked = false;
    team1SelectMatch.innerHTML = '<option value="">-- Vyberte tím --</option>';
    team2SelectMatch.innerHTML = '<option value="">-- Vyberte tím --</option>';
    editingMatchId = null;
    currentMatchModalMode = 'add';
    if (deleteMatchButtonModal) {
        deleteMatchButtonModal.style.display = 'none';
    }
}

// Event listener for category selection in match modal
if (categorySelectMatch) {
    categorySelectMatch.addEventListener('change', async () => {
        const categoryId = categorySelectMatch.value;
        await populateTeamSelect(team1SelectMatch, categoryId);
        await populateTeamSelect(team2SelectMatch, categoryId);
    });
}

// Event listener for automatic match number assignment checkbox
if (assignMatchNumberAutomaticallyCheckbox) {
    assignMatchNumberAutomaticallyCheckbox.addEventListener('change', () => {
        if (matchNumberInput) {
            matchNumberInput.disabled = assignMatchNumberAutomaticallyCheckbox.checked;
            if (assignMatchNumberAutomaticallyCheckbox.checked) {
                matchNumberInput.value = ''; // Clear value if automatic
            }
        }
    });
}

/**
 * Populates a select element with teams belonging to a specific category.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} categoryId The ID of the category.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamSelect(selectElement, categoryId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!categoryId) return; // Don't load teams if no category is selected

    try {
        const q = query(clubsCollectionRef, where('categoryId', '==', categoryId), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
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
    } catch (error) {
        console.error("Chyba pri načítaní tímov:", error);
    }
}

// Match form submission
if (matchForm) {
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const playingDay = playingDaySelectMatch.value;
        const placeId = placeSelectMatch.value;
        const categoryId = categorySelectMatch.value;
        const team1Id = team1SelectMatch.value;
        const team2Id = team2SelectMatch.value;
        const time = matchTimeInput.value;
        let matchNumber = matchNumberInput.value;
        const assignAutomatically = assignMatchNumberAutomaticallyCheckbox.checked;

        // Basic validation
        if (!playingDay || !placeId || !categoryId || !team1Id || !team2Id || !time) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Dátum, Miesto, Kategória, Tím 1, Tím 2, Čas).');
            return;
        }
        if (team1Id === team2Id) {
            await showMessage('Chyba', 'Tím 1 a Tím 2 nemôžu byť rovnaké.');
            return;
        }
        if (!assignAutomatically && !matchNumber) {
            await showMessage('Chyba', 'Prosím, zadajte číslo zápasu alebo zaškrtnite možnosť automatického priradenia.');
            return;
        }

        try {
            // Get category name for display
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? categoryDoc.data().name : 'Neznáma kategória';

            // Get team names for display
            const team1Doc = await getDoc(doc(clubsCollectionRef, team1Id));
            const team1Name = team1Doc.exists() ? team1Doc.data().name : 'Neznámy tím';
            const team2Doc = await getDoc(doc(clubsCollectionRef, team2Id));
            const team2Name = team2Doc.exists() ? team2Doc.data().name : 'Neznámy tím';

            // Handle automatic match number assignment
            if (assignAutomatically) {
                const q = query(matchesCollectionRef, orderBy('matchNumber', 'desc'));
                const querySnapshot = await getDocs(q);
                let maxMatchNumber = 0;
                if (!querySnapshot.empty) {
                    // Filter out non-numeric values and convert to number
                    const numbers = querySnapshot.docs.map(d => parseInt(d.data().matchNumber)).filter(n => !isNaN(n));
                    if (numbers.length > 0) {
                        maxMatchNumber = Math.max(...numbers);
                    }
                }
                matchNumber = (maxMatchNumber + 1).toString(); // Convert to string as Firestore stores it as string
            } else {
                // Check for duplicate match number if manually entered
                const q = query(matchesCollectionRef, where('matchNumber', '==', matchNumber));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty && (currentMatchModalMode === 'add' || querySnapshot.docs[0].id !== editingMatchId)) {
                    await showMessage('Chyba', `Zápas s číslom ${matchNumber} už existuje!`);
                    return;
                }
            }


            const matchData = {
                playingDay,
                placeId,
                categoryId,
                team1Id,
                team2Id,
                time,
                matchNumber: matchNumber, // Always store as string
                categoryName,
                team1Name,
                team2Name,
                assignMatchNumberAutomatically: assignAutomatically,
                // Pridáme aj categoryDisplayName ak je k dispozícii v spravca-turnaja-common.js
                // categoryDisplayName: (await getDoc(doc(categoriesCollectionRef, categoryId))).data().name
            };

            if (currentMatchModalMode === 'edit' && editingMatchId) {
                await setDoc(doc(matchesCollectionRef, editingMatchId), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!');
            } else {
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

/**
 * Handles the deletion of a match.
 * @param {string} matchId The ID of the match to delete.
 */
async function handleDeleteMatch(matchId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento zápas?');
    if (!confirmed) return;

    try {
        await deleteDoc(doc(matchesCollectionRef, matchId));
        await showMessage('Úspech', 'Zápas úspešne vymazaný!');
        closeModal(matchModal);
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní zápasu. Detail: ${error.message}`);
    }
}


// Event listeners for Add/Edit Playing Day
if (addPlayingDayButton) {
    addPlayingDayButton.addEventListener('click', () => openPlayingDayModal(null));
}

if (playingDayForm) {
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('playingDayId').value;
        const date = document.getElementById('playingDayDate').value;

        // Basic validation
        if (!date) {
            await showMessage('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            // Check for duplicate playing day date
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

/**
 * Opens the playing day modal for adding or editing.
 * @param {string|null} playingDayId - ID of the playing day, if editing.
 */
async function openPlayingDayModal(playingDayId = null) {
    if (!playingDayModal || !playingDayForm || !playingDayModalTitle || !deletePlayingDayButtonModal) return;

    resetPlayingDayModal();
    currentPlayingDayModalMode = playingDayId ? 'edit' : 'add';
    editingPlayingDayId = playingDayId;

    if (currentPlayingDayModalMode === 'edit' && playingDayId) {
        playingDayModalTitle.textContent = 'Upraviť hrací deň';
        document.getElementById('playingDayId').value = playingDayId; // Set the ID for editing
        try {
            const docSnap = await getDoc(doc(playingDaysCollectionRef, playingDayId));
            if (docSnap.exists()) {
                document.getElementById('playingDayDate').value = docSnap.data().date;
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracieho dňa na úpravu:", error);
        }
        deletePlayingDayButtonModal.style.display = 'block';
        deletePlayingDayButtonModal.onclick = () => handleDeletePlayingDay(playingDayId);
    } else {
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
        document.getElementById('playingDayId').value = ''; // Clear ID for adding
    }
    openModal(playingDayModal);
}

/**
 * Resets the playing day modal form fields.
 */
function resetPlayingDayModal() {
    if (!playingDayForm) return;
    playingDayForm.reset();
    editingPlayingDayId = null;
    currentPlayingDayModalMode = 'add';
    if (deletePlayingDayButtonModal) {
        deletePlayingDayButtonModal.style.display = 'none';
    }
}

/**
 * Handles the deletion of a playing day.
 * @param {string} playingDayId The ID of the playing day to delete.
 */
async function handleDeletePlayingDay(playingDayId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento hrací deň? Všetky zápasy priradené k tomuto dňu budú tiež vymazané!');
    if (!confirmed) return;

    try {
        const batch = writeBatch(db);

        // Delete matches associated with this playing day
        const matchesQuery = query(matchesCollectionRef, where('playingDay', '==', document.getElementById('playingDayDate').value));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        // Delete the playing day document
        batch.delete(doc(playingDaysCollectionRef, playingDayId));

        await batch.commit();

        await showMessage('Úspech', 'Hrací deň a priradené zápasy úspešne vymazané!');
        closeModal(playingDayModal);
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní hracieho dňa. Detail: ${error.message}`);
    }
}


// Event listeners for Add/Edit Place
if (addPlaceButton) {
    addPlaceButton.addEventListener('click', () => openPlaceModal(null));
}

if (placeForm) {
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('placeId').value;
        const name = document.getElementById('placeName').value;

        if (!name) {
            await showMessage('Chyba', 'Prosím, zadajte názov miesta.');
            return;
        }

        try {
            const q = query(placesCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

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
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní miesta:", error);
            await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
        }
    });
}

/**
 * Opens the place modal for adding or editing.
 * @param {string|null} placeId - ID of the place, if editing.
 */
async function openPlaceModal(placeId = null) {
    if (!placeModal || !placeForm || !placeModalTitle || !deletePlaceButtonModal) return;

    resetPlaceModal();
    currentPlaceModalMode = placeId ? 'edit' : 'add';
    editingPlaceId = placeId;

    if (currentPlaceModalMode === 'edit' && placeId) {
        placeModalTitle.textContent = 'Upraviť miesto';
        document.getElementById('placeId').value = placeId; // Set the ID for editing
        try {
            const docSnap = await getDoc(doc(placesCollectionRef, placeId));
            if (docSnap.exists()) {
                document.getElementById('placeName').value = docSnap.data().name;
            }
        } catch (error) {
            console.error("Chyba pri načítaní miesta na úpravu:", error);
        }
        deletePlaceButtonModal.style.display = 'block';
        deletePlaceButtonModal.onclick = () => handleDeletePlace(placeId);
    } else {
        placeModalTitle.textContent = 'Pridať miesto';
        deletePlaceButtonButton.style.display = 'none';
        document.getElementById('placeId').value = ''; // Clear ID for adding
    }
    openModal(placeModal);
}

/**
 * Resets the place modal form fields.
 */
function resetPlaceModal() {
    if (!placeForm) return;
    placeForm.reset();
    editingPlaceId = null;
    currentPlaceModalMode = 'add';
    if (deletePlaceButtonModal) {
        deletePlaceButtonModal.style.display = 'none';
    }
}

/**
 * Handles the deletion of a place.
 * @param {string} placeId The ID of the place to delete.
 */
async function handleDeletePlace(placeId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať toto miesto? Všetky zápasy priradené k tomuto miestu budú tiež vymazané!');
    if (!confirmed) return;

    try {
        const batch = writeBatch(db);

        // Delete matches associated with this place
        const matchesQuery = query(matchesCollectionRef, where('placeId', '==', placeId));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        // Delete the place document
        batch.delete(doc(placesCollectionRef, placeId));

        await batch.commit();

        await showMessage('Úspech', 'Miesto a priradené zápasy úspešne vymazané!');
        closeModal(placeModal);
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní miesta:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní miesta. Detail: ${error.message}`);
    }
}


// Schedule Display Logic
async function displayMatchesAsSchedule() {
    const scheduleContainer = document.getElementById('scheduleContainer');
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = 'Načítavam rozpis zápasov...';

    try {
        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy("playingDay", "asc"), orderBy("time", "asc"), orderBy("matchNumber", "asc")));
        const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const placesMap = new Map(placesSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        if (playingDays.length === 0) {
            scheduleContainer.innerHTML = '<p>Žiadne hracie dni neboli nájdené.</p>';
            return;
        }

        let scheduleHTML = '';
        playingDays.forEach(day => {
            scheduleHTML += `<div class="date-group" data-date="${day.date}">
                                <h3 class="date-header" draggable="true" data-playing-day-id="${day.id}" data-date="${day.date}">
                                    ${formatDate(day.date)} 
                                    <span class="edit-icon" title="Upraviť hrací deň" onclick="openPlayingDayModalWrapper('${day.id}')">&#9998;</span>
                                    <span class="delete-icon" title="Vymazať hrací deň" onclick="handleDeletePlayingDay('${day.id}')">&#128465;</span>
                                </h3>
                                <div class="places-grid">`;

            const placesForDay = new Set(matches.filter(m => m.playingDay === day.date).map(m => m.placeId));
            const sortedPlaces = Array.from(placesForDay).sort((a, b) => {
                const nameA = placesMap.get(a) || '';
                const nameB = placesMap.get(b) || '';
                return nameA.localeCompare(nameB);
            });
            
            // Add all available places to the grid, even if they don't have matches on this day
            placesSnapshot.docs.forEach(placeDoc => {
                const placeId = placeDoc.id;
                const placeName = placeDoc.data().name;

                scheduleHTML += `<div class="place-column" data-place-id="${placeId}">
                                    <h4 class="place-header" draggable="true" data-place-id="${placeId}" data-place-name="${placeName}">
                                        ${placeName}
                                        <span class="edit-icon" title="Upraviť miesto" onclick="openPlaceModalWrapper('${placeId}')">&#9998;</span>
                                        <span class="delete-icon" title="Vymazať miesto" onclick="handleDeletePlace('${placeId}')">&#128465;</span>
                                    </h4>
                                    <div class="match-list" data-date="${day.date}" data-place-id="${placeId}">`;

                const matchesInThisPlace = matches.filter(m => m.playingDay === day.date && m.placeId === placeId);
                
                // Add ghost logic here
                let ghostRendered = false;
                if (ghostedMatchInfo && ghostedMatchInfo.playingDay === day.date && ghostedMatchInfo.placeId === placeId) {
                    // Check if there's an actual match at this exact time in this location (prevent ghosting over real matches)
                    const actualMatchAtGhostTime = matchesInThisPlace.some(m => m.time === ghostedMatchInfo.time);
                    if (!actualMatchAtGhostTime) {
                        scheduleHTML += `<div class="match-row ghost-match-row">
                                            <span class="match-time">${ghostedMatchInfo.time}</span>
                                        </div>`;
                        ghostRendered = true;
                    }
                }

                if (matchesInThisPlace.length === 0 && !ghostRendered) {
                    scheduleHTML += `<p class="no-matches">Žiadne zápasy</p>`;
                } else {
                    matchesInThisPlace.forEach(match => {
                        scheduleHTML += `<div class="match-row draggable" draggable="true" data-match-id="${match.id}" data-category-id="${match.categoryId}">
                                            <span class="match-number">${match.matchNumber}</span>
                                            <span class="match-time">${match.time}</span>
                                            <span class="match-teams">${match.team1Name} vs ${match.team2Name}</span>
                                            <span class="match-category">${match.categoryName}</span>
                                            <span class="edit-icon" title="Upraviť zápas" onclick="openMatchModalWrapper('${match.id}', ${JSON.stringify(match).split("'").join("&apos;")})">&#9998;</span>
                                            <span class="delete-icon" title="Vymazať zápas" onclick="handleDeleteMatch('${match.id}')">&#128465;</span>
                                        </div>`;
                    });
                }
                scheduleHTML += `</div></div>`; // Close match-list and place-column
            });

            scheduleHTML += `</div></div>`; // Close places-grid and date-group
        });

        scheduleContainer.innerHTML = scheduleHTML;
        addDragAndDropListeners();

        // Clear the ghostedMatchInfo after successful re-render
        // This makes the ghost temporary, only for the last move.
        // If the user wants it to persist indefinitely, more complex logic (e.g. storing in Firestore) is needed.
        ghostedMatchInfo = null;

    } catch (error) {
        console.error("Chyba pri načítaní a zobrazení rozpisu:", error);
        scheduleContainer.innerHTML = '<p>Chyba pri načítaní rozpisu zápasov.</p>';
    }
}

// Global functions for inline onclick, as dynamic HTML can't directly access module functions
window.openPlayingDayModalWrapper = (id) => openPlayingDayModal(id);
window.openPlaceModalWrapper = (id) => openPlaceModal(id);
window.openMatchModalWrapper = (id, data) => openMatchModal(id, data);


function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('sk-SK', options);
}


// Event listeners for the main add button and options dropdown
if (addButton && addOptions) {
    addButton.addEventListener('click', () => {
        addOptions.classList.toggle('show');
    });

    // Close the dropdown if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (!event.target.matches('.add-button') && !event.target.closest('.add-options-dropdown')) {
            if (addOptions.classList.contains('show')) {
                addOptions.classList.remove('show');
            }
        }
    });
}

// Initial load of the schedule when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    await displayMatchesAsSchedule(); // Display matches as soon as content is loaded

    // Modal close buttons
    if (playingDayModalCloseBtn) {
        playingDayModalCloseBtn.addEventListener('click', () => {
            closeModal(playingDayModal);
            resetPlayingDayModal();
        });
    }
    if (placeModalCloseBtn) {
        placeModalCloseBtn.addEventListener('click', () => {
            closeModal(placeModal);
            resetPlaceModal();
        });
    }
    if (matchModalCloseBtn) {
        matchModalCloseBtn.addEventListener('click', () => {
            closeModal(matchModal);
            resetMatchModal();
        });
    }
    if (accommodationModalCloseBtn) {
        accommodationModalCloseBtn.addEventListener('click', () => {
            closeModal(accommodationModal);
            resetAccommodationModal();
        });
    }


    // Close modals by clicking outside
    if (playingDayModal) {
        window.addEventListener('click', (event) => {
            if (event.target === playingDayModal) {
                closeModal(playingDayModal);
                resetPlayingDayModal();
            }
        });
    }
    if (placeModal) {
        window.addEventListener('click', (event) => {
            if (event.target === placeModal) {
                closeModal(placeModal);
                resetPlaceModal();
            }
        });
    }
    if (matchModal) {
        window.addEventListener('click', (event) => {
            if (event.target === matchModal) {
                closeModal(matchModal);
                resetMatchModal();
            }
        });
    }
    if (accommodationModal) {
        window.addEventListener('click', (event) => {
            if (event.target === accommodationModal) {
                closeModal(accommodationModal);
                resetAccommodationModal();
            }
        });
    }

    // Accommodation assignment
    if (addAccommodationAssignmentButton) {
        addAccommodationAssignmentButton.addEventListener('click', () => openAccommodationModal(null));
    }

    if (accommodationCategorySelect) {
        accommodationCategorySelect.addEventListener('change', async () => {
            const categoryId = accommodationCategorySelect.value;
            await populateAccommodationClubsSelect(accommodationClubSelect, '', categoryId);
        });
    }

    if (accommodationForm) {
        accommodationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryId = accommodationCategorySelect.value;
            const clubId = accommodationClubSelect.value; // Optional
            const accommodationName = accommodationSelect.value;

            if (!categoryId || !accommodationName) {
                await showMessage('Chyba', 'Prosím, vyberte kategóriu a ubytovňu.');
                return;
            }

            try {
                let assignmentData = {
                    categoryId: categoryId,
                    accommodationName: accommodationName
                };

                // Add clubId only if it's selected
                if (clubId) {
                    assignmentData.clubId = clubId;
                    // Fetch club name for better display/filtering later
                    const clubDoc = await getDoc(doc(clubsCollectionRef, clubId));
                    if (clubDoc.exists()) {
                        assignmentData.clubName = clubDoc.data().name;
                    }
                }

                // Check for duplicates before saving (important for 'add' mode or if a key field changes in 'edit' mode)
                let qDuplicate;
                if (clubId) {
                    qDuplicate = query(accommodationAssignmentsCollectionRef,
                        where('categoryId', '==', categoryId),
                        where('clubId', '==', clubId),
                        where('accommodationName', '==', accommodationName));
                } else {
                    // For category-wide assignments without a specific club
                    qDuplicate = query(accommodationAssignmentsCollectionRef,
                        where('categoryId', '==', categoryId),
                        where('clubId', '==', null), // Ensure we're checking for category-wide assignments
                        where('accommodationName', '==', accommodationName));
                }

                const duplicateSnapshot = await getDocs(qDuplicate);
                if (!duplicateSnapshot.empty) {
                    if (currentAccommodationModalMode === 'add' || (currentAccommodationModalMode === 'edit' && duplicateSnapshot.docs[0].id !== editingAccommodationAssignmentId)) {
                        await showMessage('Chyba', 'Toto priradenie ubytovania už existuje!');
                        return;
                    }
                }

                if (currentAccommodationModalMode === 'edit' && editingAccommodationAssignmentId) {
                    await setDoc(doc(accommodationAssignmentsCollectionRef, editingAccommodationAssignmentId), assignmentData, { merge: true });
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
                } else {
                    await addDoc(accommodationAssignmentsCollectionRef, { ...assignmentData, createdAt: new Date() });
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne pridané!');
                }
                closeModal(accommodationModal);
                await displayAccommodationAssignments();
            } catch (error) {
                console.error("Chyba pri ukladaní priradenia ubytovania:", error);
                await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
            }
        });
    }
});


// New global variable for accommodation assignments collection
export const accommodationAssignmentsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'accommodationAssignments');


/**
 * Opens the accommodation assignment modal for adding or editing.
 * @param {string|null} assignmentId - ID of the assignment, if editing.
 * @param {object|null} assignmentData - Data of the assignment, if editing.
 */
async function openAccommodationModal(assignmentId = null, assignmentData = null) {
    if (!accommodationModal || !accommodationForm || !accommodationModalCloseBtn || !accommodationCategorySelect || !accommodationClubSelect || !accommodationSelect || !deleteAssignmentButtonModal) return;

    resetAccommodationModal();
    currentAccommodationModalMode = assignmentId ? 'edit' : 'add';
    editingAccommodationAssignmentId = assignmentId;

    if (currentAccommodationModalMode === 'edit' && assignmentData) {
        document.getElementById('accommodationModalTitle').textContent = 'Upraviť priradenie ubytovania';
        await populateCategorySelect(accommodationCategorySelect, assignmentData.categoryId);
        await populateAccommodationClubsSelect(accommodationClubSelect, assignmentData.clubId || '', assignmentData.categoryId);
        await populateAccommodationSelect(accommodationSelect, assignmentData.accommodationName);

        deleteAssignmentButtonModal.style.display = 'block';
        deleteAssignmentButtonModal.onclick = () => handleDeleteAccommodationAssignment(assignmentId);

    } else {
        document.getElementById('accommodationModalTitle').textContent = 'Pridať priradenie ubytovania';
        deleteAssignmentButtonModal.style.display = 'none';
        await populateCategorySelect(accommodationCategorySelect);
        await populateAccommodationClubsSelect(accommodationClubSelect); // Populate initially empty
        await populateAccommodationSelect(accommodationSelect);
    }
    openModal(accommodationModal);
}

/**
 * Resets the accommodation assignment modal form fields.
 */
function resetAccommodationModal() {
    if (!accommodationForm) return;
    accommodationForm.reset();
    editingAccommodationAssignmentId = null;
    currentAccommodationModalMode = 'add';
    if (deleteAssignmentButtonModal) {
        deleteAssignmentButtonModal.style.display = 'none';
    }
}

/**
 * Handles the deletion of an accommodation assignment.
 * @param {string} assignmentId The ID of the assignment to delete.
 */
async function handleDeleteAccommodationAssignment(assignmentId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať toto priradenie ubytovania?');
    if (!confirmed) return;

    try {
        await deleteDoc(doc(accommodationAssignmentsCollectionRef, assignmentId));
        await showMessage('Úspech', 'Priradenie ubytovania úspešne vymazané!');
        closeModal(accommodationModal);
        await displayAccommodationAssignments();
    } catch (error) {
        console.error("Chyba pri vymazávaní priradenia ubytovania:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní priradenia ubytovania. Detail: ${error.message}`);
    }
}


/**
 * Displays accommodation assignments in a schedule format.
 */
async function displayAccommodationAssignments() {
    const accommodationScheduleContainer = document.getElementById('accommodationScheduleContainer');
    if (!accommodationScheduleContainer) return;
    accommodationScheduleContainer.innerHTML = 'Načítavam priradenia ubytovania...';

    try {
        const assignmentsSnapshot = await getDocs(query(accommodationAssignmentsCollectionRef, orderBy("accommodationName", "asc"), orderBy("categoryId", "asc"), orderBy("clubName", "asc")));
        const categoriesSnapshot = await getDocs(query(categoriesCollectionRef, orderBy("name", "asc")));

        const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        if (assignments.length === 0) {
            accommodationScheduleContainer.innerHTML = '<p>Žiadne priradenia ubytovania neboli nájdené.</p>';
            return;
        }

        const groupedByAccommodation = assignments.reduce((acc, assignment) => {
            if (!acc[assignment.accommodationName]) {
                acc[assignment.accommodationName] = [];
            }
            acc[assignment.accommodationName].push(assignment);
            return acc;
        }, {});

        let scheduleHTML = '';
        for (const accommodationName of Object.keys(groupedByAccommodation).sort()) {
            scheduleHTML += `<div class="schedule-cell-accommodation">
                                <h3 class="schedule-cell-title">${accommodationName}</h3>
                                <div class="schedule-cell-teams">`;
            
            const assignmentsInAccommodation = groupedByAccommodation[accommodationName].sort((a, b) => {
                const categoryNameA = categoriesMap.get(a.categoryId) || '';
                const categoryNameB = categoriesMap.get(b.categoryId) || '';
                if (categoryNameA !== categoryNameB) {
                    return categoryNameA.localeCompare(categoryNameB);
                }
                const clubNameA = a.clubName || '';
                const clubNameB = b.clubName || '';
                return clubNameA.localeCompare(clubNameB);
            });

            assignmentsInAccommodation.forEach(assignment => {
                const categoryDisplayName = categoriesMap.get(assignment.categoryId) || 'Neznáma kategória';
                const teamDisplayName = assignment.clubName ? ` - ${assignment.clubName}` : ' (Všetky tímy v kategórii)';
                scheduleHTML += `<p>
                                    ${categoryDisplayName}${teamDisplayName} 
                                    <span class="edit-icon" title="Upraviť priradenie" onclick="openAccommodationModalWrapper('${assignment.id}', ${JSON.stringify(assignment).split("'").join("&apos;")})">&#9998;</span>
                                    <span class="delete-icon" title="Vymazať priradenie" onclick="handleDeleteAccommodationAssignment('${assignment.id}')">&#128465;</span>
                                </p>`;
            });

            scheduleHTML += `</div></div>`; // Close schedule-cell-teams and schedule-cell-accommodation
        }

        accommodationScheduleContainer.innerHTML = scheduleHTML;

    } catch (error) {
        console.error("Chyba pri načítaní a zobrazení priradení ubytovania:", error);
        accommodationScheduleContainer.innerHTML = '<p>Chyba pri načítaní priradení ubytovania.</p>';
    }
}

// Global function for inline onclick for accommodation modal
window.openAccommodationModalWrapper = (id, data) => openAccommodationModal(id, data);


// Drag and Drop functionality
let draggedMatch = null;
// Global variable to store info about a recently ghosted match for display purposes
let ghostedMatchInfo = null;


function addDragAndDropListeners() {
    const draggables = document.querySelectorAll('.match-row.draggable');
    const dropTargets = document.querySelectorAll('.match-list');
    const dateHeaders = document.querySelectorAll('.date-header');
    const placeHeaders = document.querySelectorAll('.place-header');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            draggedMatch = {
                id: draggable.dataset.matchId,
                categoryId: draggable.dataset.categoryId, // Keep track of category for potential filtering
                originalParent: draggable.parentNode, // Keep track of original parent
                originalNextSibling: draggable.nextSibling // Keep track of original next sibling for reinsertion
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedMatch.id);
            draggable.classList.add('dragging');
        });

        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            draggedMatch = null;
            // Remove any drop-over-row classes after drag ends
            document.querySelectorAll('.drop-over-row').forEach(el => el.classList.remove('drop-over-row'));
        });
    });

    dropTargets.forEach(target => {
        target.addEventListener('dragover', (e) => {
            e.preventDefault(); // Allow drop
            if (!draggedMatch) return; // Only allow if a match is being dragged

            // Highlight the target row for insertion, or the list itself for appending
            const afterElement = getDragAfterElement(target, e.clientY);
            const currentDragging = document.querySelector('.dragging');

            // Remove existing highlights
            document.querySelectorAll('.drop-over-row').forEach(el => el.classList.remove('drop-over-row'));

            if (afterElement) {
                // If dragging over an existing element, highlight that element for insertion above it
                afterElement.classList.add('drop-over-row');
            } else {
                // If dragging to the end of the list, highlight the list itself
                target.classList.add('drop-over-row'); // Apply to the target list to indicate append
            }
        });

        target.addEventListener('dragleave', (e) => {
            // Remove highlighting when leaving
            target.classList.remove('drop-over-row');
            document.querySelectorAll('.drop-over-row').forEach(el => el.classList.remove('drop-over-row'));
        });

        target.addEventListener('drop', async (e) => {
            e.preventDefault();
            target.classList.remove('drop-over-row'); // Remove highlight on drop

            if (!draggedMatch) return;

            const matchId = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.match-row[data-match-id="${matchId}"]`);

            if (!draggable) return;

            const newPlayingDay = target.dataset.date;
            const newPlaceId = target.dataset.placeId;

            // Get existing match data
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDocSnap = await getDoc(matchDocRef);
            if (!matchDocSnap.exists()) {
                console.error("Presúvaný zápas nebol nájdený vo Firestore.");
                // Revert to original position if Firestore operation fails to prevent visual inconsistency
                if (draggedMatch.originalNextSibling) {
                    draggedMatch.originalParent.insertBefore(draggable, draggedMatch.originalNextSibling);
                } else {
                    draggedMatch.originalParent.appendChild(draggable);
                }
                await showMessage('Chyba', 'Nepodarilo sa nájsť zápas vo Firestore. Skúste obnoviť stránku.');
                return;
            }
            const matchData = matchDocSnap.data();

            const oldPlayingDay = matchData.playingDay;
            const oldPlaceId = matchData.placeId;

            // Check if the target is different from the current location
            if (oldPlayingDay === newPlayingDay && oldPlaceId === newPlaceId) {
                // Same place, just reorder within the current list
                const afterElement = getDragAfterElement(target, e.clientY);
                if (afterElement === draggable || (afterElement && afterElement.previousSibling === draggable)) {
                    // No effective change in position
                    return;
                }
                if (afterElement == null) {
                    target.appendChild(draggable);
                } else {
                    target.insertBefore(draggable, afterElement);
                }
                // No ghost needed if reordering within the same place/day
                ghostedMatchInfo = null;
            } else {
                // Different place, update Firestore
                try {
                    await updateDoc(matchDocRef, {
                        playingDay: newPlayingDay,
                        placeId: newPlaceId
                    });
                    await showMessage('Úspech', 'Zápas úspešne presunutý!');

                    // Store ghost info ONLY if moved to a different location
                    ghostedMatchInfo = {
                        playingDay: oldPlayingDay,
                        placeId: oldPlaceId,
                        time: matchData.time
                    };

                } catch (error) {
                    console.error("Chyba pri aktualizácii zápasu po presune:", error);
                    await showMessage('Chyba', `Chyba pri presune zápasu. Detail: ${error.message}`);
                    ghostedMatchInfo = null; // Clear ghost if update failed
                }
            }
            // Always re-render after any drop to ensure consistent state
            await displayMatchesAsSchedule();
        });
    });

    dateHeaders.forEach(header => {
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            header.classList.add('drop-target-active'); // Highlight for appending a match to this day (if match list is empty)
        });
        header.addEventListener('dragleave', () => {
            header.classList.remove('drop-target-active');
        });
        header.addEventListener('drop', async (e) => {
            e.preventDefault();
            header.classList.remove('drop-target-active');

            if (!draggedMatch) return;

            const matchId = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.match-row[data-match-id="${matchId}"]`);
            if (!draggable) return;

            const newPlayingDay = header.dataset.date;

            // Get existing match data
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDocSnap = await getDoc(matchDocRef);
            if (!matchDocSnap.exists()) {
                console.error("Presúvaný zápas nebol nájdený vo Firestore.");
                return;
            }
            const matchData = matchDocSnap.data();
            const oldPlayingDay = matchData.playingDay;
            const oldPlaceId = matchData.placeId;


            // Find an existing place-column for this day, or default to the first one available
            const targetDayElement = document.querySelector(`.date-group[data-date="${newPlayingDay}"]`);
            const firstPlaceColumn = targetDayElement ? targetDayElement.querySelector('.place-column') : null;
            let newPlaceId = matchData.placeId; // Keep original place if not explicitly dropped on a new one
            
            if (firstPlaceColumn) {
                newPlaceId = firstPlaceColumn.dataset.placeId;
            } else {
                // If no place columns exist for this day, this scenario should ideally not happen
                // or you need logic to create a default place or prevent drop here.
                await showMessage('Chyba', 'Pre tento deň nie je dostupné žiadne miesto na priradenie zápasu.');
                ghostedMatchInfo = null; // Clear ghost if cannot drop
                return;
            }
            
            // If the match is already in this playing day and this place, just reorder (handled by match-list drop)
            if (oldPlayingDay === newPlayingDay && oldPlaceId === newPlaceId) {
                 ghostedMatchInfo = null; // No ghost if no actual move
                 return; // Already handled by match-list drop or no effective change
            }

            // Perform the update in Firestore
            try {
                await updateDoc(matchDocRef, {
                    playingDay: newPlayingDay,
                    placeId: newPlaceId // Update placeId as well, if we default to a specific one
                });
                await showMessage('Úspech', 'Zápas úspešne presunutý do nového hracieho dňa!');
                
                // Store ghost info ONLY if moved to a different location
                ghostedMatchInfo = {
                    playingDay: oldPlayingDay,
                    placeId: oldPlaceId,
                    time: matchData.time
                };

                await displayMatchesAsSchedule(); // Re-render the whole schedule
            } catch (error) {
                console.error("Chyba pri aktualizácii zápasu po presune na dátum:", error);
                await showMessage('Chyba', `Chyba pri presune zápasu. Detail: ${error.message}`);
                ghostedMatchInfo = null; // Clear ghost if update failed
            }
        });
    });

    placeHeaders.forEach(header => {
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            header.classList.add('drop-target-active'); // Highlight for appending a match to this place
        });
        header.addEventListener('dragleave', () => {
            header.classList.remove('drop-target-active');
        });
        header.addEventListener('drop', async (e) => {
            e.preventDefault();
            header.classList.remove('drop-target-active');

            if (!draggedMatch) return;

            const matchId = e.dataTransfer.getData('text/plain');
            const draggable = document.querySelector(`.match-row[data-match-id="${matchId}"]`);
            if (!draggable) return;

            const newPlaceId = header.dataset.placeId;
            const targetDayElement = header.closest('.date-group');
            const newPlayingDay = targetDayElement ? targetDayElement.dataset.date : null;

            if (!newPlayingDay) {
                await showMessage('Chyba', 'Nepodarilo sa určiť hrací deň pre cieľové miesto.');
                ghostedMatchInfo = null; // Clear ghost if cannot drop
                return;
            }

            // Get existing match data
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDocSnap = await getDoc(matchDocRef);
            if (!matchDocSnap.exists()) {
                console.error("Presúvaný zápas nebol nájdený vo Firestore.");
                return;
            }
            const matchData = matchDocSnap.data();
            const oldPlayingDay = matchData.playingDay;
            const oldPlaceId = matchData.placeId;

            // If the match is already in this playing day and this place, just reorder (handled by match-list drop)
            if (oldPlayingDay === newPlayingDay && oldPlaceId === newPlaceId) {
                ghostedMatchInfo = null; // No ghost if no actual move
                return; // Already handled by match-list drop or no effective change
            }
            
            // Perform the update in Firestore
            try {
                await updateDoc(matchDocRef, {
                    playingDay: newPlayingDay,
                    placeId: newPlaceId
                });
                await showMessage('Úspech', 'Zápas úspešne presunutý na nové miesto!');
                
                // Store ghost info ONLY if moved to a different location
                ghostedMatchInfo = {
                    playingDay: oldPlayingDay,
                    placeId: oldPlaceId,
                    time: matchData.time
                };

                await displayMatchesAsSchedule(); // Re-render the whole schedule
            } catch (error) {
                console.error("Chyba pri aktualizácii zápasu po presune na miesto:", error);
                await showMessage('Chyba', `Chyba pri presune zápasu. Detail: ${error.message}`);
                ghostedMatchInfo = null; // Clear ghost if update failed
            }
        });
    });
}

/**
 * Helper function to determine where to insert a dragged element.
 * @param {HTMLElement} container The target container.
 * @param {number} y The Y-coordinate of the drag event.
 * @returns {HTMLElement|null} The element to insert before, or null if appending to the end.
 */
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.match-row:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Ensure the accommodation schedule is displayed on load
document.addEventListener('DOMContentLoaded', async () => {
    await displayAccommodationAssignments();
});
