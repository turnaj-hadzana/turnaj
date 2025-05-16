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
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (clubsSummaryTableBody) {
             // Update colspan calculation for the error message - body only has Názov + Tímy + Kategórie
             const numColumns = 1 + 1 + allCategories.length; // colspan pre telo neobsahuje dodatočný stĺpec
             clubsSummaryTableBody.innerHTML = `<tr><td colspan="${numColumns}" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
         allClubs = [];
         allCategories = [];
         allGroups = [];
         // V prípade chyby naviguj späť na hlavný zoznam a URL
         history.replaceState({}, '', window.location.pathname); // Vráť URL bez parametrov a nahraď stav
         displayClubsSummaryTable(); // Zobraz zoznam klubov (prázdny alebo s chybou)

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

// Function to add the "Tímy" header and category headers (without any extra column)
function updateHeaderColspan(numCategoryColumns) {
    if (clubsSummaryTableHeader) {
        // Clear existing headers except the first one
        clubsSummaryTableHeader.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());

        // Add the "Tímy" header right after "Názov klubu"
        const teamsTh = document.createElement('th');
        teamsTh.textContent = 'Tímy';
        teamsTh.style.textAlign = 'center';
        // Insert the new header after the first child (Názov klubu)
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

        // KÓD NA PRIDANIE NOVÉHO POSLEDNÉHO STĹPCA DO HLAVIČKY BOL ODSTRÁNENÝ
    }

     // Update colspan for the initial loading/error row in the body
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow) {
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                 // colspan = 1 (Názov klubu) + 1 (Tímy) + numCategoryColumns (Správny colspan pre telo)
                firstCell.colSpan = 1 + 1 + numCategoryColumns; // Colspan calculation remains correct for the body
            }
        }
    }
}

function displayClubsSummaryTable() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = ''; // Vyčisti nadpis detailov
     // Tiež vyčisti kontajner tlačidiel tímov pri návrate na prehľad
    if (teamsInCategoryButtonsDiv) teamsInCategoryButtonsDiv.innerHTML = '';


    if (!clubsSummaryTableBody || !clubsSummaryTableHeader) {
        return;
    }

    clubsSummaryTableBody.innerHTML = ''; // Clear existing rows

    // Update header with "Tímy" column and category columns (without the extra last column)
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
             // ZMENA: Aktualizácia URL pri kliknutí na riadok klubu
             const url = new URL(window.location.href);
             url.searchParams.set('club', baseName);
             url.searchParams.delete('team'); // Odstráň parameter team
             history.pushState({ baseName: baseName }, '', url.toString());

             displaySubjectDetails(baseName); // Zobraz detaily subjektu
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

        // KÓD NA PRIDANIE POSLEDNEJ BUNKY DO TELA JE ODSTRÁNENÝ
    });
}


// Funkcia na zvýraznenie tlačidla tímu a resetovanie ostatných
function highlightTeamButton(teamIdToHighlight) {
     if (teamsInCategoryButtonsDiv) {
          // Reset all buttons first
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              // Použi farby z CSS pre normálny stav
              // btn.style.backgroundColor = '#e9f5e9'; // Návrat na normálne svetlo zelené pozadie z CSS
              // btn.style.color = '#333'; // Návrat na normálnu farbu textu z CSS
              // Odstránením inline štýlu sa aplikuje CSS trieda
              btn.style.backgroundColor = '';
              btn.style.color = '';
          });

          // Find and highlight the target button
          const targetButton = teamsInCategoryButtonsDiv.querySelector('button[data-team-id="' + teamIdToHighlight + '"]');
          if (targetButton) {
              targetButton.style.fontWeight = 'bold';
              // Nastav farby aktívneho stavu inline
              targetButton.style.backgroundColor = '#c46f50'; // Aktívne oranžové pozadie
              targetButton.style.color = 'white'; // Aktívny biely text
          }
     }
}


async function displaySubjectDetails(baseName, initialTeamId = null) { // Pridaný voliteľný parameter pre ID tímu
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
               const categoryNameB = (categoryB && categoryB.name) ? categoryNameB : (b.categoryId || 'Neznáma kategória');
               const groupB = allGroups.find(g => g.id === b.groupId);
               const groupNameB = groupB ? (groupB.name || groupB.id) : 'Nepriradené';
               const teamTextB = `${categoryNameB} - ${groupNameB}`;

               // Porovnáme skládané texty abecedne (s ohľadom na slovenčinu)
               return teamTextA.localeCompare(teamTextB, 'sk-SK');
           });
          // --- KONIEC UPRAVENÉHO ZORADENIA ---


          teamsForSubject.forEach(team => {
               const teamButton = document.createElement('button'); // Vytvorenie tlačidla
               teamButton.classList.add('action-button'); // Pridanie CSS triedy

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

               // Nastavenie textu tlačidla
               teamButton.textContent = `${categoryName} - ${groupName}`;
               teamButton.dataset.teamId = team.id; // Uloženie ID tímu do datasetu

               // Pridanie event listeneru na kliknutie
               teamButton.addEventListener('click', () => {
                    // ZMENA: Aktualizácia URL pri kliknutí na tlačidlo tímu
                    const url = new URL(window.location.href);
                    // Predpokladáme, že club parameter je už v URL z displaySubjectDetails
                    url.searchParams.set('team', team.id);
                    history.pushState({ baseName: getClubBaseName(team), teamId: team.id }, '', url.toString());

                    displaySpecificTeamDetails(team.id); // Zobraz detaily tímu
                    // Zvýraznenie sa volá na konci displaySpecificTeamDetails
                });

               teamsInCategoryButtonsDiv.appendChild(teamButton); // Pridanie tlačidla do DIVu
           });

          // --- KÓD pre automatický výber a zvýraznenie prvého tímu (ÚPRAVA) ---
          // Táto časť sa teraz vykoná len ak sa zobrazujú detaily subjektu,
          // ale nie je v URL špecifikovaný konkrétny tím (initialTeamId je null).
          // Ak initialTeamId je zadané (z URL alebo histórie), spracuje sa to nižšie.
           if (!initialTeamId && teamsForSubject.length > 0) {
               // Zvýrazni prvé tlačidlo A zobraz detaily prvého tímu,
               // len ak nebol špecifikovaný konkrétny tím v URL/histórii
               const firstTeamId = teamsForSubject[0].id;
               // Pri zobrazení detailov prvého tímu NEaktualizujeme URL,
               // pretože displaySubjectDetails už nastavila URL len s baseName.
               // Ak by sme chceli URL s baseName aj teamId aj pri prvom tíme po kliknutí na subjekt,
               // bolo by potrebné to tu dorobiť podobne ako pri kliknutí na iné tlačidlá.
               displaySpecificTeamDetails(firstTeamId); // Toto by malo volať highlightTeamButton na konci
               // highlightTeamButton(firstTeamId); // Toto už nie je potrebné volať tu
           } else if (initialTeamId) {
                // Ak bol initialTeamId zadaný (z URL/histórie), displaySpecificTeamDetails
                // sa už zavolala v handleUrlState a highlightTeamButton sa zavola na konci displaySpecificTeamDetails
                // Tu už nič nerobíme
           }
          // --- KONIEC ÚPRAVY ---
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

// ZMENA: Funkcia na návrat na prehľad teraz zobrazí tabuľku a aktualizuje URL
function goBackToList() {
    // Zobrazí súhrnnú tabuľku klubov
    displayClubsSummaryTable();

    // Aktualizuje URL na základnú cestu (pathname) bez parametrov (?club=... alebo ?team=...)
    // Použijeme history.replaceState namiesto pushState, aby sa stavy s detailmi nezachovali v histórii za listom
    history.replaceState({}, '', window.location.pathname);

    // Vyčistí detaily sekcie (už sa do veľkej miery deje v displayClubsSummaryTable, ale pre istotu)
}


// ZMENA: Funkcia na spracovanie stavu URL pri načítaní stránky a zmene histórie
async function handleUrlState() {
    // Počkaj, kým sa načítajú všetky potrebné dáta
    await loadAllData();

    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

    if (teamId) {
        // Ak je v URL parameter teamId, nájdi príslušný baseName a zobraz detaily
        const team = allClubs.find(c => c.id === teamId);
        if (team) {
            const baseName = getClubBaseName(team);
            // Zobraz detaily subjektu (tým sa vytvoria tlačidlá tímov)
            displaySubjectDetails(baseName, teamId); // Pošli teamId na zvýraznenie
            // displaySpecificTeamDetails(teamId) sa zavolá vo vnútri displaySubjectDetails
            // po vytvorení tlačidiel ak je initialTeamId != null
        } else {
            // Tím s daným ID sa nenašiel, zobraz zoznam klubov
            console.warn(`Tím s ID "${teamId}" sa nenašiel.`);
            history.replaceState(null, '', window.location.pathname); // Odstráň neplatné parametre z URL
            displayClubsSummaryTable();
        }
    } else if (clubBaseName) {
        // Ak je v URL iba parameter club, zobraz detaily subjektu
         const clubExists = allClubs.some(club => getClubBaseName(club) === clubBaseName);
         if (clubExists) {
              displaySubjectDetails(clubBaseName); // Nezobrazuj detaily konkrétneho tímu
         } else {
              // Subjekt sa nenašiel, zobraz zoznam klubov
              console.warn(`Subjekt "${clubBaseName}" sa nenašiel.`);
              history.replaceState(null, '', window.location.pathname); // Odstráň neplatné parametre z URL
              displayClubsSummaryTable();
         }
    } else {
        // V URL nie sú žiadne relevantné parametre, zobraz zoznam klubov
        displayClubsSummaryTable();
    }
}


// ZMENA: Spustenie spracovania URL stavu po načítaní DOM
document.addEventListener('DOMContentLoaded', () => {
    // Odstránenie starej logiky pri načítaní DOM, voláme handleUrlState
    handleUrlState();

    if (backToListButton) {
        // Zabezpečiť, že tlačidlo Späť volá novú funkciu goBackToList
        // Najprv odstráň existujúce listenery, ak ich tam je viac
        const newButton = backToListButton.cloneNode(true);
        backToListButton.parentNode.replaceChild(newButton, backToListButton);
        const updatedBackButton = document.getElementById('backToListButton');

        updatedBackButton.addEventListener('click', goBackToList);

    } else {
       console.warn("Element with ID 'backToListButton' not found.");
    }
});

// ZMENA: Spracovanie udalosti 'popstate' pre navigáciu späť/vpred
window.addEventListener('popstate', () => {
    // Pri zmene histórie prehliadača (späť/vpred) znovu spracuj stav URL
    handleUrlState();
});
