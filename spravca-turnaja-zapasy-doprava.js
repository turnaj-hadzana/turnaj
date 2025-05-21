import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, busesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

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
    const matchTeam1Select = document.getElementById('matchTeam1Select');
    const matchTeam2Select = document.getElementById('matchTeam2Select');
    const matchPlayingDaySelect = document.getElementById('matchPlayingDaySelect');
    const matchSportHallSelect = document.getElementById('matchSportHallSelect');
    const matchTimeInput = document.getElementById('matchTimeInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
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
    const busCapacityInput = document.getElementById('busCapacityInput');
    const busPlayingDaySelect = document.getElementById('busPlayingDaySelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    // NOVÉ: Elementy pre výber tímov do autobusu
    const busTeamCategorySelect = document.getElementById('busTeamCategorySelect');
    const busTeamGroupSelect = document.getElementById('busTeamGroupSelect');
    const busTeamSelect = document.getElementById('busTeamSelect');
    const addTeamToBusButton = document.getElementById('addTeamToBusButton');
    const busSelectedTeamsDisplay = document.getElementById('busSelectedTeamsDisplay');

    let currentBusSelectedTeams = []; // Pole pre uloženie vybraných tímov pre aktuálny autobus

    /**
     * Aktualizuje zobrazenie vybraných tímov v modálnom okne autobusu.
     */
    function updateBusSelectedTeamsDisplay() {
        busSelectedTeamsDisplay.innerHTML = '';
        if (currentBusSelectedTeams.length === 0) {
            busSelectedTeamsDisplay.innerHTML = '<p class="text-gray-500 text-sm">Žiadne tímy neboli priradené.</p>';
            return;
        }
        currentBusSelectedTeams.forEach(team => {
            const teamTag = document.createElement('span');
            teamTag.className = 'selected-item-tag';
            teamTag.innerHTML = `
                ${team.name} (${team.categoryName} - ${team.groupName})
                <button type="button" class="remove-item-btn" data-team-id="${team.id}">&times;</button>
            `;
            busSelectedTeamsDisplay.appendChild(teamTag);
        });

        // Pridanie event listenerov pre tlačidlá odstránenia
        busSelectedTeamsDisplay.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const teamIdToRemove = e.target.dataset.teamId;
                currentBusSelectedTeams = currentBusSelectedTeams.filter(team => team.id !== teamIdToRemove);
                updateBusSelectedTeamsDisplay();
            });
        });
    }

    /**
     * Naplní select box s tímami na základe vybranej kategórie a skupiny.
     * @param {string|null} categoryId ID vybranej kategórie.
     * @param {string|null} groupId ID vybranej skupiny.
     */
    async function populateBusTeamSelect(categoryId = null, groupId = null) {
        busTeamSelect.innerHTML = '<option value="">-- Vyberte tím --</option>';
        let q = query(clubsCollectionRef); // Predpokladáme, že 'clubs' sú tímy

        if (categoryId) {
            q = query(q, where("categoryId", "==", categoryId));
        }
        if (groupId) {
            q = query(q, where("groupId", "==", groupId));
        }

        try {
            const querySnapshot = await getDocs(q);
            const teams = [];
            for (const docSnapshot of querySnapshot.docs) {
                const teamData = docSnapshot.data();
                // Načítanie názvov kategórie a skupiny pre zobrazenie
                let categoryName = 'Neznáma kategória';
                let groupName = 'Neznáma skupina';

                if (teamData.categoryId) {
                    const categoryDoc = await getDoc(doc(categoriesCollectionRef, teamData.categoryId));
                    if (categoryDoc.exists()) {
                        categoryName = categoryDoc.data().name;
                    }
                }
                if (teamData.groupId) {
                    const groupDoc = await getDoc(doc(groupsCollectionRef, teamData.groupId));
                    if (groupDoc.exists()) {
                        groupName = groupDoc.data().name;
                    }
                }
                teams.push({
                    id: docSnapshot.id,
                    name: teamData.name,
                    categoryName: categoryName,
                    groupName: groupName,
                    ordinalNumber: teamData.ordinalNumber // Predpokladáme, že ordinalNumber existuje
                });
            }

            // Zoradenie tímov podľa kategórie, potom skupiny, potom poradového čísla
            teams.sort((a, b) => {
                if (a.categoryName < b.categoryName) return -1;
                if (a.categoryName > b.categoryName) return 1;
                if (a.groupName < b.groupName) return -1;
                if (a.groupName > b.groupName) return 1;
                return (a.ordinalNumber || 0) - (b.ordinalNumber || 0); // Ošetrenie chýbajúceho ordinalNumber
            });

            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = `${team.name} (Kategória: ${team.categoryName}, Skupina: ${team.groupName}, Poradie: ${team.ordinalNumber || 'N/A'})`;
                busTeamSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní tímov pre autobus: ", error);
        }
    }

    // Event listener pre zmenu kategórie pre výber tímov do autobusu
    busTeamCategorySelect.addEventListener('change', async () => {
        const categoryId = busTeamCategorySelect.value;
        await populateGroupSelect(busTeamGroupSelect, categoryId); // Naplní skupiny na základe kategórie
        await populateBusTeamSelect(categoryId, busTeamGroupSelect.value); // Potom naplní tímy
    });

    // Event listener pre zmenu skupiny pre výber tímov do autobusu
    busTeamGroupSelect.addEventListener('change', async () => {
        const categoryId = busTeamCategorySelect.value;
        const groupId = busTeamGroupSelect.value;
        await populateBusTeamSelect(categoryId, groupId);
    });

    // Event listener pre tlačidlo "Pridať tím" do autobusu
    addTeamToBusButton.addEventListener('click', async () => {
        const selectedTeamId = busTeamSelect.value;
        if (!selectedTeamId) {
            alert('Prosím, vyberte tím, ktorý chcete pridať.');
            return;
        }

        // Kontrola, či tím už bol pridaný
        if (currentBusSelectedTeams.some(team => team.id === selectedTeamId)) {
            alert('Tento tím už bol pridaný k autobusu.');
            return;
        }

        try {
            const teamDoc = await getDoc(doc(clubsCollectionRef, selectedTeamId));
            if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                let categoryName = 'Neznáma kategória';
                let groupName = 'Neznáma skupina';

                if (teamData.categoryId) {
                    const categoryDoc = await getDoc(doc(categoriesCollectionRef, teamData.categoryId));
                    if (categoryDoc.exists()) {
                        categoryName = categoryDoc.data().name;
                    }
                }
                if (teamData.groupId) {
                    const groupDoc = await getDoc(doc(groupsCollectionRef, teamData.groupId));
                    if (groupDoc.exists()) {
                        groupName = groupDoc.data().name;
                    }
                }

                currentBusSelectedTeams.push({
                    id: selectedTeamId,
                    name: teamData.name,
                    categoryName: categoryName,
                    groupName: groupName
                });
                updateBusSelectedTeamsDisplay();
                busTeamSelect.value = ''; // Vyčistiť výber
            }
        } catch (error) {
            console.error("Chyba pri pridávaní tímu k autobusu: ", error);
            alert("Chyba pri pridávaní tímu. Pozrite konzolu pre detaily.");
        }
    });


    // Zobrazenie/skrytie dropdownu po kliknutí na '+'
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Zastaví šírenie udalosti, aby sa predišlo okamžitému zatvoreniu
        addOptions.classList.toggle('show');
    });

    // Zatvorenie dropdownu, ak sa klikne mimo neho
    document.addEventListener('click', (event) => {
        if (!addOptions.contains(event.target) && !addButton.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    /**
     * Otvorí a naplní modálne okno pre úpravu alebo pridanie nového záznamu.
     * @param {HTMLElement} modal Element modálneho okna.
     * @param {HTMLInputElement} idInput Skrytý input pre ID záznamu.
     * @param {Object|null} data Dáta záznamu na úpravu, alebo null pre pridanie nového.
     * @param {firebase.firestore.CollectionReference} collectionRef Referencia na kolekciu Firestore.
     * @param {HTMLElement} deleteButton Tlačidlo pre vymazanie záznamu.
     */
    async function openAndPopulateModal(modal, idInput, data, collectionRef, deleteButton) {
        idInput.value = data ? data.id : '';
        if (data) {
            // Predvyplnenie formulára pre úpravu
            for (const key in data) {
                const input = modal.querySelector(`#${key}Input, #${key}Select`); // Pokus nájsť podľa ID
                if (input) {
                    if (input.type === 'time' || input.type === 'date') {
                        input.value = data[key];
                    } else if (input.tagName === 'SELECT') {
                        input.value = data[key];
                    } else {
                        input.value = data[key];
                    }
                }
            }
            deleteButton.style.display = 'inline-block';
        } else {
            // Vyčistenie formulára pre pridanie nového
            modal.querySelectorAll('input, select').forEach(input => {
                if (input.type === 'checkbox') {
                    input.checked = false;
                } else if (input.tagName === 'SELECT') {
                    input.value = ''; // Reset select na predvolenú možnosť
                } else {
                    input.value = '';
                }
            });
            deleteButton.style.display = 'none';
        }
        openModal(modal);
    }

    // --- Obsluha modálneho okna pre hrací deň ---
    addPlayingDayButton.addEventListener('click', () => {
        openAndPopulateModal(playingDayModal, playingDayIdInput, null, playingDaysCollectionRef, deletePlayingDayButtonModal);
    });

    closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));

    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const playingDayId = playingDayIdInput.value;
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Prosím, vyplňte dátum hracieho dňa.');
            return;
        }

        const docRef = playingDayId ? doc(playingDaysCollectionRef, playingDayId) : null;
        const data = { date: date, createdAt: new Date() };

        try {
            if (playingDayId) {
                await setDoc(docRef, data, { merge: true });
                alert('Hrací deň úspešne aktualizovaný!');
            } else {
                // Kontrola duplicitného dátumu pred pridaním
                const q = query(playingDaysCollectionRef, where("date", "==", date));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    alert('Hrací deň s týmto dátumom už existuje!');
                    return;
                }
                await addDoc(playingDaysCollectionRef, data);
                alert('Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); // Obnoviť rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    deletePlayingDayButtonModal.addEventListener('click', async () => {
        const playingDayId = playingDayIdInput.value;
        if (playingDayId && await confirm('Naozaj chcete vymazať tento hrací deň?')) { // Používame vlastný confirm
            try {
                await deleteDoc(doc(playingDaysCollectionRef, playingDayId));
                alert('Hrací deň úspešne vymazaný!');
                closeModal(playingDayModal);
                await displayMatchesAsSchedule(); // Obnoviť rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní hracieho dňa: ", error);
                alert("Chyba pri mazaní hracieho dňa. Pozrite konzolu pre detaily.");
            }
        }
    });

    // --- Obsluha modálneho okna pre športovú halu ---
    addSportHallButton.addEventListener('click', () => {
        openAndPopulateModal(sportHallModal, hallIdInput, null, sportHallsCollectionRef, deleteHallButtonModal);
    });

    closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));

    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hallId = hallIdInput.value;
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

        if (!name || !address || !googleMapsUrl) {
            alert('Prosím, vyplňte všetky polia (Názov haly, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validácia formátu URL
        } catch (_) {
                alert('Odkaz na Google Maps musí byť platná URL adresa.');
                return;
        }

        const docRef = hallId ? doc(sportHallsCollectionRef, hallId) : null;
        const data = { name: name, address: address, googleMapsUrl: googleMapsUrl, createdAt: new Date() };

        try {
            if (hallId) {
                await setDoc(docRef, data, { merge: true });
                alert('Športová hala úspešne aktualizovaná!');
            } else {
                const q = query(sportHallsCollectionRef, where("name", "==", name));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    alert('Športová hala s týmto názvom už existuje!');
                    return;
                }

                await addDoc(sportHallsCollectionRef, data);
                alert('Športová hala úspešne pridaná!');
            }
            closeModal(sportHallModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });

    deleteHallButtonModal.addEventListener('click', async () => {
        const hallId = hallIdInput.value;
        if (hallId && await confirm('Naozaj chcete vymazať túto športovú halu?')) { // Používame vlastný confirm
            try {
                await deleteDoc(doc(sportHallsCollectionRef, hallId));
                alert('Športová hala úspešne vymazaná!');
                closeModal(sportHallModal);
                await displayMatchesAsSchedule(); // Obnoviť rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní športovej haly: ", error);
                alert("Chyba pri mazaní športovej haly. Pozrite konzolu pre detaily.");
            }
        }
    });

    // --- Obsluha modálneho okna pre zápas ---
    addMatchButton.addEventListener('click', async () => {
        await populateCategorySelect(matchCategorySelect);
        await populateGroupSelect(matchGroupSelect, matchCategorySelect.value); // Naplní skupiny na základe predvolenej kategórie
        await populateTeamsForMatch(matchTeam1Select, null, null); // Naplní všetky tímy na začiatku
        await populateTeamsForMatch(matchTeam2Select, null, null);
        await populatePlayingDaySelect(matchPlayingDaySelect);
        await populateSportHallSelect(matchSportHallSelect);
        openAndPopulateModal(matchModal, matchIdInput, null, matchesCollectionRef, deleteMatchButtonModal);
    });

    closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));

    // Event listener pre zmenu kategórie zápasu
    matchCategorySelect.addEventListener('change', async () => {
        const categoryId = matchCategorySelect.value;
        await populateGroupSelect(matchGroupSelect, categoryId);
        await populateTeamsForMatch(matchTeam1Select, categoryId, matchGroupSelect.value);
        await populateTeamsForMatch(matchTeam2Select, categoryId, matchGroupSelect.value);
    });

    // Event listener pre zmenu skupiny zápasu
    matchGroupSelect.addEventListener('change', async () => {
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        await populateTeamsForMatch(matchTeam1Select, categoryId, groupId);
        await populateTeamsForMatch(matchTeam2Select, categoryId, groupId);
    });

    /**
     * Naplní select box tímami pre zápas na základe vybranej kategórie a skupiny.
     * @param {HTMLElement} selectElement Element select boxu.
     * @param {string|null} categoryId ID vybranej kategórie.
     * @param {string|null} groupId ID vybranej skupiny.
     */
    async function populateTeamsForMatch(selectElement, categoryId = null, groupId = null) {
        selectElement.innerHTML = '<option value="">-- Vyberte tím --</option>';
        let q = query(clubsCollectionRef); // Predpokladáme, že clubs sú tímy

        if (categoryId) {
            q = query(q, where("categoryId", "==", categoryId));
        }
        if (groupId) {
            q = query(q, where("groupId", "==", groupId));
        }

        try {
            const querySnapshot = await getDocs(q);
            const teams = [];
            for (const docSnapshot of querySnapshot.docs) {
                const teamData = docSnapshot.data();
                let categoryName = '';
                let groupName = '';

                if (teamData.categoryId) {
                    const categoryDoc = await getDoc(doc(categoriesCollectionRef, teamData.categoryId));
                    if (categoryDoc.exists()) {
                        categoryName = categoryDoc.data().name;
                    }
                }
                if (teamData.groupId) {
                    const groupDoc = await getDoc(doc(groupsCollectionRef, teamData.groupId));
                    if (groupDoc.exists()) {
                        groupName = groupDoc.data().name;
                    }
                }
                teams.push({
                    id: docSnapshot.id,
                    name: teamData.name,
                    categoryName: categoryName,
                    groupName: groupName,
                    ordinalNumber: teamData.ordinalNumber || 0
                });
            }

            teams.sort((a, b) => {
                if (a.categoryName < b.categoryName) return -1;
                if (a.categoryName > b.categoryName) return 1;
                if (a.groupName < b.groupName) return -1;
                if (a.groupName > b.groupName) return 1;
                return a.ordinalNumber - b.ordinalNumber;
            });

            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = `${team.name} (Kategória: ${team.categoryName}, Skupina: ${team.groupName}, Poradie: ${team.ordinalNumber})`;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní tímov pre zápas: ", error);
        }
    }

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchId = matchIdInput.value;
        const categoryId = matchCategorySelect.value;
        const groupId = matchGroupSelect.value;
        const team1Id = matchTeam1Select.value;
        const team2Id = matchTeam2Select.value;
        const playingDayId = matchPlayingDaySelect.value;
        const sportHallId = matchSportHallSelect.value;
        const time = matchTimeInput.value;

        if (!categoryId || !groupId || !team1Id || !team2Id || !playingDayId || !sportHallId || !time) {
            alert('Prosím, vyplňte všetky polia zápasu.');
            return;
        }

        if (team1Id === team2Id) {
            alert('Tímy nemôžu byť rovnaké.');
            return;
        }

        const docRef = matchId ? doc(matchesCollectionRef, matchId) : null;
        const data = {
            categoryId,
            groupId,
            team1Id,
            team2Id,
            playingDayId,
            sportHallId,
            time,
            createdAt: new Date()
        };

        try {
            if (matchId) {
                await setDoc(docRef, data, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                // Kontrola duplicitného zápasu (rovnaké tímy, rovnaký deň, rovnaká hala, rovnaký čas)
                const q = query(matchesCollectionRef,
                    where("playingDayId", "==", playingDayId),
                    where("sportHallId", "==", sportHallId),
                    where("time", "==", time),
                    where("team1Id", "in", [team1Id, team2Id]),
                    where("team2Id", "in", [team1Id, team2Id])
                );
                const querySnapshot = await getDocs(q);
                const isDuplicate = querySnapshot.docs.some(doc => {
                    const existingMatch = doc.data();
                    return (
                        (existingMatch.team1Id === team1Id && existingMatch.team2Id === team2Id) ||
                        (existingMatch.team1Id === team2Id && existingMatch.team2Id === team1Id)
                    );
                });

                if (isDuplicate) {
                    alert('Zápas s týmito tímami v rovnakom čase a hale už existuje!');
                    return;
                }

                await addDoc(matchesCollectionRef, data);
                alert('Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule(); // Obnoviť rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });

    deleteMatchButtonModal.addEventListener('click', async () => {
        const matchId = matchIdInput.value;
        if (matchId && await confirm('Naozaj chcete vymazať tento zápas?')) { // Používame vlastný confirm
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                alert('Zápas úspešne vymazaný!');
                closeModal(matchModal);
                await displayMatchesAsSchedule(); // Obnoviť rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    });

    /**
     * Naplní select box s hracími dňami.
     * @param {HTMLElement} selectElement Element select boxu.
     */
    async function populatePlayingDaySelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte hrací deň --</option>';
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date")));
        querySnapshot.forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().date;
            selectElement.appendChild(option);
        });
    }

    /**
     * Naplní select box so športovými halami.
     * @param {HTMLElement} selectElement Element select boxu.
     */
    async function populateSportHallSelect(selectElement) {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (halu) --</option>';
        const querySnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name")));
        querySnapshot.forEach((doc) => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().name;
            selectElement.appendChild(option);
        });
    }

    // --- Obsluha modálneho okna pre autobus ---
    addBusButton.addEventListener('click', async () => {
        currentBusSelectedTeams = []; // Vyčistiť vybrané tímy pri pridávaní nového autobusu
        updateBusSelectedTeamsDisplay(); // Aktualizovať zobrazenie
        await populatePlayingDaySelect(busPlayingDaySelect);
        await populateSportHallSelect(busStartLocationSelect);
        await populateSportHallSelect(busEndLocationSelect);
        await populateCategorySelect(busTeamCategorySelect); // Naplní kategórie pre výber tímov
        await populateGroupSelect(busTeamGroupSelect, busTeamCategorySelect.value); // Naplní skupiny
        await populateBusTeamSelect(busTeamCategorySelect.value, busTeamGroupSelect.value); // Naplní tímy
        openAndPopulateModal(busModal, busIdInput, null, busesCollectionRef, deleteBusButtonModal);
    });

    closeBusModalButton.addEventListener('click', () => closeModal(busModal));

    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const busId = busIdInput.value;
        const name = busNameInput.value.trim();
        const capacity = parseInt(busCapacityInput.value, 10);
        const playingDayId = busPlayingDaySelect.value;
        const startLocationId = busStartLocationSelect.value;
        const startTime = busStartTimeInput.value;
        const endLocationId = busEndLocationSelect.value;
        const endTime = busEndTimeInput.value;
        const notes = busNotesInput.value.trim();

        if (!name || isNaN(capacity) || !playingDayId || !startLocationId || !startTime || !endLocationId || !endTime) {
            alert('Prosím, vyplňte všetky povinné polia pre autobus (Názov, Kapacita, Hrací deň, Miesto/čas odchodu/príchodu).');
            return;
        }

        if (currentBusSelectedTeams.length === 0) {
            alert('Prosím, priraďte aspoň jeden tím k autobusu.');
            return;
        }

        const docRef = busId ? doc(busesCollectionRef, busId) : null;
        const data = {
            name,
            capacity,
            playingDayId,
            startLocationId,
            startTime,
            endLocationId,
            endTime,
            notes,
            assignedTeams: currentBusSelectedTeams, // Uloží pole objektov {id, name, categoryName, groupName}
            createdAt: new Date()
        };

        try {
            if (busId) {
                await setDoc(docRef, data, { merge: true });
                alert('Autobus úspešne aktualizovaný!');
            } else {
                await addDoc(busesCollectionRef, data);
                alert('Autobus úspešne pridaný!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule(); // Obnoviť rozvrh pre zobrazenie autobusov
        } catch (error) {
            console.error("Chyba pri ukladaní autobusu: ", error);
            alert("Chyba pri ukladaní autobusu. Pozrite konzolu pre detaily.");
        }
    });

    deleteBusButtonModal.addEventListener('click', async () => {
        const busId = busIdInput.value;
        if (busId && await confirm('Naozaj chcete vymazať tento autobus?')) { // Používame vlastný confirm
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                alert('Autobus úspešne vymazaný!');
                closeModal(busModal);
                await displayMatchesAsSchedule(); // Obnoviť rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní autobusu: ", error);
                alert("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
            }
        }
    });

    // --- Zobrazenie rozvrhu (zápasy a autobusy) ---
    const scheduleContainer = document.getElementById('scheduleContainer');

    /**
     * Zobrazí rozvrh zápasov a autobusov.
     */
    async function displayMatchesAsSchedule() {
        scheduleContainer.innerHTML = '<h3>Načítavam rozvrh...</h3>';

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date")));
        const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name")));
        const matchesSnapshot = await getDocs(query(matchesCollectionRef, orderBy("time"))); // Zoradiť zápasy podľa času
        const busesSnapshot = await getDocs(query(busesCollectionRef, orderBy("startTime"))); // Zoradiť autobusy podľa času odchodu
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const clubsSnapshot = await getDocs(clubsCollectionRef); // Predpokladáme, že clubs sú tímy

        const playingDays = playingDaysSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sportHalls = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const buses = busesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const categoriesMap = new Map(categoriesSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        const groupsMap = new Map(groupsSnapshot.docs.map(doc => [doc.id, doc.data().name]));
        const clubsMap = new Map(clubsSnapshot.docs.map(doc => [doc.id, doc.data().name]));

        scheduleContainer.innerHTML = ''; // Vyčistiť správu o načítaní

        if (playingDays.length === 0) {
            scheduleContainer.innerHTML = '<p class="text-center text-gray-600">Zatiaľ nie sú pridané žiadne hracie dni, zápasy ani autobusy.</p>';
            return;
        }

        playingDays.forEach(day => {
            const daySection = document.createElement('div');
            daySection.className = 'schedule-day-section';
            daySection.innerHTML = `
                <h3 class="schedule-day-title">${day.date}
                    <button class="edit-day-btn action-button" data-id="${day.id}">Upraviť deň</button>
                </h3>
                <div class="schedule-halls-grid"></div>
            `;
            scheduleContainer.appendChild(daySection);

            const hallsGrid = daySection.querySelector('.schedule-halls-grid');

            // Filtrovať zápasy a autobusy pre aktuálny hrací deň
            const dayMatches = matches.filter(match => match.playingDayId === day.id);
            const dayBuses = buses.filter(bus => bus.playingDayId === day.id);

            sportHalls.forEach(hall => {
                const hallColumn = document.createElement('div');
                hallColumn.className = 'schedule-hall-column';
                hallColumn.innerHTML = `
                    <h4 class="schedule-hall-title">${hall.name}
                        <button class="edit-hall-btn action-button" data-id="${hall.id}">Upraviť halu</button>
                    </h4>
                    <a href="${hall.googleMapsUrl}" target="_blank" class="text-blue-500 hover:underline text-sm">${hall.address}</a>
                    <div class="schedule-cells-container"></div>
                `;
                hallsGrid.appendChild(hallColumn);

                const cellsContainer = hallColumn.querySelector('.schedule-cells-container');

                // Pridať zápasy pre túto halu a deň
                dayMatches.filter(match => match.sportHallId === hall.id)
                    .sort((a, b) => a.time.localeCompare(b.time)) // Zoradiť zápasy podľa času
                    .forEach(match => {
                        const team1Name = clubsMap.get(match.team1Id) || 'Neznámy tím';
                        const team2Name = clubsMap.get(match.team2Id) || 'Neznámy tím';
                        const categoryName = categoriesMap.get(match.categoryId) || 'Neznáma kategória';
                        const groupName = groupsMap.get(match.groupId) || 'Neznáma skupina';

                        const matchCell = document.createElement('div');
                        matchCell.className = 'schedule-cell match-cell';
                        matchCell.innerHTML = `
                            <div class="schedule-cell-header">
                                <span class="schedule-cell-time">${match.time}</span>
                                <div class="schedule-cell-actions">
                                    <button class="edit-btn" data-id="${match.id}" data-type="match">Upraviť</button>
                                    <button class="delete-btn" data-id="${match.id}" data-type="match">Vymazať</button>
                                </div>
                            </div>
                            <p class="schedule-cell-content">
                                ${team1Name} vs ${team2Name}<br>
                                <span class="text-xs text-gray-600">${categoryName} - ${groupName}</span>
                            </p>
                        `;
                        cellsContainer.appendChild(matchCell);
                    });

                // Pridať autobusy odchádzajúce/prichádzajúce do tejto haly a dňa
                dayBuses.filter(bus => bus.startLocationId === hall.id || bus.endLocationId === hall.id)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')) // Zoradiť autobusy podľa času odchodu
                    .forEach(bus => {
                        const isDeparture = bus.startLocationId === hall.id;
                        const otherLocationId = isDeparture ? bus.endLocationId : bus.startLocationId;
                        const otherLocationName = sportHalls.find(h => h.id === otherLocationId)?.name || 'Neznáme miesto';
                        const time = isDeparture ? bus.startTime : bus.endTime;
                        const directionText = isDeparture ? `Odchod do ${otherLocationName}` : `Príchod z ${otherLocationName}`;
                        const notesText = bus.notes ? `<br><span class="text-xs text-gray-500">Poznámky: ${bus.notes}</span>` : '';

                        let assignedTeamsHtml = '';
                        if (bus.assignedTeams && bus.assignedTeams.length > 0) {
                            assignedTeamsHtml = '<ul class="list-disc list-inside text-xs text-gray-700 mt-1">';
                            bus.assignedTeams.forEach(team => {
                                assignedTeamsHtml += `<li>${team.name} (${team.categoryName} - ${team.groupName})</li>`;
                            });
                            assignedTeamsHtml += '</ul>';
                        } else {
                            assignedTeamsHtml = '<p class="text-xs text-gray-500 mt-1">Žiadne tímy priradené.</p>';
                        }

                        const busCell = document.createElement('div');
                        busCell.className = 'schedule-cell bus-cell';
                        busCell.innerHTML = `
                            <div class="schedule-cell-header">
                                <span class="schedule-cell-time">${time}</span>
                                <div class="schedule-cell-actions">
                                    <button class="edit-btn" data-id="${bus.id}" data-type="bus">Upraviť</button>
                                    <button class="delete-btn" data-id="${bus.id}" data-type="bus">Vymazať</button>
                                </div>
                            </div>
                            <p class="schedule-cell-content">
                                Autobus: ${bus.name} (Kapacita: ${bus.capacity})<br>
                                ${directionText}<br>
                                ${notesText}
                                <div class="assigned-teams-list">
                                    <strong>Priradené tímy:</strong>
                                    ${assignedTeamsHtml}
                                </div>
                            </p>
                        `;
                        cellsContainer.appendChild(busCell);
                    });
            });
        });

        // Pridanie event listenerov pre tlačidlá úpravy/vymazania
        scheduleContainer.querySelectorAll('.edit-day-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const docSnap = await getDoc(doc(playingDaysCollectionRef, id));
                if (docSnap.exists()) {
                    openAndPopulateModal(playingDayModal, playingDayIdInput, { id: docSnap.id, ...docSnap.data() }, playingDaysCollectionRef, deletePlayingDayButtonModal);
                }
            });
        });

        scheduleContainer.querySelectorAll('.edit-hall-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const docSnap = await getDoc(doc(sportHallsCollectionRef, id));
                if (docSnap.exists()) {
                    openAndPopulateModal(sportHallModal, hallIdInput, { id: docSnap.id, ...docSnap.data() }, sportHallsCollectionRef, deleteHallButtonModal);
                }
            });
        });

        scheduleContainer.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                let docSnap;

                if (type === 'match') {
                    docSnap = await getDoc(doc(matchesCollectionRef, id));
                    if (docSnap.exists()) {
                        const data = { id: docSnap.id, ...docSnap.data() };
                        await populateCategorySelect(matchCategorySelect, data.categoryId);
                        await populateGroupSelect(matchGroupSelect, data.categoryId, data.groupId);
                        await populateTeamsForMatch(matchTeam1Select, data.categoryId, data.groupId);
                        await populateTeamsForMatch(matchTeam2Select, data.categoryId, data.groupId);
                        await populatePlayingDaySelect(matchPlayingDaySelect);
                        await populateSportHallSelect(matchSportHallSelect);

                        // Ručné nastavenie hodnôt pre selecty po naplnení
                        matchCategorySelect.value = data.categoryId;
                        matchGroupSelect.value = data.groupId;
                        matchTeam1Select.value = data.team1Id;
                        matchTeam2Select.value = data.team2Id;
                        matchPlayingDaySelect.value = data.playingDayId;
                        matchSportHallSelect.value = data.sportHallId;
                        matchTimeInput.value = data.time;

                        openAndPopulateModal(matchModal, matchIdInput, data, matchesCollectionRef, deleteMatchButtonModal);
                    }
                } else if (type === 'bus') {
                    docSnap = await getDoc(doc(busesCollectionRef, id));
                    if (docSnap.exists()) {
                        const data = { id: docSnap.id, ...docSnap.data() };
                        currentBusSelectedTeams = data.assignedTeams || []; // Načíta priradené tímy
                        updateBusSelectedTeamsDisplay(); // Aktualizuje zobrazenie

                        await populatePlayingDaySelect(busPlayingDaySelect);
                        await populateSportHallSelect(busStartLocationSelect);
                        await populateSportHallSelect(busEndLocationSelect);
                        await populateCategorySelect(busTeamCategorySelect);
                        await populateGroupSelect(busTeamGroupSelect, busTeamCategorySelect.value);
                        await populateBusTeamSelect(busTeamCategorySelect.value, busTeamGroupSelect.value);

                        // Ručné nastavenie hodnôt pre selecty po naplnení
                        busPlayingDaySelect.value = data.playingDayId;
                        busStartLocationSelect.value = data.startLocationId;
                        busEndLocationSelect.value = data.endLocationId;
                        busNameInput.value = data.name;
                        busCapacityInput.value = data.capacity;
                        busStartTimeInput.value = data.startTime;
                        busEndTimeInput.value = data.endTime;
                        busNotesInput.value = data.notes;

                        openAndPopulateModal(busModal, busIdInput, data, busesCollectionRef, deleteBusButtonModal);
                    }
                }
            });
        });

        scheduleContainer.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;

                if (type === 'match') {
                    if (await confirm('Naozaj chcete vymazať tento zápas?')) { // Používame vlastný confirm
                        try {
                            await deleteDoc(doc(matchesCollectionRef, id));
                            alert('Zápas úspešne vymazaný!');
                            await displayMatchesAsSchedule();
                        } catch (error) {
                            console.error("Chyba pri mazaní zápasu: ", error);
                            alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
                        }
                    }
                } else if (type === 'bus') {
                    if (await confirm('Naozaj chcete vymazať tento autobus?')) { // Používame vlastný confirm
                        try {
                            await deleteDoc(doc(busesCollectionRef, id));
                            alert('Autobus úspešne vymazaný!');
                            await displayMatchesAsSchedule();
                        } catch (error) {
                            console.error("Chyba pri mazaní autobusu: ", error);
                            alert("Chyba pri mazaní autobusu. Pozrite konzolu pre detaily.");
                        }
                    }
                }
            });
        });
    }

    // Počiatočné zobrazenie rozvrhu
    await displayMatchesAsSchedule();
});

