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
            option.value = doc.id;
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
 * Loads teams for a given category and group into a select element.
 * @param {string} categoryId The ID of the selected category.
 * @param {string} groupId The ID of the selected group.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 * @param {boolean} [addOptionalEmpty=false] Whether to add an optional empty value.
 */
async function populateTeamsSelect(categoryId, groupId, selectElement, selectedTeamId = '', addOptionalEmpty = false) {
    selectElement.innerHTML = ''; // Clear previous options
    if (addOptionalEmpty) {
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Vyberte konkrétny tím (nepovinné) --';
        selectElement.appendChild(emptyOption);
    }

    if (!categoryId || !groupId) {
        const disabledOption = document.createElement('option');
        disabledOption.value = '';
        disabledOption.textContent = '-- Vyberte kategóriu a skupinu --';
        disabledOption.disabled = true;
        selectElement.appendChild(disabledOption);
        return;
    }

    try {
        const q = query(clubsCollectionRef, where('categoryId', '==', categoryId), where('groupId', '==', groupId), orderBy('orderInGroup', 'asc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const noTeamsOption = document.createElement('option');
            noTeamsOption.value = '';
            noTeamsOption.textContent = '-- V tejto skupine nie sú žiadne tímy --';
            noTeamsOption.disabled = true;
            selectElement.appendChild(noTeamsOption);
            return;
        }

        querySnapshot.forEach(doc => {
            const team = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = team.clubName;
            selectElement.appendChild(option);
        });

        if (selectedTeamId) {
            selectElement.value = selectedTeamId;
        }
    } catch (error) {
        console.error('Error populating teams select:', error);
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = '-- Chyba pri načítaní tímov --';
        errorOption.disabled = true;
        selectElement.appendChild(errorOption);
    }
}


/**
 * Populates a select element with available accommodations from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodationId=''] The ID of the accommodation to pre-select.
 */
async function populateAccommodationsSelect(selectElement, selectedAccommodationId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    try {
        const accommodationsCollectionRef = collection(db, 'accommodations'); // Predpokladaná kolekcia pre ubytovanie
        const querySnapshot = await getDocs(query(accommodationsCollectionRef, orderBy("name", "asc")));
        querySnapshot.forEach((doc) => {
            const accommodation = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = accommodation.name;
            selectElement.appendChild(option);
        });
        if (selectedAccommodationId) {
            selectElement.value = selectedAccommodationId;
        }
    } catch (error) {
        console.error("Chyba pri načítaní ubytovní:", error);
    }
}


// UI Elements
const playingDaysListDiv = document.getElementById('playingDaysList');
const placesListDiv = document.getElementById('placesList');
const matchesScheduleDiv = document.getElementById('matchesSchedule');

const addButton = document.getElementById('addButton');
const addOptions = document.getElementById('addOptions');
const addPlayingDayButton = document.getElementById('addPlayingDayButton');
const addPlaceButton = document.getElementById('addPlaceButton');
const addMatchButton = document.getElementById('addMatchButton');
const addAccommodationButton = document.getElementById('addAccommodationButton');

// Modals
const playingDayModal = document.getElementById('playingDayModal');
const playingDayForm = document.getElementById('playingDayForm');
const playingDayModalCloseBtn = playingDayModal ? playingDayModal.querySelector('.playing-day-modal-close') : null;

const placeModal = document.getElementById('placeModal');
const placeForm = document.getElementById('placeForm');
const placeModalCloseBtn = placeModal ? placeModal.querySelector('.place-modal-close') : null;

const matchModal = document.getElementById('matchModal');
const matchForm = document.getElementById('matchForm');
const matchModalCloseBtn = matchModal ? matchModal.querySelector('.match-modal-close') : null;
const matchModalTitle = document.getElementById('matchModalTitle');
const matchCategoryIdSelect = document.getElementById('matchCategoryId');
const matchGroupIdSelect = document.getElementById('matchGroupId');
const matchTeam1IdSelect = document.getElementById('matchTeam1Id');
const matchTeam2IdSelect = document.getElementById('matchTeam2Id');
const matchPlayingDaySelect = document.getElementById('matchPlayingDay');
const matchPlaceSelect = document.getElementById('matchPlace');
const matchTimeInput = document.getElementById('matchTime');
const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

const accommodationModal = document.getElementById('accommodationModal');
const accommodationForm = document.getElementById('accommodationForm');
const accommodationModalCloseBtn = accommodationModal ? accommodationModal.querySelector('.accommodation-modal-close') : null;

const assignAccommodationModal = document.getElementById('assignAccommodationModal');
const assignAccommodationForm = document.getElementById('assignAccommodationForm');
const assignAccommodationModalCloseBtn = assignAccommodationModal ? assignAccommodationModal.querySelector('.assign-accommodation-modal-close') : null;
const assignAccommodationTeamCategorySelect = document.getElementById('assignAccommodationTeamCategory');
const assignAccommodationTeamGroupSelect = document.getElementById('assignAccommodationTeamGroup');
const assignAccommodationTeamSelect = document.getElementById('assignAccommodationTeamSelect');
const accommodationSelect = document.getElementById('accommodationSelect');
const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');


// Filters for Matches Schedule
const filterPlayingDaySelect = document.getElementById('filterPlayingDay');
const filterPlaceSelect = document.getElementById('filterPlace');
const filterCategorySelect = document.getElementById('filterCategory');
const filterGroupSelect = document.getElementById('filterGroup');
const clearFiltersButton = document.getElementById('clearFiltersButton');


let currentMatchId = null;
let currentPlayingDayId = null;
let currentPlaceId = null;
let currentAccommodationId = null;
let currentAssignmentDocId = null;


// --- Event Listeners for Add Buttons and Modals ---

// Toggle add options dropdown
if (addButton) {
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing it immediately
        if (addOptions) {
            addOptions.classList.toggle('show');
        }
    });
}

