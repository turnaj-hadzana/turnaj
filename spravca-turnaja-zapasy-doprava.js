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
    const playingDaySelect = document.getElementById('playingDaySelect');
    const categorySelect = document.getElementById('categorySelect');
    const groupSelect = document.getElementById('groupSelect');
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    const hallSelect = document.getElementById('hallSelect');
    const matchStartTimeInput = document.getElementById('matchStartTimeInput');
    const matchEndTimeInput = document.getElementById('matchEndTimeInput');
    const matchResultTeam1 = document.getElementById('matchResultTeam1');
    const matchResultTeam2 = document.getElementById('matchResultTeam2');
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
    const busNumberInput = document.getElementById('busNumberInput');
    const busCapacityInput = document.getElementById('busCapacityInput');
    const busDriverNameInput = document.getElementById('busDriverNameInput');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    const matchesContainer = document.getElementById('matchesContainer'); // Kontajner pre zobrazenie zápasov

    // Konštantné ID dokumentu pre nastavenia
    const SETTINGS_DOC_ID = 'matchTimeSettings';

    // Funkcia na načítanie nastavení času zápasov
    async function getMatchTimeSettings() {
        try {
            const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
            const settingsDoc = await getDoc(settingsDocRef);
            if (settingsDoc.exists()) {
                return settingsDoc.data();
            } else {
                console.warn("Nastavenia času zápasov neboli nájdené, použijú sa predvolené hodnoty.");
                return { firstDayStartTime: '12:00', otherDaysStartTime: '08:00' };
            }
        } catch (error) {
            console.error("Chyba pri načítaní nastavení času zápasov: ", error);
            return { firstDayStartTime: '12:00', otherDaysStartTime: '08:00' }; // Predvolené hodnoty pri chybe
        }
    }

    // Funkcia na výpočet prvého voľného času zápasu
    async function calculateFirstAvailableMatchTime() {
        const selectedHallId = hallSelect.value;
        const selectedPlayingDayId = playingDaySelect.value;

        if (!selectedHallId || !selectedPlayingDayId) {
            matchStartTimeInput.value = ''; // Vyčisti čas, ak nie je vybraná hala alebo deň
            return;
        }

        const settings = await getMatchTimeSettings();

        // Získanie dátumu vybraného hracieho dňa
        const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, selectedPlayingDayId));
        if (!playingDayDoc.exists()) {
            console.error("Vybraný hrací deň neexistuje.");
            matchStartTimeInput.value = '';
            return;
        }
        const playingDayDate = playingDayDoc.data().date; // Predpokladáme, že 'date' je reťazec 'YYYY-MM-DD'

        let defaultStartTime;
        // Zisti, či je to prvý hrací deň (potrebovali by sme porovnať s najskorším hracím dňom)
        // Pre zjednodušenie teraz použijeme len dátum, ak je to prvý deň v zozname, použijeme firstDayStartTime
        // Ak by sme chceli presne určiť "prvý hrací deň", museli by sme načítať všetky hracie dni a nájsť najskorší.
        // Pre túto implementáciu predpokladáme, že prvý hrací deň je ten, ktorý je najskôr v databáze.
        const allPlayingDaysQuery = query(playingDaysCollectionRef, orderBy('date'));
        const allPlayingDaysSnapshot = await getDocs(allPlayingDaysQuery);
        const allPlayingDays = allPlayingDaysSnapshot.docs.map(doc => doc.data().date);
        const isFirstPlayingDay = allPlayingDays.length > 0 && playingDayDate === allPlayingDays[0];

        if (isFirstPlayingDay) {
            defaultStartTime = settings.firstDayStartTime;
        } else {
            defaultStartTime = settings.otherDaysStartTime;
        }

        let earliestAvailableTime = defaultStartTime;

        // Načítaj existujúce zápasy pre vybranú halu a deň
        const q = query(
            matchesCollectionRef,
            where("hallId", "==", selectedHallId),
            where("playingDayId", "==", selectedPlayingDayId)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const match = doc.data();
            // Získaj čas konca zápasu a porovnaj ho s aktuálnym earliestAvailableTime
            // Predpokladáme, že match.endTime je reťazec "HH:MM"
            if (match.endTime) {
                // Porovnanie časov ako reťazcov funguje, ak sú vo formáte HH:MM
                if (match.endTime > earliestAvailableTime) {
                    earliestAvailableTime = match.endTime;
                }
            }
        });

        // Pridaj k earliestAvailableTime minimálny interval (napr. 15 minút)
        // Prevod času na objekt Date pre jednoduchšiu manipuláciu
        const [hours, minutes] = earliestAvailableTime.split(':').map(Number);
        const tempDate = new Date();
        tempDate.setHours(hours);
        tempDate.setMinutes(minutes + 15); // Pridaj 15 minút
        tempDate.setSeconds(0);
        tempDate.setMilliseconds(0);

        // Formátuj späť na "HH:MM"
        const newHours = String(tempDate.getHours()).padStart(2, '0');
        const newMinutes = String(tempDate.getMinutes()).padStart(2, '0');
        const finalAvailableTime = `${newHours}:${newMinutes}`;

        matchStartTimeInput.value = finalAvailableTime;
    }

    // Event listener pre zmeny v select boxoch haly a hracieho dňa
    hallSelect.addEventListener('change', calculateFirstAvailableMatchTime);
    playingDaySelect.addEventListener('change', calculateFirstAvailableMatchTime);


    // Zobrazenie rozbaľovacieho menu po kliknutí na tlačidlo "+"
    addButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Zabráni šíreniu udalosti na document
        addOptions.classList.toggle('show');
    });

    // Skrytie rozbaľovacieho menu po kliknutí kamkoľvek mimo neho
    document.addEventListener('click', (e) => {
        if (!addOptions.contains(e.target) && !addButton.contains(e.target)) {
            addOptions.classList.remove('show');
        }
    });

    // Event listener pre pridanie hracieho dňa
    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = ''; // Vyčisti ID pre nový záznam
        deletePlayingDayButtonModal.style.display = 'none'; // Skry tlačidlo vymazať
        openModal(playingDayModal);
    });

    // Event listener pre pridanie športovej haly
    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        hallIdInput.value = ''; // Vyčisti ID pre nový záznam
        deleteHallButtonModal.style.display = 'none'; // Skry tlačidlo vymazať
        openModal(sportHallModal);
    });

    // Event listener pre pridanie zápasu
    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = ''; // Vyčisti ID pre nový záznam
        deleteMatchButtonModal.style.display = 'none'; // Skry tlačidlo vymazať
        await populatePlayingDaySelect();
        await populateSportHallSelect();
        await populateCategorySelect(categorySelect);
        await populateGroupSelect(groupSelect, categorySelect.value); // Naplni skupiny na základe vybranej kategórie
        await populateTeamSelect(team1Select, groupSelect.value);
        await populateTeamSelect(team2Select, groupSelect.value);
        // Automaticky vypočítaj a nastav čas pri otvorení modálu, ak sú už vybrané hodnoty
        await calculateFirstAvailableMatchTime();
        openModal(matchModal);
    });

    // Event listener pre pridanie autobusu
    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = ''; // Vyčisti ID pre nový záznam
        deleteBusButtonModal.style.display = 'none'; // Skry tlačidlo vymazať
        await populateSportHallSelectForBus(busStartLocationSelect);
        await populateSportHallSelectForBus(busEndLocationSelect);
        openModal(busModal);
    });

    // Funkcia na naplnenie select boxu hracích dní
    async function populatePlayingDaySelect(selectedPlayingDayId = null) {
        playingDaySelect.innerHTML = '<option value="">-- Vyberte hrací deň --</option>';
        try {
            const q = query(playingDaysCollectionRef, orderBy('date'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = day.date + (day.notes ? ` (${day.notes})` : '');
                playingDaySelect.appendChild(option);
            });
            if (selectedPlayingDayId) {
                playingDaySelect.value = selectedPlayingDayId;
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní: ", error);
        }
    }

    // Funkcia na naplnenie select boxu športových hál
    async function populateSportHallSelect(selectedHallId = null) {
        hallSelect.innerHTML = '<option value="">-- Vyberte halu --</option>';
        try {
            const q = query(sportHallsCollectionRef, orderBy('name'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = hall.name;
                hallSelect.appendChild(option);
            });
            if (selectedHallId) {
                hallSelect.value = selectedHallId;
            }
        } catch (error) {
            console.error("Chyba pri načítaní športových hál: ", error);
        }
    }

    // Funkcia na naplnenie select boxu tímov (pre Team 1 a Team 2)
    async function populateTeamSelect(selectElement, groupId = null) {
        selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
        if (!groupId) return;

        try {
            const q = query(clubsCollectionRef, where("groupId", "==", groupId), orderBy('name'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const team = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = team.name;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní tímov: ", error);
        }
    }

    // Funkcia na naplnenie select boxu športových hál pre autobus (Start/End Location)
    async function populateSportHallSelectForBus(selectElement, selectedHallId = null) {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (halu) --</option>';
        try {
            const q = query(sportHallsCollectionRef, orderBy('name'));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = hall.name;
                selectElement.appendChild(option);
            });
            if (selectedHallId) {
                selectElement.value = selectedHallId;
            }
        } catch (error) {
            console.error("Chyba pri načítaní športových hál pre autobus: ", error);
        }
    }

    // Event listener pre zmenu kategórie v modálnom okne zápasu
    categorySelect.addEventListener('change', async () => {
        await populateGroupSelect(groupSelect, categorySelect.value);
        // Po zmene kategórie a naplnení skupín, resetuj výber tímov
        team1Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
        team2Select.innerHTML = '<option value="">-- Vyberte tím --</option>';
    });

    // Event listener pre zmenu skupiny v modálnom okne zápasu
    groupSelect.addEventListener('change', async () => {
        await populateTeamSelect(team1Select, groupSelect.value);
        await populateTeamSelect(team2Select, groupSelect.value);
    });


    // Funkcia na zobrazenie zápasov ako rozvrhu
    async function displayMatchesAsSchedule() {
        matchesContainer.innerHTML = ''; // Vyčisti kontajner pred opätovným načítaním

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy('date')));
        const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy('name')));
        const matchesSnapshot = await getDocs(matchesCollectionRef); // Načítaj všetky zápasy

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sportHalls = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (playingDays.length === 0 || sportHalls.length === 0) {
            matchesContainer.innerHTML = '<p>Pre zobrazenie rozvrhu pridajte aspoň jeden hrací deň a jednu športovú halu.</p>';
            return;
        }

        // Vytvorenie hlavičky s časovými slotmi
        const timeSlots = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) { // 30 minútové sloty
                timeSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
        }

        // Vytvorenie hlavičky pre hracie dni
        const scheduleHeader = document.createElement('div');
        scheduleHeader.classList.add('schedule-header');
        scheduleHeader.style.gridTemplateColumns = `minmax(150px, 1fr) repeat(${timeSlots.length}, minmax(80px, 1fr))`; // Prvý stĺpec pre haly, ostatné pre časy

        // Prázdna bunka vľavo hore
        const emptyCorner = document.createElement('div');
        emptyCorner.classList.add('schedule-cell', 'header-cell', 'corner-cell');
        scheduleHeader.appendChild(emptyCorner);

        // Časové sloty
        timeSlots.forEach(slot => {
            const timeCell = document.createElement('div');
            timeCell.classList.add('schedule-cell', 'header-cell');
            timeCell.textContent = slot;
            scheduleHeader.appendChild(timeCell);
        });
        matchesContainer.appendChild(scheduleHeader);


        // Pre každý hrací deň vytvoríme samostatný rozvrh
        playingDays.forEach(day => {
            const daySection = document.createElement('div');
            daySection.classList.add('playing-day-section');

            const dayTitle = document.createElement('h3');
            dayTitle.textContent = `${day.date} ${day.notes ? `(${day.notes})` : ''}`;
            daySection.appendChild(dayTitle);

            const dayScheduleGrid = document.createElement('div');
            dayScheduleGrid.classList.add('day-schedule-grid');
            dayScheduleGrid.style.gridTemplateColumns = `minmax(150px, 1fr) repeat(${timeSlots.length}, minmax(80px, 1fr))`;

            // Hlavička s halami (pre každý deň)
            const hallHeaderRow = document.createElement('div');
            hallHeaderRow.classList.add('schedule-row', 'hall-header-row');
            // Prázdna bunka pre zarovnanie s časmi
            const hallHeaderEmpty = document.createElement('div');
            hallHeaderEmpty.classList.add('schedule-cell', 'header-cell');
            hallHeaderRow.appendChild(hallHeaderEmpty);
            timeSlots.forEach(slot => { // Pridaj časové sloty aj do hlavičky dňa pre vizuálne zarovnanie
                const timeCell = document.createElement('div');
                timeCell.classList.add('schedule-cell', 'header-cell', 'time-slot-label');
                timeCell.textContent = slot;
                hallHeaderRow.appendChild(timeCell);
            });
            // dayScheduleGrid.appendChild(hallHeaderRow); // Už máme globálnu hlavičku, toto by duplikovalo

            sportHalls.forEach(hall => {
                const hallRow = document.createElement('div');
                hallRow.classList.add('schedule-row', 'hall-row');
                hallRow.dataset.hallId = hall.id;

                const hallNameCell = document.createElement('div');
                hallNameCell.classList.add('schedule-cell', 'hall-name-cell');
                hallNameCell.textContent = hall.name;
                hallRow.appendChild(hallNameCell);

                // Filter matches for the current day and hall
                const matchesInHallAndDay = allMatches.filter(match =>
                    match.playingDayId === day.id && match.hallId === hall.id
                );

                // Sort matches by start time
                matchesInHallAndDay.sort((a, b) => {
                    const timeA = a.startTime.split(':').map(Number);
                    const timeB = b.startTime.split(':').map(Number);
                    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                    return timeA[1] - timeB[1];
                });

                // Create cells for each time slot
                timeSlots.forEach(slot => {
                    const slotCell = document.createElement('div');
                    slotCell.classList.add('schedule-cell', 'time-slot-cell');
                    slotCell.dataset.time = slot;
                    hallRow.appendChild(slotCell);
                });

                // Place matches into the appropriate time slots
                matchesInHallAndDay.forEach(async (match) => {
                    const matchStart = match.startTime;
                    const matchEnd = match.endTime;

                    // Find the starting grid column based on matchStart time
                    const startIndex = timeSlots.indexOf(matchStart);
                    if (startIndex === -1) {
                        console.warn(`Zápas s ID ${match.id} má neplatný čas začiatku: ${matchStart}.`);
                        return;
                    }

                    // Calculate the span based on match duration
                    const [startH, startM] = matchStart.split(':').map(Number);
                    const [endH, endM] = matchEnd.split(':').map(Number);

                    const startDate = new Date(0, 0, 0, startH, startM);
                    const endDate = new Date(0, 0, 0, endH, endM);
                    const durationMinutes = (endDate - startDate) / (1000 * 60);
                    const span = Math.ceil(durationMinutes / 30); // Each slot is 30 minutes

                    const matchElement = document.createElement('div');
                    matchElement.classList.add('schedule-match-block');
                    matchElement.textContent = `${match.startTime} - ${match.endTime}\n${match.team1Name} vs ${match.team2Name}`;
                    matchElement.dataset.matchId = match.id;
                    matchElement.style.gridColumn = `${startIndex + 2} / span ${span}`; // +2 lebo prvý stĺpec je pre názov haly a druhý je prvý časový slot

                    // Pridaj event listener pre editáciu zápasu
                    matchElement.addEventListener('click', () => editMatch(match.id));

                    // Nájdi bunku, do ktorej sa má zápas vložiť (prvá bunka časového slotu)
                    const targetCell = hallRow.querySelector(`.time-slot-cell[data-time="${matchStart}"]`);
                    if (targetCell) {
                        // Vlož zápas do riadku, nie do konkrétnej bunky, aby mohol prechádzať cez stĺpce
                        hallRow.appendChild(matchElement);
                    } else {
                        console.warn(`Nenašla sa cieľová bunka pre zápas s ID ${match.id}.`);
                    }
                });

                dayScheduleGrid.appendChild(hallRow);
            });
            daySection.appendChild(dayScheduleGrid);
            matchesContainer.appendChild(daySection);
        });
    }


    // Funkcia na editáciu zápasu
    async function editMatch(matchId) {
        try {
            const matchDoc = await getDoc(doc(matchesCollectionRef, matchId));
            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchDoc.id;
                await populatePlayingDaySelect(matchData.playingDayId);
                await populateSportHallSelect(matchData.hallId);
                await populateCategorySelect(categorySelect, matchData.categoryId);
                await populateGroupSelect(groupSelect, matchData.categoryId, matchData.groupId);
                await populateTeamSelect(team1Select, matchData.groupId);
                team1Select.value = matchData.team1Id;
                await populateTeamSelect(team2Select, matchData.groupId);
                team2Select.value = matchData.team2Id;
                matchStartTimeInput.value = matchData.startTime;
                matchEndTimeInput.value = matchData.endTime;
                matchResultTeam1.value = matchData.resultTeam1 || '';
                matchResultTeam2.value = matchData.resultTeam2 || '';
                matchNotesInput.value = matchData.notes || '';

                deleteMatchButtonModal.style.display = 'inline-block';
                openModal(matchModal);
            } else {
                console.error("Zápas nebol nájdený!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní zápasu na editáciu: ", error);
        }
    }

    // Funkcia na editáciu hracieho dňa
    async function editPlayingDay(playingDayId) {
        try {
            const playingDayDoc = await getDoc(doc(playingDaysCollectionRef, playingDayId));
            if (playingDayDoc.exists()) {
                const dayData = playingDayDoc.data();
                playingDayIdInput.value = playingDayDoc.id;
                playingDayDateInput.value = dayData.date;
                playingDayNotesInput.value = dayData.notes || '';
                deletePlayingDayButtonModal.style.display = 'inline-block';
                openModal(playingDayModal);
            } else {
                console.error("Hrací deň nebol nájdený!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracieho dňa na editáciu: ", error);
        }
    }

    // Funkcia na editáciu športovej haly
    async function editSportHall(hallId) {
        try {
            const hallDoc = await getDoc(doc(sportHallsCollectionRef, hallId));
            if (hallDoc.exists()) {
                const hallData = hallDoc.data();
                hallIdInput.value = hallDoc.id;
                hallNameInput.value = hallData.name;
                hallAddressInput.value = hallData.address;
                hallGoogleMapsUrlInput.value = hallData.googleMapsUrl;
                deleteHallButtonModal.style.display = 'inline-block';
                openModal(sportHallModal);
            } else {
                console.error("Športová hala nebola nájdená!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní športovej haly na editáciu: ", error);
        }
    }

    // Funkcia na editáciu autobusu
    async function editBus(busId) {
        try {
            const busDoc = await getDoc(doc(busesCollectionRef, busId));
            if (busDoc.exists()) {
                const busData = busDoc.data();
                busIdInput.value = busDoc.id;
                busNumberInput.value = busData.busNumber;
                busCapacityInput.value = busData.capacity;
                busDriverNameInput.value = busData.driverName || '';
                await populateSportHallSelectForBus(busStartLocationSelect, busData.startLocationId);
                busStartTimeInput.value = busData.startTime;
                await populateSportHallSelectForBus(busEndLocationSelect, busData.endLocationId);
                busEndTimeInput.value = busData.endTime;
                busNotesInput.value = busData.notes || '';
                deleteBusButtonModal.style.display = 'inline-block';
                openModal(busModal);
            } else {
                console.error("Autobus nebol nájdený!");
            }
        } catch (error) {
            console.error("Chyba pri načítaní autobusu na editáciu: ", error);
        }
    }


    // Event listener pre odoslanie formulára zápasu
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = matchIdInput.value;
        const playingDayId = playingDaySelect.value;
        const categoryId = categorySelect.value;
        const groupId = groupSelect.value;
        const team1Id = team1Select.value;
        const team2Id = team2Select.value;
        const hallId = hallSelect.value;
        const startTime = matchStartTimeInput.value;
        const endTime = matchEndTimeInput.value;
        const resultTeam1 = matchResultTeam1.value ? parseInt(matchResultTeam1.value) : null;
        const resultTeam2 = matchResultTeam2.value ? parseInt(matchResultTeam2.value) : null;
        const notes = matchNotesInput.value.trim();

        if (!playingDayId || !categoryId || !groupId || !team1Id || !team2Id || !hallId || !startTime || !endTime) {
            alert('Prosím, vyplňte všetky povinné polia zápasu.');
            return;
        }
        if (team1Id === team2Id) {
            alert('Tímy nemôžu byť rovnaké.');
            return;
        }

        // Získanie názvov tímov pre uloženie
        const team1Doc = await getDoc(doc(clubsCollectionRef, team1Id));
        const team2Doc = await getDoc(doc(clubsCollectionRef, team2Id));
        const team1Name = team1Doc.exists() ? team1Doc.data().name : 'Neznámy tím 1';
        const team2Name = team2Doc.exists() ? team2Doc.data().name : 'Neznámy tím 2';

        const matchData = {
            playingDayId,
            categoryId,
            groupId,
            team1Id,
            team2Id,
            team1Name, // Ulož názov tímu
            team2Name, // Ulož názov tímu
            hallId,
            startTime,
            endTime,
            resultTeam1,
            resultTeam2,
            notes,
            updatedAt: new Date()
        };

        try {
            if (id) {
                await setDoc(doc(matchesCollectionRef, id), matchData, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                matchData.createdAt = new Date();
                await addDoc(matchesCollectionRef, matchData);
                alert('Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    // Event listener pre vymazanie zápasu
    deleteMatchButtonModal.addEventListener('click', async () => {
        const matchId = matchIdInput.value;
        if (matchId && confirm('Naozaj chcete vymazať tento zápas?')) {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                alert('Zápas úspešne vymazaný!');
                closeModal(matchModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    });

    // Event listener pre odoslanie formulára hracieho dňa
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = playingDayIdInput.value;
        const date = playingDayDateInput.value;
        const notes = playingDayNotesInput.value.trim();

        if (!date) {
            alert('Prosím, vyplňte dátum hracieho dňa.');
            return;
        }

        const dayData = { date, notes, updatedAt: new Date() };

        try {
            if (id) {
                await setDoc(doc(playingDaysCollectionRef, id), dayData, { merge: true });
                alert('Hrací deň úspešne aktualizovaný!');
            } else {
                dayData.createdAt = new Date();
                await addDoc(playingDaysCollectionRef, dayData);
                alert('Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // Event listener pre vymazanie hracieho dňa
    deletePlayingDayButtonModal.addEventListener('click', async () => {
        const playingDayId = playingDayIdInput.value;
        if (playingDayId && confirm('Naozaj chcete vymazať tento hrací deň a všetky súvisiace zápasy?')) {
            try {
                const batch = writeBatch(db);

                // Vymazať všetky zápasy súvisiace s týmto hracím dňom
                const matchesToDeleteQuery = query(matchesCollectionRef, where("playingDayId", "==", playingDayId));
                const matchesToDeleteSnapshot = await getDocs(matchesToDeleteQuery);
                matchesToDeleteSnapshot.forEach(matchDoc => {
                    batch.delete(matchDoc.ref);
                });

                // Vymazať samotný hrací deň
                batch.delete(doc(playingDaysCollectionRef, playingDayId));

                await batch.commit();

                alert('Hrací deň a súvisiace zápasy úspešne vymazané!');
                closeModal(playingDayModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní hracieho dňa: ", error);
                alert("Chyba pri mazaní hracieho dňa. Pozrite konzolu pre detaily.");
            }
        }
    });

    // Event listener pre odoslanie formulára športovej haly
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = hallIdInput.value;
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
            // Kontrola duplicity názvu haly
            const q = query(sportHallsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && !(id && querySnapshot.docs[0].id === id)) {
                alert('Športová hala s týmto názvom už existuje!');
                return;
            }

            const hallData = { name, address, googleMapsUrl, updatedAt: new Date() };

            if (id) {
                await setDoc(doc(sportHallsCollectionRef, id), hallData, { merge: true });
                alert('Športová hala úspešne aktualizovaná!');
            } else {
                hallData.createdAt = new Date();
                await addDoc(sportHallsCollectionRef, hallData);
                alert('Športová hala úspešne pridaná!');
            }
            closeModal(sportHallModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });

    // Event listener pre vymazanie športovej haly
    deleteHallButtonModal.addEventListener('click', async () => {
        const hallId = hallIdInput.value;
        if (hallId && confirm('Naozaj chcete vymazať túto športovú halu a všetky súvisiace zápasy a autobusy?')) {
            try {
                const batch = writeBatch(db);

                // Vymazať všetky zápasy súvisiace s touto halou
                const matchesToDeleteQuery = query(matchesCollectionRef, where("hallId", "==", hallId));
                const matchesToDeleteSnapshot = await getDocs(matchesToDeleteQuery);
                matchesToDeleteSnapshot.forEach(matchDoc => {
                    batch.delete(matchDoc.ref);
                });

                // Vymazať všetky autobusy, ktoré majú túto halu ako štartovú alebo koncovú lokalitu
                const busesToDeleteStartQuery = query(busesCollectionRef, where("startLocationId", "==", hallId));
                const busesToDeleteStartSnapshot = await getDocs(busesToDeleteStartQuery);
                busesToDeleteStartSnapshot.forEach(busDoc => {
                    batch.delete(busDoc.ref);
                });

                const busesToDeleteEndQuery = query(busesCollectionRef, where("endLocationId", "==", hallId));
                const busesToDeleteEndSnapshot = await getDocs(busesToDeleteEndQuery);
                busesToDeleteEndSnapshot.forEach(busDoc => {
                    batch.delete(busDoc.ref);
                });

                // Vymazať samotnú halu
                batch.delete(doc(sportHallsCollectionRef, hallId));

                await batch.commit();

                alert('Športová hala a súvisiace zápasy/autobusy úspešne vymazané!');
                closeModal(sportHallModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní športovej haly: ", error);
                alert("Chyba pri mazaní športovej haly. Pozrite konzolu pre detaily.");
            }
        }
    });

    // Event listener pre odoslanie formulára autobusu
    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = busIdInput.value;
        const busNumber = busNumberInput.value.trim();
        const capacity = parseInt(busCapacityInput.value);
        const driverName = busDriverNameInput.value.trim();
        const startLocationId = busStartLocationSelect.value;
        const startTime = busStartTimeInput.value;
        const endLocationId = busEndLocationSelect.value;
        const endTime = busEndTimeInput.value;
        const notes = busNotesInput.value.trim();

        if (!busNumber || isNaN(capacity) || !startLocationId || !startTime || !endLocationId || !endTime) {
            alert('Prosím, vyplňte všetky povinné polia autobusu (Číslo autobusu, Kapacita, Miesto/čas odchodu/príchodu).');
            return;
        }

        const busData = {
            busNumber,
            capacity,
            driverName,
            startLocationId,
            startTime,
            endLocationId,
            endTime,
            notes,
            updatedAt: new Date()
        };

        try {
            if (id) {
                await setDoc(doc(busesCollectionRef, id), busData, { merge: true });
                alert('Autobus úspešne aktualizovaný!');
            } else {
                busData.createdAt = new Date();
                await addDoc(busesCollectionRef, busData);
                alert('Autobus úspešne pridaný!');
            }
            closeModal(busModal);
            // Ak by sme chceli zobrazovať aj autobusy v rozvrhu, museli by sme tu volať displayMatchesAsSchedule
            // alebo novú funkciu pre zobrazenie autobusov.
        } catch (error) {
            console.error("Chyba pri ukladaní autobusu: ", error);
            alert("Chyba pri ukladaní autobusu. Pozrite konzolu pre detaily.");
        }
    });

    // Event listener pre vymazanie autobusu
    deleteBusButtonModal.addEventListener('click', async () => {
        const busId = busIdInput.value;
        if (busId && confirm('Naozaj chcete vymazať tento autobus?')) {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                alert('Autobus úspešne vymazaný!');
                closeModal(busModal);
            } catch (error) {
                console.error("Chyba pri mazaní autobusu: ", error);
                alert("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
            }
        }
    });


    // Inicializácia zobrazenia rozvrhu pri načítaní stránky
    await displayMatchesAsSchedule();
});

