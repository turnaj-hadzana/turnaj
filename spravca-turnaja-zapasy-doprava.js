import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, populateTeamNumberSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateInput = document.getElementById('matchDate');
    const matchStartTimeInput = document.getElementById('matchStartTime'); // Zmenené z matchTimeInput
    const matchDurationInput = document.getElementById('matchDuration'); // Nové pole pre dĺžku zápasu
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');

    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcia na načítanie a zobrazenie zápasov ako rozvrh (miesto vs. čas/deň) ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam rozvrh zápasov...</p>';
        try {
            const q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                matchesContainer.innerHTML = '<p>Žiadne zápasy ani informácie o doprave zatiaľ.</p>';
                return;
            }

            const allMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const uniqueLocations = new Set();
            const uniqueDates = new Set();
            allMatches.forEach(match => {
                uniqueLocations.add(match.location);
                uniqueDates.add(match.date);
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            // Získame všetky unikátne celé hodiny pre každý deň
            const dailyTimeSlots = new Map(); // Map<date, Set<hour>>
            allMatches.forEach(match => {
                const date = match.date;
                const startHour = parseInt(match.startTime.split(':')[0]);
                const endHour = startHour + Math.ceil(match.duration / 60); // Vypočítame koniec na základe dĺžky
                
                if (!dailyTimeSlots.has(date)) {
                    dailyTimeSlots.set(date, new Set());
                }
                for (let h = startHour; h < endHour; h++) { // Zahrňme všetky hodiny, ktoré zápas pretína
                    dailyTimeSlots.get(date).add(h);
                }
            });

            // Pre každú dátum získať a zoradiť hodiny
            const sortedDailyTimeSlots = new Map();
            sortedDates.forEach(date => {
                const hours = Array.from(dailyTimeSlots.get(date) || []).sort((a, b) => a - b);
                sortedDailyTimeSlots.set(date, hours);
            });

            let scheduleHtml = '<div class="schedule-table-container">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += '<th class="fixed-column">Miesto / Čas</th>';

            // Hlavičky pre dni a ich unikátne časy
            sortedDates.forEach(date => {
                const hoursForDate = sortedDailyTimeSlots.get(date);
                if (hoursForDate && hoursForDate.length > 0) {
                    scheduleHtml += `<th colspan="${hoursForDate.length}">`;
                    scheduleHtml += `<div class="schedule-date-header">${date}</div>`;
                    scheduleHtml += '<div class="schedule-times-row">';
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour).padStart(2, '0')}:00</span>`;
                    });
                    scheduleHtml += '</div>';
                    scheduleHtml += '</th>';
                } else {
                    // Ak pre daný dátum nie sú žiadne časy (nemali by nastať, ak sú zápasy), pridáme prázdnu hlavičku
                    scheduleHtml += `<th><div class="schedule-date-header">${date}</div></th>`;
                }
            });
            scheduleHtml += '</tr></thead><tbody>';

            // Generovanie riadkov tabuľky (pre každé miesto)
            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header">${location}</th>`;

                sortedDates.forEach(date => {
                    const hoursForDate = sortedDailyTimeSlots.get(date);
                    if (!hoursForDate || hoursForDate.length === 0) {
                        // Ak pre tento dátum nie sú žiadne definované časy, zobrazíme prázdne bunky
                        scheduleHtml += `<td colspan="1"><span class="no-match-placeholder"></span></td>`; // Default colspan 1
                        return;
                    }

                    // Vytvoríme "mriežku" pre daný deň a miesto
                    const dailyGrid = new Array(hoursForDate.length).fill(null); // null = prázdne
                    
                    const matchesForLocationAndDate = allMatches.filter(match =>
                        match.location === location && match.date === date
                    );

                    matchesForLocationAndDate.forEach(match => {
                        const startHour = parseInt(match.startTime.split(':')[0]);
                        const startMinute = parseInt(match.startTime.split(':')[1]);
                        const durationInHours = match.duration / 60; // Dĺžka zápasu v hodinách

                        // Nájdi index počiatočnej hodiny v zozname hodín pre daný deň
                        const startIndex = hoursForDate.indexOf(startHour);
                        if (startIndex !== -1) {
                            // Vypočítame, koľko stĺpcov zápas zaberie
                            const cellsToSpan = Math.max(1, Math.ceil(durationInHours)); // Minimálne 1 bunka
                            
                            // Nájdeme prvú voľnú pozíciu pre zápas (ak sa prekrývajú, posunieme ho doprava alebo nájdeme iné riešenie)
                            let currentSpan = 0;
                            for (let i = startIndex; i < hoursForDate.length; i++) {
                                if (i >= startIndex + cellsToSpan) break; // Zastav, ak už zápas zabral dostatok miesta
                                dailyGrid[i] = dailyGrid[i] || []; // Inicializuj pole, ak ešte nie je
                                dailyGrid[i].push(match);
                                currentSpan++;
                            }

                             // Uložte si šírku a pozíciu pre CSS
                            match.gridStartIndex = startIndex;
                            match.gridSpan = cellsToSpan;
                        }
                    });

                    // Teraz vygenerujeme TD bunky
                    let currentCellIndex = 0;
                    while (currentCellIndex < hoursForDate.length) {
                        const cellMatches = dailyGrid[currentCellIndex];
                        if (cellMatches && cellMatches.length > 0) {
                            // Ak je v bunke zápas, vytvoríme pre neho blok
                            // Zabezpečíme, že sa zobrazí len prvý zápas, ak sa prekrývajú, pre jednoduchosť
                            const match = cellMatches[0]; // Zoberieme prvý zápas, ak sa ich prekrýva viac
                            const matchStartIndex = hoursForDate.indexOf(parseInt(match.startTime.split(':')[0]));
                            const matchSpan = Math.ceil(match.duration / 60); // Koľko hodinových slotov zápas zaberie

                            // Ak je tento zápas začiatkom svojho rozsahu, vytvoríme bunku s colspan
                            if (matchStartIndex === currentCellIndex) {
                                scheduleHtml += `<td colspan="${matchSpan}">`;
                                scheduleHtml += `
                                    <div class="schedule-cell-match" 
                                        data-id="${match.id}" 
                                        style="left: 0; width: 100%;">
                                        <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` (${match.groupName})` : ''}</p>
                                        <p class="schedule-cell-teams">${match.team1DisplayName}<br>${match.team2DisplayName}</p>
                                        <p class="schedule-cell-club-names">${match.team1ClubName}<br>${match.team2ClubName}</p>
                                        <div class="schedule-cell-actions">
                                            <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                            <button class="delete-btn" data-id="${match.id}">Vymazať</button>
                                        </div>
                                    </div>
                                `;
                                scheduleHtml += '</td>';
                                currentCellIndex += matchSpan; // Preskočíme bunky, ktoré zápas zabral
                            } else {
                                // Ak je táto bunka súčasťou už zobrazeného zápasu, preskočíme ju
                                currentCellIndex++;
                            }
                        } else {
                            // Prázdna bunka
                            scheduleHtml += `<td><span class="no-match-placeholder"></span></td>`;
                            currentCellIndex++;
                        }
                    }
                });
                scheduleHtml += '</tr>';
            });

            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>';
            matchesContainer.innerHTML = scheduleHtml;

            matchesContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => editMatch(event.target.dataset.id));
            });
            matchesContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => deleteMatch(event.target.dataset.id));
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov.</p>';
        }
    }

    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas / dopravu';

                matchDateInput.value = matchData.date || '';
                matchStartTimeInput.value = matchData.startTime || ''; // Zmenené
                matchDurationInput.value = matchData.duration || 60; // Nové
                matchLocationInput.value = matchData.location || '';

                await populateCategorySelect(matchCategorySelect, matchData.categoryId);
                if (matchData.categoryId) {
                    await populateGroupSelect(matchData.categoryId, matchGroupSelect, matchData.groupId);
                    matchGroupSelect.disabled = false;
                } else {
                    matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                    matchGroupSelect.disabled = true;
                }

                team1NumberInput.value = matchData.team1Number || '';
                team2NumberInput.value = matchData.team2Number || '';

                openModal(matchModal);
            } else {
                alert("Zápas sa nenašiel.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát zápasu pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát zápasu. Skúste to znova.");
        }
    }

    async function deleteMatch(matchId) {
        if (confirm('Naozaj chcete vymazať tento zápas?')) {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                alert('Zápas úspešne vymazaný!');
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }

    await displayMatchesAsSchedule();

    addButton.addEventListener('click', () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;

        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = 60; // Predvolená hodnota

        openModal(matchModal);
    });

    matchCategorySelect.addEventListener('change', () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            populateGroupSelect(selectedCategoryId, matchGroupSelect);
            matchGroupSelect.disabled = false;
        } else {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
            team1NumberInput.value = '';
            team2NumberInput.value = '';
        }
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule();
    });

    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupData = groupDoc.exists() ? groupDoc.data() : null;
            const groupName = groupData ? (groupData.name || groupId) : groupId;

            let clubName = `Tím ${teamNumber}`;

            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderInGroup", "==", parseInt(teamNumber))
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                const teamDocData = clubsSnapshot.docs[0].data();
                if (teamDocData.name) {
                    clubName = teamDocData.name;
                }
            } else {
                console.warn(`Tím s číslom ${teamNumber} v kategórii ${categoryId} a skupine ${groupId} sa nenašiel. Používam fallback: "${clubName}"`);
            }

            let shortCategoryName = categoryName;
            if (shortCategoryName) {
                shortCategoryName = shortCategoryName.replace(/U(\d+)\s*([CHZ])/i, 'U$1$2').toUpperCase();
            }

            let shortGroupName = '';
            if (groupName) {
                const match = groupName.match(/(?:skupina\s*)?([A-Z])/i);
                if (match && match[1]) {
                    shortGroupName = match[1].toUpperCase();
                }
            }

            const fullDisplayName = `${shortCategoryName} ${shortGroupName}${teamNumber}`;

            return {
                fullDisplayName: fullDisplayName,
                clubName: clubName
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba` };
        }
    };

    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;

        const team1Number = team1NumberInput.value;
        const team2Number = team2NumberInput.value;

        if (!matchCategory || !matchGroup || !team1Number || !team2Number) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2).');
            return;
        }

        let team1Result = null;
        let team2Result = null;

        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            alert("Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }

        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            alert('Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        const matchData = {
            date: matchDateInput.value,
            startTime: matchStartTimeInput.value, // Zmenené
            duration: parseInt(matchDurationInput.value), // Nové
            location: matchLocationInput.value,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text : null,

            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: parseInt(team1Number),
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,

            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: parseInt(team2Number),
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (matchIdInput.value) {
                await setDoc(doc(matchesCollectionRef, matchIdInput.value), matchData, { merge: true });
                alert('Zápas úspešne aktualizovaný!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                alert('Nový zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