// Close dropdown if clicked outside
document.addEventListener('click', (event) => {
    if (addOptions && !addButton.contains(event.target) && !addOptions.contains(event.target)) {
        addOptions.classList.remove('show');
    }
});

if (addPlayingDayButton) {
    addPlayingDayButton.addEventListener('click', () => openPlayingDayModal());
}
if (addPlaceButton) {
    addPlaceButton.addEventListener('click', () => openPlaceModal());
}
if (addMatchButton) {
    addMatchButton.addEventListener('click', () => openMatchModal());
}
if (addAccommodationButton) {
    addAccommodationButton.addEventListener('click', () => openAccommodationModal());
}


// --- Modal Close Buttons ---
if (playingDayModalCloseBtn) {
    playingDayModalCloseBtn.addEventListener('click', () => closeModal(playingDayModal));
}
if (placeModalCloseBtn) {
    placeModalCloseBtn.addEventListener('click', () => closeModal(placeModal));
}
if (matchModalCloseBtn) {
    matchModalCloseBtn.addEventListener('click', () => closeModal(matchModal));
}
if (accommodationModalCloseBtn) {
    accommodationModalCloseBtn.addEventListener('click', () => closeModal(accommodationModal));
}
if (assignAccommodationModalCloseBtn) {
    assignAccommodationModalCloseBtn.addEventListener('click', () => closeModal(assignAccommodationModal));
}

// Close modal when clicking outside content
[playingDayModal, placeModal, matchModal, accommodationModal, assignAccommodationModal].forEach(modal => {
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    }
});


// --- Playing Day Logic ---

/**
 * Opens the playing day modal for adding or editing.
 * @param {string|null} id The ID of the playing day to edit, or null for a new one.
 * @param {object|null} data The data of the playing day to edit.
 */
async function openPlayingDayModal(id = null, data = null) {
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayIdInput = document.getElementById('playingDayId');
    
    if (!playingDayDateInput || !playingDayIdInput || !playingDayModal) return;

    if (id && data) {
        playingDayDateInput.value = data.date;
        playingDayIdInput.value = id;
    } else {
        playingDayDateInput.value = '';
        playingDayIdInput.value = '';
    }
    openModal(playingDayModal);
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
            // FIX: Corrected the backtick to a double quote for the '==' operator.
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
 * Deletes a playing day.
 * @param {string} id The ID of the playing day to delete.
 */
async function deletePlayingDay(id) {
    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento hrací deň? Vymažú sa aj všetky súvisiace zápasy!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);
        const playingDayRef = doc(playingDaysCollectionRef, id);
        batch.delete(playingDayRef);

        // Delete all matches associated with this playing day
        const matchesQuery = query(matchesCollectionRef, where('playingDayId', '==', id));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        await batch.commit();
        await showMessage('Úspech', 'Hrací deň a súvisiace zápasy úspešne vymazané!');
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní hracieho dňa. Detail: ${error.message}`);
    }
}

// --- Place Logic ---

/**
 * Opens the place modal for adding or editing.
 * @param {string|null} id The ID of the place to edit, or null for a new one.
 * @param {object|null} data The data of the place to edit.
 */
async function openPlaceModal(id = null, data = null) {
    const placeNameInput = document.getElementById('placeName');
    const placeIdInput = document.getElementById('placeId');
    
    if (!placeNameInput || !placeIdInput || !placeModal) return;

    if (id && data) {
        placeNameInput.value = data.name;
        placeIdInput.value = id;
    } else {
        placeNameInput.value = '';
        placeIdInput.value = '';
    }
    openModal(placeModal);
}

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

            // Check for duplicate place name
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
 * Deletes a place.
 * @param {string} id The ID of the place to delete.
 */
async function deletePlace(id) {
    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto miesto? Vymažú sa aj všetky súvisiace zápasy!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);
        const placeRef = doc(placesCollectionRef, id);
        batch.delete(placeRef);

        // Delete all matches associated with this place
        const matchesQuery = query(matchesCollectionRef, where('placeId', '==', id));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(matchDoc => {
            batch.delete(matchDoc.ref);
        });

        await batch.commit();
        await showMessage('Úspech', 'Miesto a súvisiace zápasy úspešne vymazané!');
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Chyba pri vymazávaní miesta:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní miesta. Detail: ${error.message}`);
    }
}

// --- Accommodation Logic ---

/**
 * Opens the accommodation modal for adding or editing.
 * @param {string|null} id The ID of the accommodation to edit, or null for a new one.
 * @param {object|null} data The data of the accommodation to edit.
 */
async function openAccommodationModal(id = null, data = null) {
    const accommodationNameInput = document.getElementById('accommodationName');
    const accommodationCapacityInput = document.getElementById('accommodationCapacity');
    const accommodationIdInput = document.getElementById('accommodationId');
    
    if (!accommodationNameInput || !accommodationCapacityInput || !accommodationIdInput || !accommodationModal) return;

    if (id && data) {
        accommodationNameInput.value = data.name;
        accommodationCapacityInput.value = data.capacity;
        accommodationIdInput.value = id;
    } else {
        accommodationNameInput.value = '';
        accommodationCapacityInput.value = '';
        accommodationIdInput.value = '';
    }
    openModal(accommodationModal);
}

