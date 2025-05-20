// spravca-turnaja-zapasy-doprava.js

import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where, doc, setDoc, addDoc, deleteDoc, updateDoc,
         openModal, closeModal, populateCategorySelect, populateGroupSelect } from './spravca-turnaja-common.js';

// Firebase kolekcie pre zápasy, haly, ubytovania, hracie dni
const hallsCollectionRef = firebase.firestore().collection('tournamentData').doc('mainTournamentData').collection('halls');
const accommodationsCollectionRef = firebase.firestore().collection('tournamentData').doc('mainTournamentData').collection('accommodations');
const gameDaysCollectionRef = firebase.firestore().collection('tournamentData').doc('mainTournamentData').collection('gameDays');
const matchesCollectionRef = firebase.firestore().collection('tournamentData').doc('mainTournamentData').collection('matches');


// Referencie na DOM elementy
const categoryFilter = document.getElementById('categoryFilter');
const groupFilter = document.getElementById('groupFilter');
const gameDayFilter = document.getElementById('gameDayFilter');
const resetFiltersButton = document.getElementById('resetFiltersButton');
const addGameDayButton = document.getElementById('addGameDayButton');
const addHallButton = document.getElementById('addHallButton');
const addAccommodationButton = document.getElementById('addAccommodationButton');

const fixedHeader = document.getElementById('fixedHeader');
const fixedColumn = document.getElementById('fixedColumn');
const scrollableContent = document.getElementById('scrollableContent');
const contentGrid = document.getElementById('contentGrid');

// Modálne okná pre udalosti
const eventModal = document.getElementById('eventModal');
const eventModalCloseBtn = eventModal ? eventModal.querySelector('.event-modal-close') : null;
const eventForm = document.getElementById('eventForm');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventIdInput = document.getElementById('eventId');
const eventTypeSelect = document.getElementById('eventType');
const eventHallAccommodationSelect = document.getElementById('eventHallAccommodation');
const eventGameDaySelect = document.getElementById('eventGameDay');
const eventTimeInput = document.getElementById('eventTime');

const matchFields = document.getElementById('matchFields');
const matchCategorySelect = document.getElementById('matchCategory');
const matchGroupSelect = document.getElementById('matchGroup');
const matchTeam1Select = document.getElementById('matchTeam1');
const matchTeam2Select = document.getElementById('matchTeam2');
const matchScore1Input = document.getElementById('matchScore1');
const matchScore2Input = document.getElementById('matchScore2');

const transportFields = document.getElementById('transportFields');
const transportTeamSelect = document.getElementById('transportTeam');
const transportDriverInput = document.getElementById('transportDriver');
const transportVehicleNoInput = document.getElementById('transportVehicleNo');
const transportDescriptionTextarea = document.getElementById('transportDescription');

const accommodationFields = document.getElementById('accommodationFields');
const accommodationTeamSelect = document.getElementById('accommodationTeam');
const accommodationRoomInput = document.getElementById('accommodationRoom');
const accommodationDescriptionTextarea = document.getElementById('accommodationDescription');


// Modálne okná pre pridanie hál, ubytovaní, dní
const addHallModal = document.getElementById('addHallModal');
const addHallModalCloseBtn = addHallModal ? addHallModal.querySelector('.add-hall-modal-close') : null;
const addHallForm = document.getElementById('addHallForm');
const hallNameInput = document.getElementById('hallNameInput');

const addAccommodationModal = document.getElementById('addAccommodationModal');
const addAccommodationModalCloseBtn = addAccommodationModal ? addAccommodationModal.querySelector('.add-accommodation-modal-close') : null;
const addAccommodationForm = document.getElementById('addAccommodationForm');
const accommodationNameInput = document.getElementById('accommodationNameInput');

const addGameDayModal = document.getElementById('addGameDayModal');
const addGameDayModalCloseBtn = addGameDayModal ? addGameDayModal.querySelector('.add-game-day-modal-close') : null;
const addGameDayForm = document.getElementById('addGameDayForm');
const gameDayDateInput = document.getElementById('gameDayDateInput');


// Lokálne dáta
let allHalls = [];
let allAccommodations = [];
let allGameDays = [];
let allCategories = [];
let allGroups = [];
let allTeams = [];
let allMatches = []; // Všetky zápasy načítané z Firebase


