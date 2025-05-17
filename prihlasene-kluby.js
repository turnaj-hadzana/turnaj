import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';
import { collection } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const clubListSection = document.getElementById('clubListSection');
const clubsSummaryTable = document.getElementById('clubsSummaryTable'); // Referencia na hornú tabuľku (s thead a novým tbody)
const clubsSummaryTableHeader = document.getElementById('clubsSummaryTableHeader'); // Referencia na thead hornej tabuľky
const clubsSummaryTableBody = document.getElementById('clubsSummaryTableBody'); // Referencia na tbody rolujúcej tabuľky
const longestNameRowFixedBody = document.getElementById('longestNameRowFixedBody'); // REFERENCIA na tbody pre fixný riadok
const clubsBodyTableHeader = document.getElementById('clubsBodyTableHeader'); // REFERENCIA na thead spodnej tabuľky
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

// Function to add the "Tímy" header and category headers to BOTH thead elements
function updateHeaderColspan(numCategoryColumns) {
    // Zoznam hlavičiek, ktoré budeme generovať pre obe tabuľky
    const headersToGenerate = ['Tímy', ...allCategories.map(cat => cat.name || cat.id)];

    // Referencie na THEAD elementy, ktoré treba aktualizovať
    const theadElementsToUpdate = [];
    if (clubsSummaryTableHeader) { // thead hornej tabuľky
        theadElementsToUpdate.push(clubsSummaryTableHeader);
    }
    if (clubsBodyTableHeader) { // thead spodnej tabuľky
        theadElementsToUpdate.push(clubsBodyTableHeader);
    }

    theadElementsToUpdate.forEach(thead => {
        // V každej thead nájdeme prvý riadok (ak existuje)
        let headerRow = thead.querySelector('tr');
        if (!headerRow) {
            // Ak riadok neexistuje, vytvoríme ho
            headerRow = document.createElement('tr');
            thead.appendChild(headerRow);
             // Špeciálne pre hornú tabuľku, prvý TH už existuje v HTML, tak ho tam necháme (predpoklad)
             // Ak thead bola prázdna, musíme ho vytvoriť
             if (thead.id === 'clubsSummaryTableHeader') {
                  // Skontrolujeme, či prvý TH už nebol vytvorený v HTML
                  if (!headerRow.querySelector('th')) {
                       const firstTh = document.createElement('th');
                       firstTh.textContent = 'Názov klubu';
                       headerRow.appendChild(firstTh);
                  }
             } else {
                  // Pre spodnú tabuľku, musíme vytvoriť aj prvý TH
                   const firstTh = document.createElement('th');
                   firstTh.textContent = 'Názov klubu';
                   headerRow.appendChild(firstTh);
             }
        }


        // Clear existing headers *except the first one*
        headerRow.querySelectorAll('th:not(:first-child)').forEach(th => th.remove());


        // Add the "Tímy" header and category headers to the current thead
        headersToGenerate.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            th.style.textAlign = 'center';

            // Pre stĺpce kategórií pridáme aj dataset atribút
            if (index >= 1) { // Index 0 je pre 'Tímy', od 1 začínajú kategórie v headersToGenerate
                 // Nájdeme príslušnú kategóriu podľa indexu (index v headersToGenerate - 1, lebo prvý je Tímy)
                 const category = allCategories[index - 1];
                 if (category) {
                      th.dataset.categoryId = category.id;
                 }
            }

             headerRow.appendChild(th);
        });

        // KÓD NA PRIDANIE NOVÉHO POSLEDNÉHO STĹPCA DO HLAVIČKY BOL ODSTRÁNENÝ
    });


     // Update colspan for the initial loading/error row in the body (v rolujúcej tabuľke)
    if (clubsSummaryTableBody) {
        const firstRow = clubsSummaryTableBody.querySelector('tr');
        if (firstRow) {
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                 // colspan = 1 (Názov klubu) + 1 (Tímy) + allCategories.length (Správny colspan pre telo)
                firstCell.colSpan = 1 + 1 + allCategories.length; // Colspan calculation remains correct for the body
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
     // Vyčisti aj detaily tímu
     if(selectedTeamDetailsDiv) selectedTeamDetailsDiv.style.display = 'none';
     if(selectedTeamNameSpan) selectedTeamNameSpan.textContent = '';
     if(selectedTeamRealizacnyTimDiv) selectedTeamRealizacnyTimDiv.innerHTML = '';
     if(selectedTeamSoupiskaHracovUl) selectedTeamSoupiskaHracovUl.innerHTML = '';


    if (!clubsSummaryTableBody || !clubsSummaryTableHeader || !longestNameRowFixedBody) {
        // Ak chýba potrebný element, zastavíme sa.
        console.error("Chyba: Nebol nájdený element '#clubsSummaryTableBody', '#clubsSummaryTableHeader' alebo '#longestNameRowFixedBody'.");
        return;
    }

    clubsSummaryTableBody.innerHTML = ''; // Clear existing rows in the scrollable body
    longestNameRowFixedBody.innerHTML = ''; // Vyčistíme obsah fixnej tbody


    // Update header with "Tímy" column and category columns for BOTH tables
    updateHeaderColspan(allCategories.length);

    if (allClubs.length === 0) {
        // Ak nie sú žiadne kluby, zobrazíme správu v rolujúcej časti
        const noClubsRow = clubsSummaryTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = 1 + 1 + allCategories.length; // Správny colspan pre telo
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby pre prehľad.";
        cell.style.textAlign = 'center';

        // A vyčistíme fixný riadok
        longestNameRowFixedBody.innerHTML = ''; // Prázdny fixný riadok
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

    // --- NOVÝ KÓD: Generovanie riadku s najdlhším názvom v fixnej tbody ---

    let longestBaseName = '';
    let clubsForLongestBaseName = [];

    if (sortedBaseNames.length > 0) {
        // Filtrujeme len názvy, ktoré majú priradené kluby, a hľadáme medzi nimi najdlhší
        const baseNamesWithClubs = sortedBaseNames.filter(name => clubsByBaseName[name] && clubsByBaseName[name].length > 0);
        if (baseNamesWithClubs.length > 0) {
             longestBaseName = baseNamesWithClubs.reduce((a, b) => a.length > b.length ? a : b);
             // Získame kluby patriace pod tento najdlhší názov
             clubsForLongestBaseName = allClubs.filter(club => getClubBaseName(club) === longestBaseName);
        }
    }

    // Ak sme našli najdlhší názov, vygenerujeme a vložíme riadok do fixnej tbody
    if (longestBaseName) {
        const longestNameRow = longestNameRowFixedBody.insertRow(); // Vložíme riadok do fixnej tbody
        longestNameRow.style.fontWeight = 'bold'; // Voliteľné: tučný text
        //longestNameRow.style.backgroundColor = '#ffffcc'; // Voliteľné: zvýraznenie pozadia
        longestNameRow.dataset.baseName = longestBaseName; // Pridáme dataset atribút
        longestNameRow.style.cursor = 'pointer'; // Aby bol klikateľný

        // Pridáme event listener pre kliknutie na fixný riadok
        longestNameRow.addEventListener('click', () => {
             const url = new URL(window.location.href);
             url.searchParams.set('club', longestBaseName);
             url.searchParams.delete('team');
             history.pushState({ baseName: longestBaseName }, '', url.toString());
             displaySubjectDetails(longestBaseName);
        });

        // Vytvoríme bunky riadku
        // Bunka pre Názov klubu
        const cellBaseName = longestNameRow.insertCell();
        cellBaseName.textContent = longestBaseName;
         // Voliteľné štýly pre zarovnanie - mali by byť nastavené v CSS
         // cellBaseName.style.width = 'Xpx';

        // Bunka pre celkový počet Tímov
        let totalTeamsCount = 0;
        allCategories.forEach(category => {
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            totalTeamsCount += teamsInCategoryCount;
        });
        const cellTotalTeams = longestNameRow.insertCell();
        cellTotalTeams.textContent = totalTeamsCount > 0 ? totalTeamsCount : '';
        cellTotalTeams.style.textAlign = 'center';
         // Voliteľné štýly pre zarovnanie
         // cellTotalTeams.style.width = 'Ypx';

        // Bunky pre počty tímov v jednotlivých kategóriách
        allCategories.forEach(category => {
            const countCell = longestNameRow.insertCell();
            const categoryId = category.id;
            const teamsInCategoryCount = clubsForLongestBaseName.filter(club => club.categoryId === categoryId).length;
            countCell.textContent = teamsInCategoryCount > 0 ? teamsInCategoryCount : '';
            countCell.style.textAlign = 'center';
             // Voliteľné štýly pre zarovnanie
             // countCell.style.width = 'Zpx';
        });

        // Ak by bol prítomný aj posledný stĺpec (odstránený), bolo by potrebné pridať aj bunku pre neho:
        // const lastCell = longestNameRow.insertCell();
        // lastCell.textContent = '';
    }

    // --- KONIEC KÓDU pre fixný riadok v fixnej tbody ---


    // Populate the table body (kód pre generovanie riadkov v rolujúcej tabuľke)
    // Tento cyklus vygeneruje VŠETKY riadky do rolujúcej tabuľky, VRÁTANE toho,
    // ktorý je duplicitne zobrazený v hornej fixnej časti.
    sortedBaseNames.forEach(baseName => {
        // Už NIKDY nepreskakujeme riadok s najdlhším názvom, necháme ho vygenerovať aj v tomto cykle.
        // if (baseName === longestBaseName) { return; } // TENTO RIADOK JE ODSTRÁNENÝ

        const row = clubsSummaryTableBody.insertRow();
        row.dataset.baseName = baseName;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
             // Aktualizácia URL pri kliknutí na riadok klubu
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


// Funkcia na zvýraznenie tlačidla tímu a resetovanie ostatných (zostáva opravená)
function highlightTeamButton(teamIdToHighlight) {
     if (teamsInCategoryButtonsDiv) {
          // Reset all buttons first
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              btn.style.backgroundColor = '';
              btn.style.color = '';
          });
          // OPRAVENÝ RIADOK: Používame template literal pre čistejší kód
          const targetButton = teamsInCategoryButtonsDiv.querySelector(`button[data-team-id="${teamIdToHighlight}"]`);
          if (targetButton) {
              targetButton.style.fontWeight = 'bold';
              targetButton.style.backgroundColor = '#c46f50'; // Aktívne oranžové pozadie
              targetButton.style.color = 'white'; // Aktívny biely text
          }
     }
}


async function displaySubjectDetails(baseName, initialTeamId = null) { // Pridaný voliteľný parameter pre ID tímu
     if (clubListSection) clubListSection.style.display = 'none';
     if (clubDetailSection) clubDetailSection.style.display = 'block';
     if(clubDetailTitleSpan) clubDetailTitleSpan.textContent = baseName;

     // Vyčistenie starého UL, ak stále existuje (aj keby bol skrytý)
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
               let categoryName = 'Neznáma kategória'; // Predvolená hodnota
               const category = allCategories.find(cat => cat.id === team.categoryId);

               // ZMENA: Vylepšená logika získania názvu kategórie
               if (category && category.name) {
                    // Ak sa kategória našla v allCategories, použijeme jej názov
                    categoryName = category.name;
               } else {
                   // Ak sa kategória nenašla v allCategories, skús ju získať z ID tímu ako zálohu
                   // ID tímu je parameter 'team' z URL, už dekódovaný na string
                   const teamIdString = team.id || ''; // Získaj ID tímu ako string

                   // ZMENA: Namiesto regexu, nájdi index prvého oddelovača " - " alebo "-"
                   const separator = ' - ';
                   let separatorIndex = teamIdString.indexOf(separator);

                   if (separatorIndex === -1) {
                       // Ak sa nenájde " - ", skúsime nájsť iba "-"
                       separatorIndex = teamIdString.indexOf('-');
                   }


                   if (separatorIndex !== -1) {
                       // Ak sa nájde oddelovač, vezmeme časť pred ním a orežeme medzery
                       categoryName = teamIdString.substring(0, separatorIndex).trim();
                        console.warn(`DEBUG: Názov kategórie pre tím "${team.id}" (CategoryID: "${team.categoryId}") sa nenašiel v allCategories. Ako záloha použitý text "${categoryName}" extrahovaný z ID tímu pred prvým oddelovačom.`); // Log zálohy

                   } else {
                        // Ak sa kategória nenašla ani v allCategories, ani sa nedala extrahovať z ID tímu (lebo nemá oddelovač)
                        console.warn(`DEBUG: Názov kategórie pre tím "${team.id}" (CategoryID: "${team.categoryId}") sa nenašiel v allCategories. V ID tímu sa nenašiel očakávaný oddelovač (" - " alebo "-"). Použitá predvolená hodnota "${categoryName}".`); // Log zlyhania zálohy
                   }
               }

               // Nastavenie textu tlačidla
               // Zabezpečíme, že ak groupName je 'Nepriradené', formatovanie bude 'Kategoria' namiesto 'Kategoria - Nepriradene'
               const buttonText = groupName !== 'Nepriradené' ? `${categoryName} - ${groupName}` : categoryName;
               teamButton.textContent = buttonText;
               teamButton.dataset.teamId = team.id; // Uloženie ID tímu do datasetu

               // Pridanie event listeneru na kliknutie
               teamButton.addEventListener('click', () => {
                    // Aktualizácia URL pri kliknutí na tlačidlo tímu
                    const url = new URL(window.location.href);
                    url.searchParams.set('team', team.id);
                    history.pushState({ baseName: getClubBaseName(team), teamId: team.id }, '', url.toString());

                    displaySpecificTeamDetails(team.id); // Zobraz detaily tímu
                    // Zvýraznenie sa volá na konci displaySpecificTeamDetails
                });

               teamsInCategoryButtonsDiv.appendChild(teamButton); // Pridanie tlačidla do DIVu
           });

          // --- KÓD pre automatický výber a zvýraznenie tímu (ÚPRAVA) ---
          // Táto časť sa vykoná po vytvorení tlačidiel
           if (teamsForSubject.length > 0 && initialTeamId) {
               // Ak bol initialTeamId zadaný (z URL/histórie), zobraz detaily pre tento tím
               console.log(`DEBUG: InitialTeamId "${initialTeamId}" provided. Displaying details for this team.`);
               // ZMENA: Explicitne zavolaj displaySpecificTeamDetails pre počiatočný tím
               displaySpecificTeamDetails(initialTeamId);
           } else if (teamsForSubject.length > 0 && !initialTeamId) {
                // Ak nebol initialTeamId zadaný a sú tu tímy, zobraz detaily prvého tímu (bez zvýraznenia v URL)
               const firstTeamId = teamsForSubject[0].id;
               console.log(`DEBUG: No InitialTeamId provided. Displaying details for the first team: "${firstTeamId}".`);
                displaySpecificTeamDetails(firstTeamId); // Toto by malo volať highlightTeamButton na konci
           } else if (teamsForSubject.length === 0 && initialTeamId) {
                console.warn(`DEBUG: InitialTeamId "${initialTeamId}" provided, but no teams found for baseName.`);
                // handleUrlState by mala toto ošetriť presmerovaním na list
           }
          // --- KONIEC ÚPRAVY ---
     }

     // Dodatočné vyprázdnenie pôvodného UL pre prípad, že ešte existuje
     if (teamsInCategoryListUl) {
          teamsInCategoryListUl.innerHTML = '';
     }
}


