import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, busesCollectionRef, teamAccommodationsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

/**
 * Populates a select element with playing days from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedDate=''] The date to pre-select.
 */
async function populatePlayingDaysSelect(selectElement, selectedDate = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte dátum --</option>';
    try {
        const querySnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        querySnapshot.forEach((doc) => {
            const day = doc.data();
            const option = document.createElement('option');
            option.value = day.date;            
            const dateObj = new Date(day.date);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`;
            option.textContent = formattedDate;            
            selectElement.appendChild(option);
        });
        if (selectedDate) {
            selectElement.value = selectedDate;
        }
    } catch (error) {
        console.error("Chyba pri načítaní hracích dní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní dátumov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with sport halls from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceName=''] The name of the place to pre-select.
 */
async function populateSportHallSelects(selectElement, selectedPlaceName = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto (športovú halu) --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Športová hala"), orderBy("name", "asc")));
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne športové haly nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const place = { id: doc.id, ...doc.data() };
                const option = document.createElement('option');
                option.value = place.name;
                option.textContent = `${place.name}`;
                selectElement.appendChild(option);
            });
        }
        if (selectedPlaceName) {
            selectElement.value = selectedPlaceName;
        }
    } catch (error) {
        console.error("Chyba pri načítaní hál:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní hál --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with all places (sport halls, catering, accommodation) from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedPlaceCombined=''] The combined value (name:::type) of the place to pre-select.
 */
async function populateAllPlaceSelects(selectElement, selectedPlaceCombined = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte miesto --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne miesta nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const place = { id: doc.id, ...doc.data() };
                const option = document.createElement('option');
                option.value = `${place.name}:::${place.type}`;
                option.textContent = `${place.name} (${place.type})`;
                selectElement.appendChild(option);
            });
        }
        if (selectedPlaceCombined) {
            selectElement.value = selectedPlaceCombined;
        }
    } catch (error) {
        console.error("Chyba pri načítaní miest:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní miest --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with unique base club names, excluding those already assigned for the selected date range.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedClubName=''] The club name to pre-select.
 */
async function populateClubSelect(selectElement, selectedClubName = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte klub --</option>';
    try {
        const clubsSnapshot = await getDocs(query(clubsCollectionRef, orderBy("name", "asc")));
        const allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const uniqueBaseClubNames = new Set();
        const clubToTeamIdsMap = new Map();

        allClubs.forEach(team => {
            let baseClubName;
            if (team.name.includes('⁄')) {
                baseClubName = team.name;
            } else {
                baseClubName = team.name.replace(/\s[A-Z]$/, '');
            }
            uniqueBaseClubNames.add(baseClubName);
            if (!clubToTeamIdsMap.has(baseClubName)) {
                clubToTeamIdsMap.set(baseClubName, []);
            }
            clubToTeamIdsMap.get(baseClubName).push(team.id);
        });

        const assignmentIdInput = document.getElementById('assignmentId');
        const assignmentDateFromSelect = document.getElementById('assignmentDateFromSelect');
        const assignmentDateToSelect = document.getElementById('assignmentDateToSelect');
        const currentAssignmentId = assignmentIdInput ? assignmentIdInput.value : '';
        const selectedDateFrom = assignmentDateFromSelect ? assignmentDateFromSelect.value : '';
        const selectedDateTo = assignmentDateToSelect ? assignmentDateToSelect.value : '';

        let clubsToExclude = new Set();

        if (selectedDateFrom && selectedDateTo) {
            const accommodationsSnapshot = await getDocs(teamAccommodationsCollectionRef);
            const assignedTeamIdsForDateRange = new Set();

            accommodationsSnapshot.docs.forEach(doc => {
                const assignment = doc.data();
                const assignmentId = doc.id;

                if (currentAssignmentId && currentAssignmentId === assignmentId) {
                    return;
                }

                const existingDateFrom = new Date(assignment.dateFrom);
                const existingDateTo = new Date(assignment.dateTo);
                const newDateFrom = new Date(selectedDateFrom);
                const newDateTo = new Date(selectedDateTo);

                if (newDateFrom <= existingDateTo && newDateTo >= existingDateFrom) {
                    assignment.teams.forEach(team => {
                        assignedTeamIdsForDateRange.add(team.teamId);
                    });
                }
            });

            for (const [baseClubName, teamIds] of clubToTeamIdsMap.entries()) {
                const allTeamsAssigned = teamIds.every(teamId => assignedTeamIdsForDateRange.has(teamId));
                if (allTeamsAssigned) {
                    clubsToExclude.add(baseClubName);
                }
            }
        }

        const sortedUniqueBaseClubNames = Array.from(uniqueBaseClubNames).sort();

        if (sortedUniqueBaseClubNames.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne kluby nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            sortedUniqueBaseClubNames.forEach(clubName => {
                if (!clubsToExclude.has(clubName) || selectedClubName === clubName) {
                    const option = document.createElement('option');
                    option.value = clubName;
                    option.textContent = clubName;
                    if (selectedClubName === clubName) {
                        option.selected = true;
                    }
                    selectElement.appendChild(option);
                }
            });
            if (selectedClubName && !selectElement.querySelector(`option[value="${selectedClubName}"]`)) {
                 const option = document.createElement('option');
                 option.value = selectedClubName;
                 option.textContent = selectedClubName;
                 option.selected = true;
                 selectElement.appendChild(option);
            }
        }
    } catch (error) {
        console.error("Chyba pri načítaní klubov:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní klubov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with specific teams for a given base club name.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} baseClubName The base name of the club to filter teams.
 * @param {string} [selectedTeamId=''] The ID of the team to pre-select.
 */
async function populateSpecificTeamSelect(selectElement, baseClubName, selectedTeamId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
    if (!baseClubName) {
        selectElement.disabled = true;
        return;
    }
    selectElement.disabled = false;
    try {
        const allTeamsSnapshot = await getDocs(clubsCollectionRef);
        let filteredTeams = [];

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => {
            groupsMap.set(doc.id, doc.data().name);
        });

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => {
            categoriesMap.set(doc.id, doc.data().name);
        });

        allTeamsSnapshot.forEach((doc) => {
            const team = { id: doc.id, ...doc.data() };
            
            if (baseClubName.includes('⁄')) {
                if (team.name === baseClubName) {
                    filteredTeams.push(team);
                }
            } else {
                if (team.name.match(new RegExp(`^${baseClubName}(?:\\s[A-Z])?$`))) {
                    filteredTeams.push(team);
                }
            }
        });

        const currentAssignmentId = document.getElementById('assignmentId').value;
        const selectedDateFrom = document.getElementById('assignmentDateFromSelect').value;
        const selectedDateTo = document.getElementById('assignmentDateToSelect').value;

        if (selectedDateFrom && selectedDateTo) {
            const assignedTeamsForDateRange = new Set();
            const accommodationsSnapshot = await getDocs(teamAccommodationsCollectionRef);

            accommodationsSnapshot.docs.forEach(doc => {
                const assignment = doc.data();
                const assignmentId = doc.id;

                if (currentAssignmentId && currentAssignmentId === assignmentId) {
                    return;
                }

                const existingDateFrom = new Date(assignment.dateFrom);
                const existingDateTo = new Date(assignment.dateTo);
                const newDateFrom = new Date(selectedDateFrom);
                const newDateTo = new Date(new Date(selectedDateTo).setHours(23, 59, 59, 999)); // Ensure end of day

                if (newDateFrom <= existingDateTo && newDateTo >= existingDateFrom) {
                    assignment.teams.forEach(team => {
                        assignedTeamsForDateRange.add(team.teamId);
                    });
                }
            });

            filteredTeams = filteredTeams.filter(team => !assignedTeamsForDateRange.has(team.id));
        }

        if (filteredTeams.length === 0 && !selectedTeamId) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `-- Žiadne dostupné tímy pre tento klub v danom rozsahu dátumov --`;
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            filteredTeams.sort((a, b) => {
                if (a.name < b.name) return -1;
                if (a.name > b.name) return 1;
                return 0;
            }).forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                const groupName = groupsMap.get(team.groupId) || team.groupId;
                const categoryName = categoriesMap.get(team.categoryId) || team.categoryId;
                option.textContent = `${team.name} (Kat: ${categoryName}, Skup: ${groupName})`;
                if (selectedTeamId === team.id) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Chyba pri načítaní tímov:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní tímov --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Populates a select element with accommodation places from Firestore.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 * @param {string} [selectedAccommodationId=''] The ID of the accommodation to pre-select.
 */
async function populateAccommodationSelect(selectElement, selectedAccommodationId = '') {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">-- Vyberte ubytovňu --</option>';
    try {
        const querySnapshot = await getDocs(query(placesCollectionRef, where("type", "==", "Ubytovanie"), orderBy("name", "asc")));
        if (querySnapshot.empty) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- Žiadne ubytovne nenájdené --';
            option.disabled = true;
            selectElement.appendChild(option);
        } else {
            querySnapshot.forEach((doc) => {
                const place = { id: doc.id, ...doc.data() };
                const option = document.createElement('option');
                option.value = place.id;
                option.textContent = place.name;
                if (selectedAccommodationId === place.id) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Chyba pri načítaní ubytovní:", error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Chyba pri načítaní ubytovní --';
        option.disabled = true;
        selectElement.appendChild(option);
    }
}

/**
 * Retrieves match duration and buffer time settings for a given category.
 * @param {string} categoryId The ID of the category.
 * @returns {Promise<{duration: number, bufferTime: number}>} The match settings.
 */
async function getCategoryMatchSettings(categoryId) {
    try {
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            const categorySettings = data.categoryMatchSettings && data.categoryMatchSettings[categoryId];
            if (categorySettings) {
                return {
                    duration: categorySettings.duration || 60,
                    bufferTime: categorySettings.bufferTime || 5
                };
            }
        }
    } catch (error) {
        console.error("Chyba pri načítaní nastavení kategórie:", error);
    }
    return { duration: 60, bufferTime: 5 };
}

/**
 * Updates the match duration and buffer time inputs based on the selected category.
 */
async function updateMatchDurationAndBuffer() {
    const selectedCategoryId = document.getElementById('matchCategory').value;
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');

    if (selectedCategoryId) {
        const settings = await getCategoryMatchSettings(selectedCategoryId);
        matchDurationInput.value = settings.duration;
        matchBufferTimeInput.value = settings.bufferTime;
    } else {
        matchDurationInput.value = 60;
        matchBufferTimeInput.value = 5;
    }
    findFirstAvailableTime();
}

/**
 * Finds the first available time slot for a match based on date, location, duration, and buffer time.
 */
async function findFirstAvailableTime() {
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchStartTimeInput = document.getElementById('matchStartTime');

    const selectedDate = matchDateSelect.value;
    const selectedLocationName = matchLocationSelect.value;
    const duration = parseInt(matchDurationInput.value) || 60;
    const bufferTime = parseInt(matchBufferTimeInput.value) || 5;

    if (!selectedDate || !selectedLocationName) {
        matchStartTimeInput.value = '';
        return;
    }

    try {
        const settingsDocRef = doc(settingsCollectionRef, SETTINGS_DOC_ID);
        const settingsDoc = await getDoc(settingsDocRef);
        let firstDayStartTime = '08:00';
        let otherDaysStartTime = '08:00';

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            firstDayStartTime = data.firstDayStartTime || '08:00';
            otherDaysStartTime = data.otherDaysStartTime || '08:00';
        }

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && selectedDate === sortedPlayingDays[0];

        let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
        const endSearchHour = 22;
        const intervalMinutes = 1;

        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", selectedDate),
            where("location", "==", selectedLocationName)
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

        const existingEvents = existingMatchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const [eventStartH, eventStartM] = data.startTime.split(':').map(Number);
            const startInMinutes = eventStartH * 60 + eventStartM;
            const endInMinutes = startInMinutes + (data.duration || 0) + (data.bufferTime || 0);
            return { start: startInMinutes, end: endInMinutes };
        });

        existingEvents.sort((a, b) => a.start - b.start);

        for (let hour = startH; hour <= endSearchHour; hour++) {
            const currentMinuteStart = (hour === startH) ? startM : 0;
            for (let minute = currentMinuteStart; minute < 60; minute += intervalMinutes) {
                const potentialStartInMinutes = hour * 60 + minute;
                const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                let overlap = false;
                for (const existingEvent of existingEvents) {
                    if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    const formattedHour = String(hour).padStart(2, '0');
                    const formattedMinute = String(minute).padStart(2, '0');
                    matchStartTimeInput.value = `${formattedHour}:${formattedMinute}`;
                    return;
                }
            }
        }
        matchStartTimeInput.value = '';
    } catch (error) {
        console.error("Chyba pri hľadaní prvého dostupného času:", error);
        matchStartTimeInput.value = '';
    }
}

/**
 * Gets the full display name and club information for a team.
 * @param {string} categoryId The ID of the category.
 * @param {string} groupId The ID of the group.
 * @param {number} teamNumber The order number of the team in the group.
 * @param {Map<string, string>} categoriesMap Map of category IDs to names.
 * @param {Map<string, string>} groupsMap Map of group IDs to names.
 * @returns {Promise<{fullDisplayName: string|null, clubName: string|null, clubId: string|null}>} Team display information.
 */
const getTeamName = async (categoryId, groupId, teamNumber, categoriesMap, groupsMap) => {
    if (!categoryId || !groupId || !teamNumber) {
        return { fullDisplayName: null, clubName: null, clubId: null };
    }
    try {
        const categoryName = categoriesMap.get(categoryId) || categoryId;
        const groupName = groupsMap.get(groupId) || groupId;

        let clubName = `Tím ${teamNumber}`;
        let clubId = null;

        // Still need to query clubs collection specifically for the team number within category/group
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
        console.error("Chyba pri získavaní názvu tímu:", error);
        return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null };
    }
};

/**
 * Displays the full match schedule including matches, buses, and accommodation assignments.
 */
async function displayMatchesAsSchedule() {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    matchesContainer.innerHTML = '';
    matchesContainer.insertAdjacentHTML('afterbegin', '<p>Načítavam logistiku turnaja...</p>');

    const CELL_WIDTH_PX = 350;
    const MINUTES_PER_HOUR = 60;
    const PIXELS_PER_MINUTE = CELL_WIDTH_PX / MINUTES_PER_HOUR;
    const ITEM_HEIGHT_PX = 140;

    try {
        // Fetch all data required for the schedule
        const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
        const matchesSnapshot = await getDocs(matchesQuery);
        let allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané zápasy:", allMatches);

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name || doc.id));
        console.log("displayMatchesAsSchedule: Načítané kategórie:", Array.from(categoriesMap.entries()));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));
        console.log("displayMatchesAsSchedule: Načítané skupiny:", Array.from(groupsMap.entries()));

        // Populate team display names for matches
        const updatedMatchesPromises = allMatches.map(async match => {
            const [team1Data, team2Data] = await Promise.allSettled([
                getTeamName(match.categoryId, match.groupId, match.team1Number, categoriesMap, groupsMap),
                getTeamName(match.categoryId, match.groupId, match.team2Number, categoriesMap, groupsMap)
            ]);

            return {
                ...match,
                team1DisplayName: team1Data.status === 'fulfilled' ? team1Data.value.fullDisplayName : 'N/A',
                team1ClubName: team1Data.status === 'fulfilled' ? team1Data.value.clubName : 'N/A',
                team1ClubId: team1Data.status === 'fulfilled' ? team1Data.value.clubId : null,
                team2DisplayName: team2Data.status === 'fulfilled' ? team2Data.value.fullDisplayName : 'N/A',
                team2ClubName: team2Data.status === 'fulfilled' ? team2Data.value.clubName : 'N/A',
                team2ClubId: team2Data.status === 'fulfilled' ? team2Data.value.clubId : null,
            };
        });

        allMatches = await Promise.all(updatedMatchesPromises);


        const busesQuery = query(busesCollectionRef, orderBy("date", "asc"), orderBy("busName", "asc"), orderBy("startTime", "asc"));
        const busesSnapshot = await getDocs(busesQuery);
        const allBuses = busesSnapshot.docs.map(doc => ({ id: doc.id, type: 'bus', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané autobusy:", allBuses);

        const accommodationsSnapshot = await getDocs(query(teamAccommodationsCollectionRef, orderBy("dateFrom", "asc"), orderBy("accommodationName", "asc")));
        const allAccommodations = accommodationsSnapshot.docs.map(doc => ({ id: doc.id, type: 'accommodation', ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané ubytovania:", allAccommodations);

        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const existingPlayingDays = playingDaysSnapshot.docs.map(doc => doc.data().date);
        console.log("displayMatchesAsSchedule: Načítané hracie dni (len dátumy):", existingPlayingDays);

        const placesSnapshot = await getDocs(query(placesCollectionRef, orderBy("name", "asc")));
        const existingPlacesData = placesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("displayMatchesAsSchedule: Načítané miesta:", existingPlacesData);

        const uniquePlacesForRows = [];
        const addedPlaceKeys = new Set();
        existingPlacesData.forEach(place => {
            const placeKey = `${place.name}:::${place.type}`;
            if (!addedPlaceKeys.has(placeKey)) {
                uniquePlacesForRows.push(place);
                addedPlaceKeys.add(placeKey);
            }
        });

        uniquePlacesForRows.sort((a, b) => {
            if (a.type < b.type) return -1;
            if (a.type > b.type) return 1;
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });

        const uniqueLocations = new Set();
        uniquePlacesForRows.forEach(place => uniqueLocations.add(`${place.name}:::${place.type}`));

        const sortedDates = Array.from(new Set(existingPlayingDays)).sort();

        const eventsForTimeRangeCalculation = [...allMatches, ...allBuses];
        const dailyTimeRanges = new Map();

        eventsForTimeRangeCalculation.forEach(event => {
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
                    endTimeInMinutes += 24 * 60;
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

        sortedDates.forEach(date => {
            if (!dailyTimeRanges.has(date)) {
                dailyTimeRanges.set(date, { minHour: 8, maxHour: 18 });
            }
        });

        matchesContainer.innerHTML = '';
        let scheduleHtml = '<div class="schedule-table-container" style="position: relative; overflow: auto;">';
        scheduleHtml += '<table class="match-schedule-table"><thead><tr>';
        scheduleHtml += `<th class="fixed-column" style="position: sticky; top: 0; left: 0; z-index: 101; background-color: #d0d0d0;">Miesto ⁄ Čas</th>`;

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
            const displayYear = displayDateObj.getFullYear();
            const formattedDisplayDate = `${displayDay}. ${displayMonth}. ${displayYear}`;

            const colspan = hoursForDate.length > 0 ? hoursForDate.length : 1;
            scheduleHtml += `<th colspan="${colspan}" class="date-header-clickable" data-date="${date}" title="Kliknutím upravíte hrací deň ${formattedDisplayDate}" style="position: sticky; top: 0; z-index: 100; background-color: #d0d0d0;">`;
            scheduleHtml += `<div class="schedule-date-header-content">${formattedDisplayDate}</div>`;
            scheduleHtml += '<div class="schedule-times-row">';
            if (hoursForDate.length > 0) {
                hoursForDate.forEach(hour => {
                    scheduleHtml += `<span>${String(hour % 24).padStart(2, '0')}:00</span>`;
                });
            } else {
                scheduleHtml += `<span></span>`;
            }
            scheduleHtml += '</div>';
            scheduleHtml += '</th>';
        });
        scheduleHtml += '</tr></thead><tbody>';

        uniquePlacesForRows.forEach(placeData => {
            const locationName = placeData.name;
            const placeAddress = placeData.address;
            const placeGoogleMapsUrl = placeData.googleMapsUrl;
            const placeType = placeData.type;

            let typeClass = '';
            let specificBackgroundColor = '';
            switch (placeType) {
                case 'Športová hala':
                    typeClass = 'place-type-sport-hall';
                    specificBackgroundColor = 'background-color: #007bff;';
                    break;
                case 'Stravovacie zariadenie':
                    typeClass = 'place-type-catering';
                    specificBackgroundColor = 'background-color: #ffc107;';
                    break;
                case 'Ubytovanie':
                    typeClass = 'place-type-accommodation';
                    specificBackgroundColor = 'background-color: #4CAF50;';
                    break;
                default:
                    typeClass = '';
            }

            const stickyColumnStyles = `position: sticky; left: 0; z-index: 100; background-color: #e0e0e0;`;
            const finalColumnStyle = `${stickyColumnStyles} ${specificBackgroundColor}`;

            scheduleHtml += '<tr>';
            scheduleHtml += `<th class="fixed-column schedule-location-header delete-location-header ${typeClass}" data-location="${locationName}" data-type="${placeType}" title="Kliknutím upravíte miesto ${locationName} (${placeType})" style="${finalColumnStyle}">
                <div class="hall-name">${locationName} (${placeType})</div> <div class="hall-address">
                    <a href="${placeGoogleMapsUrl}" target="_blank" rel="noopener noreferrer">${placeAddress}</a>
                </div>
            </th>`;

            sortedDates.forEach(date => {
                const range = dailyTimeRanges.get(date);
                const hoursForDateCount = range ? (range.maxHour - range.minHour) : 0;
                const colspan = hoursForDateCount > 0 ? hoursForDateCount : 1;
                scheduleHtml += `<td colspan="${colspan}" style="position: relative; background-color: #f7f7f7;">`;

                const matchesInCell = allMatches.filter(event => {
                    return event.date === date && placeType === 'Športová hala' && event.location === locationName;
                });

                const accommodationsInCell = allAccommodations.filter(assignment => {
                    const dateFrom = new Date(assignment.dateFrom);
                    const dateTo = new Date(assignment.dateTo);
                    const currentDate = new Date(date);
                    return currentDate >= dateFrom && currentDate <= dateTo && placeType === 'Ubytovanie' && assignment.accommodationName === locationName;
                });

                matchesInCell.sort((a, b) => {
                    const [aH, aM] = a.startTime.split(':').map(Number);
                    const [bH, bM] = b.startTime.split(':').map(Number);
                    return (aH * 60 + aM) - (bH * 60 + bM);
                });

                matchesInCell.forEach(event => {
                    const [startH, startM] = event.startTime.split(':').map(Number);
                    const absoluteStartMin = startH * 60 + startM;
                    const relativeStartMinInCell = absoluteStartMin - (range.minHour * 60);
                    const matchBlockLeftPx = relativeStartMinInCell * PIXELS_PER_MINUTE;
                    const matchBlockWidthPx = event.duration * PIXELS_PER_MINUTE;
                    const bufferBlockLeftPx = matchBlockLeftPx + matchBlockWidthPx;
                    const bufferBlockWidthPx = event.bufferTime * PIXELS_PER_MINUTE;

                    const matchEndTime = new Date();
                    matchEndTime.setHours(startH, startM + event.duration, 0, 0);
                    const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                    let team1ClubNameDisplay = event.team1ClubName ? `${event.team1ClubName}` : '';
                    let team2ClubNameDisplay = event.team2ClubName ? `${event.team2ClubName}` : '';

                    let clubNamesHtml = '';
                    if (team1ClubNameDisplay) {
                        clubNamesHtml += `${team1ClubNameDisplay}`;
                    }
                    if (team2ClubNameDisplay) {
                        if (clubNamesHtml) clubNamesHtml += `<br>`;
                        clubNamesHtml += `${team2ClubNameDisplay}`;
                    }
                    const finalClubNamesHtml = clubNamesHtml ? `<span style="font-weight: normal;">${clubNamesHtml}</span>` : '';

                    // Get updated category and group names from the maps
                    const currentCategoryName = categoriesMap.get(event.categoryId) || event.categoryId;
                    const currentGroupName = groupsMap.get(event.groupId) || event.groupId;

                    scheduleHtml += `
                        <div class="schedule-cell-match"
                            data-id="${event.id}" data-type="${event.type}"
                            style="left: ${matchBlockLeftPx}px; width: ${matchBlockWidthPx}px; top: 0;">
                            <div class="schedule-cell-content">
                                <p class="schedule-cell-time">${event.startTime} - ${formattedEndTime}</p>
                                <p class="schedule-cell-category">${currentCategoryName || 'N/A'}${currentGroupName ? ` ${currentGroupName}` : ''}</p>
                                <p class="schedule-cell-teams">
                                    ${event.team1DisplayName}<br>
                                    ${event.team2DisplayName}<br>
                                    ${finalClubNamesHtml}
                                </p>
                            </div>
                        </div>
                    `;
                    if (event.bufferTime > 0) {
                        scheduleHtml += `
                            <div class="schedule-cell-buffer"
                                style="left: ${bufferBlockLeftPx}px; width: ${bufferBlockWidthPx}px; top: 0;">
                            </div>
                        `;
                    }
                });

                const totalAccommodationsInCell = accommodationsInCell.length;
                if (totalAccommodationsInCell > 0) {
                    const cellWidth = (range.maxHour - range.minHour) * CELL_WIDTH_PX;
                    const blockWidth = totalAccommodationsInCell > 0 ? (cellWidth / totalAccommodationsInCell) : cellWidth;

                    accommodationsInCell.forEach((assignment, index) => {
                        const blockLeft = index * blockWidth;
                        const accommodationId = assignment.id;

                        let displayText;
                        if (assignment.teams.length === 1) {
                            displayText = assignment.teams[0].teamName.split('(')[0].trim();
                        } else {
                            const baseClubNames = new Set();
                            assignment.teams.forEach(team => {
                                let baseName;
                                const fullTeamName = team.teamName.split('(')[0].trim();
                                if (fullTeamName.includes('⁄')) {
                                    baseName = fullTeamName;
                                } else {
                                    baseName = fullTeamName.replace(/\s[A-Z]$/, '');
                                }
                                baseClubNames.add(baseName);
                            });
                            if (baseClubNames.size === 1) {
                                displayText = Array.from(baseClubNames)[0];
                            } else {
                                displayText = assignment.teams.map(team => team.teamName.split('(')[0].trim()).join(', ');
                            }
                        }

                        scheduleHtml += `
                            <div class="schedule-cell-accommodation"
                                data-id="${accommodationId}" data-type="${assignment.type}"
                                style="position: absolute; left: ${blockLeft}px; width: ${blockWidth}px; top: 0; height: 100%;">
                                <div class="schedule-cell-content">
                                    <p class="schedule-cell-title">Ubytovanie</p>
                                    <p class="schedule-cell-teams">${displayText}</p>
                                </div>
                            </div>
                        `;
                    });
                }
                scheduleHtml += '</td>';
            });
            scheduleHtml += '</tr>';
        });

        scheduleHtml += '</tbody></table>';
        scheduleHtml += '</div>';

        matchesContainer.insertAdjacentHTML('beforeend', scheduleHtml);

        const scheduleTableContainer = matchesContainer.querySelector('.schedule-table-container');
        const scheduleTable = matchesContainer.querySelector('.match-schedule-table');
        // Define scheduleTableContainerRect here
        const scheduleTableContainerRect = scheduleTableContainer.getBoundingClientRect();


        if (!scheduleTableContainer || !scheduleTable) {
            matchesContainer.innerHTML = '<p>Chyba pri zobrazení rozvrhu. Chýbajú komponenty tabuľky.</p>';
            return;
        }

        const busOverlayContainer = document.createElement('div');
        busOverlayContainer.id = 'busOverlayContainer';
        busOverlayContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: ${scheduleTable.offsetWidth}px;
                height: ${scheduleTable.offsetHeight}px;
                pointer-events: none;
            `;
        scheduleTableContainer.appendChild(busOverlayContainer);

        const locationRowTopOffsets = new Map();
        scheduleTable.querySelectorAll('tbody tr').forEach(row => {
            const locationHeader = row.querySelector('th.fixed-column');
            if (locationHeader) {
                const locationName = locationHeader.dataset.location;
                const locationType = locationHeader.dataset.type;
                locationRowTopOffsets.set(`${locationName}:::${locationType}`, locationHeader.getBoundingClientRect().top - scheduleTableContainerRect.top);
            }
        });

        const timeColumnLeftOffsets = new Map();
        const firstTimeHeader = scheduleTable.querySelector('thead th:not(.fixed-column)');
        if (firstTimeHeader) {
            sortedDates.forEach(date => {
                const dateHeader = scheduleTable.querySelector(`th[data-date="${date}"]`);
                if (dateHeader) {
                    const timeSpans = dateHeader.querySelectorAll('.schedule-times-row span');
                    const hourOffsets = [];
                    const range = dailyTimeRanges.get(date);
                    const firstHourInDay = range ? range.minHour : 0;
                    timeSpans.forEach((span, index) => {
                        const hour = firstHourInDay + index;
                        hourOffsets.push({
                            hour: hour,
                            left: (dateHeader.getBoundingClientRect().left - scheduleTableContainerRect.left) + (index * CELL_WIDTH_PX)
                        });
                    });
                    timeColumnLeftOffsets.set(date, hourOffsets);
                }
            });
        }

        allBuses.forEach(bus => {
            const startLocationKey = bus.startLocation;
            const endLocationKey = bus.endLocation;
            const date = bus.date;

            let busStartY, busEndY;
            const startLocationTop = locationRowTopOffsets.get(startLocationKey);
            const endLocationTop = locationRowTopOffsets.get(endLocationKey);

            if (startLocationTop === undefined || endLocationTop === undefined) {
                return;
            }

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
                endTimeInMinutes += 24 * 60;
            }
            const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
            const busWidthPx = (durationInMinutes * PIXELS_PER_MINUTE) / 4;
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

            const timeOffsets = timeColumnLeftOffsets.get(date);
            let busLeftPx = 0;
            if (timeOffsets && timeOffsets.length > 0) {
                const firstHourInDay = dailyTimeRanges.get(date) ? dailyTimeRanges.get(date).minHour : 0;
                const relativeStartMin = startTimeInMinutes - (firstHourInDay * 60);
                busLeftPx = timeOffsets[0].left + (relativeStartMin * PIXELS_PER_MINUTE);
            } else {
                return;
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
            busRouteText.textContent = `${bus.startLocation.split(':::')[0]} → ${bus.endLocation.split(':::')[0]}`;
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

        matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
            element.addEventListener('click', (event) => {
                const id = event.currentTarget.dataset.id;
                editMatch(id);
            });
        });

        busOverlayContainer.querySelectorAll('.bus-svg').forEach(element => {
            element.addEventListener('click', (event) => {
                const id = event.currentTarget.dataset.id;
                editBus(id);
            });
        });

        matchesContainer.querySelectorAll('.schedule-cell-accommodation').forEach(element => {
            element.addEventListener('click', (event) => {
                const id = event.currentTarget.dataset.id;
                editAccommodationAssignment(id);
            });
        });

        matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => {
            header.addEventListener('click', (event) => {
                if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                    return;
                }
                if (event.target === header || event.target.closest('.schedule-date-header-content')) {
                    const dateToEdit = header.dataset.date;
                    editPlayingDay(dateToEdit);
                }
            });
        });

        matchesContainer.querySelectorAll('.delete-location-header').forEach(header => {
            header.addEventListener('click', (event) => {
                if (event.target.tagName === 'A' || event.target.closest('.hall-address')) {
                    return;
                }
                if (event.target === header || event.target.closest('.hall-name')) {
                    const locationToEdit = header.dataset.location;
                    const locationTypeToEdit = header.dataset.type;
                    editPlace(locationToEdit, locationTypeToEdit);
                }
            });
        });

    } catch (error) {
        console.error("Chyba pri načítaní rozvrhu zápasov (zachytená chyba):", error);
        matchesContainer.innerHTML = `
            <div class="error-message">
                <h3>Chyba pri načítaní rozvrhu zápasov!</h3>
                <p>Prosím, skontrolujte konzolu prehliadača (F12 > Console) pre detaily.</p>
                <p>Možné príčiny:</p>
                <ul>
                    <li>Chýbajúce indexy vo Firestore. Skontrolujte záložku "Network" v konzole a Firebase Console.</li>
                    <li>Problém s pripojením k databáze alebo bezpečnostné pravidlá.</li>
                    <li>Žiadne dáta v kolekciách.</li>
                </ul>
                <p>Detail chyby: ${error.message}</p>
            </div>
        `;
        // If the error is related to being offline or connection issues, show a more specific message
        if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
             matchesContainer.innerHTML += '<p class="error-message">Zdá sa, že nie ste pripojení k internetu, alebo je problém s pripojením k Firebase.</p>';
        }
    }
}

/**
 * Deletes a playing day and all associated matches, bus routes, and accommodation assignments.
 * @param {string} dateToDelete The date of the playing day to delete.
 */
async function deletePlayingDay(dateToDelete) {
    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať hrací deň ${dateToDelete} a VŠETKY zápasy, autobusové linky a priradenia ubytovania, ktoré sa konajú v tento deň?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Delete playing day document
            const playingDayQuery = query(playingDaysCollectionRef, where("date", "==", dateToDelete));
            const playingDaySnapshot = await getDocs(playingDayQuery);
            if (!playingDaySnapshot.empty) {
                playingDaySnapshot.docs.forEach(docToDelete => {
                    batch.delete(doc(playingDaysCollectionRef, docToDelete.id));
                });
            }

            // Delete associated matches
            const matchesQuery = query(matchesCollectionRef, where("date", "==", dateToDelete));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            // Delete associated bus routes
            const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
            const busesSnapshot = await getDocs(busesQuery);
            busesSnapshot.docs.forEach(busDoc => {
                batch.delete(doc(busesCollectionRef, busDoc.id));
            });

            // Delete associated accommodation assignments that overlap with the date
            const accommodationsQuery = query(
                teamAccommodationsCollectionRef,
                where("dateFrom", "<=", dateToDelete),
                where("dateTo", ">=", dateToDelete)
            );
            const accommodationsSnapshot = await getDocs(accommodationsQuery);
            accommodationsSnapshot.docs.forEach(accDoc => {
                batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
            });

            await batch.commit();
            await showMessage('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania, ktoré sa prekrývali s týmto dňom, boli vymazané!`);
            closeModal(document.getElementById('playingDayModal'));
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri mazaní hracieho dňa ${dateToDelete}. Detail: ${error.message}`);
        }
    }
}

/**
 * Deletes a place (sport hall, catering, or accommodation) and all associated matches and bus routes.
 * @param {string} placeNameToDelete The name of the place to delete.
 * @param {string} placeTypeToDelete The type of the place to delete.
 */
async function deletePlace(placeNameToDelete, placeTypeToDelete) {
    const confirmed = await showConfirmation(
        'Potvrdenie vymazania',
        `Naozaj chcete vymazať miesto ${placeNameToDelete} (${placeTypeToDelete}) a VŠETKY zápasy a autobusové linky, ktoré sa viažu na toto miesto?`
    );

    if (confirmed) {
        try {
            const batch = writeBatch(db);

            // Delete place document
            const placeQuery = query(placesCollectionRef, where("name", "==", placeNameToDelete), where("type", "==", placeTypeToDelete));
            const placeSnapshot = await getDocs(placeQuery);
            if (!placeSnapshot.empty) {
                placeSnapshot.docs.forEach(docToDelete => {
                    batch.delete(doc(placesCollectionRef, docToDelete.id));
                });
            }

            // Delete associated matches
            const matchesQuery = query(matchesCollectionRef, where("location", "==", placeNameToDelete), where("locationType", "==", placeTypeToDelete));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.docs.forEach(matchDoc => {
                batch.delete(doc(matchesCollectionRef, matchDoc.id));
            });

            // Delete associated bus routes (both as start and end location)
            const combinedPlaceKey = `${placeNameToDelete}:::${placeTypeToDelete}`;
            const busesStartQuery = query(busesCollectionRef, where("startLocation", "==", combinedPlaceKey));
            const busesStartSnapshot = await getDocs(busesStartQuery);
            busesStartSnapshot.docs.forEach(busDoc => {
                batch.delete(doc(busesCollectionRef, busDoc.id));
            });

            const busesEndQuery = query(busesCollectionRef, where("endLocation", "==", combinedPlaceKey));
            const busesEndSnapshot = await getDocs(busesEndQuery);
            busesEndSnapshot.docs.forEach(busDoc => {
                batch.delete(doc(busesCollectionRef, busDoc.id));
            });

            // If it's an accommodation, delete associated team accommodations
            if (placeTypeToDelete === 'Ubytovanie') {
                const accommodationsQuery = query(teamAccommodationsCollectionRef, where("accommodationId", "==", placeSnapshot.docs[0].id));
                const accommodationsSnapshot = await getDocs(accommodationsQuery);
                accommodationsSnapshot.docs.forEach(accDoc => {
                    batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                });
            }

            await batch.commit();
            await showMessage('Úspech', `Miesto ${placeNameToDelete} (${placeTypeToDelete}) a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania boli vymazané!`);
            closeModal(document.getElementById('placeModal'));
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní miesta:", error);
            await showMessage('Chyba', `Chyba pri mazaní miesta ${placeNameToDelete} (${placeTypeToDelete}). Detail: ${error.message}`);
        }
    }
}

/**
 * Opens the modal to edit an existing playing day.
 * @param {string} dateToEdit The date of the playing day to edit.
 */
async function editPlayingDay(dateToEdit) {
    try {
        const playingDayModal = document.getElementById('playingDayModal');
        const playingDayIdInput = document.getElementById('playingDayId');
        const playingDayDateInput = document.getElementById('playingDayDate');
        const playingDayModalTitle = document.getElementById('playingDayModalTitle');
        const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

        const q = query(playingDaysCollectionRef, where("date", "==", dateToEdit));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const playingDayDoc = querySnapshot.docs[0];
            const playingDayData = playingDayDoc.data();
            const playingDayId = playingDayDoc.id;

            playingDayIdInput.value = playingDayId;
            playingDayDateInput.value = playingDayData.date || '';
            playingDayModalTitle.textContent = 'Upraviť hrací deň';
            deletePlayingDayButtonModal.style.display = 'inline-block';
            deletePlayingDayButtonModal.onclick = () => deletePlayingDay(playingDayData.date);
            openModal(playingDayModal);
        } else {
            await showMessage('Informácia', "Hrací deň sa nenašiel.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát hracieho dňa:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát hracieho dňa. Skúste to znova.");
    }
}

/**
 * Opens the modal to edit an existing place.
 * @param {string} placeName The name of the place to edit.
 * @param {string} placeType The type of the place to edit.
 */
async function editPlace(placeName, placeType) {
    try {
        const placeModal = document.getElementById('placeModal');
        const placeIdInput = document.getElementById('placeId');
        const placeTypeSelect = document.getElementById('placeTypeSelect');
        const placeNameInput = document.getElementById('placeName');
        const placeAddressInput = document.getElementById('placeAddress');
        const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
        const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

        const q = query(placesCollectionRef, where("name", "==", placeName), where("type", "==", placeType));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const placeDoc = querySnapshot.docs[0];
            const placeData = placeDoc.data();
            const placeId = placeDoc.id;

            placeIdInput.value = placeId;
            placeTypeSelect.value = placeData.type || '';
            placeNameInput.value = placeData.name || '';
            placeAddressInput.value = placeData.address || '';
            placeGoogleMapsUrlInput.value = placeData.googleMapsUrl || '';

            deletePlaceButtonModal.style.display = 'inline-block';
            deletePlaceButtonModal.onclick = () => deletePlace(placeData.name, placeData.type);
            openModal(placeModal);
        } else {
            await showMessage('Informácia', "Miesto sa nenašlo.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát miesta:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát miesta. Skúste to znova.");
    }
}

/**
 * Opens the modal to edit an existing match.
 * @param {string} matchId The ID of the match to edit.
 */
async function editMatch(matchId) {
    try {
        const matchModal = document.getElementById('matchModal');
        const matchIdInput = document.getElementById('matchId');
        const matchModalTitle = document.getElementById('matchModalTitle');
        const matchDateSelect = document.getElementById('matchDateSelect');
        const matchLocationSelect = document.getElementById('matchLocationSelect');
        const matchStartTimeInput = document.getElementById('matchStartTime');
        const matchDurationInput = document.getElementById('matchDuration');
        const matchBufferTimeInput = document.getElementById('matchBufferTime');
        const matchCategorySelect = document.getElementById('matchCategory');
        const matchGroupSelect = document.getElementById('matchGroup');
        const team1NumberInput = document.getElementById('team1NumberInput');
        const team2NumberInput = document.getElementById('team2NumberInput');
        const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

        const matchDocRef = doc(matchesCollectionRef, matchId);
        const matchDoc = await getDoc(matchDocRef);

        if (matchDoc.exists()) {
            const matchData = matchDoc.data();
            matchIdInput.value = matchId;
            matchModalTitle.textContent = 'Upraviť zápas';

            await populatePlayingDaysSelect(matchDateSelect, matchData.date);
            await populateSportHallSelects(matchLocationSelect, matchData.location);
            matchStartTimeInput.value = matchData.startTime || '';
            matchDurationInput.value = matchData.duration || '';
            matchBufferTimeInput.value = matchData.bufferTime || '';

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

            deleteMatchButtonModal.style.display = 'inline-block';
            deleteMatchButtonModal.onclick = () => deleteMatch(matchId);

            openModal(matchModal);
        } else {
            await showMessage('Informácia', "Zápas sa nenašiel.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát zápasu:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát zápasu. Skúste to znova.");
    }
}

/**
 * Deletes a match from Firestore.
 * @param {string} matchId The ID of the match to delete.
 */
async function deleteMatch(matchId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať tento zápas?');
    if (confirmed) {
        try {
            await deleteDoc(doc(matchesCollectionRef, matchId));
            await showMessage('Úspech', 'Zápas vymazaný!');
            closeModal(document.getElementById('matchModal'));
            displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri mazaní zápasu. Detail: ${error.message}`);
        }
    }
}

