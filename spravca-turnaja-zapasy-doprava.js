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
    const matchTimeInput = document.getElementById('matchTime');
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document = document.getElementById('matchGroup');
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

    // Pomocná funkcia na získanie všetkých celých hodinových slotov pre daný deň (00:00 - 23:00)
    function getAllDayHourlySlots() {
        const slots = [];
        for (let i = 0; i < 24; i++) { // Od 00:00 do 23:00
            slots.push(`${String(i).padStart(2, '0')}:00`);
        }
        return slots;
    }

    // Pomocná funkcia na konverziu času (HH:MM) na minúty od začiatku hodiny
    function getMinutesIntoHour(timeStr) {
        const [, minutes] = timeStr.split(':').map(Number);
        return minutes;
    }

    // --- Funkcia na načítanie a zobrazenie zápasov ako rozvrh (miesto vs. čas/deň) ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam rozvrh zápasov...</p>';
        try {
            const q = query(matchesCollectionRef, orderBy("location", "asc"), orderBy("date", "asc"), orderBy("time", "asc"));
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

            // Celodenné hodinové sloty, ktoré sa použijú pre všetky dni
            const hourlySlots = getAllDayHourlySlots();

            let scheduleHtml = '<div class="schedule-table-container">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';

            // Prvý stĺpec hlavičky: Miesto
            scheduleHtml += '<th class="fixed-column">Miesto</th>';

            // Hlavičky pre dátumy
            sortedDates.forEach(date => {
                scheduleHtml += `<th colspan="${hourlySlots.length}">`; // colspan = počet hodín (24)
                scheduleHtml += `<div class="schedule-date-header">${date}</div>`;
                // Časové značky pod dátumom pre každý hodinový slot
                scheduleHtml += '<div class="schedule-times-row">';
                hourlySlots.forEach(time => {
                    scheduleHtml += `<span class="schedule-hour-slot">${time}</span>`;
                });
                scheduleHtml += '</div>';
                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            // Generovanie riadkov pre každé miesto
            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header">${location}</th>`; // Hlavička riadka (miesto)

                sortedDates.forEach(date => {
                    // Pre každý dátum vytvoríme jeden "časový riadok" (<td> bunku),
                    // ktorý bude vizuálne predstavovať celý deň pre dané miesto.
                    scheduleHtml += '<td class="schedule-day-cell-wrapper">'; // Nová trieda pre wrapper dňa
                    
                    // Nájdi všetky zápasy pre toto miesto a dátum
                    const dayMatches = allMatches.filter(match => 
                        match.location === location && 
                        match.date === date
                    );

                    dayMatches.forEach(match => {
                        const matchStartMinutes = getMinutesIntoHour(match.time);
                        const matchHour = parseInt(match.time.split(':')[0]);
                        const matchDurationMinutes = 45; // Predvolená dĺžka zápasu v minútach. Zváž pridanie do dát zápasu.

                        // Pozícia zápasu v rámci 24-hodinového rozpätia bunky
                        // Každá hodina je 1/24 celkovej šírky bunky
                        // Zápas sa pozicionuje v rámci svojej hodiny (left offset) a má šírku podľa trvania
                        
                        // Celková šírka bunky dňa je 100%
                        // Šírka jednej hodiny je (100 / 24)%
                        // Pozícia v rámci celej bunky:
                        const totalDayMinutes = 24 * 60; // 1440 minút v celom dni
                        const matchStartTotalMinutes = (matchHour * 60) + matchStartMinutes;
                        const leftPositionPercent = (matchStartTotalMinutes / totalDayMinutes) * 100;
                        const widthPercent = (matchDurationMinutes / totalDayMinutes) * 100;


                        scheduleHtml += `
                            <div class="schedule-event-item" 
                                 data-id="${match.id}" 
                                 style="left: ${leftPositionPercent}%; width: ${widthPercent}%;">
                                <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` (${match.groupName})` : ''}</p>
                                <p class="schedule-cell-teams">
                                    ${match.team1DisplayName} vs ${match.team2DisplayName}
                                </p>
                                <p class="schedule-cell-club-names">(${match.team1ClubName} vs. ${match.team2ClubName})</p>
                                <p class="schedule-cell-time">${match.time}</p>
                                <div class="schedule-cell-actions">
                                    <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                    <button class="delete-btn" data-id="${match.id}">Vymazať</button>
                                </div>
                            </div>
                        `;
                    });
                    // Ak nie sú zápasy pre daný deň na danom mieste
                    if (dayMatches.length === 0) {
                        scheduleHtml += '<span class="no-match-placeholder"></span>';
                    }
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });

            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>'; // Koniec schedule-table-container
            matchesContainer.innerHTML = scheduleHtml;

            // Pridanie event listenerov po generovaní HTML
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

    // Funkcie editMatch a deleteMatch (bez zmien)
    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas / dopravu';

                matchDateInput.value = matchData.date || '';
                matchTimeInput.value = matchData.time || '';
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
                displayMatchesAsSchedule(); // Aktualizovať rozvrh
            } catch (error) {
                console.error("Chyba pri mazaní zápasu: ", error);
                alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
            }
        }
    }

    // --- Inicializácia po načítaní stránky ---
    await displayMatchesAsSchedule();

    // Event listener pre tlačidlo "Pridať"
    addButton.addEventListener('click', () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas / dopravu';

        populateCategorySelect(matchCategorySelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;

        team1NumberInput.value = '';
        team2NumberInput.value = '';

        openModal(matchModal);
    });

    // Event listener pre zmenu hlavnej kategórie zápasu
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

    // Event listener pre zatvorenie modálneho okna
    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule(); 
    });

    // Funkcia na získanie názvu tímu (bez zmien)
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

    // Event listener pre odoslanie formulára (bez zmien)
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
            time: matchTimeInput.value,
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
