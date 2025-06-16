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
        selectElement.innerHTML = '<option value="">-- Chyba pri načítaní --</option>';
        selectElement.disabled = true;
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
        console.error("Chyba pri načítavaní miest:", error);
        selectElement.innerHTML = '<option value="">-- Chyba pri načítaní --</option>';
        selectElement.disabled = true;
    }
}

/**
 * Loads all categories from Firestore and stores them globally.
 */
let allCategories = [];
async function loadAllCategories() {
    try {
        const querySnapshot = await getDocs(query(categoriesCollectionRef, orderBy('name', 'asc')));
        allCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých kategórií:", error);
        allCategories = [];
    }
}

/**
 * Loads all groups from Firestore and stores them globally.
 */
let allGroups = [];
async function loadAllGroups() {
    try {
        const querySnapshot = await getDocs(query(groupsCollectionRef, orderBy('name', 'asc')));
        allGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých skupín:", error);
        allGroups = [];
    }
}

/**
 * Loads all clubs from Firestore and stores them globally.
 */
let allClubs = [];
async function loadAllClubs() {
    try {
        const querySnapshot = await getDocs(query(clubsCollectionRef, orderBy('clubName', 'asc')));
        allClubs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých klubov:", error);
        allClubs = [];
    }
}


/**
 * Populates a select element with teams for a specific group.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} groupId The ID of the group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamsForGroupSelect(selectElement, groupId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!groupId) {
        selectElement.disabled = true;
        return;
    }
    selectElement.disabled = false;
    try {
        const teamsQuery = query(clubsCollectionRef, where('groupId', '==', groupId));
        const querySnapshot = await getDocs(teamsQuery);
        querySnapshot.forEach((doc) => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            // Display format: Team Name (Order in Group)
            const teamDisplayName = team.orderInGroup ? `${team.clubName} (${team.orderInGroup})` : team.clubName;
            option.textContent = teamDisplayName;
            selectElement.appendChild(option);
        });
        if (selectedTeamId) {
            selectElement.value = selectedTeamId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní tímov pre skupinu:", error);
        selectElement.innerHTML = '<option value="">-- Chyba pri načítaní --</option>';
        selectElement.disabled = true;
    }
}

// Global variables for modals and forms
const playingDayModal = document.getElementById('playingDayModal');
const playingDayForm = document.getElementById('playingDayForm');
const playingDayIdInput = document.getElementById('playingDayId');
const playingDayDateInput = document.getElementById('playingDayDate');
const deletePlayingDayButton = document.getElementById('deletePlayingDayButtonModal');

const placeModal = document.getElementById('placeModal');
const placeForm = document.getElementById('placeForm');
const placeIdInput = document.getElementById('placeId');
const placeNameInput = document.getElementById('placeName');
const deletePlaceButton = document.getElementById('deletePlaceButtonModal');

const matchModal = document.getElementById('matchModal');
const matchForm = document.getElementById('matchForm');
const matchIdInput = document.getElementById('matchId');
const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
const matchPlaceSelect = document.getElementById('matchPlaceSelect');
const matchCategorySelect = document.getElementById('matchCategorySelect');
const matchGroupSelect = document.getElementById('matchGroupSelect');
const matchTimeInput = document.getElementById('matchTimeInput');
const team1Select = document.getElementById('team1Select');
const team2Select = document.getElementById('team2Select');
const deleteMatchButton = document.getElementById('deleteMatchButtonModal');

// Accommodation modal elements
const accommodationModal = document.getElementById('accommodationModal');
const accommodationForm = document.getElementById('accommodationForm');
const accommodationIdInput = document.getElementById('accommodationId');
const accommodationNameInput = document.getElementById('accommodationName');
const accommodationAddressInput = document.getElementById('accommodationAddress');
const deleteAccommodationButton = document.getElementById('deleteAccommodationButtonModal');

const assignAccommodationModal = document.getElementById('assignAccommodationModal');
const assignAccommodationForm = document.getElementById('assignAccommodationForm');
const assignAccommodationIdInput = document.getElementById('assignAccommodationId');
const accommodationTeamSelect = document.getElementById('accommodationTeamSelect');
const accommodationSelect = document.getElementById('accommodationSelect');
const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

// Add button and options dropdown
const addButton = document.getElementById('addButton');
const addOptions = document.getElementById('addOptions');
const addPlayingDayButton = document.getElementById('addPlayingDayButton');
const addPlaceButton = document.getElementById('addPlaceButton');
const addMatchButton = document.getElementById('addMatchButton');
const addAccommodationButton = document.getElementById('addAccommodationButton'); // New button for accommodation
const assignAccommodationButton = document.getElementById('assignAccommodationButton'); // New button for assigning accommodation

// Section containers
const scheduleTableBody = document.getElementById('scheduleTableBody');
const placesTableBody = document.getElementById('placesTableBody');
const playingDaysTableBody = document.getElementById('playingDaysTableBody');
const accommodationTableBody = document.getElementById('accommodationTableBody'); // New table body for accommodations
const assignedAccommodationTableBody = document.getElementById('assignedAccommodationTableBody'); // New table body for assigned accommodations

// Event Listeners for Add Options Dropdown
addButton.addEventListener('click', () => {
    addOptions.classList.toggle('show');
});

// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function(event) {
    if (!event.target.matches('.add-button') && !event.target.matches('.add-options-dropdown button')) {
        if (addOptions.classList.contains('show')) {
            addOptions.classList.remove('show');
        }
    }
});

// Event Listeners for specific add buttons
if (addPlayingDayButton) {
    addPlayingDayButton.addEventListener('click', () => openPlayingDayModal());
}
if (addPlaceButton) {
    addPlaceButton.addEventListener('click', () => openPlaceModal());
}
if (addMatchButton) {
    addMatchButton.addEventListener('click', () => openMatchModal());
}
if (addAccommodationButton) { // Event listener for new accommodation button
    addAccommodationButton.addEventListener('click', () => openAccommodationModal());
}
if (assignAccommodationButton) { // Event listener for new assign accommodation button
    assignAccommodationButton.addEventListener('click', () => openAssignAccommodationModal());
}

// Modals close buttons
if (playingDayModal) {
    playingDayModal.querySelector('.close').addEventListener('click', () => closeModal(playingDayModal));
}
if (placeModal) {
    placeModal.querySelector('.close').addEventListener('click', () => closeModal(placeModal));
}
if (matchModal) {
    matchModal.querySelector('.close').addEventListener('click', () => closeModal(matchModal));
}
if (accommodationModal) { // Close button for accommodation modal
    accommodationModal.querySelector('.close').addEventListener('click', () => closeModal(accommodationModal));
}
if (assignAccommodationModal) { // Close button for assign accommodation modal
    assignAccommodationModal.querySelector('.close').addEventListener('click', () => closeModal(assignAccommodationModal));
}


// Outside click listeners to close modals
window.addEventListener('click', (event) => {
    if (event.target === playingDayModal) closeModal(playingDayModal);
    if (event.target === placeModal) closeModal(placeModal);
    if (event.target === matchModal) closeModal(matchModal);
    if (event.target === accommodationModal) closeModal(accommodationModal); // Outside click for accommodation modal
    if (event.target === assignAccommodationModal) closeModal(assignAccommodationModal); // Outside click for assign accommodation modal
});


/**
 * Opens the playing day modal for adding a new playing day or editing an existing one.
 * @param {string|null} playingDayId - The ID of the playing day to edit, or null for a new one.
 * @param {object|null} playingDayData - The data of the playing day to edit.
 */
