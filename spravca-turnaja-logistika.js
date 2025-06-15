import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, busesCollectionRef, teamAccommodationsCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
const SETTINGS_DOC_ID = 'matchTimeSettings';

let draggedMatchId = null; // Global variable to store the ID of the dragged match

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
        const startTime = await getFirstAvailableTimeForDrop(selectedDate, selectedLocationName, duration, bufferTime);
        matchStartTimeInput.value = startTime;
    }
    catch (error) {
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
 * Finds the first available time slot for a match on a given date and location.
 * @param {string} date The date string (YYYY-MM-DD).
 * @param {string} locationName The name of the location.
 * @param {number} duration The duration of the match in minutes.
 * @param {number} bufferTime The buffer time after the match in minutes.
 * @returns {Promise<string>} The formatted available start time (HH:MM).
 */
async function getFirstAvailableTimeForDrop(date, locationName, duration, bufferTime) {
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
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && date === sortedPlayingDays[0];

        let [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
        const endSearchHour = 22; // Hardcoded end of search, can be made configurable

        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", date),
            where("location", "==", locationName)
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
            for (let minute = currentMinuteStart; minute < 60; minute++) { // Check every minute for more precision
                const potentialStartInMinutes = hour * 60 + minute;
                const potentialEndInMinutes = potentialStartInMinutes + duration + bufferTime;

                let overlap = false;
                for (const existingEvent of existingEvents) {
                    if (potentialStartInMinutes < existingEvent.end && potentialEndInMinutes > existingEvent.start) {
                        overlap = true;
                        // Move to the end of the overlapping event + 1 minute to check for next slot
                        const nextAvailableTimeInMinutes = existingEvent.end + 1;
                        hour = Math.floor(nextAvailableTimeInMinutes / 60);
                        minute = nextAvailableTimeInMinutes % 60;
                        if (minute === 0 && nextAvailableTimeInMinutes > 0) { // If it rolls over to a new hour exactly
                            hour--; // Re-adjust hour for the loop increment
                        } else if (minute === 0) { // If it was 00 and now 00, special handling
                            minute = -1; // Next iteration will make it 0, then 1, etc.
                        }
                        break; // Break inner loop, continue from new hour/minute
                    }
                }

                if (!overlap) {
                    const formattedHour = String(hour).padStart(2, '0');
                    const formattedMinute = String(minute).padStart(2, '0');
                    return `${formattedHour}:${formattedMinute}`;
                }
            }
        }
        return '08:00'; // Fallback if no slot found till endSearchHour
    } catch (error) {
        console.error("Chyba pri hľadaní prvého dostupného času:", error);
        return '08:00'; // Fallback in case of error
    }
}

/**
 * Calculates new start times for a sequence of matches on a given date and location, ensuring no overlaps.
 * @param {string} date The date string (YYYY-MM-DD).
 * @param {string} locationName The name of the location.
 * @param {Array<Object>} matchesInOrder An array of match objects (including id, duration, bufferTime, categoryId) in their desired sequential order.
 * @returns {Promise<Array<{id: string, startTime: string, date: string, location: string, duration: number, bufferTime: number, categoryId: string, groupId: string, team1Number: number, team2Number: number, team1DisplayName: string, team1ClubName: string, team1ClubId: string, team2DisplayName: string, team2ClubName: string, team2ClubId: string, locationType: string}>>} An array of match updates including all necessary fields for a merge update.
 */
