import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable');
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader');
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody');
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
const teamsInCategoryListUl = document.getElementById('teamsInCategoryList');
const selectedTeamDetailsDiv = document.getElementById('selectedTeamDetails');
const selectedTeamNameSpan = document.getElementById('selectedTeamName');
const selectedTeamRealizacnyTimDiv = document.getElementById('selectedTeamRealizacnyTim');
const selectedTeamTrenerInfoSpan = document.getElementById('selectedTeamTrenerInfo');
const selectedTeamVeduciDruzstvaInfoSpan = document.getElementById('selectedTeamVeduciDruzstvaInfo');
const selectedTeamSoupiskaHracovUl = document.getElementById('selectedTeamSoupiskaHracov');
let allClubs = [];
let allCategories = [];
let allGroups = [];
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
        if (clubsSummaryTableBody) {
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="1" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
              updateHeaderColspan(0); 
        }
         allClubs = [];
         allCategories = [];
         allGroups = [];
    }
}
function getClubBaseName(club) {
    let initialBaseName;
    if (club.createdFromBase && typeof club.createdFromBase === 'string' && club.createdFromBase.trim() !== '') {
        initialBaseName = club.createdFromBase.trim();
    } else if (club.id && typeof club.id === 'string' && club.id.includes(' - ')) {
        initialBaseName = club.id.split(' - ')[0].trim();
    } else {
        initialBaseName = club.name || club.id || 'Neznámy subjekt';
    }
    const trailingSuffixRegex = /\s+([A-Z0-9]+)$/;
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        if (match[1].length <= 3) {
            initialBaseName = initialBaseName.substring(0, match.index).trim();
        }
    }
    return initialBaseName; 
}
function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        const fixedHeaderCell = clubsSummaryTableHeader.querySelector('th');
        if (fixedHeaderCell) {
            fixedHeaderCell.colSpan = 1;
        }
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());
    }
     if (clubsSummaryTableHeader && allCategories.length > 0) {
         allCategories.forEach(category => {
              const th = document.createElement('th');
              th.textContent = category.name || category.id;
              th.dataset.categoryId = category.id;
              th.style.textAlign = 'center';
              clubsSummaryTableHeader.appendChild(th);
         });
     }
    if (clubsSummaryTableBody) {
         const firstRow = clubsSummaryTableBody.querySelector('tr');
         if (firstRow) {
              const firstCell = firstRow.querySelector('td');
              if (firstCell) {
                   firstCell.colSpan = 1 + numCategoryColumns;
              }
         }
    }
}
function displayClubsSummaryTable() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (!clubsSummaryTableBody || !clubsSummaryTableHeader) {
        return;
    }
    clubsSummaryTableBody.innerHTML = '';
    updateHeaderColspan(allCategories.length);
    if (allClubs.length === 0) {
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = 1 + allCategories.length;
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';
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
    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
             displaySubjectDetails(baseName);
        });
        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName;
        allCategories.forEach(category => {
            const countCell = row.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             if (teamsInCategoryCount > 0) {
                  countCell.style.fontWeight = 'bold';
             }
        });
    });
}
async function displaySubjectDetails(baseName) {
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;
     if(teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '<li>Načítavam tímy...</li>';
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';
     const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === baseName);
     if (!teamsInCategoryListUl) {
          return;
     }
     teamsInCategoryListUl.innerHTML = '';
     if (teamsForSubject.length === 0) {
          const noTeamsItem = document.createElement('li');
          noTeamsItem.textContent = `Žiadne tímy pre subjekt "${baseName}".`;
          teamsInCategoryListUl.appendChild(noTeamsItem);
     } else {
          teamsForSubject.sort((a, b) => {
               const categoryA = allCategories.find(cat => cat.id === a.categoryId);
               const categoryB = allCategories.find(cat => cat.id === b.categoryId);
               const categoryNameA = (categoryA && categoryA.name) ? categoryA.name : '';
               const categoryNameB = (categoryB && categoryB.name) ? categoryB.name : '';
               const categoryComparison = categoryNameA.localeCompare(categoryNameB, 'sk-SK');
               if (categoryComparison !== 0) {
                    return categoryComparison;
               }
                const nameA = (a.name || a.id || '').toLowerCase();
                const nameB = (b.name || b.id || '').toLowerCase();
                return nameA.localeCompare(nameB, 'sk-SK');
          });
          teamsForSubject.forEach(team => {
               const teamItem = document.createElement('li');
               const group = allGroups.find(g => g.id === team.groupId);
               const groupName = group ? (group.name || group.id) : 'Nepriradené';
               let categoryName = 'Neznáma kategória';
               const category = allCategories.find(cat => cat.id === team.categoryId);
               if (category && category.name) {
                   categoryName = category.name;
               } else if (team.categoryId && clubsSummaryTableHeader) {
                    const headerTh = clubsSummaryTableHeader.querySelector(`th[data-category-id="${team.categoryId}"]`);
                    if (headerTh) {
                        categoryName = headerTh.textContent || 'Neznáma kategória (z hlavičky)';
                    } else {
                    }
                } else if (team.categoryId) {
                } else {
                }
               teamItem.textContent = `${team.name || team.id} (${categoryName} - ${groupName})`;
               teamItem.dataset.teamId = team.id;
               teamItem.style.cursor = 'pointer';
               teamItem.style.fontWeight = 'normal';
               teamItem.style.listStyleType = 'disc';
               teamItem.style.marginLeft = '20px';
                teamItem.addEventListener('click', () => {
                     displaySpecificTeamDetails(team.id);
                     teamsInCategoryListUl.querySelectorAll('li').forEach(li => li.style.fontWeight = 'normal');
                     teamItem.style.fontWeight = 'bold';
                });
               teamsInCategoryListUl.appendChild(teamItem);
          });
     }
}
async function displaySpecificTeamDetails(teamId) {
    if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'block';
    if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Načítavam...';
    if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p>Tréner: Načítavam...</p><p>Vedúci družstva: Načítavam...</p>';
    if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Načítavam súpisku...</li>';
    try {
        const teamDocRef = doc(clubsCollectionRef, teamId);
        const teamDoc = await getDoc(teamDocRef);
        if (!teamDoc.exists()) {
            if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba: Tím nenájdený';
            if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Detail tímu sa nepodarilo načítať.</p>';
            if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            return;
        }
        const teamData = teamDoc.data();
        const teamName = teamData.name || teamDoc.id;
        if (selectedTeamNameSpan) selectedTeamNameSpan.textContent = teamName;
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
                  if(trenerSpan) trenerSpan.textContent = trenerName;
                  if(veduciSpan) veduciSpan.textContent = veduciName;
             } catch (realizacnyTimError) {
                  if(trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                  if(veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
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
                            selectedTeamSoupiskaHracovUl.appendChild(hracItem);
                       });
                  }
             } catch (hraciError) {
                  if (selectedTeamSoupiskaHracovUl) {
                       selectedTeamSoupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
                  }
             }
        }
    } catch (error) {
         if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba pri načítaní detailov tímu';
         if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily realizačného tímu.</p>';
         if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
    }
}
function goBackToList() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    if (teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '';
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';
}
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    displayClubsSummaryTable();
    if (backToListButton) {
        backToListButton.addEventListener('click', goBackToList);
    } else {
    }
});