// Funkcia na zvýraznenie tlačidla tímu a resetovanie ostatných (zostáva opravená)
function highlightTeamButton(teamIdToHighlight) {
     if (teamsInCategoryButtonsDiv) {
          // Reset all buttons first
          teamsInCategoryButtonsDiv.querySelectorAll('button').forEach(btn => {
              btn.style.fontWeight = 'normal';
              btn.style.backgroundColor = '';
              btn.style.color = '';
          });
          // OPRAVENÝ RIADOK: Používame template literal pre čistejší kód
          const targetButton = teamsInCategoryButtonsDiv.querySelector(`button[data-team-id="${teamIdToHighlight}"]`);
          if (targetButton) {
              targetButton.style.fontWeight = 'bold';
              targetButton.style.backgroundColor = '#c46f50'; // Aktívne oranžové pozadie
              targetButton.style.color = 'white'; // Aktívny biely text
          }
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
                       noPlayersItem.textContent = 'Zatiaľ bez súpisky.'; // Opravené typo
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
    } finally {
        // Zavolaj highlightTeamButton na konci načítania detailov,
        // aby sa zabezpečilo zvýraznenie aktívneho tlačidla
        highlightTeamButton(teamId);
    }
}

// Funkcia na návrat na prehľad teraz zobrazí tabuľku a aktualizuje URL
function goBackToList() {
    // Zobrazí súhrnnú tabuľku klubov
    displayClubsSummaryTable();

    // Aktualizuje URL na základnú cestu (pathname) bez parametrov (?club=... alebo ?team=...)
    // Použijeme history.replaceState namiesto pushState, aby sa stavy s detailmi nezachovali v histórii za listom
    history.replaceState({}, '', window.location.pathname);

    // Vyčistí detaily sekcie (už sa do veľkej miery deje v displayClubsSummaryTable, ale pre istotu)
}


