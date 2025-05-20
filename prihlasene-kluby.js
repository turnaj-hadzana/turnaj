import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsHeaderTable = document.getElementById('clubsHeaderTable');
const clubsBodyTable = document.getElementById('clubsBodyTable');

const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader');
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody');
const longestNameRowFixedBody = document.getElementById('longestNameRowFixedBody');
const clubsBodyTableFooter = document.getElementById('clubsBodyTableFooter');

const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
const teamsInCategoryButtonsDiv = document.getElementById('teamsInCategoryButtons');
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
const selectedTeamNameSpan = document.getElementById('selectedTeamName');
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');

let allClubs = [];
let allCategories = [];
let allGroups = [];
let referringPage = ''; // This will still store the initial referrer for display/debug purposes

// NEW: Key for sessionStorage to store the "return to" URL
const REFERRING_PAGE_KEY = 'tournament_referring_page';

async function loadAllData() {
    try {
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        alert('Nepodarilo sa načítať dáta turnaja.');
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (clubsSummaryTableBody) {
            const numPotentialColumns = 1 + 1 + (allCategories ? allCategories.length : 0);
            clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numPotentialColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
        allClubs = [];
        allCategories = [];
        allGroups = [];
        history.replaceState({}, '', window.location.pathname);
    }
}

function getClubBaseName(club) {
    let initialBaseName;
    if (club.name && typeof club.name === 'string' && club.name.trim() !== '') {
        initialBaseName = club.name.trim();
    } else if (club.id && typeof club.id === 'string' && club.id.includes(' - ')) {
        initialBaseName = club.id.split(' - ')[0].trim();
    } else {
        initialBaseName = club.name || club.id || 'Neznámy subjekt';
    }

    const trailingSuffixRegex = /\s+([A-Z]{1,3}|\d+)$/;
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        initialBaseName = initialBaseName.substring(0, match.index).trim();
    }
    return initialBaseName;
}

function updateColgroups() {
    const numColumns = 1 + 1 + allCategories.length;

    const updateTableColgroup = (table) => {
        if (table) {
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                if (table.firstElementChild) {
                    table.insertBefore(colgroup, table.firstElementChild);
                } else {
                    table.appendChild(colgroup);
                }
            }
            colgroup.innerHTML = '';
            for (let i = 0; i < numColumns; i++) {
                colgroup.appendChild(document.createElement('col'));
            }
        }
    };

    updateTableColgroup(clubsHeaderTable);
    updateTableColgroup(clubsBodyTable);
}

function updateHeaderAndFooter() {
    updateColgroups();

    if (clubsSummaryTableHeader) {
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
        const firstTh = clubsSummaryTableHeader.querySelector('th');
        if (firstTh) {
            firstTh.insertAdjacentElement('afterend', teamsTh);
        } else {
            clubsSummaryTableHeader.appendChild(teamsTh);
        }

        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id;
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                clubsSummaryTableHeader.appendChild(th);
            });
        }
        removeTransparentRows(clubsSummaryTableHeader.parentElement);
    }

    if (clubsBodyTableFooter) {
        clubsBodyTableFooter.innerHTML = '';
        const footerRow = document.createElement('tr');
        const firstFooterCell = document.createElement('th');
        firstFooterCell.textContent = '';
        footerRow.appendChild(firstFooterCell);

        const teamsFooterTh = document.createElement('th');
        teamsFooterTh.textContent = 'Tímy';
        teamsFooterTh.style.textAlign = 'center';
        footerRow.appendChild(teamsFooterTh);

        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const footerTh = document.createElement('th');
                footerTh.textContent = category.name || category.id;
                footerTh.style.textAlign = 'center';
                footerRow.appendChild(footerTh);
            });
        }
        clubsBodyTableFooter.appendChild(footerRow);
        removeTransparentRows(clubsBodyTableFooter);
    }

    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow && firstRow.cells.length === 1 && firstRow.cells[0].hasAttribute('colspan')) {
            const cell = firstRow.cells[0];
            const numColumns = 1 + 1 + allCategories.length;
            cell.colSpan = numColumns;
        }
    }
}