async function openPlayingDayModal(playingDayId = null, playingDayData = null) {
    if (!playingDayModal) return;

    playingDayForm.reset();
    playingDayIdInput.value = '';
    deletePlayingDayButton.style.display = 'none';

    if (playingDayId && playingDayData) {
        document.getElementById('playingDayModalTitle').textContent = 'Upraviť hrací deň';
        playingDayIdInput.value = playingDayId;
        playingDayDateInput.value = playingDayData.date;
        deletePlayingDayButton.style.display = 'inline-block'; // Show delete button for existing
        deletePlayingDayButton.onclick = () => deletePlayingDay(playingDayId);
    } else {
        document.getElementById('playingDayModalTitle').textContent = 'Pridať hrací deň';
    }
    openModal(playingDayModal);
}

/**
 * Handles the submission of the playing day form.
 */
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
            const q = query(playingDaysCollectionRef, where("date", "==", "" + date)); // Ensure date is string for query
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
            await displayPlayingDaysTable();
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri ukladaní hracieho dňa. Detail: ${error.message}`);
        }
    });
}

/**
 * Displays the list of playing days in a table.
 */
async function displayPlayingDaysTable() {
    if (!playingDaysTableBody) return;
    playingDaysTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy('date', 'asc')));
        if (querySnapshot.empty) {
            playingDaysTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Žiadne hracie dni zatiaľ neboli pridané.</td></tr>';
            return;
        }

        querySnapshot.forEach((docEntry) => {
            const day = docEntry.data();
            const tr = document.createElement('tr');

            const dateTd = document.createElement('td');
            const dateObj = new Date(day.date);
            dateTd.textContent = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
            tr.appendChild(dateTd);

            const actionsTd = document.createElement('td');
            actionsTd.style.whiteSpace = 'nowrap';

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť';
            editButton.className = 'action-button';
            editButton.onclick = () => openPlayingDayModal(docEntry.id, day);
            actionsTd.appendChild(editButton);

            tr.appendChild(actionsTd);
            playingDaysTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Chyba pri zobrazovaní hracích dní:", error);
        playingDaysTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: red;">Chyba pri načítavaní hracích dní.</td></tr>';
    }
}

/**
 * Deletes a playing day.
 * @param {string} playingDayId - The ID of the playing day to delete.
 */
async function deletePlayingDay(playingDayId) {
    const confirmation = await showConfirmation('Potvrdenie zmazania', 'Naozaj chcete zmazať tento hrací deň? Všetky priradené zápasy budú tiež zmazané!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);

        // Delete associated matches
        const matchesQuery = query(matchesCollectionRef, where('playingDayId', '==', playingDayId));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        // Delete the playing day itself
        const playingDayDocRef = doc(playingDaysCollectionRef, playingDayId);
        batch.delete(playingDayDocRef);

        await batch.commit();
        await showMessage('Úspech', 'Hrací deň a priradené zápasy boli úspešne zmazané.');
        closeModal(playingDayModal);
        await displayPlayingDaysTable();
        await displayMatchesAsSchedule(); // Refresh schedule after deletion
    } catch (error) {
        console.error("Chyba pri mazaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri mazaní hracieho dňa. Detail: ${error.message}`);
    }
}