// Funkcia na spracovanie stavu URL pri načítaní stránky a zmene histórie
async function handleUrlState() {
    // Počkaj, kým sa načítajú všetky potrebné dáta
    // allClubs a allCategories by mali byť plne načítané
    await loadAllData();

    const urlParams = new URLSearchParams(window.location.search);
    const clubBaseName = urlParams.get('club');
    const teamId = urlParams.get('team');

    if (teamId) {
        // Ak je v URL parameter teamId, nájdi príslušný team a baseName a zobraz detaily
        const team = allClubs.find(c => c.id === teamId);
        if (team) {
            const baseName = getClubBaseName(team);
             // Zobraz detaily subjektu (tým sa vytvoria tlačidlá tímov)
             // Posielame teamId
            displaySubjectDetails(baseName, teamId);
            // displaySpecificTeamDetails(teamId) sa teraz volá vo vnútri displaySubjectDetails
            // ak initialTeamId existuje

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
              // Subjekt s daným baseName sa nenašiel, zobraz zoznam klubov
              console.warn(`Subjekt "${clubBaseName}" sa nenašiel.`);
              history.replaceState(null, '', window.location.pathname); // Odstráň neplatné parametre z URL
              displayClubsSummaryTable();
         }
    } else {
        // V URL nie sú žiadne relevantné parametre, zobraz zoznam klubov
        displayClubsSummaryTable();
    }
}


// Spustenie spracovania URL stavu po načítaní DOM
document.addEventListener('DOMContentLoaded', () => {
    // Odstránenie starej logiky pri načítaní DOM, voláme handleUrlState
    handleUrlState();

    if (backToListButton) {
        // Zabezpečiť, že tlačidlo Späť volá novú funkciu goBackToList
        // Odstráň existujúce listenery kliknutia, aby sa nepridali duplicitne
        const newButton = backToListButton.cloneNode(true);
        backToListButton.parentNode.replaceChild(newButton, backToListButton);
        const updatedBackButton = document.getElementById('backToListButton');

        updatedBackButton.addEventListener('click', goBackToList);

    } else {
       console.warn("Element s ID 'backToListButton' nebol nájdený.");
    }
});

// Spracovanie udalosti 'popstate' pre navigáciu späť/vpred
window.addEventListener('popstate', () => {
    // Pri zmene histórie prehliadača (späť/vpred) znovu spracuj stav URL
    handleUrlState();
});
