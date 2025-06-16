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
        console.error("Error populating playing days:", error);
        await showMessage('Chyba', 'Chyba pri načítaní hracích dní.');
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
        console.error("Error populating places:", error);
        await showMessage('Chyba', 'Chyba pri načítaní miest.');
    }
}

/**
 * Populates a select element with teams for a given category and group.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} categoryId The ID of the selected category.
 * @param {string} groupId The ID of the selected group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamSelect(selectElement, categoryId, groupId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!categoryId || !groupId) {
        return;
    }
    try {
        const q = query(clubsCollectionRef, where("categoryId", "==", categoryId), where("groupId", "==", groupId), orderBy("orderInGroup", "asc"));
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
        console.error("Error populating teams:", error);
        await showMessage('Chyba', 'Chyba pri načítaní tímov.');
    }
}

/**
 * Populates a select element with teams for a given category and group.
 * This is used for match assignments.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} categoryId The ID of the selected category.
 * @param {string} groupId The ID of the selected group.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateTeamSelectForAssignment(selectElement, categoryId, groupId, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
    if (!categoryId || !groupId) {
        return;
    }
    try {
        const q = query(clubsCollectionRef, where("categoryId", "==", categoryId), where("groupId", "==", groupId), orderBy("orderInGroup", "asc"));
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
        console.error("Error populating teams for assignment:", error);
        await showMessage('Chyba', 'Chyba pri načítaní tímov pre priradenie.');
    }
}

/**
 * Populates a select element with available unassigned clubs.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedClubId=''] The ID of the club to pre-select.
 */
async function populateUnassignedClubsSelect(selectElement, selectedClubId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte klub --</option>';
    try {
        const q = query(clubsCollectionRef, where("accommodation", "==", "unassigned"));
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
        console.error("Error populating unassigned clubs:", error);
        await showMessage('Chyba', 'Chyba pri načítaní nepriradených klubov.');
    }
}

/**
 * Populates a select element with accommodation places.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodation=''] The accommodation to pre-select.
 */
async function populateAccommodationSelect(selectElement, selectedAccommodation = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    const accommodationPlaces = ["Ubytovňa A", "Ubytovňa B", "Hotel C"]; // Example static list
    accommodationPlaces.forEach(place => {
        const option = document.createElement('option');
        option.value = place;
        option.textContent = place;
        selectElement.appendChild(option);
    });
    if (selectedAccommodation) {
        selectElement.value = selectedAccommodation;
    }
}


// --- DOM Elements ---
const mainContent = document.querySelector('main');
const playingDaysList = document.getElementById('playingDaysList');
const placesList = document.getElementById('placesList');
const matchScheduleDiv = document.getElementById('matchSchedule');
const addOptionsDropdown = document.getElementById('addOptions');

const playingDayModal = document.getElementById('playingDayModal');
const playingDayForm = document.getElementById('playingDayForm');
const playingDayModalCloseBtn = playingDayModal ? playingDayModal.querySelector('.close') : null;

const placeModal = document.getElementById('placeModal');
const placeForm = document.getElementById('placeForm');
const placeModalCloseBtn = placeModal ? placeModal.querySelector('.close') : null;

const matchModal = document.getElementById('matchModal');
const matchForm = document.getElementById('matchForm');
const matchModalCloseBtn = matchModal ? matchModal.querySelector('.close') : null;

const accommodationAssignmentModal = document.getElementById('accommodationAssignmentModal');
const accommodationAssignmentForm = document.getElementById('accommodationAssignmentForm');
const accommodationAssignmentModalCloseBtn = accommodationAssignmentModal ? accommodationAssignmentModal.querySelector('.close') : null;

let allCategories = [];
let allGroups = [];
let allTeams = [];
let allPlayingDays = [];
let allPlaces = [];
let allMatches = [];
let categoryMatchSettings = {};
let tournamentSettings = {};


// --- Modals related logic (re-using spravca-turnaja-common.js functions) ---

let currentPlayingDayModalMode = 'add';
let editingPlayingDayId = null;

let currentPlaceModalMode = 'add';
let editingPlaceId = null;

let currentMatchModalMode = 'add';
let editingMatchId = null;

let currentAccommodationAssignmentMode = 'add';
let editingAccommodationAssignmentId = null;

/**
 * Opens the playing day modal for adding or editing.
 * @param {string|null} playingDayId - ID of the playing day if editing.
 * @param {object|null} playingDayData - Data of the playing day if editing.
 */