/**
 * Opens the place modal for adding a new place or editing an existing one.
 * @param {string|null} placeId - The ID of the place to edit, or null for a new one.
 * @param {object|null} placeData - The data of the place to edit.
 */
async function openPlaceModal(placeId = null, placeData = null) {
    if (!placeModal) return;

    placeForm.reset();
    placeIdInput.value = '';
    deletePlaceButton.style.display = 'none';

    if (placeId && placeData) {
        document.getElementById('placeModalTitle').textContent = 'Upraviť miesto';
        placeIdInput.value = placeId;
        placeNameInput.value = placeData.name;
        deletePlaceButton.style.display = 'inline-block';
        deletePlaceButton.onclick = () => deletePlace(placeId);
    } else {
        document.getElementById('placeModalTitle').textContent = 'Pridať miesto';
    }
    openModal(placeModal);
}

/**
 * Handles the submission of the place form.
 */
if (placeForm) {
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('placeId').value;
        const name = document.getElementById('placeName').value.trim();

        // Basic validation
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
            await displayPlacesTable();
            await displayMatchesAsSchedule(); // Refresh schedule as places might change
        } catch (error) {
            console.error("Chyba pri ukladaní miesta:", error);
            await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
        }
    });
}

/**
 * Displays the list of places in a table.
 */
async function displayPlacesTable() {
    if (!placesTableBody) return;
    placesTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy('name', 'asc')));
        if (querySnapshot.empty) {
            placesTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Žiadne miesta zatiaľ neboli pridané.</td></tr>';
            return;
        }

        querySnapshot.forEach((docEntry) => {
            const place = docEntry.data();
            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.textContent = place.name;
            tr.appendChild(nameTd);

            const actionsTd = document.createElement('td');
            actionsTd.style.whiteSpace = 'nowrap';

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť';
            editButton.className = 'action-button';
            editButton.onclick = () => openPlaceModal(docEntry.id, place);
            actionsTd.appendChild(editButton);

            tr.appendChild(actionsTd);
            placesTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Chyba pri zobrazovaní miest:", error);
        placesTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: red;">Chyba pri načítavaní miest.</td></tr>';
    }
}

/**
 * Deletes a place.
 * @param {string} placeId - The ID of the place to delete.
 */
async function deletePlace(placeId) {
    const confirmation = await showConfirmation('Potvrdenie zmazania', 'Naozaj chcete zmazať toto miesto? Všetky zápasy priradené k tomuto miestu budú tiež zmazané!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);

        // Delete associated matches
        const matchesQuery = query(matchesCollectionRef, where('placeId', '==', placeId));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        // Delete the place itself
        const placeDocRef = doc(placesCollectionRef, placeId);
        batch.delete(placeDocRef);

        await batch.commit();
        await showMessage('Úspech', 'Miesto a priradené zápasy boli úspešne zmazané.');
        closeModal(placeModal);
        await displayPlacesTable();
        await displayMatchesAsSchedule(); // Refresh schedule after deletion
    } catch (error) {
        console.error("Chyba pri mazaní miesta:", error);
        await showMessage('Chyba', `Chyba pri mazaní miesta. Detail: ${error.message}`);
    }
}

/**
 * Opens the match modal for adding a new match or editing an existing one.
 * @param {string|null} matchId - The ID of the match to edit, or null for a new one.
 * @param {object|null} matchData - The data of the match to edit.
 */
async function openMatchModal(matchId = null, matchData = null) {
    if (!matchModal) return;

    matchForm.reset();
    matchIdInput.value = '';
    deleteMatchButton.style.display = 'none';

    // Populate selects
    await populatePlayingDaysSelect(matchPlayingDaySelect);
    await populatePlacesSelect(matchPlaceSelect);
    await populateCategorySelect(matchCategorySelect);

    // Initial population for groups and teams (if editing)
    if (matchData && matchData.categoryId) {
        await populateGroupSelect(matchGroupSelect, matchData.categoryId);
        if (matchData.groupId) {
            await populateTeamsForGroupSelect(team1Select, matchData.groupId);
            await populateTeamsForGroupSelect(team2Select, matchData.groupId);
        }
    } else {
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        team1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team1Select.disabled = true;
        team2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team2Select.disabled = true;
    }

    if (matchId && matchData) {
        document.getElementById('matchModalTitle').textContent = 'Upraviť zápas';
        matchIdInput.value = matchId;
        matchPlayingDaySelect.value = matchData.playingDayId;
        matchPlaceSelect.value = matchData.placeId;
        matchCategorySelect.value = matchData.categoryId;
        if (matchData.groupId) matchGroupSelect.value = matchData.groupId;
        if (matchData.time) matchTimeInput.value = matchData.time;
        if (matchData.team1Id) team1Select.value = matchData.team1Id;
        if (matchData.team2Id) team2Select.value = matchData.team2Id;

        deleteMatchButton.style.display = 'inline-block';
        deleteMatchButton.onclick = () => deleteMatch(matchId);
    } else {
        document.getElementById('matchModalTitle').textContent = 'Pridať zápas';
    }

    openModal(matchModal);
}