if (accommodationForm) {
    accommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('accommodationId').value;
        const name = document.getElementById('accommodationName').value.trim();
        const capacity = parseInt(document.getElementById('accommodationCapacity').value, 10);

        // Basic validation
        if (!name || isNaN(capacity) || capacity <= 0) {
            await showMessage('Chyba', 'Prosím, zadajte platný názov a kladnú kapacitu ubytovne.');
            return;
        }

        try {
            const accommodationsCollectionRef = collection(db, 'accommodations');
            const q = query(accommodationsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            // Check for duplicate accommodation name
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessage('Chyba', 'Ubytovňa s týmto názvom už existuje!');
                return;
            }

            const accommodationData = { name: name, capacity: capacity };

            if (id) {
                await setDoc(doc(accommodationsCollectionRef, id), accommodationData, { merge: true });
                await showMessage('Úspech', 'Ubytovňa úspešne upravená!');
            } else {
                await addDoc(accommodationsCollectionRef, { ...accommodationData, createdAt: new Date() });
                await showMessage('Úspech', 'Ubytovňa úspešne pridaná!');
            }
            closeModal(accommodationModal);
            await displayAccommodations(); // Refresh display
        } catch (error) {
            console.error("Chyba pri ukladaní ubytovne:", error);
            await showMessage('Chyba', `Chyba pri ukladaní ubytovne. Detail: ${error.message}`);
        }
    });
}

/**
 * Deletes an accommodation.
 * @param {string} id The ID of the accommodation to delete.
 */
async function deleteAccommodation(id) {
    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať túto ubytovňu? Všetky priradenia k tejto ubytovni budú tiež vymazané!');
    if (!confirmation) {
        return;
    }

    try {
        const batch = writeBatch(db);
        const accommodationsCollectionRef = collection(db, 'accommodations');
        const accommodationRef = doc(accommodationsCollectionRef, id);
        batch.delete(accommodationRef);

        // Delete all assignments related to this accommodation
        const assignmentsCollectionRef = collection(db, 'teamAccommodations');
        const assignmentsQuery = query(assignmentsCollectionRef, where('accommodationId', '==', id));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        assignmentsSnapshot.forEach(assignmentDoc => {
            batch.delete(assignmentDoc.ref);
        });

        await batch.commit();
        await showMessage('Úspech', 'Ubytovňa a súvisiace priradenia úspešne vymazané!');
        await displayAccommodations();
    } catch (error) {
        console.error("Chyba pri vymazávaní ubytovne:", error);
        await showMessage('Chyba', `Chyba pri vymazávaní ubytovne. Detail: ${error.message}`);
    }
}


// --- Match Logic ---

/**
 * Opens the match modal for adding or editing.
 * @param {string|null} id The ID of the match to edit, or null for a new one.
 * @param {object|null} data The data of the match to edit.
 */
async function openMatchModal(id = null, data = null) {
    currentMatchId = id;
    if (matchModalTitle && matchCategoryIdSelect && matchGroupIdSelect && matchTeam1IdSelect && matchTeam2IdSelect && matchPlayingDaySelect && matchPlaceSelect && matchTimeInput && deleteMatchButtonModal) {
        if (id && data) {
            matchModalTitle.textContent = 'Upraviť zápas';
            matchCategoryIdSelect.value = data.categoryId;
            await populateGroupSelect(matchGroupIdSelect, data.categoryId, data.groupId);
            await populateTeamsSelect(data.categoryId, data.groupId, matchTeam1IdSelect, data.team1Id);
            await populateTeamsSelect(data.categoryId, data.groupId, matchTeam2IdSelect, data.team2Id);
            matchPlayingDaySelect.value = data.playingDayId;
            matchPlaceSelect.value = data.placeId;
            matchTimeInput.value = data.time;
            deleteMatchButtonModal.style.display = 'inline-block';
        } else {
            matchModalTitle.textContent = 'Pridať zápas';
            matchCategoryIdSelect.value = ''; // Reset to default
            matchGroupIdSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Reset groups
            matchTeam1IdSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>'; // Reset teams
            matchTeam2IdSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>'; // Reset teams
            matchPlayingDaySelect.value = '';
            matchPlaceSelect.value = '';
            matchTimeInput.value = '';
            deleteMatchButtonModal.style.display = 'none';
        }
        await populateCategorySelect(matchCategoryIdSelect);
        await populatePlayingDaysSelect(matchPlayingDaySelect);
        await populatePlacesSelect(matchPlaceSelect);
        openModal(matchModal);
    }
}

if (matchCategoryIdSelect) {
    matchCategoryIdSelect.addEventListener('change', async () => {
        if (matchCategoryIdSelect.value) {
            await populateGroupSelect(matchGroupIdSelect, matchCategoryIdSelect.value);
            // Clear teams when category changes
            matchTeam1IdSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchTeam2IdSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        } else {
            matchGroupIdSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
            matchTeam1IdSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>';
            matchTeam2IdSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>';
        }
    });
}

if (matchGroupIdSelect) {
    matchGroupIdSelect.addEventListener('change', async () => {
        if (matchCategoryIdSelect.value && matchGroupIdSelect.value) {
            await populateTeamsSelect(matchCategoryIdSelect.value, matchGroupIdSelect.value, matchTeam1IdSelect);
            await populateTeamsSelect(matchCategoryIdSelect.value, matchGroupIdSelect.value, matchTeam2IdSelect);
        } else {
            matchTeam1IdSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchTeam2IdSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        }
    });
}

if (matchForm) {
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = matchCategoryIdSelect.value;
        const groupId = matchGroupIdSelect.value;
        const team1Id = matchTeam1IdSelect.value;
        const team2Id = matchTeam2IdSelect.value;
        const playingDayId = matchPlayingDaySelect.value;
        const placeId = matchPlaceSelect.value;
        const time = matchTimeInput.value;

        // Basic validation
        if (!categoryId || !groupId || !team1Id || !team2Id || !playingDayId || !placeId || !time) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre zápas.');
            return;
        }

        if (team1Id === team2Id) {
            await showMessage('Chyba', 'Tímy nemôžu byť rovnaké!');
            return;
        }

        try {
            // Fetch team names
            const team1Doc = await getDoc(doc(clubsCollectionRef, team1Id));
            const team2Doc = await getDoc(doc(clubsCollectionRef, team2Id));
            const team1Name = team1Doc.exists() ? team1Doc.data().clubName : 'Neznámy tím 1';
            const team2Name = team2Doc.exists() ? team2Doc.data().clubName : 'Neznámy tím 2';

            // Fetch category, group, playing day, place names for display/info
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, playingDayId));
            const placeDoc = await getDoc(doc(placesCollectionRef, placeId));

            const categoryName = categoryDoc.exists() ? categoryDoc.data().name : 'Neznáma kategória';
            const groupName = groupDoc.exists() ? groupDoc.data().name : 'Neznáma skupina';
            const playingDayDate = playingDayDoc.exists() ? playingDayDoc.data().date : 'Neznámy dátum';
            const placeName = placeDoc.exists() ? placeDoc.data().name : 'Neznáme miesto';

            const matchData = {
                categoryId,
                categoryName,
                groupId,
                groupName,
                team1Id,
                team1Name,
                team2Id,
                team2Name,
                playingDayId,
                playingDayDate, // Store date for easier display
                placeId,
                placeName, // Store name for easier display
                time,
                score1: null, // Initially no score
                score2: null,
                matchStatus: 'scheduled' // e.g., scheduled, completed, cancelled
            };

            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
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

