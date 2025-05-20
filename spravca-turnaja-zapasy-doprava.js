import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         openModal, closeModal, populateCategorySelect, populateGroupSelect,
         getDocs, query, where, addDoc, doc, getDoc } from './spravca-turnaja-common.js';

// Get references to tab buttons and content sections
const matchesTabBtn = document.getElementById('matchesTabBtn');
const hallsTabBtn = document.getElementById('hallsTabBtn');
const transportTabBtn = document.getElementById('transportTabBtn');

const matchesContentSection = document.getElementById('matchesContentSection');
const hallsContentSection = document.getElementById('hallsContentSection');
const transportContentSection = document.getElementById('transportContentSection');

// Get references to add buttons
const addMatchButton = document.getElementById('addMatchButton');
const addHallButton = document.getElementById('addHallButton');
const addTransportButton = document.getElementById('addTransportButton');

// Get references to modals and their close buttons
const matchModal = document.getElementById('matchModal');
const matchModalCloseBtn = matchModal ? matchModal.querySelector('.match-modal-close') : null;
const hallModal = document.getElementById('hallModal');
const hallModalCloseBtn = hallModal ? hallModal.querySelector('.hall-modal-close') : null;
const transportModal = document.getElementById('transportModal');
const transportModalCloseBtn = transportModal ? transportModal.querySelector('.transport-modal-close') : null;

// Get references to forms and their elements
const matchForm = document.getElementById('matchForm');
const matchCategorySelect = document.getElementById('matchCategory');
const matchGroupSelect = document.getElementById('matchGroup');
const teamASelect = document.getElementById('teamA');
const teamBSelect = document.getElementById('teamB');
const matchDateInput = document.getElementById('matchDate');
const matchTimeInput = document.getElementById('matchTime');
const matchHallSelect = document.getElementById('matchHall');

const hallForm = document.getElementById('hallForm');
const hallNameInput = document.getElementById('hallName');
const hallAddressInput = document.getElementById('hallAddress');

const transportForm = document.getElementById('transportForm');
const transportTeamSelect = document.getElementById('transportTeam');
const transportTypeInput = document.getElementById('transportType');
const transportDetailsTextarea = document.getElementById('transportDetails');

// Get references to table bodies
const matchesTableBody = document.getElementById('matchesTableBody');
const hallsTableBody = document.getElementById('hallsTableBody');
const transportTableBody = document.getElementById('transportTableBody');

// --- Helper Functions ---