// Event listener for category select in match modal
if (matchCategorySelect) {
    matchCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = matchCategorySelect.value;
        await populateGroupSelect(matchGroupSelect, selectedCategoryId);
        // Clear team selects when category changes
        team1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team1Select.disabled = true;
        team2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team2Select.disabled = true;
    });
}

// Event listener for group select in match modal
if (matchGroupSelect) {
    matchGroupSelect.addEventListener('change', async () => {
        const selectedGroupId = matchGroupSelect.value;
        await populateTeamsForGroupSelect(team1Select, selectedGroupId);
        await populateTeamsForGroupSelect(team2Select, selectedGroupId);
    });
}

/**
 * Handles the submission of the match form.
 */
if (matchForm) {
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = matchIdInput.value;
        const playingDayId = matchPlayingDaySelect.value;
        const placeId = matchPlaceSelect.value;
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        const time = matchTimeInput.value;
        const team1Id = team1Select.value;
        const team2Id = team2Select.value;

        // Basic validation
        if (!playingDayId || !placeId || !categoryId || !groupId || !time || !team1Id || !team2Id) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre zápas.');
            return;
        }

        if (team1Id === team2Id) {
            await showMessage('Chyba', 'Tímy nemôžu byť rovnaké!');
            return;
        }

        try {
            const matchData = {
                playingDayId,
                placeId,
                categoryId,
                groupId,
                time,
                team1Id,
                team2Id
            };

            // Enhanced duplicate check: same day, same place, same time, different match (for editing)
            const duplicateCheckQuery = query(
                matchesCollectionRef,
                where('playingDayId', '==', playingDayId),
                where('placeId', '==', placeId),
                where('time', '==', time)
            );
            const duplicateSnapshot = await getDocs(duplicateCheckQuery);

            if (!duplicateSnapshot.empty) {
                // If editing, check if the duplicate is the current match being edited
                const isCurrentMatch = duplicateSnapshot.docs.some(doc => doc.id === id);
                if (!isCurrentMatch) {
                    await showMessage('Chyba', 'Zápas v tomto čase a na tomto mieste už existuje pre vybraný hrací deň!');
                    return;
                }
            }


            if (id) {
                await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
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
 * Deletes a match.
 * @param {string} matchId - The ID of the match to delete.
 */
async function deleteMatch(matchId) {
    const confirmation = await showConfirmation('Potvrdenie zmazania', 'Naozaj chcete zmazať tento zápas?');
    if (!confirmation) {
        return;
    }

    try {
        await deleteDoc(doc(matchesCollectionRef, matchId));
        await showMessage('Úspech', 'Zápas úspešne zmazaný.');
        closeModal(matchModal);
        await displayMatchesAsSchedule(); // Refresh schedule after deletion
    } catch (error) {
        console.error("Chyba pri mazaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri mazaní zápasu. Detail: ${error.message}`);
    }
}


/**
 * Displays matches grouped by playing day and place as a schedule.
 * Also handles drag and drop functionality.
 */
async function displayMatchesAsSchedule() {
    if (!scheduleTableBody) return;
    scheduleTableBody.innerHTML = ''; // Clear existing schedule

    try {
        // Load all necessary data first
        await loadAllCategories();
        await loadAllGroups();
        await loadAllClubs();

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy('date', 'asc')));
        const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy('name', 'asc')));
        const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy('time', 'asc')));

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const places = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (playingDays.length === 0) {
            scheduleTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Žiadne hracie dni zatiaľ neboli pridané.</td></tr>';
            return;
        }

        const matchesByDayAndPlace = {};

        // Initialize structure
        playingDays.forEach(day => {
            matchesByDayAndPlace[day.id] = {
                date: day.date,
                places: {}
            };
            places.forEach(place => {
                matchesByDayAndPlace[day.id].places[place.id] = {
                    name: place.name,
                    matches: []
                };
            });
        });

        // Populate matches into the structure
        matches.forEach(match => {
            if (matchesByDayAndPlace[match.playingDayId] && matchesByDayAndPlace[match.playingDayId].places[match.placeId]) {
                matchesByDayAndPlace[match.playingDayId].places[match.placeId].matches.push(match);
            }
        });

        // Render the schedule
        for (const dayId in matchesByDayAndPlace) {
            const dayData = matchesByDayAndPlace[dayId];
            const dateObj = new Date(dayData.date);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;

            let isFirstRowForDay = true;
            for (const placeId in dayData.places) {
                const placeData = dayData.places[placeId];
                placeData.matches.sort((a, b) => a.time.localeCompare(b.time)); // Sort matches by time

                if (placeData.matches.length === 0) {
                    const tr = document.createElement('tr');
                    tr.classList.add('date-group'); // Mark as drop target
                    tr.dataset.playingDayId = dayId;
                    tr.dataset.placeId = placeId;

                    if (isFirstRowForDay) {
                        const dayHeaderTd = document.createElement('td');
                        dayHeaderTd.rowSpan = Object.keys(dayData.places).length; // Span rows for all places on this day
                        dayHeaderTd.textContent = formattedDate;
                        dayHeaderTd.classList.add('day-header');
                        tr.appendChild(dayHeaderTd);
                        isFirstRowForDay = false;
                    }

                    const placeNameTd = document.createElement('td');
                    placeNameTd.textContent = placeData.name;
                    tr.appendChild(placeNameTd);

                    const noMatchTd = document.createElement('td');
                    noMatchTd.colSpan = 3;
                    noMatchTd.textContent = 'Žiadne zápasy.';
                    noMatchTd.style.textAlign = 'center';
                    noMatchTd.style.fontStyle = 'italic';
                    noMatchTd.style.color = '#777';
                    tr.appendChild(noMatchTd);
                    scheduleTableBody.appendChild(tr);
                } else {
                    placeData.matches.forEach((match, index) => {
                        const tr = document.createElement('tr');
                        tr.classList.add('match-row');
                        tr.draggable = true;
                        tr.dataset.matchId = match.id;

                        // Set up drag and drop attributes for row
                        tr.ondragstart = (e) => {
                            e.dataTransfer.setData('text/plain', match.id);
                            tr.classList.add('dragging');
                        };
                        tr.ondragend = () => tr.classList.remove('dragging');

                        // Day column (only for the first match of the first place on that day)
                        if (isFirstRowForDay && index === 0) {
                            const dayHeaderTd = document.createElement('td');
                            // Calculate total rows for this day across all places
                            const totalDayRows = Object.values(dayData.places).reduce((sum, p) => sum + Math.max(1, p.matches.length), 0);
                            dayHeaderTd.rowSpan = totalDayRows;
                            dayHeaderTd.textContent = formattedDate;
                            dayHeaderTd.classList.add('day-header');
                            tr.appendChild(dayHeaderTd);
                            isFirstRowForDay = false;
                        }

                        // Place column (only for the first match at this place)
                        if (index === 0) {
                            const placeNameTd = document.createElement('td');
                            placeNameTd.rowSpan = placeData.matches.length;
                            placeNameTd.textContent = placeData.name;
                            tr.appendChild(placeNameTd);
                        }

                        // Match details
                        const timeTd = document.createElement('td');
                        timeTd.textContent = match.time;
                        tr.appendChild(timeTd);

                        // Find category to get color
                        const category = allCategories.find(cat => cat.id === match.categoryId);
                        const categoryColor = (category && category.color) ? category.color : 'transparent'; // Default to transparent if no color

                        const team1Td = document.createElement('td');
                        team1Td.textContent = match.team1ClubName || 'N/A';
                        team1Td.style.backgroundColor = categoryColor; // Apply color to team1 cell
                        // Adjust text color based on background luminance for readability
                        const hex1 = categoryColor.substring(1);
                        const r1 = parseInt(hex1.substring(0, 2), 16);
                        const g1 = parseInt(hex1.substring(2, 4), 16);
                        const b1 = parseInt(hex1.substring(4, 6), 16);
                        const luminance1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255;
                        team1Td.style.color = (luminance1 < 0.5) ? 'white' : '#333';
                        tr.appendChild(team1Td);

                        const team2Td = document.createElement('td');
                        team2Td.textContent = match.team2ClubName || 'N/A';
                        team2Td.style.backgroundColor = categoryColor; // Apply color to team2 cell
                        // Adjust text color based on background luminance for readability
                        const hex2 = categoryColor.substring(1);
                        const r2 = parseInt(hex2.substring(0, 2), 16);
                        const g2 = parseInt(hex2.substring(2, 4), 16);
                        const b2 = parseInt(hex2.substring(4, 6), 16);
                        const luminance2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255;
                        team2Td.style.color = (luminance2 < 0.5) ? 'white' : '#333';
                        tr.appendChild(team2Td);

                        const team1DisplayNameTd = document.createElement('td');
                        team1DisplayNameTd.textContent = match.team1DisplayName || 'N/A';
                        team1DisplayNameTd.style.backgroundColor = categoryColor; // Apply color to ID cell
                        team1DisplayNameTd.style.color = (luminance1 < 0.5) ? 'white' : '#333';
                        tr.appendChild(team1DisplayNameTd);

                        const team2DisplayNameTd = document.createElement('td');
                        team2DisplayNameTd.textContent = match.team2DisplayName || 'N/A';
                        team2DisplayNameTd.style.backgroundColor = categoryColor; // Apply color to ID cell
                        team2DisplayNameTd.style.color = (luminance2 < 0.5) ? 'white' : '#333';
                        tr.appendChild(team2DisplayNameTd);

                        const actionsTd = document.createElement('td');
                        actionsTd.style.whiteSpace = 'nowrap';
                        const editButton = document.createElement('button');
                        editButton.textContent = 'Upraviť';
                        editButton.className = 'action-button';
                        editButton.onclick = () => openMatchModal(match.id, match);
                        actionsTd.appendChild(editButton);
                        tr.appendChild(actionsTd);

                        scheduleTableBody.appendChild(tr);
                    });
                }
            }
        }

        // Add drop targets for empty date/place combinations or between existing matches
        addDropTargetListeners();

    } catch (error) {
        console.error("Chyba pri zobrazovaní rozpisu zápasov:", error);
        scheduleTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Chyba pri načítavaní rozpisu zápasov.</td></tr>'; // Increased colspan
    }
}