if (deleteMatchButtonModal) {
    deleteMatchButtonModal.addEventListener('click', async () => {
        if (currentMatchId) {
            const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať tento zápas?');
            if (confirmation) {
                try {
                    await deleteDoc(doc(matchesCollectionRef, currentMatchId));
                    await showMessage('Úspech', 'Zápas úspešne vymazaný!');
                    closeModal(matchModal);
                    await displayMatchesAsSchedule();
                    currentMatchId = null; // Reset
                } catch (error) {
                    console.error("Chyba pri vymazávaní zápasu:", error);
                    await showMessage('Chyba', `Chyba pri vymazávaní zápasu. Detail: ${error.message}`);
                }
            }
        }
    });
}


// --- Accommodation Assignment Logic ---

/**
 * Opens the accommodation assignment modal for adding or editing.
 * @param {string|null} docId The ID of the assignment document to edit, or null for a new one.
 * @param {object|null} data The data of the assignment to edit.
 */
async function openAssignAccommodationModal(docId = null, data = null) {
    currentAssignmentDocId = docId;
    if (assignAccommodationModalTitle && assignAccommodationTeamCategorySelect && assignAccommodationTeamGroupSelect && assignAccommodationTeamSelect && accommodationSelect && deleteAssignmentButtonModal) {
        const assignAccommodationModalTitle = document.getElementById('assignAccommodationModalTitle');
        if (docId && data) {
            assignAccommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';
            assignAccommodationTeamCategorySelect.value = data.categoryId;
            await populateGroupSelect(assignAccommodationTeamGroupSelect, data.categoryId, data.groupId);
            await populateTeamsSelect(data.categoryId, data.groupId, assignAccommodationTeamSelect, data.teamId, false);
            await populateAccommodationsSelect(accommodationSelect, data.accommodationId);
            deleteAssignmentButtonModal.style.display = 'inline-block';
        } else {
            assignAccommodationModalTitle.textContent = 'Priradiť ubytovanie tímu';
            assignAccommodationTeamCategorySelect.value = ''; // Reset to default
            assignAccommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>'; // Reset groups
            assignAccommodationTeamSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>'; // Reset teams
            accommodationSelect.value = '';
            deleteAssignmentButtonModal.style.display = 'none';
        }
        await populateCategorySelect(assignAccommodationTeamCategorySelect);
        await populateAccommodationsSelect(accommodationSelect);
        openModal(assignAccommodationModal);
    }
}

if (assignAccommodationTeamCategorySelect) {
    assignAccommodationTeamCategorySelect.addEventListener('change', async () => {
        if (assignAccommodationTeamCategorySelect.value) {
            await populateGroupSelect(assignAccommodationTeamGroupSelect, assignAccommodationTeamCategorySelect.value);
            // Clear teams when category changes
            assignAccommodationTeamSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        } else {
            assignAccommodationTeamGroupSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
            assignAccommodationTeamSelect.innerHTML = '<option value="">-- Vyberte skupinu a kategóriu --</option>';
        }
    });
}

if (assignAccommodationTeamGroupSelect) {
    assignAccommodationTeamGroupSelect.addEventListener('change', async () => {
        if (assignAccommodationTeamCategorySelect.value && assignAccommodationTeamGroupSelect.value) {
            await populateTeamsSelect(assignAccommodationTeamCategorySelect.value, assignAccommodationTeamGroupSelect.value, assignAccommodationTeamSelect, '', false);
        } else {
            assignAccommodationTeamSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        }
    });
}

