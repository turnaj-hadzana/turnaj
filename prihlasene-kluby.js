import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable');
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader');
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody');
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span');
const teamsInCategoryListUl = document.getElementById('teamsInCategoryList'); // Túto referenciu zatiaľ ponecháme, ale už ju nebudeme používať na pridávanie elementov
const teamsInCategoryButtonsDiv = document.getElementById('teamsInCategoryButtons'); // Nová referencia
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
        // Sort categories alphabetically by name
        allCategories.sort((a, b) => (a.name || a.id).localeCompare((b.name || b.id), 'sk-SK'));

        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        alert('Nepodarilo sa načítať dáta turnaja.');
        if (clubsSummaryTableBody) {
             // Update colspan calculation for the error message - body only has Názov + Tímy + Kategórie
             const numColumns = 1 + 1 + allCategories.length; // ZMENA: colspan pre telo neobsahuje nový stĺpec
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
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

    // Remove trailing suffixes that look like codes (e.g., " - 01", " A", " U15")
    const trailingSuffixRegex = /\s+([A-Z0-9]+)$/;
    const match = initialBaseName.match(trailingSuffixRegex);
    if (match) {
        // Keep suffixes longer than 3 characters, assume shorter ones are codes/categories
        if (match[1].length <= 3) { // Adjusted to allow short suffixes like 'SK' if needed, but exclude typical categories like U15
             initialBaseName = initialBaseName.substring(0, match.index).trim();
        }
    }

    return initialBaseName;
}

// Updated function to add the "Tímy" header, category headers, and the new last column (only in header)
function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        // Clear existing headers except the first one
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        // Add the "Tímy" header right after "Názov klubu"
        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
        clubsSummaryTableHeader.querySelector('th').insertAdjacentElement('afterend', teamsTh);

        // Add category headers
        if (allCategories.length > 0) {
            allCategories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category.name || category.id;
                th.dataset.categoryId = category.id;
                th.style.textAlign = 'center';
                clubsSummaryTableHeader.appendChild(th);
            });
        }
    }

     // Update colspan for the initial loading/error row in the body
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow) {
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                 // ZMENA: colspan = 1 (Názov klubu) + 1 (Tímy) + numCategoryColumns (Nie +1 za nový stĺpec v tele)
                firstCell.colSpan = 1 + 1 + numCategoryColumns; // Správny colspan pre telo
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

    clubsSummaryTableBody.innerHTML = ''; // Clear existing rows

    // Update header with "Tímy" column and category columns, including the new last column
    // NOTE: updateHeaderColspan handles adding the extra TH, but not the extra TD in the body
    updateHeaderColspan(allCategories.length);

    if (allClubs.length === 0) {
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
         // colspan = 1 (Názov klubu) + 1 (Tímy) + allCategories.length (Správny colspan pre telo)
        cell.colSpan = 1 + 1 + allCategories.length; // Správny colspan pre telo
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';
        return;
    }

    // Group clubs by base name
    const clubsByBaseName = allClubs.reduce((acc, club) => {
        const baseName = getClubBaseName(club);
        if (!acc[baseName]) {
            acc[baseName] = [];
        }
        acc[baseName].push(club);
        return acc;
    }, {});

    // Sort base names alphabetically
    const sortedBaseNames = Object.keys(clubsByBaseName).sort((a, b) => a.localeCompare(b, 'sk-SK'));

    // Populate the table body
    sortedBaseNames.forEach(baseName => {
        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
             displaySubjectDetails(baseName);
        });

        // Add "Názov klubu" cell
        const baseNameCell = row.insertCell();
        baseNameCell.textContent = baseName;

        // Calculate and add "Tímy" count cell
        let totalTeamsCount = 0;
        // Iterate through categories to sum up team counts for this base name
         allCategories.forEach(category => {
             const categoryId = category.id;
             const teamsInCategoryCount = clubsByBaseName[baseName].filter(club => club.categoryId === categoryId).length;
             totalTeamsCount += teamsInCategoryCount; // Add to total count
         });

        const totalTeamsCell = row.insertCell();
        totalTeamsCell.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        totalTeamsCell.style.textAlign = 'center';
        if (totalTeamsCount > 0) {
             totalTeamsCell.style.fontWeight = 'bold';
        }


        // Add category count cells
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

        // ZMENA: KÓD NA PRIDANIE POSLEDNEJ BUNKY DO TELA BOLA ODSTRÁNENÁ
        // const lastColumnTd = row.insertCell();
        // lastColumnTd.textContent = ''; // Nová bunka tela môže byť prázdna
        // Tu môžete prípadne pridať ikonu alebo tlačidlo akcie
    });
}