// Funkcie pre načítanie dát
async function loadHalls() {
    const querySnapshot = await getDocs(hallsCollectionRef);
    allHalls = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    console.log("Loaded halls:", allHalls);
}

async function loadAccommodations() {
    const querySnapshot = await getDocs(accommodationsCollectionRef);
    allAccommodations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    console.log("Loaded accommodations:", allAccommodations);
}

async function loadGameDays() {
    const querySnapshot = await getDocs(gameDaysCollectionRef);
    allGameDays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
        // Zoradenie podľa dátumu
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
    });
    console.log("Loaded game days:", allGameDays);
}

async function loadCategories() {
    const querySnapshot = await getDocs(categoriesCollectionRef);
    allCategories = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })).sort((a, b) => a.name.localeCompare(b.name));
    console.log("Loaded categories:", allCategories);
}

async function loadGroups() {
    const querySnapshot = await getDocs(groupsCollectionRef);
    allGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
        // Zoradenie podľa kategórie a potom názvu skupiny
        const categoryComparison = a.categoryId.localeCompare(b.categoryId);
        if (categoryComparison !== 0) return categoryComparison;
        return a.name.localeCompare(b.name);
    });
    console.log("Loaded groups:", allGroups);
}

async function loadTeams() {
    const querySnapshot = await getDocs(clubsCollectionRef);
    allTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name));
    console.log("Loaded teams:", allTeams);
}

async function loadMatches() {
    const querySnapshot = await getDocs(matchesCollectionRef);
    allMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Loaded matches:", allMatches);
}

/**
 * Hlavná funkcia pre načítanie všetkých potrebných dát.
 */
async function loadAllData() {
    await Promise.all([
        loadHalls(),
        loadAccommodations(),
        loadGameDays(),
        loadCategories(),
        loadGroups(),
        loadTeams(),
        loadMatches()
    ]);
    console.log("All data loaded.");
}

/**
 * Vyplní select elementy kategóriami, skupinami, halami, ubytovaniami, hracími dňami, tímami.
 */
function populateSelects() {
    // Populate filter selects
    populateCategorySelect(categoryFilter, allCategories);
    populateCategorySelect(matchCategorySelect, allCategories); // For match modal

    // Populate game day filter
    gameDayFilter.innerHTML = '<option value="">-- Všetky dátumy --</option>';
    allGameDays.forEach(day => {
        const option = document.createElement('option');
        option.value = day.id; // Using ID (e.g., "2024-06-15")
        option.textContent = day.date; // Display the date
        gameDayFilter.appendChild(option);
    });

    // Populate event modal selects for Hall/Accommodation and Game Day
    eventHallAccommodationSelect.innerHTML = '<option value="">-- Vyberte halu / ubytovanie --</option>';
    allHalls.forEach(hall => {
        const option = document.createElement('option');
        option.value = `hall_${hall.id}`; // Prefix to distinguish from accommodation
        option.textContent = `Hala: ${hall.name}`;
        eventHallAccommodationSelect.appendChild(option);
    });
    allAccommodations.forEach(acc => {
        const option = document.createElement('option');
        option.value = `acc_${acc.id}`; // Prefix to distinguish
        option.textContent = `Ubytovanie: ${acc.name}`;
        eventHallAccommodationSelect.appendChild(option);
    });

    eventGameDaySelect.innerHTML = '<option value="">-- Vyberte hrací deň --</option>';
    allGameDays.forEach(day => {
        const option = document.createElement('option');
        option.value = day.id;
        option.textContent = day.date;
        eventGameDaySelect.appendChild(option);
    });

    // Populate team selects for match, transport, accommodation
    const populateTeamSelect = (selectElement) => {
        selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
        allTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            selectElement.appendChild(option);
        });
    };
    populateTeamSelect(matchTeam1Select);
    populateTeamSelect(matchTeam2Select);
    populateTeamSelect(transportTeamSelect);
    populateTeamSelect(accommodationTeamSelect);
}

/**
 * Filtruje zápasy na základe vybraných filtrov.
 * @returns {Array} Filtrované zápasy.
 */