async function calculateSequentialMatchTimes(date, locationName, matchesInOrder) {
    const updatedMatchDetails = [];
    if (matchesInOrder.length === 0) {
        return updatedMatchDetails;
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
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && date === sortedPlayingDays[0];

        let currentTimeInMinutes = 0;
        const [startH, startM] = (isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime).split(':').map(Number);
        currentTimeInMinutes = startH * 60 + startM;

        for (const match of matchesInOrder) {
            // Get category specific duration and buffer time, or use existing if present on match object
            const categorySettings = await getCategoryMatchSettings(match.categoryId);
            const effectiveDuration = match.duration || categorySettings.duration;
            const effectiveBufferTime = match.bufferTime || categorySettings.bufferTime;

            // Ensure the match starts at or after the current calculated time
            const newStartHour = Math.floor(currentTimeInMinutes / 60);
            const newStartMinute = currentTimeInMinutes % 60;
            const formattedStartTime = `${String(newStartHour).padStart(2, '0')}:${String(newStartMinute).padStart(2, '0')}`;

            updatedMatchDetails.push({
                id: match.id,
                date: date,
                location: locationName,
                startTime: formattedStartTime,
                duration: effectiveDuration, // Use effective duration
                bufferTime: effectiveBufferTime, // Use effective bufferTime
                categoryId: match.categoryId,
                groupId: match.groupId,
                team1Number: match.team1Number,
                team2Number: match.team2Number,
                team1DisplayName: match.team1DisplayName, // Keep display names if available
                team1ClubName: match.team1ClubName,
                team1ClubId: match.team1ClubId,
                team2DisplayName: match.team2DisplayName,
                team2ClubName: match.team2ClubName,
                team2ClubId: match.team2ClubId,
                locationType: match.locationType, // Keep location type
            });

            currentTimeInMinutes += effectiveDuration + effectiveBufferTime;
        }
    } catch (error) {
        console.error("Error calculating sequential match times:", error);
        throw error; // Re-throw to be caught by the caller
    }
    return updatedMatchDetails;
}


/**
 * Displays the full match schedule in a new, enhanced table format.
 */
