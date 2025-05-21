import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, busesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

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
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); // NOVÉ: Input pre ochranné pásmo
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');

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

    // NOVÉ: Modálne okno pre autobus
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busModalTitle = document.getElementById('busModalTitle');
    const busNameInput = document.getElementById('busNameInput');
    const busDateSelect = document.getElementById('busDateSelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect');
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- NOVÉ FUNKCIE PRE PLNENIE SELECT BODOV (už upravené v predošlej odpovedi) ---
    async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date; // Uložíme dátum ako hodnotu
                
                const dateObj = new Date(day.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                option.textContent = formattedDate; // Zobrazíme naformátovaný dátum
                
                selectElement.appendChild(option);
            });
            if (selectedDate) {
                selectElement.value = selectedDate; 
            }
        } catch (error) {
            console.error("Chyba pri načítaní hracích dní: ", error);
        }
    }

    async function populateSportHallsSelect(selectElement, selectedHallName = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte miesto (halu) --</option>';
        try {
            const querySnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name", "asc")));
            querySnapshot.forEach((doc) => {
                const hall = doc.data();
                const option = document.createElement('option');
                option.value = hall.name; // Uložíme názov haly ako hodnotu
                option.textContent = hall.name; // Zobrazíme názov haly
                selectElement.appendChild(option);
            });
            if (selectedHallName) {
                selectElement.value = selectedHallName;
            }
        } catch (error) {
            console.error("Chyba pri načítaní športových hál: ", error);
        }
    }
    // --- KONIEC NOVÝCH FUNKCIÍ ---


    // --- Funkcia na načítanie a zobrazenie zápasov a autobusov ako rozvrh ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        matchesContainer.innerHTML = '<p>Načítavam logistiku turnaja...</p>';
        try {
            // Načítame zápasy
            const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

            // Načítame autobusy
            const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
            const busesSnapshot = await getDocs(busesQuery);
            const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));

            // Spojíme všetky udalosti (zápasy a autobusy)
            const allEvents = [...allMatches, ...allBuses];

            // Získame aj hracie dni a športové haly pre hlavičky tabuľky
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name", "asc")));

            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
            const existingSportHalls = sportHallsSnapshot.docs.map(doc => doc.data().name);

            // Spojíme existujúce entity s tými, ktoré sú v zápasoch/autobusoch, aby sme nič neprehliadli
            const uniqueLocations = new Set([...existingSportHalls]);
            const uniqueDates = new Set([...existingPlayingDays]);

            allEvents.forEach(event => {
                uniqueDates.add(event.date);
                // Pre autobusy pridáme do unikátnych miest aj začiatočnú a koncovú lokalitu
                if (event.type === 'bus') {
                    uniqueLocations.add(event.startLocation);
                    uniqueLocations.add(event.endLocation);
                } else { // Pre zápasy je to len 'location'
                    uniqueLocations.add(event.location);
                }
            });

            const sortedLocations = Array.from(uniqueLocations).sort();
            const sortedDates = Array.from(uniqueDates).sort();

            const dailyTimeRanges = new Map();
            allEvents.forEach(event => {
                const date = event.date;
                let startTimeInMinutes, endTimeInMinutes;

                if (event.type === 'match') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const durationWithBuffer = (event.duration || 0) + (event.bufferTime || 0);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = startTimeInMinutes + durationWithBuffer;
                } else if (event.type === 'bus') {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const [endH, endM] = event.endTime.split(':').map(Number);
                    startTimeInMinutes = startH * 60 + startM;
                    endTimeInMinutes = endH * 60 + endM;
                    // Ak príchod je v nasledujúci deň (napr. 23:00 - 01:00), potrebujeme to zohľadniť
                    if (endTimeInMinutes < startTimeInMinutes) {
                        endTimeInMinutes += 24 * 60; // Pridáme 24 hodín pre správny rozsah
                    }
                }

                let actualEndHour = Math.ceil(endTimeInMinutes / 60);

                if (!dailyTimeRanges.has(date)) {
                    dailyTimeRanges.set(date, { minHour: Math.floor(startTimeInMinutes / 60), maxHour: actualEndHour });
                } else {
                    const range = dailyTimeRanges.get(date);
                    range.minHour = Math.min(range.minHour, Math.floor(startTimeInMinutes / 60));
                    range.maxHour = Math.max(range.maxHour, actualEndHour);
                }
            });

            let scheduleHtml = '<div class="schedule-table-container">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += '<th class="fixed-column">Miesto / Čas</th>';

            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                let hoursForDate = [];
                let firstHourInDay = 0; // Inicializácia premennej
                if (range) { // Ak existuje rozsah pre daný dátum (t.j. sú preň udalosti)
                    for (let h = range.minHour; h < range.maxHour; h++) {
                        hoursForDate.push(h);
                    }
                    firstHourInDay = range.minHour; // Priradenie skutočnej hodnoty
                }

                const displayDateObj = new Date(date);
                const displayDay = String(displayDateObj.getDate()).padStart(2, '0');
                const displayMonth = String(displayDateObj.getMonth() + 1).padStart(2, '0');
                const displayYear = String(displayDateObj.getFullYear());
                const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`; // Definícia tu

                const colspan = hoursForDate.length;

                if (colspan > 0) {
                    scheduleHtml += `<th colspan="${colspan}" class="delete-date-header" data-date="${date}" title="Kliknutím vymažete hrací deň ${formattedDisplayDate} a všetky jeho zápasy">`;
                    scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                    scheduleHtml += '<div class="schedule-times-row">';
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                    scheduleHtml += '</div>';
                    scheduleHtml += '</th>';
                } else {
                    scheduleHtml += `<th class="delete-date-header" data-date="${date}" title="Kliknutím vymažete hrací deň ${formattedDisplayDate}">`;
                    scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div><div class="schedule-times-row"><span></span></div></th>`;
                }
            });
            scheduleHtml += '</tr></thead><tbody>';

            sortedLocations.forEach(location => {
                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header" data-location="${location}" title="Kliknutím vymažete športovú halu ${location} a všetky jej zápasy">${location}</th>`;

                sortedDates.forEach(date => {
                    const range = dailyTimeRanges.get(date);
                    let hoursForDate = [];
                    let firstHourInDay = 0; // Inicializácia premennej aj tu
                    if (range) {
                        for (let h = range.minHour; h < range.maxHour; h++) {
                            hoursForDate.push(h);
                        }
                        firstHourInDay = range.minHour; // Priradenie skutočnej hodnoty
                    }
                    const colspan = hoursForDate.length;

                    if (colspan === 0) {
                        scheduleHtml += `<td><span class="no-match-placeholder"></span></td>`;
                        return;
                    }

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    // Filter udalostí pre danú lokalitu a dátum
                    const eventsForLocationAndDate = allEvents.filter(event =>
                        (event.type === 'match' && event.location === location && event.date === date) ||
                        (event.type === 'bus' && event.date === date && (event.startLocation === location || event.endLocation === location))
                    );

                    const CELL_WIDTH_PX = 260;
                    const MINUTES_PER_HOUR = 60;
                    const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
                    const ITEM_HEIGHT_PX = 160;

                    eventsForLocationAndDate.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    const tracks = [];

                    eventsForLocationAndDate.forEach(event => {
                        let absoluteStartMin, durationOrRouteTime, bufferInMinutes = 0;
                        let eventClass = '';
                        let contentHtml = '';
                        let dataId = event.id;
                        let editFunction = '';
                        let deleteFunction = '';

                        if (event.type === 'match') {
                            const [startH, startM] = event.startTime.split(':').map(Number);
                            absoluteStartMin = startH * 60 + startM;
                            durationOrRouteTime = event.duration;
                            bufferInMinutes = event.bufferTime || 0;

                            const matchEndTime = new Date();
                            matchEndTime.setHours(startH, startM + durationOrRouteTime, 0, 0);
                            const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                            eventClass = 'schedule-cell-match';
                            contentHtml = `
                                <p class="schedule-cell-time">${event.startTime} - ${formattedEndTime}</p>
                                <p class="schedule-cell-category">${event.categoryName || 'N/A'}${event.groupName ? ` ${event.groupName}` : ''}</p>
                                <p class="schedule-cell-teams">${event.team1DisplayName}<br>${event.team2DisplayName}</p>
                                <p class="schedule-cell-club-names">${event.team1ClubName}<br>${event.team2ClubName}</p>
                            `;
                            editFunction = `editMatch('${dataId}')`;
                            deleteFunction = `deleteMatch('${dataId}')`;

                        } else if (event.type === 'bus') {
                            const [startH, startM] = event.startTime.split(':').map(Number);
                            const [endH, endM] = event.endTime.split(':').map(Number);
                            absoluteStartMin = startH * 60 + startM;
                            let absoluteEndMin = endH * 60 + endM;
                            if (absoluteEndMin < absoluteStartMin) { // Prechádza cez polnoc
                                absoluteEndMin += 24 * 60;
                            }
                            durationOrRouteTime = absoluteEndMin - absoluteStartMin; // Dĺžka trasy

                            eventClass = 'schedule-cell-bus-svg-container'; // Používame nový SVG kontajner
                            contentHtml = `
                                <svg width="100%" height="100%" viewBox="0 0 ${CELL_WIDTH_PX * colspan} ${ITEM_HEIGHT_PX}">
                                    <polygon class="schedule-bus-polygon" points="
                                        ${(absoluteStartMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE}, 0
                                        ${(absoluteEndMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE}, 0
                                        ${(absoluteEndMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE}, ${ITEM_HEIGHT_PX}
                                        ${(absoluteStartMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE}, ${ITEM_HEIGHT_PX}
                                    " data-id="${dataId}" data-type="${event.type}"></polygon>
                                    <text class="schedule-bus-text" 
                                          x="${((absoluteStartMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE + (absoluteEndMin - (firstHourInDay * 60)) * PIXELS_PER_MINUTE) / 2}" 
                                          y="${ITEM_HEIGHT_PX / 2}">
                                        ${event.busName}
                                    </text>
                                </svg>
                            `;
                            editFunction = `editBus('${dataId}')`;
                            deleteFunction = `deleteBus('${dataId}')`;
                        } else {
                            return; // Preskočíme neznámy typ udalosti
                        }

                        // Dôležité: Pre výpočet prekrývania pre stopy (tracks) použijeme celkovú dĺžku vrátane bufferu (ak je to zápas)
                        const absoluteEndMinForTracks = absoluteStartMin + durationOrRouteTime + bufferInMinutes; 

                        const relativeStartMin = absoluteStartMin - (firstHourInDay * 60);

                        let eventBlockLeftPx;
                        let eventBlockWidthPx;

                        if (event.type === 'match') {
                            eventBlockLeftPx = relativeStartMin * PIXELS_PER_MINUTE;
                            eventBlockWidthPx = durationOrRouteTime * PIXELS_PER_MINUTE;
                        } else if (event.type === 'bus') {
                            // Pre autobus už nepočítame šírku a pozíciu pre div, ale pre SVG
                            // SVG kontajner zaberá celú šírku bunky, a polygon sa vykreslí v ňom
                            eventBlockLeftPx = 0; // SVG kontajner je vľavo v bunke
                            eventBlockWidthPx = CELL_WIDTH_PX * colspan; // SVG kontajner zaberá celú šírku colspan bunky
                        }


                        // Pozícia a šírka ochranného pásma (začína presne po zápase)
                        const bufferBlockLeftPx = eventBlockLeftPx + eventBlockWidthPx;
                        const bufferBlockWidthPx = bufferInMinutes * PIXELS_PER_MINUTE;


                        let topPx = 0;

                        let foundTrack = false;
                        for (let i = 0; i < tracks.length; i++) {
                            const track = tracks[i];
                            // Kontrola prekrývania pre stopy musí zohľadňovať aj ochranné pásmo
                            const doesOverlap = (absoluteStartMin < track.endMin && absoluteEndMinForTracks > track.startMin);
                            
                            if (!doesOverlap) {
                                topPx = track.topPx;
                                track.startMin = Math.min(track.startMin, absoluteStartMin);
                                track.endMin = Math.max(track.endMin, absoluteEndMinForTracks); // Aktualizujeme endMin s bufferom
                                foundTrack = true;
                                break;
                            }
                        }

                        if (!foundTrack) {
                            topPx = tracks.length * ITEM_HEIGHT_PX;
                            tracks.push({ startMin: absoluteStartMin, endMin: absoluteEndMinForTracks, topPx: topPx }); // Uložíme endMin s bufferom
                        }

                        // Najprv pridáme blok ochranného pásma (ak existuje a je to zápas)
                        if (event.type === 'match' && bufferInMinutes > 0) {
                            scheduleHtml += `
                                <div class="schedule-cell-buffer"
                                    style="position: absolute; left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: ${topPx}px; height: ${ITEM_HEIGHT_PX}px; background-color: #ffcccc; border-left: 1px dashed #ff9999;">
                                </div>
                            `;
                        }

                        // Potom pridáme blok samotnej udalosti (zápas alebo autobus)
                        // Pre autobusy už nebudeme mať schedule-cell-content ani schedule-cell-actions v tomto div-e
                        // Akčné tlačidlá pre autobusy budú pridané samostatne a prepojené s SVG polygónom
                        if (event.type === 'match') {
                            scheduleHtml += `
                                <div class="${eventClass}"
                                    data-id="${dataId}" data-type="${event.type}"
                                    style="position: absolute; left: ${eventBlockLeftPx}px; width: ${eventBlockWidthPx}px; top: ${topPx}px; height: ${ITEM_HEIGHT_PX}px;">
                                    <div class="schedule-cell-content">
                                        ${contentHtml}
                                    </div>
                                    <div class="schedule-cell-actions">
                                        <button class="edit-btn" data-id="${dataId}" data-type="${event.type}">Upraviť</button>
                                        <button class="delete-btn" data-id="${dataId}" data-type="${event.type}">Vymazať</button>
                                    </div>
                                </div>
                            `;
                        } else if (event.type === 'bus') {
                            scheduleHtml += `
                                <div class="${eventClass}"
                                    data-id="${dataId}" data-type="${event.type}"
                                    style="position: absolute; left: ${eventBlockLeftPx}px; width: ${eventBlockWidthPx}px; top: ${topPx}px; height: ${ITEM_HEIGHT_PX}px;">
                                    ${contentHtml}
                                </div>
                                <div class="schedule-cell-actions schedule-cell-bus-actions"
                                    style="position: absolute; left: ${eventBlockLeftPx}px; width: ${eventBlockWidthPx}px; top: ${topPx + ITEM_HEIGHT_PX - 30}px; height: 30px;">
                                    <button class="edit-btn" data-id="${dataId}" data-type="${event.type}">Upraviť</button>
                                    <button class="delete-btn" data-id="${dataId}" data-type="${event.type}">Vymazať</button>
                                </div>
                            `;
                        }
                    });
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>';
            matchesContainer.innerHTML = scheduleHtml;

            // Pridanie event listenerov pre Upraviť/Vymazať tlačidlá
            matchesContainer.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const id = event.target.dataset.id;
                    const type = event.target.dataset.type;
                    if (type === 'match') {
                        editMatch(id);
                    } else if (type === 'bus') {
                        editBus(id);
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const id = event.target.dataset.id;
                    const type = event.target.dataset.type;
                    if (type === 'match') {
                        deleteMatch(id);
                    } else if (type === 'bus') {
                        deleteBus(id);
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-date-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target === header || event.target.closest('.delete-date-header') === header) {
                        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('delete-btn')) {
                            const dateToDelete = header.dataset.date;
                            deletePlayingDay(dateToDelete);
                        }
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target === header || event.target.closest('.delete-location-header') === header) {
                        if (!event.target.classList.contains('edit-btn') && !event.target.classList.contains('delete-btn')) {
                            const locationToDelete = header.dataset.location;
                            deleteSportHall(locationToDelete);
                        }
                        
                    }
                });
            });

        } catch (error) {
            console.error("Chyba pri načítaní rozvrhu zápasov: ", error);
            matchesContainer.innerHTML = '<p>Chyba pri načítaní rozvrhu zápasov. Skontrolujte konzolu pre detaily a uistite sa, že máte vytvorené potrebné indexy vo Firestore.</p>';
        }
    }

    async function deletePlayingDay(dateToDelete) {
        if (confirm(`Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy a autobusové linky, ktoré sa konajú v tento deň?`)) {
            try {
                const batch = writeBatch(db);

                const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
                const playingDaySnapshot = await getDocs(playingDayQuery);
                if (!playingDaySnapshot.empty) {
                    playingDaySnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Hrací deň ${dateToDelete} sa nenašiel, ale pokračujem v mazaní zápasov a autobusov.`);
                }

                // Vymazanie súvisiacich zápasov
                const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // NOVÉ: Vymazanie súvisiacich autobusov
                const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
                const busesSnapshot = await getDocs(busesQuery);
                busesSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                await batch.commit();
                alert(`Hrací deň ${dateToDelete} a všetky súvisiace zápasy a autobusové linky boli úspešne vymazané!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní hracieho dňa ${dateToDelete}: `, error);
                alert(`Chyba pri mazaní hracieho dňa ${dateToDelete}. Pozrite konzolu pre detaily.`);
            }
        }
    }

    async function deleteSportHall(hallNameToDelete) {
        if (confirm(`Naozaj chcete vymazať športovú halu ${hallNameToDelete} a VŠETKY zápasy a autobusové linky, ktoré sa konajú v tejto hale (ako štart alebo cieľ)?`)) {
            try {
                const batch = writeBatch(db);

                const sportHallQuery = query(sportHallsCollectionRef, where("name", "==", hallNameToDelete));
                const sportHallSnapshot = await getDocs(sportHallQuery);
                if (!sportHallSnapshot.empty) {
                    sportHallSnapshot.docs.forEach(docToDelete => {
                        batch.delete(doc(sportHallsCollectionRef, docToDelete.id));
                    });
                } else {
                    console.warn(`Športová hala ${hallNameToDelete} sa nenašla, ale pokračujem v mazaní zápasov a autobusov.`);
                }

                // Vymazanie súvisiacich zápasov
                const matchesQuery = query(matchesCollectionRef, where("location", "==", hallNameToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // NOVÉ: Vymazanie súvisiacich autobusov (ktoré začínajú alebo končia v hale)
                const busesStartQuery = query(busesCollectionRef, where("startLocation", "==", hallNameToDelete));
                const busesStartSnapshot = await getDocs(busesStartQuery);
                busesStartSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                const busesEndQuery = query(busesCollectionRef, where("endLocation", "==", hallNameToDelete));
                const busesEndSnapshot = await getDocs(busesEndQuery);
                busesEndSnapshot.docs.forEach(busDoc => {
                    // Ak je autobusová linka rovnaká ako tá, ktorá už bola vymazaná cez startLocation,
                    // batch.delete sa o to postará, ale pre istotu môžeme pridať kontrolu
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });


                await batch.commit();
                alert(`Športová hala ${hallNameToDelete} a všetky súvisiace zápasy a autobusové linky boli úspešne vymazané!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Chyba pri mazaní športovej haly ${hallNameToDelete}: `, error);
                alert(`Chyba pri mazaní športovej haly ${hallNameToDelete}. Pozrite konzolu pre detaily.`);
            }
        }
    }


    async function editMatch(matchId) {
        try {
            const matchDocRef = doc(matchesCollectionRef, matchId);
            const matchDoc = await getDoc(matchDocRef);

            if (matchDoc.exists()) {
                const matchData = matchDoc.data();
                matchIdInput.value = matchId;
                matchModalTitle.textContent = 'Upraviť zápas';

                await populatePlayingDaysSelect(matchDateSelect, matchData.date);
                await populateSportHallsSelect(matchLocationSelect, matchData.location);

                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || 60;
                matchBufferTimeInput.value = matchData.bufferTime || 5; // Načítanie ochranného pásma

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

    // NOVÉ: Funkcie pre úpravu a mazanie autobusu
    async function editBus(busId) {
        try {
            const busDocRef = doc(busesCollectionRef, busId);
            const busDoc = await getDoc(busDocRef);

            if (busDoc.exists()) {
                const busData = busDoc.data();
                busIdInput.value = busId;
                busModalTitle.textContent = 'Upraviť autobusovú linku';

                busNameInput.value = busData.busName || '';
                await populatePlayingDaysSelect(busDateSelect, busData.date);
                await populateSportHallsSelect(busStartLocationSelect, busData.startLocation);
                busStartTimeInput.value = busData.startTime || '';
                await populateSportHallsSelect(busEndLocationSelect, busData.endLocation);
                busEndTimeInput.value = busData.endTime || '';
                busNotesInput.value = busData.notes || '';

                openModal(busModal);
            } else {
                alert("Autobusová linka sa nenašla.");
            }
        } catch (error) {
            console.error("Chyba pri načítavaní dát autobusu pre úpravu: ", error);
            alert("Vyskytla sa chyba pri načítavaní dát autobusu. Skúste to znova.");
        }
    }

    async function deleteBus(busId) {
        if (confirm('Naozaj chcete vymazať túto autobusovú linku?')) {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                alert('Autobusová linka úspešne vymazaná!');
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Chyba pri mazaní autobusovej linky: ", error);
                alert("Chyba pri mazaní autobusovej linky. Pozrite konzolu pre detaily.");
            }
        }
    }

    await displayMatchesAsSchedule();


    // --- Logika pre tlačidlo '+' a dropdown ---
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Zabráni okamžitému zatvoreniu dropdownu kliknutím na tlačidlo
        addOptions.classList.toggle('show'); // Prepne triedu 'show'
    });

    // Skryť dropdown, ak kliknem mimo neho alebo jeho možností
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        openModal(playingDayModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        openModal(sportHallModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallsSelect(matchLocationSelect);
        matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
        matchGroupSelect.disabled = true;
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = '';
        matchBufferTimeInput.value = 5; // Predvolená hodnota 5 minút pre ochranné pásmo
        openModal(matchModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    // NOVÉ: Event listener pre tlačidlo Pridať autobus
    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        await populatePlayingDaysSelect(busDateSelect);
        await populateSportHallsSelect(busStartLocationSelect);
        await populateSportHallsSelect(busEndLocationSelect);
        openModal(busModal);
        addOptions.classList.remove('show'); // Skryť dropdown po výbere
    });

    // --- Zatváranie modálnych okien ---
    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule();
    });

    closeSportHallModalButton.addEventListener('click', () => {
        closeModal(sportHallModal);
        displayMatchesAsSchedule();
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule();
    });

    // NOVÉ: Zatváranie modálneho okna pre autobus
    closeBusModalButton.addEventListener('click', () => {
        closeModal(busModal);
        displayMatchesAsSchedule();
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

    const getTeamName = async (categoryId, groupId, teamNumber) => {
        if (!categoryId || !groupId || !teamNumber) {
            return { fullDisplayName: null, clubName: null, clubId: null };
        }

        try {
            const categoryDoc = await getDoc(doc(categoriesCollectionRef, categoryId));
            const categoryName = categoryDoc.exists() ? (categoryDoc.data().name || categoryId) : categoryId;

            const groupDoc = await getDoc(doc(groupsCollectionRef, groupId));
            const groupData = groupDoc.exists() ? groupData.data() : null;
            const groupName = groupData ? (groupData.name || groupId) : groupId;

            let clubName = `Tím ${teamNumber}`;
            let clubId = null; 

            const clubsQuery = query(
                clubsCollectionRef,
                where("categoryId", "==", categoryId),
                where("groupId", "==", groupId),
                where("orderInGroup", "==", parseInt(teamNumber))
            );
            const clubsSnapshot = await getDocs(clubsQuery);

            if (!clubsSnapshot.empty) {
                const teamDocData = clubsSnapshot.docs[0].data();
                clubId = clubsSnapshot.docs[0].id;
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
                clubName: clubName,
                clubId: clubId
            };
        } catch (error) {
            console.error("Chyba pri získavaní názvu tímu: ", error);
            return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
        }
    };

    // --- Event Listener pre formulár ZÁPASU ---
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);

        const matchDate = matchDateSelect.value;
        const matchLocation = matchLocationSelect.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value); // Získanie hodnoty ochranného pásma


        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocation || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            alert('Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Ochranné pásmo).');
            return;
        }

        if (team1Number === team2Number) {
            alert('Tímy nemôžu hrať sami proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
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

        // --- KONTROLA: Prekrývanie časov v rovnakej hale a deň (vrátane ochranného pásma) ---
        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime; 

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocation)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                // Ak upravujeme existujúci zápas, preskočíme ho pri kontrole prekrývania
                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const [existingStartHour, existingStartMinute] = existingMatch.startTime.split(':').map(Number);
                const existingMatchStartInMinutes = existingStartHour * 60 + existingStartMinute;
                const existingMatchEndInMinutesWithBuffer = existingMatchStartInMinutes + (existingMatch.duration || 0) + (existingMatch.bufferTime || 0);

                if (newMatchStartInMinutes < existingMatchEndInMinutesWithBuffer && newMatchEndInMinutesWithBuffer > existingMatchStartInMinutes) {
                    overlapFound = true;
                    overlappingMatchDetails = existingMatch;
                    return; 
                }
            });

            if (overlapFound) {
                const [existingStartHour, existingStartMinute] = overlappingMatchDetails.startTime.split(':').map(Number);
                const existingMatchEndTimeObj = new Date(); 
                existingMatchEndTimeObj.setHours(existingStartHour, existingStartMinute + (overlappingMatchDetails.duration || 0), 0, 0);
                const formattedExistingEndTime = existingMatchEndTimeObj.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit'});

                alert(`Zápas sa prekrýva s existujúcim zápasom v hale "${matchLocation}" dňa ${matchDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo ochranné pásmo.`);
                return; 
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov: ", error);
            alert("Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY PREKRÝVANIA ---


        // --- KONTROLA: Tímy v rovnakej kategórii a skupine nemôžu hrať proti sebe viackrát ---
        let existingMatchIdForTeams = null; 
        try {
            const q1 = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team1Number),
                where("team2Number", "==", team2Number)
            );
            const q2 = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup),
                where("team1Number", "==", team2Number),
                where("team2Number", "==", team1Number)
            );

            const snapshot1 = await getDocs(q1);
            const snapshot2 = await getDocs(q2);

            const foundDoc1 = snapshot1.docs.find(doc => doc.id !== currentMatchId);
            const foundDoc2 = snapshot2.docs.find(doc => doc.id !== currentMatchId);

            if (foundDoc1) {
                existingMatchIdForTeams = foundDoc1.id;
            } else if (foundDoc2) {
                existingMatchIdForTeams = foundDoc2.id;
            }

            if (existingMatchIdForTeams) {
                const confirmDelete = confirm(
                    `Zápas medzi tímami ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už existuje v tejto kategórii a skupine. ` +
                    `Chcete existujúci zápas odstrániť a nahradiť ho novým?`
                );
                if (confirmDelete) {
                    await deleteDoc(doc(matchesCollectionRef, existingMatchIdForTeams));
                    console.log(`Existujúci zápas ${existingMatchIdForTeams} bol odstránený.`);
                } else {
                    alert('Operácia zrušená. Zápas nebol pridaný ani odstránený.');
                    closeModal(matchModal);
                    return;
                }
            }

        } catch (error) {
            console.error("Chyba pri kontrole alebo mazaní existujúceho zápasu (tímov):", error);
            alert("Vyskytla sa chyba pri kontrole alebo mazaní existujúceho zápasu (tímov). Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY TÍMOV ---


        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime, // Uloženie ochranného pásma
            location: matchLocation,
            categoryId: matchCategory,
            categoryName: matchCategorySelect.options[matchCategorySelect.selectedIndex].text,
            groupId: matchGroup || null,
            groupName: matchGroup ? matchGroupSelect.options[matchGroupSelect.selectedIndex].text.replace(/skupina /gi, '').trim() : null,

            team1Category: matchCategory,
            team1Group: matchGroup,
            team1Number: team1Number,
            team1DisplayName: team1Result.fullDisplayName,
            team1ClubName: team1Result.clubName,
            team1ClubId: team1Result.clubId,

            team2Category: matchCategory,
            team2Group: matchGroup,
            team2Number: team2Number,
            team2DisplayName: team2Result.fullDisplayName,
            team2ClubName: team2Result.clubName,
            team2ClubId: team2Result.clubId,

            createdAt: new Date()
        };

        console.log('Dáta zápasu na uloženie:', matchData);

        try {
            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
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


    // --- NOVÉ: Event Listener pre formulár AUTOBUSU ---
    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const busName = busNameInput.value.trim();
        const busDate = busDateSelect.value;
        const busStartLocation = busStartLocationSelect.value;
        const busStartTime = busStartTimeInput.value;
        const busEndLocation = busEndLocationSelect.value;
        const busEndTime = busEndTimeInput.value;
        const busNotes = busNotesInput.value.trim();

        const currentBusId = busIdInput.value;

        if (!busName || !busDate || !busStartLocation || !busStartTime || !busEndLocation || !busEndTime) {
            alert('Prosím, vyplňte všetky povinné polia (Názov autobusu, Dátum, Miesto začiatku, Čas odchodu, Miesto cieľa, Čas príchodu).');
            return;
        }

        // Kontrola, či miesto začiatku a cieľa nie sú rovnaké
        if (busStartLocation === busEndLocation) {
            alert('Miesto začiatku a miesto cieľa nemôžu byť rovnaké. Prosím, zvoľte rôzne miesta.');
            return;
        }

        // Kontrola, či čas príchodu nie je pred časom odchodu (ak je v ten istý deň)
        const [startH, startM] = busStartTime.split(':').map(Number);
        const [endH, endM] = busEndTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        // Ak čas príchodu je menší ako čas odchodu, predpokladáme, že je to nasledujúci deň
        if (endTimeInMinutes < startTimeInMinutes) {
            // Toto je v poriadku, ak ide o prechod cez polnoc, ale nesmie to byť prekrývanie v rámci dňa
            // Pre účely výpočtu dĺžky trasy a prekrývania pridáme 24 hodín
            endTimeInMinutes += 24 * 60; 
        }

        const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
        if (durationInMinutes <= 0) {
            alert('Čas príchodu musí byť po čase odchodu.');
            return;
        }


        // --- KONTROLA: Prekrývanie autobusových liniek pre ten istý autobus ---
        try {
            const existingBusesQuery = query(
                busesCollectionRef,
                where("date", "==", busDate),
                where("busName", "==", busName) // Kontrolujeme pre konkrétny autobus
            );
            const existingBusesSnapshot = await getDocs(existingBusesQuery);

            let overlapFound = false;
            let overlappingBusDetails = null;

            existingBusesSnapshot.docs.forEach(doc => {
                const existingBus = doc.data();
                const existingBusId = doc.id;

                // Ak upravujeme existujúci autobus, preskočíme ho pri kontrole prekrývania
                if (currentBusId && existingBusId === currentBusId) {
                    return;
                }

                const [existingStartH, existingStartM] = existingBus.startTime.split(':').map(Number);
                const [existingEndH, existingEndM] = existingBus.endTime.split(':').map(Number);
                const existingBusStartInMinutes = existingStartH * 60 + existingStartM;
                let existingBusEndInMinutes = existingEndH * 60 + existingEndM;
                if (existingBusEndInMinutes < existingBusStartInMinutes) {
                    existingBusEndInMinutes += 24 * 60;
                }

                // Kontrola prekrývania: (nový začína pred existujúcim koncom A nový končí po existujúcom začiatku)
                if (startTimeInMinutes < existingBusEndInMinutes && endTimeInMinutes > existingBusStartInMinutes) {
                    overlapFound = true;
                    overlappingBusDetails = existingBus;
                    return; 
                }
            });

            if (overlapFound) {
                alert(`Autobus "${busName}" sa prekrýva s existujúcou linkou dňa ${busDate}:\n\n` +
                      `Existujúca linka: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation} -> ${overlappingBusDetails.endLocation})\n\n` +
                      `Prosím, upravte čas odchodu alebo príchodu novej linky.`);
                return; 
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania autobusových liniek: ", error);
            alert("Vyskytla sa chyba pri kontrole prekrývania autobusových liniek. Skúste to znova.");
            return;
        }
        // --- KONIEC KONTROLY PREKRÝVANIA AUTOBUSOV ---


        const busData = {
            busName: busName,
            date: busDate,
            startLocation: busStartLocation,
            startTime: busStartTime,
            endLocation: busEndLocation,
            endTime: busEndTime,
            notes: busNotes,
            createdAt: new Date()
        };

        console.log('Dáta autobusu na uloženie:', busData);

        try {
            if (currentBusId) {
                await setDoc(doc(busesCollectionRef, currentBusId), busData, { merge: true });
                alert('Autobusová linka úspešne aktualizovaná!');
            } else {
                await addDoc(busesCollectionRef, busData);
                alert('Nová autobusová linka úspešne pridaná!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní autobusovej linky: ", error);
            alert("Chyba pri ukladaní autobusovej linky. Pozrite konzolu pre detaily.");
        }
    });


    // --- Event Listener pre formulár HRACIEHO DŇA ---
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Hrací deň s týmto dátumom už existuje!');
                return;
            }

            await addDoc(playingDaysCollectionRef, {
                date: date,
                createdAt: new Date()
            });
            alert('Hrací deň úspešne pridaný!');
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa: ", error);
            alert("Chyba pri ukladaní hracieho dňa. Pozrite konzolu pre detaily.");
        }
    });

    // --- Event Listener pre formulár ŠPORTOVEJ HALY ---
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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
            const q = query(sportHallsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Športová hala s týmto názvom už existuje!');
                return;
            }

            await addDoc(sportHallsCollectionRef, {
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            });
            alert('Športová hala úspešne pridaná!');
            closeModal(sportHallModal);
            await displayMatchesAsSchedule(); // Aktualizovať rozvrh
        } catch (error) {
            console.error("Chyba pri ukladaní športovej haly: ", error);
            alert("Chyba pri ukladaní športovej haly. Pozrite konzolu pre detaily.");
        }
    });
});
