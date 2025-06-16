import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

/**
 * Populates a select element with playing days from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedDate=''] The date to pre-select.
 */
const populatePlayingDaysSelect = async (selectElement, selectedDate = '') => {
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
};

/**
 * Populates a select element with places from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceId=''] The ID of the place to pre-select.
 */
const populatePlacesSelect = async (selectElement, selectedPlaceId = '') => {
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
};

/**
 * Loads all categories from Firestore and stores them globally.
 */
let allCategories = [];
const loadAllCategories = async () => {
    try {
        const querySnapshot = await getDocs(query(categoriesCollectionRef, orderBy('name', 'asc')));
        allCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých kategórií:", error);
        allCategories = [];
    }
};

/**
 * Loads all groups from Firestore and stores them globally.
 */
let allGroups = [];
const loadAllGroups = async () => {
    try {
        const querySnapshot = await getDocs(query(groupsCollectionRef, orderBy('name', 'asc')));
        allGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých skupín:", error);
        allGroups = [];
    }
};

/**
 * Loads all clubs from Firestore and stores them globally.
 */
let allClubs = [];
const loadAllClubs = async () => {
    try {
        const querySnapshot = await getDocs(query(clubsCollectionRef, orderBy('clubName', 'asc')));
        allClubs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Chyba pri načítavaní všetkých klubov:", error);
        allClubs = [];
    }
};


/**
 * Populates a select element with teams for a specific group.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} groupId The ID of the group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
const populateTeamsForGroupSelect = async (selectElement, groupId, selectedTeamId = '') => {
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
};

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
window.addEventListener('click', (event) => {
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
// Corrected selector for close buttons
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
const openPlayingDayModal = async (playingDayId = null, playingDayData = null) => {
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
};

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
const displayPlayingDaysTable = async () => {
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
};

/**
 * Deletes a playing day.
 * @param {string} playingDayId - The ID of the playing day to delete.
 */
const deletePlayingDay = async (playingDayId) => {
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
};


/**
 * Opens the place modal for adding a new place or editing an existing one.
 * @param {string|null} placeId - The ID of the place to edit, or null for a new one.
 * @param {object|null} placeData - The data of the place to edit.
 */
const openPlaceModal = async (placeId = null, placeData = null) => {
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
};

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
const displayPlacesTable = async () => {
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
};

/**
 * Deletes a place.
 * @param {string} placeId - The ID of the place to delete.
 */
const deletePlace = async (placeId) => {
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
};

/**
 * Opens the match modal for adding a new match or editing an existing one.
 * @param {string|null} matchId - The ID of the match to edit, or null for a new one.
 * @param {object|null} matchData - The data of the match to edit.
 */
const openMatchModal = async (matchId = null, matchData = null) => {
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
};

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
const deleteMatch = async (matchId) => {
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
};


/**
 * Displays matches grouped by playing day and place as a schedule.
 * Also handles drag and drop functionality.
 */