/**
 * Opens the modal to edit an existing bus route.
 * @param {string} busId The ID of the bus route to edit.
 */
async function editBus(busId) {
    try {
        const busModal = document.getElementById('busModal');
        const busIdInput = document.getElementById('busId');
        const busModalTitle = document.getElementById('busModalTitle');
        const busNameInput = document.getElementById('busNameInput');
        const busDateSelect = document.getElementById('busDateSelect');
        const busStartLocationSelect = document.getElementById('busStartLocationSelect');
        const busStartTimeInput = document.getElementById('busStartTimeInput');
        const busEndLocationSelect = document.getElementById('busEndLocationSelect');
        const busEndTimeInput = document = document.getElementById('busEndTimeInput');
        const busNotesInput = document.getElementById('busNotesInput');
        const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

        const busDocRef = doc(busesCollectionRef, busId);
        const busDoc = await getDoc(busDocRef);

        if (busDoc.exists()) {
            const busData = busDoc.data();
            busIdInput.value = busId;
            busModalTitle.textContent = 'Upraviť autobusovú linku';
            busNameInput.value = busData.busName || '';

            await populatePlayingDaysSelect(busDateSelect, busData.date);
            await populateAllPlaceSelects(busStartLocationSelect);
            busStartLocationSelect.value = busData.startLocation || '';
            busStartTimeInput.value = busData.startTime || '';
            await populateAllPlaceSelects(busEndLocationSelect, '');
            busEndLocationSelect.value = busData.endLocation || '';
            busEndTimeInput.value = busData.endTime || '';
            busNotesInput.value = busData.notes || '';

            deleteBusButtonModal.style.display = 'inline-block';
            deleteBusButtonModal.onclick = () => deleteBus(busId);

            openModal(busModal);
        } else {
            await showMessage('Informácia', "Autobusová linka sa nenašla.");
        }
    } catch (error) {
        console.error("Chyba pri načítavaní dát autobusu:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát autobusu. Skúste to znova.");
    }
}