function displayClubsSummaryTable() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = '';
    if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
    if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
    if (selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
    if (selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !longestNameRowFixedBody || !clubsBodyTableFooter || !clubsHeaderTable || !clubsBodyTable) {
        console.error("Chyba: Chýba jeden alebo viac elementov tabuľky.");
        return;
    }

    clubsSummaryTableBody.innerHTML = '';
    longestNameRowFixedBody.innerHTML = '';

    updateHeaderAndFooter();

    if (allClubs.length === 0) {
        const numColumns = 1 + 1 + allCategories.length;
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = numColumns;
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';

        longestNameRowFixedBody.innerHTML = '';
        if (clubsBodyTableFooter) {
            clubsBodyTableFooter.innerHTML = '';
            const footerRow = clubsBodyTableFooter.insertRow();
            const footerCell = footerRow.insertCell();
            footerCell.colSpan = numColumns;
            footerCell.textContent = '';
        }
        return;
    }

    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    let longestBaseName = '';
    let clubsForLongestBaseName = [];

    if (sortedBaseNames.length > 0) {
        const baseNamesWithClubs = sortedBaseNames.filter(name => clubsByBaseName[name] && clubsByBaseName[name].length > 0);
        if (baseNamesWithClubs.length > 0) {
            longestBaseName = baseNamesWithClubs.reduce((a, b) => a.length > b.length ? a : b);
            clubsForLongestBaseName = allClubs.filter(club => getClubBaseName(club) === longestBaseName);
        }
    }

    if (longestBaseName) {
        const longestNameRow = longestNameRowFixedBody.insertRow();
        longestNameRow.dataset.baseName = longestBaseName;
        longestNameRow.dataset.isFixedHeader = 'true';

        const cellBaseName = longestNameRow.insertCell();
        cellBaseName.textContent = longestBaseName;

        let totalTeamsCount = 0;
        allCategories.forEach(category => {
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            totalTeamsCount += teamsInCategoryCount;
        });

        const cellTotalTeams = longestNameRow.insertCell();
        cellTotalTeams.textContent = totalTeamsCount > 0 ? totalTeamsCount.toString() : '';
        cellTotalTeams.style.textAlign = 'center';
        cellTotalTeams.dataset.isCountCell = 'true';

        allCategories.forEach(category => {
            const countCell = longestNameRow.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount.toString() : '';
            countCell.style.textAlign = 'center';
            countCell.dataset.isCountCell = 'true';
            countCell.dataset.categoryId = categoryId;
        });
        longestNameRow.dataset.totalTeams = totalTeamsCount;
        longestNameRow.dataset.hasTeams = totalTeamsCount > 0;
    }

    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const url = new URL(window.location.href);
            url.searchParams.set('club', baseName);
            url.searchParams.delete('team');
            history.pushState({ baseName: baseName }, '', url.toString());

            displaySubjectDetails(baseName);
        });

        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName;

        let totalTeamsCount = 0;
        allCategories.forEach(category => {
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            totalTeamsCount += teamsInCategoryCount;
        });

        const totalTeamsCell = row.insertCell();
        totalTeamsCell.textContent = totalTeamsCount.toString();
        totalTeamsCell.style.textAlign = 'center';
        totalTeamsCell.dataset.isCountCell = 'true';

        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount.toString() : '';
            countCell.style.textAlign = 'center';
            countCell.dataset.isCountCell = 'true';
            countCell.dataset.categoryId = categoryId;
        });
        row.dataset.totalTeams = totalTeamsCount;
        row.dataset.hasTeams = totalTeamsCount > 0;
    });

    requestAnimationFrame(() => {
        adjustTableWidthsAndCleanUp();
    });
}