const displayMatchesAsSchedule = async () => {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    matchesContainer.innerHTML = '';
    matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');

    try {
        // Fetch all data required for the schedule
        const matchesQuery = query(matchesCollectionRef, orderBy("playingDayId", "asc"), orderBy("placeId", "asc"), orderBy("time", "asc")); // Order by IDs and time
        const matchesSnapshot = await getDocs(matchesQuery);
        let allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané zápasy:", allMatches);

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data())); // Store full category data including color
        console.log("displayMatchesAsSchedule: Načítané kategórie:", Array.from(categoriesMap.entries()));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));
        console.log("displayMatchesAsSchedule: Načítané skupiny:", Array.from(groupsMap.entries()));

        const placesSnapshot = await getDocs(placesCollectionRef); // Fetch all places to map IDs to names
        const placesMap = new Map();
        placesSnapshot.forEach(doc => placesMap.set(doc.id, doc.data()));
        console.log("displayMatchesAsSchedule: Načítané miesta (mapa):", Array.from(placesMap.entries()));

        const playingDaysSnapshot = await getDocs(playingDaysCollectionRef); // Fetch all playing days to map IDs to dates
        const playingDaysMap = new Map();
        playingDaysSnapshot.forEach(doc => playingDaysMap.set(doc.id, doc.data()));
        console.log("displayMatchesAsSchedule: Načítané hracie dni (mapa):", Array.from(playingDaysMap.entries()));


        // Populate team display names for matches (and ensure correct IDs are used)
        const updatedMatchesPromises = allMatches.map(async match => {
            const [team1Data, team2Data] = await Promise.allSettled([
                getTeamName(match.categoryId, match.groupId, match.team1Number, categoriesMap, groupsMap),
                getTeamName(match.categoryId, match.groupId, match.team2Number, categoriesMap, groupsMap)
            ]);

            return {
                ...match,
                team1DisplayName: team1Data.status === 'fulfilled' ? team1Data.value.fullDisplayName : 'N/A',
                team1ClubName: team1Data.status === 'fulfilled' ? team1Data.value.clubName : 'N/A',
                team1ClubId: team1Data.status === 'fulfilled' ? team1Data.value.clubId : null,
                team2DisplayName: team2Data.status === 'fulfilled' ? team2Data.value.fullDisplayName : 'N/A',
                team2ClubName: team2Data.status === 'fulfilled' ? team2Data.value.clubName : 'N/A',
                team2ClubId: team2Data.status === 'fulfilled' ? team2Data.value.clubId : null,
            };
        });

        allMatches = await Promise.all(updatedMatchesPromises);

        // Group matches first by Playing Day ID, then by Place ID
        const groupedMatchesByDayAndPlace = new Map(); // Key: playingDayId, Value: Map (Key: placeId, Value: Array of matches)

        playingDaysSnapshot.docs.forEach(dayDoc => { // Use playingDaysSnapshot.docs for consistency
            groupedMatchesByDayAndPlace.set(dayDoc.id, new Map());
            placesSnapshot.docs.forEach(placeDoc => { // Use placesSnapshot.docs for consistency
                const place = placeDoc.data();
                // Only initialize places that are 'Športová hala' as per previous logic (if still desired)
                if (place.type === 'Športová hala') {
                     groupedMatchesByDayAndPlace.get(dayDoc.id).set(placeDoc.id, []);
                }
            });
        });

        allMatches.forEach(match => {
            if (groupedMatchesByDayAndPlace.has(match.playingDayId) &&
                groupedMatchesByDayAndPlace.get(match.playingDayId).has(match.placeId)) {
                groupedMatchesByDayAndPlace.get(match.playingDayId).get(match.placeId).push(match);
            }
        });

        let scheduleHtml = '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start;">'; // Main flex container

        // Sort playing days by date string
        const sortedPlayingDayIds = Array.from(groupedMatchesByDayAndPlace.keys()).sort((idA, idB) => {
            const dateA = playingDaysMap.get(idA)?.date;
            const dateB = playingDaysMap.get(idB)?.date;
            return dateA.localeCompare(dateB);
        });

        if (sortedPlayingDayIds.length === 0) {
            scheduleHtml += '<p>Žiadne zápasy na zobrazenie. Pridajte nové zápasy pomocou tlačidla "+".</p>';
        } else {
            sortedPlayingDayIds.forEach(playingDayId => {
                const playingDayData = playingDaysMap.get(playingDayId);
                if (!playingDayData) return; // Should not happen if data is consistent

                const matchesByPlaceForDay = groupedMatchesByDayAndPlace.get(playingDayId);
                const sortedPlaceIds = Array.from(matchesByPlaceForDay.keys()).sort((idA, idB) => {
                    const placeNameA = placesMap.get(idA)?.name;
                    const placeNameB = placesMap.get(idB)?.name;
                    return placeNameA.localeCompare(placeNameB);
                });

                // Calculate total rows for this day across all places for rowspan
                const totalDayRows = sortedPlaceIds.reduce((sum, placeId) => {
                    const matchesAtPlace = matchesByPlaceForDay.get(placeId);
                    return sum + Math.max(1, matchesAtPlace.length); // At least one row per place (even if no matches)
                }, 0);


                let isFirstRowForDay = true;
                sortedPlaceIds.forEach(placeId => {
                    const placeDetails = placesMap.get(placeId);
                    if (!placeDetails) return; // Should not happen

                    const matchesForPlace = matchesByPlaceForDay.get(placeId);

                    // Flex item for each place group
                    scheduleHtml += `<div class="location-group" style="flex: 1 1 45%; min-width: 300px; margin-bottom: 0; border: 1px solid #ccc; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">`;
                    scheduleHtml += `<h2 style="background-color: #007bff; color: white; padding: 18px; margin: 0; text-align: center;">Miesto: ${placeDetails.name}</h2>`;

                    const displayDateObj = new Date(playingDayData.date);
                    const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                    const dayName = displayDateObj.toLocaleDateString('sk-SK', { weekday: 'long' });

                    scheduleHtml += `<div class="date-group" data-playing-day-id="${playingDayId}" data-place-id="${placeId}" style="margin: 20px; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">`;
                    scheduleHtml += `<h3 style="background-color: #f7f7f7; padding: 15px; margin: 0; border-bottom: 1px solid #ddd;">${dayName}, ${formattedDisplayDate}</h3>`;
                    scheduleHtml += `<table class="data-table match-list-table compact-table" style="width: 100%; border-collapse: collapse;">`;
                    scheduleHtml += `<thead><tr>`;
                    scheduleHtml += `<th>Čas</th>`;
                    scheduleHtml += `<th>Domáci klub</th>`;
                    scheduleHtml += `<th>Hostia klub</th>`;
                    scheduleHtml += `<th>ID Domáci</th>`;
                    scheduleHtml += `<th>ID Hostia</th>`;
                    scheduleHtml += `<th>Akcie</th>`; // Added Actions column
                    scheduleHtml += `</tr></thead><tbody>`;

                    if (matchesForPlace.length === 0) {
                        scheduleHtml += `
                            <tr class="date-group-empty" data-playing-day-id="${playingDayId}" data-place-id="${placeId}">
                                <td colspan="6" style="text-align: center; font-style: italic; color: #777;">Žiadne zápasy na tomto mieste v tento deň.</td>
                            </tr>
                        `;
                    } else {
                        matchesForPlace.forEach(match => {
                            const [startH, startM] = match.time.split(':').map(Number);
                            const matchEndTime = new Date();
                            matchEndTime.setHours(startH, startM + match.duration, 0, 0);
                            const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                            // Find category to get color
                            const category = categoriesMap.get(match.categoryId);
                            const categoryColor = (category && category.color) ? category.color : 'transparent'; // Default to transparent if no color

                            // Function to determine text color based on background luminance
                            const getTextColor = (hexColor) => {
                                if (!hexColor || hexColor === 'transparent') return '#333'; // Default dark for transparent
                                const r = parseInt(hexColor.substring(1, 3), 16);
                                const g = parseInt(hexColor.substring(3, 5), 16);
                                const b = parseInt(hexColor.substring(5, 7), 16);
                                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                return (luminance > 0.5) ? '#333' : 'white'; // Dark text for light background, white for dark
                            };
                            const textColor = getTextColor(categoryColor);


                            scheduleHtml += `
                                <tr draggable="true" data-match-id="${match.id}" class="match-row">
                                    <td>${match.time} - ${formattedEndTime}</td>
                                    <td>${match.team1ClubName || 'N/A'}</td>
                                    <td>${match.team2ClubName || 'N/A'}</td>
                                    <td style="background-color: ${categoryColor}; color: ${textColor};">${match.team1DisplayName || 'N/A'}</td>
                                    <td style="background-color: ${categoryColor}; color: ${textColor};">${match.team2DisplayName || 'N/A'}</td>
                                    <td>
                                        <button class="action-button edit-match-button" data-id="${match.id}">Upraviť</button>
                                    </td>
                                </tr>
                            `;
                        });
                    }

                    scheduleHtml += `</tbody></table></div>`; // Close date-group table and div
                    scheduleHtml += `</div>`; // Close location-group div
                });
            });
        }
        scheduleHtml += '</div>'; // Close main flex container

        matchesContainer.innerHTML = scheduleHtml;

        // Add event listeners to each match row for click (edit) and drag
        matchesContainer.querySelectorAll('.match-row').forEach(row => {
            // Edit button specific listener (moved from general row click to button)
            row.querySelector('.edit-match-button').addEventListener('click', (event) => {
                const matchId = event.currentTarget.dataset.id;
                editMatch(matchId);
            });

            // Add dragstart listener
            row.addEventListener('dragstart', (event) => {
                event.dataTransfer.setData('text/plain', event.target.dataset.matchId); // Use data-match-id
                event.dataTransfer.effectAllowed = 'move';
                // Optional: Add a class to the dragged element for visual feedback
                event.target.classList.add('dragging');
            });

            // Optional: Remove dragging class on dragend
            row.addEventListener('dragend', (event) => {
                event.target.classList.remove('dragging');
            });

            // Add dragover and drop listeners for inserting between rows
            row.addEventListener('dragover', (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                // Visual feedback for insertion point (e.g., a border)
                event.currentTarget.classList.add('drop-over-row');
            });

            row.addEventListener('dragleave', (event) => {
                event.currentTarget.classList.remove('drop-over-row');
            });

            row.addEventListener('drop', async (event) => {
                event.preventDefault();
                event.currentTarget.classList.remove('drop-over-row');

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const targetMatchId = event.currentTarget.dataset.matchId; // The match we dropped BEFORE
                const parentDateGroup = event.currentTarget.closest('.date-group');
                const targetPlayingDayId = parentDateGroup.dataset.playingDayId; // Get ID from dataset
                const targetPlaceId = parentDateGroup.dataset.placeId; // Get ID from dataset

                if (draggedMatchId && targetPlayingDayId && targetPlaceId && targetMatchId) {
                    await moveAndRescheduleMatch(draggedMatchId, targetPlayingDayId, targetPlaceId, targetMatchId);
                }
            });
        });

        // Add dragover and drop listeners to the date-group divs for dropping at the end
        matchesContainer.querySelectorAll('.date-group').forEach(dateGroupDiv => {
            dateGroupDiv.addEventListener('dragover', (event) => {
                event.preventDefault(); // Crucial to allow a drop
                event.dataTransfer.dropEffect = 'move';
                // Only activate drop-target if dropping into an empty table body or at the very end
                const tableBody = dateGroupDiv.querySelector('tbody');
                if (tableBody && tableBody.children.length === 0) {
                     dateGroupDiv.classList.add('drop-target-active');
                } else if (event.target === tableBody || event.target.closest('tbody') === tableBody) {
                    // This allows dropping anywhere in the date-group, assuming it will go to the end if not on a specific row.
                    // The logic in moveAndRescheduleMatch (droppedBeforeMatchId = null) will handle appending.
                    dateGroupDiv.classList.add('drop-target-active');
                }
            });

            dateGroupDiv.addEventListener('dragleave', () => {
                dateGroupDiv.classList.remove('drop-target-active'); // Optional: visual feedback
            });

            dateGroupDiv.addEventListener('drop', async (event) => {
                event.preventDefault();
                dateGroupDiv.classList.remove('drop-target-active'); // Optional: visual feedback

                const draggedMatchId = event.dataTransfer.getData('text/plain');
                const targetPlayingDayId = dateGroupDiv.dataset.playingDayId; // Get ID from dataset
                const targetPlaceId = dateGroupDiv.dataset.placeId; // Get ID from dataset

                // Check if the drop occurred on a specific row inside this date-group
                const droppedOnRow = event.target.closest('.match-row');
                if (droppedOnRow && droppedOnRow.closest('.date-group') === dateGroupDiv) {
                    // This case is handled by the row's own drop listener, do nothing here
                    return;
                }

                if (draggedMatchId && targetPlayingDayId && targetPlaceId) {
                    // If dropped directly on the date-group, it means append to end or find first available
                    await moveAndRescheduleMatch(draggedMatchId, targetPlayingDayId, targetPlaceId, null); // null indicates append to end
                }
            });
        });


        // The following event listeners for date and location headers should still work conceptually,
        // but their click targets might need adjustment if the HTML structure for headers changes significantly.
        // For now, I'll keep them as is assuming there are still clickable elements representing these.
        // If they become redundant or problematic with the new layout, they can be removed or refined.
        // Also removed as they are not present in the current HTML.
        // matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => {
        //     header.addEventListener('click', (event) => {
        //         if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
        //             return;
        //         }
        //         if (event.target === header || event.target.closest('.schedule-date-header-content')) {
        //             const dateToEdit = header.dataset.date;
        //             editPlayingDay(dateToEdit);
        //         }
        //     });
        // });

        // matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
        //     header.addEventListener('click', (event) => {
        //         if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
        //             return;
        //         }
        //         if (event.target === header || event.target.closest('.hall-name')) {
        //             const locationToEdit = header.dataset.location;
        //             const locationTypeToEdit = header.dataset.type;
        //             editPlace(locationToEdit, locationTypeToEdit);
        //         }
        //     });
        // });

    } catch (error) {
        console.error("Chyba pri načítaní rozvrhu zápasov (zachytená chyba):", error);
        matchesContainer.innerHTML = `
            <div class="error-message">
                <h3>Chyba pri načítaní rozvrhu zápasov!</h3>
                <p>Prosím, skontrolujte konzolu prehliadača (F12 > Console) pre detaily.</p>
                <p>Možné príčiny:</p>
                <ul>
                    <li>Chýbajúce indexy vo Firestore. Skontrolujte záložku "Network" v konzole a Firebase Console.</li>
                    <li>Problém s pripojením k databáze alebo bezpečnostné pravidlá.</li>
                    <li>Žiadne dáta v kolekciách.</li>
                </ul>
                <p>Detail chyby: ${error.message}</p>
            </div>
        `;
        // If the error is related to being offline or connection issues, show a more specific message
        if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
             matchesContainer.innerHTML += '<p class="error-message">Zdá sa, že nie ste pripojení k internetu, alebo je problém s pripojením k Firebase.</p>';
        }
    }
};