/**
 * Deletes a bus route from Firestore.
 * @param {string} busId The ID of the bus route to delete.
 */
async function deleteBus(busId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať túto autobusovú linku?');
    if (confirmed) {
        try {
            await deleteDoc(doc(busesCollectionRef, busId));
            await showMessage('Úspech', 'Autobusová linka vymazaná!');
            closeModal(document.getElementById('busModal'));
            displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní autobusovej linky:", error);
            await showMessage('Chyba', `Chyba pri mazaní autobusovej linky. Detail: ${error.message}`);
        }
    }
}

/**
 * Opens the modal to edit an existing accommodation assignment.
 * @param {string} assignmentId The ID of the accommodation assignment to edit.
 */
async function editAccommodationAssignment(assignmentId) {
    try {
        const assignAccommodationModal = document.getElementById('assignAccommodationModal');
        const assignmentIdInput = document.getElementById('assignmentId');
        const assignAccommodationModalTitle = document.getElementById('assignAccommodationModalTitle');
        const assignmentDateFromSelect = document.getElementById('assignmentDateFromSelect');
        const assignmentDateToSelect = document.getElementById('assignmentDateToSelect');
        const clubSelect = document.getElementById('clubSelect');
        const specificTeamSelect = document.getElementById('specificTeamSelect');
        const accommodationSelect = document.getElementById('accommodationSelect');
        const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

        const assignmentDocRef = doc(teamAccommodationsCollectionRef, assignmentId);
        const assignmentDoc = await getDoc(assignmentDocRef);

        if (assignmentDoc.exists()) {
            const assignmentData = assignmentDoc.data();
            assignmentIdInput.value = assignmentId;
            assignAccommodationModalTitle.textContent = 'Upraviť priradenie ubytovania';

            await populatePlayingDaysSelect(assignmentDateFromSelect, assignmentData.dateFrom);
            await populatePlayingDaysSelect(assignmentDateToSelect, assignmentData.dateTo);

            const assignedTeam = assignmentData.teams[0];
            let assignedClubName = '';
            if (assignedTeam && assignedTeam.teamName) {
                if (assignedTeam.teamName.includes('⁄')) {
                    assignedClubName = assignedTeam.teamName.split('(')[0].trim();
                } else {
                    assignedClubName = assignedTeam.teamName.split('(')[0].trim().replace(/\s[A-Z]$/, '');
                }
            }
            await populateClubSelect(clubSelect, assignedClubName);
            if (assignedClubName) {
                await populateSpecificTeamSelect(specificTeamSelect, assignedClubName, assignedTeam?.teamId || '');
            } else {
                if (specificTeamSelect) {
                    specificTeamSelect.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
                    specificTeamSelect.disabled = true;
                }
            }
            await populateAccommodationSelect(accommodationSelect, assignmentData.accommodationId);

            deleteAssignmentButtonModal.style.display = 'inline-block';
            deleteAssignmentButtonModal.onclick = () => deleteAccommodationAssignment(assignmentId);

            openModal(assignAccommodationModal);
        } else {
            await showMessage('Informácia', "Priradenie ubytovania sa nenašlo.");
        }
    }
    catch (error) {
        console.error("Chyba pri načítavaní dát priradenia ubytovania:", error);
        await showMessage('Chyba', "Vyskytla sa chyba pri načítavaní dát priradenia ubytovania. Skúste to znova.");
    }
}