// Function to populate halls dropdown (used in Match Modal)
async function populateHallSelect() {
    if (!matchHallSelect) return;
    matchHallSelect.innerHTML = '<option value="">-- Vyberte halu --</option>'; // Clear existing options

    try {
        const hallsSnapshot = await getDocs(collection(db, 'tournamentData', 'mainTournamentData', 'halls'));
        hallsSnapshot.forEach(doc => {
            const hallData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = hallData.name;
            matchHallSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating hall select:", error);
    }
}

// Function to populate teams dropdown (used in Match Modal and Transport Modal)
async function populateTeamSelect(selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>'; // Clear existing options

    try {
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        teamsSnapshot.forEach(doc => {
            const teamData = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Using club ID as value
            option.textContent = teamData.name; // Displaying team name
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating team select:", error);
    }
}


// Function to switch active tab
function switchTab(activeTabId) {
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');
    const addButtons = [addMatchButton, addHallButton, addTransportButton];

    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    addButtons.forEach(button => {
        button.style.display = 'none';
    });

    if (activeTabId === 'matches') {
        matchesContentSection.style.display = 'block';
        matchesTabBtn.classList.add('active');
        addMatchButton.style.display = 'block';
        loadMatches();
    } else if (activeTabId === 'halls') {
        hallsContentSection.style.display = 'block';
        hallsTabBtn.classList.add('active');
        addHallButton.style.display = 'block';
        loadHalls();
    } else if (activeTabId === 'transport') {
        transportContentSection.style.display = 'block';
        transportTabBtn.classList.add('active');
        addTransportButton.style.display = 'block';
        loadTransport();
    }
}

// --- Modals related functions ---

function resetMatchModal() {
    if (matchForm) matchForm.reset();
    if (matchModalTitle) matchModalTitle.textContent = 'Pridať zápas'; // Reset title for add mode
}

function resetHallModal() {
    if (hallForm) hallForm.reset();
    if (hallModalTitle) hallModalTitle.textContent = 'Pridať halu'; // Reset title for add mode
}

function resetTransportModal() {
    if (transportForm) transportForm.reset();
    if (transportModalTitle) transportModalTitle.textContent = 'Pridať dopravu'; // Reset title for add mode
}


// --- Load Data into Tables (Placeholder for now) ---

async function loadMatches() {
    if (!matchesTableBody) return;
    matchesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Načítavam zápasy...</td></tr>';
    try {
        // In a real application, you'd fetch from a 'matches' collection
        // For now, this is just a placeholder to show it's loading
        const matches = []; // Replace with actual data fetching
        // Example: const matchesSnapshot = await getDocs(collection(db, 'matches'));
        // matchesSnapshot.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));

        if (matches.length === 0) {
            matchesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Žiadne zápasy na zobrazenie.</td></tr>';
        } else {
            matchesTableBody.innerHTML = '';
            matches.forEach(match => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${match.category || ''}</td>
                    <td>${match.group || ''}</td>
                    <td>${match.teamA || ''}</td>
                    <td>${match.teamB || ''}</td>
                    <td>${match.date || ''}</td>
                    <td>${match.time || ''}</td>
                    <td>${match.hall || ''}</td>
                    <td class="actions">
                        <button class="action-button edit">Upraviť</button>
                        <button class="action-button delete">Vymazať</button>
                    </td>
                `;
                matchesTableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading matches:", error);
        matchesTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Chyba pri načítaní zápasov.</td></tr>';
    }
}

async function loadHalls() {
    if (!hallsTableBody) return;
    hallsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Načítavam haly...</td></tr>';
    try {
        const hallsSnapshot = await getDocs(collection(db, 'tournamentData', 'mainTournamentData', 'halls'));
        const halls = [];
        hallsSnapshot.forEach(doc => halls.push({ id: doc.id, ...doc.data() }));

        if (halls.length === 0) {
            hallsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Žiadne haly na zobrazenie.</td></tr>';
        } else {
            hallsTableBody.innerHTML = '';
            halls.forEach(hall => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${hall.name || ''}</td>
                    <td>${hall.address || ''}</td>
                    <td class="actions">
                        <button class="action-button edit">Upraviť</button>
                        <button class="action-button delete">Vymazať</button>
                    </td>
                `;
                hallsTableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading halls:", error);
        hallsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Chyba pri načítaní hál.</td></tr>';
    }
}

async function loadTransport() {
    if (!transportTableBody) return;
    transportTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Načítavam dopravu...</td></tr>';
    try {
        // In a real application, you'd fetch from a 'transport' collection
        const transport = []; // Replace with actual data fetching
        // Example: const transportSnapshot = await getDocs(collection(db, 'transport'));
        // transportSnapshot.forEach(doc => transport.push({ id: doc.id, ...doc.data() }));

        if (transport.length === 0) {
            transportTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Žiadna doprava na zobrazenie.</td></tr>';
        } else {
            transportTableBody.innerHTML = '';
            transport.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.teamName || ''}</td>
                    <td>${item.type || ''}</td>
                    <td>${item.details || ''}</td>
                    <td class="actions">
                        <button class="action-button edit">Upraviť</button>
                        <button class="action-button delete">Vymazať</button>
                    </td>
                `;
                transportTableBody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error("Error loading transport:", error);
        transportTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Chyba pri načítaní dopravy.</td></tr>';
    }
}

// --- Save Data Functions (Placeholder for Firebase integration) ---

async function saveMatch(event) {
    event.preventDefault();

    const categoryId = matchCategorySelect.value;
    const groupId = matchGroupSelect.value;
    const teamAId = teamASelect.value;
    const teamBId = teamBSelect.value;
    const date = matchDateInput.value;
    const time = matchTimeInput.value;
    const hallId = matchHallSelect.value;

    if (!categoryId || !groupId || !teamAId || !teamBId || !date || !time || !hallId) {
        alert('Prosím, vyplňte všetky povinné polia pre zápas!');
        return;
    }

    try {
        const teamA = await getDoc(doc(clubsCollectionRef, teamAId));
        const teamB = await getDoc(doc(clubsCollectionRef, teamBId));
        const hall = await getDoc(doc(db, 'tournamentData', 'mainTournamentData', 'halls', hallId));

        if (!teamA.exists() || !teamB.exists() || !hall.exists()) {
            alert('Vybraný tím alebo hala neexistuje. Skúste prosím znova.');
            return;
        }

        const matchData = {
            categoryId: categoryId,
            groupId: groupId,
            teamA: teamA.data().name, // Store team name for display
            teamB: teamB.data().name, // Store team name for display
            teamAId: teamAId, // Store team ID for reference
            teamBId: teamBId, // Store team ID for reference
            date: date,
            time: time,
            hallId: hallId, // Store hall ID for reference
            hallName: hall.data().name // Store hall name for display
        };

        // For now, just log and close. In a real app, you'd save to Firestore:
        // await addDoc(collection(db, 'tournamentData', 'mainTournamentData', 'matches'), matchData);
        console.log('Saving Match:', matchData);
        alert('Zápas bol úspešne uložený (simulované).');

        closeModal(matchModal);
        resetMatchModal();
        loadMatches(); // Reload matches to show the newly added one (if fetching from actual DB)
    } catch (error) {
        console.error('Error saving match:', error);
        alert('Chyba pri ukladaní zápasu! Prosím, skúste znova.');
    }
}

async function saveHall(event) {
    event.preventDefault();

    const hallName = hallNameInput.value.trim();
    const hallAddress = hallAddressInput.value.trim();

    if (!hallName) {
        alert('Prosím, zadajte názov haly!');
        return;
    }

    try {
        // Save to Firebase 'halls' collection
        await addDoc(collection(db, 'tournamentData', 'mainTournamentData', 'halls'), {
            name: hallName,
            address: hallAddress
        });
        console.log('Saving Hall:', { name: hallName, address: hallAddress });
        alert('Hala bola úspešne uložená.');

        closeModal(hallModal);
        resetHallModal();
        loadHalls(); // Reload halls to show the newly added one
    } catch (error) {
        console.error('Error saving hall:', error);
        alert('Chyba pri ukladaní haly! Prosím, skúste znova.');
    }
}

async function saveTransport(event) {
    event.preventDefault();

    const teamId = transportTeamSelect.value;
    const transportType = transportTypeInput.value.trim();
    const transportDetails = transportDetailsTextarea.value.trim();

    if (!teamId || !transportType) {
        alert('Prosím, vyplňte tím a typ dopravy!');
        return;
    }

    try {
        const teamDoc = await getDoc(doc(clubsCollectionRef, teamId));
        if (!teamDoc.exists()) {
            alert('Vybraný tím neexistuje. Skúste prosím znova.');
            return;
        }

        const transportData = {
            teamId: teamId,
            teamName: teamDoc.data().name, // Store team name for display
            type: transportType,
            details: transportDetails
        };

        // For now, just log and close. In a real app, you'd save to Firestore:
        // await addDoc(collection(db, 'tournamentData', 'mainTournamentData', 'transport'), transportData);
        console.log('Saving Transport:', transportData);
        alert('Doprava bola úspešne uložená (simulované).');

        closeModal(transportModal);
        resetTransportModal();
        loadTransport(); // Reload transport to show the newly added one (if fetching from actual DB)
    } catch (error) {
        console.error('Error saving transport:', error);
        alert('Chyba pri ukladaní dopravy! Prosím, skúste znova.');
    }
}


// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Initial load: show matches section
    switchTab('matches');

    // Add event listeners for tab buttons
    if (matchesTabBtn) matchesTabBtn.addEventListener('click', () => switchTab('matches'));
    if (hallsTabBtn) hallsTabBtn.addEventListener('click', () => switchTab('halls'));
    if (transportTabBtn) transportTabBtn.addEventListener('click', () => switchTab('transport'));

    // Add event listeners for '+' buttons
    if (addMatchButton) {
        addMatchButton.addEventListener('click', async () => {
            resetMatchModal();
            openModal(matchModal);
            await populateCategorySelect(matchCategorySelect);
            await populateHallSelect();
            await populateTeamSelect(teamASelect);
            await populateTeamSelect(teamBSelect);

            // Populate groups based on selected category in match modal
            if (matchCategorySelect) {
                matchCategorySelect.addEventListener('change', async () => {
                    await populateGroupSelect(matchGroupSelect, matchCategorySelect.value);
                    await populateTeamSelect(teamASelect); // Teams are tied to categories/groups, might need refinement
                    await populateTeamSelect(teamBSelect); // Teams are tied to categories/groups, might need refinement
                });
            }
        });
    }

    if (addHallButton) {
        addHallButton.addEventListener('click', () => {
            resetHallModal();
            openModal(hallModal);
        });
    }

    if (addTransportButton) {
        addTransportButton.addEventListener('click', async () => {
            resetTransportModal();
            openModal(transportModal);
            await populateTeamSelect(transportTeamSelect);
        });
    }

    // Add event listeners for modal close buttons
    if (matchModalCloseBtn) matchModalCloseBtn.addEventListener('click', () => closeModal(matchModal));
    if (hallModalCloseBtn) hallModalCloseBtn.addEventListener('click', () => closeModal(hallModal));
    if (transportModalCloseBtn) transportModalCloseBtn.addEventListener('click', () => closeModal(transportModal));

    // Close modals when clicking outside the content
    [matchModal, hallModal, transportModal].forEach(modal => {
        if (modal) {
            window.addEventListener('click', (event) => {
                const modalContent = modal.querySelector('.modal-content');
                if (event.target === modal && modalContent && !modalContent.contains(event.target)) {
                    closeModal(modal);
                    // Reset forms on outside click close as well
                    if (modal.id === 'matchModal') resetMatchModal();
                    else if (modal.id === 'hallModal') resetHallModal();
                    else if (modal.id === 'transportModal') resetTransportModal();
                }
            });
        }
    });

    // Add event listeners for form submissions
    if (matchForm) matchForm.addEventListener('submit', saveMatch);
    if (hallForm) hallForm.addEventListener('submit', saveHall);
    if (transportForm) transportForm.addEventListener('submit', saveTransport);

    // Initial population of data
    loadHalls(); // Load halls once on page load as it's needed for match creation
});
