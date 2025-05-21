import {
    db,
    categoriesCollectionRef,
    groupsCollectionRef,
    clubsCollectionRef, // Predpokladáme, že 'clubs' sú tímy
    matchesCollectionRef,
    playingDaysCollectionRef,
    sportHallsCollectionRef,
    busesCollectionRef,
    openModal,
    closeModal,
    getDocs,
    doc,
    setDoc,
    addDoc,
    getDoc,
    query,
    where,
    orderBy,
    deleteDoc,
    writeBatch
} from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Referencie na HTML elementy
    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions');
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addSportHallButton = document.getElementById('addSportHallButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton');

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchCategorySelect = document.getElementById('matchCategorySelect');
    const matchGroupSelect = document.getElementById('matchGroupSelect');
    const matchTeamASelect = document.getElementById('matchTeamASelect');
    const matchTeamBSelect = document.getElementById('matchTeamBSelect');
    const matchResultInput = document.getElementById('matchResultInput');
    const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
    const matchHallSelect = document.getElementById('matchHallSelect');
    const matchTimeInput = document.getElementById('matchTimeInput');
    const matchNotesInput = document.getElementById('matchNotesInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayNameInput = document.getElementById('playingDayNameInput');
    const playingDayDateInput = document.getElementById('playingDayDateInput');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    // Modálne okno pre športovú halu
    const sportHallModal = document.getElementById('sportHallModal');
    const closeSportHallModalButton = document.getElementById('closeSportHallModal');
    const sportHallForm = document.getElementById('sportHallForm');
    const hallIdInput = document.getElementById('hallId');
    const hallNameInput = document.getElementById('hallNameInput');
    const hallAddressInput = document.getElementById('hallAddressInput');
    const hallGoogleMapsUrlInput = document.getElementById('hallGoogleMapsUrlInput');
    const deleteHallButtonModal = document.getElementById('deleteHallButtonModal');

    // Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busNameInput = document.getElementById('busNameInput');
    // NOVÉ: Referencia na kontajner pre tímy v autobuse
    const teamsForBusContainer = document.getElementById('teamsForBusContainer');
    // NOVÉ: Referencia na tlačidlo pre pridanie tímu do autobusu
    const addTeamToBusButton = document.getElementById('addTeamToBusButton');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    // Filtre pre zápasy
    const categoryFilter = document.getElementById('categoryFilter');
    const groupFilter = document.getElementById('groupFilter');
    const playingDayFilter = document.getElementById('playingDayFilter');
    const teamFilter = document.getElementById('teamFilter');
    const hallFilter = document.getElementById('hallFilter');

    // --- Všeobecné funkcie pre modálne okná ---
    // Tieto funkcie sú importované zo spravca-turnaja-common.js,
    // takže tu ich už nepotrebujeme definovať, len ich používame.

    // --- Pomocná funkcia na plnenie select elementov z Firestore ---
    // Táto funkcia je generickejšia a nahradí pôvodné populateCategorySelect/populateGroupSelect pre dynamické selecty
    async function populateSelectWithFirestoreData(selectElement, collectionOrQueryRef, valueField, initialValue = null) {
        selectElement.innerHTML = '<option value="">-- Vyberte --</option>';
        try {
            const snapshot = await getDocs(collectionOrQueryRef);
            snapshot.forEach(doc => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = data[valueField];
                selectElement.appendChild(option);
            });
            if (initialValue) {
                selectElement.value = initialValue;
            }
        } catch (error) {
            console.error(`Chyba pri plnení selectu pre ${selectElement.id}:`, error);
        }
    }

    // --- NOVÉ: Funkcia na vytvorenie a pridanie riadku pre výber tímu do autobusu ---
    async function addTeamSelectionRow(initialTeam = null) {
        // Generujeme unikátne ID pre riadok a jeho elementy
        const rowId = `team-row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const rowDiv = document.createElement('div');
        rowDiv.id = rowId;
        // Tailwind triedy pre responzívne rozloženie a štýlovanie
        rowDiv.className = 'team-selection-row flex flex-col sm:flex-row gap-2 items-end p-3 border border-gray-200 rounded-md bg-white shadow-sm';

        rowDiv.innerHTML = `
            <div class="form-group flex-1 w-full">
                <label for="${rowId}-category" class="block text-gray-700 text-sm font-bold mb-1">Kategória:</label>
                <select id="${rowId}-category" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></select>
            </div>
            <div class="form-group flex-1 w-full">
                <label for="${rowId}-group" class="block text-gray-700 text-sm font-bold mb-1">Skupina:</label>
                <select id="${rowId}-group" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled></select>
            </div>
            <div class="form-group flex-1 w-full">
                <label for="${rowId}-team-index" class="block text-gray-700 text-sm font-bold mb-1">Číslo tímu v skupine:</label>
                <input type="number" id="${rowId}-team-index" min="1" class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Napr. 1" disabled>
            </div>
            <div class="form-group flex-1 w-full">
                <label class="block text-gray-700 text-sm font-bold mb-1">Názov tímu:</label>
                <span id="${rowId}-team-name-display" class="block w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 min-h-[42px] flex items-center"></span>
            </div>
            <button type="button" class="remove-team-row-button bg-red-500 text-white p-2 rounded-md hover:bg-red-600 self-center transition duration-150 ease-in-out shadow-md">Odstrániť</button>
        `;
        teamsForBusContainer.appendChild(rowDiv);

        const categorySelect = rowDiv.querySelector(`#${rowId}-category`);
        const groupSelect = rowDiv.querySelector(`#${rowId}-group`);
        const teamIndexInput = rowDiv.querySelector(`#${rowId}-team-index`);
        const teamNameDisplay = rowDiv.querySelector(`#${rowId}-team-name-display`);
        const removeButton = rowDiv.querySelector('.remove-team-row-button');

        // Naplnenie kategórií
        await populateSelectWithFirestoreData(categorySelect, categoriesCollectionRef, 'name');

        // Listener pre zmenu kategórie
        categorySelect.addEventListener('change', async () => {
            groupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            teamNameDisplay.textContent = '';
            teamIndexInput.value = '';
            groupSelect.disabled = true;
            teamIndexInput.disabled = true;
            rowDiv.dataset.teamId = '';
            rowDiv.dataset.teamName = '';

            const categoryId = categorySelect.value;
            if (categoryId) {
                const q = query(groupsCollectionRef, where("categoryId", "==", categoryId));
                await populateSelectWithFirestoreData(groupSelect, q, 'name');
                groupSelect.disabled = false;
            }
        });

        // Listener pre zmenu skupiny
        groupSelect.addEventListener('change', () => {
            teamNameDisplay.textContent = '';
            teamIndexInput.value = '';
            teamIndexInput.disabled = !groupSelect.value;
            rowDiv.dataset.teamId = '';
            rowDiv.dataset.teamName = '';
        });

        // Listener pre zmenu čísla tímu v skupine
        teamIndexInput.addEventListener('input', async () => {
            const categoryId = categorySelect.value;
            const groupId = groupSelect.value;
            const teamIndex = parseInt(teamIndexInput.value);

            teamNameDisplay.textContent = 'Načítavam...';
            rowDiv.dataset.teamId = '';
            rowDiv.dataset.teamName = '';

            if (categoryId && groupId && teamIndex > 0) {
                try {
                    // Načítame všetky tímy pre danú skupinu
                    const q = query(clubsCollectionRef, where("groupId", "==", groupId));
                    const querySnapshot = await getDocs(q);
                    const teamsInGroup = [];
                    querySnapshot.forEach(doc => {
                        teamsInGroup.push({ id: doc.id, ...doc.data() });
                    });

                    // Zoraďte tímy podľa názvu pre konzistentné indexovanie (1-based)
                    teamsInGroup.sort((a, b) => a.name.localeCompare(b.name));

                    if (teamIndex <= teamsInGroup.length) {
                        const selectedTeam = teamsInGroup[teamIndex - 1]; // -1 pretože index je 1-based
                        teamNameDisplay.textContent = selectedTeam.name;
                        rowDiv.dataset.teamId = selectedTeam.id; // Uložíme ID tímu na riadok
                        rowDiv.dataset.teamName = selectedTeam.name; // Uložíme názov tímu na riadok
                    } else {
                        teamNameDisplay.textContent = 'Tím s týmto číslom neexistuje v skupine.';
                    }
                } catch (error) {
                    console.error("Chyba pri načítaní tímu podľa indexu:", error);
                    teamNameDisplay.textContent = 'Chyba pri načítaní tímu.';
                }
            } else {
                teamNameDisplay.textContent = '';
            }
        });

        // Listener pre tlačidlo "Odstrániť" riadok
        removeButton.addEventListener('click', () => {
            rowDiv.remove();
        });

        // Ak sú k dispozícii počiatočné údaje tímu (pri editácii), predvyplníme polia
        if (initialTeam) {
            // Nastavíme hodnotu kategórie a spustíme udalosť 'change' na naplnenie skupín
            categorySelect.value = initialTeam.categoryId;
            await categorySelect.dispatchEvent(new Event('change'));

            // Počkajte, kým sa skupiny naplnia, potom nastavte hodnotu skupiny a spustite 'change'
            // Používame setTimeout, aby sme dali DOMu čas na aktualizáciu po prvom 'change' evente
            setTimeout(async () => {
                groupSelect.value = initialTeam.groupId;
                await groupSelect.dispatchEvent(new Event('change'));

                // Nastavíme hodnotu indexu tímu a spustíme udalosť 'input' na zobrazenie názvu tímu
                teamIndexInput.value = initialTeam.teamIndex;
                await teamIndexInput.dispatchEvent(new Event('input'));

                // Uložíme ID a názov tímu priamo na riadok pre prípad, že input event sa nevyvolá správne
                rowDiv.dataset.teamId = initialTeam.id;
                rowDiv.dataset.teamName = initialTeam.name;
                teamNameDisplay.textContent = initialTeam.name; // Zabezpečíme zobrazenie názvu
            }, 100); // Krátka pauza
        }
    }

    // --- Event Listener pre tlačidlo "Pridať tím do autobusu" ---
    addTeamToBusButton.addEventListener('click', () => {
        addTeamSelectionRow();
    });

    // --- Spracovanie formulára pre autobus (UPRAVENÉ) ---
    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const busId = busIdInput.value;
        const name = busNameInput.value.trim();
        const startLocationId = busStartLocationSelect.value;
        const startTime = busStartTimeInput.value;
        const endLocationId = busEndLocationSelect.value;
        const endTime = busEndTimeInput.value;
        const notes = busNotesInput.value.trim();

        // NOVÉ: Zozbierame tímy z dynamicky pridaných riadkov
        const teams = [];
        const teamRows = teamsForBusContainer.querySelectorAll('.team-selection-row');
        for (const row of teamRows) {
            const teamId = row.dataset.teamId;
            const teamName = row.dataset.teamName;
            const categoryId = row.querySelector('select[id$="-category"]').value;
            const groupId = row.querySelector('select[id$="-group"]').value;
            const teamIndex = parseInt(row.querySelector('input[id$="-team-index"]').value);

            // Validácia, či je riadok tímu kompletne vyplnený a platný
            if (!teamId || !teamName || !categoryId || !groupId || !teamIndex) {
                showMessageModal('Prosím, dokončite výber všetkých tímov alebo odstráňte neúplné riadky pred uložením.');
                return; // Zastaví odoslanie formulára
            }
            teams.push({
                id: teamId,
                name: teamName,
                categoryId: categoryId,
                groupId: groupId,
                teamIndex: teamIndex
            });
        }

        if (!name || !startLocationId || !startTime || !endLocationId || !endTime || teams.length === 0) {
            showMessageModal('Prosím, vyplňte všetky povinné polia pre autobus a pridajte aspoň jeden tím.');
            return;
        }

        try {
            const busData = {
                name,
                teams, // NOVÉ: Pole objektov tímov
                startLocationId,
                startTime,
                endLocationId,
                endTime,
                notes,
                createdAt: busId ? (await getDoc(doc(busesCollectionRef, busId))).data().createdAt : new Date(),
                updatedAt: new Date()
            };

            if (busId) {
                await setDoc(doc(busesCollectionRef, busId), busData);
                showMessageModal('Autobus úspešne aktualizovaný!');
            } else {
                await addDoc(busesCollectionRef, busData);
                showMessageModal('Autobus úspešne pridaný!');
            }
            closeModal(busModal);
            await displayBuses(); // Aktualizovať zoznam autobusov
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh, ak je to potrebné
        } catch (error) {
            console.error("Chyba pri ukladaní autobusu: ", error);
            showMessageModal("Chyba pri ukladaní autobusu. Pozrite konzolu pre detaily.");
        }
    });

    // --- Funkcia na zobrazenie autobusov (UPRAVENÁ) ---
    async function displayBuses() {
        const busesContainer = document.getElementById('busesContainer');
        busesContainer.innerHTML = '<h3 class="text-xl font-bold mb-4">Autobusy</h3>'; // Vyčistíme predchádzajúci obsah
        try {
            const q = query(busesCollectionRef, orderBy("name")); // Zoradíme podľa názvu
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                busesContainer.innerHTML += '<p class="text-gray-600">Žiadne autobusy zatiaľ pridané.</p>';
                return;
            }

            const busesList = document.createElement('ul');
            busesList.className = 'space-y-4'; // Tailwind pre medzery medzi položkami

            for (const busDoc of querySnapshot.docs) {
                const bus = busDoc.data();
                const busId = busDoc.id;

                // Načítame názvy hál pre lepšie zobrazenie
                const startHallDoc = await getDoc(doc(sportHallsCollectionRef, bus.startLocationId));
                const startHall = startHallDoc.exists() ? startHallDoc.data().name : 'Neznáma hala';
                
                const endHallDoc = await getDoc(doc(sportHallsCollectionRef, bus.endLocationId));
                const endHall = endHallDoc.exists() ? endHallDoc.data().name : 'Neznáma hala';

                // Zobrazenie tímov priradených k autobusu
                const teamsDisplay = bus.teams && bus.teams.length > 0
                    ? bus.teams.map(team => team.name).join(', ')
                    : 'Žiadne tímy priradené';

                const listItem = document.createElement('li');
                listItem.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
                listItem.innerHTML = `
                    <div class="flex-1">
                        <strong class="text-lg text-blue-700">${bus.name}</strong><br>
                        <span class="text-sm text-gray-600">Tímy: ${teamsDisplay}</span><br>
                        <span class="text-sm text-gray-600">Odchod: ${startHall} (${bus.startTime})</span><br>
                        <span class="text-sm text-gray-600">Príchod: ${endHall} (${bus.endTime})</span><br>
                        <span class="text-sm text-gray-600">Poznámky: ${bus.notes || 'žiadne'}</span>
                    </div>
                    <div class="flex gap-2 mt-3 sm:mt-0">
                        <button class="edit-bus-button bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-150 ease-in-out shadow-sm" data-id="${busId}">Upraviť</button>
                        <button class="delete-bus-button bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-150 ease-in-out shadow-sm" data-id="${busId}">Vymazať</button>
                    </div>
                `;
                busesList.appendChild(listItem);
            }
            busesContainer.appendChild(busesList);

            // Pridanie event listenerov pre tlačidlá Upraviť/Vymazať
            busesContainer.querySelectorAll('.edit-bus-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const busId = e.target.dataset.id;
                    await editBus(busId);
                });
            });

            busesContainer.querySelectorAll('.delete-bus-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const busId = e.target.dataset.id;
                    await confirmAndDeleteBus(busId);
                });
            });

        } catch (error) {
            console.error("Chyba pri načítaní autobusov: ", error);
            busesContainer.innerHTML += '<p class="text-red-500">Chyba pri načítaní autobusov.</p>';
        }
    }

    // --- Funkcia na editáciu autobusu (UPRAVENÁ) ---
    async function editBus(busId) {
        try {
            const busDocRef = doc(busesCollectionRef, busId);
            const busDocSnap = await getDoc(busDocRef);

            if (busDocSnap.exists()) {
                const bus = busDocSnap.data();
                busIdInput.value = busId;
                busNameInput.value = bus.name;
                busStartLocationSelect.value = bus.startLocationId;
                busStartTimeInput.value = bus.startTime;
                busEndLocationSelect.value = bus.endLocationId;
                busEndTimeInput.value = bus.endTime;
                busNotesInput.value = bus.notes;

                // Vyčistíme existujúce riadky tímov
                teamsForBusContainer.innerHTML = '';

                // Pridáme riadky pre existujúce tímy
                if (bus.teams && bus.teams.length > 0) {
                    for (const team of bus.teams) {
                        await addTeamSelectionRow(team); // `team` objekt obsahuje id, name, categoryId, groupId, teamIndex
                    }
                } else {
                    // Ak autobus nemá žiadne tímy, pridáme prázdny riadok pre nový výber
                    addTeamSelectionRow();
                }

                // Naplníme selecty pre miesta odchodu/príchodu
                await populateSelectWithFirestoreData(busStartLocationSelect, sportHallsCollectionRef, 'name', bus.startLocationId);
                await populateSelectWithFirestoreData(busEndLocationSelect, sportHallsCollectionRef, 'name', bus.endLocationId);


                deleteBusButtonModal.style.display = 'inline-block'; // Zobrazíme tlačidlo vymazať
                openModal(busModal);
            } else {
                showMessageModal('Autobus nenájdený.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní autobusu na úpravu: ", error);
            showMessageModal("Chyba pri načítaní autobusu na úpravu. Pozrite konzolu pre detaily.");
        }
    }

    // --- Funkcia na potvrdenie a vymazanie autobusu ---
    async function confirmAndDeleteBus(busId) {
        showConfirmModal('Naozaj chcete vymazať tento autobus?', async () => {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                showMessageModal('Autobus úspešne vymazaný!');
                closeModal(busModal); // Zatvoríme modálne okno, ak je otvorené
                await displayBuses();
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh, ak je to potrebné
            } catch (error) {
                console.error("Chyba pri mazaní autobusu: ", error);
                showMessageModal("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
            }
        });
    }

    // --- Vlastné modálne okná pre správy a potvrdenia (namiesto alert/confirm) ---
    function showMessageModal(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <p class="mb-4 text-lg font-semibold">${message}</p>
                <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-150 ease-in-out" onclick="this.closest('.fixed').remove()">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function showConfirmModal(message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <p class="mb-6 text-lg font-semibold">${message}</p>
                <div class="flex justify-center gap-4">
                    <button id="confirmYes" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-150 ease-in-out">Áno</button>
                    <button id="confirmNo" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition duration-150 ease-in-out">Nie</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#confirmYes').addEventListener('click', () => {
            onConfirm();
            modal.remove();
        });
        modal.querySelector('#confirmNo').addEventListener('click', () => {
            modal.remove();
        });
    }

    // --- Event Listenery pre hlavné tlačidlá ---
    addButton.addEventListener('click', () => {
        addOptions.classList.toggle('show');
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayIdInput.value = '';
        playingDayForm.reset();
        deletePlayingDayButtonModal.style.display = 'none';
        openModal(playingDayModal);
        addOptions.classList.remove('show');
    });

    addSportHallButton.addEventListener('click', () => {
        hallIdInput.value = '';
        sportHallForm.reset();
        deleteHallButtonModal.style.display = 'none';
        openModal(sportHallModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        matchIdInput.value = '';
        matchForm.reset();
        deleteMatchButtonModal.style.display = 'none';
        // Naplnenie selectov pri otváraní modálu zápasu
        await populateSelectWithFirestoreData(matchCategorySelect, categoriesCollectionRef, 'name');
        await populateSelectWithFirestoreData(matchPlayingDaySelect, playingDaysCollectionRef, 'name');
        await populateSelectWithFirestoreData(matchHallSelect, sportHallsCollectionRef, 'name');
        
        // Resetovanie skupín a tímov
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchTeamASelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchTeamBSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';

        openModal(matchModal);
        addOptions.classList.remove('show');
    });

    // --- NOVÉ: Event Listener pre "Pridať autobus" ---
    addBusButton.addEventListener('click', async () => {
        busIdInput.value = ''; // Vyčistíme ID pre nový autobus
        busForm.reset(); // Resetujeme polia formulára
        teamsForBusContainer.innerHTML = ''; // Vyčistíme predchádzajúce riadky tímov
        await addTeamSelectionRow(); // Pridáme jeden prázdny riadok pre výber tímu
        deleteBusButtonModal.style.display = 'none'; // Skryjeme tlačidlo vymazať pre nový autobus
        
        // Naplníme selecty pre miesta odchodu/príchodu
        await populateSelectWithFirestoreData(busStartLocationSelect, sportHallsCollectionRef, 'name');
        await populateSelectWithFirestoreData(busEndLocationSelect, sportHallsCollectionRef, 'name');

        openModal(busModal);
        addOptions.classList.remove('show');
    });

    // --- Event Listenery pre zatváranie modálnych okien ---
    closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));
    closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));
    closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));
    closeBusModalButton.addEventListener('click', () => closeModal(busModal));

    // --- Spracovanie formulára pre hrací deň ---
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playingDayId = playingDayIdInput.value;
        const name = playingDayNameInput.value.trim();
        const date = playingDayDateInput.value;

        if (!name || !date) {
            showMessageModal('Prosím, vyplňte všetky polia (Názov dňa, Dátum).');
            return;
        }

        try {
            const playingDayData = {
                name: name,
                date: date,
                createdAt: playingDayId ? (await getDoc(doc(playingDaysCollectionRef, playingDayId))).data().createdAt : new Date(),
                updatedAt: new Date()
            };

            if (playingDayId) {
                await setDoc(doc(playingDaysCollectionRef, playingDayId), playingDayData);
                showMessageModal('Hrací deň úspešne aktualizovaný!');
            } else {
                // Kontrola duplicity názvu
                const q = query(playingDaysCollectionRef, where("name", "==", name));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    showMessageModal('Hrací deň s týmto názvom už existuje!');
                    return;
                }
                await addDoc(playingDaysCollectionRef, playingDayData);
                showMessageModal('Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await displayPlayingDays();
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            showMessageModal("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // --- Spracovanie formulára pre športovú halu ---
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hallId = hallIdInput.value;
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

        if (!name || !address || !googleMapsUrl) {
            showMessageModal('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validácia formátu URL
        } catch (_) {
            showMessageModal('Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const hallData = {
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: hallId ? (await getDoc(doc(sportHallsCollectionRef, hallId))).data().createdAt : new Date(),
                updatedAt: new Date()
            };

            if (hallId) {
                await setDoc(doc(sportHallsCollectionRef, hallId), hallData);
                showMessageModal('Športová hala úspešne aktualizovaná!');
            } else {
                // Kontrola duplicity názvu
                const q = query(sportHallsCollectionRef, where("name", "==", name));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    showMessageModal('Športová hala s týmto názvom už existuje!');
                    return;
                }
                await addDoc(sportHallsCollectionRef, hallData);
                showMessageModal('Športová hala úspešne pridaná!');
            }
            closeModal(sportHallModal);
            await displaySportHalls();
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            showMessageModal("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });

    // --- Spracovanie formulára pre zápas ---
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchId = matchIdInput.value;
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        const teamAId = matchTeamASelect.value;
        const teamBId = matchTeamBSelect.value;
        const result = matchResultInput.value.trim();
        const playingDayId = matchPlayingDaySelect.value;
        const hallId = matchHallSelect.value;
        const time = matchTimeInput.value;
        const notes = matchNotesInput.value.trim();

        if (!categoryId || !groupId || !teamAId || !teamBId || !playingDayId || !hallId || !time) {
            showMessageModal('Prosím, vyplňte všetky povinné polia pre zápas.');
            return;
        }

        if (teamAId === teamBId) {
            showMessageModal('Tímy A a B nemôžu byť rovnaké.');
            return;
        }

        try {
            const matchData = {
                categoryId,
                groupId,
                teamAId,
                teamBId,
                result: result || null, // Ak je prázdny, uložíme null
                playingDayId,
                hallId,
                time,
                notes,
                createdAt: matchId ? (await getDoc(doc(matchesCollectionRef, matchId))).data().createdAt : new Date(),
                updatedAt: new Date()
            };

            if (matchId) {
                await setDoc(doc(matchesCollectionRef, matchId), matchData);
                showMessageModal('Zápas úspešne aktualizovaný!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                showMessageModal('Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            showMessageModal("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    // --- Funkcie pre zobrazenie a editáciu zápasov, hracích dní, hál ---
    // Tieto funkcie sú dlhé a predpokladám, že už existujú alebo budú upravené
    // v spravca-turnaja-common.js alebo tu.
    // Zahrnul som len tie, ktoré sú priamo ovplyvnené zmenami (displayBuses, editBus, confirmAndDeleteBus).

    // --- Funkcia na zobrazenie hracích dní ---
    async function displayPlayingDays() {
        const playingDaysContainer = document.getElementById('playingDaysContainer');
        playingDaysContainer.innerHTML = '<h3 class="text-xl font-bold mb-4">Hracie dni</h3>';
        try {
            const q = query(playingDaysCollectionRef, orderBy("date"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                playingDaysContainer.innerHTML += '<p class="text-gray-600">Žiadne hracie dni zatiaľ pridané.</p>';
                return;
            }

            const playingDaysList = document.createElement('ul');
            playingDaysList.className = 'space-y-4';

            for (const docSnapshot of querySnapshot.docs) {
                const playingDay = docSnapshot.data();
                const playingDayId = docSnapshot.id;

                const listItem = document.createElement('li');
                listItem.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
                listItem.innerHTML = `
                    <div class="flex-1">
                        <strong class="text-lg text-blue-700">${playingDay.name}</strong><br>
                        <span class="text-sm text-gray-600">Dátum: ${playingDay.date}</span>
                    </div>
                    <div class="flex gap-2 mt-3 sm:mt-0">
                        <button class="edit-playing-day-button bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-150 ease-in-out shadow-sm" data-id="${playingDayId}">Upraviť</button>
                        <button class="delete-playing-day-button bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-150 ease-in-out shadow-sm" data-id="${playingDayId}">Vymazať</button>
                    </div>
                `;
                playingDaysList.appendChild(listItem);
            }
            playingDaysContainer.appendChild(playingDaysList);

            playingDaysContainer.querySelectorAll('.edit-playing-day-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await editPlayingDay(id);
                });
            });

            playingDaysContainer.querySelectorAll('.delete-playing-day-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await confirmAndDeletePlayingDay(id);
                });
            });
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní: ", error);
            playingDaysContainer.innerHTML += '<p class="text-red-500">Chyba pri načítaní hracích dní.</p>';
        }
    }

    // Funkcia na editáciu hracieho dňa
    async function editPlayingDay(playingDayId) {
        try {
            const docRef = doc(playingDaysCollectionRef, playingDayId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const playingDay = docSnap.data();
                playingDayIdInput.value = playingDayId;
                playingDayNameInput.value = playingDay.name;
                playingDayDateInput.value = playingDay.date;
                deletePlayingDayButtonModal.style.display = 'inline-block';
                openModal(playingDayModal);
            } else {
                showMessageModal('Hrací deň nenájdený.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracieho dňa na úpravu: ", error);
            showMessageModal("Chyba pri načítaní hracieho dňa na úpravu. Pozrite konzolu pre detaily.");
        }
    }

    // Funkcia na potvrdenie a vymazanie hracieho dňa
    async function confirmAndDeletePlayingDay(playingDayId) {
        showConfirmModal('Naozaj chcete vymazať tento hrací deň? Vymažú sa aj všetky súvisiace zápasy!', async () => {
            try {
                const batch = writeBatch(db);

                // Vymazať súvisiace zápasy
                const matchesQuery = query(matchesCollectionRef, where("playingDayId", "==", playingDayId));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.forEach(matchDoc => {
                    batch.delete(matchDoc.ref);
                });

                // Vymazať hrací deň
                batch.delete(doc(playingDaysCollectionRef, playingDayId));
                await batch.commit();

                showMessageModal('Hrací deň a súvisiace zápasy úspešne vymazané!');
                closeModal(playingDayModal);
                await displayPlayingDays();
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní hracieho dňa: ", error);
                showMessageModal("Chyba pri mazaní hracieho dňa. Pozrite konzolu pre detaily.");
            }
        });
    }

    // Funkcia na zobrazenie športových hál
    async function displaySportHalls() {
        const sportHallsContainer = document.getElementById('sportHallsContainer');
        sportHallsContainer.innerHTML = '<h3 class="text-xl font-bold mb-4">Športové haly</h3>';
        try {
            const q = query(sportHallsCollectionRef, orderBy("name"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                sportHallsContainer.innerHTML += '<p class="text-gray-600">Žiadne športové haly zatiaľ pridané.</p>';
                return;
            }

            const hallsList = document.createElement('ul');
            hallsList.className = 'space-y-4';

            for (const docSnapshot of querySnapshot.docs) {
                const hall = docSnapshot.data();
                const hallId = docSnapshot.id;

                const listItem = document.createElement('li');
                listItem.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
                listItem.innerHTML = `
                    <div class="flex-1">
                        <strong class="text-lg text-blue-700">${hall.name}</strong><br>
                        <span class="text-sm text-gray-600">Adresa: ${hall.address}</span><br>
                        <a href="${hall.googleMapsUrl}" target="_blank" class="text-blue-500 hover:underline text-sm">Zobraziť na Google Maps</a>
                    </div>
                    <div class="flex gap-2 mt-3 sm:mt-0">
                        <button class="edit-hall-button bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-150 ease-in-out shadow-sm" data-id="${hallId}">Upraviť</button>
                        <button class="delete-hall-button bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-150 ease-in-out shadow-sm" data-id="${hallId}">Vymazať</button>
                    </div>
                `;
                hallsList.appendChild(listItem);
            }
            sportHallsContainer.appendChild(hallsList);

            sportHallsContainer.querySelectorAll('.edit-hall-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await editSportHall(id);
                });
            });

            sportHallsContainer.querySelectorAll('.delete-hall-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await confirmAndDeleteSportHall(id);
                });
            });
        } catch (error) {
            console.error("Chyba pri načítaní športových hál: ", error);
            sportHallsContainer.innerHTML += '<p class="text-red-500">Chyba pri načítaní športových hál.</p>';
        }
    }

    // Funkcia na editáciu športovej haly
    async function editSportHall(hallId) {
        try {
            const docRef = doc(sportHallsCollectionRef, hallId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const hall = docSnap.data();
                hallIdInput.value = hallId;
                hallNameInput.value = hall.name;
                hallAddressInput.value = hall.address;
                hallGoogleMapsUrlInput.value = hall.googleMapsUrl;
                deleteHallButtonModal.style.display = 'inline-block';
                openModal(sportHallModal);
            } else {
                showMessageModal('Športová hala nenájdená.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní športovej haly na úpravu: ", error);
            showMessageModal("Chyba pri načítaní športovej haly na úpravu. Pozrite konzolu pre detaily.");
        }
    }

    // Funkcia na potvrdenie a vymazanie športovej haly
    async function confirmAndDeleteSportHall(hallId) {
        showConfirmModal('Naozaj chcete vymazať túto športovú halu? Vymažú sa aj všetky súvisiace zápasy a autobusy!', async () => {
            try {
                const batch = writeBatch(db);

                // Vymazať súvisiace zápasy
                const matchesQuery = query(matchesCollectionRef, where("hallId", "==", hallId));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.forEach(matchDoc => {
                    batch.delete(matchDoc.ref);
                });

                // Vymazať súvisiace autobusy
                const busesQuery = query(busesCollectionRef, where("startLocationId", "==", hallId));
                const busesSnapshot = await getDocs(busesQuery);
                busesSnapshot.forEach(busDoc => {
                    batch.delete(busDoc.ref);
                });

                const busesEndQuery = query(busesCollectionRef, where("endLocationId", "==", hallId));
                const busesEndSnapshot = await getDocs(busesEndQuery);
                busesEndSnapshot.forEach(busDoc => {
                    batch.delete(busDoc.ref);
                });

                // Vymazať halu
                batch.delete(doc(sportHallsCollectionRef, hallId));
                await batch.commit();

                showMessageModal('Športová hala a súvisiace zápasy/autobusy úspešne vymazané!');
                closeModal(sportHallModal);
                await displaySportHalls();
                await displayMatchesAsSchedule();
                await displayBuses(); // Aktualizovať aj autobusy, lebo sa mohli zmazať
            } catch (error) {
                console.error("Chyba pri mazaní športovej haly: ", error);
                showMessageModal("Chyba pri mazaní športovej haly. Pozrite konzolu pre detaily.");
            }
        });
    }

    // --- Funkcia na zobrazenie zápasov ako rozvrhu (UPRAVENÁ) ---
    // Táto funkcia bude potrebovať načítavať názvy kategórií, skupín, tímov, hál a hracích dní
    // pre správne zobrazenie v tabuľke.
    async function displayMatchesAsSchedule() {
        const scheduleTableBody = document.querySelector('#scheduleTable tbody');
        scheduleTableBody.innerHTML = ''; // Vyčistíme tabuľku

        try {
            // Načítame všetky referenčné dáta naraz pre efektívnosť
            const [categoriesSnap, groupsSnap, clubsSnap, playingDaysSnap, hallsSnap] = await Promise.all([
                getDocs(categoriesCollectionRef),
                getDocs(groupsCollectionRef),
                getDocs(clubsCollectionRef),
                getDocs(playingDaysCollectionRef),
                getDocs(sportHallsCollectionRef)
            ]);

            const categoriesMap = new Map(categoriesSnap.docs.map(doc => [doc.id, doc.data().name]));
            const groupsMap = new Map(groupsSnap.docs.map(doc => [doc.id, doc.data().name]));
            const clubsMap = new Map(clubsSnap.docs.map(doc => [doc.id, doc.data().name]));
            const playingDaysMap = new Map(playingDaysSnap.docs.map(doc => [doc.id, doc.data().name]));
            const hallsMap = new Map(hallsSnap.docs.map(doc => [doc.id, doc.data().name]));

            let matchesQuery = query(matchesCollectionRef);

            // Aplikovanie filtrov
            if (categoryFilter.value) {
                matchesQuery = query(matchesQuery, where("categoryId", "==", categoryFilter.value));
            }
            if (groupFilter.value) {
                matchesQuery = query(matchesQuery, where("groupId", "==", groupFilter.value));
            }
            if (playingDayFilter.value) {
                matchesQuery = query(matchesQuery, where("playingDayId", "==", playingDayFilter.value));
            }
            if (hallFilter.value) {
                matchesQuery = query(matchesQuery, where("hallId", "==", hallFilter.value));
            }

            // Zoradenie podľa hracieho dňa a času
            matchesQuery = query(matchesQuery, orderBy("playingDayId"), orderBy("time"));

            const querySnapshot = await getDocs(matchesQuery);

            if (querySnapshot.empty) {
                const row = scheduleTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 9;
                cell.textContent = 'Žiadne zápasy pre vybrané filtre.';
                cell.className = 'text-center py-4 text-gray-600';
                return;
            }

            querySnapshot.forEach(matchDoc => {
                const match = matchDoc.data();
                const matchId = matchDoc.id;

                const row = scheduleTableBody.insertRow();
                row.className = 'hover:bg-gray-50 transition duration-150 ease-in-out';

                const playingDayName = playingDaysMap.get(match.playingDayId) || 'Neznámy deň';
                const hallName = hallsMap.get(match.hallId) || 'Neznáma hala';
                const categoryName = categoriesMap.get(match.categoryId) || 'Neznáma kategória';
                const groupName = groupsMap.get(match.groupId) || 'Neznáma skupina';
                const teamAName = clubsMap.get(match.teamAId) || 'Neznámy tím';
                const teamBName = clubsMap.get(match.teamBId) || 'Neznámy tím';

                row.insertCell().textContent = match.time;
                row.insertCell().textContent = hallName;
                row.insertCell().textContent = categoryName;
                row.insertCell().textContent = groupName;
                row.insertCell().textContent = teamAName;
                row.insertCell().textContent = teamBName;
                row.insertCell().textContent = match.result || '-';
                row.insertCell().textContent = match.notes || '-';

                const actionsCell = row.insertCell();
                actionsCell.className = 'schedule-cell-actions flex gap-1 justify-center items-center';
                actionsCell.innerHTML = `
                    <button class="edit-btn bg-green-500 hover:bg-green-600 text-white p-1 rounded-md text-xs shadow-sm" data-id="${matchId}">Upraviť</button>
                    <button class="delete-btn bg-red-500 hover:bg-red-600 text-white p-1 rounded-md text-xs shadow-sm" data-id="${matchId}">Vymazať</button>
                `;

                actionsCell.querySelector('.edit-btn').addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await editMatch(id);
                });

                actionsCell.querySelector('.delete-btn').addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    await confirmAndDeleteMatch(id);
                });
            });
        } catch (error) {
            console.error("Chyba pri načítaní zápasov pre rozvrh: ", error);
            const row = scheduleTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 9;
            cell.textContent = 'Chyba pri načítaní zápasov.';
            cell.className = 'text-center py-4 text-red-500';
        }
    }

    // Funkcia na editáciu zápasu
    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDocSnap = await getDoc(matchDocRef);

            if (matchDocSnap.exists()) {
                const match = matchDocSnap.data();
                matchIdInput.value = matchId;
                matchResultInput.value = match.result || '';
                matchTimeInput.value = match.time;
                matchNotesInput.value = match.notes || '';

                // Naplnenie selectov a nastavenie vybraných hodnôt
                await populateSelectWithFirestoreData(matchCategorySelect, categoriesCollectionRef, 'name', match.categoryId);
                // Spustíme zmenu kategórie, aby sa naplnili skupiny
                matchCategorySelect.dispatchEvent(new Event('change'));
                // Počkáme na naplnenie skupín a potom nastavíme skupinu
                setTimeout(async () => {
                    await populateSelectWithFirestoreData(matchGroupSelect, query(groupsCollectionRef, where("categoryId", "==", match.categoryId)), 'name', match.groupId);
                    // Spustíme zmenu skupiny, aby sa naplnili tímy
                    matchGroupSelect.dispatchEvent(new Event('change'));
                    // Počkáme na naplnenie tímov a potom nastavíme tímy A a B
                    setTimeout(async () => {
                        await populateSelectWithFirestoreData(matchTeamASelect, query(clubsCollectionRef, where("groupId", "==", match.groupId)), 'name', match.teamAId);
                        await populateSelectWithFirestoreData(matchTeamBSelect, query(clubsCollectionRef, where("groupId", "==", match.groupId)), 'name', match.teamBId);
                    }, 100);
                }, 100);

                await populateSelectWithFirestoreData(matchPlayingDaySelect, playingDaysCollectionRef, 'name', match.playingDayId);
                await populateSelectWithFirestoreData(matchHallSelect, sportHallsCollectionRef, 'name', match.hallId);

                deleteMatchButtonModal.style.display = 'inline-block';
                openModal(matchModal);
            } else {
                showMessageModal('Zápas nenájdený.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní zápasu na úpravu: ", error);
            showMessageModal("Chyba pri načítaní zápasu na úpravu. Pozrite konzolu pre detaily.");
        }
    }

    // Funkcia na potvrdenie a vymazanie zápasu
    async function confirmAndDeleteMatch(matchId) {
        showConfirmModal('Naozaj chcete vymazať tento zápas?', async () => {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                showMessageModal('Zápas úspešne vymazaný!');
                closeModal(matchModal);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                showMessageModal("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        });
    }

    // --- Filtrovanie zápasov ---
    categoryFilter.addEventListener('change', async () => {
        groupFilter.innerHTML = '<option value="">Všetky skupiny</option>'; // Reset groups
        if (categoryFilter.value) {
            const q = query(groupsCollectionRef, where("categoryId", "==", categoryFilter.value));
            await populateSelectWithFirestoreData(groupFilter, q, 'name');
        }
        await displayMatchesAsSchedule();
    });
    groupFilter.addEventListener('change', displayMatchesAsSchedule);
    playingDayFilter.addEventListener('change', displayMatchesAsSchedule);
    hallFilter.addEventListener('change', displayMatchesAsSchedule);
    teamFilter.addEventListener('input', displayMatchesAsSchedule); // Filter by team name (partial match, client-side)

    // --- Inicializácia zobrazenia dát pri načítaní stránky ---
    await displayPlayingDays();
    await displaySportHalls();
    await displayBuses(); // Zobrazenie autobusov pri načítaní
    // Naplnenie filtrov pre zápasy
    await populateSelectWithFirestoreData(categoryFilter, categoriesCollectionRef, 'name');
    await populateSelectWithFirestoreData(playingDayFilter, playingDaysCollectionRef, 'name');
    await populateSelectWithFirestoreData(hallFilter, sportHallsCollectionRef, 'name');
    await displayMatchesAsSchedule(); // Zobrazenie rozvrhu zápasov
});