function getFilteredMatches() {
    let filteredMatches = allMatches;

    const selectedCategory = categoryFilter.value;
    const selectedGroup = groupFilter.value;
    const selectedGameDay = gameDayFilter.value;

    if (selectedCategory) {
        filteredMatches = filteredMatches.filter(match => match.categoryId === selectedCategory);
    }
    if (selectedGroup) {
        filteredMatches = filteredMatches.filter(match => match.groupId === selectedGroup);
    }
    if (selectedGameDay) {
        filteredMatches = filteredMatches.filter(match => match.gameDayId === selectedGameDay);
    }

    return filteredMatches;
}


/**
 * Vygeneruje Excel-like mriežku s udalosťami (zápasy, doprava, ubytovanie).
 */
async function renderGrid() {
    fixedHeader.innerHTML = '';
    fixedColumn.innerHTML = '';
    contentGrid.innerHTML = '';

    const currentFilteredMatches = getFilteredMatches();

    const sortedGameDays = allGameDays.filter(day => {
        // Ak je vybratý filter dátumu, zobraz len ten deň
        if (gameDayFilter.value) {
            return day.id === gameDayFilter.value;
        }
        // Inak zobraz všetky dni, ktoré majú aspoň jednu udalosť, alebo všetky dni ak nie sú žiadne udalosti
        return currentFilteredMatches.some(match => match.gameDayId === day.id) || currentFilteredMatches.length === 0;
    });

    const combinedLocations = [
        ...allHalls.map(h => ({ id: h.id, name: h.name, type: 'hall', order: h.order })),
        ...allAccommodations.map(a => ({ id: a.id, name: a.name, type: 'accommodation', order: a.order }))
    ].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    // Render fixed header (game days)
    fixedHeader.style.gridTemplateColumns = `repeat(${sortedGameDays.length}, 150px)`; // Set columns for fixed header
    sortedGameDays.forEach(day => {
        const headerCell = document.createElement('div');
        headerCell.classList.add('header-cell');
        headerCell.textContent = day.date;
        fixedHeader.appendChild(headerCell);
    });

    // Render fixed column (halls/accommodations)
    fixedColumn.style.gridTemplateRows = `repeat(${combinedLocations.length}, 100px)`; // Set rows for fixed column
    combinedLocations.forEach(location => {
        const columnCell = document.createElement('div');
        columnCell.classList.add('column-cell');
        columnCell.textContent = `${location.type === 'hall' ? 'Hala' : 'Ubytovanie'}: ${location.name}`;
        fixedColumn.appendChild(columnCell);
    });

    // Render scrollable content grid
    contentGrid.style.gridTemplateColumns = `repeat(${sortedGameDays.length}, 150px)`;
    contentGrid.style.gridTemplateRows = `repeat(${combinedLocations.length}, 100px)`;

    // Vytvoríme mapu pre rýchle vyhľadávanie indexov
    const locationIndexMap = new Map(combinedLocations.map((loc, index) => [`${loc.type}_${loc.id}`, index]));
    const gameDayIndexMap = new Map(sortedGameDays.map((day, index) => [day.id, index]));

    // Inicializujeme bunky gridu
    for (let i = 0; i < combinedLocations.length; i++) {
        for (let j = 0; j < sortedGameDays.length; j++) {
            const cell = document.createElement('div');
            cell.classList.add('excel-like-content-cell');
            cell.dataset.rowIndex = i;
            cell.dataset.colIndex = j;
            cell.dataset.locationId = combinedLocations[i].id;
            cell.dataset.locationType = combinedLocations[i].type;
            cell.dataset.gameDayId = sortedGameDays[j].id;

            // Pridáme "+" tlačidlo
            const addButton = document.createElement('button');
            addButton.classList.add('add-item-button');
            addButton.textContent = '+';
            addButton.title = 'Pridať udalosť';
            addButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Zabránime, aby sa klik prenášal na bunku
                openEventModal(null, cell.dataset.locationType, cell.dataset.locationId, cell.dataset.gameDayId);
            });
            cell.appendChild(addButton);
            contentGrid.appendChild(cell);
        }
    }

    // Umiestnime udalosti do buniek
    currentFilteredMatches.forEach(match => {
        const locationKey = match.hallId ? `hall_${match.hallId}` : `acc_${match.accommodationId}`;
        const rowIndex = locationIndexMap.get(locationKey);
        const colIndex = gameDayIndexMap.get(match.gameDayId);

        if (rowIndex !== undefined && colIndex !== undefined) {
            const cell = contentGrid.querySelector(`[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`);
            if (cell) {
                const eventElement = document.createElement('div');
                eventElement.dataset.eventId = match.id;
                eventElement.classList.add(match.type === 'match' ? 'match-item' : 'transport-item'); // Používame transport-item pre transport/accommodation
                eventElement.title = `${match.type === 'match' ? 'Zápas' : match.type === 'transport' ? 'Doprava' : 'Ubytovanie'}: ${match.description || ''}`;

                if (match.type === 'match') {
                    const team1Name = allTeams.find(t => t.id === match.team1Id)?.name || 'Neznámy tím';
                    const team2Name = allTeams.find(t => t.id === match.team2Id)?.name || 'Neznámy tím';
                    const categoryName = allCategories.find(c => c.id === match.categoryId)?.name || 'Neznáma kat.';
                    const groupName = allGroups.find(g => g.id === match.groupId)?.name || 'Neznáma skup.';
                    eventElement.innerHTML = `
                        <strong>${match.startTime}</strong><br>
                        ${team1Name} vs ${team2Name}<br>
                        (${categoryName}, ${groupName})<br>
                        ${match.score1 !== null && match.score2 !== null ? `Výsledok: ${match.score1}:${match.score2}` : ''}
                        <button class="edit-button" title="Upraviť">✎</button>
                    `;
                } else if (match.type === 'transport') {
                    const teamName = allTeams.find(t => t.id === match.teamId)?.name || 'Neznámy tím';
                    eventElement.innerHTML = `
                        <strong>${match.startTime}</strong><br>
                        Doprava: ${teamName}<br>
                        ${match.transportDriver ? `Vodič: ${match.transportDriver}` : ''}<br>
                        ${match.transportVehicleNo ? `Vozidlo: ${match.transportVehicleNo}` : ''}<br>
                        ${match.description || ''}
                        <button class="edit-button" title="Upraviť">✎</button>
                    `;
                } else if (match.type === 'accommodation') {
                     const teamName = allTeams.find(t => t.id === match.teamId)?.name || 'Neznámy tím';
                     eventElement.innerHTML = `
                         <strong>${match.startTime}</strong><br>
                         Ubytovanie: ${teamName}<br>
                         ${match.accommodationRoom ? `Izba: ${match.accommodationRoom}` : ''}<br>
                         ${match.description || ''}
                         <button class="edit-button" title="Upraviť">✎</button>
                     `;
                 }


                // Pridanie event listenera pre úpravu
                const editButton = eventElement.querySelector('.edit-button');
                if (editButton) {
                    editButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEventModal(match.id, null, null, null, match); // Posielame celý objekt zápasu
                    });
                }
                cell.appendChild(eventElement);
            }
        }
    });

    // Synchronizácia posúvania
    syncScroll();
}