/**
 * Deletes a playing day and all associated matches. Bus routes and accommodation removed.
 * @param {string} playingDayId The ID of the playing day to delete.
 */
const deletePlayingDay = async (playingDayId) => {
    const playingDayData = await getDoc(doc(playingDaysCollectionRef, playingDayId));
    const dateToDelete = playingDayData.exists() ? playingDayData.data().date : 'Neznámy dátum';

    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy, ktoré sa konajú v tento deň?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Delete playing day document
            batch.delete(doc(playingDaysCollectionRef, playingDayId));

            // Delete associated matches
            const matchesQuery = query(matchesCollectionRef, where("playingDayId", "==", playingDayId));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            await batch.commit();
            await showMessage('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy boli vymazané!`);
            closeModal(document.getElementById('playingDayModal'));
            await displayMatchesAsSchedule();
            await displayPlayingDaysTable(); // Also refresh playing days table
        } catch (error) {
            console.error("Chyba pri mazaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri mazaní hracieho dňa. Detail: ${error.message}`);
        }
    }
};

/**
 * Deletes a place (sport hall or catering) and all associated matches. Bus routes and accommodation removed.
 * @param {string} placeIdToDelete The ID of the place to delete.
 */
const deletePlace = async (placeIdToDelete) => {
    const placeData = await getDoc(doc(placesCollectionRef, placeIdToDelete));
    const placeNameToDelete = placeData.exists() ? placeData.data().name : 'Neznáme miesto';
    const placeTypeToDelete = placeData.exists() ? placeData.data().type : 'Neznámy typ';

    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať miesto ${placeNameToDelete} (${placeTypeToDelete}) a VŠETKY zápasy, ktoré sa viažu na toto miesto?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Delete place document
            batch.delete(doc(placesCollectionRef, placeIdToDelete));

            // Delete associated matches
            const matchesQuery = query(matchesCollectionRef, where("placeId", "==", placeIdToDelete));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            await batch.commit();
            await showMessage('Úspech', `Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy boli vymazané!`);
            closeModal(document.getElementById('placeModal'));
            await displayPlacesTable();
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní miesta:", error);
            await showMessage('Chyba', `Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}). Detail: ${error.message}`);
        }
    }
};