/**
 * Adds drag and drop event listeners to schedule rows.
 */
function addDropTargetListeners() {
    const rows = scheduleTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        // If it's a match row, it can be a drop target for reordering within the same day/place group
        // If it's an empty "no matches" row, it's a drop target for assigning a match to it
        if (row.classList.contains('match-row') || row.classList.contains('date-group')) {
            row.ondragover = (e) => {
                e.preventDefault(); // Allow drop
                e.currentTarget.classList.add('drop-target-active');
            };
            row.ondragleave = (e) => {
                e.currentTarget.classList.remove('drop-target-active');
            };
            row.ondrop = async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drop-target-active');
                const draggedMatchId = e.dataTransfer.getData('text/plain');
                const targetRow = e.currentTarget;

                let targetPlayingDayId, targetPlaceId;

                // Determine target playingDayId and placeId
                if (targetRow.classList.contains('match-row')) {
                    // If dropping onto an existing match row, use its day and place
                    const targetMatchId = targetRow.dataset.matchId;
                    const targetMatchDoc = await getDoc(doc(matchesCollectionRef, targetMatchId));
                    if (targetMatchDoc.exists()) {
                        targetPlayingDayId = targetMatchDoc.data().playingDayId;
                        targetPlaceId = targetMatchDoc.data().placeId;
                    }
                } else if (targetRow.classList.contains('date-group')) {
                    // If dropping onto an empty date-group placeholder
                    targetPlayingDayId = targetRow.dataset.playingDayId;
                    targetPlaceId = targetRow.dataset.placeId;
                }

                if (draggedMatchId && targetPlayingDayId && targetPlaceId) {
                    await moveMatch(draggedMatchId, targetPlayingDayId, targetPlaceId);
                }
            };
        }
    });
}


