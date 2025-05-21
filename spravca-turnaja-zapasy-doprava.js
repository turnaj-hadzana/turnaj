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
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal'); // NOVÉ: Tlačidlo Vymazať v modale

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
    const busEndLocationSelect = document.getElementById('busEndLocationSelect'); // Opravený riadok
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal'); // NOVÉ: Tlačidlo Vymazať v modale


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Funkcie pre plnenie select boxov ---
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
            console.error("Error loading playing days: ", error);
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
            console.error("Error loading sport halls: ", error);
        }
    }
    // --- Koniec funkcií pre plnenie select boxov ---


    // --- Funkcia na načítanie a zobrazenie zápasov a autobusov ako rozvrh ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        // Vymažeme matchesContainer pred opätovným vykreslením
        matchesContainer.innerHTML = ''; // Vymaže existujúci obsah vrátane starého busOverlayContainer

        matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');
        
        // Definície konštánt pre výpočet pozícií a rozmerov
        const CELL_WIDTH_PX = 350;
        const MINUTES_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
        const ITEM_HEIGHT_PX = 140; 

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
            // Získame kompletné dáta o halách pre zobrazenie adresy a URL
            const existingSportHallsData = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const existingSportHallsNames = existingSportHallsData.map(hall => hall.name);


            // Spojíme unikátne miesta a dátumy zo všetkých udalostí
            const uniqueLocations = new Set([...existingSportHallsNames]);
            const uniqueDates = new Set([...existingPlayingDays]);

            allEvents.forEach(event => {
                uniqueDates.add(event.date);
                if (event.type === 'bus') {
                    uniqueLocations.add(event.startLocation);
                    uniqueLocations.add(event.endLocation);
                } else {
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
                    if (endTimeInMinutes < startTimeInMinutes) {
                        endTimeInMinutes += 24 * 60; // Prechod cez polnoc
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

            // Odstránime "Načítavam logistiku turnaja..."
            matchesContainer.innerHTML = ''; 

            let scheduleHtml = '<div class="schedule-table-container">';
            scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
            scheduleHtml += '<th class="fixed-column">Miesto / Čas</th>';

            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                let hoursForDate = [];
                if (range) {
                    for (let h = range.minHour; h < range.maxHour; h++) {
                        hoursForDate.push(h);
                    }
                }

                const displayDateObj = new Date(date);
                const displayDay = String(displayDateObj.getDate()).padStart(2, '0');
                const displayMonth = String(displayDateObj.getMonth() + 1).padStart(2, '0');
                const displayYear = String(displayDateObj.getFullYear());
                const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`;

                const colspan = hoursForDate.length > 0 ? hoursForDate.length : 1;

                scheduleHtml += `<th colspan="${colspan}" class="delete-date-header" data-date="${date}" title="Kliknutím vymažete hrací deň ${formattedDisplayDate} a všetky jeho zápasy">`;
                scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
                scheduleHtml += '<div class="schedule-times-row">';
                if (hoursForDate.length > 0) {
                    hoursForDate.forEach(hour => {
                        scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                    });
                } else {
                    scheduleHtml += `<span></span>`; // Placeholder for empty day
                }
                scheduleHtml += '</div>';

                scheduleHtml += '</th>';
            });
            scheduleHtml += '</tr></thead><tbody>';

            sortedLocations.forEach(locationName => {
                // Nájdeme kompletné dáta haly podľa názvu
                const hallData = existingSportHallsData.find(hall => hall.name === locationName);
                // Ak názov miesta v sortedLocations nezodpovedá aktívnej športovej hale, preskočíme tento riadok.
                // Toto rieši prípady, keď hala mohla byť vymazaná, ale udalosti na ňu stále odkazujú.
                if (!hallData) {
                    console.warn(`Preskakujem riadok pre miesto "${locationName}", pretože to nie je aktívna športová hala.`);
                    return; 
                }

                const hallAddress = hallData.address;
                const hallGoogleMapsUrl = hallData.googleMapsUrl;

                scheduleHtml += '<tr>';
                scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header" data-location="${locationName}" title="Kliknutím vymažete športovú halu ${locationName} a všetky jej zápasy">
                    <div class="hall-name">${locationName}</div>
                    <div class="hall-address">
                        <a href="${hallGoogleMapsUrl}" target="_blank" rel="noopener noreferrer">${hallAddress}</a>
                    </div>
                </th>`;

                sortedDates.forEach(date => {
                    const range = dailyTimeRanges.get(date);
                    const hoursForDateCount = range ? (range.maxHour - range.minHour) : 0;
                    const colspan = hoursForDateCount > 0 ? hoursForDateCount : 1;

                    scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                    // Filter zápasov pre túto konkrétnu bunku
                    const matchesForCell = allEvents.filter(event =>
                        event.type === 'match' && event.location === locationName && event.date === date
                    );

                    matchesForCell.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesForCell.forEach(match => {
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        const absoluteStartMin = startH * 60 + startM;
                        
                        const relativeStartMinInCell = absoluteStartMin - (range.minHour * 60);

                        const matchBlockLeftPx = relativeStartMinInCell * PIXELS_PER_MINUTE;
                        const matchBlockWidthPx = match.duration * PIXELS_PER_MINUTE;
                        const bufferBlockLeftPx = matchBlockLeftPx + matchBlockWidthPx;
                        const bufferBlockWidthPx = match.bufferTime * PIXELS_PER_MINUTE;

                        const matchEndTime = new Date();
                        matchEndTime.setHours(startH, startM + match.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        scheduleHtml += `
                            <div class="schedule-cell-match"
                                data-id="${match.id}" data-type="${match.type}"
                                style="left: ${matchBlockLeftPx}px; width: ${matchBlockWidthPx}px; top: 0; height: 100%;">
                                <div class="schedule-cell-content">
                                    <p class="schedule-cell-time">${match.startTime} - ${formattedEndTime}</p>
                                    <p class="schedule-cell-category">${match.categoryName || 'N/A'}${match.groupName ? ` ${match.groupName}` : ''}</p>
                                    <p class="schedule-cell-teams">${match.team1DisplayName}<br>${match.team2DisplayName}</p>
                                    <p class="schedule-cell-club-names">${match.team1ClubName}<br>${match.team2ClubName}</p>
                                </div>
                            </div>
                        `;
                        if (match.bufferTime > 0) {
                            scheduleHtml += `
                                <div class="schedule-cell-buffer"
                                    style="left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: 0; height: 100%;">
                                </div>
                            `;
                        }
                    });
                    scheduleHtml += '</td>';
                });
                scheduleHtml += '</tr>';
            });
            scheduleHtml += '</tbody></table>';
            scheduleHtml += '</div>'; // Close schedule-table-container

            // Append the table structure to the DOM first
            matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

            // Získame referencie na tabuľku a jej kontajner po tom, čo sú v DOM
            const scheduleTableContainer = matchesContainer.querySelector('.schedule-table-container');
            const scheduleTable = matchesContainer.querySelector('.match-schedule-table');
            
            // Vytvoríme a pridáme busOverlayContainer teraz, keď je tabuľka v DOM
            const busOverlayContainer = document.createElement('div');
            busOverlayContainer.id = 'busOverlayContainer';
            // Nastavíme pozíciu na absolute v rámci matchesContainer (ktorý je relative)
            // Nastavíme šírku na 100% a pointer-events na none predvolene
            busOverlayContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; pointer-events: none;'; 
            matchesContainer.appendChild(busOverlayContainer); // Pridáme do matchesContainer

            // Dynamicky nastavíme výšku busOverlayContainer tak, aby zodpovedala scrollHeight kontajnera tabuľky
            // Tým sa zabezpečí, že pokryje celú posúvateľnú oblasť tabuľky a posúva sa s ňou.
            busOverlayContainer.style.height = `${scheduleTableContainer.scrollHeight}px`;


            // Výpočet globálnych pixelových offsetov pre miesta a časy
            // Tieto offsety sú relatívne k matchesContainer, ktorý je kontextom pozícií pre busOverlayContainer
            const matchesContainerRect = matchesContainer.getBoundingClientRect();
            // const tableRect = scheduleTable.getBoundingClientRect(); // Toto sa priamo nepoužíva pre základ pozícií SVG, ale pre pozície interných elementov tabuľky.

            const locationRowTopOffsets = new Map(); // locationName -> globálny top pixelový offset relatívny k matchesContainer
            scheduleTable.querySelectorAll('tbody tr').forEach(row => {
                const locationHeader = row.querySelector('th.fixed-column');
                if (locationHeader) {
                    const locationName = locationHeader.dataset.location;
                    // Vypočítame offset relatívny k top matchesContainer
                    locationRowTopOffsets.set(locationName, locationHeader.getBoundingClientRect().top - matchesContainerRect.top);
                }
            });

            const timeColumnLeftOffsets = new Map(); // date -> pole {hour, leftOffset relatívny k matchesContainer}
            // Získame offset pre prvý stĺpec s časmi (prvý <th> okrem fixed-column)
            const firstTimeHeader = scheduleTable.querySelector('thead th:not(.fixed-column)');
            if (firstTimeHeader) {
                // Vypočítame offset relatívny k left matchesContainer
                // let currentColumnLeft = firstTimeHeader.getBoundingClientRect().left - matchesContainerRect.left; // Táto premenná sa už nepoužíva priamo, ale je súčasťou výpočtu nižšie.
                
                sortedDates.forEach(date => {
                    const dateHeader = scheduleTable.querySelector(`th[data-date="${date}"]`);
                    if (dateHeader) {
                        const timeSpans = dateHeader.querySelectorAll('.schedule-times-row span');
                        const hourOffsets = [];
                        const range = dailyTimeRanges.get(date);
                        const firstHourInDay = range ? range.minHour : 0;

                        timeSpans.forEach((span, index) => {
                            const hour = firstHourInDay + index; // Hodina na základe jej pozície v zozname spanov
                            hourOffsets.push({
                                hour: hour,
                                // Vypočítame ľavú pozíciu relatívnu k left matchesContainer
                                left: (dateHeader.getBoundingClientRect().left - matchesContainerRect.left) + (index * CELL_WIDTH_PX)
                            });
                        });
                        timeColumnLeftOffsets.set(date, hourOffsets);
                    }
                });
            }

            // Vykreslíme autobusy ako globálne SVG
            allBuses.forEach(bus => {
                const startLocation = bus.startLocation;
                const endLocation = bus.endLocation;
                const date = bus.date;

                let busStartY, busEndY;
                const startLocationTop = locationRowTopOffsets.get(startLocation);
                const endLocationTop = locationRowTopOffsets.get(endLocation);

                if (startLocationTop === undefined || endLocationTop === undefined) {
                    console.warn(`Nenašiel som pozíciu pre začiatok alebo koniec trasy autobusu: ${bus.busName} (${startLocation} -> ${endLocation})`);
                    return;
                }

                // Logika pre smer vykresľovania autobusu (zostáva rovnaká)
                if (startLocationTop <= endLocationTop) {
                    busStartY = startLocationTop;
                    busEndY = endLocationTop + ITEM_HEIGHT_PX;
                } else {
                    busStartY = startLocationTop + ITEM_HEIGHT_PX;
                    busEndY = endLocationTop;
                }

                const [startH, startM] = bus.startTime.split(':').map(Number);
                const [endH, endM] = bus.endTime.split(':').map(Number);

                const startTimeInMinutes = startH * 60 + startM;
                let endTimeInMinutes = endH * 60 + endM;
                if (endTimeInMinutes < startTimeInMinutes) {
                    endTimeInMinutes += 24 * 60; // Spracovanie prechodu cez polnoc
                }

                const durationInMinutes = endTimeInMinutes - startTimeInMinutes;

                const dateHours = timeColumnLeftOffsets.get(date);
                if (!dateHours || dateHours.length === 0) {
                    console.warn(`Nenašiel som časové stĺpce pre dátum: ${date}`);
                    return;
                }

                let busLeftPx = 0;
                const range = dailyTimeRanges.get(date);
                const firstHourOfDate = range ? range.minHour : 0;
                
                const firstHourDataForDate = dateHours.find(h => h.hour === firstHourOfDate);
                if (firstHourDataForDate) {
                    busLeftPx = firstHourDataForDate.left + ((startTimeInMinutes - (firstHourOfDate * 60)) * PIXELS_PER_MINUTE);
                } else {
                    console.warn(`Nepodarilo sa nájsť špecifické údaje o hodine pre dátum ${date} a hodinu ${firstHourOfDate}. Používam prvé dostupné.`);
                    busLeftPx = dateHours[0].left + ((startTimeInMinutes - (dateHours[0].hour * 60)) * PIXELS_PER_MINUTE);
                }

                const busWidthPx = (durationInMinutes * PIXELS_PER_MINUTE) / 2; // Polovičná šírka autobusu
                const slantOffset = 30; 

                const svgWidth = busWidthPx + Math.abs(slantOffset);
                const svgHeight = Math.abs(busEndY - busStartY);

                let points;
                let svgLeftOffset = 0;

                if (startLocationTop <= endLocationTop) {
                    points = `0,0 ${busWidthPx},0 ${svgWidth},${svgHeight} ${slantOffset},${svgHeight}`.trim();
                    svgLeftOffset = 0;
                } else {
                    points = `${slantOffset},0 ${svgWidth},0 ${busWidthPx},${svgHeight} 0,${svgHeight}`.trim();
                    svgLeftOffset = slantOffset;
                }

                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgElement.setAttribute("class", "bus-svg");
                svgElement.setAttribute("width", svgWidth);
                svgElement.setAttribute("height", svgHeight);
                svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                svgElement.style.cssText = `
                    position: absolute;
                    left: ${busLeftPx - svgLeftOffset}px;
                    top: ${Math.min(busStartY, busEndY)}px;
                    pointer-events: all;
                `;
                svgElement.dataset.id = bus.id;
                svgElement.dataset.type = bus.type;

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("class", "schedule-bus-polygon");
                polygon.setAttribute("points", points);
                svgElement.appendChild(polygon);

                const textYBase = svgHeight / 2; 
                const textXBase = svgWidth / 2; 

                const busNameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busNameText.setAttribute("class", "schedule-bus-text");
                busNameText.setAttribute("x", textXBase);
                busNameText.setAttribute("y", textYBase - 20);
                busNameText.setAttribute("text-anchor", "middle");
                busNameText.setAttribute("dominant-baseline", "middle");
                busNameText.textContent = bus.busName;
                svgElement.appendChild(busNameText);

                const busRouteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busRouteText.setAttribute("class", "schedule-bus-route-text");
                busRouteText.setAttribute("x", textXBase);
                busRouteText.setAttribute("y", textYBase);
                busRouteText.setAttribute("text-anchor", "middle");
                busRouteText.setAttribute("dominant-baseline", "middle");
                busRouteText.textContent = `${bus.startLocation} → ${bus.endLocation}`;
                svgElement.appendChild(busRouteText);

                const busTimeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busTimeText.setAttribute("class", "schedule-bus-time-text");
                busTimeText.setAttribute("x", textXBase);
                busTimeText.setAttribute("y", textYBase + 20);
                busTimeText.setAttribute("text-anchor", "middle");
                busTimeText.setAttribute("dominant-baseline", "middle");
                busTimeText.textContent = `${bus.startTime} - ${bus.endTime}`;
                svgElement.appendChild(busTimeText);

                if (bus.notes) {
                    const busNotesText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    busNotesText.setAttribute("class", "schedule-bus-notes-text");
                    busNotesText.setAttribute("x", textXBase);
                    busNotesText.setAttribute("y", textYBase + 40);
                    busNotesText.setAttribute("text-anchor", "middle");
                    busNotesText.setAttribute("dominant-baseline", "middle");
                    busNotesText.textContent = bus.notes;
                    svgElement.appendChild(busNotesText);
                }

                busOverlayContainer.appendChild(svgElement);
            });

            // Pridanie event listenerov pre kliknutie na zápas/autobus pre úpravu
            matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Použiť currentTarget pre div
                    editMatch(id);
                });
            });

            // Event listener pre autobusy je teraz na SVG elemente
            busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Použiť currentTarget pre SVG
                    editBus(id);
                });
            });

            // Pôvodné event listenery pre hlavičky zostávajú
            matchesContainer.querySelectorAll('.delete-date-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    if (event.target === header || event.target.closest('.delete-date-header') === header) {
                        const dateToDelete = header.dataset.date;
                        deletePlayingDay(dateToDelete);
                    }
                });
            });
            matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
                header.addEventListener('click', (event) => {
                    // Skontrolujte, či kliknutý element je odkaz alebo je vo vnútri odkazu
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return; // Nerobte nič, ak bol kliknutý odkaz
                    }
                    // Ak to nie je odkaz a kliknutie je na samotnej hlavičke alebo div s názvom haly, pokračujte s mazaním
                    if (event.target === header || event.target.closest('.hall-name')) { 
                        const locationToDelete = header.dataset.location;
                        deleteSportHall(locationToDelete);
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
                    // Ak je autobusová linka rovnaká ako tá, ktorá už bola vymazaná cez startLocation,
                    // batch.delete sa o to postará, ale pre istotu môžeme pridať kontrolu
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
                // Opravená chyba: matchData.data.location na matchData.location
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

                // Zobrazenie tlačidla Vymazať v modale
                deleteMatchButtonModal.style.display = 'inline-block';
                deleteMatchButtonModal.onclick = () => deleteMatch(matchId);

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
                closeModal(matchModal); // Zatvorí modal po vymazaní
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

                // Zobrazenie tlačidla Vymazať v modale
                deleteBusButtonModal.style.display = 'inline-block';
                deleteBusButtonModal.onclick = () => deleteBus(busId);

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
                closeModal(busModal); // Zatvorí modal po vymazaní
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
        deleteMatchButtonModal.style.display = 'none'; // Skryť tlačidlo Vymazať pri pridávaní
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
        deleteBusButtonModal.style.display = 'none'; // Skryť tlačidlo Vymazať pri pridávaní
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
            let groupData = null; // Inicializácia groupData
            if (groupDoc.exists()) {
                groupData = groupDoc.data(); // Priradenie dát, ak dokument existuje
            }
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
