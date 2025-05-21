import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, busesCollectionRef, settingsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Kontrola prihlásenia administrátora
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // Získanie referencií na DOM elementy
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
    const matchHomeTeamSelect = document.getElementById('matchHomeTeamSelect');
    const matchAwayTeamSelect = document.getElementById('matchAwayTeamSelect');
    const matchHallSelect = document.getElementById('matchHallSelect');
    const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
    const matchStartTimeInput = document.getElementById('matchStartTimeInput');
    const matchResultInput = document.getElementById('matchResultInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDateInput');
    const playingDayNotesInput = document.getElementById('playingDayNotesInput');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    // Modálne okno pre športovú halu
    const sportHallModal = document.getElementById('sportHallModal');
    const closeSportHallModalButton = document.getElementById('closeSportHallModal');
    const sportHallForm = document.getElementById('sportHallForm');
    const sportHallIdInput = document.getElementById('sportHallId');
    const hallNameInput = document.getElementById('hallNameInput');
    const hallAddressInput = document.getElementById('hallAddressInput');
    const hallGoogleMapsUrlInput = document.getElementById('hallGoogleMapsUrlInput');
    const deleteSportHallButtonModal = document.getElementById('deleteSportHallButtonModal');

    // Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busPlayingDaySelect = document.getElementById('busPlayingDaySelect');
    const busTypeSelect = document.getElementById('busTypeSelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    // Filtre
    const filterCategorySelect = document.getElementById('filterCategorySelect');
    const filterGroupSelect = document.getElementById('filterGroupSelect');
    const filterTeamSelect = document.getElementById('filterTeamSelect');
    const filterDateInput = document.getElementById('filterDateInput');
    const filterHallSelect = document.getElementById('filterHallSelect');
    const clearFiltersButton = document.getElementById('clearFiltersButton');

    // Konštanta pre ID dokumentu nastavení
    const SETTINGS_DOC_ID = 'matchTimeSettings';

    // Funkcia na načítanie nastavení časov z databázy
    async function getSettings() {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                return settingsDoc.data();
            }
            return null;
        } catch (error) {
            console.error("Chyba pri načítaní nastavení: ", error);
            return null;
        }
    }

    // Funkcia na zobrazenie vlastného potvrdzovacieho dialógu
    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            const confirmModal = document.createElement('div');
            confirmModal.className = 'modal';
            confirmModal.innerHTML = `
                <div class="modal-content">
                    <p>${message}</p>
                    <button id="confirmYes" class="action-button edit-button">Áno</button>
                    <button id="confirmNo" class="action-button delete-button" style="margin-left: 10px;">Nie</button>
                </div>
            `;
            document.body.appendChild(confirmModal);

            const confirmYes = document.getElementById('confirmYes');
            const confirmNo = document.getElementById('confirmNo');

            confirmYes.onclick = () => {
                document.body.removeChild(confirmModal);
                resolve(true);
            };
            confirmNo.onclick = () => {
                document.body.removeChild(confirmModal);
                resolve(false);
            };

            confirmModal.style.display = 'block';
        });
    }

    // Funkcia na zobrazenie vlastného alert dialógu
    function showCustomAlert(message) {
        const alertModal = document.createElement('div');
        alertModal.className = 'modal';
        alertModal.innerHTML = `
            <div class="modal-content">
                <p>${message}</p>
                <button id="alertOk" class="action-button edit-button">OK</button>
            </div>
        `;
        document.body.appendChild(alertModal);

        const alertOk = document.getElementById('alertOk');
        alertOk.onclick = () => {
            document.body.removeChild(alertModal);
        };

        alertModal.style.display = 'block';
    }

    // Funkcia na výpočet prvého dostupného času
    async function calculateFirstAvailableTime(playingDayId, hallId) {
        if (!playingDayId || !hallId) {
            return ''; // Ak chýba deň alebo hala, nemôžeme vypočítať
        }

        const settings = await getSettings();
        if (!settings) {
            showCustomAlert('Nastavenia časov neboli nájdené. Prosím, nastavte ich v sekcii "Nastavenia".');
            return '';
        }

        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, playingDayId));
        if (!playingDayDoc.exists()) {
            showCustomAlert('Zvolený hrací deň neexistuje.');
            return '';
        }
        const playingDayData = playingDayDoc.data();
        const playingDayDate = playingDayData.date; // Formát YYYY-MM-DD

        let startTime = settings.otherDaysStartTime; // Predvolený čas pre ostatné dni
        // Zisti, či je to prvý hrací deň
        const playingDaysQuery = query(playingDaysCollectionRef, orderBy('date'));
        const playingDaysSnapshot = await getDocs(playingDaysQuery);
        const playingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
        if (playingDays.length > 0 && playingDays[0] === playingDayDate) {
            startTime = settings.firstDayStartTime;
        }

        // Prevod času na minúty od polnoci
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        let currentMinutes = parseTime(startTime);

        // Získaj všetky zápasy pre daný hrací deň a halu
        const q = query(matchesCollectionRef,
            where("playingDayId", "==", playingDayId),
            where("hallId", "==", hallId),
            orderBy("startTime") // Zoraď podľa času pre jednoduchšie hľadanie voľného slotu
        );
        const querySnapshot = await getDocs(q);
        const existingMatches = querySnapshot.docs.map(doc => doc.data());

        // Dĺžka zápasu v minútach (predpokladajme 60 minút, alebo môže byť nastavená v nastaveniach)
        const matchDurationMinutes = 60; // Toto by mohlo byť tiež v nastaveniach

        // Hľadaj prvý voľný slot
        for (const match of existingMatches) {
            const matchStartMinutes = parseTime(match.startTime);
            // Ak je aktuálny čas menší ako začiatok zápasu, našli sme voľný slot
            if (currentMinutes + matchDurationMinutes <= matchStartMinutes) {
                break; // Našli sme voľný slot pred týmto zápasom
            }
            // Inak posuň aktuálny čas za koniec tohto zápasu
            currentMinutes = Math.max(currentMinutes, matchStartMinutes + matchDurationMinutes);
        }

        // Prevod minút späť na formát HH:MM
        const formatTime = (totalMinutes) => {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        };

        return formatTime(currentMinutes);
    }

    // Funkcia na populáciu select boxu pre tímy
    async function populateTeamSelect(selectElement, categoryId, excludeTeamId = null) {
        selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
        if (!categoryId) return;

        const q = query(clubsCollectionRef, where("categoryId", "==", categoryId), orderBy("name"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const team = doc.data();
            if (doc.id !== excludeTeamId) { // Vylúč tím, ak je zadaný
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = team.name;
                selectElement.appendChild(option);
            }
        });
    }

    // Funkcia na populáciu select boxu pre haly
    async function populateHallSelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte halu --</option>';
        const querySnapshot = await getDocs(sportHallsCollectionRef);
        querySnapshot.forEach((doc) => {
            const hall = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = hall.name;
            selectElement.appendChild(option);
        });
    }

    // Funkcia na populáciu select boxu pre hracie dni
    async function populatePlayingDaySelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte hrací deň --</option>';
        const q = query(playingDaysCollectionRef, orderBy("date"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const playingDay = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${playingDay.date} (${playingDay.notes})`;
            selectElement.appendChild(option);
        });
    }

    // Funkcia na populáciu select boxu pre typ autobusu (ak je pevne daný, inak z databázy)
    async function populateBusTypeSelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte typ autobusu --</option>';
        const busTypes = ["Malý autobus", "Stredný autobus", "Veľký autobus"]; // Príklad pevných typov
        busTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            selectElement.appendChild(option);
        });
    }

    // Funkcia na populáciu select boxu pre miesta (haly) pre autobus
    async function populateHallSelectForBus(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (halu) --</option>';
        const querySnapshot = await getDocs(sportHallsCollectionRef);
        querySnapshot.forEach((doc) => {
            const hall = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = hall.name;
            selectElement.appendChild(option);
        });
    }

    // Funkcia na zobrazenie zápasov ako rozvrhu
    async function displayMatchesAsSchedule() {
        const scheduleContainer = document.getElementById('scheduleContainer');
        scheduleContainer.innerHTML = ''; // Vyčisti existujúci rozvrh

        const filterCategoryId = filterCategorySelect.value;
        const filterGroupId = filterGroupSelect.value;
        const filterTeamId = filterTeamSelect.value;
        const filterDate = filterDateInput.value;
        const filterHallId = filterHallSelect.value;

        let matchesQuery = query(matchesCollectionRef);
        let playingDaysQuery = query(playingDaysCollectionRef, orderBy("date"));
        let sportHallsQuery = query(sportHallsCollectionRef, orderBy("name"));

        // Aplikuj filtre
        if (filterCategoryId) {
            matchesQuery = query(matchesQuery, where("categoryId", "==", filterCategoryId));
        }
        if (filterGroupId) {
            matchesQuery = query(matchesQuery, where("groupId", "==", filterGroupId));
        }
        if (filterTeamId) {
            // Filtruj podľa domáceho ALEBO hosťujúceho tímu
            matchesQuery = query(matchesQuery, where("homeTeamId", "==", filterTeamId)); // Toto je zjednodušenie, pre OR by bolo potrebné 2 query
            // Alternatíva pre OR: Načítať všetky a filtrovať v JS
        }
        if (filterDate) {
            matchesQuery = query(matchesQuery, where("playingDayDate", "==", filterDate)); // Predpokladáme, že dátum je uložený v zápase
            playingDaysQuery = query(playingDaysCollectionRef, where("date", "==", filterDate));
        }
        if (filterHallId) {
            matchesQuery = query(matchesQuery, where("hallId", "==", filterHallId));
            sportHallsQuery = query(sportHallsCollectionRef, where(documentId(), "==", filterHallId));
        }

        const [matchesSnapshot, playingDaysSnapshot, sportHallsSnapshot, categoriesSnapshot, groupsSnapshot, clubsSnapshot, busesSnapshot] = await Promise.all([
            getDocs(matchesQuery),
            getDocs(playingDaysQuery),
            getDocs(sportHallsQuery),
            getDocs(categoriesCollectionRef),
            getDocs(groupsCollectionRef),
            getDocs(clubsCollectionRef),
            getDocs(busesCollectionRef)
        ]);

        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sportHalls = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        const groupsMap = new Map(groupsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        const clubsMap = new Map(clubsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        const buses = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Ak je filterTeamId, musíme dodatočne filtrovať zápasy
        let filteredMatches = matches;
        if (filterTeamId) {
            filteredMatches = matches.filter(match => match.homeTeamId === filterTeamId || match.awayTeamId === filterTeamId);
        }

        // Zoraď zápasy podľa dátumu, haly a času
        filteredMatches.sort((a, b) => {
            const dateA = playingDays.find(day => day.id === a.playingDayId)?.date || '';
            const dateB = playingDays.find(day => day.id === b.playingDayId)?.date || '';
            if (dateA !== dateB) return dateA.localeCompare(dateB);

            const hallNameA = sportHalls.find(hall => hall.id === a.hallId)?.name || '';
            const hallNameB = sportHalls.find(hall => hall.id === b.hallId)?.name || '';
            if (hallNameA !== hallNameB) return hallNameA.localeCompare(hallNameB);

            return a.startTime.localeCompare(b.startTime);
        });

        // Vytvorenie rozvrhu
        const scheduleTable = document.createElement('table');
        scheduleTable.className = 'schedule-table';
        scheduleTable.innerHTML = `
            <thead>
                <tr>
                    <th>Dátum</th>
                    <th>Hala</th>
                    <th>Čas</th>
                    <th>Kategória</th>
                    <th>Skupina</th>
                    <th>Domáci tím</th>
                    <th>Hostia</th>
                    <th>Výsledok</th>
                    <th>Akcie</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const scheduleTableBody = scheduleTable.querySelector('tbody');

        filteredMatches.forEach(match => {
            const row = document.createElement('tr');
            const playingDay = playingDays.find(day => day.id === match.playingDayId);
            const hall = sportHalls.find(h => h.id === match.hallId);

            row.innerHTML = `
                <td>${playingDay ? playingDay.date : 'N/A'}</td>
                <td>${hall ? hall.name : 'N/A'}</td>
                <td>${match.startTime}</td>
                <td>${categoriesMap.get(match.categoryId) || 'N/A'}</td>
                <td>${groupsMap.get(match.groupId) || 'N/A'}</td>
                <td>${clubsMap.get(match.homeTeamId) || 'N/A'}</td>
                <td>${clubsMap.get(match.awayTeamId) || 'N/A'}</td>
                <td>${match.result || 'N/A'}</td>
                <td class="schedule-cell-actions">
                    <button class="action-button edit-btn" data-id="${match.id}" data-type="match">Upraviť</button>
                    <button class="action-button delete-btn" data-id="${match.id}" data-type="match">Vymazať</button>
                </td>
            `;
            scheduleTableBody.appendChild(row);
        });
        scheduleContainer.appendChild(scheduleTable);

        // Zobrazenie hracích dní
        const playingDaysContainer = document.getElementById('playingDaysContainer');
        playingDaysContainer.innerHTML = '<h2>Hracie dni</h2>';
        if (playingDays.length === 0) {
            playingDaysContainer.innerHTML += '<p>Žiadne hracie dni neboli pridané.</p>';
        } else {
            const playingDaysList = document.createElement('ul');
            playingDaysList.className = 'data-list';
            playingDays.forEach(day => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span>${day.date} - ${day.notes || 'Bez poznámok'}</span>
                    <div class="actions">
                        <button class="action-button edit-btn" data-id="${day.id}" data-type="playingDay">Upraviť</button>
                        <button class="action-button delete-btn" data-id="${day.id}" data-type="playingDay">Vymazať</button>
                    </div>
                `;
                playingDaysList.appendChild(listItem);
            });
            playingDaysContainer.appendChild(playingDaysList);
        }

        // Zobrazenie športových hál
        const sportHallsContainer = document.getElementById('sportHallsContainer');
        sportHallsContainer.innerHTML = '<h2>Športové haly</h2>';
        if (sportHalls.length === 0) {
            sportHallsContainer.innerHTML += '<p>Žiadne športové haly neboli pridané.</p>';
        } else {
            const sportHallsList = document.createElement('ul');
            sportHallsList.className = 'data-list';
            sportHalls.forEach(hall => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span>${hall.name} (${hall.address}) - <a href="${hall.googleMapsUrl}" target="_blank">Mapa</a></span>
                    <div class="actions">
                        <button class="action-button edit-btn" data-id="${hall.id}" data-type="sportHall">Upraviť</button>
                        <button class="action-button delete-btn" data-id="${hall.id}" data-type="sportHall">Vymazať</button>
                    </div>
                `;
                sportHallsList.appendChild(listItem);
            });
            sportHallsContainer.appendChild(sportHallsList);
        }

        // Zobrazenie autobusov
        const busesContainer = document.getElementById('busesContainer');
        busesContainer.innerHTML = '<h2>Autobusy</h2>';
        if (buses.length === 0) {
            busesContainer.innerHTML += '<p>Žiadne autobusy neboli pridané.</p>';
        } else {
            const busesList = document.createElement('ul');
            busesList.className = 'data-list';
            buses.forEach(bus => {
                const listItem = document.createElement('li');
                const startHall = sportHalls.find(h => h.id === bus.startLocationId);
                const endHall = sportHalls.find(h => h.id === bus.endLocationId);
                const busPlayingDay = playingDays.find(day => day.id === bus.playingDayId);

                listItem.innerHTML = `
                    <span>
                        ${busPlayingDay ? busPlayingDay.date : 'N/A'} - ${bus.busType} z ${startHall ? startHall.name : 'N/A'} (${bus.startTime}) do ${endHall ? endHall.name : 'N/A'} (${bus.endTime})
                        ${bus.notes ? `(Poznámky: ${bus.notes})` : ''}
                    </span>
                    <div class="actions">
                        <button class="action-button edit-btn" data-id="${bus.id}" data-type="bus">Upraviť</button>
                        <button class="action-button delete-btn" data-id="${bus.id}" data-type="bus">Vymazať</button>
                    </div>
                `;
                busesList.appendChild(listItem);
            });
            busesContainer.appendChild(busesList);
        }
    }

    // Inicializácia filtrov a rozvrhu
    await populateCategorySelect(filterCategorySelect);
    await populateHallSelect(filterHallSelect);
    await populatePlayingDaySelect(matchPlayingDaySelect); // Pre modal zápasu
    await populateHallSelect(matchHallSelect); // Pre modal zápasu
    await populatePlayingDaySelect(busPlayingDaySelect); // Pre modal autobusu
    await populateBusTypeSelect(busTypeSelect); // Pre modal autobusu
    await populateHallSelectForBus(busStartLocationSelect); // Pre modal autobusu
    await populateHallSelectForBus(busEndLocationSelect); // Pre modal autobusu
    await displayMatchesAsSchedule();

    // Event listener pre zmeny filtrov
    filterCategorySelect.addEventListener('change', async () => {
        await populateGroupSelect(filterGroupSelect, filterCategorySelect.value);
        await populateTeamSelect(filterTeamSelect, filterCategorySelect.value);
        await displayMatchesAsSchedule();
    });
    filterGroupSelect.addEventListener('change', displayMatchesAsSchedule);
    filterTeamSelect.addEventListener('change', displayMatchesAsSchedule);
    filterDateInput.addEventListener('change', displayMatchesAsSchedule);
    filterHallSelect.addEventListener('change', displayMatchesAsSchedule);

    clearFiltersButton.addEventListener('click', async () => {
        filterCategorySelect.value = '';
        filterGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        filterTeamSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
        filterDateInput.value = '';
        filterHallSelect.value = '';
        await displayMatchesAsSchedule();
    });

    // Event listener pre zmenu kategórie v modale zápasu
    matchCategorySelect.addEventListener('change', async () => {
        const categoryId = matchCategorySelect.value;
        await populateGroupSelect(matchGroupSelect, categoryId);
        await populateTeamSelect(matchHomeTeamSelect, categoryId);
        await populateTeamSelect(matchAwayTeamSelect, categoryId);
    });

    // Event listener pre zmenu domáceho tímu v modale zápasu (pre vylúčenie z hostí)
    matchHomeTeamSelect.addEventListener('change', async () => {
        const categoryId = matchCategorySelect.value;
        const homeTeamId = matchHomeTeamSelect.value;
        await populateTeamSelect(matchAwayTeamSelect, categoryId, homeTeamId);
    });

    // NOVÉ: Event listener pre zmenu hracieho dňa alebo haly v modale zápasu
    matchPlayingDaySelect.addEventListener('change', async () => {
        const playingDayId = matchPlayingDaySelect.value;
        const hallId = matchHallSelect.value;
        const availableTime = await calculateFirstAvailableTime(playingDayId, hallId);
        matchStartTimeInput.value = availableTime;
    });

    matchHallSelect.addEventListener('change', async () => {
        const playingDayId = matchPlayingDaySelect.value;
        const hallId = matchHallSelect.value;
        const availableTime = await calculateFirstAvailableTime(playingDayId, hallId);
        matchStartTimeInput.value = availableTime;
    });

    // Otváranie/zatváranie dropdown menu
    addButton.addEventListener('click', () => {
        addOptions.classList.toggle('show');
    });

    // Zatvorenie dropdown menu, ak klikneš mimo neho
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    // Otváranie modálnych okien pre pridanie
    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        deletePlayingDayButtonModal.style.display = 'none';
        openModal(playingDayModal);
        addOptions.classList.remove('show');
    });

    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        sportHallIdInput.value = '';
        deleteSportHallButtonModal.style.display = 'none';
        openModal(sportHallModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        deleteMatchButtonModal.style.display = 'none';
        // Reset a populácia pre nové pridanie
        await populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchHomeTeamSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
        matchAwayTeamSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
        await populatePlayingDaySelect(matchPlayingDaySelect);
        await populateHallSelect(matchHallSelect);

        // Automatické nastavenie času po otvorení modalu, ak sú už vybrané hodnoty
        const playingDayId = matchPlayingDaySelect.value;
        const hallId = matchHallSelect.value;
        if (playingDayId && hallId) {
            const availableTime = await calculateFirstAvailableTime(playingDayId, hallId);
            matchStartTimeInput.value = availableTime;
        }

        openModal(matchModal);
        addOptions.classList.remove('show');
    });

    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        deleteBusButtonModal.style.display = 'none';
        await populatePlayingDaySelect(busPlayingDaySelect);
        await populateBusTypeSelect(busTypeSelect);
        await populateHallSelectForBus(busStartLocationSelect);
        await populateHallSelectForBus(busEndLocationSelect);
        openModal(busModal);
        addOptions.classList.remove('show');
    });

    // Zatváranie modálnych okien
    closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));
    closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));
    closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));
    closeBusModalButton.addEventListener('click', () => closeModal(busModal));

    // Spracovanie formulára pre hrací deň
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playingDayId = playingDayIdInput.value;
        const date = playingDayDateInput.value;
        const notes = playingDayNotesInput.value.trim();

        if (!date) {
            showCustomAlert('Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (playingDayId) {
                // Úprava existujúceho hracieho dňa
                if (!querySnapshot.empty && querySnapshot.docs[0].id !== playingDayId) {
                    showCustomAlert('Hrací deň s týmto dátumom už existuje!');
                    return;
                }
                const docRef = doc(playingDaysCollectionRef, playingDayId);
                await setDoc(docRef, { date, notes, updatedAt: new Date() }, { merge: true });
                showCustomAlert('Hrací deň úspešne aktualizovaný!');
            } else {
                // Pridanie nového hracieho dňa
                if (!querySnapshot.empty) {
                    showCustomAlert('Hrací deň s týmto dátumom už existuje!');
                    return;
                }
                await addDoc(playingDaysCollectionRef, { date, notes, createdAt: new Date() });
                showCustomAlert('Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await populatePlayingDaySelect(matchPlayingDaySelect); // Aktualizovať select v modale zápasu
            await populatePlayingDaySelect(busPlayingDaySelect); // Aktualizovať select v modale autobusu
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            showCustomAlert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // Spracovanie formulára pre športovú halu
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sportHallId = sportHallIdInput.value;
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

        if (!name || !address || !googleMapsUrl) {
            showCustomAlert('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validate URL format
        } catch (_) {
            showCustomAlert('Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(sportHallsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (sportHallId) {
                // Úprava existujúcej haly
                if (!querySnapshot.empty && querySnapshot.docs[0].id !== sportHallId) {
                    showCustomAlert('Športová hala s týmto názvom už existuje!');
                    return;
                }
                const docRef = doc(sportHallsCollectionRef, sportHallId);
                await setDoc(docRef, { name, address, googleMapsUrl, updatedAt: new Date() }, { merge: true });
                showCustomAlert('Športová hala úspešne aktualizovaná!');
            } else {
                // Pridanie novej haly
                if (!querySnapshot.empty) {
                    showCustomAlert('Športová hala s týmto názvom už existuje!');
                    return;
                }
                await addDoc(sportHallsCollectionRef, { name, address, googleMapsUrl, createdAt: new Date() });
                showCustomAlert('Športová hala úspešne pridaná!');
            }
            closeModal(sportHallModal);
            await populateHallSelect(matchHallSelect); // Aktualizovať select v modale zápasu
            await populateHallSelectForBus(busStartLocationSelect); // Aktualizovať select v modale autobusu
            await populateHallSelectForBus(busEndLocationSelect); // Aktualizovať select v modale autobusu
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            showCustomAlert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });

    // Spracovanie formulára pre zápas
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchId = matchIdInput.value;
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        const homeTeamId = matchHomeTeamSelect.value;
        const awayTeamId = matchAwayTeamSelect.value;
        const hallId = matchHallSelect.value;
        const playingDayId = matchPlayingDaySelect.value;
        const startTime = matchStartTimeInput.value;
        const result = matchResultInput.value.trim();

        if (!categoryId || !groupId || !homeTeamId || !awayTeamId || !hallId || !playingDayId || !startTime) {
            showCustomAlert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Domáci tím, Hostia, Hala, Hrací deň, Čas začiatku).');
            return;
        }

        if (homeTeamId === awayTeamId) {
            showCustomAlert('Domáci tím a hosťujúci tím nemôžu byť rovnaké.');
            return;
        }

        try {
            // Získaj dátum hracieho dňa pre uloženie do zápasu
            const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, playingDayId));
            const playingDayDate = playingDayDoc.exists() ? playingDayDoc.data().date : '';

            const matchData = {
                categoryId,
                groupId,
                homeTeamId,
                awayTeamId,
                hallId,
                playingDayId,
                playingDayDate, // Uložíme aj dátum pre jednoduchšie filtrovanie
                startTime,
                result: result || null,
            };

            if (matchId) {
                // Úprava existujúceho zápasu
                const docRef = doc(matchesCollectionRef, matchId);
                await setDoc(docRef, { ...matchData, updatedAt: new Date() }, { merge: true });
                showCustomAlert('Zápas úspešne aktualizovaný!');
            } else {
                // Pridanie nového zápasu
                // Kontrola duplicity (rovnaká hala, deň, čas)
                const q = query(matchesCollectionRef,
                    where("playingDayId", "==", playingDayId),
                    where("hallId", "==", hallId),
                    where("startTime", "==", startTime)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    showCustomAlert('V tejto hale a čase už existuje iný zápas.');
                    return;
                }

                await addDoc(matchesCollectionRef, { ...matchData, createdAt: new Date() });
                showCustomAlert('Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            showCustomAlert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    // Spracovanie formulára pre autobus
    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const busId = busIdInput.value;
        const playingDayId = busPlayingDaySelect.value;
        const busType = busTypeSelect.value;
        const startLocationId = busStartLocationSelect.value;
        const startTime = busStartTimeInput.value;
        const endLocationId = busEndLocationSelect.value;
        const endTime = busEndTimeInput.value;
        const notes = busNotesInput.value.trim();

        if (!playingDayId || !busType || !startLocationId || !startTime || !endLocationId || !endTime) {
            showCustomAlert('Prosím, vyplňte všetky povinné polia pre autobus.');
            return;
        }

        try {
            const busData = {
                playingDayId,
                busType,
                startLocationId,
                startTime,
                endLocationId,
                endTime,
                notes: notes || null,
            };

            if (busId) {
                // Úprava existujúceho autobusu
                const docRef = doc(busesCollectionRef, busId);
                await setDoc(docRef, { ...busData, updatedAt: new Date() }, { merge: true });
                showCustomAlert('Autobus úspešne aktualizovaný!');
            } else {
                // Pridanie nového autobusu
                await addDoc(busesCollectionRef, { ...busData, createdAt: new Date() });
                showCustomAlert('Autobus úspešne pridaný!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní autobusu: ", error);
            showCustomAlert("Chyba pri ukladaní autobusu. Pozrite konzolu pre detaily.");
        }
    });

    // Delegovanie udalostí pre tlačidlá Upraviť a Vymazať v rozvrhu
    categoriesContentSection.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;

            if (type === 'match') {
                const docRef = doc(matchesCollectionRef, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    matchIdInput.value = id;
                    await populateCategorySelect(matchCategorySelect, data.categoryId);
                    await populateGroupSelect(matchGroupSelect, data.categoryId, data.groupId);
                    await populateTeamSelect(matchHomeTeamSelect, data.categoryId, null, data.homeTeamId); // Pre-select home team
                    await populateTeamSelect(matchAwayTeamSelect, data.categoryId, data.homeTeamId, data.awayTeamId); // Pre-select away team
                    await populateHallSelect(matchHallSelect, data.hallId);
                    await populatePlayingDaySelect(matchPlayingDaySelect, data.playingDayId);
                    matchStartTimeInput.value = data.startTime;
                    matchResultInput.value = data.result || '';
                    deleteMatchButtonModal.style.display = 'inline-block';
                    openModal(matchModal);
                }
            } else if (type === 'playingDay') {
                const docRef = doc(playingDaysCollectionRef, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    playingDayIdInput.value = id;
                    playingDayDateInput.value = data.date;
                    playingDayNotesInput.value = data.notes || '';
                    deletePlayingDayButtonModal.style.display = 'inline-block';
                    openModal(playingDayModal);
                }
            } else if (type === 'sportHall') {
                const docRef = doc(sportHallsCollectionRef, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    sportHallIdInput.value = id;
                    hallNameInput.value = data.name;
                    hallAddressInput.value = data.address;
                    hallGoogleMapsUrlInput.value = data.googleMapsUrl;
                    deleteSportHallButtonModal.style.display = 'inline-block';
                    openModal(sportHallModal);
                }
            } else if (type === 'bus') {
                const docRef = doc(busesCollectionRef, id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    busIdInput.value = id;
                    await populatePlayingDaySelect(busPlayingDaySelect, data.playingDayId);
                    await populateBusTypeSelect(busTypeSelect, data.busType);
                    await populateHallSelectForBus(busStartLocationSelect, data.startLocationId);
                    await populateHallSelectForBus(busEndLocationSelect, data.endLocationId);
                    busStartTimeInput.value = data.startTime;
                    busEndTimeInput.value = data.endTime;
                    busNotesInput.value = data.notes || '';
                    deleteBusButtonModal.style.display = 'inline-block';
                    openModal(busModal);
                }
            }
        } else if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;

            const confirmDelete = await showCustomConfirm(`Naozaj chcete vymazať túto položku (${type})?`);
            if (!confirmDelete) {
                return;
            }

            try {
                if (type === 'match') {
                    await deleteDoc(doc(matchesCollectionRef, id));
                    showCustomAlert('Zápas úspešne vymazaný!');
                } else if (type === 'playingDay') {
                    // Pred vymazaním hracieho dňa skontroluj, či naň nie sú naviazané zápasy alebo autobusy
                    const matchesUsingDay = await getDocs(query(matchesCollectionRef, where("playingDayId", "==", id)));
                    const busesUsingDay = await getDocs(query(busesCollectionRef, where("playingDayId", "==", id)));

                    if (!matchesUsingDay.empty || !busesUsingDay.empty) {
                        showCustomAlert('Nemôžete vymazať tento hrací deň, pretože sú naň naviazané zápasy alebo autobusy. Najprv ich vymažte.');
                        return;
                    }
                    await deleteDoc(doc(playingDaysCollectionRef, id));
                    showCustomAlert('Hrací deň úspešne vymazaný!');
                    await populatePlayingDaySelect(matchPlayingDaySelect); // Aktualizovať select
                    await populatePlayingDaySelect(busPlayingDaySelect); // Aktualizovať select
                } else if (type === 'sportHall') {
                    // Pred vymazaním haly skontroluj, či na ňu nie sú naviazané zápasy alebo autobusy
                    const matchesUsingHall = await getDocs(query(matchesCollectionRef, where("hallId", "==", id)));
                    const busesUsingHallStart = await getDocs(query(busesCollectionRef, where("startLocationId", "==", id)));
                    const busesUsingHallEnd = await getDocs(query(busesCollectionRef, where("endLocationId", "==", id)));

                    if (!matchesUsingHall.empty || !busesUsingHallStart.empty || !busesUsingHallEnd.empty) {
                        showCustomAlert('Nemôžete vymazať túto halu, pretože sú na ňu naviazané zápasy alebo autobusy. Najprv ich vymažte.');
                        return;
                    }
                    await deleteDoc(doc(sportHallsCollectionRef, id));
                    showCustomAlert('Športová hala úspešne vymazaná!');
                    await populateHallSelect(matchHallSelect); // Aktualizovať select
                    await populateHallSelectForBus(busStartLocationSelect); // Aktualizovať select
                    await populateHallSelectForBus(busEndLocationSelect); // Aktualizovať select
                } else if (type === 'bus') {
                    await deleteDoc(doc(busesCollectionRef, id));
                    showCustomAlert('Autobus úspešne vymazaný!');
                }
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní položky: ", error);
                showCustomAlert("Chyba pri mazaní položky. Pozrite konzolu pre detaily.");
            }
        }
    });

    // Mazanie z modálnych okien
    deleteMatchButtonModal.addEventListener('click', async () => {
        const matchId = matchIdInput.value;
        if (matchId) {
            const confirmDelete = await showCustomConfirm('Naozaj chcete vymazať tento zápas?');
            if (confirmDelete) {
                try {
                    await deleteDoc(doc(matchesCollectionRef, matchId));
                    showCustomAlert('Zápas úspešne vymazaný!');
                    closeModal(matchModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní zápasu: ", error);
                    showCustomAlert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
                }
            }
        }
    });

    deletePlayingDayButtonModal.addEventListener('click', async () => {
        const playingDayId = playingDayIdInput.value;
        if (playingDayId) {
            const confirmDelete = await showCustomConfirm('Naozaj chcete vymazať tento hrací deň?');
            if (confirmDelete) {
                try {
                    const matchesUsingDay = await getDocs(query(matchesCollectionRef, where("playingDayId", "==", playingDayId)));
                    const busesUsingDay = await getDocs(query(busesCollectionRef, where("playingDayId", "==", playingDayId)));

                    if (!matchesUsingDay.empty || !busesUsingDay.empty) {
                        showCustomAlert('Nemôžete vymazať tento hrací deň, pretože sú naň naviazané zápasy alebo autobusy. Najprv ich vymažte.');
                        return;
                    }

                    await deleteDoc(doc(playingDaysCollectionRef, playingDayId));
                    showCustomAlert('Hrací deň úspešne vymazaný!');
                    closeModal(playingDayModal);
                    await populatePlayingDaySelect(matchPlayingDaySelect); // Aktualizovať select
                    await populatePlayingDaySelect(busPlayingDaySelect); // Aktualizovať select
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní hracieho dňa: ", error);
                    showCustomAlert("Chyba pri mazaní hracieho dňa. Pozrite konzolu pre detaily.");
                }
            }
        }
    });

    deleteSportHallButtonModal.addEventListener('click', async () => {
        const sportHallId = sportHallIdInput.value;
        if (sportHallId) {
            const confirmDelete = await showCustomConfirm('Naozaj chcete vymazať túto športovú halu?');
            if (confirmDelete) {
                try {
                    const matchesUsingHall = await getDocs(query(matchesCollectionRef, where("hallId", "==", sportHallId)));
                    const busesUsingHallStart = await getDocs(query(busesCollectionRef, where("startLocationId", "==", sportHallId)));
                    const busesUsingHallEnd = await getDocs(query(busesCollectionRef, where("endLocationId", "==", sportHallId)));

                    if (!matchesUsingHall.empty || !busesUsingHallStart.empty || !busesUsingHallEnd.empty) {
                        showCustomAlert('Nemôžete vymazať túto halu, pretože sú na ňu naviazané zápasy alebo autobusy. Najprv ich vymažte.');
                        return;
                    }

                    await deleteDoc(doc(sportHallsCollectionRef, sportHallId));
                    showCustomAlert('Športová hala úspešne vymazaná!');
                    closeModal(sportHallModal);
                    await populateHallSelect(matchHallSelect); // Aktualizovať select
                    await populateHallSelectForBus(busStartLocationSelect); // Aktualizovať select
                    await populateHallSelectForBus(busEndLocationSelect); // Aktualizovať select
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní športovej haly: ", error);
                    showCustomAlert("Chyba pri mazaní športovej haly. Pozrite konzolu pre detaily.");
                }
            }
        }
    });

    deleteBusButtonModal.addEventListener('click', async () => {
        const busId = busIdInput.value;
        if (busId) {
            const confirmDelete = await showCustomConfirm('Naozaj chcete vymazať tento autobus?');
            if (confirmDelete) {
                try {
                    await deleteDoc(doc(busesCollectionRef, busId));
                    showCustomAlert('Autobus úspešne vymazaný!');
                    closeModal(busModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní autobusu: ", error);
                    showCustomAlert("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
                }
            }
        }
    });
});
