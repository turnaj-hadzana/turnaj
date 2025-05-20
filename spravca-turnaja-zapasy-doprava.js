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

    // Pomocná funkcia na získanie celých hodinových slotov pre daný rozsah časov
    function getHourlySlots(startTime, endTime) {
        const slots = [];
        let currentHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);

        // Ak koniec je po polnoci (napr. 00:30 nasledujúceho dňa), prispôsobíme endHour
        // Predpokladáme, že rozsah neprekročí 24 hodín (jeden deň)
        if (endTime === "00:00" && startTime !== "00:00") { // Ak koniec je presne 00:00
            if (currentHour !== 0) { // Ak začiatok nie je 00:00, ideme do 23:00, potom 00:00 by mal byť ďalší deň
                // Netreba specialne osetrovat, endHour bude len "00", ale loop pojde kym je <= endHour
            }
        }


        // Pridaj všetky celé hodiny v rozsahu
        while (currentHour <= endHour) {
            slots.push(`${String(currentHour).padStart(2, '0')}:00`);
            currentHour++;
        }
        return slots;
    }

    // --- Funkcia na načítanie a zobrazenie zápasov ako rozvrh (miesto vs. čas/deň) ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam rozvrh zápasov...</p>';
        try {
            // Zápasy zoradíme podľa miesta, dátumu a času pre ľahšie spracovanie
            const q = query(matchesCollectionRef, orderBy("location", "asc"), orderBy("date", "asc"), orderBy("time", "asc"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                matchesContainer.innerHTML = '<p>Žiadne zápasy ani informácie o doprave zatiaľ.</p>';
                return;
            }

            const allMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Zozbieranie unikátnych miest a dátumov
            const uniqueLocations = new Set();
            const uniqueDates = new Set();
            allMatches.forEach(match => {
                uniqueLocations.add(match.location);
                uniqueDates.add(match.date);
            });

            // Zoradenie pre konzistentné zobrazenie
            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            // Zozbieranie všetkých celých hodín pre každý deň
            const dateHourlySlots = new Map(); // Kľúč: dátum, Hodnota: [hodina1, hodina2, ...]

            sortedDates.forEach(date => {
                let dailyMinTime = "23:59";
                let dailyMaxTime = "00:00";

                // Nájdeme celkový min/max čas pre daný dátum
                allMatches.filter(m => m.date === date).forEach(m => {
                    if (m.time < dailyMinTime) dailyMinTime = m.time;
                    if (m.time > dailyMaxTime) dailyMaxTime = m.time;
                });

                if (dailyMinTime !== "23:59" && dailyMaxTime !== "00:00") {
                    dateHourlySlots.set(date, getHourlySlots(dailyMinTime, dailyMaxTime));
                } else {
                    dateHourlySlots.set(date, []); // Žiadne zápasy pre tento dátum
                }
            });


            let scheduleHtml = '<div class="schedule-table-container">';

            // Generovanie hlavičky tabuľky
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += '<th class="fixed-column">Miesto / Čas</th>'; // Prvý stĺpec pre miesta

            // Hlavičky pre dni a ich dynamické časy
            sortedDates.forEach(date => {
                const hourlySlotsForDate = dateHourlySlots.get(date) || [];
                // colspan by mal byť aspoň 1, aj keď nie sú žiadne časy (pre prázdnu bunku)
                scheduleHtml += `<th colspan="${hourlySlotsForDate.length > 0 ? hourlySlotsForDate.length : 1}">`; 
                scheduleHtml += `<div class="schedule-date-header">${date}</div>`;
                if (hourlySlotsForDate.length > 0) {
                    scheduleHtml += '<div class="schedule-times-row">';
                    hourlySlotsForDate.forEach(time => {
                        scheduleHtml += `<span class="schedule-hour-slot">${time}</span>`;
                    });
                    scheduleHtml += '</div>';
                }
                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            // Generovanie riadkov tabuľky (pre každé miesto)
            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header">${location}</th>`; // Hlavička riadka (miesto)

                sortedDates.forEach(date => {
                    const hourlySlotsForDate = dateHourlySlots.get(date) || [];
                    if (hourlySlotsForDate.length === 0) {
                        // Ak pre tento dátum nie sú žiadne časy, zobrazíme jednu prázdnu bunku
                        scheduleHtml += '<td><span class="no-match-placeholder"></span></td>';
                        return; // Prejdeme na ďalší dátum
                    }

                    hourlySlotsForDate.forEach(hourSlot => {
                        const cellMatches = [];
                        // Nájdi všetky zápasy, ktoré spadajú do tejto celej hodiny
                        allMatches.forEach(match => {
                            if (match.location === location && match.date === date) {
                                const matchHour = parseInt(match.time.split(':')[0]);
                                const slotHour = parseInt(hourSlot.split(':')[0]);
                                
                                // Pridaj zápas do bunky, ak jeho hodina spadá do aktuálneho hodinového slotu
                                if (matchHour === slotHour) {
                                    cellMatches.push(match);
                                }
                            }
                        });

                        scheduleHtml += '<td>';
                        if (cellMatches.length > 0) {
                            // Ak je v slote viac zápasov, zobrazíme ich všetky
                            cellMatches.forEach(match => {
                                scheduleHtml += `
                                    <div class="schedule-cell-match" data-id="${match.id}">
                                        <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` (${match.groupName})` : ''}</p>
                                        <p class="schedule-cell-teams">
                                            ${match.team1DisplayName}<br>
                                            ${match.team2DisplayName}
                                        </p>
                                        <p class="schedule-cell-club-names">(${match.team1ClubName} vs. ${match.team2ClubName})</p>
                                        <div class="schedule-cell-actions">
                                            <button class="edit-btn" data-id="${match.id}">Upraviť</button>
                                            <button class="delete-btn" data-id="${match.id}">Vymazať</button>
                                        </div>
                                    </div>
                                `;
                            });
                        } else {
                            scheduleHtml += '<span class="no-match-placeholder"></span>'; // Prázdna bunka
                        }
                        scheduleHtml += '</td>';
                    });
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

    // Funkcie editMatch a deleteMatch zostávajú rovnaké, len budú volať displayMatchesAsSchedule()
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
        // Ak nechceš, aby sa rozvrh načítal pri každom zatvorení, odstráň nasledujúci riadok
        // Ale je to dobrá prax pre aktualizáciu po úprave/pridaní inde
        displayMatchesAsSchedule(); 
    });

    // Funkcia na získanie názvu tímu na základe ID (poradového čísla) a metadát
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

            let clubName = `Tím ${teamNumber}`; // Fallback

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

    // Event listener pre odoslanie formulára
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
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh po uložení
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