async function openPlayingDayModal(playingDayId = null, playingDayData = null) {
    if (!playingDayModal) return;

    currentPlayingDayModalMode = playingDayId ? 'edit' : 'add';
    editingPlayingDayId = playingDayId;

    document.getElementById('playingDayModalTitle').textContent = playingDayId ? 'Upraviť hrací deň' : 'Pridať hrací deň';
    document.getElementById('playingDayId').value = playingDayId || '';
    document.getElementById('playingDayDate').value = playingDayData ? playingDayData.date : '';

    openModal(playingDayModal);
}

/**
 * Resets the playing day form.
 */
function resetPlayingDayModal() {
    if (playingDayForm) {
        playingDayForm.reset();
        document.getElementById('playingDayId').value = '';
    }
    currentPlayingDayModalMode = 'add';
    editingPlayingDayId = null;
}

/**
 * Opens the place modal for adding or editing.
 * @param {string|null} placeId - ID of the place if editing.
 * @param {object|null} placeData - Data of the place if editing.
 */
async function openPlaceModal(placeId = null, placeData = null) {
    if (!placeModal) return;

    currentPlaceModalMode = placeId ? 'edit' : 'add';
    editingPlaceId = placeId;

    document.getElementById('placeModalTitle').textContent = placeId ? 'Upraviť miesto' : 'Pridať miesto';
    document.getElementById('placeId').value = placeId || '';
    document.getElementById('placeName').value = placeData ? placeData.name : '';
    document.getElementById('placeAddress').value = placeData ? placeData.address : '';
    document.getElementById('placeDescription').value = placeData ? placeData.description : '';

    openModal(placeModal);
}

/**
 * Resets the place form.
 */
function resetPlaceModal() {
    if (placeForm) {
        placeForm.reset();
        document.getElementById('placeId').value = '';
    }
    currentPlaceModalMode = 'add';
    editingPlaceId = null;
}


/**
 * Opens the match modal for adding or editing.
 * @param {string|null} matchId - ID of the match if editing.
 * @param {object|null} matchData - Data of the match if editing.
 */
async function openMatchModal(matchId = null, matchData = null) {
    if (!matchModal) return;

    currentMatchModalMode = matchId ? 'edit' : 'add';
    editingMatchId = matchId;

    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
    const matchPlaceSelect = document.getElementById('matchPlaceSelect');
    const matchCategorySelect = document.getElementById('matchCategorySelect');
    const matchGroupSelect = document.getElementById('matchGroupSelect');
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    const matchTimeInput = document.getElementById('matchTime');
    const matchOrderInput = document.getElementById('matchOrder');


    matchModalTitle.textContent = matchId ? 'Upraviť zápas' : 'Pridať zápas';
    document.getElementById('matchId').value = matchId || '';

    await populatePlayingDaysSelect(matchPlayingDaySelect, matchData ? matchData.playingDayId : '');
    await populatePlacesSelect(matchPlaceSelect, matchData ? matchData.placeId : '');
    await populateCategorySelect(matchCategorySelect, matchData ? matchData.categoryId : '');

    // Populate group and teams after category is selected
    if (matchData && matchData.categoryId) {
        await populateGroupSelect(matchGroupSelect, matchData.categoryId, matchData.groupId);
        if (matchData.groupId) {
            await populateTeamSelect(team1Select, matchData.categoryId, matchData.groupId, matchData.team1Id);
            await populateTeamSelect(team2Select, matchData.categoryId, matchData.groupId, matchData.team2Id);
        }
    } else {
        // Clear group and team selects if no category is selected
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        team1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
    }

    matchTimeInput.value = matchData ? matchData.time : '';
    matchOrderInput.value = matchData ? matchData.order : '';

    openModal(matchModal);

    // Add event listeners for dynamic updates
    matchCategorySelect.onchange = async () => {
        const selectedCategoryId = matchCategorySelect.value;
        await populateGroupSelect(matchGroupSelect, selectedCategoryId);
        matchGroupSelect.value = ''; // Reset group selection
        team1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
    };

    matchGroupSelect.onchange = async () => {
        const selectedCategoryId = matchCategorySelect.value;
        const selectedGroupId = matchGroupSelect.value;
        await populateTeamSelect(team1Select, selectedCategoryId, selectedGroupId);
        await populateTeamSelect(team2Select, selectedCategoryId, selectedGroupId);
    };
}

/**
 * Resets the match form.
 */
function resetMatchModal() {
    if (matchForm) {
        matchForm.reset();
        document.getElementById('matchId').value = '';
    }
    currentMatchModalMode = 'add';
    editingMatchId = null;
    // Clear dynamic selects
    document.getElementById('matchCategorySelect').innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    document.getElementById('matchGroupSelect').innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    document.getElementById('team1Select').innerHTML = '<option value="">-- Vyberte tím --</option>';
    document.getElementById('team2Select').innerHTML = '<option value="">-- Vyberte tím --</option>';
}