if (assignAccommodationForm) {
    assignAccommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = assignAccommodationTeamCategorySelect.value;
        const groupId = assignAccommodationTeamGroupSelect.value;
        const teamId = assignAccommodationTeamSelect.value;
        const accommodationId = accommodationSelect.value;

        if (!categoryId || !groupId || !teamId || !accommodationId) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia pre priradenie ubytovania.');
            return;
        }

        try {
            const teamAccommodationsCollectionRef = collection(db, 'teamAccommodations');
            const batch = writeBatch(db);

            // Fetch names for storage
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const teamDoc = await getDoc(doc(clubsCollectionRef, teamId));
            const accommodationDoc = await getDoc(doc(collection(db, 'accommodations'), accommodationId));

            if (!categoryDoc.exists() || !groupDoc.exists() || !teamDoc.exists() || !accommodationDoc.exists()) {
                await showMessage('Chyba', 'Jedna z vybraných entít nebola nájdená. Skúste to znova.');
                return;
            }

            const categoryName = categoryDoc.data().name;
            const groupName = groupDoc.data().name;
            const teamName = teamDoc.data().clubName;
            const accommodationName = accommodationDoc.data().name;
            const accommodationCapacity = accommodationDoc.data().capacity;

            // Check if team is already assigned
            const existingAssignmentQuery = query(teamAccommodationsCollectionRef, where('teamId', '==', teamId));
            const existingAssignmentSnapshot = await getDocs(existingAssignmentQuery);

            if (!existingAssignmentSnapshot.empty && existingAssignmentSnapshot.docs[0].id !== currentAssignmentDocId) {
                await showMessage('Chyba', `Tím "${teamName}" je už priradený k ubytovaniu!`);
                return;
            }

            // Check accommodation capacity
            const assignedTeamsQuery = query(teamAccommodationsCollectionRef, where('accommodationId', '==', accommodationId));
            const assignedTeamsSnapshot = await getDocs(assignedTeamsQuery);
            const currentAssignedCount = assignedTeamsSnapshot.docs.length;

            if (currentAssignmentDocId) { // Editing existing assignment
                const oldAssignmentDoc = await getDoc(doc(teamAccommodationsCollectionRef, currentAssignmentDocId));
                if (oldAssignmentDoc.exists() && oldAssignmentDoc.data().accommodationId !== accommodationId) {
                    // If accommodation changed, we need to re-check capacity
                    if (currentAssignedCount >= accommodationCapacity) {
                        await showMessage('Chyba', `Ubytovňa "${accommodationName}" je plne obsadená (${currentAssignedCount}/${accommodationCapacity})!`);
                        return;
                    }
                }
            } else { // New assignment
                if (currentAssignedCount >= accommodationCapacity) {
                    await showMessage('Chyba', `Ubytovňa "${accommodationName}" je plne obsadená (${currentAssignedCount}/${accommodationCapacity})!`);
                    return;
                }
            }

            const assignmentData = {
                categoryId,
                categoryName,
                groupId,
                groupName,
                teamId,
                teamName,
                accommodationId,
                accommodationName,
                assignedAt: new Date()
            };

            if (currentAssignmentDocId) {
                batch.set(doc(teamAccommodationsCollectionRef, currentAssignmentDocId), assignmentData, { merge: true });
                await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
            } else {
                batch.add(teamAccommodationsCollectionRef, assignmentData);
                await showMessage('Úspech', 'Priradenie ubytovania úspešne pridané!');
            }

            await batch.commit();
            closeModal(assignAccommodationModal);
            await displayAccommodations(); // Refresh display
        } catch (error) {
            console.error("Chyba pri ukladaní priradenia ubytovania:", error);
            await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
        }
    });
}

if (deleteAssignmentButtonModal) {
    deleteAssignmentButtonModal.addEventListener('click', async () => {
        if (currentAssignmentDocId) {
            const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto priradenie ubytovania?');
            if (confirmation) {
                try {
                    const teamAccommodationsCollectionRef = collection(db, 'teamAccommodations');
                    await deleteDoc(doc(teamAccommodationsCollectionRef, currentAssignmentDocId));
                    await showMessage('Úspech', 'Priradenie ubytovania úspešne vymazané!');
                    closeModal(assignAccommodationModal);
                    await displayAccommodations(); // Refresh display
                    currentAssignmentDocId = null; // Reset
                } catch (error) {
                    console.error("Chyba pri vymazávaní priradenia ubytovania:", error);
                    await showMessage('Chyba', `Chyba pri vymazávaní priradenia ubytovania. Detail: ${error.message}`);
                }
            }
        }
    });
}


// --- Display Functions ---

/**
 * Displays playing days and places in their respective lists.
 */