/**
 * Synchronizuje posúvanie medzi fixovanými hlavičkami a posuvným obsahom.
 */
function syncScroll() {
    scrollableContent.addEventListener('scroll', () => {
        fixedHeader.scrollLeft = scrollableContent.scrollLeft;
        fixedColumn.scrollTop = scrollableContent.scrollTop;
    });

    // Pridať aj opačnú synchronizáciu, ak by sa hlavičky posúvali inak (napr. na mobiloch)
    fixedHeader.addEventListener('scroll', () => {
        scrollableContent.scrollLeft = fixedHeader.scrollLeft;
    });
    fixedColumn.addEventListener('scroll', () => {
        scrollableContent.scrollTop = fixedColumn.scrollTop;
    });
}

/**
 * Otvorí modálne okno pre pridanie/úpravu udalosti.
 * @param {string|null} eventId - ID udalosti pre úpravu, null pre pridanie.
 * @param {string|null} defaultLocationType - 'hall' alebo 'accommodation' pre predvyplnenie.
 * @param {string|null} defaultLocationId - ID haly/ubytovania pre predvyplnenie.
 * @param {string|null} defaultGameDayId - ID hracieho dňa pre predvyplnenie.
 * @param {Object|null} eventData - Existujúce dáta udalosti pre úpravu.
 */