/**
 * Opens the modal to edit an existing playing day.
 * @param {string} playingDayId The ID of the playing day to edit.
 */
const editPlayingDay = async (playingDayId) => {
    try {
        const playingDayModal = document.getElementById('playingDayModal');
        const playingDayIdInput = document.getElementById('playingDayId');
        const playingDayDateInput = document.getElementById('playingDayDate');
        const playingDayModalTitle = document.getElementById('playingDayModalTitle');
        const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, playingDayId));

        if (playingDayDoc.exists()) {
            const playingDayData = playingDayDoc.data();
            playingDayIdInput.value = playingDayId;
            playingDayDateInput.value = playingDayData.date || '';
            playingDayModalTitle.textContent = 'Upraviť hrací deň';
            deletePlayingDayButtonModal.style.display = 'inline-block';
            deletePlayingDayButtonModal.onclick = () => deletePlayingDay(playingDayId);
            openModal(playingDayModal);
        } else {
            await showMessage('Informácia', "Hrací deň sa nenašiel.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát hracieho dňa:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát hracieho dňa. Skúste to znova.");
    }
};

/**
 * Opens the modal to edit an existing place.
 * @param {string} placeId The ID of the place to edit.
 */
const editPlace = async (placeId) => {
    try {
        const placeModal = document.getElementById('placeModal');
        const placeIdInput = document.getElementById('placeId');
        const placeTypeSelect = document.getElementById('placeTypeSelect');
        const placeNameInput = document.getElementById('placeName');
        const placeAddressInput = document.getElementById('placeAddress');
        const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
        const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

        const placeDoc = await getDoc(doc(placesCollectionRef, placeId));

        if (placeDoc.exists()) {
            const placeData = placeDoc.data();
            placeIdInput.value = placeId;
            // Ensure these elements exist in the HTML if you're trying to set their values
            if (placeTypeSelect) placeTypeSelect.value = placeData.type || '';
            if (placeNameInput) placeNameInput.value = placeData.name || '';
            if (placeAddressInput) placeAddressInput.value = placeData.address || '';
            if (placeGoogleMapsUrlInput) placeGoogleMapsUrlInput.value = placeData.googleMapsUrl || '';

            deletePlaceButtonModal.style.display = 'inline-block';
            deletePlaceButtonModal.onclick = () => deletePlace(placeId);
            openModal(placeModal);
        } else {
            await showMessage('Informácia', "Miesto sa nenašlo.");
        }
    }
    catch (error) {
        console.error("Chyba pri načítavaní dát miesta:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát miesta. Skúste to znova.");
    }
};


/**
 * Opens the modal to edit an existing match.
 * @param {string} matchId The ID of the match to edit.
 * @param {string} [newPlayingDayId=''] Optional: New playing day ID to pre-fill the modal with.
 * @param {string} [newPlaceId=''] Optional: New place ID to pre-fill the modal with.
 */