/**
 * Moves a match to a new playing day and/or place.
 * @param {string} matchId The ID of the match to move.
 * @param {string} newPlayingDayId The ID of the new playing day.
 * @param {string} newPlaceId The ID of the new place.
 */
async function moveMatch(matchId, newPlayingDayId, newPlaceId) {
    try {
        const matchDocRef = doc(matchesCollectionRef, matchId);
        const matchDoc = await getDoc(matchDocRef);

        if (!matchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas sa nenašiel.');
            return;
        }

        const originalMatchData = matchDoc.data();

        // Check if the target location is already occupied at the same time
        const duplicateCheckQuery = query(
            matchesCollectionRef,
            where('playingDayId', '==', newPlayingDayId),
            where('placeId', '==', newPlaceId),
            where('time', '==', originalMatchData.time)
        );
        const duplicateSnapshot = await getDocs(duplicateCheckQuery);

        if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== matchId) {
            await showMessage('Chyba', 'Cieľové miesto je už v tomto čase obsadené iným zápasom!');
            return;
        }


        await updateDoc(matchDocRef, {
            playingDayId: newPlayingDayId,
            placeId: newPlaceId
        });
        await showMessage('Úspech', 'Zápas úspešne presunutý!');
        await displayMatchesAsSchedule(); // Refresh schedule
    } catch (error) {
        console.error("Chyba pri presúvaní zápasu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu. Detail: ${error.message}`);
    }
}


/**
 * Opens the accommodation modal for adding a new accommodation or editing an existing one.
 * @param {string|null} accommodationId - The ID of the accommodation to edit, or null for a new one.
 * @param {object|null} accommodationData - The data of the accommodation to edit.
 */
async function openAccommodationModal(accommodationId = null, accommodationData = null) {
    if (!accommodationModal) return;

    accommodationForm.reset();
    accommodationIdInput.value = '';
    deleteAccommodationButton.style.display = 'none';

    if (accommodationId && accommodationData) {
        document.getElementById('accommodationModalTitle').textContent = 'Upraviť ubytovanie';
        accommodationIdInput.value = accommodationId;
        accommodationNameInput.value = accommodationData.name;
        accommodationAddressInput.value = accommodationData.address;
        deleteAccommodationButton.style.display = 'inline-block';
        deleteAccommodationButton.onclick = () => deleteAccommodation(accommodationId);
    } else {
        document.getElementById('accommodationModalTitle').textContent = 'Pridať ubytovanie';
    }
    openModal(accommodationModal);
}

/**
 * Handles the submission of the accommodation form.
 */
if (accommodationForm) {
    accommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = accommodationIdInput.value;
        const name = accommodationNameInput.value.trim();
        const address = accommodationAddressInput.value.trim();

        // Basic validation
        if (!name || !address) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre ubytovanie.');
            return;
        }

        try {
            const accommodationData = { name, address };

            if (id) {
                await setDoc(doc(collection(db, 'accommodations'), id), accommodationData, { merge: true });
                await showMessage('Úspech', 'Ubytovanie úspešne upravené!');
            } else {
                await addDoc(collection(db, 'accommodations'), { ...accommodationData, createdAt: new Date() });
                await showMessage('Úspech', 'Ubytovanie úspešne pridané!');
            }
            closeModal(accommodationModal);
            await displayAccommodationTable();
            await displayAssignedAccommodationTable(); // Refresh assigned accommodation table
        } catch (error) {
            console.error("Chyba pri ukladaní ubytovania:", error);
            await showMessage('Chyba', `Chyba pri ukladaní ubytovania. Detail: ${error.message}`);
        }
    });
}