async function openEventModal(eventId = null, defaultLocationType = null, defaultLocationId = null, defaultGameDayId = null, eventData = null) {
    eventForm.reset();
    eventIdInput.value = '';
    matchFields.style.display = 'none';
    transportFields.style.display = 'none';
    accommodationFields.style.display = 'none';

    // Vyplniť selekty pre modal (kategórie, tímy atď.)
    populateSelects(); // Znova vyplníme, aby boli aktuálne

    if (eventId && eventData) {
        eventModalTitle.textContent = 'Upraviť udalosť';
        eventIdInput.value = eventId;
        eventTypeSelect.value = eventData.type;
        eventHallAccommodationSelect.value = eventData.hallId ? `hall_${eventData.hallId}` : `acc_${eventData.accommodationId}`;
        eventGameDaySelect.value = eventData.gameDayId;
        eventTimeInput.value = eventData.startTime;

        if (eventData.type === 'match') {
            matchFields.style.display = 'block';
            await populateGroupSelect(matchGroupSelect, eventData.categoryId, allGroups); // Načítaj skupiny pre vybranú kategóriu
            matchCategorySelect.value = eventData.categoryId;
            matchGroupSelect.value = eventData.groupId;
            matchTeam1Select.value = eventData.team1Id;
            matchTeam2Select.value = eventData.team2Id;
            matchScore1Input.value = eventData.score1;
            matchScore2Input.value = eventData.score2;
        } else if (eventData.type === 'transport') {
            transportFields.style.display = 'block';
            transportTeamSelect.value = eventData.teamId;
            transportDriverInput.value = eventData.transportDriver || '';
            transportVehicleNoInput.value = eventData.transportVehicleNo || '';
            transportDescriptionTextarea.value = eventData.description || '';
        } else if (eventData.type === 'accommodation') {
            accommodationFields.style.display = 'block';
            accommodationTeamSelect.value = eventData.teamId;
            accommodationRoomInput.value = eventData.accommodationRoom || '';
            accommodationDescriptionTextarea.value = eventData.description || '';
        }

    } else {
        eventModalTitle.textContent = 'Pridať udalosť';
        // Predvyplnenie z kliknutia na "+" tlačidlo
        if (defaultLocationType && defaultLocationId) {
            eventHallAccommodationSelect.value = `${defaultLocationType}_${defaultLocationId}`;
        }
        if (defaultGameDayId) {
            eventGameDaySelect.value = defaultGameDayId;
        }
    }
    
    openModal(eventModal);
}

// Event listener pre zmenu typu udalosti v modálnom okne
eventTypeSelect.addEventListener('change', () => {
    matchFields.style.display = 'none';
    transportFields.style.display = 'none';
    accommodationFields.style.display = 'none';

    switch (eventTypeSelect.value) {
        case 'match':
            matchFields.style.display = 'block';
            break;
        case 'transport':
            transportFields.style.display = 'block';
            break;
        case 'accommodation':
            accommodationFields.style.display = 'block';
            break;
    }
});

// Event listener pre zmenu kategórie v modálnom okne zápasu
matchCategorySelect.addEventListener('change', async () => {
    const selectedCategory = matchCategorySelect.value;
    if (selectedCategory) {
        matchGroupSelect.disabled = false;
        await populateGroupSelect(matchGroupSelect, selectedCategory, allGroups);
    } else {
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
    }
});


