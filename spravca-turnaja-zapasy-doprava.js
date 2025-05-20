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
        let startHour = parseInt(startTime.split(':')[0]);
        let endHour = parseInt(endTime.split(':')[0]);
        let startMin = parseInt(startTime.split(':')[1]);
        let endMin = parseInt(endTime.split(':')[1]);

        // Ak zápas začína napr. 12:01, posun sa na 12:00
        if (startMin > 0) {
            // Ak chceme, aby sa slot začal od 12:00 ak je 12:01, nemusíme meniť startHour
            // Ak chceme začať od 13:00, ak 12:01, tak by bolo: startHour = (startMin > 0) ? startHour + 1 : startHour;
        }

        // Ak koniec je po polnoci (napr. 00:30 nasledujúceho dňa), prispôsobíme endHour
        // Zjednodušujeme na rozsah v rámci jedného dňa.
        if (endHour < startHour) { // Napr. začína 23:00 a končí 01:00 (nasledujúci deň)
            endHour += 24; // Pre zjednodušenie výpočtov v jednom bloku
        }
        
        // Pridaj všetky celé hodiny v rozsahu (vrátane začiatku a konca)
        let currentHour = startHour;
        while (currentHour <= endHour) {
            // Zabezpečíme, že sa neopakujú hodiny, ak je rozsah malý (napr. 10:00-10:30)
            if (slots.length === 0 || parseInt(slots[slots.length - 1].split(':')[0]) !== currentHour) {
                slots.push(`${String(currentHour % 24).padStart(2, '0')}:00`);
            }
            currentHour++;
        }
        // Ak sa celá hodina začiatku alebo konca nezhoduje s presným časom a nebola zahrnutá, pridaj ju
        // Toto je hlavne pre vizuálne delenie stĺpcov
        const firstSlotHour = parseInt(slots[0].split(':')[0]);
        const lastSlotHour = parseInt(slots[slots.length - 1].split(':')[0]);
        
        if (parseInt(startTime.split(':')[0]) < firstSlotHour) {
            slots.unshift(`${String(parseInt(startTime.split(':')[0])).padStart(2, '0')}:00`);
        }
        if (parseInt(endTime.split(':')[0]) > lastSlotHour) {
            slots.push(`${String(parseInt(endTime.split(':')[0])).padStart(2, '0')}:00`);
        }
        
        return slots.sort(); // Zabezpečíme zoradenie
    }

    // Pomocná funkcia na konverziu času (HH:MM) na minúty od polnoci
    function timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
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
                let dailyMaxTime = "00:00"; // Toto je "nasledujúca" polnoc, nie 00:00 predchádzajúceho dňa

                // Nájdeme celkový min/max čas pre daný dátum
                // Ak 00:00 je koniec dňa, môže byť aj 24:00 (pre zjednodušenie rozsahu)
                let tempMatches = allMatches.filter(m => m.date === date);

                if (tempMatches.length > 0) {
                    tempMatches.forEach(m => {
                        if (m.time < dailyMinTime) dailyMinTime = m.time;
                        if (m.time > dailyMaxTime) dailyMaxTime = m.time;
                    });
                }


                // Ak sú zápasy, zisti presný rozsah hodín
                if (tempMatches.length > 0) {
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
                        const cellHour = parseInt(hourSlot.split(':')[0]);
                        const cellMatches = [];

                        // Filter zápasov pre danú bunku (miesto, dátum, hodina)
                        allMatches.filter(match => 
                            match.location === location && 
                            match.date === date && 
                            parseInt(match.time.split(':')[0]) === cellHour
                        ).forEach(match => {
                            cellMatches.push(match);
                        });

                        scheduleHtml += '<td class="schedule-cell-wrapper">'; // Nový wrapper pre relatívne pozicionovanie
                        
                        // Získame referenciu na min/max čas pre DANÝ DEŇ (aby sme vedeli škálovať)
                        const dailySlots = dateHourlySlots.get(date);
                        let dailyStartMinutes = timeToMinutes(dailySlots[0]); // Začiatok prvého slotu pre daný deň
                        let dailyEndMinutes = timeToMinutes(dailySlots[dailySlots.length - 1]) + 60; // Koniec posledného slotu (celá hodina)
                        if (dailyEndMinutes === 60) dailyEndMinutes = 24 * 60; // Ak je to len 00:00, považujeme to za koniec dňa

                        // Dĺžka celého rozsahu v minútach pre tento deň
                        const dailyRangeMinutes = dailyEndMinutes - dailyStartMinutes;
                        
                        // Konkrétna hodina (časový úsek 60 minút) pre túto bunku
                        const currentHourStartMinutes = timeToMinutes(hourSlot);

                        cellMatches.forEach(match => {
                            const matchStartMinutes = timeToMinutes(match.time);
                            // Predpokladaná dĺžka zápasu v minútach (môžeš pridať do dát zápasu)
                            const matchDurationMinutes = 45; // Predvolená dĺžka zápasu (napr. 45 minút)

                            // Vypočítaj pozíciu (top) a výšku zápasu v percentách
                            // Pomer minút zápasu k minútam celej hodiny (60)
                            const positionWithinHourPercent = ((matchStartMinutes % 60) / 60) * 100;
                            const heightPercent = (matchDurationMinutes / 60) * 100;

                            // Ak chceme pozicionovať zápas v rámci CELEJ bunky (nie len hodiny)
                            // const totalMatchDurationMinutes = timeToMinutes(match.time) + matchDurationMinutes - dailyStartMinutes;
                            // const topPositionPercent = ((matchStartMinutes - dailyStartMinutes) / dailyRangeMinutes) * 100;
                            // const heightPercent = (matchDurationMinutes / dailyRangeMinutes) * 100;

                            scheduleHtml += `
                                <div class="schedule-cell-match" 
                                     data-id="${match.id}" 
                                     style="top: ${positionWithinHourPercent}%; height: ${heightPercent}%;">
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
                        if (cellMatches.length === 0) {
                             scheduleHtml += '<span class="no-match-placeholder"></span>'; // Prázdna bunka ak tam nie je zápas
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
            await displayMatchesAsSchedule(); 
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu: ", error);
            alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
        }
    });
});
