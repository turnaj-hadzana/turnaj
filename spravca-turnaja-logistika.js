import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, matchesCollectionRef, playingDaysCollectionRef, placesCollectionRef, openModal, closeModal, populateCategorySelect, populateGroupSelect, getDocs, doc, setDoc, addDoc, getDoc, query, where, orderBy, deleteDoc, writeBatch, settingsCollectionRef, showMessage, showConfirmation } from './spravca-turnaja-common.js';
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
 * This function remains as places are still relevant for matches.
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
 * This function no longer updates the match start time.
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
    // Removed: findFirstAvailableTime() - per user request, category change should not update start time.
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
 * @returns {Promise<{fullDisplayName: string|null, clubName: string|null, clubId: string|null, shortDisplayName: string|null}>} Team display information.
 */
const getTeamName = async (categoryId, groupId, teamNumber, categoriesMap, groupsMap) => {
    if (!categoryId || !groupId || !teamNumber) {
        return { fullDisplayName: null, clubName: null, clubId: null, shortDisplayName: null };
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
        const shortDisplayName = `${shortGroupName}${teamNumber}`; // Display name without category

        return {
            fullDisplayName: fullDisplayName,
            clubName: clubName,
            clubId: clubId,
            shortDisplayName: shortDisplayName // Return the new short display name
        };
    } catch (error) {
        console.error("Chyba pri získavaní názvu tímu:", error);
        return { fullDisplayName: `Chyba`, clubName: `Chyba`, clubId: null, shortDisplayName: `Chyba` };
    }
};

/**
 * Calculates the next available start time for a match given a previous match's end time and buffer.
 * @param {string} prevEndTime HH:MM string of the previous match's end time.
 * @param {number} prevBufferTime Buffer time in minutes after the previous match.
 * @returns {string} HH:MM string of the next available start time.
 */
function calculateNextAvailableTime(prevStartTime, duration, bufferTime) {
    let [prevH, prevM] = prevStartTime.split(':').map(Number);
    let totalMinutes = (prevH * 60) + prevM + duration + bufferTime;

    let newH = Math.floor(totalMinutes / 60);
    let newM = totalMinutes % 60;

    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}


/**
 * Recalculates and reschedules matches for a specific date and location after a drag & drop operation.
 * This function handles inserting a match and shifting subsequent matches' times,
 * attempting to preserve existing time gaps where possible.
 * @param {string} draggedMatchId The ID of the match that was dragged.
 * @param {string} targetDate The date of the drop target.
 * @param {string} targetLocation The location of the drop target.
 * @param {string|null} droppedBeforeMatchId The ID of the match the dragged match was dropped before, or null if dropped at the end.
 */