async function displaySubjectDetails(baseName) {
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;

     // Vyprázdnenie starého UL, ak stále existuje (aj keby bol skrytý)
     if(teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '';

     // Nastavenie počiatočného stavu pre nový DIV
     if(teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = 'Načítavam tímy...'; // Zmena textu načítavania

     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';


     const teamsForSubject = allClubs.filter(club => getClubBaseName(club) === baseName);

     // Kontrola, či existuje nový kontajner na tlačidlá
     if (!teamsInCategoryButtonsDiv) {
         console.error("HTML element s ID 'teamsInCategoryButtons' nebol nájdený."); // Logovanie chyby pre debugovanie
         return;
     }

     teamsInCategoryButtonsDiv.innerHTML = ''; // Vyčistíme kontajner pred pridaním tlačidiel

     if (teamsForSubject.length === 0) {
         const noTeamsMessage = document.createElement('p'); // Použijeme odsek namiesto tlačidla, ak nie sú tímy
         noTeamsMessage.textContent = `Žiadne tímy pre subjekt "${baseName}".`;
         teamsInCategoryButtonsDiv.appendChild(noTeamsMessage);
     } else {
          // --- UPRAVENÉ ZORADENIE TÍMOV: Zoradíme tímy podľa textu na tlačidle (Kategória - Skupina) ---
          teamsForSubject.sort((a, b) => {
               // Získame názov kategórie a skupiny pre tím 'a'
               const categoryA = allCategories.find(cat => cat.id === a.categoryId);
               const categoryNameA = (categoryA && categoryA.name) ? categoryA.name : (a.categoryId || 'Neznáma kategória');
               const groupA = allGroups.find(g => g.id === a.groupId);
               const groupNameA = groupA ? (groupA.name || groupA.id) : 'Nepriradené';
               const teamTextA = `${categoryNameA} - ${groupNameA}`;

               // Získame názov kategórie a skupiny pre tím 'b'
               const categoryB = allCategories.find(cat => cat.id === b.categoryId);
               const categoryNameB = (categoryB && categoryB.name) ? categoryB.name : (b.categoryId || 'Neznáma kategória');
               const groupB = allGroups.find(g => g.id === b.groupId);
               const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
               const teamTextB = `${categoryNameB} - ${groupNameB}`;

               // Porovnáme skládané texty abecedne (s ohľadom na slovenčinu)
               return teamTextA.localeCompare(teamTextB, 'sk-SK');
           });
          // --- KONIEC UPRAVENÉHO ZORADENIA ---


          teamsForSubject.forEach(team => {
               const teamButton = document.createElement('button'); // Vytvorenie tlačidla
               teamButton.classList.add('action-button'); // Pridanie CSS triedy (ak máte definované štýly)

               // Tieto premenné sa tu znova vypočítavajú, aby sa nastavil text tlačidla
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
                     }
                }

               // Nastavenie textu tlačidla (zostáva rovnaké ako v predchádzajúcom kroku)
               teamButton.textContent = `${categoryName} - ${groupName}`;
               teamButton.dataset.teamId = team.id; // Uloženie ID tímu do datasetu

               // Pridanie event listeneru na kliknutie
               teamButton.addEventListener('click', () => {
                    displaySpecificTeamDetails(team.id);
                    // Odstránenie zvýraznenia zo všetkých tlačidiel a zvýraznenie aktuálneho
                    if (teamsInCategoryButtonsDiv) {
                        teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => btn.style.fontWeight = 'normal');
                    }
                    teamButton.style.fontWeight = 'bold';
                });

               teamsInCategoryButtonsDiv.appendChild(teamButton); // Pridanie tlačidla do DIVu
           });

          // --- KÓD pre automatický výber a zvýraznenie prvého tímu (zostáva rovnaký) ---
          if (teamsForSubject.length > 0) {
               // ID prvého tímu v novo zoradenom poli
               const firstTeamId = teamsForSubject[0].id;
               displaySpecificTeamDetails(firstTeamId);

               // Nájdeme prvé tlačidlo v kontajneri zodpovedajúce tomuto ID a zvýrazníme ho
               const firstTeamButton = teamsInCategoryButtonsDiv.querySelector('button[data-team-id="' + firstTeamId + '"]');
               if (firstTeamButton) {
                    firstTeamButton.style.fontWeight = 'bold';
               }
           }
          // --- KONIEC KÓDU ---
     }

     // Dodatočné vyprázdnenie pôvodného UL pre prípad, že ešte existuje
     if (teamsInCategoryListUl) {
          teamsInCategoryListUl.innerHTML = '';
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

        // Load Realizačný tím
        if (selectedTeamRealizacnyTimDiv) {
            selectedTeamRealizacnyTimDiv.innerHTML = ''; // Clear previous content

            // Create initial loading state elements
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

                 // Update spans with loaded data
                 if(trenerSpan) trenerSpan.textContent = trenerName;
                 if(veduciSpan) veduciSpan.textContent = veduciName;

             } catch (realizacnyTimError) {
                 console.error("Error loading realizacnyTim:", realizacnyTimError);
                 if(trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                 if(veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
             }
        }

        // Load Súpiska hráčov
        if (selectedTeamSoupiskaHracovUl) {
             selectedTeamSoupiskaHracovUl.innerHTML = ''; // Clear previous content

             const hraciCollectionRef = collection(teamDoc.ref, 'hraci');
             try {
                  const hraciSnapshot = await getDocs(hraciCollectionRef);

                  if (hraciSnapshot.empty) {
                       const noPlayersItem = document.createElement('li');
                       noPlayersItem.textContent = 'Zatiaľ bez súpky.'; // Typo? Zatiaľ bez súpisky?
                       selectedTeamSoupiskaHracovUl.appendChild(noPlayersItem);
                  } else {
                       const hraciList = hraciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                       hraciList.sort((a, b) => {
                           // Sort by cisloDresu (number) first, then alphabetically by meno
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
                            hracItem.textContent = hracText; // Set the text content
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
         if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = 'Chyba pri načítaní detailov tímu';
         if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily realizačného tímu.</p>';
         if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
    }
}

function goBackToList() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    // Clear contents when going back
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = ''; // Clear the buttons container
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';

    // Also clear the old UL just in case
    if (teamsInCategoryListUl) teamsInCategoryListUl.innerHTML = '';
}


document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    displayClubsSummaryTable();
    if (backToListButton) {
        backToListButton.addEventListener('click', goBackToList);
    } else {
       console.warn("Element with ID 'backToListButton' not found.");
    }
});