async function displayPlayingDaysAndPlaces() {
    if (playingDaysListDiv) {
        playingDaysListDiv.innerHTML = '<h3>Hracie dni</h3>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            if (querySnapshot.empty) {
                playingDaysListDiv.innerHTML += '<p>Žiadne hracie dni zatiaľ neboli pridané.</p>';
            } else {
                const ul = document.createElement('ul');
                ul.className = 'list-items';
                querySnapshot.forEach((doc) => {
                    const day = doc.data();
                    const li = document.createElement('li');
                    const dateObj = new Date(day.date);
                    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                    li.innerHTML = `<span>${formattedDate}</span>
                                    <div class="actions">
                                        <button class="action-button edit-button" data-id="${doc.id}" data-date="${day.date}">Upraviť</button>
                                        <button class="action-button delete-button" data-id="${doc.id}">Vymazať</button>
                                    </div>`;
                    ul.appendChild(li);
                });
                playingDaysListDiv.appendChild(ul);

                ul.querySelectorAll('.edit-button').forEach(button => {
                    button.addEventListener('click', () => openPlayingDayModal(button.dataset.id, { date: button.dataset.date }));
                });
                ul.querySelectorAll('.delete-button').forEach(button => {
                    button.addEventListener('click', () => deletePlayingDay(button.dataset.id));
                });
            }
        } catch (error) {
            console.error("Chyba pri zobrazovaní hracích dní:", error);
            playingDaysListDiv.innerHTML += '<p>Chyba pri načítaní hracích dní.</p>';
        }
    }

    if (placesListDiv) {
        placesListDiv.innerHTML = '<h3>Miesta konania</h3>';
        try {
            const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
            if (querySnapshot.empty) {
                placesListDiv.innerHTML += '<p>Žiadne miesta zatiaľ neboli pridané.</p>';
            } else {
                const ul = document.createElement('ul');
                ul.className = 'list-items';
                querySnapshot.forEach((doc) => {
                    const place = doc.data();
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${place.name}</span>
                                    <div class="actions">
                                        <button class="action-button edit-button" data-id="${doc.id}" data-name="${place.name}">Upraviť</button>
                                        <button class="action-button delete-button" data-id="${doc.id}">Vymazať</button>
                                    </div>`;
                    ul.appendChild(li);
                });
                placesListDiv.appendChild(ul);

                ul.querySelectorAll('.edit-button').forEach(button => {
                    button.addEventListener('click', () => openPlaceModal(button.dataset.id, { name: button.dataset.name }));
                });
                ul.querySelectorAll('.delete-button').forEach(button => {
                    button.addEventListener('click', () => deletePlace(button.dataset.id));
                });
            }
        } catch (error) {
            console.error("Chyba pri zobrazovaní miest:", error);
            placesListDiv.innerHTML += '<p>Chyba pri načítaní miest.</p>';
        }
    }
}

/**
 * Displays accommodations and their assignments.
 */
async function displayAccommodations() {
    const accommodationsListDiv = document.getElementById('accommodationsList');
    if (!accommodationsListDiv) return;

    accommodationsListDiv.innerHTML = '<h3>Ubytovanie</h3>';
    try {
        const accommodationsCollectionRef = collection(db, 'accommodations');
        const assignmentsCollectionRef = collection(db, 'teamAccommodations');

        const accommodationsSnapshot = await getDocs(query(accommodationsCollectionRef, orderBy("name", "asc")));
        const assignmentsSnapshot = await getDocs(assignmentsCollectionRef);

        const assignmentsMap = new Map();
        assignmentsSnapshot.forEach(doc => {
            const assignment = doc.data();
            if (!assignmentsMap.has(assignment.accommodationId)) {
                assignmentsMap.set(assignment.accommodationId, []);
            }
            assignmentsMap.get(assignment.accommodationId).push({ id: doc.id, ...assignment });
        });

        if (accommodationsSnapshot.empty) {
            accommodationsListDiv.innerHTML += '<p>Žiadne ubytovne zatiaľ neboli pridané.</p>';
        } else {
            const ul = document.createElement('ul');
            ul.className = 'list-items';
            accommodationsSnapshot.forEach((doc) => {
                const accommodation = doc.data();
                const assignedTeams = assignmentsMap.get(doc.id) || [];
                const capacityInfo = `(${assignedTeams.length}/${accommodation.capacity})`;
                const teamsList = assignedTeams.map(assignment => `<li>${assignment.teamName} (${assignment.categoryName} - ${assignment.groupName}) <button class="action-button delete-assignment-button" data-id="${assignment.id}" title="Vymazať priradenie">x</button></li>`).join('');

                const li = document.createElement('li');
                li.innerHTML = `<span>${accommodation.name} ${capacityInfo}</span>
                                <div class="actions">
                                    <button class="action-button edit-button" data-id="${doc.id}" data-name="${accommodation.name}" data-capacity="${accommodation.capacity}">Upraviť</button>
                                    <button class="action-button delete-button" data-id="${doc.id}">Vymazať</button>
                                </div>
                                <div class="assigned-teams">
                                    <h4>Priradené tímy:</h4>
                                    ${assignedTeams.length > 0 ? `<ul>${teamsList}</ul>` : '<p>Zatiaľ žiadne tímy.</p>'}
                                    <button class="action-button assign-button" data-accommodation-id="${doc.id}" data-accommodation-name="${accommodation.name}">Priradiť tím</button>
                                </div>`;
                ul.appendChild(li);
            });
            accommodationsListDiv.appendChild(ul);

            ul.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', () => openAccommodationModal(button.dataset.id, { name: button.dataset.name, capacity: parseInt(button.dataset.capacity, 10) }));
            });
            ul.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', () => deleteAccommodation(button.dataset.id));
            });
            ul.querySelectorAll('.assign-button').forEach(button => {
                button.addEventListener('click', () => {
                    openAssignAccommodationModal(null, { accommodationId: button.dataset.accommodationId, accommodationName: button.dataset.accommodationName });
                });
            });
            ul.querySelectorAll('.delete-assignment-button').forEach(button => {
                button.addEventListener('click', async () => {
                    const assignmentId = button.dataset.id;
                    const confirmation = await showConfirmation('Potvrdenie', 'Naozaj chcete vymazať toto priradenie tímu k ubytovaniu?');
                    if (confirmation) {
                        try {
                            const teamAccommodationsCollectionRef = collection(db, 'teamAccommodations');
                            await deleteDoc(doc(teamAccommodationsCollectionRef, assignmentId));
                            await showMessage('Úspech', 'Priradenie tímu úspešne vymazané!');
                            await displayAccommodations(); // Refresh display
                        } catch (error) {
                            console.error("Chyba pri vymazávaní priradenia tímu:", error);
                            await showMessage('Chyba', `Chyba pri vymazávaní priradenia tímu. Detail: ${error.message}`);
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.error("Chyba pri zobrazovaní ubytovania:", error);
        accommodationsListDiv.innerHTML += '<p>Chyba pri načítaní ubytovania.</p>';
    }
}


/**
 * Displays matches grouped by playing day and place as a schedule.
 */
async function displayMatchesAsSchedule() {
    if (!matchesScheduleDiv) return;

    matchesScheduleDiv.innerHTML = '<h3>Rozpis zápasov</h3>';

    try {
        // Fetch all categories, groups, teams, playing days, places
        const [categoriesSnapshot, groupsSnapshot, clubsSnapshot, playingDaysSnapshot, placesSnapshot, settingsDoc] = await Promise.all([
            getDocs(categoriesCollectionRef),
            getDocs(groupsCollectionRef),
            getDocs(clubsCollectionRef),
            getDocs(query(playingDaysCollectionRef, orderBy("date", "asc"))),
            getDocs(query(placesCollectionRef, orderBy("name", "asc"))),
            getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID))
        ]);

        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name));
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name));
        const clubsMap = new Map();
        clubsSnapshot.forEach(doc => clubsMap.set(doc.id, doc.data().clubName));
        const playingDaysMap = new Map();
        playingDaysSnapshot.forEach(doc => playingDaysMap.set(doc.id, { id: doc.id, date: doc.data().date }));
        const placesMap = new Map();
        placesSnapshot.forEach(doc => placesMap.set(doc.id, doc.data().name));

        const categoryMatchSettings = settingsDoc.exists() ? settingsDoc.data().categoryMatchSettings || {} : {};
        const firstDayStartTime = settingsDoc.exists() && settingsDoc.data().firstDayStartTime ? settingsDoc.data().firstDayStartTime : '08:00';
        const otherDaysStartTime = settingsDoc.exists() && settingsDoc.data().otherDaysStartTime ? settingsDoc.data().otherDaysStartTime : '09:00';


        // Apply filters
        let matchesQuery = query(matchesCollectionRef, orderBy("playingDayDate", "asc"), orderBy("time", "asc"));

        const filterPlayingDay = filterPlayingDaySelect.value;
        const filterPlace = filterPlaceSelect.value;
        const filterCategory = filterCategorySelect.value;
        const filterGroup = filterGroupSelect.value;

        if (filterPlayingDay) {
            matchesQuery = query(matchesQuery, where('playingDayId', '==', filterPlayingDay));
        }
        if (filterPlace) {
            matchesQuery = query(matchesQuery, where('placeId', '==', filterPlace));
        }
        if (filterCategory) {
            matchesQuery = query(matchesQuery, where('categoryId', '==', filterCategory));
        }
        if (filterGroup) {
            matchesQuery = query(matchesQuery, where('groupId', '==', filterGroup));
        }

        const matchesSnapshot = await getDocs(matchesQuery);

        if (matchesSnapshot.empty) {
            matchesScheduleDiv.innerHTML += '<p>Žiadne zápasy neboli nájdené pre zvolené filtre.</p>';
            await populatePlayingDaysSelect(filterPlayingDaySelect);
            await populatePlacesSelect(filterPlaceSelect);
            await populateCategorySelect(filterCategorySelect);
            if (filterCategorySelect.value) {
                await populateGroupSelect(filterGroupSelect, filterCategorySelect.value);
            } else {
                 filterGroupSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
            }
            return;
        }

        const matchesByDayAndPlace = new Map();
        matchesSnapshot.forEach(doc => {
            const match = { id: doc.id, ...doc.data() };
            const dayKey = match.playingDayId;
            const placeKey = match.placeId;

            if (!matchesByDayAndPlace.has(dayKey)) {
                matchesByDayAndPlace.set(dayKey, new Map());
            }
            if (!matchesByDayAndPlace.get(dayKey).has(placeKey)) {
                matchesByDayAndPlace.get(dayKey).set(placeKey, []);
            }
            matchesByDayAndPlace.get(dayKey).get(placeKey).push(match);
        });

        // Sort playing days
        const sortedPlayingDays = Array.from(playingDaysMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Generate schedule HTML
        const scheduleHTML = document.createElement('div');
        scheduleHTML.className = 'schedule-container';

        for (const playingDay of sortedPlayingDays) {
            const playingDayMatches = matchesByDayAndPlace.get(playingDay.id);
            if (!playingDayMatches) continue;

            const dayDate = new Date(playingDay.date);
            const formattedDayDate = `${String(dayDate.getDate()).padStart(2, '0')}. ${String(dayDate.getMonth() + 1).padStart(2, '0')}. ${dayDate.getFullYear()}`;

            const dayGroup = document.createElement('div');
            dayGroup.className = 'date-group';
            dayGroup.setAttribute('data-playing-day-id', playingDay.id); // For drag and drop target

            dayGroup.innerHTML = `<h3>${formattedDayDate}</h3>`;

            // Sort places for consistent display
            const sortedPlaces = Array.from(placesMap.values()).sort();

            for (const placeName of sortedPlaces) {
                const placeId = [...placesMap.entries()].find(([id, name]) => name === placeName)?.[0];
                const placeMatches = playingDayMatches.get(placeId);

                if (!placeMatches || placeMatches.length === 0) continue;

                // Sort matches by time
                placeMatches.sort((a, b) => a.time.localeCompare(b.time));

                const placeSection = document.createElement('div');
                placeSection.className = 'place-section';
                placeSection.setAttribute('data-place-id', placeId); // For drag and drop target

                placeSection.innerHTML = `<h4>${placeName}</h4>`;
                const table = document.createElement('table');
                table.className = 'data-table';
                table.innerHTML = `<thead>
                                        <tr>
                                            <th>Čas</th>
                                            <th>Kategória</th>
                                            <th>Skupina</th>
                                            <th>Tím 1</th>
                                            <th>Tím 2</th>
                                            <th>Skóre</th>
                                            <th></th> <!-- Actions -->
                                        </tr>
                                   </thead>
                                   <tbody></tbody>`;
                const tbody = table.querySelector('tbody');

                let lastMatchEndTime = null;

                for (const match of placeMatches) {
                    const tr = document.createElement('tr');
                    tr.className = 'match-row';
                    tr.draggable = true;
                    tr.dataset.matchId = match.id;
                    tr.dataset.playingDayId = match.playingDayId;
                    tr.dataset.placeId = match.placeId;

                    const categorySettings = categoryMatchSettings[match.categoryId] || {};
                    const matchDuration = categorySettings.duration || 20; // Default 20 mins
                    const bufferTime = categorySettings.bufferTime || 5; // Default 5 mins
                    // Retrieve category color, default to empty string if not defined
                    const categoryColor = categorySettings.color || '';

                    let startTime = match.time;
                    if (lastMatchEndTime) {
                        const previousEndTime = new Date(`2000/01/01 ${lastMatchEndTime}`);
                        const currentMatchStartTime = new Date(`2000/01/01 ${match.time}`);

                        // If the current match time is earlier than or equal to the previous end time + buffer,
                        // adjust it. This handles initial loads and ensures visual continuity.
                        if (currentMatchStartTime <= new Date(previousEndTime.getTime() + bufferTime * 60 * 1000)) {
                            const newStartTime = new Date(previousEndTime.getTime() + bufferTime * 60 * 1000);
                            startTime = newStartTime.toTimeString().substring(0, 5);
                        }
                    }

                    const matchEndTime = new Date(`2000/01/01 ${startTime}`);
                    matchEndTime.setMinutes(matchEndTime.getMinutes() + matchDuration);
                    lastMatchEndTime = matchEndTime.toTimeString().substring(0, 5);

                    const formattedScore = match.score1 !== null && match.score2 !== null ? `${match.score1}:${match.score2}` : '-:-';

                    tr.innerHTML = `<td>${startTime} - ${lastMatchEndTime}</td>
                                    <td style="background-color: ${categoryColor};">${match.categoryName}</td>
                                    <td>${match.groupName}</td>
                                    <td style="background-color: ${categoryColor};">${match.team1Name}</td>
                                    <td style="background-color: ${categoryColor};">${match.team2Name}</td>
                                    <td>${formattedScore}</td>
                                    <td>
                                        <button class="action-button edit-match-button" data-id="${match.id}">Upraviť</button>
                                    </td>`;
                    tbody.appendChild(tr);
                }
                placeSection.appendChild(table);
                dayGroup.appendChild(placeSection);
            }
            scheduleHTML.appendChild(dayGroup);
        }

        matchesScheduleDiv.appendChild(scheduleHTML);

        // Add event listeners for editing matches
        scheduleHTML.querySelectorAll('.edit-match-button').forEach(button => {
            button.addEventListener('click', async () => {
                const matchId = button.dataset.id;
                const matchDoc = await getDoc(doc(matchesCollectionRef, matchId));
                if (matchDoc.exists()) {
                    openMatchModal(matchId, matchDoc.data());
                }
            });
        });

        // Add drag and drop listeners
        addDragAndDropListeners();

    } catch (error) {
        console.error("Chyba pri zobrazovaní rozpisu zápasov:", error);
        matchesScheduleDiv.innerHTML += '<p>Chyba pri načítaní rozpisu zápasov.</p>';
    }

    // Populate filter selects
    await populatePlayingDaysSelect(filterPlayingDaySelect, filterPlayingDaySelect.value);
    await populatePlacesSelect(filterPlaceSelect, filterPlaceSelect.value);
    await populateCategorySelect(filterCategorySelect, filterCategorySelect.value);
    if (filterCategorySelect.value) {
        await populateGroupSelect(filterGroupSelect, filterCategorySelect.value, filterGroupSelect.value);
    } else {
        filterGroupSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    }
}

// --- Drag and Drop Logic ---
let draggedMatch = null;

function addDragAndDropListeners() {
    document.querySelectorAll('.match-row').forEach(row => {
        row.addEventListener('dragstart', (e) => {
            draggedMatch = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedMatch.dataset.matchId);
            setTimeout(() => {
                draggedMatch.classList.add('dragging');
            }, 0);
        });

        row.addEventListener('dragend', () => {
            if (draggedMatch) {
                draggedMatch.classList.remove('dragging');
            }
            draggedMatch = null;
        });
    });

    document.querySelectorAll('.date-group, .place-section').forEach(dropTarget => {
        dropTarget.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropTarget.classList.add('drop-target-active');
        });

        dropTarget.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        dropTarget.addEventListener('dragleave', (e) => {
            dropTarget.classList.remove('drop-target-active');
        });

        dropTarget.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropTarget.classList.remove('drop-target-active');

            if (!draggedMatch) return;

            const matchId = draggedMatch.dataset.matchId;
            let newPlayingDayId = dropTarget.dataset.playingDayId || draggedMatch.dataset.playingDayId;
            let newPlaceId = dropTarget.dataset.placeId || draggedMatch.dataset.placeId;

            // If dropping on a date-group, inherit its playingDayId and keep original placeId
            if (dropTarget.classList.contains('date-group')) {
                newPlayingDayId = dropTarget.dataset.playingDayId;
            }
            // If dropping on a place-section, inherit both its playingDayId (from parent) and placeId
            else if (dropTarget.classList.contains('place-section')) {
                newPlaceId = dropTarget.dataset.placeId;
                const parentDayGroup = dropTarget.closest('.date-group');
                if (parentDayGroup) {
                    newPlayingDayId = parentDayGroup.dataset.playingDayId;
                }
            }


            // Update match in Firestore
            try {
                const matchRef = doc(matchesCollectionRef, matchId);
                await updateDoc(matchRef, {
                    playingDayId: newPlayingDayId,
                    placeId: newPlaceId
                });
                await showMessage('Úspech', 'Zápas úspešne presunutý!');
                await displayMatchesAsSchedule(); // Re-render to reflect changes
            } catch (error) {
                console.error("Chyba pri presúvaní zápasu:", error);
                await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}`);
            } finally {
                draggedMatch = null;
            }
        });
    });
}