const editMatch = async (matchId, newPlayingDayId = '', newPlaceId = '') => {
    try {
        const matchModal = document.getElementById('matchModal');
        const matchIdInput = document.getElementById('matchId');
        const matchModalTitle = document.getElementById('matchModalTitle');
        const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
        const matchPlaceSelect = document.getElementById('matchPlaceSelect');
        const matchTimeInput = document.getElementById('matchTimeInput');
        const matchDurationInput = document.getElementById('matchDuration');
        const matchBufferTimeInput = document.getElementById('matchBufferTime');
        const matchCategorySelect = document.getElementById('matchCategorySelect');
        const matchGroupSelect = document.getElementById('matchGroupSelect');
        const team1Select = document.getElementById('team1Select');
        const team2Select = document.getElementById('team2Select');
        const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

        const matchDocRef = doc(matchesCollectionRef, matchId);
        const matchDoc = await getDoc(matchDocRef);

        if (matchDoc.exists()) {
            const matchData = matchDoc.data();
            matchIdInput.value = matchId;
            matchModalTitle.textContent = 'Upraviť zápas';

            // Pre-fill date and location from drag & drop, otherwise use existing match data
            await populatePlayingDaysSelect(matchPlayingDaySelect, newPlayingDayId || matchData.playingDayId);
            await populatePlacesSelect(matchPlaceSelect, newPlaceId || matchData.placeId); // Populate places select by ID

            // Set start time, duration, and buffer time from existing match data
            if (matchTimeInput) matchTimeInput.value = matchData.time || '';
            if (matchDurationInput) matchDurationInput.value = matchData.duration || '';
            if (matchBufferTimeInput) matchBufferTimeInput.value = matchData.bufferTime || '';

            // Populate category and group, and update duration/buffer if category changes
            await populateCategorySelect(matchCategorySelect, matchData.categoryId);
            if (matchData.categoryId) {
                await populateGroupSelect(matchGroupSelect, matchData.categoryId);
                if (matchGroupSelect) {
                    matchGroupSelect.value = matchData.groupId;
                    matchGroupSelect.disabled = false;
                }
            } else {
                if (matchGroupSelect) {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }
            }

            if (team1Select) await populateTeamsForGroupSelect(team1Select, matchData.groupId, matchData.team1Id);
            if (team2Select) await populateTeamsForGroupSelect(team2Select, matchData.groupId, matchData.team2Id);

            deleteMatchButtonModal.style.display = 'inline-block';
            deleteMatchButtonModal.onclick = () => deleteMatch(matchId);

            openModal(matchModal);

            // After opening the modal and setting date/location, find the first available time
            // This will recalculate the start time based on the new date/location
            // Only find first available if newPlayingDayId/newPlaceId are provided (from drag/drop)
            // If just editing existing match, keep its time.
            if (newPlayingDayId || newPlaceId) {
                // Ensure duration and buffer inputs are updated before finding time
                await getCategoryMatchSettingsAndUpdateInputs(matchCategorySelect.value);
                await findFirstAvailableTime(); // This will suggest the first available time in the new spot
            }


        } else {
            await showMessage('Informácia', "Zápas sa nenašiel.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát zápasu:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát zápasu. Skúste to znova.");
    }
};

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
        // Fetch duration and buffer directly from inputs
        const duration = parseInt(matchDurationInput.value);
        const bufferTime = parseInt(matchBufferTimeInput.value);


        // Basic validation
        if (!playingDayId || !placeId || !categoryId || !groupId || !time || !team1Id || !team2Id || isNaN(duration) || isNaN(bufferTime)) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre zápas (vrátane trvania a času na prípravu).');
            return;
        }

        if (team1Id === team2Id) {
            await showMessage('Chyba', 'Tímy nemôžu byť rovnaké!');
            return;
        }

        // Fetch categories and groups to get display names
        const categoriesMap = new Map();
        const groupsMap = new Map();
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name || doc.id));
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));

        // Fetch team numbers for the duplicate check (team1Number, team2Number are not in matchData directly, but clubs are by ID)
        const team1Doc = await getDoc(doc(clubsCollectionRef, team1Id));
        const team2Doc = await getDoc(doc(clubsCollectionRef, team2Id));
        const team1Number = team1Doc.exists() ? team1Doc.data().orderInGroup : null;
        const team2Number = team2Doc.exists() ? team2Doc.data().orderInGroup : null;

        // Define team1Result and team2Result here by calling getTeamName
        const team1Result = await getTeamName(categoryId, groupId, team1Number, categoriesMap, groupsMap);
        const team2Result = await getTeamName(categoryId, groupId, team2Number, categoriesMap, groupsMap);


        // Check if teams have already played against each other in the same category and group
        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let alreadyPlayed = false;
            let overlappingExistingMatchDetails = null; // Variable to store details of the overlapping match

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                // If editing an existing match, exclude it from the duplicate check
                if (id && existingMatchId === id) {
                    return;
                }

                const existingTeam1Id = existingMatch.team1Id;
                const existingTeam2Id = existingMatch.team2Id;

                // Check both possible combinations (Team1 vs Team2 or Team2 vs Team1) using IDs
                const condition1 = (existingTeam1Id === team1Id && existingTeam2Id === team2Id);
                const condition2 = (existingTeam1Id === team2Id && existingTeam2Id === team1Id);

                if (condition1 || condition2) {
                    alreadyPlayed = true;
                    overlappingExistingMatchDetails = existingMatch; // Store the existing match details
                    return; // Found a duplicate match, can exit the loop
                }
            });

            if (alreadyPlayed) {
                const playingDayData = await getDoc(doc(playingDaysCollectionRef, overlappingExistingMatchDetails.playingDayId));
                const formattedDate = playingDayData.exists() ? `${String(new Date(playingDayData.data().date).getDate()).padStart(2, '0')}. ${String(new Date(playingDayData.data().date).getMonth() + 1).padStart(2, '0')}. ${new Date(playingDayData.data().date).getFullYear()}` : 'Neznámy dátum';

                await showMessage('Chyba', `Tímy ${team1Result.fullDisplayName || 'N/A'} a ${team2Result.fullDisplayName || 'N/A'} už proti sebe hrali v kategórii ${categoriesMap.get(categoryId)} a v skupine ${groupsMap.get(groupId)} dňa ${formattedDate} o ${overlappingExistingMatchDetails.time}. Prosím, zadajte iné tímy.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole existujúcich zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole, či tímy už hrali proti sebe. Skúste to znova.");
            return;
        }

        // Check for time overlap in the same location and date
        const [newStartHour, newStartMinute] = time.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + duration + bufferTime;

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("playingDayId", "==", playingDayId),
                where("placeId", "==", placeId)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                if (id && existingMatchId === id) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.time.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return;
                }
            });

            if (overlapFound) {
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.time.split(':').map(Number);
                const existingMatchEndTimeObj = new Date();
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                const placeDetails = placesMap.get(placeId);
                const placeName = placeDetails ? placeDetails.name : 'Neznáme miesto';
                const playingDayDetails = playingDaysMap.get(playingDayId);
                const formattedDate = playingDayDetails ? `${String(new Date(playingDayDetails.date).getDate()).padStart(2, '0')}. ${String(new Date(playingDayDetails.date).getMonth() + 1).padStart(2, '0')}. ${new Date(playingDayDetails.date).getFullYear()}` : 'Neznámy dátum';


                await showMessage('Chyba', `Zápas sa prekrýva s existujúcim zápasom v mieste "${placeName}" dňa ${formattedDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.time} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }

        const matchData = {
            playingDayId: playingDayId,
            placeId: placeId,
            categoryId: categoryId,
            groupId: groupId,
            time: time,
            duration: duration,
            bufferTime: bufferTime,
            team1Id: team1Id,
            team2Id: team2Id,
            team1Number: team1Number, // Store orderInGroup as team number
            team2Number: team2Number, // Store orderInGroup as team number
            team1DisplayName: team1Result ? team1Result.fullDisplayName : 'N/A',
            team1ClubName: team1Result ? team1Result.clubName : 'N/A',
            team1ClubId: team1Result ? team1Result.clubId : null,
            team2DisplayName: team2Result ? team2Result.fullDisplayName : 'N/A',
            team2ClubName: team2Result ? team2Result.clubName : 'N/A',
            team2ClubId: team2Result ? team2Result.clubId : null,
            createdAt: new Date()
        };

        try {
            if (id) {
                await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                await showMessage('Úspech', 'Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
        }
    });

    /**
     * Handles the submission of the place form.
     */
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('placeId').value;
        const type = document.getElementById('placeTypeSelect').value.trim();
        const name = document.getElementById('placeName').value.trim();
        const address = document.getElementById('placeAddress').value.trim();
        const googleMapsUrl = document.getElementById('placeGoogleMapsUrl').value.trim();

        // Basic validation
        if (!type || !name || !address || !googleMapsUrl) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }
        // Removed type check for Accommodation as it's no longer supported
        if (type === 'Ubytovanie') {
            await showMessage('Chyba', 'Typ miesta "Ubytovanie" nie je podporovaný. Vyberte "Športová hala" alebo "Stravovacie zariadenie".');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validate URL format
        } catch (_) {
            await showMessage('Chyba', 'Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

            // Check for duplicate place (name and type combination)
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
     * Handles the submission of the playing day form.
     */
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
 * Adds drag and drop event listeners to schedule rows.
 */
const addDropTargetListeners = () => {
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
};


/**
 * Moves a match to a new playing day and/or place.
 * @param {string} matchId The ID of the match to move.
 * @param {string} newPlayingDayId The ID of the new playing day.
 * @param {string} newPlaceId The ID of the new place.
 */
const moveMatch = async (matchId, newPlayingDayId, newPlaceId) => {
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
};


/**
 * Opens the accommodation modal for adding a new accommodation or editing an existing one.
 * @param {string|null} accommodationId - The ID of the accommodation to edit, or null for a new one.
 * @param {object|null} accommodationData - The data of the accommodation to edit.
 */
const openAccommodationModal = async (accommodationId = null, accommodationData = null) => {
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
};

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
const displayAccommodationTable = async () => {
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
};

/**
 * Deletes an accommodation.
 * @param {string} accommodationId - The ID of the accommodation to delete.
 */
const deleteAccommodation = async (accommodationId) => {
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
};

/**
 * Opens the assign accommodation modal.
 * @param {string|null} assignmentId - The ID of the assignment to edit, or null for a new one.
 * @param {object|null} assignmentData - The data of the assignment to edit.
 */
const openAssignAccommodationModal = async (assignmentId = null, assignmentData = null) => {
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
};

/**
 * Populates a select element with teams for accommodation assignment.
 * This should display each club/team once, as clubs represent the teams that need accommodation.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {Array<object>} teamsData - An array of team objects ({id, clubName}).
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
const populateTeamSelectForAccommodation = (selectElement, teamsData, selectedTeamId = '') => {
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
};

/**
 * Populates a select element with accommodations from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodationId=''] The ID of the accommodation to pre-select.
 */
const populateAccommodationsSelect = async (selectElement, selectedAccommodationId = '') => {
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
};

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
const displayAssignedAccommodationTable = async () => {
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
};

/**
 * Deletes an assigned accommodation.
 * @param {string} assignmentId - The ID of the assignment to delete.
 */
const deleteAssignedAccommodation = async (assignmentId) => {
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
};


// Initialize tables on page load
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

    // These elements need to be defined here for use in this scope
    const matchTimeInput = document.getElementById('matchTimeInput');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategorySelect');
    const matchGroupSelect = document.getElementById('matchGroupSelect');
    const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
    const matchPlaceSelect = document.getElementById('matchPlaceSelect');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal'); // Corrected variable name

    const playingDayModal = document.getElementById('playingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    const placeModal = document.getElementById('placeModal');
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

    // Initial display of the schedule when the page loads
    await displayMatchesAsSchedule();

    // Event listeners for the "Add" button and its options
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing options immediately
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
        // These need to be populated from the HTML form elements, make sure they exist
        if (placeTypeSelect) placeTypeSelect.value = '';
        if (placeNameInput) placeNameInput.value = '';
        if (placeAddressInput) placeAddressInput.value = '';
        if (placeGoogleMapsUrlInput) placeGoogleMapsUrlInput.value = '';

        deletePlaceButtonModal.style.display = 'none';
        openModal(placeModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        document.getElementById('matchModalTitle').textContent = 'Pridať nový zápas'; // Corrected ID
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchPlayingDaySelect);
        await populatePlacesSelect(matchPlaceSelect);
        if (matchGroupSelect) {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }
        // Assuming team1Select and team2Select are defined globally or are accessible
        if (team1Select) team1Select.value = '';
        if (team2Select) team2Select.value = '';
        if (matchDurationInput) matchDurationInput.value = '';
        if (matchBufferTimeInput) matchBufferTimeInput.value = '';
        if (deleteMatchButtonModal) deleteMatchButtonModal.style.display = 'none'; // Corrected variable name
        openModal(matchModal);
        addOptions.classList.remove('show');
        // Update match duration and buffer based on initial category selection or default
        if (matchCategorySelect.value) {
            await getCategoryMatchSettingsAndUpdateInputs(matchCategorySelect.value);
        } else {
            // findFirstAvailableTime() relies on matchDurationInput and matchBufferTimeInput having values
            // so ensure they are set to defaults if no category is selected.
            if (matchDurationInput) matchDurationInput.value = 60;
            if (matchBufferTimeInput) matchBufferTimeInput.value = 5;
            await findFirstAvailableTime(); // Find time even without category selected (uses default duration/buffer)
        }
    });

    // Close modal event listeners
    // These listeners are already handled at the global scope, no need to re-attach here.
    // The previous implementation had them here, which is redundant if they are also at top-level.
    // They are correctly defined above this DOMContentLoaded block.

    // Event listeners for dynamic updates in match form
    if (matchCategorySelect) {
        matchCategorySelect.addEventListener('change', async () => {
            const selectedCategoryId = matchCategorySelect.value;
            if (selectedCategoryId) {
                await populateGroupSelect(matchGroupSelect, selectedCategoryId); // Changed order of args
                if (matchGroupSelect) {
                    matchGroupSelect.disabled = false;
                }
                await getCategoryMatchSettingsAndUpdateInputs(selectedCategoryId); // New function
            } else {
                if (matchGroupSelect) {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }
                if (team1Select) team1Select.value = '';
                if (team2Select) team2Select.value = '';
                // Reset to default values if no category is selected
                if (matchDurationInput) matchDurationInput.value = 60;
                if (matchBufferTimeInput) matchBufferTimeInput.value = 5;
                await findFirstAvailableTime();
            }
        });
    }

    if (matchPlayingDaySelect) matchPlayingDaySelect.addEventListener('change', findFirstAvailableTime);
    if (matchPlaceSelect) matchPlaceSelect.addEventListener('change', findFirstAvailableTime);
    if (matchDurationInput) matchDurationInput.addEventListener('change', findFirstAvailableTime);
    if (matchBufferTimeInput) matchBufferTimeInput.addEventListener('change', findFirstAvailableTime);
});