// Nahradenie alert funkciou vlastnou modálnou pre lepšiu UX
function alert(message) {
    const customAlert = document.createElement('div');
    customAlert.className = 'custom-alert';
    customAlert.innerHTML = `
        <div class="custom-alert-content">
            <p>${message}</p>
            <button class="custom-alert-ok-btn">OK</button>
        </div>
    `;
    document.body.appendChild(customAlert);

    customAlert.querySelector('.custom-alert-ok-btn').addEventListener('click', () => {
        customAlert.remove();
    });

    // Voliteľné: Zatvorenie po kliknutí mimo
    customAlert.addEventListener('click', (e) => {
        if (e.target === customAlert) {
            customAlert.remove();
        }
    });
}

// Nahradenie confirm funkciou vlastnou modálnou pre lepšiu UX
function confirm(message) {
    return new Promise((resolve) => {
        const customConfirm = document.createElement('div');
        customConfirm.className = 'custom-confirm';
        customConfirm.innerHTML = `
            <div class="custom-confirm-content">
                <p>${message}</p>
                <div class="custom-confirm-buttons">
                    <button class="custom-confirm-ok-btn">Áno</button>
                    <button class="custom-confirm-cancel-btn">Zrušiť</button>
                </div>
            </div>
        `;
        document.body.appendChild(customConfirm);

        customConfirm.querySelector('.custom-confirm-ok-btn').addEventListener('click', () => {
            customConfirm.remove();
            resolve(true);
        });

        customConfirm.querySelector('.custom-confirm-cancel-btn').addEventListener('click', () => {
            customConfirm.remove();
            resolve(false);
        });

        // Voliteľné: Zatvorenie po kliknutí mimo (považuje sa za zrušenie)
        customConfirm.addEventListener('click', (e) => {
            if (e.target === customConfirm) {
                customConfirm.remove();
                resolve(false);
            }
        });
    });
}