/**
 * Deletes an accommodation assignment from Firestore.
 * @param {string} assignmentId The ID of the assignment to delete.
 */
async function deleteAccommodationAssignment(assignmentId) {
    const confirmed = await showConfirmation('Potvrdenie vymazania', 'Naozaj chcete vymazať toto priradenie ubytovania?');
    if (confirmed) {
        try {
            await deleteDoc(doc(teamAccommodationsCollectionRef, assignmentId));
            await showMessage('Úspech', 'Priradenie ubytovania vymazané!');
            closeModal(document.getElementById('assignAccommodationModal'));
            displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní priradenia ubytovania:", error);
            await showMessage('Chyba', `Chyba pri mazaní priradenia ubytovania. Detail: ${error.message}`);
        }
    }
}

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
    const addPlaceButton = document.getElementById('addPlaceButton');
    const addMatchButton = document.getElementById('addMatchButton');
    const addBusButton = document.getElementById('addBusButton');
    const assignAccommodationButton = document.getElementById('assignAccommodationButton');

    const matchModal = document.getElementById('matchModal');
    const closeMatchModalButton = document.getElementById('closeMatchModal');
    const matchForm = document.getElementById('matchForm');
    const matchIdInput = document.getElementById('matchId');
    const matchDateSelect = document.getElementById('matchDateSelect');
    const matchLocationSelect = document.getElementById('matchLocationSelect');
    const matchStartTimeInput = document.getElementById('matchStartTime');
    const matchDurationInput = document.getElementById('matchDuration');
    const matchBufferTimeInput = document.getElementById('matchBufferTime');
    const matchCategorySelect = document.getElementById('matchCategory');
    const matchGroupSelect = document.getElementById('matchGroup');
    const matchModalTitle = document.getElementById('matchModalTitle');
    const matchesContainer = document.getElementById('matchesContainer');
    const team1NumberInput = document.getElementById('team1NumberInput');
    const team2NumberInput = document.getElementById('team2NumberInput');
    const deleteMatchButtonModal = document.getElementById('deleteMatchButtonModal');

    const playingDayModal = document.getElementById('playingDayModal');
    const closePlayingDayModalButton = document.getElementById('closePlayingDayModal');
    const playingDayForm = document.getElementById('playingDayForm');
    const playingDayIdInput = document.getElementById('playingDayId');
    const playingDayDateInput = document.getElementById('playingDayDate');
    const playingDayModalTitle = document.getElementById('playingDayModalTitle');
    const deletePlayingDayButtonModal = document.getElementById('deletePlayingDayButtonModal');

    const placeModal = document.getElementById('placeModal');
    const closePlaceModalButton = document.getElementById('closePlaceModal');
    const placeForm = document.getElementById('placeForm');
    const placeIdInput = document.getElementById('placeId');
    const placeTypeSelect = document.getElementById('placeTypeSelect');
    const placeNameInput = document.getElementById('placeName');
    const placeAddressInput = document.getElementById('placeAddress');
    const placeGoogleMapsUrlInput = document.getElementById('placeGoogleMapsUrl');
    const deletePlaceButtonModal = document.getElementById('deletePlaceButtonModal');

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
    const deleteBusButtonModal = document.getElementById('deleteBusButtonModal');

    const assignAccommodationModal = document.getElementById('assignAccommodationModal');
    const closeAssignAccommodationModalButton = document.getElementById('closeAssignAccommodationModal');
    const assignAccommodationForm = document.getElementById('assignAccommodationForm');
    const assignmentIdInput = document.getElementById('assignmentId');
    const assignmentDateFromSelect = document.getElementById('assignmentDateFromSelect');
    const assignmentDateToSelect = document.getElementById('assignmentDateToSelect');
    const clubSelect = document.getElementById('clubSelect');
    const specificTeamSelect = document.getElementById('specificTeamSelect');
    const accommodationSelect = document.getElementById('accommodationSelect');
    const assignAccommodationModalTitle = document.getElementById('assignAccommodationModalTitle');
    const deleteAssignmentButtonModal = document.getElementById('deleteAssignmentButtonModal');

    if (categoriesContentSection) {
        categoriesContentSection.style.display = 'block';
        const otherSections = document.querySelectorAll('main > section, main > div');
        otherSections.forEach(section => {
            if (section.id !== 'categoriesContentSection') {
                section.style.display = 'none';
            }
        });
    }

    // Initial display of the schedule when the page loads
    await displayMatchesAsSchedule();

    // Event listeners for the "Add" button and its options
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing options immediately
        addOptions.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
        if (!addButton.contains(event.target) && !addOptions.contains(event.target)) {
            addOptions.classList.remove('show');
        }
    });

    addPlayingDayButton.addEventListener('click', () => {
        playingDayForm.reset();
        playingDayIdInput.value = '';
        playingDayModalTitle.textContent = 'Pridať hrací deň';
        deletePlayingDayButtonModal.style.display = 'none';
        openModal(playingDayModal);
        addOptions.classList.remove('show');
    });

    addPlaceButton.addEventListener('click', () => {
        placeForm.reset();
        placeIdInput.value = '';
        placeTypeSelect.value = '';
        placeNameInput.value = '';
        placeAddressInput.value = '';
        placeGoogleMapsUrlInput.value = '';
        deletePlaceButtonModal.style.display = 'none';
        openModal(placeModal);
        addOptions.classList.remove('show');
    });

    addMatchButton.addEventListener('click', async () => {
        matchForm.reset();
        matchIdInput.value = '';
        matchModalTitle.textContent = 'Pridať nový zápas';
        await populateCategorySelect(matchCategorySelect);
        await populatePlayingDaysSelect(matchDateSelect);
        await populateSportHallSelects(matchLocationSelect);
        if (matchGroupSelect) {
            matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
            matchGroupSelect.disabled = true;
        }
        team1NumberInput.value = '';
        team2NumberInput.value = '';
        matchDurationInput.value = '';
        matchBufferTimeInput.value = '';
        deleteMatchButtonModal.style.display = 'none';
        openModal(matchModal);
        addOptions.classList.remove('show');
        // Update match duration and buffer based on initial category selection or default
        if (matchCategorySelect.value) {
            await updateMatchDurationAndBuffer();
        } else {
            await findFirstAvailableTime(); // Find time even without category selected (uses default duration/buffer)
        }
    });

    addBusButton.addEventListener('click', async () => {
        busForm.reset();
        busIdInput.value = '';
        busModalTitle.textContent = 'Pridať autobusovú linku';
        await populatePlayingDaysSelect(busDateSelect);
        await populateAllPlaceSelects(busStartLocationSelect);
        await populateAllPlaceSelects(busEndLocationSelect, ''); // Populate end location without pre-selection
        deleteBusButtonModal.style.display = 'none';
        openModal(busModal);
        addOptions.classList.remove('show');
    });

    assignAccommodationButton.addEventListener('click', async () => {
        assignAccommodationForm.reset();
        assignmentIdInput.value = '';
        assignAccommodationModalTitle.textContent = 'Priradiť ubytovanie';
        await populatePlayingDaysSelect(assignmentDateFromSelect);
        await populatePlayingDaysSelect(assignmentDateToSelect);
        await populateClubSelect(clubSelect);
        if (specificTeamSelect) {
            specificTeamSelect.innerHTML = '<option value="">-- Vyberte konkrétny tím (nepovinné) --</option>';
            specificTeamSelect.disabled = true;
        }
        await populateAccommodationSelect(accommodationSelect);
        deleteAssignmentButtonModal.style.display = 'none';
        openModal(assignAccommodationModal);
        addOptions.classList.remove('show');
    });

    // Close modal event listeners
    closePlayingDayModalButton.addEventListener('click', () => {
        closeModal(playingDayModal);
        displayMatchesAsSchedule(); // Refresh schedule after closing
    });

    closePlaceModalButton.addEventListener('click', () => {
        closeModal(placeModal);
        displayMatchesAsSchedule(); // Refresh schedule after closing
    });

    closeMatchModalButton.addEventListener('click', () => {
        closeModal(matchModal);
        displayMatchesAsSchedule(); // Refresh schedule after closing
    });

    closeBusModalButton.addEventListener('click', () => {
        closeModal(busModal);
        displayMatchesAsSchedule(); // Refresh schedule after closing
    });

    closeAssignAccommodationModalButton.addEventListener('click', () => {
        closeModal(assignAccommodationModal);
        displayMatchesAsSchedule(); // Refresh schedule after closing
    });

    // Event listeners for dynamic updates in match form
    matchCategorySelect.addEventListener('change', async () => {
        const selectedCategoryId = matchCategorySelect.value;
        if (selectedCategoryId) {
            await populateGroupSelect(selectedCategoryId, matchGroupSelect);
            if (matchGroupSelect) {
                matchGroupSelect.disabled = false;
            }
            await updateMatchDurationAndBuffer();
        } else {
            if (matchGroupSelect) {
                matchGroupSelect.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
                matchGroupSelect.disabled = true;
            }
            team1NumberInput.value = '';
            team2NumberInput.value = '';
            matchDurationInput.value = 60; // Reset to default if no category
            matchBufferTimeInput.value = 5; // Reset to default if no category
            await findFirstAvailableTime();
        }
    });

    matchDateSelect.addEventListener('change', findFirstAvailableTime);
    matchLocationSelect.addEventListener('change', findFirstAvailableTime);
    matchDurationInput.addEventListener('change', findFirstAvailableTime);
    matchBufferTimeInput.addEventListener('change', findFirstAvailableTime);

    // Event listeners for dynamic updates in accommodation assignment form
    if (clubSelect) {
        clubSelect.addEventListener('change', async () => {
            const selectedClubName = clubSelect.value;
            await populateSpecificTeamSelect(specificTeamSelect, selectedClubName);
            if (specificTeamSelect) {
                specificTeamSelect.disabled = !selectedClubName;
            }
        });
    }

    if (assignmentDateFromSelect) {
        assignmentDateFromSelect.addEventListener('change', async () => {
            // Re-populate club select to filter out already assigned clubs for the new date range
            await populateClubSelect(clubSelect, clubSelect.value);
            const selectedClubName = clubSelect.value;
            await populateSpecificTeamSelect(specificTeamSelect, selectedClubName);
            if (specificTeamSelect) {
                specificTeamSelect.disabled = !selectedClubName;
            }
        });
    }

    if (assignmentDateToSelect) {
        assignmentDateToSelect.addEventListener('change', async () => {
            // Re-populate club select to filter out already assigned clubs for the new date range
            await populateClubSelect(clubSelect, clubSelect.value);
            const selectedClubName = clubSelect.value;
            await populateSpecificTeamSelect(specificTeamSelect, selectedClubName);
            if (specificTeamSelect) {
                specificTeamSelect.disabled = !selectedClubName;
            }
        });
    }

    /**
     * Handles the submission of the match form.
     */
    matchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const matchCategory = matchCategorySelect.value;
        const matchGroup = matchGroupSelect.value;
        const team1Number = parseInt(team1NumberInput.value);
        const team2Number = parseInt(team2NumberInput.value);
        const matchDate = matchDateSelect.value;
        const matchLocationName = matchLocationSelect.value;
        const matchStartTime = matchStartTimeInput.value;
        const matchDuration = parseInt(matchDurationInput.value);
        const matchBufferTime = parseInt(matchBufferTimeInput.value);
        const currentMatchId = matchIdInput.value;

        // Basic validation for required fields
        if (!matchCategory || !matchGroup || isNaN(team1Number) || isNaN(team2Number) || !matchDate || !matchLocationName || !matchStartTime || isNaN(matchDuration) || isNaN(matchBufferTime)) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Kategória, Skupina, Poradové číslo tímu 1 a 2, Dátum, Miesto, Čas začiatku, Trvanie, Prestávka po zápase).');
            return;
        }

        // Validate that teams are different
        if (team1Number === team2Number) {
            await showMessage('Chyba', 'Tím nemôže hrať sám proti sebe. Prosím, zadajte rôzne poradové čísla tímov.');
            return;
        }

        // Fetch categories and groups once at the beginning of the submit handler for display names
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name || doc.id));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));

        let team1Result = null;
        let team2Result = null;
        try {
            team1Result = await getTeamName(matchCategory, matchGroup, team1Number, categoriesMap, groupsMap);
            team2Result = await getTeamName(matchCategory, matchGroup, team2Number, categoriesMap, groupsMap);
        } catch (error) {
            console.error("Chyba pri získavaní názvov tímov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri získavaní názvov tímov. Skúste to znova.");
            return;
        }

        // Validate if teams were found
        if (!team1Result || !team1Result.fullDisplayName || !team2Result || !team2Result.fullDisplayName) {
            await showMessage('Chyba', 'Jeden alebo oba tímy sa nenašli. Skontrolujte poradové čísla v danej kategórii a skupine.');
            return;
        }

        // Check if teams have already played against each other in the same category and group
        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("categoryId", "==", matchCategory),
                where("groupId", "==", matchGroup)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let alreadyPlayed = false;
            let overlappingExistingMatchDetails = null; // Variable to store details of the overlapping match

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

                // If editing an existing match, exclude it from the duplicate check
                if (currentMatchId && existingMatchId === currentMatchId) {
                    return;
                }

                const existingTeam1Number = existingMatch.team1Number;
                const existingTeam2Number = existingMatch.team2Number;

                // Check both possible combinations (Team1 vs Team2 or Team2 vs Team1)
                const condition1 = (existingTeam1Number === team1Number && existingTeam2Number === team2Number);
                const condition2 = (existingTeam1Number === team2Number && existingTeam2Number === team1Number);

                if (condition1 || condition2) {
                    alreadyPlayed = true;
                    overlappingExistingMatchDetails = existingMatch; // Store the existing match details
                    return; // Found a duplicate match, can exit the loop
                }
            });

            if (alreadyPlayed) {
                await showMessage('Chyba', `Tímy ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už proti sebe hrali v kategórii ${categoriesMap.get(matchCategory)} a skupine ${groupsMap.get(matchGroup)} dňa ${overlappingExistingMatchDetails.date} o ${overlappingExistingMatchDetails.startTime}. Prosím, zadajte iné tímy.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole existujúcich zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole, či tímy už hrali proti sebe. Skúste to znova.");
            return;
        }

        // Check for time overlap in the same location and date
        const [newStartHour, newStartMinute] = matchStartTime.split(':').map(Number);
        const newMatchStartInMinutes = newStartHour * 60 + newStartMinute;
        const newMatchEndInMinutesWithBuffer = newMatchStartInMinutes + matchDuration + matchBufferTime;

        try {
            const existingMatchesQuery = query(
                matchesCollectionRef,
                where("date", "==", matchDate),
                where("location", "==", matchLocationName)
            );
            const existingMatchesSnapshot = await getDocs(existingMatchesQuery);

            let overlapFound = false;
            let overlappingMatchDetails = null;

            existingMatchesSnapshot.docs.forEach(doc => {
                const existingMatch = doc.data();
                const existingMatchId = doc.id;

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

                await showMessage('Chyba', `Zápas sa prekrýva s existujúcim zápasom v mieste "${matchLocationName}" dňa ${matchDate}:\n\n` +
                      `Existujúci zápas: ${overlappingMatchDetails.startTime} - ${formattedExistingEndTime}\n` +
                      `Tímy: ${overlappingMatchDetails.team1DisplayName} vs ${overlappingMatchDetails.team2DisplayName}\n\n` +
                      `Prosím, upravte čas začiatku alebo trvanie nového zápasu, alebo prestávku po zápase.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania zápasov:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole prekrývania zápasov. Skúste to znova.");
            return;
        }

        // Determine location type
        const allPlacesSnapshot = await getDocs(placesCollectionRef);
        const allPlaces = allPlacesSnapshot.docs.map(doc => doc.data());
        const selectedPlaceData = allPlaces.find(p => p.name === matchLocationName && p.type === 'Športová hala');
        const matchLocationType = selectedPlaceData ? selectedPlaceData.type : 'Športová hala'; // Default to 'Športová hala' if not found

        const matchData = {
            date: matchDate,
            startTime: matchStartTime,
            duration: matchDuration,
            bufferTime: matchBufferTime,
            location: matchLocationName,
            locationType: matchLocationType,
            categoryId: matchCategory,
            categoryName: categoriesMap.get(matchCategory) || matchCategory, // Use actual name from map
            groupId: matchGroup || null,
            groupName: matchGroup ? groupsMap.get(matchGroup).replace(/skupina /gi, '').trim() : null, // Use actual name from map
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

        try {
            if (currentMatchId) {
                await setDoc(doc(matchesCollectionRef, currentMatchId), matchData, { merge: true });
                await showMessage('Úspech', 'Zápas úspešne upravený!');
            } else {
                await addDoc(matchesCollectionRef, matchData);
                await showMessage('Úspech', 'Zápas úspešne pridaný!');
            }
            closeModal(matchModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní zápasu:", error);
            await showMessage('Chyba', `Chyba pri ukladaní zápasu. Detail: ${error.message}`);
        }
    });

    /**
     * Handles the submission of the bus form.
     */
    busForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const busName = busNameInput.value.trim();
        const busDate = busDateSelect.value;
        const busStartLocationCombined = busStartLocationSelect.value;
        const busStartTime = busStartTimeInput.value;
        const busEndLocationCombined = busEndLocationSelect.value;
        const busEndTime = busEndTimeInput.value;
        const busNotes = busNotesInput.value.trim();
        const currentBusId = busIdInput.value;

        // Basic validation for required fields
        if (!busName || !busDate || !busStartLocationCombined || !busStartTime || !busEndLocationCombined || !busEndTime) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Názov autobusu, Dátum, Miesto začiatku, Čas odchodu, Miesto cieľa, Čas príchodu).');
            return;
        }

        // Validate that start and end locations are different
        if (busStartLocationCombined === busEndLocationCombined) {
            await showMessage('Chyba', 'Miesto začiatku a miesto cieľa nemôžu byť rovnaké. Prosím, zvoľte rôzne miesta.');
            return;
        }

        // Validate bus time
        const [startH, startM] = busStartTime.split(':').map(Number);
        const [endH, endM] = busEndTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        let endTimeInMinutes = endH * 60 + endM;

        if (endTimeInMinutes < startTimeInMinutes) {
            endTimeInMinutes += 24 * 60; // Handle overnight routes
        }

        const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
        if (durationInMinutes <= 0) {
            await showMessage('Chyba', 'Čas príchodu musí byť po čase odchodu.');
            return;
        }

        // Check for overlap with existing bus routes with the same name on the same date
        try {
            const existingBusesQuery = query(
                busesCollectionRef,
                where("date", "==", busDate),
                where("busName", "==", busName)
            );
            const existingBusesSnapshot = await getDocs(existingBusesQuery);

            let overlapFound = false;
            let overlappingBusDetails = null;

            existingBusesSnapshot.docs.forEach(doc => {
                const existingBus = doc.data();
                const existingBusId = doc.id;

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

                if (startTimeInMinutes < existingBusEndInMinutes && endTimeInMinutes > existingBusStartInMinutes) {
                    overlapFound = true;
                    overlappingBusDetails = existingBus;
                    return;
                }
            });

            if (overlapFound) {
                await showMessage('Chyba', `Autobus "${busName}" sa prekrýva s existujúcou linkou dňa ${busDate}:\n\n` +
                      `Existujúca linka: ${overlappingBusDetails.startTime} - ${overlappingBusDetails.endTime} (${overlappingBusDetails.startLocation.split(':::')[0]} → ${overlappingBusDetails.endLocation.split(':::')[0]})\n\n` +
                      `Prosím, upravte čas odchodu alebo príchodu novej linky.`);
                return;
            }
        } catch (error) {
            console.error("Chyba pri kontrole prekrývania autobusových liniek:", error);
            await showMessage('Chyba', "Vyskytla sa chyba pri kontrole prekrývania autobusových liniek. Skúste to znova.");
            return;
        }

        const busData = {
            busName: busName,
            date: busDate,
            startLocation: busStartLocationCombined,
            startTime: busStartTime,
            endLocation: busEndLocationCombined,
            endTime: busEndTime,
            notes: busNotes,
            createdAt: new Date()
        };

        try {
            if (currentBusId) {
                await setDoc(doc(busesCollectionRef, currentBusId), busData, { merge: true });
                await showMessage('Úspech', 'Autobusová linka úspešne upravená!');
            } else {
                await addDoc(busesCollectionRef, busData);
                await showMessage('Úspech', 'Autobusová linka úspešne pridaná!');
            }
            closeModal(busModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní autobusovej linky:", error);
            await showMessage('Chyba', `Chyba pri ukladaní autobusovej linky. Detail: ${error.message}`);
        }
    });

    /**
     * Handles the submission of the place form.
     */
    placeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('placeId').value;
        const type = document.getElementById('placeTypeSelect').value.trim();
        const name = document.getElementById('placeName').value.trim();
        const address = document.getElementById('placeAddress').value.trim();
        const googleMapsUrl = document.getElementById('placeGoogleMapsUrl').value.trim();

        // Basic validation
        if (!type || !name || !address || !googleMapsUrl) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky polia (Typ miesta, Názov miesta, Adresa, Odkaz na Google Maps).');
            return;
        }

        try {
            new URL(googleMapsUrl); // Validate URL format
        } catch (_) {
            await showMessage('Chyba', 'Odkaz na Google Maps musí byť platná URL adresa.');
            return;
        }

        try {
            const q = query(placesCollectionRef, where("name", "==", name), where("type", "==", type));
            const querySnapshot = await getDocs(q);

            // Check for duplicate place (name and type combination)
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessage('Chyba', `Miesto s názvom "${name}" a typom "${type}" už existuje!`);
                return;
            }

            const placeData = {
                type: type,
                name: name,
                address: address,
                googleMapsUrl: googleMapsUrl,
                createdAt: new Date()
            };

            if (id) {
                await setDoc(doc(placesCollectionRef, id), placeData, { merge: true });
                await showMessage('Úspech', 'Miesto úspešne upravené!');
            } else {
                await addDoc(placesCollectionRef, placeData);
                await showMessage('Úspech', 'Miesto úspešne pridané!');
            }
            closeModal(placeModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní miesta:", error);
            await showMessage('Chyba', `Chyba pri ukladaní miesta. Detail: ${error.message}`);
        }
    });

    /**
     * Handles the submission of the playing day form.
     */
    playingDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('playingDayId').value;
        const date = document.getElementById('playingDayDate').value;

        // Basic validation
        if (!date) {
            await showMessage('Chyba', 'Prosím, zadajte dátum hracieho dňa.');
            return;
        }

        try {
            const q = query(playingDaysCollectionRef, where("date", "==", date));
            const querySnapshot = await getDocs(q);

            // Check for duplicate playing day date
            if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
                await showMessage('Chyba', 'Hrací deň s týmto dátumom už existuje!');
                return;
            }

            const playingDayData = { date: date };

            if (id) {
                await setDoc(doc(playingDaysCollectionRef, id), playingDayData, { merge: true });
                await showMessage('Úspech', 'Hrací deň úspešne upravený!');
            } else {
                await addDoc(playingDaysCollectionRef, { ...playingDayData, createdAt: new Date() });
                await showMessage('Úspech', 'Hrací deň úspešne pridaný!');
            }
            closeModal(playingDayModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri ukladaní hracieho dňa. Detail: ${error.message}`);
        }
    });

    /**
     * Handles the submission of the accommodation assignment form.
     */
    assignAccommodationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = assignmentIdInput.value;
        const assignmentDateFrom = assignmentDateFromSelect.value;
        const assignmentDateTo = assignmentDateToSelect.value;
        const selectedClubName = clubSelect.value;
        const selectedSpecificTeamId = specificTeamSelect.value;
        const selectedAccommodationId = accommodationSelect.value;

        // Basic validation
        if (!assignmentDateFrom || !assignmentDateTo || !selectedClubName || !selectedAccommodationId) {
            await showMessage('Chyba', 'Prosím, vyplňte všetky povinné polia (Dátum od, Dátum do, Klub, Ubytovňa).');
            return;
        }

        // Validate date range
        if (new Date(assignmentDateFrom) > new Date(assignmentDateTo)) {
            await showMessage('Chyba', 'Dátum "Od" nemôže byť po dátume "Do".');
            return;
        }

        try {
            let teamsData = [];
            if (selectedSpecificTeamId) {
                // If a specific team is selected, get only that team
                const teamDoc = await getDoc(doc(clubsCollectionRef, selectedSpecificTeamId));
                if (teamDoc.exists()) {
                    const team = teamDoc.data();
                    teamsData.push({
                        teamId: selectedSpecificTeamId,
                        teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                    });
                } else {
                    await showMessage('Chyba', 'Vybraný konkrétny tím sa nenašiel v databáze.');
                    return;
                }
            } else {
                // If no specific team, get all teams for the base club name
                const allClubsSnapshot = await getDocs(clubsCollectionRef);
                const teamsForBaseClub = [];
                allClubsSnapshot.forEach(doc => {
                    const team = doc.data();
                    // Check if team name matches base club name (handling '⁄' and ' A', ' B' suffixes)
                    if (selectedClubName.includes('⁄')) {
                        if (team.name === selectedClubName) {
                            teamsForBaseClub.push({
                                teamId: doc.id,
                                teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                            });
                        }
                    } else {
                        if (team.name.match(new RegExp(`^${selectedClubName}(?:\\s[A-Z])?$`))) {
                            teamsForBaseClub.push({
                                teamId: doc.id,
                                teamName: `${team.name} (Kat: ${team.categoryName}, Skup: ${team.groupName}, Tím: ${team.orderInGroup})`
                            });
                        }
                    }
                });
                if (teamsForBaseClub.length > 0) {
                    teamsData = teamsForBaseClub;
                } else {
                    await showMessage('Chyba', 'Pre vybraný základný názov klubu sa nenašli žiadne tímy v databáze.');
                    return;
                }
            }

            // Get accommodation name
            const accommodationDoc = await getDoc(doc(placesCollectionRef, selectedAccommodationId));
            let accommodationName = '';
            if (accommodationDoc.exists()) {
                accommodationName = accommodationDoc.data().name;
            } else {
                await showMessage('Chyba', 'Vybraná ubytovňa sa nenašla v databáze.');
                return;
            }

            const assignmentData = {
                dateFrom: assignmentDateFrom,
                dateTo: assignmentDateTo,
                teams: teamsData, // Array of {teamId, teamName}
                accommodationId: selectedAccommodationId,
                accommodationName: accommodationName,
                createdAt: new Date()
            };

            if (id) {
                await setDoc(doc(teamAccommodationsCollectionRef, id), assignmentData, { merge: true });
                await showMessage('Úspech', 'Priradenie ubytovania úspešne upravené!');
            } else {
                await addDoc(teamAccommodationsCollectionRef, assignmentData);
                await showMessage('Úspech', 'Priradenie ubytovania úspešne pridané!');
            }
            closeModal(assignAccommodationModal);
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri ukladaní priradenia ubytovania:", error);
            await showMessage('Chyba', `Chyba pri ukladaní priradenia ubytovania. Detail: ${error.message}`);
        }
    });
});