/**
 * Gets the full display name and club information for a team.
 * @param {string} categoryId The ID of the category.
 * @param {string} groupId The ID of the group.
 * @param {number} teamNumber The order number of the team in the group.
 * @param {Map<string, string>} categoriesMap Map of category IDs to names.
 * @param {Map<string, string>} groupsMap Map of group IDs to names.
 * @returns {Promise<{fullDisplayName: string|null, clubName: string|null, clubId: string|null}>} Team display information.
 */
const getTeamName = async (categoryId, groupId, teamNumber, categoriesMap, groupsMap) => {
    if (!categoryId || !groupId || teamNumber === null || teamNumber === undefined) { // Check for null/undefined for teamNumber
        return { fullDisplayName: null, clubName: null, clubId: null };
    }
    try {
        const categoryName = categoriesMap.get(categoryId)?.name || categoryId; // Use .name if available
        const groupName = groupsMap.get(groupId) || groupId;

        let clubName = `Tím ${teamNumber}`;
        let clubId = null;

        // Still need to query clubs collection specifically for the team number within category/group
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
            if (teamDocData.clubName) { // Use clubName from data
                clubName = teamDocData.clubName;
            }
        }

        let shortCategoryName = categoryName;
        if (shortCategoryName) {
            shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
        }

        let shortGroupName = '';
        if (groupName) {
            const match = String(groupName).match(/(?:skupina\s*)?([A-Z])/i); // Ensure groupName is string
            if (match && match[1]) {
                shortGroupName = match[1].toUpperCase();
            }
        }

        const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;

        return {
            fullDisplayName: fullDisplayName,
            clubName: clubName,
            clubId: clubId
        };
    } catch (error) {
        console.error("Chyba pri získavaní názvu tímu:", error);
        return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
    }
};