async function displayMatchesAsSchedule() {
    const matchesContainer = document.getElementById('matchesContainer');
    if (!matchesContainer) return;

    matchesContainer.innerHTML = '';
    matchesContainer.insertAdjacentHTML('afterbegin', '<p style="text-align: center; padding: 20px;">Načítavam rozvrh zápasov...</p>');

    try {
        // Fetch all matches
        const matchesQuery = query(matchesCollectionRef, orderBy("date", "asc"), orderBy("location", "asc"), orderBy("startTime", "asc"));
        const matchesSnapshot = await getDocs(matchesQuery);
        let allMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, type: 'match', ...doc.data() }));

        // Fetch categories and groups for display names
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        const categoriesMap = new Map();
        categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data().name || doc.id));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const groupsMap = new Map();
        groupsSnapshot.forEach(doc => groupsMap.set(doc.id, doc.data().name || doc.id));

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

        // Group matches by date and then by location
        const matchesByDateAndLocation = new Map(); // Map<date, Map<location, Array<match>>>
        allMatches.forEach(match => {
            if (!matchesByDateAndLocation.has(match.date)) {
                matchesByDateAndLocation.set(match.date, new Map());
            }
            const locationsMap = matchesByDateAndLocation.get(match.date);
            if (!locationsMap.has(match.location)) {
                locationsMap.set(match.location, []);
            }
            locationsMap.get(match.location).push(match);
        });

        const sortedDates = Array.from(matchesByDateAndLocation.keys()).sort();

        matchesContainer.innerHTML = '';
        let scheduleHtml = `<div class="schedule-overview">`;

        if (sortedDates.length === 0) {
            scheduleHtml += '<p style="text-align: center; padding: 20px; color: #555;">— Žiadne zápasy na zobrazenie —</p>';
        } else {
            sortedDates.forEach(date => {
                const displayDateObj = new Date(date);
                const formattedDisplayDate = `${String(displayDateObj.getDate()).padStart(2, '0')}. ${String(displayDateObj.getMonth() + 1).padStart(2, '0')}. ${displayDateObj.getFullYear()}`;
                
                scheduleHtml += `
                    <div class="schedule-date-block">
                        <h3 class="date-header-clickable" draggable="true" data-date="${date}" title="Kliknutím upravíte hrací deň ${formattedDisplayDate}">
                            ${formattedDisplayDate}
                        </h3>
                `;
                const locationsForThisDate = matchesByDateAndLocation.get(date);
                const sortedLocations = Array.from(locationsForThisDate.keys()).sort();

                sortedLocations.forEach(locationName => {
                    scheduleHtml += `
                        <div class="location-block" data-date="${date}" data-location="${locationName}">
                            <h4 class="location-header">${locationName}</h4>
                            <table class="modern-schedule-table">
                                <thead>
                                    <tr>
                                        <th>Čas</th>
                                        <th>Domáci Tím</th>
                                        <th>Hostia Tím</th>
                                        <th>Kód Tímu</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;

                    const matchesForThisLocation = locationsForThisDate.get(locationName);

                    // Sort matches by start time
                    matchesForThisLocation.sort((a, b) => {
                        const [aH, aM] = a.startTime.split(':').map(Number);
                        const [bH, bM] = b.startTime.split(':').map(Number);
                        return (aH * 60 + aM) - (bH * 60 + bM);
                    });

                    matchesForThisLocation.forEach(match => {
                        const matchEndTime = new Date();
                        const [startH, startM] = match.startTime.split(':').map(Number);
                        matchEndTime.setHours(startH, startM + match.duration, 0, 0);
                        const formattedEndTime = matchEndTime.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });

                        scheduleHtml += `
                            <tr class="schedule-cell-match" draggable="true" data-id="${match.id}" data-type="${match.type}" data-date="${match.date}" data-location="${match.location}" title="Kliknutím upravíte zápas">
                                <td>${match.startTime} - ${formattedEndTime}</td>
                                <td>${match.team1ClubName || 'N/A'}</td>
                                <td>${match.team2ClubName || 'N/A'}</td>
                                <td>${match.team1DisplayName || 'N/A'} vs ${match.team2DisplayName || 'N/A'}</td>
                            </tr>
                        `;
                    });
                    scheduleHtml += `</tbody></table></div>`; // Close location-block table
                });
                scheduleHtml += `</div>`; // Close schedule-date-block
            });
        }

        scheduleHtml += '</div>'; // Close schedule-overview
        matchesContainer.innerHTML = scheduleHtml;

        // Re-add event listeners for editing matches and playing days
        matchesContainer.querySelectorAll('.schedule-cell-match').forEach(element => {
            element.addEventListener('click', (event) => {
                const id = event.currentTarget.dataset.id;
                editMatch(id);
            });
        });

        matchesContainer.querySelectorAll('.date-header-clickable').forEach(header => {
            header.addEventListener('click', (event) => {
                const dateToEdit = header.dataset.date;
                editPlayingDay(dateToEdit);
            });
        });

        // Drag and Drop Event Listeners
        matchesContainer.querySelectorAll('.schedule-cell-match').forEach(row => {
            row.addEventListener('dragstart', (e) => {
                draggedMatchId = e.target.dataset.id; // Store ID in global variable
                e.dataTransfer.setData('text/plain', draggedMatchId); // For older browsers/fallbacks
                e.dataTransfer.setData('match/id', draggedMatchId); // Specific type for our app
                e.target.classList.add('dragging');
                console.log('Drag started for match ID:', draggedMatchId); // Log for debugging
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault(); // Allow drop
                const targetRow = e.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.add('drop-target');
                    e.dataTransfer.dropEffect = 'move'; // Visual feedback for move operation
                }
            });

            row.addEventListener('dragleave', (e) => {
                const targetRow = e.target.closest('tr');
                if (targetRow) {
                    targetRow.classList.remove('drop-target');
                }
            });

            row.addEventListener('drop', async (e) => {
                e.preventDefault();
                // Use the global variable for the dragged match ID
                const matchIdToProcess = draggedMatchId; 

                console.log('Drop event triggered on match row. Captured matchIdToProcess (from global):', matchIdToProcess); // Log for debugging

                // Always clean up drop-target class
                matchesContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));

                if (!matchIdToProcess) {
                    await showMessage('Chyba', 'Presun zápasu zrušený: ID presúvaného zápasu nie je platné.');
                    console.warn("Drop operation cancelled: matchIdToProcess from global is null or empty.");
                    e.target.classList.remove('dragging');
                    return;
                }

                const targetRow = e.target.closest('tr');
                
                const targetMatchId = targetRow ? targetRow.dataset.id : null;
                const newDate = targetRow ? targetRow.dataset.date : null;
                const newLocation = targetRow ? targetRow.dataset.location : null;

                console.log('Target row dataset ID:', targetMatchId); // Debugging
                console.log('Target row dataset Date:', newDate); // Debugging
                console.log('Target row dataset Location:', newLocation); // Debugging

                if (matchIdToProcess === targetMatchId) { 
                    console.log('Dropping onto itself or no effective change, ignoring.');
                    e.target.classList.remove('dragging');
                    return;
                }
                
                // Ensure newDate and newLocation are not null before proceeding
                if (!newDate || !newLocation) {
                    await showMessage('Chyba', 'Cieľové miesto pre presun nie je platné (chýba dátum alebo miesto).');
                    console.error('Target date or location is null:', { newDate, newLocation });
                    e.target.classList.remove('dragging');
                    return;
                }

                try {
                    const draggedMatchDoc = await getDoc(doc(matchesCollectionRef, matchIdToProcess));
                    if (!draggedMatchDoc.exists()) {
                        await showMessage('Chyba', 'Presúvaný zápas sa nenašiel v databáze.');
                        console.error('Dragged match document not found for ID:', matchIdToProcess);
                        return;
                    }
                    const draggedMatchData = draggedMatchDoc.data();

                    const originalDate = draggedMatchData.date;
                    const originalLocation = draggedMatchData.location;

                    console.log('Original match data - Date:', originalDate, 'Location:', originalLocation); // Debugging
                    console.log('New target - Date:', newDate, 'Location:', newLocation); // Debugging

                    const batch = writeBatch(db);
                    
                    // Handle original location/date block (if different)
                    if (originalDate !== newDate || originalLocation !== newLocation) {
                        // Get all matches from the original block, excluding the dragged one
                        const originalMatchesQuery = query(
                            matchesCollectionRef,
                            where("date", "==", originalDate),
                            where("location", "==", originalLocation)
                        );
                        const originalMatchesSnapshot = await getDocs(originalMatchesQuery);
                        let matchesInOriginalBlock = originalMatchesSnapshot.docs
                            .map(doc => ({ id: doc.id, ...doc.data() }))
                            .filter(match => match.id !== matchIdToProcess)
                            .sort((a, b) => {
                                const [aH, aM] = (a.startTime || '00:00').split(':').map(Number);
                                const [bH, bM] = (b.startTime || '00:00').split(':').map(Number);
                                return (aH * 60 + aM) - (bH * 60 + bM);
                            });
                        
                        const updatedOriginalMatches = await calculateSequentialMatchTimes(originalDate, originalLocation, matchesInOriginalBlock);
                        updatedOriginalMatches.forEach(update => {
                            batch.update(doc(matchesCollectionRef, update.id), update);
                        });
                    }

                    // Handle new location/date block
                    const newMatchesQuery = query(
                        matchesCollectionRef,
                        where("date", "==", newDate),
                        where("location", "==", newLocation)
                    );
                    const newMatchesSnapshot = await getDocs(newMatchesQuery);
                    
                    let matchesInNewBlock = newMatchesSnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(match => match.id !== matchIdToProcess)
                        .sort((a, b) => {
                            const [aH, aM] = (a.startTime || '00:00').split(':').map(Number);
                            const [bH, bM] = (b.startTime || '00:00').split(':').map(Number);
                            return (aH * 60 + aM) - (bH * 60 + bM);
                        });

                    let insertionIndex = 0;
                    if (targetMatchId) {
                        insertionIndex = matchesInNewBlock.findIndex(match => match.id === targetMatchId);
                        const targetRect = targetRow.getBoundingClientRect();
                        const mouseY = e.clientY;
                        const insertAfter = (mouseY > (targetRect.top + targetRect.height / 2));
                        if (insertionIndex !== -1 && insertAfter) {
                            insertionIndex++;
                        } else if (insertionIndex === -1) {
                            insertionIndex = matchesInNewBlock.length; // Append if target not found (e.g., re-dropping current item)
                        }
                    } else { // Dropped on an empty space (e.g. into tbody not on a specific row)
                         insertionIndex = matchesInNewBlock.length; // Append to end
                    }

                    const draggedMatchDataForNewBlock = { ...draggedMatchData, date: newDate, location: newLocation };
                    let orderedMatchesInNewBlock = [
                        ...matchesInNewBlock.slice(0, insertionIndex),
                        draggedMatchDataForNewBlock,
                        ...matchesInNewBlock.slice(insertionIndex)
                    ];
                    
                    const updatedNewMatches = await calculateSequentialMatchTimes(newDate, newLocation, orderedMatchesInNewBlock);
                    updatedNewMatches.forEach(update => {
                        batch.update(doc(matchesCollectionRef, update.id), update);
                    });

                    await batch.commit();
                    await showMessage('Úspech', 'Zápas úspešne presunutý a časy aktualizované! Rozvrh sa aktualizuje.');
                    await displayMatchesAsSchedule(); // Refresh display
                } catch (error) {
                    console.error("Chyba pri presune zápasu (zachytená chyba):", error);
                    await showMessage('Chyba', `Chyba pri presune zápasu: ${error.message}`);
                }
                e.target.classList.remove('dragging');
                draggedMatchId = null; // Reset after drop
            });
            
            row.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                draggedMatchId = null;
                // Remove drop-target class from any elements that might still have it
                matchesContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            });
        });

        // Add dragover/dragleave/drop to location blocks for dropping into an empty location block
        matchesContainer.querySelectorAll('.location-block').forEach(locationBlock => {
            locationBlock.addEventListener('dragover', (e) => {
                e.preventDefault(); // Allow drop
                // Only add drop-target if dropping on the table body, not the header or other parts
                const target = e.target.closest('tbody');
                if (target) {
                    target.classList.add('drop-target');
                }
            });

            locationBlock.addEventListener('dragleave', (e) => {
                const target = e.target.closest('tbody');
                if (target) {
                    target.classList.remove('drop-target');
                }
            });

            locationBlock.addEventListener('drop', async (e) => {
                e.preventDefault();
                // Use the global variable for the dragged match ID
                const matchIdToProcess = draggedMatchId;

                console.log('Drop event triggered on location block. Captured matchIdToProcess (from global, location block):', matchIdToProcess); // Log for debugging

                const targetTbody = e.target.closest('tbody');
                if (targetTbody) {
                    targetTbody.classList.remove('drop-target');
                }
                const targetLocationBlock = e.target.closest('.location-block');
                const newDate = targetLocationBlock ? targetLocationBlock.dataset.date : null;
                const newLocation = targetLocationBlock ? targetLocationBlock.dataset.location : null;
                
                console.log('Target location block dataset Date:', newDate); // Debugging
                console.log('Target location block dataset Location:', newLocation); // Debugging

                if (!matchIdToProcess || !newDate || !newLocation) {
                    await showMessage('Chyba', 'Presun zápasu zrušený: ID presúvaného zápasu alebo detaily cieľa chýbajú.');
                    console.warn("Drop operation cancelled: matchIdToProcess or target details are null.");
                    e.target.classList.remove('dragging');
                    return;
                }

                try {
                    const draggedMatchDoc = await getDoc(doc(matchesCollectionRef, matchIdToProcess));
                    if (!draggedMatchDoc.exists()) {
                        await showMessage('Chyba', 'Presúvaný zápas sa nenašiel v databáze.');
                        console.error('Dragged match document not found for ID:', matchIdToProcess);
                        return;
                    }
                    const draggedMatchData = draggedMatchDoc.data();

                    const originalDate = draggedMatchData.date;
                    const originalLocation = draggedMatchData.location;

                    console.log('Original match data - Date:', originalDate, 'Location:', originalLocation); // Debugging
                    console.log('New target - Date:', newDate, 'Location:', newLocation); // Debugging

                    const batch = writeBatch(db);

                    // Handle original location/date block (if different)
                    if (originalDate !== newDate || originalLocation !== newLocation) {
                        const originalMatchesQuery = query(
                            matchesCollectionRef,
                            where("date", "==", originalDate),
                            where("location", "==", originalLocation)
                        );
                        const originalMatchesSnapshot = await getDocs(originalMatchesQuery);
                        let matchesInOriginalBlock = originalMatchesSnapshot.docs
                            .map(doc => ({ id: doc.id, ...doc.data() }))
                            .filter(match => match.id !== matchIdToProcess)
                            .sort((a, b) => {
                                const [aH, aM] = (a.startTime || '00:00').split(':').map(Number);
                                const [bH, bM] = (b.startTime || '00:00').split(':').map(Number);
                                return (aH * 60 + aM) - (bH * 60 + bM);
                            });
                        
                        const updatedOriginalMatches = await calculateSequentialMatchTimes(originalDate, originalLocation, matchesInOriginalBlock);
                        updatedOriginalMatches.forEach(update => {
                            batch.update(doc(matchesCollectionRef, update.id), update);
                        });
                    }

                    // Handle new location/date block
                    const newMatchesQuery = query(
                        matchesCollectionRef,
                        where("date", "==", newDate),
                        where("location", "==", newLocation)
                    );
                    const newMatchesSnapshot = await getDocs(newMatchesQuery);
                    
                    let matchesInNewBlock = newMatchesSnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() }))
                        .filter(match => match.id !== matchIdToProcess)
                        .sort((a, b) => {
                            const [aH, aM] = (a.startTime || '00:00').split(':').map(Number);
                            const [bH, bM] = (b.startTime || '00:00').split(':').map(Number);
                            return (aH * 60 + aM) - (bH * 60 + bM);
                        });

                    // For dropping into a location block (not on a specific row), we append to the end.
                    matchesInNewBlock.push({ ...draggedMatchData, date: newDate, location: newLocation });

                    const updatedNewMatches = await calculateSequentialMatchTimes(newDate, newLocation, matchesInNewBlock);
                    updatedNewMatches.forEach(update => {
                        batch.update(doc(matchesCollectionRef, update.id), update);
                    });

                    await batch.commit();
                    await showMessage('Úspech', 'Zápas úspešne presunutý a časy aktualizované! Rozvrh sa aktualizuje.');
                    await displayMatchesAsSchedule(); // Refresh display
                } catch (error) {
                    console.error("Chyba pri presune zápasu na prázdny blok (zachytená chyba):", error);
                    await showMessage('Chyba', `Chyba pri presune zápasu: ${error.message}`);
                }
                draggedMatchId = null; // Reset after drop
            });

            locationBlock.addEventListener('dragend', (e) => {
                // Clean up dragging classes
                e.target.classList.remove('dragging');
                matchesContainer.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            });
        });


    } catch (error) {
        console.error("Chyba pri načítaní rozvrhu zápasov (zachytená chyba):", error);
        matchesContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 20px; border: 1px solid #ff0000; background-color: #ffe0e0; color: #ff0000; border-radius: 8px;">
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

            // Delete associated bus routes (STILL NEEDED IF YOU WANT TO DELETE BUSES FROM DB)
            const busesQuery = query(busesCollectionRef, where("date", "==", dateToDelete));
            const busesSnapshot = await getDocs(busesQuery);
            busesSnapshot.docs.forEach(busDoc => {
                batch.delete(doc(busesCollectionRef, busDoc.id));
            });

            // Delete associated accommodation assignments (STILL NEEDED IF YOU WANT TO DELETE ACCOMMODATIONS FROM DB)
            const allAccommodationsSnapshot = await getDocs(teamAccommodationsCollectionRef);
            const dateToDeleteObj = new Date(dateToDelete);
            dateToDeleteObj.setHours(0, 0, 0, 0);

            allAccommodationsSnapshot.docs.forEach(accDoc => {
                const assignment = accDoc.data();
                const assignmentDateFrom = new Date(assignment.dateFrom);
                const assignmentDateTo = new Date(assignment.dateTo);

                assignmentDateFrom.setHours(0, 0, 0, 0);
                assignmentDateTo.setHours(0, 0, 0, 0);

                if (dateToDeleteObj >= assignmentDateFrom && dateToDeleteObj <= assignmentDateTo) {
                    batch.delete(doc(teamAccommodationsCollectionRef, accDoc.id));
                }
            });

            await batch.commit();
            await showMessage('Úspech', `Hrací deň ${dateToDelete} a všetky súvisiace zápasy, autobusové linky a priradenia ubytovania, ktoré sa prekrývali s týmto dňom, boli vymazané!`);
            closeModal(document.getElementById('playingDayModal'));
            await displayMatchesAsSchedule();
        } catch (error) {
            console.error("Chyba pri mazaní hracieho dňa:", error);
            await showMessage('Chyba', `Chyba pri mazaní hracieho dňa. Detail: ${error.message}`);
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

            // Delete associated bus routes (both as start and end location) (STILL NEEDED IF YOU WANT TO DELETE BUSES FROM DB)
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

            // If it's an accommodation, delete associated team accommodations (STILL NEEDED IF YOU WANT TO DELETE ACCOMMODATIONS FROM DB)
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
            await showMessage('Chyba', `Chyba pri mazaní miesta. Detail: ${error.message}`);
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
 * This function handles the update of a match's properties directly in the database.
 * It's designed to be used after a drag-and-drop operation or any other
 * scenario where a match's details (like date, location, start time) need
 * to be updated programmatically, without opening a modal.
 * * @param {string} matchId The ID of the match to update.
 * @param {object} updates An object containing the fields to update for the match.
 * Example: { date: 'YYYY-MM-DD', location: 'New Hall', startTime: 'HH:MM' }
 */
async function updateMatchDataDirectly(matchId, updates) {
    try {
        const matchDocRef = doc(matchesCollectionRef, matchId);
        await updateDoc(matchDocRef, updates);
        console.log(`Match ${matchId} updated directly with:`, updates);
    } catch (error) {
        console.error(`Error updating match ${matchId} directly:`, error);
        await showMessage('Chyba', `Chyba pri priamej aktualizácii zápasu ${matchId}. Detail: ${error.message}`);
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
        const busEndTimeInput = document.getElementById('busEndTimeInput'); 
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
    // Removed direct references to addBusButton and assignAccommodationButton from constants
    // const addBusButton = document.getElementById('addBusButton');
    // const assignAccommodationButton = document.getElementById('assignAccommodationButton');

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

    // Removed bus and accommodation modals and their related elements from constants
    // const busModal = document.getElementById('busModal');
    // const closeBusModalButton = document.getElementById('closeBusModal');
    // const busForm = document.getElementById('busForm');
    // ... and so on for bus and accommodation elements

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

    // Hidden as per user request to only show matches
    const addBusButtonElement = document.getElementById('addBusButton');
    if (addBusButtonElement) {
        addBusButtonElement.style.display = 'none';
    }

    const assignAccommodationButtonElement = document.getElementById('assignAccommodationButton');
    if (assignAccommodationButtonElement) {
        assignAccommodationButtonElement.style.display = 'none';
    }

    // Close modal event listeners - only keep for relevant modals
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

    // Removed close listeners for bus and accommodation modals
    // closeBusModalButton.addEventListener('click', () => { /* ... */ });
    // closeAssignAccommodationModalButton.addEventListener('click', () => { /* ... */ });

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

    // Removed event listeners for dynamic updates in accommodation assignment form
    // if (clubSelect) { clubSelect.addEventListener('change', async () => { /* ... */ }); }
    // if (assignmentDateFromSelect) { assignmentDateFromSelect.addEventListener('change', async () => { /* ... */ }); }
    // if (assignmentDateToSelect) { assignmentDateToSelect.addEventListener('change', async () => { /* ... */ }); }

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
                const dateObj = new Date(overlappingExistingMatchDetails.date);
                const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}. ${String(dateObj.getMonth() + 1).padStart(2, '0')}. ${dateObj.getFullYear()}`; // Added .getFullYear()
                await showMessage('Chyba', `Tímy ${team1Result.fullDisplayName} a ${team2Result.fullDisplayName} už proti sebe hrali v kategórii ${categoriesMap.get(matchCategory)} a v skupine ${groupsMap.get(matchGroup)} dňa ${formattedDate} o ${overlappingExistingMatchDetails.startTime}. Prosím, zadajte iné tímy.`);
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
                      `Tímy: ${overlappingMatchDetails.team1ClubName} vs ${overlappingMatchDetails.team2ClubName}\n\n` +
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
    // busForm.addEventListener('submit', async (e) => { /* ... removed ... */ });

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
    // assignAccommodationForm.addEventListener('submit', async (e) => { /* ... removed ... */ });
});
