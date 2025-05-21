import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, sportHallsCollectionRef, busesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch } from './spravca-turnaja-common.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loggedInUsername = localStorage.getItem('username');
    if (!loggedInUsername || loggedInUsername !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    const categoriesContentSection = document.getElementById('categoriesContentSection');
    const addButton = document.getElementById('addButton');
    const addOptions = document.getElementById('addOptions'); // Correctly get the dropdown reference
    const addPlayingDayButton = document.getElementById('addPlayingDayButton');
    const addSportHallButton = document.getElementById('addSportHallButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton'); // NEW: Button to add bus

    // Match modal window
    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime'); // NEW: Input for buffer time
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal'); // NEW: Delete button in modal

    // Playing day modal window
    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayDateInput = document.getElementById('playingDayDate');

    // Sport hall modal window
    const sportHallModal = document.getElementById('sportHallModal');
    const closeSportHallModalButton = document.getElementById('closeSportHallModal');
    const sportHallForm = document.getElementById('sportHallForm');
    const hallNameInput = document.getElementById('hallName');
    const hallAddressInput = document.getElementById('hallAddress');
    const hallGoogleMapsUrlInput = document.getElementById('hallGoogleMapsUrl');

    // NEW: Bus modal window
    const busModal = document.getElementById('busModal');
    const closeBusModalButton = document.getElementById('closeBusModal');
    const busForm = document.getElementById('busForm');
    const busIdInput = document.getElementById('busId');
    const busModalTitle = document.getElementById('busModalTitle');
    const busNameInput = document.getElementById('busNameInput');
    const busDateSelect = document.getElementById('busDateSelect');
    const busStartLocationSelect = document.getElementById('busStartLocationSelect');
    const busStartTimeInput = document.getElementById('busStartTimeInput');
    const busEndLocationSelect = document.getElementById('busEndLocationSelect'); // Corrected line
    const busEndTimeInput = document.getElementById('busEndTimeInput');
    const busNotesInput = document.getElementById('busNotesInput');
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal'); // NEW: Delete button in modal


    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // --- Functions for populating select boxes ---
    async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
        selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
        try {
            const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            querySnapshot.forEach((doc) => {
                const day = doc.data();
                const option = document.createElement('option');
                option.value = day.date; // Store date as value
                
                const dateObj = new Date(day.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
                option.textContent = formattedDate; // Display formatted date
                
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
                option.value = hall.name; // Store hall name as value
                option.textContent = hall.name; // Display hall name
                selectElement.appendChild(option);
            });
            if (selectedHallName) {
                selectElement.value = selectedHallName;
            }
        } catch (error) {
            console.error("Error loading sport halls: ", error);
        }
    }
    // --- End of functions for populating select boxes ---


    // --- Function to load and display matches and buses as a schedule ---
    async function displayMatchesAsSchedule() {
        if (!matchesContainer) return;

        // Clear matchesContainer and busOverlayContainer before re-rendering
        matchesContainer.innerHTML = '';
        const busOverlayContainer = document.createElement('div');
        busOverlayContainer.id = 'busOverlayContainer';
        busOverlayContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
        matchesContainer.appendChild(busOverlayContainer);

        matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');
        
        // Define constants for calculating positions and dimensions
        const CELL_WIDTH_PX = 350;
        const MINUTES_PER_HOUR = 60;
        const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
        const ITEM_HEIGHT_PX = 140; 

        try {
            // Load matches
            const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
            const matchesSnapshot = await getDocs(matchesQuery);
            const allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

            // Load buses
            const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
            const busesSnapshot = await getDocs(busesQuery);
            const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));

            // Combine all events (matches and buses)
            const allEvents = [...allMatches, ...allBuses];

            // Get playing days and sport halls for table headers
            const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
            const sportHallsSnapshot = await getDocs(query(sportHallsCollectionRef, orderBy("name", "asc")));

            const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
            // Get complete hall data for displaying address and URL
            const existingSportHallsData = sportHallsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const existingSportHallsNames = existingSportHallsData.map(hall => hall.name);


            // Combine unique locations and dates from all events
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
                        endTimeInMinutes += 24 * 60; // Crossing midnight
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

            // Remove "Loading tournament logistics..."
            matchesContainer.innerHTML = ''; 
            matchesContainer.appendChild(busOverlayContainer); // Ensure busOverlayContainer is first

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
                // Find complete hall data by name
                const hallData = existingSportHallsData.find(hall => hall.name === locationName);
                // If a location name in sortedLocations does not correspond to an active sport hall, skip this row.
                // This handles cases where a hall might have been deleted but events still reference it.
                if (!hallData) {
                    console.warn(`Skipping row for location "${locationName}" as it is not an active sport hall.`);
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

                    // Filter matches for this specific cell
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

            // Append the table to the DOM
            matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

            // Get references to the table and its elements after it's in the DOM
            const scheduleTable = matchesContainer.querySelector('.match-schedule-table');
            // const busOverlayContainer = matchesContainer.querySelector('#busOverlayContainer'); // Already created at the beginning of the function

            // Calculate global pixel offsets for locations and times
            const matchesContainerRect = matchesContainer.getBoundingClientRect();
            const tableRect = scheduleTable.getBoundingClientRect();

            const locationRowTopOffsets = new Map(); // locationName -> global top pixel offset relative to matchesContainer
            scheduleTable.querySelectorAll('tbody tr').forEach(row => {
                const locationHeader = row.querySelector('th.fixed-column');
                if (locationHeader) {
                    const locationName = locationHeader.dataset.location;
                    locationRowTopOffsets.set(locationName, locationHeader.getBoundingClientRect().top - matchesContainerRect.top);
                }
            });

            const timeColumnLeftOffsets = new Map(); // date -> array of {hour, leftOffset relative to matchesContainer}
            // Get offset for the first time column (first <th> excluding fixed-column)
            const firstTimeHeader = scheduleTable.querySelector('thead th:not(.fixed-column)');
            let initialTimeColumnLeftOffset = 0;
            if (firstTimeHeader) {
                initialTimeColumnLeftOffset = firstTimeHeader.getBoundingClientRect().left - matchesContainerRect.left;
            }

            sortedDates.forEach(date => {
                const dateHeader = scheduleTable.querySelector(`th[data-date="${date}"]`);
                if (dateHeader) {
                    const timeSpans = dateHeader.querySelectorAll('.schedule-times-row span');
                    const hourOffsets = [];
                    let currentColumnLeft = dateHeader.getBoundingClientRect().left - matchesContainerRect.left; // Left of the date header
                    const range = dailyTimeRanges.get(date);
                    const firstHourInDay = range ? range.minHour : 0;

                    timeSpans.forEach((span, index) => {
                        const hour = firstHourInDay + index; // Hour based on its position in the span list
                        hourOffsets.push({
                            hour: hour,
                            left: currentColumnLeft + (index * CELL_WIDTH_PX)
                        });
                    });
                    timeColumnLeftOffsets.set(date, hourOffsets);
                }
            });

            // Render buses as global SVGs
            allBuses.forEach(bus => {
                const startLocation = bus.startLocation;
                const endLocation = bus.endLocation;
                const date = bus.date;

                let busStartY, busEndY;
                const startLocationTop = locationRowTopOffsets.get(startLocation);
                const endLocationTop = locationRowTopOffsets.get(endLocation);

                if (startLocationTop === undefined || endLocationTop === undefined) {
                    console.warn(`Could not find position for bus route start or end: ${bus.busName} (${startLocation} -> ${endLocation})`);
                    return;
                }

                // Logic for bus rendering direction
                if (startLocationTop <= endLocationTop) {
                    // Start hall is above or in the same row as end hall
                    busStartY = startLocationTop; // Starts at the top edge of the start row
                    busEndY = endLocationTop + ITEM_HEIGHT_PX; // Ends at the bottom edge of the end row
                } else {
                    // Start hall is below end hall
                    busStartY = startLocationTop + ITEM_HEIGHT_PX; // Starts at the bottom edge of the start row
                    busEndY = endLocationTop; // Ends at the top edge of the end row
                }


                const [startH, startM] = bus.startTime.split(':').map(Number);
                const [endH, endM] = bus.endTime.split(':').map(Number);

                const startTimeInMinutes = startH * 60 + startM;
                let endTimeInMinutes = endH * 60 + endM;
                if (endTimeInMinutes < startTimeInMinutes) {
                    endTimeInMinutes += 24 * 60; // Handle overnight routes
                }

                const durationInMinutes = endTimeInMinutes - startTimeInMinutes;

                const dateHours = timeColumnLeftOffsets.get(date);
                if (!dateHours || dateHours.length === 0) {
                    console.warn(`Could not find time columns for date: ${date}`);
                    return;
                }

                // Find the left pixel offset for the start time
                let busLeftPx = 0;
                const range = dailyTimeRanges.get(date);
                const firstHourOfDate = range ? range.minHour : 0;
                
                // Calculate busLeftPx relative to the start of the first hour of the day
                const firstHourDataForDate = dateHours.find(h => h.hour === firstHourOfDate);
                if (firstHourDataForDate) {
                    busLeftPx = firstHourDataForDate.left + ((startTimeInMinutes - (firstHourOfDate * 60)) * PIXELS_PER_MINUTE);
                } else {
                    // Fallback if the specific hour data is not found (shouldn't happen if logic is correct)
                    console.warn(`Could not find specific hour data for date ${date} and hour ${firstHourOfDate}. Using first available.`);
                    busLeftPx = dateHours[0].left + ((startTimeInMinutes - (dateHours[0].hour * 60)) * PIXELS_PER_MINUTE);
                }


                const busWidthPx = (durationInMinutes * PIXELS_PER_MINUTE) / 2; // CHANGED: Half bus width

                // Slant parameters
                const slantOffset = 30; // How much the bottom points are shifted horizontally compared to top points

                // Points for the parallelogram (relative to SVG's viewBox)
                // (0,0) is top-left of the SVG container
                const svgWidth = busWidthPx + Math.abs(slantOffset); // SVG needs to be wider to contain the slant
                const svgHeight = Math.abs(busEndY - busStartY); // SVG height is absolute value of Y coordinate difference

                // Points are relative to the SVG's own coordinate system (0,0 to svgWidth, svgHeight)
                let points;
                let svgLeftOffset = 0; // Default no additional offset

                if (startLocationTop <= endLocationTop) {
                    // Direction top-down (or within the same row)
                    // To reverse the slant, use points that were originally for bottom-up direction
                    points = `
                        0,0
                        ${busWidthPx},0
                        ${svgWidth},${svgHeight}
                        ${slantOffset},${svgHeight}
                    `.trim();
                    svgLeftOffset = 0; // Polygon starts at x=0, so no offset
                } else {
                    // Direction bottom-up
                    // To reverse the slant, use points that were originally for top-down direction
                    points = `
                        ${slantOffset},0
                        ${svgWidth},0
                        ${busWidthPx},${svgHeight}
                        0,${svgHeight}
                    `.trim();
                    svgLeftOffset = slantOffset; // SVG needs to be shifted left by slantOffset
                }


                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svgElement.setAttribute("class", "bus-svg");
                svgElement.setAttribute("width", svgWidth);
                svgElement.setAttribute("height", svgHeight);
                svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
                svgElement.style.cssText = `
                    position: absolute;
                    left: ${busLeftPx - svgLeftOffset}px; /* Adjust left position based on slant direction */
                    top: ${Math.min(busStartY, busEndY)}px; /* Use minimum for correct SVG placement */
                    pointer-events: all; /* Enable clicking on SVG */
                `;
                svgElement.dataset.id = bus.id;
                svgElement.dataset.type = bus.type;

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("class", "schedule-bus-polygon");
                polygon.setAttribute("points", points);
                svgElement.appendChild(polygon);

                // Add text elements - RETURNED TO SVG
                const textYBase = svgHeight / 2; 
                const textXBase = svgWidth / 2; // Center of the SVG viewBox

                const busNameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busNameText.setAttribute("class", "schedule-bus-text");
                busNameText.setAttribute("x", textXBase);
                busNameText.setAttribute("y", textYBase - 20); // Adjust Y for stacking
                busNameText.setAttribute("text-anchor", "middle");
                busNameText.setAttribute("dominant-baseline", "middle");
                busNameText.textContent = bus.busName;
                svgElement.appendChild(busNameText);

                const busRouteText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busRouteText.setAttribute("class", "schedule-bus-route-text");
                busRouteText.setAttribute("x", textXBase);
                busRouteText.setAttribute("y", textYBase); // Adjust Y for stacking
                busRouteText.setAttribute("text-anchor", "middle");
                busRouteText.setAttribute("dominant-baseline", "middle");
                busRouteText.textContent = `${bus.startLocation} → ${bus.endLocation}`;
                svgElement.appendChild(busRouteText);

                const busTimeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                busTimeText.setAttribute("class", "schedule-bus-time-text");
                busTimeText.setAttribute("x", textXBase);
                busTimeText.setAttribute("y", textYBase + 20); // Adjust Y for stacking
                busTimeText.setAttribute("text-anchor", "middle");
                busTimeText.setAttribute("dominant-baseline", "middle");
                busTimeText.textContent = `${bus.startTime} - ${bus.endTime}`;
                svgElement.appendChild(busTimeText);

                if (bus.notes) {
                    const busNotesText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    busNotesText.setAttribute("class", "schedule-bus-notes-text");
                    busNotesText.setAttribute("x", textXBase);
                    busNotesText.setAttribute("y", textYBase + 40); // Adjust Y for stacking
                    busNotesText.setAttribute("text-anchor", "middle");
                    busNotesText.setAttribute("dominant-baseline", "middle");
                    busNotesText.textContent = bus.notes;
                    svgElement.appendChild(busNotesText);
                }

                busOverlayContainer.appendChild(svgElement);
            });

            // Add event listeners for clicking on match/bus for editing
            matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Use currentTarget for div
                    editMatch(id);
                });
            });

            // Event listener for buses is now on the SVG element
            busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
                element.addEventListener('click', (event) => {
                    const id = event.currentTarget.dataset.id; // Use currentTarget for SVG
                    editBus(id);
                });
            });

            // Original event listeners for headers remain
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
                    // Check if the clicked element is the link or inside the link
                    if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                        return; // Do nothing if the link was clicked
                    }
                    // If it's not the link, and the click is on the header itself or the hall name div, proceed with deletion
                    if (event.target === header || event.target.closest('.hall-name')) { 
                        const locationToDelete = header.dataset.location;
                        deleteSportHall(locationToDelete);
                    }
                });
            });

        } catch (error) {
            console.error("Error loading match schedule: ", error);
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
                    console.warn(`Playing day ${dateToDelete} not found, but proceeding with deleting matches and buses.`);
                }

                // Delete related matches
                const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // NEW: Delete related buses
                const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
                const busesSnapshot = await getDocs(busesQuery);
                busesSnapshot.docs.forEach(busDoc => {
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                await batch.commit();
                alert(`Playing day ${dateToDelete} and all related matches and bus routes have been successfully deleted!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Error deleting playing day ${dateToDelete}: `, error);
                alert(`Error deleting playing day ${dateToDelete}. Check console for details.`);
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
                    console.warn(`Sport hall ${hallNameToDelete} not found, but proceeding with deleting matches and buses.`);
                }

                // Delete related matches
                const matchesQuery = query(matchesCollectionRef, where("location", "==", hallNameToDelete));
                const matchesSnapshot = await getDocs(matchesQuery);
                matchesSnapshot.docs.forEach(matchDoc => {
                    batch.delete(doc(matchesCollectionRef, matchDoc.id));
                });

                // NEW: Delete related buses (starting or ending at the hall)
                const busesStartQuery = query(busesCollectionRef, where("startLocation", "==", hallNameToDelete));
                const busesStartSnapshot = await getDocs(busesStartQuery);
                busesStartSnapshot.docs.forEach(busDoc => {
                    // If the bus route is the same as one already deleted via startLocation,
                    // batch.delete will handle it, but we can add a check for safety
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });

                const busesEndQuery = query(busesCollectionRef, where("endLocation", "==", hallNameToDelete));
                const busesEndSnapshot = await getDocs(busesEndQuery);
                busesEndSnapshot.docs.forEach(busDoc => {
                    // If the bus route is the same as one already deleted via startLocation,
                    // batch.delete will handle it, but we can add a check for safety
                    batch.delete(doc(busesCollectionRef, busDoc.id));
                });


                await batch.commit();
                alert(`Sport hall ${hallNameToDelete} and all related matches and bus routes have been successfully deleted!`);
                await displayMatchesAsSchedule();
            } catch (error) {
                console.error(`Error deleting sport hall ${hallNameToDelete}: `, error);
                alert(`Error deleting sport hall ${hallNameToDelete}. Check console for details.`);
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
                // Fixed bug: matchData.data.location to matchData.location
                await populateSportHallsSelect(matchLocationSelect, matchData.location);

                matchStartTimeInput.value = matchData.startTime || '';
                matchDurationInput.value = matchData.duration || 60;
                matchBufferTimeInput.value = matchData.bufferTime || 5; // Load buffer time

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

                // Show Delete button in modal
                deleteMatchButtonModal.style.display = 'inline-block';
                deleteMatchButtonModal.onclick = () => deleteMatch(matchId);

                openModal(matchModal);
            } else {
                alert("Match not found.");
            }
        } catch (error) {
            console.error("Error loading match data for editing: ", error);
            alert("An error occurred while loading match data. Please try again.");
        }
    }

    async function deleteMatch(matchId) {
        if (confirm('Naozaj chcete vymazať tento zápas?')) {
            try {
                await deleteDoc(doc(matchesCollectionRef, matchId));
                alert('Match successfully deleted!');
                closeModal(matchModal); // Close modal after deletion
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Error deleting match: ", error);
                alert("Error deleting match. Check console for details.");
            }
        }
    }

    // NEW: Functions for editing and deleting bus
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

                // Show Delete button in modal
                deleteBusButtonModal.style.display = 'inline-block';
                deleteBusButtonModal.onclick = () => deleteBus(busId);

                openModal(busModal);
            } else {
                alert("Bus route not found.");
            }
        } catch (error) {
            console.error("Error loading bus data for editing: ", error);
            alert("An error occurred while loading bus data. Please try again.");
        }
    }

    async function deleteBus(busId) {
        if (confirm('Naozaj chcete vymazať túto autobusovú linku?')) {
            try {
                await deleteDoc(doc(busesCollectionRef, busId));
                alert('Bus route successfully deleted!');
                closeModal(busModal); // Close modal after deletion
                displayMatchesAsSchedule();
            } catch (error) {
                console.error("Error deleting bus route: ", error);
                alert("Error deleting bus route. Check console for details.");
            }
        }
    }

    await displayMatchesAsSchedule();


    // --- Logic for '+' button and dropdown ---
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent immediate closing of dropdown by clicking the button
        addOptions.classList.toggle('show'); // Toggle 'show' class
    });

    // Hide dropdown if clicked outside of it or its options
    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        openModal(playingDayModal);
        addOptions.classList.remove('show'); // Hide dropdown after selection
    });

    addSportHallButton.addEventListener('click', () => {
        sportHallForm.reset();
        openModal(sportHallModal);
        addOptions.classList.remove('show'); // Hide dropdown after selection
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
        matchBufferTimeInput.value = 5; // Default value 5 minutes for buffer time
        deleteMatchButtonModal.style.display = 'none'; // Hide Delete button when adding
        openModal(matchModal);
        addOptions.classList.remove('show'); // Hide dropdown after selection
    });

    // NEW: Event listener for Add Bus button
    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        await populatePlayingDaysSelect(busDateSelect);
        await populateSportHallsSelect(busStartLocationSelect);
        await populateSportHallsSelect(busEndLocationSelect);
        deleteBusButtonModal.style.display = 'none'; // Hide Delete button when adding
        openModal(busModal);
        addOptions.classList.remove('show'); // Hide dropdown after selection
    });

    // --- Closing modal windows ---
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

    // NEW: Closing bus modal window
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
            let groupData = null; // Initialize groupData
            if (groupDoc.exists()) {
                groupData = groupDoc.data(); // Assign data if document exists
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
                console.warn(`Team with number ${teamNumber} in category ${categoryId} and group ${groupId} not found. Using fallback: "${clubName}"`);
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
            console.error("Error getting team name: ", error);
            return { fullDisplayName: `Error`, clubName: `Error`, clubId: null };
        }
    };

    // --- Event Listener for MATCH form ---
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
        const matchBufferTime = parseInt(matchBufferTimeInput.value); // Get buffer time value


        const currentMatchId = matchIdInput.value;

        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocation || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            alert('Please fill in all required fields (Category, Group, Team 1 and 2 ordinal number, Date, Location, Start time, Duration, Buffer time).');
            return;
        }

        if (team1Number === team2Number) {
            alert('Teams cannot play against themselves. Please enter different team ordinal numbers.');
            return;
        }

        let team1Result = null;
        let team2Result = null;

        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number);
        } catch (error) {
            console.error("Error getting team names:", error);
            alert("An error occurred while getting team names. Please try again.");
            return;
        }

        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            alert('One or both teams not found. Check ordinal numbers in the given category and group.');
            return;
        }

        // --- CHECK: Overlapping times in the same hall and day (including buffer time) ---
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

                // If editing an existing match, skip it when checking for overlap
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

                alert(`The match overlaps with an existing match in hall "${matchLocation}" on ${matchDate}:\n\n` +
                      `Existing match: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Teams: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Please adjust the start time or duration of the new match, or the buffer time.`);
                return; 
            }
        } catch (error) {
            console.error("Error checking for overlapping matches: ", error);
            alert("An error occurred while checking for overlapping matches. Please try again.");
            return;
        }
        // --- END OF OVERLAP CHECK ---


        // --- CHECK: Teams in the same category and group cannot play against each other multiple times ---
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
                    `A match between teams ${team1Result.fullDisplayName} and ${team2Result.fullDisplayName} already exists in this category and group. ` +
                    `Do you want to delete the existing match and replace it with the new one?`
                );
                if (confirmDelete) {
                    await deleteDoc(doc(matchesCollectionRef, existingMatchIdForTeams));
                    console.log(`Existing match ${existingMatchIdForTeams} was deleted.`);
                } else {
                    alert('Operation cancelled. Match was not added or deleted.');
                    closeModal(matchModal);
                    return;
                }
            }

        } catch (error) {
            console.error("Error checking or deleting existing match (teams):", error);
            alert("An error occurred while checking or deleting existing match (teams). Please try again.");
            return;
        }
        // --- END OF TEAMS CHECK ---


        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime, // Save buffer time
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

        console.log('Match data to save:', matchData);

        try {
            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                alert('Match successfully updated!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                alert('New match successfully added!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Error saving match: ", error);
            alert("Error saving match. Check console for details.");
        }
    });


    // --- NEW: Event Listener for BUS form ---
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
            alert('Please fill in all required fields (Bus Name, Date, Start Location, Departure Time, Destination, Arrival Time).');
            return;
        }

        // Check if start and end locations are the same
        if (busStartLocation === busEndLocation) {
            alert('Start location and destination cannot be the same. Please choose different locations.');
            return;
        }

        // Check if arrival time is before departure time (if on the same day)
        const [startH, startM] = busStartTime.split(':').map(Number);
        const [endH, endM] = busEndTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        // If arrival time is less than departure time, assume it's the next day
        if (endTimeInMinutes < startTimeInMinutes) {
            // This is fine if it crosses midnight, but must not be an overlap within the day
            // For duration calculation and overlap checking, add 24 hours
            endTimeInMinutes += 24 * 60; 
        }

        const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
        if (durationInMinutes <= 0) {
            alert('Arrival time must be after departure time.');
            return;
        }


        // --- CHECK: Overlapping bus routes for the same bus ---
        try {
            const existingBusesQuery = query(
                busesCollectionRef,
                where("date", "==", busDate),
                where("busName", "==", busName) // Check for specific bus
            );
            const existingBusesSnapshot = await getDocs(existingBusesQuery);

            let overlapFound = false;
            let overlappingBusDetails = null;

            existingBusesSnapshot.docs.forEach(doc => {
                const existingBus = doc.data();
                const existingBusId = doc.id;

                // If editing an existing bus, skip it when checking for overlap
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

                // Overlap check: (new starts before existing ends AND new ends after existing starts)
                if (startTimeInMinutes < existingBusEndInMinutes && endTimeInMinutes > existingBusStartInMinutes) {
                    overlapFound = true;
                    overlappingBusDetails = existingBus;
                    return; 
                }
            });

            if (overlapFound) {
                alert(`Bus "${busName}" overlaps with an existing route on ${busDate}:\n\n` +
                      `Existing route: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation} -> ${overlappingBusDetails.endLocation})\n\n` +
                      `Please adjust the departure or arrival time of the new route.`);
                return; 
            }
        } catch (error) {
            console.error("Error checking for overlapping bus routes: ", error);
            alert("An error occurred while checking for overlapping bus routes. Please try again.");
            return;
        }
        // --- END OF BUS OVERLAP CHECK ---


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

        console.log('Bus data to save:', busData);

        try {
            if (currentBusId) {
                await setDoc(doc(busesCollectionRef, currentBusId), busData, { merge: true });
                alert('Bus route successfully updated!');
            } else {
                await addDoc(busesCollectionRef, busData);
                alert('New bus route successfully added!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Error saving bus route: ", error);
            alert("Error saving bus route. Check console for details.");
        }
    });


    // --- Event Listener for PLAYING DAY form ---
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = playingDayDateInput.value;

        if (!date) {
            alert('Please enter a playing day date.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Playing day with this date already exists!');
                return;
            }

            await addDoc(playingDaysCollectionRef, {
                date: date,
                createdAt: new Date()
            });
            alert('Playing day successfully added!');
            closeModal(playingDayModal);
            await displayMatchesAsSchedule(); // Update schedule
        } catch (error) {
            console.error("Error saving playing day: ", error);
            alert("Error saving playing day. Check console for details.");
        }
    });

    // --- Event Listener for SPORT HALL form ---
    sportHallForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = hallNameInput.value.trim();
        const address = hallAddressInput.value.trim();
        const googleMapsUrl = hallGoogleMapsUrlInput.value.trim();

        if (!name || !address || !googleMapsUrl) {
            alert('Please fill in all fields (Hall Name, Address, Google Maps Link).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validate URL format
        } catch (_) {
            alert('Google Maps link must be a valid URL.');
            return;
        }

        try {
            const q = query(sportHallsCollectionRef, where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                alert('Sport hall with this name already exists!');
                return;
            }

            await addDoc(sportHallsCollectionRef, {
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            });
            alert('Sport hall successfully added!');
            closeModal(sportHallModal);
            await displayMatchesAsSchedule(); // Update schedule
        } catch (error) {
            console.error("Error saving sport hall: ", error);
            alert("Error saving sport hall. Check console for details.");
        }
    });
});