/**
 * Finds the first available time slot for a match based on date, location, duration, and buffer time.
 */
const findFirstAvailableTime = async () => {
    // These need to be accessed from DOM always, not just once.
    const matchDateSelect = document.getElementById('matchPlayingDaySelect'); // Corrected ID
    const matchLocationSelect = document.getElementById('matchPlaceSelect'); // Corrected ID
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchStartTimeInput = document.getElementById('matchTimeInput'); // Corrected ID

    const selectedDate = matchDateSelect ? matchDateSelect.value : null;
    const selectedLocationId = matchLocationSelect ? matchLocationSelect.value : null; // Get ID from select
    const duration = parseInt(matchDurationInput ? matchDurationInput.value : 60) || 60;
    const bufferTime = parseInt(matchBufferTimeInput ? matchBufferTimeInput.value : 5) || 5;

    if (!selectedDate || !selectedLocationId) {
        if (matchStartTimeInput) matchStartTimeInput.value = '';
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
        const endSearchHour = 22; // Until 10 PM
        const intervalMinutes = 1;

        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("playingDayId", "==", selectedDate), // Use playingDayId for date matching
            where("placeId", "==", selectedLocationId) // Use placeId for location matching
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

        const existingEvents = existingMatchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const [eventStartH, eventStartM] = data.time.split(':').map(Number); // Use data.time
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
                    if (matchStartTimeInput) matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                    return;
                }
            }
        }
        if (matchStartTimeInput) matchStartTimeInput.value = '';
    } catch (error) {
        console.error("Chyba pri hľadaní prvého dostupného času:", error);
        if (matchStartTimeInput) matchStartTimeInput.value = '';
    }
};