/**
 * Opens the accommodation assignment modal for adding or editing.
 * @param {string|null} assignmentId - ID of the assignment if editing.
 * @param {object|null} assignmentData - Data of the assignment if editing.
 */
async function openAccommodationAssignmentModal(assignmentId = null, assignmentData = null) {
    if (!accommodationAssignmentModal) return;

    currentAccommodationAssignmentMode = assignmentId ? 'edit' : 'add';
    editingAccommodationAssignmentId = assignmentId;

    const assignModalTitle = document.getElementById('accommodationAssignmentModalTitle');
    const assignCategorySelect = document.getElementById('assignCategorySelect');
    const assignGroupSelect = document.getElementById('assignGroupSelect');
    const assignTeamSelect = document.getElementById('assignTeamSelect');
    const unassignedClubSelect = document.getElementById('unassignedClubSelect');
    const accommodationSelect = document.getElementById('accommodationSelect');
    const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

    assignModalTitle.textContent = assignmentId ? 'Upraviť priradenie ubytovania' : 'Priradiť ubytovanie';
    document.getElementById('assignmentId').value = assignmentId || '';

    // Show/hide specific fields based on mode
    if (currentAccommodationAssignmentMode === 'edit' && assignmentData) {
        document.getElementById('teamSelectionFields').style.display = 'block';
        document.getElementById('unassignedClubField').style.display = 'none';
        deleteAssignmentButtonModal.style.display = 'block';
        deleteAssignmentButtonModal.onclick = async () => {
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať toto priradenie ubytovania?');
            if (confirmed) {
                await deleteAccommodationAssignment(assignmentId, assignmentData.categoryId, assignmentData.groupId, assignmentData.teamId, assignmentData.accommodation);
            }
        };

        await populateCategorySelect(assignCategorySelect, assignmentData.categoryId);
        if (assignmentData.categoryId) {
            await populateGroupSelect(assignGroupSelect, assignmentData.categoryId, assignmentData.groupId);
            if (assignmentData.groupId) {
                await populateTeamSelectForAssignment(assignTeamSelect, assignmentData.categoryId, assignmentData.groupId, assignmentData.teamId);
            }
        }
        await populateAccommodationSelect(accommodationSelect, assignmentData.accommodation);

        // Disable selects if a team is already assigned
        assignCategorySelect.disabled = true;
        assignGroupSelect.disabled = true;
        assignTeamSelect.disabled = true;

    } else { // Add mode
        document.getElementById('teamSelectionFields').style.display = 'none';
        document.getElementById('unassignedClubField').style.display = 'block';
        deleteAssignmentButtonModal.style.display = 'none';

        await populateUnassignedClubsSelect(unassignedClubSelect);
        await populateAccommodationSelect(accommodationSelect);

        // Ensure selects are enabled for add mode
        assignCategorySelect.disabled = false;
        assignGroupSelect.disabled = false;
        assignTeamSelect.disabled = false;
    }

    openModal(accommodationAssignmentModal);
}

/**
 * Resets the accommodation assignment form.
 */
function resetAccommodationAssignmentModal() {
    if (accommodationAssignmentForm) {
        accommodationAssignmentForm.reset();
        document.getElementById('assignmentId').value = '';
    }
    currentAccommodationAssignmentMode = 'add';
    editingAccommodationAssignmentId = null;
    // Clear dynamic selects
    document.getElementById('assignCategorySelect').innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
    document.getElementById('assignGroupSelect').innerHTML = '<option value="">-- Vyberte skupinu --</option>';
    document.getElementById('assignTeamSelect').innerHTML = '<option value="">-- Vyberte tím (nepovinné) --</option>';
    document.getElementById('unassignedClubSelect').innerHTML = '<option value="">-- Vyberte klub --</option>';
    document.getElementById('accommodationSelect').innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';

    document.getElementById('teamSelectionFields').style.display = 'none';
    document.getElementById('unassignedClubField').style.display = 'block';
    document.getElementById('deleteAssignmentButtonModal').style.display = 'none';
}


// --- Display Functions ---

/**
 * Loads all necessary data from Firestore.
 */
