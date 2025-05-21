import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

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

    // Modálne okno pre zápas
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    console.log('matchDateSelect element:', matchDateSelect); // Debugovací výpis
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchCategorySelect = document.getElementById('matchCategorySelect');
    const matchHomeTeamSelect = document.getElementById('matchHomeTeamSelect');
    const matchAwayTeamSelect = document.getElementById('matchAwayTeamSelect');
    const matchHomeScoreInput = document.getElementById('matchHomeScore');
    const matchAwayScoreInput = document.getElementById('matchAwayScore');
    const matchTimeInput = document.getElementById('matchTime');

    // Modálne okno pre hrací deň
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayDateInput = document.getElementById('playingDayDate');

    // Modálne okno pre športovú halu
    const sportHallModal = document.getElementById('sportHallModal');
    const closeSportHallModalButton = document.getElementById('closeSportHallModal');
    const sportHallForm = document.getElementById('sportHallForm');
    const hallNameInput = document.getElementById('hallName');
    const hallAddressInput = document.getElementById('hallAddress');
    const hallGoogleMapsUrlInput = document.getElementById('hallGoogleMapsUrl');

    // Kontajnery pre filtre
    const filterCategorySelect = document.getElementById('filterCategory');
    const filterMatchNameInput = document.getElementById('filterMatchName');
    const filterDateSelect = document.getElementById('filterDate');
    console.log('filterDateSelect element:', filterDateSelect); // Debugovací výpis
    const filterLocationSelect = document.getElementById('filterLocation');
    const matchesListContainer = document.getElementById('matchesListContainer');

    // Funkcia na formátovanie dátumu do "DD. MM. RRRR"
    function formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Mesiace sú od 0
        const year = d.getFullYear();
        return `${day}. ${month}. ${year}`;
    }

    // Funkcia na naplnenie selectboxu hracími dňami
    async function populatePlayingDaySelect(selectElement) {
        // KONTROLA NULL PRED POKRAČOVANÍM
        if (!selectElement) {
            console.error("Chyba: Element pre selectbox hracích dní nebol nájdený. Uistite sa, že ID je správne a element existuje v HTML.");
            return; // Ukončí funkciu, ak element nebol nájdený
        }
        selectElement.innerHTML = '<option value="">Vyberte hrací deň</option>';
        try {
            const querySnapshot = await getDocs(playingDaysCollectionRef);
            querySnapshot.forEach(doc => {
                const day = doc.data();
                const option = document.createElement('option');
                // Predpokladáme, že 'date' je buď Firebase Timestamp alebo Date objekt
                const dateToFormat = day.date.toDate ? day.date.toDate() : day.date; // Ak je Timestamp, konvertuj na Date
                option.value = doc.id;
                option.textContent = formatDate(dateToFormat); // Použi novú funkciu na formátovanie
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní: ", error);
        }
    }

    // Funkcia na naplnenie selectboxu športovými halami
    async function populateSportHallSelect(selectElement) {
        if (!selectElement) { // Pridaná kontrola aj tu
            console.error("Chyba: Element pre selectbox športových hál nebol nájdený.");
            return;
        }
        selectElement.innerHTML = '<option value="">Vyberte športovú halu</option>';
        try {
            const querySnapshot = await getDocs(sportHallsCollectionRef);
            querySnapshot.forEach(doc => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = hall.name;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error("Chyba pri načítaní športových hál: ", error);
        }
    }

    // Funkcia na naplnenie selectboxu tímami pre kategóriu
    async function populateTeamSelect(selectElement, categoryId) {
        if (!selectElement) { // Pridaná kontrola aj tu
            console.error("Chyba: Element pre selectbox tímov nebol nájdený.");
            return;
        }
        selectElement.innerHTML = '<option value="">Vyberte tím</option>';
        if (!categoryId) return;

        try {
            const q = query(clubsCollectionRef, where("category", "==", categoryId));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => {
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

    // Načítanie dát pri štarte stránky
    await populatePlayingDaySelect(matchDateSelect); // Naplnenie dátumov pre pridanie zápasu
    await populatePlayingDaySelect(filterDateSelect); // Naplnenie dátumov pre filter
    await populateSportHallSelect(matchLocationSelect); // Naplnenie hál pre pridanie zápasu
    await populateSportHallSelect(filterLocationSelect); // Naplnenie hál pre filter
    await populateCategorySelect(matchCategorySelect); // Naplnenie kategórií pre pridanie zápasu
    await populateCategorySelect(filterCategorySelect); // Naplnenie kategórií pre filter
    await displayMatchesAsSchedule(); // Zobrazenie rozvrhu zápasov

    // Event listener pre zmenu kategórie v modálnom okne zápasu
    if (matchCategorySelect) { // Kontrola null
        matchCategorySelect.addEventListener('change', async () => {
            const categoryId = matchCategorySelect.value;
            await populateTeamSelect(matchHomeTeamSelect, categoryId);
            await populateTeamSelect(matchAwayTeamSelect, categoryId);
        });
    }


    // Zobrazenie/skrytie dropdownu po kliknutí na '+' tlačidlo
    if (addButton) { // Kontrola null
        addButton.addEventListener('click', () => {
            if (addOptions) addOptions.classList.toggle('show'); // Kontrola null
        });
    }


    // Skrytie dropdownu, ak sa klikne mimo neho
    document.addEventListener('click', (event) => {
        if (addButton && addOptions && !addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    // Otvorenie modálneho okna pre pridanie hracieho dňa
    if (addPlayingDayButton) { // Kontrola null
        addPlayingDayButton.addEventListener('click', () => {
            if (playingDayForm) playingDayForm.reset(); // Kontrola null
            openModal(playingDayModal);
            if (addOptions) addOptions.classList.remove('show'); // Kontrola null
        });
    }


    // Otvorenie modálneho okna pre pridanie športovej haly
    if (addSportHallButton) { // Kontrola null
        addSportHallButton.addEventListener('click', () => {
            if (sportHallForm) sportHallForm.reset(); // Kontrola null
            openModal(sportHallModal);
            if (addOptions) addOptions.classList.remove('show'); // Kontrola null
        });
    }


    // Otvorenie modálneho okna pre pridanie zápasu
    if (addMatchButton) { // Kontrola null
        addMatchButton.addEventListener('click', async () => {
            if (matchForm) matchForm.reset(); // Kontrola null
            if (matchIdInput) matchIdInput.value = ''; // Vyčisti ID pre nový zápas
            await populatePlayingDaySelect(matchDateSelect); // Znova naplniť pre istotu
            await populateSportHallSelect(matchLocationSelect); // Znova naplniť pre istotu
            await populateCategorySelect(matchCategorySelect); // Znova naplniť pre istotu
            if (matchHomeTeamSelect) matchHomeTeamSelect.innerHTML = '<option value="">Vyberte tím</option>'; // Vyčisti tímy
            if (matchAwayTeamSelect) matchAwayTeamSelect.innerHTML = '<option value="">Vyberte tím</option>'; // Vyčisti tímy
            openModal(matchModal);
            if (addOptions) addOptions.classList.remove('show'); // Kontrola null
        });
    }


    // Zatvorenie modálnych okien
    if (closeMatchModalButton) closeMatchModalButton.addEventListener('click', () => closeModal(matchModal));
    if (closePlayingDayModalButton) closePlayingDayModalButton.addEventListener('click', () => closeModal(playingDayModal));
    if (closeSportHallModalButton) closeSportHallModalButton.addEventListener('click', () => closeModal(sportHallModal));

    // Spracovanie formulára pre hrací deň
    if (playingDayForm) { // Kontrola null
        playingDayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = playingDayDateInput.value;

            if (!date) {
                // Používame vlastné modálne okno namiesto alert()
                showCustomAlert('Prosím, vyberte dátum hracieho dňa.');
                return;
            }

            try {
                // Kontrola duplicity hracieho dňa
                const q = query(playingDaysCollectionRef, where("date", "==", date));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    showCustomAlert('Hrací deň s týmto dátumom už existuje!');
                    return;
                }

                await addDoc(playingDaysCollectionRef, {
                    date: date,
                    createdAt: new Date()
                });
                showCustomAlert('Hrací deň úspešne pridaný!');
                closeModal(playingDayModal);
                await populatePlayingDaySelect(matchDateSelect); // Aktualizovať selectbox
                await populatePlayingDaySelect(filterDateSelect); // Aktualizovať filter
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní hracieho dňa: ", error);
                showCustomAlert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
            }
        });
    }


    // Spracovanie formulára pre športovú halu
    if (sportHallForm) { // Kontrola null
        sportHallForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = hallNameInput.value.trim();
            const address = hallAddressInput.value.trim();
            const googleMapsUrl = hallGoogleMapsUrlInput.value.trim(); // Dôležité: .value pre input

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

                if (!querySnapshot.empty) {
                    showCustomAlert('Športová hala s týmto názvom už existuje!');
                    return;
                }

                await addDoc(sportHallsCollectionRef, {
                    name: name,
                    address: address,
                    googleMapsUrl: googleMapsUrl,
                    createdAt: new Date()
                });
                showCustomAlert('Športová hala úspešne pridaná!');
                closeModal(sportHallModal);
                await populateSportHallSelect(matchLocationSelect); // Aktualizovať selectbox
                await populateSportHallSelect(filterLocationSelect); // Aktualizovať filter
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní športovej haly: ", error);
                showCustomAlert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
            }
        });
    }


    // Spracovanie formulára pre zápas
    if (matchForm) { // Kontrola null
        matchForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const matchId = matchIdInput.value;
            const playingDayId = matchDateSelect.value;
            const sportHallId = matchLocationSelect.value;
            const categoryId = matchCategorySelect.value;
            const homeTeamId = matchHomeTeamSelect.value;
            const awayTeamId = matchAwayTeamSelect.value;
            const homeScore = matchHomeScoreInput.value ? parseInt(matchHomeScoreInput.value) : null;
            const awayScore = matchAwayScoreInput.value ? parseInt(matchAwayScoreInput.value) : null;
            const matchTime = matchTimeInput.value;

            if (!playingDayId || !sportHallId || !categoryId || !homeTeamId || !awayTeamId || !matchTime) {
                showCustomAlert('Prosím, vyplňte všetky povinné polia pre zápas.');
                return;
            }

            if (homeTeamId === awayTeamId) {
                showCustomAlert('Domáci a hosťujúci tím nemôžu byť rovnaké.');
                return;
            }

            try {
                const playingDayDoc = await getDoc(doc(db, 'playingDays', playingDayId));
                const sportHallDoc = await getDoc(doc(db, 'sportHalls', sportHallId));
                const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
                const homeTeamDoc = await getDoc(doc(db, 'clubs', homeTeamId));
                const awayTeamDoc = await getDoc(doc(db, 'clubs', awayTeamId));

                if (!playingDayDoc.exists() || !sportHallDoc.exists() || !categoryDoc.exists() || !homeTeamDoc.exists() || !awayTeamDoc.exists()) {
                    showCustomAlert('Chyba: Niektoré vybrané dáta (hrací deň, hala, kategória, tímy) neboli nájdené.');
                    return;
                }

                const matchData = {
                    playingDay: playingDayId,
                    sportHall: sportHallId,
                    category: categoryId,
                    homeTeam: homeTeamId,
                    awayTeam: awayTeamId,
                    homeScore: homeScore,
                    awayScore: awayScore,
                    time: matchTime,
                    createdAt: new Date()
                };

                if (matchId) {
                    // Editácia existujúceho zápasu
                    await setDoc(doc(db, 'matches', matchId), matchData, { merge: true });
                    showCustomAlert('Zápas úspešne aktualizovaný!');
                } else {
                    // Pridanie nového zápasu
                    await addDoc(matchesCollectionRef, matchData);
                    showCustomAlert('Zápas úspešne pridaný!');
                }

                closeModal(matchModal);
                await displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri ukladaní zápasu: ", error);
                showCustomAlert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
            }
        });
    }


    // Funkcia na zobrazenie zápasov ako rozvrh
    async function displayMatchesAsSchedule(filters = {}) {
        if (!matchesListContainer) { // Kontrola null
            console.error("Chyba: Element pre kontajner zoznamu zápasov nebol nájdený.");
            return;
        }
        matchesListContainer.innerHTML = ''; // Vyčisti kontajner
        let q = matchesCollectionRef;

        // Aplikácia filtrov
        if (filters.category) {
            q = query(q, where("category", "==", filters.category));
        }
        if (filters.date) {
            q = query(q, where("playingDay", "==", filters.date));
        }
        if (filters.location) {
            q = query(q, where("sportHall", "==", filters.location));
        }

        try {
            const querySnapshot = await getDocs(q);
            const matches = [];
            for (const docSnapshot of querySnapshot.docs) {
                const match = { id: docSnapshot.id, ...docSnapshot.data() };

                // Načítanie detailov pre zobrazenie
                const playingDayDoc = await getDoc(doc(db, 'playingDays', match.playingDay));
                const sportHallDoc = await getDoc(doc(db, 'sportHalls', match.sportHall));
                const categoryDoc = await getDoc(doc(db, 'categories', match.category));
                const homeTeamDoc = await getDoc(doc(db, 'clubs', match.homeTeam));
                const awayTeamDoc = await getDoc(doc(db, 'clubs', match.awayTeam));

                match.playingDayName = playingDayDoc.exists() ? formatDate(playingDayDoc.data().date.toDate()) : 'Neznámy dátum';
                match.sportHallName = sportHallDoc.exists() ? sportHallDoc.data().name : 'Neznáma hala';
                match.categoryName = categoryDoc.exists() ? categoryDoc.data().name : 'Neznáma kategória';
                match.homeTeamName = homeTeamDoc.exists() ? homeTeamDoc.data().name : 'Neznámy tím';
                match.awayTeamName = awayTeamDoc.exists() ? awayTeamDoc.data().name : 'Neznámy tím';

                // Filter podľa názvu tímu (ak je zadaný filterMatchName)
                if (filters.matchName) {
                    const filterText = filters.matchName.toLowerCase();
                    if (!(match.homeTeamName.toLowerCase().includes(filterText) || match.awayTeamName.toLowerCase().includes(filterText))) {
                        continue; // Preskoč zápas, ak sa názov tímu nezhoduje
                    }
                }

                matches.push(match);
            }

            // Zoskupenie zápasov podľa dátumu a haly
            const groupedMatches = matches.reduce((acc, match) => {
                const dateKey = match.playingDayName;
                const hallKey = match.sportHallName;
                if (!acc[dateKey]) {
                    acc[dateKey] = {};
                }
                if (!acc[dateKey][hallKey]) {
                    acc[dateKey][hallKey] = [];
                }
                acc[dateKey][hallKey].push(match);
                return acc;
            }, {});

            // Vytvorenie HTML pre rozvrh
            for (const dateKey in groupedMatches) {
                const dateSection = document.createElement('div');
                dateSection.className = 'schedule-date-section';
                dateSection.innerHTML = `<h3>${dateKey}</h3>`; // Dátum hracieho dňa

                for (const hallKey in groupedMatches[dateKey]) {
                    const hallSection = document.createElement('div');
                    hallSection.className = 'schedule-hall-section';
                    hallSection.innerHTML = `<h4>${hallKey}</h4>`; // Názov haly

                    const table = document.createElement('table');
                    table.className = 'schedule-table';
                    table.innerHTML = `
                        <thead>
                            <tr>
                                <th>Čas</th>
                                <th>Kategória</th>
                                <th>Domáci</th>
                                <th>Skóre</th>
                                <th>Hostia</th>
                                <th>Akcie</th>
                            </tr>
                        </thead>
                        <tbody>
                        </tbody>
                    `;
                    const tbody = table.querySelector('tbody');

                    // Zoradenie zápasov podľa času
                    const sortedMatches = groupedMatches[dateKey][hallKey].sort((a, b) => {
                        const timeA = a.time.split(':').map(Number);
                        const timeB = b.time.split(':').map(Number);
                        if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                        return timeA[1] - timeB[1];
                    });

                    sortedMatches.forEach(match => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${match.time}</td>
                            <td>${match.categoryName}</td>
                            <td>${match.homeTeamName}</td>
                            <td>${match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} : ${match.awayScore}` : ' - : - '}</td>
                            <td>${match.awayTeamName}</td>
                            <td class="schedule-cell-actions">
                                <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                <button class="delete-btn" data-id="${match.id}">Zmazať</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                    hallSection.appendChild(table);
                    dateSection.appendChild(hallSection);
                }
                matchesListContainer.appendChild(dateSection);
            }

            // Pridanie event listenerov pre tlačidlá Upraviť a Zmazať
            matchesListContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => editMatch(e.target.dataset.id));
            });
            matchesListContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => deleteMatch(e.target.dataset.id));
            });

        } catch (error) {
            console.error("Chyba pri načítaní zápasov: ", error);
            showCustomAlert("Chyba pri načítaní zápasov. Pozrite konzolu pre detaily.");
        }
    }

    // Funkcia pre úpravu zápasu
    async function editMatch(matchId) {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            if (matchDoc.exists()) {
                const match = matchDoc.data();
                if (matchIdInput) matchIdInput.value = matchId; // Kontrola null
                if (matchTimeInput) matchTimeInput.value = match.time; // Kontrola null
                if (matchHomeScoreInput) matchHomeScoreInput.value = match.homeScore !== null ? match.homeScore : ''; // Kontrola null
                if (matchAwayScoreInput) matchAwayScoreInput.value = match.awayScore !== null ? match.awayScore : ''; // Kontrola null

                // Naplnenie selectboxov a nastavenie vybraných hodnôt
                await populatePlayingDaySelect(matchDateSelect);
                if (matchDateSelect) matchDateSelect.value = match.playingDay; // Kontrola null

                await populateSportHallSelect(matchLocationSelect);
                if (matchLocationSelect) matchLocationSelect.value = match.sportHall; // Kontrola null

                await populateCategorySelect(matchCategorySelect);
                if (matchCategorySelect) matchCategorySelect.value = match.category; // Kontrola null

                // Naplnenie tímov po nastavení kategórie
                await populateTeamSelect(matchHomeTeamSelect, match.category);
                if (matchHomeTeamSelect) matchHomeTeamSelect.value = match.homeTeam; // Kontrola null

                await populateTeamSelect(matchAwayTeamSelect, match.category);
                if (matchAwayTeamSelect) matchAwayTeamSelect.value = match.awayTeam; // Kontrola null

                openModal(matchModal);
            } else {
                showCustomAlert('Zápas nebol nájdený.');
            }
        } catch (error) {
            console.error("Chyba pri načítaní zápasu pre úpravu: ", error);
            showCustomAlert("Chyba pri načítaní zápasu pre úpravu. Pozrite konzolu pre detaily.");
        }
    }

    // Funkcia pre zmazanie zápasu
    async function deleteMatch(matchId) {
        // Používame vlastné modálne okno pre potvrdenie
        const confirmed = await window.confirm('Naozaj chcete zmazať tento zápas?');
        if (!confirmed) {
            return;
        }
        try {
            await deleteDoc(doc(db, 'matches', matchId));
            showCustomAlert('Zápas úspešne zmazaný!');
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri mazaní zápasu: ", error);
            showCustomAlert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
        }
    }

    // Event listenery pre filtre
    if (filterCategorySelect) filterCategorySelect.addEventListener('change', applyFilters); // Kontrola null
    if (filterMatchNameInput) filterMatchNameInput.addEventListener('input', applyFilters); // Kontrola null
    if (filterDateSelect) filterDateSelect.addEventListener('change', applyFilters); // Kontrola null
    if (filterLocationSelect) filterLocationSelect.addEventListener('change', applyFilters); // Kontrola null


    function applyFilters() {
        const filters = {
            category: filterCategorySelect ? filterCategorySelect.value : '', // Kontrola null
            matchName: filterMatchNameInput ? filterMatchNameInput.value.trim() : '', // Kontrola null
            date: filterDateSelect ? filterDateSelect.value : '', // Kontrola null
            location: filterLocationSelect ? filterLocationSelect.value : '' // Kontrola null
        };
        displayMatchesAsSchedule(filters);
    }

    // Vlastné modálne okno pre správy (namiesto alert/confirm)
    function showCustomAlert(message) {
        const customAlertModal = document.getElementById('customAlertModal');
        const customAlertMessage = document.getElementById('customAlertMessage');
        const customAlertCloseButton = document.getElementById('customAlertClose');

        if (!customAlertModal) {
            // Ak modálne okno neexistuje, vytvoríme ho dynamicky
            const modalHtml = `
                <div id="customAlertModal" class="modal">
                    <div class="modal-content">
                        <span class="close" id="customAlertClose">&times;</span>
                        <p id="customAlertMessage"></p>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            // Znovu získame referencie po vytvorení
            const newModal = document.getElementById('customAlertModal');
            const newMessage = document.getElementById('customAlertMessage');
            const newCloseButton = document.getElementById('customAlertClose');

            newMessage.textContent = message;
            newModal.style.display = 'block';

            newCloseButton.onclick = function() {
                newModal.style.display = 'none';
            };
            window.onclick = function(event) {
                if (event.target == newModal) {
                    newModal.style.display = 'none';
                }
            };
        } else {
            customAlertMessage.textContent = message;
            customAlertModal.style.display = 'block';

            customAlertCloseButton.onclick = function() {
                customAlertModal.style.display = 'none';
            };
            window.onclick = function(event) {
                if (event.target == customAlertModal) {
                    customAlertModal.style.display = 'none';
                }
            };
        }
    }

    // Pridanie základného štýlu pre customAlertModal, ak už nie je v CSS
    const customAlertStyle = document.createElement('style');
    customAlertStyle.textContent = `
        .modal {
            display: none; /* Hidden by default */
            position: fixed; /* Stay in place */
            z-index: 10000; /* Sit on top */
            left: 0;
            top: 0;
            width: 100%; /* Full width */
            height: 100%; /* Full height */
            overflow: auto; /* Enable scroll if needed */
            background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .modal-content {
            background-color: #fefefe;
            margin: auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%; /* Could be responsive */
            max-width: 500px;
            border-radius: 8px;
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            text-align: center;
            font-family: 'Inter', sans-serif;
        }

        .modal-content p {
            margin-bottom: 20px;
            font-size: 1.1em;
        }

        .modal-content .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            position: absolute;
            top: 10px;
            right: 15px;
            cursor: pointer;
        }

        .modal-content .close:hover,
        .modal-content .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }
    `;
    document.head.appendChild(customAlertStyle);

    // Nahradenie confirm() vlastným modálnym oknom
    window.confirm = function(message) {
        return new Promise((resolve) => {
            const customConfirmModal = document.getElementById('customConfirmModal');
            let modalExists = true;

            if (!customConfirmModal) {
                modalExists = false;
                const confirmHtml = `
                    <div id="customConfirmModal" class="modal">
                        <div class="modal-content">
                            <p id="customConfirmMessage"></p>
                            <div style="display: flex; justify-content: center; gap: 10px;">
                                <button id="customConfirmYes" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Áno</button>
                                <button id="customConfirmNo" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Nie</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', confirmHtml);
            }

            const modal = document.getElementById('customConfirmModal');
            const msgElement = document.getElementById('customConfirmMessage');
            const yesButton = document.getElementById('customConfirmYes');
            const noButton = document.getElementById('customConfirmNo');

            msgElement.textContent = message;
            modal.style.display = 'block';

            const cleanup = () => {
                modal.style.display = 'none';
                yesButton.onclick = null;
                noButton.onclick = null;
                window.onclick = null;
            };

            yesButton.onclick = () => {
                cleanup();
                resolve(true);
            };

            noButton.onclick = () => {
                cleanup();
                resolve(false);
            };

            window.onclick = (event) => {
                if (event.target == modal) {
                    cleanup();
                    resolve(false); // Ak klikne mimo, považujeme to za "Nie"
                }
            };

            // Pridanie Tailwind CSS tried pre tlačidlá, ak ešte nie sú
            if (!modalExists) {
                const confirmButtonsStyle = document.createElement('style');
                confirmButtonsStyle.textContent = `
                    #customConfirmModal .modal-content button {
                        padding: 8px 16px;
                        border-radius: 5px;
                        border: none;
                        cursor: pointer;
                        font-size: 1em;
                        transition: background-color 0.3s ease;
                    }
                    #customConfirmModal .modal-content button#customConfirmYes {
                        background-color: #28a745;
                        color: white;
                    }
                    #customConfirmModal .modal-content button#customConfirmNo {
                        background-color: #dc3545;
                        color: white;
                    }
                    #customConfirmModal .modal-content button#customConfirmYes:hover {
                        background-color: #218838;
                    }
                    #customConfirmModal .modal-content button#customConfirmNo:hover {
                        background-color: #c82333;
                    }
                `;
                document.head.appendChild(confirmButtonsStyle);
            }
        });
    };


});