/**
 * Displays the list of accommodations in a table.
 */
async function displayAccommodationTable() {
    if (!accommodationTableBody) return;
    accommodationTableBody.innerHTML = ''; // Clear existing rows

    try {
        const querySnapshot = await getDocs(query(collection(db, 'accommodations'), orderBy('name', 'asc')));
        if (querySnapshot.empty) {
            accommodationTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Žiadne ubytovania zatiaľ neboli pridané.</td></tr>';
            return;
        }

        querySnapshot.forEach((docEntry) => {
            const acc = docEntry.data();
            const tr = document.createElement('tr');

            const nameTd = document.createElement('td');
            nameTd.textContent = acc.name;
            tr.appendChild(nameTd);

            const addressTd = document.createElement('td');
            addressTd.textContent = acc.address;
            tr.appendChild(addressTd);

            const actionsTd = document.createElement('td');
            actionsTd.style.whiteSpace = 'nowrap';

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť';
            editButton.className = 'action-button';
            editButton.onclick = () => openAccommodationModal(docEntry.id, acc);
            actionsTd.appendChild(editButton);

            tr.appendChild(actionsTd);
            accommodationTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Chyba pri zobrazovaní ubytovania:", error);
        accommodationTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Chyba pri načítavaní ubytovania.</td></tr>';
    }
}

/**
 * Deletes an accommodation.
 * @param {string} accommodationId - The ID of the accommodation to delete.
 */
async function deleteAccommodation(accommodationId) {
    const confirmation = await showConfirmation('Potvrdenie zmazania', 'Naozaj chcete zmazať toto ubytovanie? Všetky priradenia k tomuto ubytovaniu budú tiež zmazané!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);

        // Delete associated assignments
        const assignmentsQuery = query(collection(db, 'assignedAccommodations'), where('accommodationId', '==', accommodationId));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        assignmentsSnapshot.forEach(assignmentDoc => {
            batch.delete(assignmentDoc.ref);
        });

        // Delete the accommodation itself
        const accommodationDocRef = doc(collection(db, 'accommodations'), accommodationId);
        batch.delete(accommodationDocRef);

        await batch.commit();
        await showMessage('Úspech', 'Ubytovanie a priradenia boli úspešne zmazané.');
        closeModal(accommodationModal);
        await displayAccommodationTable();
        await displayAssignedAccommodationTable(); // Refresh assigned accommodation table after deletion
    } catch (error) {
        console.error("Chyba pri mazaní ubytovania:", error);
        await showMessage('Chyba', `Chyba pri mazaní ubytovania. Detail: ${error.message}`);
    }
}

/**
 * Opens the assign accommodation modal.
 * @param {string|null} assignmentId - The ID of the assignment to edit, or null for a new one.
 * @param {object|null} assignmentData - The data of the assignment to edit.
 */
async function openAssignAccommodationModal(assignmentId = null, assignmentData = null) {
    if (!assignAccommodationModal) return;

    assignAccommodationForm.reset();
    assignAccommodationIdInput.value = '';
    deleteAssignmentButtonModal.style.display = 'none';

    // Populate selects
    await loadAllClubs(); // Ensure all clubs are loaded for the select
    populateTeamSelectForAccommodation(accommodationTeamSelect, allClubs);
    await populateAccommodationsSelect(accommodationSelect);


    if (assignmentId && assignmentData) {
        document.getElementById('assignAccommodationModalTitle').textContent = 'Upraviť priradenie ubytovania';
        assignAccommodationIdInput.value = assignmentId;
        accommodationTeamSelect.value = assignmentData.teamId;
        accommodationSelect.value = assignmentData.accommodationId;
        deleteAssignmentButtonModal.style.display = 'inline-block';
        deleteAssignmentButtonModal.onclick = () => deleteAssignedAccommodation(assignmentId);
    } else {
        document.getElementById('assignAccommodationModalTitle').textContent = 'Priradiť ubytovanie';
    }
    openModal(assignAccommodationModal);
}

/**
 * Populates a select element with teams for accommodation assignment.
 * This should display each club/team once, as clubs represent the teams that need accommodation.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {Array<object>} teamsData - An array of team objects ({id, clubName}).
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
function populateTeamSelectForAccommodation(selectElement, teamsData, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím (klub) --</option>';
    teamsData.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.clubName;
        selectElement.appendChild(option);
    });
    if (selectedTeamId) {
        selectElement.value = selectedTeamId;
    }
}

/**
 * Populates a select element with accommodations from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodationId=''] The ID of the accommodation to pre-select.
 */
async function populateAccommodationsSelect(selectElement, selectedAccommodationId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    try {
        const querySnapshot = await getDocs(query(collection(db, 'accommodations'), orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const acc = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = acc.name;
            selectElement.appendChild(option);
        });
        if (selectedAccommodationId) {
            selectElement.value = selectedAccommodationId;
        }
    } catch (error) {
        console.error("Chyba pri načítavaní ubytovní:", error);
        selectElement.innerHTML = '<option value="">-- Chyba pri načítaní --</option>';
        selectElement.disabled = true;
    }
}

/**
 * Handles the submission of the assign accommodation form.
 */
if (assignAccommodationForm) {
    assignAccommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = assignAccommodationIdInput.value;
        const teamId = accommodationTeamSelect.value;
        const accommodationId = accommodationSelect.value;

        // Basic validation
        if (!teamId || !accommodationId) {
            await showMessage('Chyba', 'Prosím, vyberte tím aj ubytovanie.');
            return;
        }

        try {
            const assignmentData = { teamId, accommodationId };

            // Check for duplicate assignment: a team can only be assigned to one accommodation
            const duplicateCheckQuery = query(collection(db, 'assignedAccommodations'), where('teamId', '==', teamId));
            const duplicateSnapshot = await getDocs(duplicateCheckQuery);

            if (!duplicateSnapshot.empty && duplicateSnapshot.docs[0].id !== id) {
                await showMessage('Chyba', 'Tento tím už má priradené ubytovanie!');
                return;
            }

            if (id) {
                await setDoc(doc(collection(db, 'assignedAccommodations'), id), assignmentData, { merge: true });
                await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
            } else {
                await addDoc(collection(db, 'assignedAccommodations'), { ...assignmentData, createdAt: new Date() });
                await showMessage('Úspech', 'Ubytovanie úspešne priradené!');
            }
            closeModal(assignAccommodationModal);
            await displayAssignedAccommodationTable();
        } catch (error) {
            console.error("Chyba pri ukladaní priradenia ubytovania:", error);
            await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
        }
    });
}

