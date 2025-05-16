// Import potrebných funkcií a referencií z common súboru
import { db, clubsCollectionRef, categoriesCollectionRef, groupsCollectionRef, getDocs, doc, getDoc, query, where } from './spravca-turnaja-common.js';

// Referencie na HTML elementy
const clubListSection = document.getElementById('clubListSection');
const clubsTableBody = document.getElementById('clubsTableBody');
const clubDetailSection = document.getElementById('clubDetailSection');
const backToListButton = document.getElementById('backToListButton');
const clubDetailTitleSpan = document.querySelector('#clubDetailTitle span'); // Span na názov klubu v detaile
const realizacnyTimDiv = document.getElementById('realizacnyTim');
const trenerInfoSpan = document.getElementById('trenerInfo');
const veduciDruzstvaInfoSpan = document.getElementById('veduciDruzstvaInfo');
const soupiskaHracovUl = document.getElementById('soupiskaHracov');

// Premenné na ukladanie dát
let allClubs = [];
let allCategories = [];
let allGroups = [];

// Funkcia na načítanie všetkých klubov, kategórií a skupín
async function loadTournamentData() {
    try {
        // Načítaj všetky kluby
        const clubsSnapshot = await getDocs(clubsCollectionRef);
        allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Načítaj všetky kategórie (pre zobrazenie mena namiesto ID v tabuľke)
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Načítaj všetky skupiny (pre zobrazenie mena namiesto ID v tabuľke)
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Zoraď kluby abecedne podľa názvu pre tabuľku
        allClubs.sort((a, b) => {
            const nameA = (a.name || a.id || '').toLowerCase();
            const nameB = (b.name || b.id || '').toLowerCase();
            return nameA.localeCompare(nameB, 'sk-SK');
        });

    } catch (error) {
        console.error('Chyba pri načítaní dát turnaja:', error);
        alert('Nepodarilo sa načítať dáta turnaja.');
        // Zobraz chybovú správu v tabuľke
        if (clubsTableBody) {
             clubsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Chyba pri načítaní klubov.</td></tr>`;
        }
         allClubs = []; // Vymaž prípadné čiastočne načítané dáta
    }
}

// Funkcia na zobrazenie zoznamu klubov v tabuľke
function displayClubsTable() {
    // Uisti sa, že sú zobrazené sekcie so zoznamom a skryté detaily
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';

    if (!clubsTableBody) {
        console.error("Element #clubsTableBody not found!");
        return;
    }

    // Vyprázdni telo tabuľky pred vyplnením
    clubsTableBody.innerHTML = '';

    if (allClubs.length === 0) {
        // Zobraz správu, ak nie sú žiadne kluby
        const noClubsRow = clubsTableBody.insertRow();
        const cell = noClubsRow.insertCell();
        cell.colSpan = 4;
        cell.textContent = "Zatiaľ nie sú pridané žiadne kluby.";
        cell.style.textAlign = 'center';
    } else {
        // Vyplň tabuľku klubmi
        allClubs.forEach(club => {
            const row = clubsTableBody.insertRow();
            row.dataset.clubId = club.id; // Ulož ID klubu do data atribútu riadku
            row.style.cursor = 'pointer'; // Naznač, že riadok je klikateľný

            // Pridaj poslucháč udalosti kliknutia na riadok
            row.addEventListener('click', () => {
                displayClubDetails(club.id);
            });

            // Vyplň bunky tabuľky
            const nameCell = row.insertCell();
            nameCell.textContent = club.name || club.id; // Zobraz meno alebo ID ak meno chýba

            const categoryCell = row.insertCell();
            const category = allCategories.find(cat => cat.id === club.categoryId);
            categoryCell.textContent = category ? category.name : (club.categoryId || 'Neznáma kategória');

            const groupCell = row.insertCell();
            let displayedGroupName = 'Nepriradené';
             if (club.groupId && typeof club.groupId === 'string' && club.groupId.trim() !== '') {
                 const group = allGroups.find(g => g.id === club.groupId);
                 if (group) {
                     displayedGroupName = group.name || group.id;
                 } else {
                      // Ak sa skupina nenašla v načítaných skupinách, skús zobraziť časť ID
                      const parts = club.groupId.split(' - ');
                      if (parts.length > 1) {
                           displayedGroupName = parts.slice(1).join(' - ').trim() || club.groupId;
                      } else {
                           displayedGroupName = club.groupId;
                      }
                 }
            } else if (club.groupId) {
                 displayedGroupName = 'Neznáma skupina (neplatný formát ID)';
            }
            groupCell.textContent = displayedGroupName;

            const orderCell = row.insertCell();
            orderCell.textContent = (club.groupId && typeof club.orderInGroup === 'number' && club.orderInGroup > 0) ? club.orderInGroup : '-';
            orderCell.style.textAlign = 'center'; // Centrovanie čísla
        });
    }
}

// Funkcia na načítanie a zobrazenie detailov jedného klubu
async function displayClubDetails(clubId) {
    // Skry zoznam a zobraz sekciu detailov
    if (clubListSection) clubListSection.style.display = 'none';
    if (clubDetailSection) clubDetailSection.style.display = 'block';

     // Vyprázdni predchádzajúce detaily
     if(trenerInfoSpan) trenerInfoSpan.textContent = 'Načítavam...';
     if(veduciDruzstvaInfoSpan) veduciDruzstvaInfoSpan.textContent = 'Načítavam...';
     if(soupiskaHracovUl) soupiskaHracovUl.innerHTML = '<li>Načítavam súpisku...</li>';

    try {
        // Načítaj samotný dokument klubu
        const clubDocRef = doc(clubsCollectionRef, clubId);
        const clubDoc = await getDoc(clubDocRef);

        if (!clubDoc.exists()) {
            // Ak klub neexistuje, zobraz správu a vráť sa na zoznam
            if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = 'Chyba: Klub nenájdený';
            if (realizacnyTimDiv) realizacnyTimDiv.innerHTML = '<p style="color: red;">Detail klubu sa nepodarilo načítať.</p>';
            if (soupiskaHracovUl) soupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
            console.error(`Klub s ID ${clubId} sa nenašiel.`);
            return; // Zostaň na detail obrazovke s chybou, používateľ môže kliknúť späť
        }

        const clubData = clubDoc.data();
        const clubName = clubData.name || clubDoc.id;

        // Nastav názov klubu v hlavičke detailu
        if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = clubName;

        // --- Načítanie a zobrazenie Realizačného tímu ---
        // Predpokladáme subkolekciu 'realizacnyTim' pod dokumentom klubu
        if (realizacnyTimDiv) {
            realizacnyTimDiv.innerHTML = ''; // Vyprázdni predchádzajúci obsah
            const trenerPara = document.createElement('p');
            trenerPara.textContent = 'Tréner: ';
            const trenerSpan = document.createElement('span');
            trenerSpan.id = 'trenerInfo'; // Zachovaj ID pre konzistenciu, ak by sa niekedy menilo dynamicky
            trenerSpan.textContent = 'Načítavam...'; // Počiatočný stav
            trenerPara.appendChild(trenerSpan);
            realizacnyTimDiv.appendChild(trenerPara);

            const veduciPara = document.createElement('p');
            veduciPara.textContent = 'Vedúci družstva: ';
            const veduciSpan = document.createElement('span');
            veduciSpan.id = 'veduciDruzstvaInfo'; // Zachovaj ID
            veduciSpan.textContent = 'Načítavam...'; // Počiatočný stav
            veduciPara.appendChild(veduciSpan);
            realizacnyTimDiv.appendChild(veduciPara);

            try {
                 const realizacnyTimCollectionRef = collection(clubDoc.ref, 'realizacnyTim');
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

                 // Aktualizuj text po načítaní
                 if(trenerSpan) trenerSpan.textContent = trenerName;
                 if(veduciSpan) veduciSpan.textContent = veduciName;

            } catch (realizacnyTimError) {
                 console.error('Chyba pri načítaní realizačného tímu:', realizacnyTimError);
                 if(trenerSpan) trenerSpan.textContent = 'Chyba pri načítaní';
                 if(veduciSpan) veduciSpan.textContent = 'Chyba pri načítaní';
            }
        }


        // --- Načítanie a zobrazenie Súpisky hráčov ---
        // Predpokladáme subkolekciu 'hraci' pod dokumentom klubu
        if (soupiskaHracovUl) {
             soupiskaHracovUl.innerHTML = ''; // Vyprázdni predchádzajúci obsah

             try {
                  const hraciCollectionRef = collection(clubDoc.ref, 'hraci');
                  const hraciSnapshot = await getDocs(hraciCollectionRef);

                  if (hraciSnapshot.empty) {
                       const noPlayersItem = document.createElement('li');
                       noPlayersItem.textContent = 'Zatiaľ bez súpisky.';
                       soupiskaHracovUl.appendChild(noPlayersItem);
                  } else {
                       const hraciList = hraciSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                       // Zoraď hráčov, napr. podľa čísla dresu alebo mena
                       hraciList.sort((a, b) => {
                            // Predpokladáme pole 'cisloDresu' a 'meno' pre hráčov
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
                            // Zobraz číslo dresu (ak existuje) a meno
                            let hracText = '';
                            if (typeof hrac.cisloDresu === 'number' && hrac.cisloDresu > 0) {
                                 hracText += `${hrac.cisloDresu}. `;
                            }
                            hracText += hrac.meno || hrac.id || 'Neznámy hráč';
                            hracItem.textContent = hracText;
                            soupiskaHracovUl.appendChild(hracItem);
                       });
                  }
             } catch (hraciError) {
                  console.error('Chyba pri načítaní súpisky hráčov:', hraciError);
                  if (soupiskaHracovUl) {
                       soupiskaHracovUl.innerHTML = '<li>Chyba pri načítaní súpisky.</li>';
                  }
             }
        }


    } catch (error) {
        console.error('Chyba pri načítaní detailov klubu:', error);
         if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = 'Chyba pri načítaní detailov';
         if (realizacnyTimDiv) realizacnyTimDiv.innerHTML = '<p style="color: red;">Nepodarilo sa načítať detaily.</p>';
         if (soupiskaHracovUl) soupiskaHracovUl.innerHTML = '<li>Nepodarilo sa načítať súpisku.</li>';
    }
}

// Funkcia na návrat zo zobrazenia detailov na zoznam klubov
function goBackToList() {
    if (clubListSection) clubListSection.style.display = 'block';
    if (clubDetailSection) clubDetailSection.style.display = 'none';

    // Vyprázdni detaily pri návrate, aby sa nezobrazovali pri ďalšom otvorení
    if (clubDetailTitleSpan) clubDetailTitleSpan.textContent = '';
    if (realizacnyTimDiv) realizacnyTimDiv.innerHTML = '';
    if (soupiskaHracovUl) soupiskaHracovUl.innerHTML = '';
}

// Inicializácia po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    // Načítaj dáta hneď pri načítaní stránky
    await loadTournamentData();

    // Zobraz tabuľku klubov
    displayClubsTable();

    // Pridaj poslucháč udalosti na tlačidlo "Späť na zoznam"
    if (backToListButton) {
        backToListButton.addEventListener('click', goBackToList);
    } else {
         console.error("Element #backToListButton not found!");
    }
});