// Spracovanie formulára udalosti
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventId = eventIdInput.value;
    const type = eventTypeSelect.value;
    const hallAccValue = eventHallAccommodationSelect.value;
    const [locationType, locationId] = hallAccValue.split('_');
    const gameDayId = eventGameDaySelect.value;
    const startTime = eventTimeInput.value;

    let eventData = {
        type: type,
        gameDayId: gameDayId,
        startTime: startTime,
        ...(locationType === 'hall' && { hallId: locationId }),
        ...(locationType === 'acc' && { accommodationId: locationId })
    };

    if (type === 'match') {
        eventData.categoryId = matchCategorySelect.value;
        eventData.groupId = matchGroupSelect.value;
        eventData.team1Id = matchTeam1Select.value;
        eventData.team2Id = matchTeam2Select.value;
        eventData.score1 = matchScore1Input.value ? parseInt(matchScore1Input.value) : null;
        eventData.score2 = matchScore2Input.value ? parseInt(matchScore2Input.value) : null;
        eventData.description = `${matchCategorySelect.options[matchCategorySelect.selectedIndex].text} - ${matchGroupSelect.options[matchGroupSelect.selectedIndex].text}`;
    } else if (type === 'transport') {
        eventData.teamId = transportTeamSelect.value;
        eventData.transportDriver = transportDriverInput.value;
        eventData.transportVehicleNo = transportVehicleNoInput.value;
        eventData.description = transportDescriptionTextarea.value;
    } else if (type === 'accommodation') {
        eventData.teamId = accommodationTeamSelect.value;
        eventData.accommodationRoom = accommodationRoomInput.value;
        eventData.description = accommodationDescriptionTextarea.value;
    }

    try {
        if (eventId) {
            // Aktualizácia existujúcej udalosti
            await updateDoc(doc(matchesCollectionRef, eventId), eventData);
            alert('Udalosť úspešne aktualizovaná!');
        } else {
            // Pridanie novej udalosti
            await addDoc(matchesCollectionRef, eventData);
            alert('Udalosť úspešne pridaná!');
        }
        closeModal(eventModal);
        await loadMatches(); // Načítaj zápasy znova
        renderGrid(); // Prekresli grid
    } catch (error) {
        console.error('Chyba pri ukladaní udalosti:', error);
        alert('Chyba pri ukladaní udalosti. Prosím, skúste znova.');
    }
});


// Event listenery pre filtrovanie
categoryFilter.addEventListener('change', async () => {
    const selectedCategory = categoryFilter.value;
    if (selectedCategory) {
        groupFilter.disabled = false;
        await populateGroupSelect(groupFilter, selectedCategory, allGroups);
    } else {
        groupFilter.innerHTML = '<option value="">-- Všetky skupiny --</option>';
        groupFilter.disabled = true;
    }
    renderGrid();
});

groupFilter.addEventListener('change', renderGrid);
gameDayFilter.addEventListener('change', renderGrid);
resetFiltersButton.addEventListener('click', () => {
    categoryFilter.value = '';
    groupFilter.innerHTML = '<option value="">-- Všetky skupiny --</option>';
    groupFilter.disabled = true;
    gameDayFilter.value = '';
    renderGrid();
});


// Správa pridávania hál, ubytovaní, dní
addHallButton.addEventListener('click', () => openModal(addHallModal));
addAccommodationButton.addEventListener('click', () => openModal(addAccommodationModal));
addGameDayButton.addEventListener('click', () => openModal(addGameDayModal));

addHallModalCloseBtn.addEventListener('click', () => closeModal(addHallModal));
addAccommodationModalCloseBtn.addEventListener('click', () => closeModal(addAccommodationModal));
addGameDayModalCloseBtn.addEventListener('click', () => closeModal(addGameDayModal));
eventModalCloseBtn.addEventListener('click', () => closeModal(eventModal));

addHallForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hallName = hallNameInput.value.trim();
    if (hallName) {
        try {
            // Pred pridaním skontrolujeme, či hala s daným názvom už neexistuje
            const existingHallDoc = await getDoc(doc(hallsCollectionRef, hallName));
            if (existingHallDoc.exists()) {
                alert('Hala s týmto názvom už existuje!');
                return;
            }

            // Pridanie haly s jej názvom ako ID dokumentu
            await setDoc(doc(hallsCollectionRef, hallName), { name: hallName, order: allHalls.length + 1 });
            alert('Hala úspešne pridaná!');
            closeModal(addHallModal);
            addHallForm.reset();
            await loadHalls();
            populateSelects(); // Aktualizuj selekty
            renderGrid(); // Prekresli grid
        } catch (error) {
            console.error('Chyba pri pridávaní haly:', error);
            alert('Chyba pri pridávaní haly. Prosím, skúste znova.');
        }
    }
});

addAccommodationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const accName = accommodationNameInput.value.trim();
    if (accName) {
        try {
            const existingAccDoc = await getDoc(doc(accommodationsCollectionRef, accName));
            if (existingAccDoc.exists()) {
                alert('Ubytovanie s týmto názvom už existuje!');
                return;
            }
            await setDoc(doc(accommodationsCollectionRef, accName), { name: accName, order: allAccommodations.length + 1 });
            alert('Ubytovanie úspešne pridané!');
            closeModal(addAccommodationModal);
            addAccommodationForm.reset();
            await loadAccommodations();
            populateSelects();
            renderGrid();
        } catch (error) {
            console.error('Chyba pri pridávaní ubytovania:', error);
            alert('Chyba pri pridávaní ubytovania. Prosím, skúste znova.');
        }
    }
});

addGameDayForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const gameDayDate = gameDayDateInput.value; // Formát YYYY-MM-DD
    if (gameDayDate) {
        try {
            const existingDayDoc = await getDoc(doc(gameDaysCollectionRef, gameDayDate));
            if (existingDayDoc.exists()) {
                alert('Hrací deň pre tento dátum už existuje!');
                return;
            }
            await setDoc(doc(gameDaysCollectionRef, gameDayDate), { date: gameDayDate, order: allGameDays.length + 1 });
            alert('Hrací deň úspešne pridaný!');
            closeModal(addGameDayModal);
            addGameDayForm.reset();
            await loadGameDays();
            populateSelects();
            renderGrid();
        } catch (error) {
            console.error('Chyba pri pridávaní hracieho dňa:', error);
            alert('Chyba pri pridávaní hracieho dňa. Prosím, skúste znova.');
        }
    }
});


// Načítanie dát a vykreslenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Inicializácia Firebase kolekcií (pre spravca-turnaja-common.js sú definované, ale tu to potrebujeme, aby fungoval firebase.firestore().collection)
    // Zistil som, že import 'db' z common.js nestačí na priame použitie firebase.firestore().collection pre nové kolekcie.
    // Musíme použiť 'db' objekt z common.js na získanie referencií na podkolekcie.
    // Tieto riadky budú aktualizované, aby používali `db` správne.

    // Pôvodné referencie na kolekcie sú definované v spravca-turnaja-common.js
    // export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
    // ... atď.
    // Pre nové kolekcie ako `halls`, `accommodations`, `gameDays`, `matches` je dobré ich tiež definovať podobne v common.js alebo tu s použitím `db`.

    // Dôležité: Uistite sa, že `db` je importované a dostupné.
    // Pretože `spravca-turnaja-common.js` už exportuje `db`, mali by sme ho použiť:
    // Ak chcete definovať nové kolekcie tu:
    // const hallsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'halls');
    // const accommodationsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'accommodations');
    // const gameDaysCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'gameDays');
    // const matchesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'matches');
    // Tieto riadky by mali byť hore, mimo `DOMContentLoaded` listenera.

    // A taktiež by sme mali aktualizovať common.js, aby exportoval aj tieto nové kolekcie, alebo
    // priamo importovať `db` objekt z common.js a použiť ho na vytvorenie referencií tu.

    // POZNÁMKA: Aktuálna implementácia `firebase.firestore().collection` priamo nebude fungovať,
    // ak nie je nainštalovaný kompletný Firebase SDK a inicializovaný Firestor.
    // Predpokladám, že common.js už inicializuje Firebase, takže stačí použiť `db` importovaný z neho.
    // Opravím to v hlavnom JS kóde pre referencie na kolekcie.

    // Znova definujem referencie na kolekcie pomocou `db` z common.js:
    Object.assign(window, { // Robím ich globálne pre jednoduchosť, ale je lepšie ich importovať
        hallsCollectionRef: collection(db, 'tournamentData', 'mainTournamentData', 'halls'),
        accommodationsCollectionRef: collection(db, 'tournamentData', 'mainTournamentData', 'accommodations'),
        gameDaysCollectionRef: collection(db, 'tournamentData', 'mainTournamentData', 'gameDays'),
        matchesCollectionRef: collection(db, 'tournamentData', 'mainTournamentData', 'matches')
    });


    await loadAllData();
    populateSelects();
    renderGrid();
});