/**
 * Calculates the next available start time for a match given a previous match's end time and buffer.
 * @param {string} prevStartTime HH:MM string of the previous match's start time.
 * @param {number} duration Match duration in minutes.
 * @param {number} bufferTime Buffer time in minutes after the match.
 * @returns {string} HH:MM string of the next available start time.
 */
const calculateNextAvailableTime = (prevStartTime, duration, bufferTime) => {
    let [prevH, prevM] = prevStartTime.split(':').map(Number);
    let totalMinutes = (prevH * 60) + prevM + duration + bufferTime;

    let newH = Math.floor(totalMinutes / 60);
    let newM = totalMinutes % 60;

    // Handle case where time wraps around midnight (e.g., 24:05 -> 00:05 next day)
    // For scheduling within a single day, we might cap at 23:59 or indicate overflow.
    // Given the previous findFirstAvailableTime caps at 22:00, this might not be strictly necessary
    // for calculating *within* a day, but useful if matches can span midnight.
    // For simplicity, let's keep it capped for now, or allow overflow if needed for future features.
    if (newH >= 24) {
        newH = newH % 24; // Wrap around for display if needed, but consider scheduling implications
    }


    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};


/**
 * Recalculates and reschedules matches for a specific date and location after a drag & drop operation.
 * This function handles inserting a match and shifting subsequent matches' times.
 * @param {string} draggedMatchId The ID of the match that was dragged.
 * @param {string} targetPlayingDayId The ID of the playing day of the drop target.
 * @param {string} targetPlaceId The ID of the place of the drop target.
 * @param {string|null} droppedBeforeMatchId The ID of the match the dragged match was dropped before, or null if dropped at the end.
 */
const moveAndRescheduleMatch = async (draggedMatchId, targetPlayingDayId, targetPlaceId, droppedBeforeMatchId = null) => {
    try {
        const draggedMatchDoc = await getDoc(doc(matchesCollectionRef, draggedMatchId));
        if (!draggedMatchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            return;
        }
        const movedMatchData = { id: draggedMatchDoc.id, ...draggedMatchDoc.data() };

        // Fetch all matches for the target date and location, excluding the dragged match if it was already there
        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("playingDayId", "==", targetPlayingDayId),
            where("placeId", "==", targetPlaceId),
            orderBy("time", "asc") // Order by time for correct rescheduling
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
        let matchesForReschedule = existingMatchesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(match => match.id !== draggedMatchId); // Ensure the dragged match isn't duplicated

        // Get global start times from settings
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
        const targetPlayingDayData = (await getDocs(query(playingDaysCollectionRef, where('id', '==', targetPlayingDayId)))).docs[0]?.data(); // Find actual date string
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && targetPlayingDayData && targetPlayingDayData.date === sortedPlayingDays[0];
        const initialStartTime = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;

        // Determine insertion index
        let insertionIndex = matchesForReschedule.length; // Default to end
        if (droppedBeforeMatchId) {
            const targetMatchIndex = matchesForReschedule.findIndex(m => m.id === droppedBeforeMatchId);
            if (targetMatchIndex !== -1) {
                insertionIndex = targetMatchIndex;
            }
        }

        // Insert the moved match into the correct position
        matchesForReschedule.splice(insertionIndex, 0, movedMatchData);

        const batch = writeBatch(db);
        let currentAvailableTime = initialStartTime;

        // Iterate through the reordered list and update start times
        for (let i = 0; i < matchesForReschedule.length; i++) {
            const match = matchesForReschedule[i];
            const matchRef = doc(matchesCollectionRef, match.id);

            // Get duration and buffer for this specific match (important if categories have different settings)
            const categorySettingsDoc = await getDoc(doc(categoriesCollectionRef, match.categoryId)); // Fetch category directly
            let duration = 60; // Default
            let bufferTime = 5; // Default

            if (categorySettingsDoc.exists()) {
                const categoryData = categorySettingsDoc.data();
                duration = categoryData.duration || duration; // Use 'duration' key as per settings.js
                bufferTime = categoryData.bufferTime || bufferTime; // Use 'bufferTime' key as per settings.js
            }

            // Calculate new start time
            let newStartTime = currentAvailableTime;

            // Update the match document with new date, location, and start time
            // Ensure to save playingDayId and placeId, not "date" and "location" as they are string representations
            batch.update(matchRef, {
                playingDayId: targetPlayingDayId, // This is the ID
                placeId: targetPlaceId, // This is the ID
                time: newStartTime, // Use 'time' key for start time
                duration: duration, // Ensure these are up-to-date
                bufferTime: bufferTime // Ensure these are up-to-date
            });

            // Calculate next available time for the subsequent match
            currentAvailableTime = calculateNextAvailableTime(newStartTime, duration, bufferTime);

            // Basic check to prevent excessively long schedules
            if (parseInt(currentAvailableTime.split(':')[0]) >= 24) { // If next available time goes past midnight
                console.warn(`Rozvrh pre ${targetPlayingDayId} v ${targetPlaceId} presiahol 24:00. Posledný zápas: ${match.id} do ${currentAvailableTime}`);
            }
        }

        await batch.commit();
        await showMessage('Úspech', `Zápas bol presunutý a rozvrh bol prepočítaný.`);
        await displayMatchesAsSchedule(); // Refresh the display
    } catch (error) {
        console.error("Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule(); // Refresh to show current state even with error
    }
};

/**
 * Helper function to update duration/buffer inputs from category settings
 */
const getCategoryMatchSettingsAndUpdateInputs = async (categoryId) => {
    const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
    const settingsDoc = await getDoc(settingsDocRef);
    let duration = 60; // Default
    let bufferTime = 5; // Default

    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        const categorySettings = data.categoryMatchSettings && data.categoryMatchSettings[categoryId];
        if (categorySettings) {
            duration = categorySettings.duration || duration;
            bufferTime = categorySettings.bufferTime || bufferTime;
        }
    }
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    if (matchDurationInput) matchDurationInput.value = duration;
    if (matchBufferTimeInput) matchBufferTimeInput.value = bufferTime;
    await findFirstAvailableTime(); // Recalculate time after updating duration/buffer
};