async function moveAndRescheduleMatch(draggedMatchId, targetDate, targetLocation, droppedBeforeMatchId = null) {
    try {
        const draggedMatchDocRef = doc(matchesCollectionRef, draggedMatchId);
        const draggedMatchDoc = await getDoc(draggedMatchDocRef);
        if (!draggedMatchDoc.exists()) {
            await showMessage('Chyba', 'Presúvaný zápas nebol nájdený.');
            return;
        }
        const movedMatchData = { id: draggedMatchDoc.id, ...draggedMatchDoc.data() };

        const originalDate = movedMatchData.date;
        const originalLocation = movedMatchData.location;

        const isMovingWithinSameSchedule = (originalDate === targetDate && originalLocation === targetLocation);

        const batch = writeBatch(db);

        // 1. Get all matches for the target date and location, remembering their original start times for gap preservation
        const existingMatchesQuery = query(
            matchesCollectionRef,
            where("date", "==", targetDate),
            where("location", "==", targetLocation),
            orderBy("startTime", "asc")
        );
        const existingMatchesSnapshot = await getDocs(existingMatchesQuery);
        let matchesForReschedule = existingMatchesSnapshot.docs
            .map(doc => ({ id: doc.id, originalStartTime: doc.data().startTime, ...doc.data() })) // Store originalStartTime
            .filter(match => match.id !== draggedMatchId); // Exclude the dragged match itself

        // 2. Determine initial start time for the day
        const settingsDoc = await getDoc(doc(settingsCollectionRef, SETTINGS_DOC_ID));
        let firstDayStartTime = '08:00';
        let otherDaysStartTime = '08:00';
        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            firstDayStartTime = data.firstDayStartTime || '08:00';
            otherDaysStartTime = data.otherDaysStartTime || '08:00';
        }
        const playingDaysSnapshot = await getDocs(query(playingDaysCollectionRef, orderBy("date", "asc")));
        const sortedPlayingDays = playingDaysSnapshot.docs.map(d => d.data().date).sort();
        const isFirstPlayingDay = sortedPlayingDays.length > 0 && targetDate === sortedPlayingDays[0];
        const initialStartTimeForDay = isFirstPlayingDay ? firstDayStartTime : otherDaysStartTime;

        // 3. Determine the insertion point and the new start time for the moved match
        let newStartTimeForMovedMatch;
        let insertionIndex = matchesForReschedule.length; // Default to append at the end

        if (droppedBeforeMatchId) {
            const targetMatchIndex = matchesForReschedule.findIndex(m => m.id === droppedBeforeMatchId);
            if (targetMatchIndex !== -1) {
                insertionIndex = targetMatchIndex;
                newStartTimeForMovedMatch = matchesForReschedule[targetMatchIndex].originalStartTime; // Insert at target's original time
            } else {
                // Target match not found (e.g., deleted), find the earliest available slot at the end
                const lastMatch = matchesForReschedule[matchesForReschedule.length - 1];
                newStartTimeForMovedMatch = lastMatch ? calculateNextAvailableTime(lastMatch.startTime, lastMatch.duration, lastMatch.bufferTime) : initialStartTimeForDay;
            }
        } else { // Dropped at the end of the date-group or into an empty one
            const lastMatch = matchesForReschedule[matchesForReschedule.length - 1];
            newStartTimeForMovedMatch = lastMatch ? calculateNextAvailableTime(lastMatch.startTime, lastMatch.duration, lastMatch.bufferTime) : initialStartTimeForDay;
        }

        // Prepare the moved match data for insertion
        const movedMatchUpdatedData = {
            ...movedMatchData,
            date: targetDate,
            location: targetLocation,
            startTime: newStartTimeForMovedMatch,
            // Ensure duration and buffer are from the *moved match's category settings*
            duration: (await getCategoryMatchSettings(movedMatchData.categoryId)).duration,
            bufferTime: (await getCategoryMatchSettings(movedMatchData.categoryId)).bufferTime
        };

        // Insert the moved match into the temporary schedule list
        matchesForReschedule.splice(insertionIndex, 0, movedMatchUpdatedData);

        // 4. If moving from a different schedule, delete the original document
        if (!isMovingWithinSameSchedule) {
            batch.delete(draggedMatchDocRef);
        }

        // 5. Iterate through the updated list and apply times, preserving gaps if possible
        let currentTimePointer = initialStartTimeForDay; // Start from the beginning of the day

        for (let i = 0; i < matchesForReschedule.length; i++) {
            const match = matchesForReschedule[i];
            const matchRef = doc(matchesCollectionRef, match.id);

            // Get duration and buffer for this specific match (important if categories have different settings)
            const categorySettings = await getCategoryMatchSettings(match.categoryId);
            const duration = categorySettings.duration;
            const bufferTime = categorySettings.bufferTime;

            let assignedStartTime;

            if (i === 0) { // First match in the schedule
                assignedStartTime = currentTimePointer;
            } else {
                const [currentPointerH, currentPointerM] = currentTimePointer.split(':').map(Number);
                const currentPointerMinutes = currentPointerH * 60 + currentPointerM;

                const [originalH, originalM] = (match.originalStartTime || "00:00").split(':').map(Number);
                const originalMatchMinutes = originalH * 60 + originalM;

                // If the match's original position was later than the current pointer, preserve the gap,
                // UNLESS it's the moved match itself, in which case use its new calculated time.
                // Or if the originalStartTime is before the currentPointer, just pack it.
                if (match.id === movedMatchData.id) {
                    assignedStartTime = newStartTimeForMovedMatch;
                } else if (originalMatchMinutes > currentPointerMinutes) {
                    assignedStartTime = match.originalStartTime; // Preserve existing gap
                } else {
                    assignedStartTime = currentTimePointer; // Pack closely
                }
            }

            // Update the match document with new date, location, and start time
            batch.set(matchRef, {
                ...match, // Keep all other properties
                date: targetDate, // Ensure date and location are updated if it's a cross-schedule move
                location: targetLocation, // Ensure date and location are updated if it's a cross-schedule move
                startTime: assignedStartTime,
                duration: duration, // Ensure these are up-to-date
                bufferTime: bufferTime // Ensure these are up-to-date
            });

            // Update the current time pointer for the next match
            currentTimePointer = calculateNextAvailableTime(assignedStartTime, duration, bufferTime);

            // Basic check to prevent excessively long schedules
            if (parseInt(currentTimePointer.split(':')[0]) >= 24) {
                console.warn(`Rozvrh pre ${targetDate} v ${targetLocation} presiahol 24:00.`);
            }
        }

        await batch.commit();
        await displayMatchesAsSchedule(); // Refresh the display for all changes
    } catch (error) {
        console.error("Chyba pri presúvaní a prepočítavaní rozvrhu:", error);
        await showMessage('Chyba', `Chyba pri presúvaní zápasu: ${error.message}.`);
        await displayMatchesAsSchedule(); // Refresh to show current state even with error
    }
}