function adjustTableWidthsAndCleanUp() {
    if (!clubsHeaderTable || !clubsBodyTable || !clubsSummaryTableBody || !longestNameRowFixedBody) {
        console.error("Chyba: Chýba jeden alebo viac elementov tabuľky pre úpravu šírok a čistenie.");
        if (clubsSummaryTableBody) {
            cleanUpZeroRows();
        }
        return;
    }

    const headerCols = clubsHeaderTable.querySelectorAll('colgroup col');
    const bodyCols = clubsBodyTable.querySelectorAll('colgroup col');
    const numColumns = headerCols.length;

    if (numColumns === 0) {
        console.warn("Neboli nájdené žiadne stĺpce (<col>). Úprava šírky preskočená.");
        cleanUpZeroRows();
        return;
    }

    const columnWidths = Array(numColumns).fill(0);

    const fixedRow = longestNameRowFixedBody.querySelector('tr');
    if (fixedRow && fixedRow.cells.length === numColumns) {
        Array.from(fixedRow.cells).forEach((cell, index) => {
            columnWidths[index] = Math.max(columnWidths[index], cell.getBoundingClientRect().width);
        });
    }

    const rowsToMeasure = Array.from(clubsSummaryTableBody.querySelectorAll('tr'));

    rowsToMeasure.forEach(row => {
        if (row.cells.length === numColumns) {
            Array.from(row.cells).forEach((cell, index) => {
                columnWidths[index] = Math.max(columnWidths[index], cell.getBoundingClientRect().width);
            });
        }
    });

    columnWidths.forEach((width, index) => {
        const finalWidth = width;

        if (headerCols[index]) {
            headerCols[index].style.width = `${finalWidth}px`;
        }
        if (bodyCols[index]) {
            bodyCols[index].style.width = `${finalWidth}px`;
        }
    });

    removeTransparentRows(clubsSummaryTableBody);
    removeTransparentRows(longestNameRowFixedBody);
    removeTransparentRows(clubsSummaryTableHeader);

    cleanUpZeroRows();
}

function cleanUpZeroRows() {
    if (!clubsSummaryTableBody || !longestNameRowFixedBody) {
        console.error("Chyba: Chýba tbody element pre čistenie riadkov.");
        return;
    }

    const rowsToRemove = [];
    clubsSummaryTableBody.querySelectorAll('tr').forEach(row => {
        if (row.dataset.totalTeams === '0') {
            rowsToRemove.push(row);
        }
    });

    rowsToRemove.forEach(row => {
        row.remove();
    });

    if (clubsSummaryTableBody.children.length === 0) {
        const numColumns = 1 + 1 + allCategories.length;
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = numColumns;
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad s prihlásenými tímami.";
        cell.style.textAlign = 'center';
    }

    const fixedRow = longestNameRowFixedBody.querySelector('tr');
    if (fixedRow && clubsSummaryTableBody.children.length === 1 && clubsSummaryTableBody.querySelector('td[colspan]')) {
        fixedRow.style.display = 'none';
    } else if (fixedRow) {
        fixedRow.style.display = '';
    }
}

function highlightTeamButton(teamIdToHighlight) {
    if (teamsInCategoryButtonsDiv) {
        teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
            btn.style.fontWeight = 'normal';
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.classList.remove('active-team-button');
        });
        const targetButton = teamsInCategoryButtonsDiv.querySelector(`button[data-team-id="${teamIdToHighlight}"]`);
        if (targetButton) {
            targetButton.style.fontWeight = 'bold';
            targetButton.style.backgroundColor = '#c46f50';
            targetButton.classList.add('active-team-button');
        }
    }
}