async function loadAllData() {
    try {
        const [categoriesSnapshot, groupsSnapshot, clubsSnapshot, playingDaysSnapshot, placesSnapshot, matchesSnapshot, settingsSnapshot] = await Promise.all([
            getDocs(query(categoriesCollectionRef, orderBy('name', 'asc'))),
            getDocs(query(groupsCollectionRef, orderBy('categoryId', 'asc'), orderBy('name', 'asc'))),
            getDocs(query(clubsCollectionRef, orderBy('name', 'asc'))),
            getDocs(query(playingDaysCollectionRef, orderBy('date', 'asc'))),
            getDocs(query(placesCollectionRef, orderBy('name', 'asc'))),
            getDocs(query(matchesCollectionRef, orderBy('playingDayId', 'asc'), orderBy('time', 'asc'), orderBy('order', 'asc'))),
            getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID))
        ]);

        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Log category colors
        console.log("Colors for Categories:");
        allCategories.forEach(category => {
            console.log(`Category ID: ${category.id}, Name: ${category.name}, Color: ${category.color || 'N/A'}`);
        });

        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allTeams = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allPlayingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allPlaces = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (settingsSnapshot.exists()) {
            tournamentSettings = settingsSnapshot.data();
            categoryMatchSettings = tournamentSettings.categoryMatchSettings || {};
        }

    } catch (error) {
        console.error("Error loading all data:", error);
        await showMessage('Chyba', 'Chyba pri načítaní dát.');
    }
}

/**
 * Displays playing days in a table.
 */
async function displayPlayingDays() {
    if (!playingDaysList) return;
    playingDaysList.innerHTML = ''; // Clear previous content

    if (allPlayingDays.length === 0) {
        playingDaysList.innerHTML = '<p>Zatiaľ neboli pridané žiadne hracie dni.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('data-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Dátum</th>
                <th>Akcie</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    allPlayingDays.forEach(day => {
        const tr = document.createElement('tr');
        const dateObj = new Date(day.date);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td class="actions">
                <button class="action-button edit-button" data-id="${day.id}">Upraviť</button>
                <button class="action-button delete-button" data-id="${day.id}">Vymazať</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    playingDaysList.appendChild(table);

    // Add event listeners for edit and delete buttons
    playingDaysList.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const day = allPlayingDays.find(d => d.id === id);
            if (day) openPlayingDayModal(id, day);
        });
    });

    playingDaysList.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento hrací deň? Vymažú sa aj všetky zápasy priradené k tomuto dňu.');
            if (confirmed) {
                await deletePlayingDay(id);
            }
        });
    });
}

/**
 * Displays places in a table.
 */
async function displayPlaces() {
    if (!placesList) return;
    placesList.innerHTML = ''; // Clear previous content

    if (allPlaces.length === 0) {
        placesList.innerHTML = '<p>Zatiaľ neboli pridané žiadne miesta.</p>';
        return;
    }

    const table = document.createElement('table');
    table.classList.add('data-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Názov</th>
                <th>Adresa</th>
                <th>Popis</th>
                <th>Akcie</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    allPlaces.forEach(place => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${place.name}</td>
            <td>${place.address || 'N/A'}</td>
            <td>${place.description || 'N/A'}</td>
            <td class="actions">
                <button class="action-button edit-button" data-id="${place.id}">Upraviť</button>
                <button class="action-button delete-button" data-id="${place.id}">Vymazať</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    placesList.appendChild(table);

    // Add event listeners for edit and delete buttons
    placesList.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const place = allPlaces.find(p => p.id === id);
            if (place) openPlaceModal(id, place);
        });
    });

    placesList.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať toto miesto? Vymažú sa aj všetky zápasy priradené k tomuto miestu.');
            if (confirmed) {
                await deletePlace(id);
            }
        });
    });
}

/**
 * Displays matches as a schedule grouped by playing day.
 */