/**
 * Displays the list of assigned accommodations in a table.
 */
async function displayAssignedAccommodationTable() {
    if (!assignedAccommodationTableBody) return;
    assignedAccommodationTableBody.innerHTML = ''; // Clear existing rows

    try {
        await loadAllClubs(); // Ensure clubs are loaded for mapping team IDs to names

        const assignedAccSnapshot = await getDocs(query(collection(db, 'assignedAccommodations'), orderBy('createdAt', 'desc')));
        const accommodationsSnapshot = await getDocs(query(collection(db, 'accommodations'), orderBy('name', 'asc')));

        const accommodationsMap = new Map();
        accommodationsSnapshot.forEach(doc => accommodationsMap.set(doc.id, doc.data()));

        if (assignedAccSnapshot.empty) {
            assignedAccommodationTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Žiadne priradené ubytovania zatiaľ.</td></tr>';
            return;
        }

        assignedAccSnapshot.forEach((docEntry) => {
            const assignment = docEntry.data();
            const tr = document.createElement('tr');

            const team = allClubs.find(club => club.id === assignment.teamId);
            const teamName = team ? team.clubName : 'Neznámy tím';
            const accName = accommodationsMap.has(assignment.accommodationId) ? accommodationsMap.get(assignment.accommodationId).name : 'Neznáma ubytovňa';

            const teamTd = document.createElement('td');
            teamTd.textContent = teamName;
            tr.appendChild(teamTd);

            const accTd = document.createElement('td');
            accTd.textContent = accName;
            tr.appendChild(accTd);

            const actionsTd = document.createElement('td');
            actionsTd.style.whiteSpace = 'nowrap';

            const editButton = document.createElement('button');
            editButton.textContent = 'Upraviť';
            editButton.className = 'action-button';
            editButton.onclick = () => openAssignAccommodationModal(docEntry.id, assignment);
            actionsTd.appendChild(editButton);

            tr.appendChild(actionsTd);
            assignedAccommodationTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Chyba pri zobrazovaní priradených ubytovaní:", error);
        assignedAccommodationTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Chyba pri načítavaní priradených ubytovaní.</td></tr>';
    }
}

/**
 * Deletes an assigned accommodation.
 * @param {string} assignmentId - The ID of the assignment to delete.
 */
async function deleteAssignedAccommodation(assignmentId) {
    const confirmation = await showConfirmation('Potvrdenie zmazania', 'Naozaj chcete zmazať toto priradenie ubytovania?');
    if (!confirmation) {
        return;
    }

    try {
        await deleteDoc(doc(collection(db, 'assignedAccommodations'), assignmentId));
        await showMessage('Úspech', 'Priradenie ubytovania úspešne zmazané.');
        closeModal(assignAccommodationModal);
        await displayAssignedAccommodationTable(); // Refresh the table
    } catch (error) {
        console.error("Chyba pri mazaní priradeného ubytovania:", error);
        await showMessage('Chyba', `Chyba pri mazaní priradeného ubytovania. Detail: ${error.message}`);
    }
}


// Initialize tables on page load
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Initial display of all tables
    await displayPlayingDaysTable();
    await displayPlacesTable();
    await displayMatchesAsSchedule();
    await displayAccommodationTable(); // Display accommodation table
    await displayAssignedAccommodationTable(); // Display assigned accommodation table
});