async function displaySubjectDetails(baseName, initialTeamId = null) {
    if (clubListSection) clubListSection.style.display = 'none';
    if (clubDetailSection) clubDetailSection.style.display = 'block';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = 'Načítavam tímy...';
    if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
    if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
    if (selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
    if (selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

    const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === baseName);

    if (!teamsInCategoryButtonsDiv) {
        console.error("HTML element s ID 'teamsInCategoryButtons' nebol nájdený.");
        return;
    }
    teamsInCategoryButtonsDiv.innerHTML = '';

    if (teamsForSubject.length === 0) {
        const noTeamsMessage = document.createElement('p');
        noTeamsMessage.textContent = `Žiadne tímy pre subjekt "${baseName}".`;
        teamsInCategoryButtonsDiv.appendChild(noTeamsMessage);
        if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
    } else {
        teamsForSubject.sort((a, b) => {
            const categoryA = allCategories.find(cat => cat.id === a.categoryId);
            const categoryNameA = (categoryA && categoryA.name) ? categoryA.name : (a.categoryId || 'Neznáma kategória');
            const groupA = allGroups.find(g => g.id === a.groupId);
            const groupNameA = groupA ? (groupA.name || groupA.id) : 'Nepriradené';
            const teamTextA = `${categoryNameA}${groupNameA !== 'Nepriradené' ? ' - ' + groupNameA : ''}`;
            const categoryB = allCategories.find(cat => cat.id === b.categoryId);
            const categoryNameB = (categoryB && categoryB.name) ? categoryNameB : (b.categoryId || 'Neznáma kategória');
            const groupB = allGroups.find(g => g.id === b.groupId);
            const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
            const teamTextB = `${categoryNameB}${groupNameB !== 'Nepriradené' ? ' - ' + groupNameB : ''}`;
            return teamTextA.localeCompare(teamTextB, 'sk-SK');
        });

        teamsForSubject.forEach(team => {
            const teamButton = document.createElement('button');
            teamButton.classList.add('action-button');

            const group = allGroups.find(g => g.id === team.groupId);
            const groupName = group ? (group.name || group.id) : 'Nepriradené';
            let categoryName = 'Neznáma kategória';
            const category = allCategories.find(cat => cat.id === team.categoryId);

            if (category && category.name) {
                categoryName = category.name;
            } else {
                const teamIdString = team.id || '';
                const separator = ' - ';
                let separatorIndex = teamIdString.indexOf(separator);
                if (separatorIndex === -1) {
                    separatorIndex = teamIdString.indexOf('-');
                }
                if (separatorIndex !== -1) {
                    categoryName = teamIdString.substring(0, separatorIndex).trim();
                }
            }

            const buttonText = groupName !== 'Nepriradené' ? `${categoryName} - ${groupName}` : categoryName;
            teamButton.textContent = buttonText;
            teamButton.dataset.teamId = team.id;

            teamButton.addEventListener('click', () => {
                const url = new URL(window.location.href);
                url.searchParams.set('club', baseName);
                url.searchParams.set('team', team.id);
                history.pushState({ baseName: baseName, teamId: team.id }, '', url.toString());

                displaySpecificTeamDetails(team.id);
            });

            teamsInCategoryButtonsDiv.appendChild(teamButton);
        });

        const teamToDisplay = (initialTeamId && teamsForSubject.find(t => t.id === initialTeamId))
            ? teamsForSubject.find(t => t.id === initialTeamId)
            : (teamsForSubject.length > 0 ? teamsForSubject[0] : null);

        if (teamToDisplay) {
            displaySpecificTeamDetails(teamToDisplay.id);
        } else {
            if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
        }
    }
}


async function displaySpecificTeamDetails(teamId) {
    if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'block';
    if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Načítavam...';
    if (selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p>Tréner: Načítavam...</p><p>Vedúci družstva: Načítavam...</p>';
    if (selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Načítavam súpisku...</li>';

    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        const teamDoc = await getDoc(teamDocRef);

        if (!teamDoc.exists()) {
            console.warn(`Tím s ID "${teamId}" sa nenašiel v databáze.`);
            if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba: Tím nenájdený';
            if (selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Detail tímu sa nepodarilo načítať.</p>';
            if (selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            highlightTeamButton(null);
            if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
            return;
        }

        const teamData = teamDoc.data();
        const baseName = getClubBaseName(teamData);
        const category = allCategories.find(cat => cat.id === teamData.categoryId);
        const categoryName = (category && category.name) ? category.name : (teamData.categoryId || 'Neznáma kategória');
        const group = allGroups.find(g => g.id === teamData.groupId);
        const groupName = group ? (group.name || group.id) : 'Nepriradené';

        const teamDisplayName = teamData.name && teamData.name.trim() !== ''
            ? teamData.name.trim()
            : `${baseName} - ${categoryName}${groupName !== 'Nepriradené' ? ' - ' + groupName : ''}`;


        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = teamDisplayName;

        if (selectedTeamRealizacnyTimDiv) {
            selectedTeamRealizacnyTimDiv.innerHTML = '';

            const trenerPara = document.createElement('p');
            trenerPara.textContent = 'Tréner: ';
            const trenerSpan = document.createElement('span');
            trenerSpan.textContent = 'Načítavam...';
            trenerPara.appendChild(trenerSpan);
            selectedTeamRealizacnyTimDiv.appendChild(trenerPara);

            const veduciPara = document.createElement('p');
            veduciPara.textContent = 'Vedúci družstva: ';
            const veduciSpan = document.createElement('span');
            veduciSpan.textContent = 'Načítavam...';
            veduciPara.appendChild(veduciSpan);
            selectedTeamRealizacnyTimDiv.appendChild(veduciPara);


            const realizacnyTimCollectionRef = collection(teamDoc.ref, 'realizacnyTim');
            try {
                const realizacnyTimSnapshot = await getDocs(realizacnyTimCollectionRef);
                let trenerName = 'Nezadané';
                let veduciName = 'Nezadané';

                realizacnyTimSnapshot.docs.forEach(staffDoc => {
                    const staffData = staffDoc.data();
                    if (staffDoc.id === 'trener' && staffData && staffData.meno) {
                        trenerName = staffData.meno;
                    } else if (staffDoc.id === 'veduci' && staffData && staffData.meno) {
                        veduciName = staffData.meno;
                    }
                });

                if (trenerSpan) trenerSpan.textContent = trenerName;
                if (veduciSpan) veduciSpan.textContent = veduciName;

            } catch (realizacnyTimError) {
                console.error("Error loading realizacnyTim:", realizacnyTimError);
                if (trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                if (veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
            }
        }

        if (selectedTeamSoupiskaHracovUl) {
            selectedTeamSoupiskaHracovUl.innerHTML = '';

            const hraciCollectionRef = collection(teamDoc.ref, 'hraci');
            try {
                const hraciSnapshot = await getDocs(hraciCollectionRef);

                if (hraciSnapshot.empty) {
                    const noPlayersItem = document.createElement('li');
                    noPlayersItem.textContent = 'Zatiaľ bez súpisky.';
                    selectedTeamSoupiskaHracovUl.appendChild(noPlayersItem);
                } else {
                    const hraciList = hraciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    hraciList.sort((a, b) => {
                        const orderA = typeof a.cisloDresu === 'number' ? a.cisloDresu : Infinity;
                        const orderB = typeof b.cisloDresu === 'number' ? b.cisloDresu : Infinity;

                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }

                        const nameA = (a.meno || a.id || '').toLowerCase();
                        const nameB = (b.meno || b.id || '').toLowerCase();
                        return nameA.localeCompare(nameB, 'sk-SK');
                    });


                    hraciList.forEach(hrac => {
                        const hracItem = document.createElement('li');
                        let hracText = '';
                        if (typeof hrac.cisloDresu === 'number' && hrac.cisloDresu > 0) {
                            hracText += `${hrac.cisloDresu}. `;
                        }
                        hracText += hrac.meno || hrac.id || 'Neznámy hráč';
                        hracItem.textContent = hracText;
                        selectedTeamSoupiskaHracovUl.appendChild(hracItem);
                    });
                }
            } catch (hraciError) {
                console.error("Error loading hraci:", hraciError);
                if (selectedTeamSoupiskaHracovUl) {
                    selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
                }
            }
        }

    } catch (error) {
        console.error("Error displaying team details:", error);
        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba pri načítaní detailov tímu';
        if (selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily realizačného tímu.</p>';
        if (selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
        highlightTeamButton(null);
        if (selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
    } finally {
        highlightTeamButton(teamId);
    }
}

// MODIFIED goBackToList function
function goBackToList() {
    const storedReferringPage = sessionStorage.getItem(REFERRING_PAGE_KEY);

    if (storedReferringPage && storedReferringPage.includes('zobrazenie-skupin.html')) {
        // If the stored referring page was 'zobrazenie-skupin.html', navigate directly to it
        window.location.href = storedReferringPage; // Use window.location.href for direct navigation
    } else {
        // Otherwise, go to the base URL for prihlasene-kluby.html
        displayClubsSummaryTable();
        history.replaceState({}, '', window.location.pathname);
    }
}


function removeTransparentRows(container) {
    if (!container) return;

    const rows = Array.from(container.querySelectorAll('tr'));
    for (const row of rows) {
        const hasTransparentCell = Array.from(row.cells).some(cell => {
            const style = window.getComputedStyle(cell);
            return style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent';
        });

        if (hasTransparentCell) {
            row.remove();
        }
    }
}


// MODIFIED handleUrlState function
async function handleUrlState() {
    await loadAllData();

    // Only set sessionStorage referrer if coming from another page and it's not already set
    // This ensures it captures the *initial* entry point relevant for the "back" button.
    if (document.referrer && !sessionStorage.getItem(REFERRING_PAGE_KEY)) {
        const referrerUrl = new URL(document.referrer); // Parse the referrer URL

        // Check if the referrer's pathname includes 'zobrazenie-skupin.html'
        // This will include the full path, query, and hash (if present in document.referrer)
        if (referrerUrl.pathname.includes('zobrazenie-skupin.html')) {
            // Store the complete referrer URL as is, which should include hash if available
            sessionStorage.setItem(REFERRING_PAGE_KEY, document.referrer);
        } else if (referrerUrl.pathname.includes('prihlasene-kluby.html')) {
             // If coming from prihlasene-kluby.html (e.g., initial load without params),
             // set it to base prihlasene-kluby.html
             sessionStorage.setItem(REFERRING_PAGE_KEY, window.location.origin + window.location.pathname);
        }
         referringPage = referrerUrl.pathname; // Still keep for internal reference if needed
    } else if (!sessionStorage.getItem(REFERRING_PAGE_KEY)) {
        // If no referrer (direct access) and not already set, default to current page's base URL
        sessionStorage.setItem(REFERRING_PAGE_KEY, window.location.origin + window.location.pathname);
    }


    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

    if (teamId) {
        const team = allClubs.find(c => c.id === teamId);
        if (team) {
            const baseName = getClubBaseName(team);
            const clubExistsInSummary = allClubs.some(c => getClubBaseName(c) === baseName);
            if (clubExistsInSummary) {
                displaySubjectDetails(baseName, teamId);
            } else {
                console.warn(`Tím s ID "${teamId}" nájdený, ale jeho subjekt "${baseName}" nemá žiadne ďalšie tímy v prehľade.`);
                history.replaceState(null, '', window.location.pathname);
                displayClubsSummaryTable();
            }

        } else {
            console.warn(`Tím s ID "${teamId}" sa nenašiel.`);
            history.replaceState(null, '', window.location.pathname);
            displayClubsSummaryTable();
        }
    } else if (clubBaseName) {
        const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === clubBaseName);

        if (teamsForSubject.length > 0) {
            const firstTeamId = teamsForSubject[0].id;
            const url = new URL(window.location.href);
            url.searchParams.set('club', clubBaseName);
            url.searchParams.set('team', firstTeamId);
            history.replaceState({ baseName: clubBaseName, teamId: firstTeamId }, '', url.toString());

            displaySubjectDetails(clubBaseName, firstTeamId);

        } else {
            console.warn(`Subjekt "${clubBaseName}" sa nenašiel alebo nemá žiadne prihlásené tímy.`);
            history.replaceState(null, '', window.location.pathname);
            displayClubsSummaryTable();
        }
    } else {
        displayClubsSummaryTable();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    handleUrlState();

    const currentBackToListButton = document.getElementById('backToListButton');
    if (currentBackToListButton) {
        currentBackToListButton.removeEventListener('click', goBackToList);
        currentBackToListButton.addEventListener('click', goBackToList);
    } else {
        console.warn("Element s ID 'backToListButton' nebol nájdený pri načítaní DOM.");
    }
});


window.addEventListener('popstate', () => {
    handleUrlState();
});