async function displayMatchesAsSchedule() {
    if (!matchScheduleDiv) return;
    matchScheduleDiv.innerHTML = ''; // Clear previous content

    if (allPlayingDays.length === 0) {
        matchScheduleDiv.innerHTML = '<p>Pre zobrazenie zápasov pridajte najprv aspoň jeden hrací deň.</p>';
        return;
    }

    const playingDaysContainer = document.createElement('div');
    playingDaysContainer.classList.add('playing-days-container');

    for (const day of allPlayingDays) {
        const dateObj = new Date(day.date);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;

        const daySection = document.createElement('div');
        daySection.classList.add('playing-day-section');
        daySection.innerHTML = `<h3>${formattedDate}</h3>`;

        const matchesForDay = allMatches
            .filter(match => match.playingDayId === day.id)
            .sort((a, b) => {
                // Sort by time, then by order
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
                return (a.order || 0) - (b.order || 0);
            });

        if (matchesForDay.length === 0) {
            daySection.innerHTML += '<p>Zatiaľ žiadne zápasy pre tento deň.</p>';
        } else {
            const table = document.createElement('table');
            table.classList.add('data-table', 'match-schedule-table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Čas</th>
                        <th>Kategória</th>
                        <th>Skupina</th>
                        <th>Tím 1</th>
                        <th>Tím 2</th>
                        <th>Miesto</th>
                        <th>Akcie</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            for (const match of matchesForDay) {
                const tr = document.createElement('tr');
                tr.draggable = true; // Make rows draggable
                tr.dataset.matchId = match.id; // Store match ID for drag/drop
                tr.classList.add('match-row'); // Add class for styling

                const category = allCategories.find(c => c.id === match.categoryId);
                const group = allGroups.find(g => g.id === match.groupId);
                const team1 = allTeams.find(t => t.id === match.team1Id);
                const team2 = allTeams.find(t => t.id === match.team2Id);
                const place = allPlaces.find(p => p.id === match.placeId);

                tr.innerHTML = `
                    <td>${match.time} (${match.order || 'N/A'})</td>
                    <td>${category ? category.name : 'N/A'}</td>
                    <td>${group ? group.name : 'N/A'}</td>
                    <td>${team1 ? team1.name : 'N/A'}</td>
                    <td>${team2 ? team2.name : 'N/A'}</td>
                    <td>${place ? place.name : 'N/A'}</td>
                    <td class="actions">
                        <button class="action-button edit-button" data-id="${match.id}">Upraviť</button>
                        <button class="action-button delete-button" data-id="${match.id}">Vymazať</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
            daySection.appendChild(table);
        }
        playingDaysContainer.appendChild(daySection);
    }

    matchScheduleDiv.appendChild(playingDaysContainer);

    // Add event listeners for edit and delete buttons on matches
    matchScheduleDiv.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const match = allMatches.find(m => m.id === id);
            if (match) openMatchModal(id, match);
        });
    });

    matchScheduleDiv.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async () => {
            const id = button.dataset.id;
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento zápas?');
            if (confirmed) {
                await deleteMatch(id);
            }
        });
    });

    addDragAndDropListeners();
}

/**
 * Displays accommodation assignments in a table.
 */
async function displayAccommodationAssignments() {
    const accommodationAssignmentsList = document.getElementById('accommodationAssignmentsList');
    if (!accommodationAssignmentsList) return;
    accommodationAssignmentsList.innerHTML = '';

    const assignedClubs = allTeams.filter(team => team.accommodation && team.accommodation !== 'unassigned');
    const unassignedClubs = allTeams.filter(team => !team.accommodation || team.accommodation === 'unassigned');

    const renderTable = (title, clubs, isAssigned = true) => {
        const section = document.createElement('div');
        section.classList.add('section-block');
        section.innerHTML = `<h4>${title}</h4>`;

        if (clubs.length === 0) {
            section.innerHTML += `<p>Žiadne ${isAssigned ? 'priradené' : 'nepriradené'} kluby.</p>`;
        } else {
            const table = document.createElement('table');
            table.classList.add('data-table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Klub</th>
                        <th>Kategória</th>
                        <th>Skupina</th>
                        ${isAssigned ? '<th>Ubytovanie</th>' : ''}
                        <th>Akcie</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');

            clubs.forEach(club => {
                const tr = document.createElement('tr');
                const category = allCategories.find(c => c.id === club.categoryId);
                const group = allGroups.find(g => g.id === club.groupId);

                tr.innerHTML = `
                    <td>${club.name}</td>
                    <td>${category ? category.name : 'N/A'}</td>
                    <td>${group ? group.name : 'N/A'}</td>
                    ${isAssigned ? `<td>${club.accommodation}</td>` : ''}
                    <td class="actions">
                        <button class="action-button edit-button" data-id="${club.id}" 
                            data-category-id="${club.categoryId}" 
                            data-group-id="${club.groupId}" 
                            data-accommodation="${club.accommodation}">
                            ${isAssigned ? 'Upraviť' : 'Priradiť'}
                        </button>
                        ${isAssigned ? `<button class="action-button delete-button" data-id="${club.id}">Vymazať priradenie</button>` : ''}
                    </td>
                `;
                tbody.appendChild(tr);
            });
            section.appendChild(table);
        }
        accommodationAssignmentsList.appendChild(section);
    };

    renderTable('Priradené ubytovanie', assignedClubs, true);
    renderTable('Nepriradené ubytovanie', unassignedClubs, false);

    accommodationAssignmentsList.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const clubId = button.dataset.id;
            const categoryId = button.dataset.categoryId;
            const groupId = button.dataset.groupId;
            const accommodation = button.dataset.accommodation;
            
            // Pass the current club data for editing
            openAccommodationAssignmentModal(clubId, {
                categoryId: categoryId,
                groupId: groupId,
                teamId: clubId, // In this context, teamId is the clubId
                accommodation: accommodation
            });
        });
    });

    accommodationAssignmentsList.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async () => {
            const clubId = button.dataset.id;
            const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať priradenie ubytovania pre tento klub?');
            if (confirmed) {
                await deleteAccommodationAssignment(clubId);
            }
        });
    });
}


// --- CRUD Operations ---

/**
 * Saves a playing day to Firestore (add or update).
 */
playingDayForm?.addEventListener('submit', async (e) => {
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
        resetPlayingDayModal();
        await loadAllData();
        await displayPlayingDays();
        await displayMatchesAsSchedule(); // Refresh matches as well
    } catch (error) {
        console.error("Chyba pri ukladaní hracieho dňa:", error);
        await showMessage('Chyba', `Chyba pri ukladaní hracieho dňa. Detail: ${error.message}`);
    }
});

/**
 * Deletes a playing day from Firestore.
 * @param {string} id The ID of the playing day to delete.
 */
async function deletePlayingDay(id) {
    try {
        const batch = writeBatch(db);

        // Delete all matches associated with this playing day
        const matchesToDeleteQuery = query(matchesCollectionRef, where("playingDayId", "==", id));
        const matchesSnapshot = await getDocs(matchesToDeleteQuery);
        matchesSnapshot.forEach((matchDoc) => {
            batch.delete(matchDoc.ref);
        });

        // Delete the playing day document
        batch.delete(doc(playingDaysCollectionRef, id));
        await batch.commit();

        await showMessage('Úspech', 'Hrací deň a priradené zápasy úspešne vymazané!');
        await loadAllData();
        await displayPlayingDays();
        await displayMatchesAsSchedule(); // Refresh matches as well
    } catch (error) {
        console.error("Error deleting playing day:", error);
        await showMessage('Chyba', 'Chyba pri mazaní hracieho dňa! Prosím, skúste znova.');
    }
}

/**
 * Saves a place to Firestore (add or update).
 */
placeForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('placeId').value;
    const name = document.getElementById('placeName').value;
    const address = document.getElementById('placeAddress').value;
    const description = document.getElementById('placeDescription').value;

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

        const placeData = { name, address, description };

        if (id) {
            await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
            await showMessage('Úspech', 'Miesto úspešne upravené!');
        } else {
            await addDoc(placesCollectionRef, { ...placeData, createdAt: new Date() });
            await showMessage('Úspech', 'Miesto úspešne pridané!');
        }
        closeModal(placeModal);
        resetPlaceModal();
        await loadAllData();
        await displayPlaces();
        await displayMatchesAsSchedule(); // Refresh matches as well
    } catch (error) {
        console.error("Error saving place:", error);
        await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
    }
});

/**
 * Deletes a place from Firestore.
 * @param {string} id The ID of the place to delete.
 */
async function deletePlace(id) {
    try {
        const batch = writeBatch(db);

        // Delete all matches associated with this place
        const matchesToDeleteQuery = query(matchesCollectionRef, where("placeId", "==", id));
        const matchesSnapshot = await getDocs(matchesToDeleteQuery);
        matchesSnapshot.forEach((matchDoc) => {
            batch.delete(matchDoc.ref);
        });

        // Delete the place document
        batch.delete(doc(placesCollectionRef, id));
        await batch.commit();

        await showMessage('Úspech', 'Miesto a priradené zápasy úspešne vymazané!');
        await loadAllData();
        await displayPlaces();
        await displayMatchesAsSchedule(); // Refresh matches as well
    } catch (error) {
        console.error("Error deleting place:", error);
        await showMessage('Chyba', 'Chyba pri mazaní miesta! Prosím, skúste znova.');
    }
}

/**
 * Saves a match to Firestore (add or update).
 */
matchForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('matchId').value;
    const playingDayId = document.getElementById('matchPlayingDaySelect').value;
    const placeId = document.getElementById('matchPlaceSelect').value;
    const categoryId = document.getElementById('matchCategorySelect').value;
    const groupId = document.getElementById('matchGroupSelect').value;
    const team1Id = document.getElementById('team1Select').value;
    const team2Id = document.getElementById('team2Select').value;
    const time = document.getElementById('matchTime').value;
    const order = parseInt(document.getElementById('matchOrder').value);

    // Basic validation
    if (!playingDayId || !placeId || !categoryId || !groupId || !team1Id || !team2Id || !time) {
        await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia pre zápas.');
        return;
    }
    if (team1Id === team2Id) {
        await showMessage('Chyba', 'Tímy 1 a 2 nemôžu byť rovnaké!');
        return;
    }
    if (isNaN(order) || order < 0) {
        await showMessage('Chyba', 'Poradie musí byť číslo väčšie alebo rovné nule.');
        return;
    }

    try {
        const matchData = {
            playingDayId,
            placeId,
            categoryId,
            groupId,
            team1Id,
            team2Id,
            time,
            order: order,
            status: 'scheduled' // Default status
        };

        if (id) {
            await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
            await showMessage('Úspech', 'Zápas úspešne upravený!');
        } else {
            await addDoc(matchesCollectionRef, { ...matchData, createdAt: new Date() });
            await showMessage('Úspech', 'Zápas úspešne pridaný!');
        }
        closeModal(matchModal);
        resetMatchModal();
        await loadAllData();
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Error saving match:", error);
        await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
    }
});

/**
 * Deletes a match from Firestore.
 * @param {string} id The ID of the match to delete.
 */
async function deleteMatch(id) {
    try {
        await deleteDoc(doc(matchesCollectionRef, id));
        await showMessage('Úspech', 'Zápas úspešne vymazaný!');
        await loadAllData();
        await displayMatchesAsSchedule();
    } catch (error) {
        console.error("Error deleting match:", error);
        await showMessage('Chyba', 'Chyba pri mazaní zápasu! Prosím, skúste znova.');
    }
}

/**
 * Saves accommodation assignment to Firestore (update existing club).
 */
accommodationAssignmentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const assignmentId = document.getElementById('assignmentId').value; // This will be the club ID in edit mode
    let clubId = '';
    let categoryId = '';
    let groupId = '';
    let accommodation = document.getElementById('accommodationSelect').value;

    if (currentAccommodationAssignmentMode === 'edit') {
        clubId = assignmentId;
        // In edit mode, categoryId and groupId are read from the disabled selects
        categoryId = document.getElementById('assignCategorySelect').value;
        groupId = document.getElementById('assignGroupSelect').value;
    } else { // Add mode
        clubId = document.getElementById('unassignedClubSelect').value;
        if (!clubId) {
            await showMessage('Chyba', 'Prosím, vyberte klub.');
            return;
        }
        // Get category and group from the selected unassigned club
        const selectedClub = allTeams.find(team => team.id === clubId);
        if (selectedClub) {
            categoryId = selectedClub.categoryId;
            groupId = selectedClub.groupId;
        }
    }

    if (!accommodation) {
        await showMessage('Chyba', 'Prosím, vyberte ubytovňu.');
        return;
    }

    try {
        const clubDocRef = doc(clubsCollectionRef, clubId);
        await updateDoc(clubDocRef, { accommodation: accommodation });

        await showMessage('Úspech', 'Priradenie ubytovania úspešne uložené!');
        closeModal(accommodationAssignmentModal);
        resetAccommodationAssignmentModal();
        await loadAllData();
        await displayAccommodationAssignments();
    } catch (error) {
        console.error("Error saving accommodation assignment:", error);
        await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
    }
});

/**
 * Deletes an accommodation assignment from Firestore.
 * @param {string} clubId The ID of the club to unassign accommodation from.
 */
async function deleteAccommodationAssignment(clubId) {
    try {
        const clubDocRef = doc(clubsCollectionRef, clubId);
        await updateDoc(clubDocRef, { accommodation: 'unassigned' }); // Set to 'unassigned' or remove the field
        await showMessage('Úspech', 'Priradenie ubytovania úspešne vymazané!');
        closeModal(accommodationAssignmentModal);
        resetAccommodationAssignmentModal();
        await loadAllData();
        await displayAccommodationAssignments();
    }
    catch (error) {
        console.error("Error deleting accommodation assignment:", error);
        await showMessage('Chyba', 'Chyba pri mazaní priradenia ubytovania! Prosím, skúste znova.');
    }
}


// --- Drag & Drop for Matches ---

let draggedMatchId = null;

function addDragAndDropListeners() {
    const matchRows = document.querySelectorAll('.match-row');
    const playingDaySections = document.querySelectorAll('.playing-day-section');

    matchRows.forEach(row => {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragend', handleDragEnd);
    });

    playingDaySections.forEach(section => {
        section.addEventListener('dragover', handleDragOver);
        section.addEventListener('dragleave', handleDragLeave);
        section.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedMatchId = e.target.dataset.matchId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedMatchId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedMatchId = null;
    // Clean up drop target styles
    document.querySelectorAll('.date-group.drop-target-active').forEach(el => {
        el.classList.remove('drop-target-active');
    });
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow drop
    e.dataTransfer.dropEffect = 'move';
    // Add visual feedback to drop target
    const targetSection = e.currentTarget;
    if (targetSection) {
        targetSection.classList.add('drop-target-active');
    }
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-target-active');
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target-active');

    const droppedMatchId = e.dataTransfer.getData('text/plain');
    const targetPlayingDaySection = e.currentTarget;
    const targetPlayingDayId = allPlayingDays.find(day => {
        const dateString = targetPlayingDaySection.querySelector('h3').textContent;
        const parts = dateString.split('.').map(p => p.trim());
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        return day.date === formattedDate;
    })?.id;

    if (!droppedMatchId || !targetPlayingDayId) {
        await showMessage('Chyba', 'Nepodarilo sa presunúť zápas. Chýbajú dáta.');
        return;
    }

    if (droppedMatchId === 'new-match') {
        // This is a new match being added by drag and drop (not supported directly by this logic yet)
        return;
    }

    try {
        const matchDocRef = doc(matchesCollectionRef, droppedMatchId);
        const matchDoc = await getDoc(matchDocRef);

        if (!matchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            return;
        }

        const matchData = matchDoc.data();
        const oldPlayingDayId = matchData.playingDayId;

        // If dropping into the same day, no change needed
        if (oldPlayingDayId === targetPlayingDayId) {
            await showMessage('Informácia', 'Zápas už je priradený k tomuto dňu.');
            return;
        }

        // Update the match's playingDayId
        await updateDoc(matchDocRef, { playingDayId: targetPlayingDayId });
        await showMessage('Úspech', 'Zápas úspešne presunutý do nového hracieho dňa!');
        await loadAllData();
        await displayMatchesAsSchedule();

    } catch (error) {
        console.error('Error updating match playing day:', error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu. Detail: ${error.message}`);
    }
}


// --- Event Listeners and Initial Load ---

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Load all initial data
    await loadAllData();

    // Display initial tables
    await displayPlayingDays();
    await displayPlaces();
    await displayMatchesAsSchedule();
    await displayAccommodationAssignments();


    // Event listeners for modals
    playingDayModalCloseBtn?.addEventListener('click', () => {
        closeModal(playingDayModal);
        resetPlayingDayModal();
    });
    placeModalCloseBtn?.addEventListener('click', () => {
        closeModal(placeModal);
        resetPlaceModal();
    });
    matchModalCloseBtn?.addEventListener('click', () => {
        closeModal(matchModal);
        resetMatchModal();
    });
    accommodationAssignmentModalCloseBtn?.addEventListener('click', () => {
        closeModal(accommodationAssignmentModal);
        resetAccommodationAssignmentModal();
    });

    window.addEventListener('click', (event) => {
        if (event.target === playingDayModal) {
            closeModal(playingDayModal);
            resetPlayingDayModal();
        }
        if (event.target === placeModal) {
            closeModal(placeModal);
            resetPlaceModal();
        }
        if (event.target === matchModal) {
            closeModal(matchModal);
            resetMatchModal();
        }
        if (event.target === accommodationAssignmentModal) {
            closeModal(accommodationAssignmentModal);
            resetAccommodationAssignmentModal();
        }
    });

    // Add button and its dropdown
    const addButton = document.getElementById('addButton');
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addPlaceButton = document.getElementById('addPlaceButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addAccommodationAssignmentButton = document.getElementById('addAccommodationAssignmentButton'); // New button for accommodation

    addButton?.addEventListener('click', () => {
        addOptionsDropdown?.classList.toggle('show');
    });

    addPlayingDayButton?.addEventListener('click', () => {
        openPlayingDayModal();
        addOptionsDropdown?.classList.remove('show');
    });

    addPlaceButton?.addEventListener('click', () => {
        openPlaceModal();
        addOptionsDropdown?.classList.remove('show');
    });

    addMatchButton?.addEventListener('click', async () => {
        await populateCategorySelect(document.getElementById('matchCategorySelect'));
        await populatePlayingDaysSelect(document.getElementById('matchPlayingDaySelect'));
        await populatePlacesSelect(document.getElementById('matchPlaceSelect'));
        openMatchModal();
        addOptionsDropdown?.classList.remove('show');
    });

    addAccommodationAssignmentButton?.addEventListener('click', async () => {
        await populateUnassignedClubsSelect(document.getElementById('unassignedClubSelect'));
        await populateAccommodationSelect(document.getElementById('accommodationSelect'));
        openAccommodationAssignmentModal();
        addOptionsDropdown?.classList.remove('show');
    });

    // Close dropdown if clicked outside
    window.addEventListener('click', (event) => {
        if (!event.target.matches('#addButton') && !event.target.matches('#addOptions button')) {
            const dropdowns = document.getElementsByClassName("add-options-dropdown");
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    });
});
