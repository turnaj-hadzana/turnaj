import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    // TENTO RIADOK JE PRÍČINOU PROBLÉMOV. MUSÍ BYŤ ODSTRÁNENÝ!
    // loadCategoriesTable(); // Overiť, či je odstránený, ak je to váš starý kód!

    // Referencie na HTML elementy
    const matchesContentSection = document.getElementById('matchesContentSection'); // Zmenené ID
    const addButton = document.getElementById('addButton');
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateInput = document.getElementById('matchDate');
    const matchTimeInput = document.getElementById('matchTime');
    const matchEndTimeInput = document.getElementById('matchEndTime'); // Nové pole
    const matchLocationInput = document.getElementById('matchLocation');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const calendarContainer = document.getElementById('calendarContainer'); // Zmenená referencia

    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');

    const filterDateInput = document.getElementById('filterDateInput'); // Nový filter
    const resetFilterButton = document.getElementById('resetFilterButton'); // Nové tlačidlo


    // Zobrazenie správnej sekcie po načítaní
    if (matchesContentSection) { // Zmenené ID
        matchesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'matchesContentSection') { // Zmenené ID
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcia na načítanie a zobrazenie zápasov ako kalendára ---
    async function displayMatchesCalendar(filterDate = null) {
        if (!calendarContainer) return;

        calendarContainer.innerHTML = '<p>Načítavam kalendár zápasov...</p>';
        try {
            let q = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("time", "asc"));

            if (filterDate) {
                // Ak je nastavený filter dátumu, filtrujeme zápasy pre daný deň
                q = query(matchesCollectionRef, where("date", "==", filterDate), orderBy("time", "asc"));
            }

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                calendarContainer.innerHTML = '<p>Žiadne zápasy ani informácie o doprave pre vybraný dátum/obdobie.</p>';
                return;
            }

            const matches = [];
            querySnapshot.docs.forEach(doc => {
                const matchData = doc.data();
                matches.push({ id: doc.id, ...matchData });
            });

            // Získame všetky unikátne lokácie a dni
            const locations = [...new Set(matches.map(m => m.location))].sort();
            const dates = filterDate ? [filterDate] : [...new Set(matches.map(m => m.date))].sort(); // Ak je filter, zobraz len ten deň

            // Predpokladaný časový rozsah (napr. 8:00 - 22:00 po polhodinách)
            const startHour = 8;
            const endHour = 22; // do 22:00 vrátane
            const timeIntervalMinutes = 30; // 30 minútové intervaly

            const timeSlots = [];
            for (let h = startHour; h <= endHour; h++) {
                for (let m = 0; m < 60; m += timeIntervalMinutes) {
                    const hour = String(h).padStart(2, '0');
                    const minute = String(m).padStart(2, '0');
                    timeSlots.push(`${hour}:${minute}`);
                }
            }

            // Vytvorenie hlavičky kalendára (dni a časy)
            let headerHtml = `<div class="grid-header location-header">Miesto / Čas</div>`;
            let gridColumns = `auto `; // Pre prvý stĺpec s miestami

            dates.forEach(date => {
                // Hlavička pre celý deň
                headerHtml += `<div class="grid-header day-header" style="grid-column: span ${timeSlots.length};">${date}</div>`;
                gridColumns += `repeat(${timeSlots.length}, minmax(80px, 1fr)) `; // Stĺpce pre hodiny dňa
            });

            // Vytvorenie riadku s časovými slotmi pod dňami
            headerHtml += `<div class="grid-header"></div>`; // Prázdna bunka pod miestom
            dates.forEach(date => {
                timeSlots.forEach(timeSlot => {
                    headerHtml += `<div class="grid-header time-slot-header">${timeSlot}</div>`;
                });
            });


            let calendarHtml = `<div class="calendar-grid" style="grid-template-columns: ${gridColumns};">`;
            calendarHtml += headerHtml; // Pridáme hlavičky na začiatok gridu

            // Vytvorenie riadkov pre každú lokáciu
            locations.forEach(location => {
                calendarHtml += `<div class="grid-row">`;
                calendarHtml += `<div class="grid-cell location-header">${location}</div>`; // Názov haly

                dates.forEach(date => {
                    timeSlots.forEach(timeSlot => {
                        const cellId = `cell-${location.replace(/\s/g, '_')}-${date}-${timeSlot.replace(':', '-')}`;
                        calendarHtml += `<div class="grid-cell" id="${cellId}"></div>`; // Bunka pre zápasy
                    });
                });
                calendarHtml += `</div>`; // Koniec riadku
            });
            calendarHtml += `</div>`; // Koniec .calendar-grid

            calendarContainer.innerHTML = calendarHtml;

            // Umiestnenie zápasov do mriežky
            matches.forEach(match => {
                const matchDate = match.date;
                const matchTime = match.time; // Čas začiatku
                const matchEndTime = match.matchEndTime || calculateDefaultEndTime(match.time); // Čas konca, ak nie je zadaný

                const startDateTime = new Date(`${matchDate}T${matchTime}`);
                const endDateTime = new Date(`${matchDate}T${matchEndTime}`);
                const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);

                const locationIndex = locations.indexOf(match.location);
                
                if (locationIndex !== -1) {
                    const cellId = `cell-${match.location.replace(/\s/g, '_')}-${matchDate}-${matchTime.replace(':', '-')}`;
                    const targetCell = document.getElementById(cellId);

                    if (targetCell) {
                        // Vypočítajte pozíciu a šírku zápasu na základe trvania a časových slotov
                        const startTimeSlotIndex = timeSlots.indexOf(match.time);
                        const endTimeSlotIndex = timeSlots.indexOf(match.matchEndTime || calculateDefaultEndTime(match.time));
                        
                        // Ak sa zápas nezačína presne na začiatku slotu, nájdite najbližší
                        const actualStartTime = new Date(`${matchDate}T${matchTime}`);
                        const actualEndTime = new Date(`${matchDate}T${matchEndTime}`);
                        
                        const gridStartTime = new Date(`${matchDate}T${timeSlots[0]}`); // Začiatok celého gridu pre daný deň
                        
                        // Pozícia od začiatku dňa (v minútach)
                        const startOffsetMinutes = (actualStartTime.getTime() - gridStartTime.getTime()) / (1000 * 60);
                        const endOffsetMinutes = (actualEndTime.getTime() - gridStartTime.getTime()) / (1000 * 60);

                        // Vypočítajte, koľko slotov zápas zaberie
                        const slotsPerMinute = 1 / timeIntervalMinutes; // Napr. pre 30 minútové intervaly = 1/30
                        const startSlotRelative = startOffsetMinutes * slotsPerMinute;
                        const endSlotRelative = endOffsetMinutes * slotsPerMinute;
                        
                        // Grid layout uses line numbers for positioning.
                        // The cell starts at `startTimeSlotIndex + 2` because:
                        // 1 for location header, 1 for time slot headers.
                        // However, we are placing *within* the cell, so we need to
                        // calculate based on the overall grid of time slots.
                        
                        // Let's rethink the placement strategy for events *within* cells.
                        // A simpler approach for now: place it in the starting cell.
                        // We will add logic for width based on duration.

                        // The current approach places match event in the start time slot's cell.
                        // We need to calculate how many 'timeSlotIntervals' this match spans.
                        const spanSlots = Math.ceil(durationMinutes / timeIntervalMinutes);
                        if (spanSlots <= 0) { // Zápas musí mať aspoň 1 slot
                            console.warn(`Zápas s id ${match.id} má nulovú alebo zápornú dĺžku. Upravujem na 1 slot.`);
                            spanSlots = 1;
                        }

                        // Nájdite index stĺpca, kde zápas začína
                        // Každý deň začína po predošlom dni.
                        // locations.length je počet riadkov.
                        // Prvý stĺpec je pre miesta.
                        // Pre daný dátum, nájdite index začiatku tohto dňa v rámci 'dates'
                        const dateColumnStartIndex = dates.indexOf(matchDate) * timeSlots.length + 1; // +1 pre hlavičku miesta
                        const matchColumnStart = dateColumnStartIndex + timeSlots.indexOf(matchTime);

                        // Vytvoríme div pre zápas
                        const matchEventDiv = document.createElement('div');
                        matchEventDiv.className = 'match-event';
                        matchEventDiv.dataset.id = match.id;
                        matchEventDiv.innerHTML = `
                            <span class="display-name">${match.team1DisplayName || 'N/A'} vs ${match.team2DisplayName || 'N/A'}</span>
                            <span class="club-name">(${match.team1ClubName || 'N/A'} vs ${match.team2ClubName || 'N/A'})</span>
                        `;
                        
                        // Umiestnenie zápasu: nastaviť v štýle, aby sa rozťahoval cez viac stĺpcov
                        // Využijeme grid-column property na roztiahnutie cez potrebné sloty
                        // Je dôležité, aby bol matchEventDiv priamo v .calendar-grid, nie v .grid-cell
                        // Toto je zložitejšie. Alternatíva je, že každý zápas je umiestnený do svojho štartovacieho slotu a len je mu daná výška
                        // Alebo sa vytvorí len jeden obrovský grid a zápasy sa absolútne pozicujú.
                        // Použime zatiaľ jednoduchšiu verziu: jeden obdĺžnik v prvej bunke, kde sa zápas začína.
                        // Real-time prekrývanie a šírka vyžaduje absolútne pozicionovanie a prepočty pixelov/percent.

                        // Pre zjednodušenie (a aby fungovalo to, čo je v CSS):
                        // Budeme generovať matchEventDiv v príslušnej bunke, ale jeho šírku (resp. span) určíme dynamicky.
                        // Toto vyžaduje zložitejší Grid layout alebo použitie 'top', 'height' pre absolútne pozicovanie v rámci bunky.

                        // Zmeníme stratégiu. Každá bunka je 30min slot. Match event sa roztiahne cez toľko buniek, koľko minút trvá.

                        // Potrebujeme referenciu na riadok pre danú lokáciu
                        // A potom umiestniť zápas presne na jeho grid-column.

                        // Vytvoríme mapu pre ľahšie vyhľadávanie buniek
                        const cellMap = new Map();
                        locations.forEach((loc, locIdx) => {
                            timeSlots.forEach((ts, tsIdx) => {
                                dates.forEach((d, dateIdx) => {
                                    const cId = `cell-${loc.replace(/\s/g, '_')}-${d}-${ts.replace(':', '-')}`;
                                    // Toto je len pre referenciu, reálne umiestnenie bude prepočítané
                                    cellMap.set(cId, { row: locIdx + 2, col: dateIdx * timeSlots.length + tsIdx + 2 }); // +2 pre hlavičky
                                });
                            });
                        });
                        
                        // Najjednoduchší spôsob: pridať zápas do prvej bunky, ktorú zaberá, a dať mu nejakú výšku (napr. 100% pre slot)
                        // A šírku (colspan) na základe spanSlots
                        
                        // Nájdeme prvú bunku pre zápas
                        const startCellId = `cell-${match.location.replace(/\s/g, '_')}-${matchDate}-${matchTime.replace(':', '-')}`;
                        const cellElement = document.getElementById(startCellId);
                        
                        if (cellElement) {
                             const matchDiv = document.createElement('div');
                             matchDiv.className = 'match-event';
                             matchDiv.dataset.id = match.id;
                             matchDiv.innerHTML = `
                                 <span class="display-name">${match.team1DisplayName || 'N/A'} vs ${match.team2DisplayName || 'N/A'}</span>
                                 <span class="club-name">(${match.team1ClubName || 'N/A'} vs ${match.team2ClubName || 'N/A'})</span>
                             `;

                             // Pripočítame čas začiatku zápasu od začiatku hodinového slotu (v percentách alebo pixeloch)
                             // Zápasy budú umiestnené v rámci svojej štartovacej bunky.
                             // Aby sa rozprestierali, musíme použiť absolútne pozicionovanie a vypočítať % šírky.
                             // Toto je komplexná časť. Pre jednoduchosť, zatiaľ každý zápas zaberie len svoj počiatočný slot.
                             // Ak zápas trvá dlhšie, bude sa prekrývať, alebo potrebujeme zložitejší JS/CSS na span
                             // Pre tento požiadavok "bude ako obdlžník, ktorý bude zobrazený v čase od - do"
                             // musíme použiť buď grid-column-span alebo absolútne pozicionovanie s presnými šírkami.

                             // Pre zjednodušenie a aby sme to mali ako jeden obdĺžnik:
                             // Vytvoríme zápasový element a umiestnime ho do *prvého* slotu, ktorý zaberá.
                             // Jeho šírka bude závisieť od jeho dĺžky.

                            // Vypočítame, koľko "jednotiek" (30 minútových slotov) zápas zaberie.
                            // Príklad: začiatok 12:00, koniec 13:00, interval 30min -> 2 sloty.
                            const startMin = getMinutesSinceMidnight(match.time);
                            const endMin = getMinutesSinceMidnight(match.matchEndTime || calculateDefaultEndTime(match.time));
                            const durationInMinutes = endMin - startMin;
                            const numberOfSlots = durationInMinutes / timeIntervalMinutes;

                            // Vypočítame, koľko stĺpcov v rámci Gridu má zápas zaberať.
                            // Každý slot je jeden stĺpec.
                            // targetCell je prvý stĺpec, kde sa zápas začína.
                            // Potrebujeme, aby sa zápas rozprestieral z `matchColumnStart` cez `spanSlots` stĺpcov.

                            // Toto riešenie vyžaduje, aby .match-event bol umiestnený priamo v .calendar-grid
                            // A mal nastavené grid-row a grid-column.

                            // Získame riadok pre danú lokáciu
                            const locRow = locations.indexOf(match.location) + 2; // +2 pre hlavičky
                            
                            // Získame počiatočný stĺpec pre daný dátum a čas
                            const dateColumnStartOffset = dates.indexOf(matchDate) * timeSlots.length; // Index stĺpca pre začiatok dňa
                            const timeSlotColumnOffset = timeSlots.indexOf(matchTime); // Index stĺpca pre čas v rámci dňa
                            const startColumn = dateColumnStartOffset + timeSlotColumnOffset + 2; // +2 pre hlavičky

                            // Ak začiatok alebo koniec presahuje rámec timeSlots, treba to ošetriť, alebo orezávať zápas.
                            if (startColumn >= 2 && startColumn < (dates.length * timeSlots.length + 2)) {
                                matchEventDiv.style.gridRow = locRow;
                                matchEventDiv.style.gridColumn = `${startColumn} / span ${numberOfSlots}`; // Rozložiť cez sloty
                                calendarContainer.querySelector('.calendar-grid').appendChild(matchEventDiv);

                                // Pridanie event listenera na úpravu zápasu
                                matchEventDiv.addEventListener('click', () => editMatch(match.id));
                            } else {
                                console.warn(`Zápas "${match.team1DisplayName} vs ${match.team2DisplayName}" je mimo zobrazeného časového rozsahu alebo miesta a nebude zobrazený.`);
                            }
                        }
                    }
                });


            // Funkcia na výpočet predvoleného času konca (napr. + 1 hodina)
            function calculateDefaultEndTime(startTime) {
                if (!startTime) return '00:00';
                const [hours, minutes] = startTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes + 60, 0, 0); // Predvolená dĺžka 1 hodina
                return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            }

            // Pomocná funkcia na získanie minút od polnoci
            function getMinutesSinceMidnight(timeString) {
                if (!timeString) return 0;
                const [hours, minutes] = timeString.split(':').map(Number);
                return hours * 60 + minutes;
            }

            // Event listener pre odoslanie formulára - BEZ ZMIEN
            matchForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const matchCategory = matchCategorySelect.value;
                const matchGroup = matchGroupSelect.value;

                const team1Number = team1NumberInput.value;
                const team2Number = team2NumberInput.value;

                if (!matchCategory || !matchGroup || !team1Number || !team2Number || !matchDateInput.value || !matchTimeInput.value || !matchLocationInput.value) {
                    alert('Prosím, vyplňte všetky povinné polia (Dátum, Čas začiatku, Miesto, Kategória, Skupina, Poradové číslo tímu 1 a 2).');
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
                    time: matchTimeInput.value, // Čas začiatku
                    matchEndTime: matchEndTimeInput.value || calculateDefaultEndTime(matchTimeInput.value), // Čas konca (nové)
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
                    // Po úspešnom uložení opäť zobrazíme kalendár, s aktuálnym filtrom, ak existuje
                    await displayMatchesCalendar(filterDateInput.value || null); 
                } catch (error) {
                    console.error("Chyba pri ukladaní zápasu: ", error);
                    alert("Chyba pri ukladaní zápasu. Pozrite konzolu pre detaily.");
                }
            });

            // Funkcia editMatch - Upravíme načítanie matchEndTime
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
                        matchEndTimeInput.value = matchData.matchEndTime || ''; // Načítanie matchEndTime
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

            // Funkcia deleteMatch - BEZ ZMIEN
            async function deleteMatch(matchId) {
                if (confirm('Naozaj chcete vymazať tento zápas?')) {
                    try {
                        await deleteDoc(doc(matchesCollectionRef, matchId));
                        alert('Zápas úspešne vymazaný!');
                        // Po zmazaní opäť zobrazíme kalendár, s aktuálnym filtrom, ak existuje
                        await displayMatchesCalendar(filterDateInput.value || null);
                    } catch (error) {
                        console.error("Chyba pri mazaní zápasu: ", error);
                        alert("Chyba pri mazaní zápasu. Pozrite konzolu pre detaily.");
                    }
                }
            }


            // --- Inicializácia po načítaní stránky ---
            // Zobrazíme kalendár pri načítaní stránky
            await displayMatchesCalendar();


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
                // Pri zatvorení modálu obnovíme kalendár
                displayMatchesCalendar(filterDateInput.value || null);
            });

            // Event listener pre zmenu filtra dátumu
            filterDateInput.addEventListener('change', async () => {
                const selectedDate = filterDateInput.value;
                await displayMatchesCalendar(selectedDate);
            });

            // Event listener pre tlačidlo reset filtra
            resetFilterButton.addEventListener('click', async () => {
                filterDateInput.value = ''; // Vymaže filter
                await displayMatchesCalendar(null); // Zobrazí všetky dni
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
        });