// --- Filter Event Listeners ---
if (filterPlayingDaySelect) {
    filterPlayingDaySelect.addEventListener('change', displayMatchesAsSchedule);
}
if (filterPlaceSelect) {
    filterPlaceSelect.addEventListener('change', displayMatchesAsSchedule);
}
if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', async () => {
        if (filterCategorySelect.value) {
            await populateGroupSelect(filterGroupSelect, filterCategorySelect.value);
        } else {
            filterGroupSelect.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
        }
        displayMatchesAsSchedule();
    });
}
if (filterGroupSelect) {
    filterGroupSelect.addEventListener('change', displayMatchesAsSchedule);
}
if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', async () => {
        filterPlayingDaySelect.value = '';
        filterPlaceSelect.value = '';
        filterCategorySelect.value = '';
        filterGroupSelect.value = '';
        await populateGroupSelect(filterGroupSelect, '', ''); // Clear group select
        displayMatchesAsSchedule();
    });
}


// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    await displayPlayingDaysAndPlaces();
    await displayAccommodations();
    await displayMatchesAsSchedule(); // Initial load of matches

    // Add event listener for the "Assign Accommodation" button (newly added)
    const assignAccommodationNewButton = document.getElementById('assignAccommodationNewButton');
    if (assignAccommodationNewButton) {
        assignAccommodationNewButton.addEventListener('click', () => openAssignAccommodationModal());
    }
});
