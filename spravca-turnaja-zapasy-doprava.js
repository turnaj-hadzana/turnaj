import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, busesCollectionRef, settingsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions'); // Správne získanie odkazu na dropdown
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addSportHallButton = document.getElementById('addSportHallButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton'); // NOVÉ: Tlačidlo pre pridanie autobusu

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchTeamASelect = document.getElementById('matchTeamASelect');
    const matchTeamBSelect = document.getElementById('matchTeamBSelect');
    const matchCategorySelect = document.getElementById('matchCategorySelect');
    const matchGroupSelect = document.getElementById('matchGroupSelect');
    const matchDateSelect = document.getElementById('matchDateSelect'); // Zmenené z matchDateInput
    const matchTimeInput = document.getElementById('matchTimeInput');
    const matchLocationSelect = document.getElementById('matchLocationSelect'); // Zmenené z matchSportHallSelect
    const matchRefereesInput = document.getElementById('matchRefereesInput');
    const matchNotesInput = document.getElementById('matchNotesInput');
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
    const deleteHallButtonModal = document.getElementById('deleteHallButtonModal');

    // Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busNumberInput = document.getElementById('busNumberInput');
    const busCapacityInput = document.getElementById('busCapacityInput');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');


    // Konštanta pre ID dokumentu nastavení
    const SETTINGS_DOC_ID = 'matchTimeSettings';
    // Predpokladaná dĺžka zápasu v minútach pre výpočet dostupných slotov
    const MATCH_DURATION_MINUTES = 60;

    /**
     * Načíta nastavenia turnaja z Firestore.
     * @returns {object|null} Objekt s nastaveniami alebo null, ak sa nenájdu.
     */
    async function getTournamentSettings() {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                return settingsDoc.data();
            } else {
                console.warn("Dokument nastavení neexistuje. Použijú sa predvolené časy.");
                return null;
            }
        } catch (error) {
            console.error("Chyba pri načítaní nastavení turnaja:", error);
            return null;
        }
    }

    /**
     * Nájde prvý dostupný časový slot pre zápas v danej hale a deň.
     * @param {string} selectedDateString - Vybraný dátum vo formáteYYYY-MM-DD.
     * @param {string} selectedHallId - ID vybranej športovej haly.
     * @param {object} settings - Objekt s nastaveniami turnaja (firstDayStartTime, otherDaysStartTime).
     * @returns {string|null} Prvý dostupný čas vo formáte HH:MM alebo null, ak sa nenájde.
     */
    async function findEarliestAvailableTime(selectedDateString, selectedHallId, settings) {
        if (!selectedDateString || !selectedHallId || !settings) {
            return null;
        }

        const selectedDate = new Date(selectedDateString);
        const today = new Date();
        // Porovnávame len dátum, nie čas
        const isFirstDay = selectedDate.toDateString() === today.toDateString();

        let baseStartTime = isFirstDay ? settings.firstDayStartTime : settings.otherDaysStartTime;
        if (!baseStartTime) {
            console.warn("Základný čas začiatku pre vybraný deň nie je definovaný v nastaveniach.");
            baseStartTime = '08:00'; // Predvolený čas, ak nastavenia chýbajú
        }

        const [baseHour, baseMinute] = baseStartTime.split(':').map(Number);
        let currentSlotTime = new Date(selectedDate);
        currentSlotTime.setHours(baseHour, baseMinute, 0, 0); // Nastavíme základný čas pre dnešný deň

        // Načítaj existujúce zápasy pre daný deň a halu
        const q = query(matchesCollectionRef,
            where("date", "==", selectedDateString),
            where("sportHallId", "==", selectedHallId)
            // orderBy("time") - orderBy môže vyžadovať indexy, takže radšej sortovať lokálne
        );
        const querySnapshot = await getDocs(q);
        const existingMatches = querySnapshot.docs.map(doc => doc.data());

        // Sort existing matches by time to make checking easier
        existingMatches.sort((a, b) => {
            const timeA = new Date(`2000-01-01T${a.time}`);
            const timeB = new Date(`2000-01-01T${b.time}`);
            return timeA - timeB;
        });

        // Iteruj cez časové sloty (napr. každých 15 minút)
        // Môžeme ísť až do 23:00, aby sme pokryli celý deň
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        while (currentSlotTime < endOfDay) {
            let isSlotAvailable = true;
            const currentSlotEndTime = new Date(currentSlotTime.getTime() + MATCH_DURATION_MINUTES * 60 * 1000);

            for (const match of existingMatches) {
                const [matchStartHour, matchStartMinute] = match.time.split(':').map(Number);
                const matchStartTime = new Date(selectedDate);
                matchStartTime.setHours(matchStartHour, matchStartMinute, 0, 0);
                const matchEndTime = new Date(matchStartTime.getTime() + MATCH_DURATION_MINUTES * 60 * 1000); // Predpokladaná dĺžka zápasu

                // Kontrola prekrývania:
                // Ak sa začiatok nového slotu prekrýva s existujúcim zápasom
                // ALEBO ak sa koniec nového slotu prekrýva s existujúcim zápasom
                // ALEBO ak existujúci zápas úplne pokrýva nový slot
                if (
                    (currentSlotTime < matchEndTime && matchStartTime < currentSlotEndTime)
                ) {
                    isSlotAvailable = false;
                    break; // Slot sa prekrýva, hľadaj ďalší
                }
            }

            if (isSlotAvailable) {
                // Formátuj čas na HH:MM
                const hours = String(currentSlotTime.getHours()).padStart(2, '0');
                const minutes = String(currentSlotTime.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            }

            // Posuň sa na ďalší slot (napr. o 15 minút)
            currentSlotTime.setMinutes(currentSlotTime.getMinutes() + 15);
        }

        return null; // Žiadny dostupný slot sa nenašiel
    }


    // Event listener pre zobrazenie modálneho okna pre zápas
    if (addMatchButton) {
        addMatchButton.addEventListener('click', async () => {
            matchForm.reset();
            matchIdInput.value = '';
            deleteMatchButtonModal.style.display = 'none';
            await populateCategorySelect(matchCategorySelect);
            await populateGroupSelect(matchGroupSelect);
            await populateTeamsSelect(matchTeamASelect, matchTeamBSelect);
            await populatePlayingDaySelect(matchDateSelect); // Naplnenie hracích dní do selectu
            await populateSportHallSelect(matchLocationSelect); // Naplnenie hál do selectu
            openModal(matchModal);
            if (addOptions) { // Kontrola, či addOptions existuje
                addOptions.classList.remove('show'); // Skryť dropdown po otvorení modalu
            }
        });
    } else {
        console.error("Element with ID 'addMatchButton' not found in the DOM.");
    }


    // Event listener pre zmenu dátumu alebo haly v modálnom okne zápasu
    if (matchDateSelect) {
        matchDateSelect.addEventListener('change', async () => {
            const selectedDate = matchDateSelect.value;
            const selectedHallId = matchLocationSelect.value;
            if (selectedDate && selectedHallId) {
                const settings = await getTournamentSettings();
                const availableTime = await findEarliestAvailableTime(selectedDate, selectedHallId, settings);
                if (availableTime) {
                    matchTimeInput.value = availableTime;
                } else {
                    matchTimeInput.value = ''; // Vyprázdniť, ak sa nenašiel žiadny slot
                    console.warn("Pre vybraný dátum a halu sa nenašiel žiadny dostupný časový slot.");
                }
            }
        });
    } else {
        console.error("Element with ID 'matchDateSelect' not found in the DOM. Automatic time setting will not work.");
    }


    if (matchLocationSelect) {
        matchLocationSelect.addEventListener('change', async () => {
            const selectedDate = matchDateSelect.value;
            const selectedHallId = matchLocationSelect.value;
            if (selectedDate && selectedHallId) {
                const settings = await getTournamentSettings();
                const availableTime = await findEarliestAvailableTime(selectedDate, selectedHallId, settings);
                if (availableTime) {
                    matchTimeInput.value = availableTime;
                } else {
                    matchTimeInput.value = ''; // Vyprázdniť, ak sa nenašiel žiadny slot
                    console.warn("Pre vybraný dátum a halu sa nenašiel žiadny dostupný časový slot.");
                }
            }
        });
    } else {
        console.error("Element with ID 'matchLocationSelect' not found in the DOM. Automatic time setting will not work.");
    }


    // Funkcia na načítanie tímov pre select boxy
    async function populateTeamsSelect(teamASelect, teamBSelect) {
        teamASelect.innerHTML = '<option value="">-- Vyberte tím A --</option>';
        teamBSelect.innerHTML = '<option value="">-- Vyberte tím B --</option>';
        try {
            const q = query(clubsCollectionRef, orderBy("name"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const team = doc.data();
                const optionA = document.createElement('option');
                optionA.value = doc.id;
                optionA.textContent = team.name;
                teamASelect.appendChild(optionA);

                const optionB = document.createElement('option');
                optionB.value = doc.id;
                optionB.textContent = team.name;
                teamBSelect.appendChild(optionB);
            });
        } catch (error) {
            console.error("Chyba pri načítaní tímov:", error);
        }
    }

    // Funkcia na načítanie športových hál pre select box
    async function populateSportHallSelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte halu --</option>';
        try {
            const q = query(sportHallsCollectionRef, orderBy("name"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = hall.name;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní športových hál:", error);
        }
    }

    // Funkcia na načítanie hracích dní pre select box
    async function populatePlayingDaySelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte hrací deň --</option>';
        try {
            const q = query(playingDaysCollectionRef, orderBy("date"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date; // Ukladáme dátum ako hodnotu
                option.textContent = day.date;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní:", error);
        }
    }

    // Funkcia pre zobrazenie rozvrhu zápasov, hracích dní a hál
    async function displayMatchesAsSchedule() {
        if (!categoriesContentSection) {
            console.error("Element with ID 'categoriesContentSection' not found. Cannot display schedule.");
            return;
        }
        categoriesContentSection.innerHTML = ''; // Vyčisti obsah pred zobrazením

        try {
            // Načítaj všetky hracie dni
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date")));
            const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Načítaj všetky športové haly
            const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name")));
            const sportHalls = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const sportHallMap = new Map(sportHalls.map(hall => [hall.id, hall]));

            // Načítaj všetky zápasy
            const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy("date"), orderBy("time")));
            const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Načítaj všetky autobusy
            const busesSnapshot = await getDocs(query(busesCollectionRef, orderBy("busNumber")));
            const buses = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Načítaj všetky tímy pre zobrazenie mien
            const clubsSnapshot = await getDocs(query(clubsCollectionRef, orderBy("name")));
            const clubsMap = new Map(clubsSnapshot.docs.map(doc => [doc.id, doc.data().name]));

            // Načítaj všetky kategórie a skupiny pre zobrazenie mien
            const categoriesSnapshot = await getDocs(query(categoriesCollectionRef, orderBy("name")));
            const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.id, doc.data().name]));

            const groupsSnapshot = await getDocs(query(groupsCollectionRef, orderBy("name")));
            const groupsMap = new Map(groupsSnapshot.docs.map(doc => [doc.id, doc.data().name]));


            // Vytvor sekciu pre hracie dni
            const playingDaysSection = document.createElement('div');
            playingDaysSection.className = 'section-block';
            playingDaysSection.innerHTML = '<h2>Hracie dni</h2>';
            if (playingDays.length === 0) {
                playingDaysSection.innerHTML += '<p>Žiadne hracie dni zatiaľ neboli pridané.</p>';
            } else {
                const playingDaysList = document.createElement('ul');
                playingDaysList.className = 'item-list';
                playingDays.forEach(day => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <span>${day.date} - ${day.notes || 'Bez poznámok'}</span>
                        <div class="item-actions">
                            <button class="edit-btn" data-id="${day.id}" data-type="playingDay">Upraviť</button>
                            <button class="delete-btn" data-id="${day.id}" data-type="playingDay">Vymazať</button>
                        </div>
                    `;
                    playingDaysList.appendChild(listItem);
                });
                playingDaysSection.appendChild(playingDaysList);
            }
            categoriesContentSection.appendChild(playingDaysSection);

            // Vytvor sekciu pre športové haly
            const sportHallsSection = document.createElement('div');
            sportHallsSection.className = 'section-block';
            sportHallsSection.innerHTML = '<h2>Športové haly</h2>';
            if (sportHalls.length === 0) {
                sportHallsSection.innerHTML += '<p>Žiadne športové haly zatiaľ neboli pridané.</p>';
            } else {
                const sportHallsList = document.createElement('ul');
                sportHallsList.className = 'item-list';
                sportHalls.forEach(hall => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <span>${hall.name} (${hall.address}) - <a href="${hall.googleMapsUrl}" target="_blank">Mapa</a></span>
                        <div class="item-actions">
                            <button class="edit-btn" data-id="${hall.id}" data-type="sportHall">Upraviť</button>
                            <button class="delete-btn" data-id="${hall.id}" data-type="sportHall">Vymazať</button>
                        </div>
                    `;
                    sportHallsList.appendChild(listItem);
                });
                sportHallsSection.appendChild(sportHallsList);
            }
            categoriesContentSection.appendChild(sportHallsSection);


            // Vytvor sekciu pre autobusy
            const busesSection = document.createElement('div');
            busesSection.className = 'section-block';
            busesSection.innerHTML = '<h2>Autobusy</h2>';
            if (buses.length === 0) {
                busesSection.innerHTML += '<p>Žiadne autobusy zatiaľ neboli pridané.</p>';
            } else {
                const busesList = document.createElement('ul');
                busesList.className = 'item-list';
                buses.forEach(bus => {
                    const startHallName = sportHallMap.get(bus.startLocationId)?.name || 'Neznáma hala';
                    const endHallName = sportHallMap.get(bus.endLocationId)?.name || 'Neznáma hala';
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <span>Autobus č. ${bus.busNumber} (${bus.capacity} miest): ${startHallName} (${bus.startTime}) -> ${endHallName} (${bus.endTime}) - ${bus.notes || 'Bez poznámok'}</span>
                        <div class="item-actions">
                            <button class="edit-btn" data-id="${bus.id}" data-type="bus">Upraviť</button>
                            <button class="delete-btn" data-id="${bus.id}" data-type="bus">Vymazať</button>
                        </div>
                    `;
                    busesList.appendChild(listItem);
                });
                busesSection.appendChild(busesList);
            }
            categoriesContentSection.appendChild(busesSection);

            // Vytvor sekciu pre rozvrh zápasov
            const scheduleSection = document.createElement('div');
            scheduleSection.className = 'section-block';
            scheduleSection.innerHTML = '<h2>Rozvrh zápasov</h2>';

            if (playingDays.length === 0 || sportHalls.length === 0) {
                scheduleSection.innerHTML += '<p>Pre zobrazenie rozvrhu je potrebné pridať aspoň jeden hrací deň a jednu športovú halu.</p>';
            } else {
                const scheduleTable = document.createElement('table');
                scheduleTable.className = 'schedule-table';

                // Hlavička tabuľky
                const thead = document.createElement('thead');
                let headerRow = '<tr><th>Dátum / Čas</th>';
                sportHalls.forEach(hall => {
                    headerRow += `<th>${hall.name}</th>`;
                });
                headerRow += '</tr>';
                thead.innerHTML = headerRow;
                scheduleTable.appendChild(thead);

                // Telo tabuľky
                const tbody = document.createElement('tbody');
                playingDays.forEach(day => {
                    // Pre každý hrací deň vytvoríme riadok pre každú hodinu/slot
                    // Zjednodušený prístup: zobrazíme len zápasy, ktoré sú pridané
                    // Pre komplexnejší rozvrh by sme generovali všetky možné časové sloty
                    const matchesForDay = matches.filter(m => m.date === day.date);

                    if (matchesForDay.length === 0) {
                        const row = document.createElement('tr');
                        row.innerHTML = `<td class="schedule-date-cell">${day.date}</td><td colspan="${sportHalls.length}">Žiadne zápasy</td>`;
                        tbody.appendChild(row);
                    } else {
                        // Zoskup zápasy podľa haly a času pre jednoduchšie zobrazenie
                        const scheduleGrid = {}; // { hallId: { time: [match1, match2] } }
                        matchesForDay.forEach(match => {
                            if (!scheduleGrid[match.sportHallId]) {
                                scheduleGrid[match.sportHallId] = {};
                            }
                            if (!scheduleGrid[match.sportHallId][match.time]) {
                                scheduleGrid[match.sportHallId][match.time] = [];
                            }
                            scheduleGrid[match.sportHallId][match.time].push(match);
                        });

                        // Získaj všetky jedinečné časy pre tento deň a zorad ich
                        const uniqueTimes = [...new Set(matchesForDay.map(m => m.time))].sort();

                        uniqueTimes.forEach(time => {
                            const row = document.createElement('tr');
                            row.innerHTML = `<td class="schedule-time-cell">${day.date}<br>${time}</td>`; // Zobraz dátum aj čas v prvom stĺpci

                            sportHalls.forEach(hall => {
                                const cell = document.createElement('td');
                                cell.className = 'schedule-cell';
                                const matchesInCell = scheduleGrid[hall.id]?.[time] || [];

                                if (matchesInCell.length > 0) {
                                    matchesInCell.forEach(match => {
                                        const teamAName = clubsMap.get(match.teamAId) || 'Neznámy tím';
                                        const teamBName = clubsMap.get(match.teamBId) || 'Neznámy tím';
                                        const categoryName = categoriesMap.get(match.categoryId) || 'Neznáma kategória';
                                        const groupName = groupsMap.get(match.groupId) || 'Neznáma skupina';

                                        const matchDiv = document.createElement('div');
                                        matchDiv.className = 'schedule-match-info';
                                        matchDiv.innerHTML = `
                                            <p>${teamAName} vs ${teamBName}</p>
                                            <p class="match-details">(${categoryName} - ${groupName})</p>
                                            <p class="match-details">Rozhodcovia: ${match.referees || 'N/A'}</p>
                                            <p class="match-details">Poznámky: ${match.notes || 'N/A'}</p>
                                            <div class="schedule-cell-actions">
                                                <button class="edit-btn" data-id="${match.id}" data-type="match">Upraviť</button>
                                                <button class="delete-btn" data-id="${match.id}" data-type="match">Vymazať</button>
                                            </div>
                                        `;
                                        cell.appendChild(matchDiv);
                                    });
                                } else {
                                    cell.textContent = ''; // Prázdna bunka, ak tu nie je žiadny zápas
                                }
                                row.appendChild(cell);
                            });
                            tbody.appendChild(row);
                        });
                    }
                });
                scheduleTable.appendChild(tbody);
                scheduleSection.appendChild(scheduleTable);
            }
            categoriesContentSection.appendChild(scheduleSection);


            // Pridaj event listenery pre edit a delete tlačidlá po ich vytvorení
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const type = e.target.dataset.type;
                    if (type === 'playingDay') {
                        await editPlayingDay(id);
                    } else if (type === 'sportHall') {
                        await editSportHall(id);
                    } else if (type === 'match') {
                        await editMatch(id);
                    } else if (type === 'bus') {
                        await editBus(id);
                    }
                });
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const type = e.target.dataset.type;
                    if (confirm(`Naozaj chcete vymazať túto položku (${type})?`)) { // Používame confirm len pre jednoduchosť, v reálnej app by bol custom modal
                        await deleteItem(id, type);
                    }
                });
            });


        } catch (error) {
            console.error("Chyba pri zobrazovaní rozvrhu:", error);
            categoriesContentSection.innerHTML = '<p>Chyba pri načítaní rozvrhu. Skúste to znova.</p>';
        }
    }


    // Funkcie pre editáciu
    async function editPlayingDay(id) {
        try {
            const docRef = doc(playingDaysCollectionRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                playingDayIdInput.value = id;
                playingDayDateInput.value = data.date;
                playingDayNotesInput.value = data.notes || '';
                deletePlayingDayButtonModal.style.display = 'inline-block';
                openModal(playingDayModal);
            } else {
                console.error("Hrací deň sa nenašiel!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracieho dňa na úpravu:", error);
        }
    }

    async function editSportHall(id) {
        try {
            const docRef = doc(sportHallsCollectionRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                sportHallIdInput.value = id;
                hallNameInput.value = data.name;
                hallAddressInput.value = data.address;
                hallGoogleMapsUrlInput.value = data.googleMapsUrl;
                deleteHallButtonModal.style.display = 'inline-block';
                openModal(sportHallModal);
            } else {
                console.error("Športová hala sa nenašla!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní športovej haly na úpravu:", error);
        }
    }

    async function editMatch(id) {
        try {
            const docRef = doc(matchesCollectionRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                matchIdInput.value = id;
                await populateCategorySelect(matchCategorySelect, data.categoryId);
                await populateGroupSelect(matchGroupSelect, data.groupId);
                await populateTeamsSelect(matchTeamASelect, matchTeamBSelect); // Naplnenie tímov
                matchTeamASelect.value = data.teamAId;
                matchTeamBSelect.value = data.teamBId;
                await populatePlayingDaySelect(matchDateSelect); // Naplnenie hracích dní
                matchDateSelect.value = data.date; // Nastavenie vybraného dátumu
                matchTimeInput.value = data.time;
                await populateSportHallSelect(matchLocationSelect); // Naplnenie hál
                matchLocationSelect.value = data.sportHallId; // Nastavenie vybranej haly
                matchRefereesInput.value = data.referees || '';
                matchNotesInput.value = data.notes || '';
                deleteMatchButtonModal.style.display = 'inline-block';
                openModal(matchModal);
            } else {
                console.error("Zápas sa nenašiel!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní zápasu na úpravu:", error);
        }
    }

    async function editBus(id) {
        try {
            const docRef = doc(busesCollectionRef, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                busIdInput.value = id;
                busNumberInput.value = data.busNumber;
                busCapacityInput.value = data.capacity;
                await populateSportHallSelect(busStartLocationSelect); // Naplnenie hál
                busStartLocationSelect.value = data.startLocationId;
                busStartTimeInput.value = data.startTime;
                await populateSportHallSelect(busEndLocationSelect); // Naplnenie hál
                busEndLocationSelect.value = data.endLocationId;
                busEndTimeInput.value = data.endTime;
                busNotesInput.value = data.notes || '';
                deleteBusButtonModal.style.display = 'inline-block';
                openModal(busModal);
            } else {
                console.error("Autobus sa nenašiel!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní autobusu na úpravu:", error);
        }
    }


    // Funkcia pre mazanie položiek
    async function deleteItem(id, type) {
        try {
            let collectionRef;
            if (type === 'playingDay') {
                collectionRef = playingDaysCollectionRef;
            } else if (type === 'sportHall') {
                collectionRef = sportHallsCollectionRef;
            } else if (type === 'match') {
                collectionRef = matchesCollectionRef;
            } else if (type === 'bus') {
                collectionRef = busesCollectionRef;
            } else {
                console.error("Neznámy typ položky na vymazanie:", type);
                return;
            }

            await deleteDoc(doc(collectionRef, id));
            console.log(`${type} úspešne vymazaný!`);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error(`Chyba pri mazaní ${type}:`, error);
            alert(`Chyba pri mazaní ${type}. Pozrite konzolu pre detaily.`);
        }
    }


    // Event listenery pre zatváranie modálnych okien
    if (closeMatchModalButton) {
        closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));
    } else {
        console.warn("Element with ID 'closeMatchModalButton' not found.");
    }
    if (closePlayingDayModalButton) {
        closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));
    } else {
        console.warn("Element with ID 'closePlayingDayModalButton' not found.");
    }
    if (closeSportHallModalButton) {
        closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));
    } else {
        console.warn("Element with ID 'closeSportHallModalButton' not found.");
    }
    if (closeBusModalButton) {
        closeBusModalButton.addEventListener('click', () => closeModal(busModal));
    } else {
        console.warn("Element with ID 'closeBusModalButton' not found.");
    }


    // Event listener pre tlačidlo Pridať
    if (addButton) {
        addButton.addEventListener('click', () => {
            if (addOptions) { // Kontrola, či addOptions existuje
                addOptions.classList.toggle('show');
            }
        });
    } else {
        console.error("Element with ID 'addButton' not found in the DOM.");
    }


    // Skryť dropdown, ak sa klikne mimo neho
    document.addEventListener('click', (e) => {
        if (addButton && addOptions) { // Kontrola, či addButton a addOptions existujú
            if (!addButton.contains(e.target) && !addOptions.contains(e.target)) {
                addOptions.classList.remove('show');
            }
        }
    });

    // Event listenery pre tlačidlá v dropdown menu
    if (addPlayingDayButton) {
        addPlayingDayButton.addEventListener('click', () => {
            playingDayForm.reset();
            playingDayIdInput.value = '';
            deletePlayingDayButtonModal.style.display = 'none';
            openModal(playingDayModal);
            if (addOptions) { // Kontrola, či addOptions existuje
                addOptions.classList.remove('show'); // Skryť dropdown po otvorení modalu
            }
        });
    } else {
        console.error("Element with ID 'addPlayingDayButton' not found in the DOM.");
    }

    if (addSportHallButton) {
        addSportHallButton.addEventListener('click', () => {
            sportHallForm.reset();
            sportHallIdInput.value = '';
            deleteHallButtonModal.style.display = 'none';
            openModal(sportHallModal);
            if (addOptions) { // Kontrola, či addOptions existuje
                addOptions.classList.remove('show'); // Skryť dropdown po otvorení modalu
            }
        });
    } else {
        console.error("Element with ID 'addSportHallButton' not found in the DOM.");
    }

    if (addBusButton) {
        addBusButton.addEventListener('click', async () => {
            busForm.reset();
            busIdInput.value = '';
            deleteBusButtonModal.style.display = 'none';
            await populateSportHallSelect(busStartLocationSelect);
            await populateSportHallSelect(busEndLocationSelect);
            openModal(busModal);
            if (addOptions) { // Kontrola, či addOptions existuje
                addOptions.classList.remove('show'); // Skryť dropdown po otvorení modalu
            }
        });
    } else {
        console.error("Element with ID 'addBusButton' not found in the DOM.");
    }


    // Event listener pre odoslanie formulára zápasu
    if (matchForm) {
        matchForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = matchIdInput.value;
            const teamAId = matchTeamASelect.value;
            const teamBId = matchTeamBSelect.value;
            const categoryId = matchCategorySelect.value;
            const groupId = matchGroupSelect.value;
            const date = matchDateSelect.value;
            const time = matchTimeInput.value;
            const sportHallId = matchLocationSelect.value;
            const referees = matchRefereesInput.value.trim();
            const notes = matchNotesInput.value.trim();

            if (!teamAId || !teamBId || !categoryId || !groupId || !date || !time || !sportHallId) {
                alert('Prosím, vyplňte všetky povinné polia (Tím A, Tím B, Kategória, Skupina, Dátum, Čas, Športová hala).');
                return;
            }

            if (teamAId === teamBId) {
                alert('Tímy A a B nemôžu byť rovnaké.');
                return;
            }

            try {
                const matchData = {
                    teamAId,
                    teamBId,
                    categoryId,
                    groupId,
                    date,
                    time,
                    sportHallId,
                    referees,
                    notes,
                    updatedAt: new Date()
                };

                if (id) {
                    // Úprava existujúceho zápasu
                    await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
                    alert('Zápas úspešne aktualizovaný!');
                } else {
                    // Pridanie nového zápasu
                    await addDoc(matchesCollectionRef, {
                        ...matchData,
                        createdAt: new Date()
                    });
                    alert('Zápas úspešne pridaný!');
                }
                closeModal(matchModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní zápasu: ", error);
                alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
            }
        });
    } else {
        console.error("Element with ID 'matchForm' not found in the DOM.");
    }


    // Event listener pre tlačidlo vymazať v modálnom okne zápasu
    if (deleteMatchButtonModal) {
        deleteMatchButtonModal.addEventListener('click', async () => {
            const id = matchIdInput.value;
            if (id && confirm('Naozaj chcete vymazať tento zápas?')) {
                try {
                    await deleteDoc(doc(matchesCollectionRef, id));
                    alert('Zápas úspešne vymazaný!');
                    closeModal(matchModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní zápasu: ", error);
                    alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
                }
            }
        });
    } else {
        console.warn("Element with ID 'deleteMatchButtonModal' not found.");
    }


    // Event listener pre odoslanie formulára hracieho dňa
    if (playingDayForm) {
        playingDayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = playingDayIdInput.value;
            const date = playingDayDateInput.value;
            const notes = playingDayNotesInput.value.trim();

            if (!date) {
                alert('Prosím, vyplňte dátum hracieho dňa.');
                return;
            }

            try {
                // Kontrola, či už hrací deň s týmto dátumom existuje (iba pri pridávaní)
                if (!id) {
                    const q = query(playingDaysCollectionRef, where("date", "==", date));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        alert('Hrací deň s týmto dátumom už existuje!');
                        return;
                    }
                }

                const playingDayData = {
                    date: date,
                    notes: notes,
                    updatedAt: new Date()
                };

                if (id) {
                    await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                    alert('Hrací deň úspešne aktualizovaný!');
                } else {
                    await addDoc(playingDaysCollectionRef, {
                        ...playingDayData,
                        createdAt: new Date()
                    });
                    alert('Hrací deň úspešne pridaný!');
                }
                closeModal(playingDayModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní hracieho dňa: ", error);
                alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
            }
        });
    } else {
        console.error("Element with ID 'playingDayForm' not found in the DOM.");
    }


    // Event listener pre tlačidlo vymazať v modálnom okne hracieho dňa
    if (deletePlayingDayButtonModal) {
        deletePlayingDayButtonModal.addEventListener('click', async () => {
            const id = playingDayIdInput.value;
            if (id && confirm('Naozaj chcete vymazať tento hrací deň?')) {
                try {
                    await deleteDoc(doc(playingDaysCollectionRef, id));
                    alert('Hrací deň úspešne vymazaný!');
                    closeModal(playingDayModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní hracieho dňa: ", error);
                    alert("Chyba pri mazaní hracieho dňa. Pozrite konzolu pre detaily.");
                }
            }
        });
    } else {
        console.warn("Element with ID 'deletePlayingDayButtonModal' not found.");
    }


    // Event listener pre odoslanie formulára športovej haly
    if (sportHallForm) {
        sportHallForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = sportHallIdInput.value;
            const name = hallNameInput.value.trim();
            const address = hallAddressInput.value.trim();
            const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

            if (!name || !address || !googleMapsUrl) {
                alert('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
                return;
            }

            try {
                new URL(googleMapsUrl); // Validate URL format
            } catch (_) {
                alert('Odkaz na Google Maps musí byť platná URL adresa.');
                return;
            }

            try {
                // Kontrola, či už športová hala s týmto názvom existuje (iba pri pridávaní)
                if (!id) {
                    const q = query(sportHallsCollectionRef, where("name", "==", name));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        alert('Športová hala s týmto názvom už existuje!');
                        return;
                    }
                }

                const sportHallData = {
                    name: name,
                    address: address,
                    googleMapsUrl: googleMapsUrl,
                    updatedAt: new Date()
                };

                if (id) {
                    await setDoc(doc(sportHallsCollectionRef, id), sportHallData, { merge: true });
                    alert('Športová hala úspešne aktualizovaná!');
                } else {
                    await addDoc(sportHallsCollectionRef, {
                        ...sportHallData,
                        createdAt: new Date()
                    });
                    alert('Športová hala úspešne pridaná!');
                }
                closeModal(sportHallModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní športovej haly: ", error);
                alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
            }
        });
    } else {
        console.error("Element with ID 'sportHallForm' not found in the DOM.");
    }


    // Event listener pre tlačidlo vymazať v modálnom okne športovej haly
    if (deleteHallButtonModal) {
        deleteHallButtonModal.addEventListener('click', async () => {
            const id = sportHallIdInput.value;
            if (id && confirm('Naozaj chcete vymazať túto športovú halu?')) {
                try {
                    await deleteDoc(doc(sportHallsCollectionRef, id));
                    alert('Športová hala úspešne vymazaná!');
                    closeModal(sportHallModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní športovej haly: ", error);
                    alert("Chyba pri mazaní športovej haly. Pozrite konzolu pre detaily.");
                }
            }
        });
    } else {
        console.warn("Element with ID 'deleteHallButtonModal' not found.");
    }


    // Event listener pre odoslanie formulára autobusu
    if (busForm) {
        busForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = busIdInput.value;
            const busNumber = busNumberInput.value.trim();
            const capacity = parseInt(busCapacityInput.value, 10);
            const startLocationId = busStartLocationSelect.value;
            const startTime = busStartTimeInput.value;
            const endLocationId = busEndLocationSelect.value;
            const endTime = busEndTimeInput.value;
            const notes = busNotesInput.value.trim();

            if (!busNumber || isNaN(capacity) || !startLocationId || !startTime || !endLocationId || !endTime) {
                alert('Prosím, vyplňte všetky povinné polia (Číslo autobusu, Kapacita, Miesto začiatku, Čas začiatku, Miesto príchodu, Čas príchodu).');
                return;
            }

            if (startLocationId === endLocationId) {
                alert('Miesto začiatku a miesto príchodu nemôžu byť rovnaké.');
                return;
            }

            try {
                const busData = {
                    busNumber: busNumber,
                    capacity: capacity,
                    startLocationId: startLocationId,
                    startTime: startTime,
                    endLocationId: endLocationId,
                    endTime: endTime,
                    notes: notes,
                    updatedAt: new Date()
                };

                if (id) {
                    await setDoc(doc(busesCollectionRef, id), busData, { merge: true });
                    alert('Autobus úspešne aktualizovaný!');
                } else {
                    await addDoc(busesCollectionRef, {
                        ...busData,
                        createdAt: new Date()
                    });
                    alert('Autobus úspešne pridaný!');
                }
                closeModal(busModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní autobusu: ", error);
                alert("Chyba pri ukladaní autobusu. Pozrite konzolu pre detaily.");
            }
        });
    } else {
        console.error("Element with ID 'busForm' not found in the DOM.");
    }


    // Event listener pre tlačidlo vymazať v modálnom okne autobusu
    if (deleteBusButtonModal) {
        deleteBusButtonModal.addEventListener('click', async () => {
            const id = busIdInput.value;
            if (id && confirm('Naozaj chcete vymazať tento autobus?')) {
                try {
                    await deleteDoc(doc(busesCollectionRef, id));
                    alert('Autobus úspešne vymazaný!');
                    closeModal(busModal);
                    await displayMatchesAsSchedule();
                } catch (error) {
                    console.error("Chyba pri mazaní autobusu: ", error);
                    alert("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
                }
            }
        });
    } else {
        console.warn("Element with ID 'deleteBusButtonModal' not found.");
    }


    // Inicializácia: Zobraz rozvrh pri načítaní stránky
    await displayMatchesAsSchedule();
});
