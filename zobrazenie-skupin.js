// zobrazenie-skupin.js

// Importy z common.js
import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef,
         getDocs, query, where } from './spravca-turnaja-common.js';

// Získanie referencie na div, kde sa bude zobrazovať obsah skupín
const groupsDisplayContent = document.getElementById('groupsDisplayContent');

// Polia pre uchovanie všetkých načítaných dát
let allCategories = [];
let allGroups = [];
let allTeams = [];

// Funkcia na načítanie všetkých dát z databázy
async function loadAllTournamentData() {
    try {
        // Načítať kategórie
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || '').localeCompare((b.name || ''), 'sk-SK')); // Zoradiť kategórie abecedne

        // Načítať skupiny
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Zoradiť skupiny (napr. podľa ID alebo názvu, v rámci kategórií sa bude ďalej zoraďovať)
         allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));


        // Načítať tímy
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         // Tímy budú zoradené v rámci skupín

        console.log("INFO: Dáta turnaja načítané:", { allCategories, allGroups, allTeams });

    } catch (error) {
        console.error("Chyba pri načítaní dát turnaja:", error);
        if (groupsDisplayContent) {
             groupsDisplayContent.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}

// Funkcia na zobrazenie skupín a tímov
function displayGroups() {
    if (!groupsDisplayContent) {
        console.error("Element pre zobrazenie skupín nenájdený!");
        return;
    }

    groupsDisplayContent.innerHTML = ''; // Vyčistiť predchádzajúci obsah

    if (allCategories.length === 0 && allGroups.length === 0 && allTeams.length === 0) {
         groupsDisplayContent.innerHTML = '<p>Zatiaľ nie sú vytvorené žiadne kategórie, skupiny ani tímy.</p>';
         return;
    }

    // Zobraziť skupiny rozdelené podľa kategórií
    allCategories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.classList.add('category-display');

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name || 'Neznáma kategória';
        categoryDiv.appendChild(categoryTitle);

        // Nájdi skupiny patriace do tejto kategórie
        const groupsInCategory = allGroups.filter(group => group.categoryId === category.id);

         if (groupsInCategory.length === 0) {
              const noGroupsPara = document.createElement('p');
              noGroupsPara.textContent = `V kategórii "${category.name || category.id}" zatiaľ nie sú vytvorené žiadne skupiny.`;
              categoryDiv.appendChild(noGroupsPara);
         } else {
             // Zoradiť skupiny v rámci kategórie (napr. podľa názvu)
              groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));

            groupsInCategory.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.classList.add('group-display');

                const groupTitle = document.createElement('h3');
                groupTitle.textContent = group.name || 'Neznáma skupina';
                groupDiv.appendChild(groupTitle);

                // Nájdi tímy priradené k tejto skupine
                const teamsInGroup = allTeams.filter(team => team.groupId === group.id);

                 if (teamsInGroup.length === 0) {
                     const noTeamsPara = document.createElement('p');
                     noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                     groupDiv.appendChild(noTeamsPara);
                 } else {
                     // Zoradiť tímy v skupine podľa poradia (orderInGroup), potom abecedne
                     teamsInGroup.sort((a, b) => {
                         const orderA = a.orderInGroup || Infinity; // Tímy bez poradia na koniec
                         const orderB = b.orderInGroup || Infinity;
                         if (orderA !== orderB) {
                             return orderA - orderB;
                         }
                         const nameA = (a.name || a.id || '').toLowerCase();
                         const nameB = (b.name || b.id || '').toLowerCase();
                         return nameA.localeCompare(nameB, 'sk-SK');
                     });

                     const teamList = document.createElement('ul');
                     teamsInGroup.forEach(team => {
                         const teamItem = document.createElement('li');
                         const teamNameSpan = document.createElement('span');
                         teamNameSpan.textContent = team.name || 'Neznámy tím';
                         teamItem.appendChild(teamNameSpan);

                         if (typeof team.orderInGroup === 'number' && team.orderInGroup > 0) {
                              const orderSpan = document.createElement('span');
                              orderSpan.textContent = `Poradie: ${team.orderInGroup}`;
                              teamItem.appendChild(orderSpan);
                         }

                         teamList.appendChild(teamItem);
                     });
                     groupDiv.appendChild(teamList);
                 }

                categoryDiv.appendChild(groupDiv);
            });
         }


        groupsDisplayContent.appendChild(categoryDiv);
    });

    // Zobraziť tímy bez priradenej skupiny
    const unassignedTeams = allTeams.filter(team => !team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === ''));

    if (unassignedTeams.length > 0) {
        const unassignedDiv = document.createElement('div');
        unassignedDiv.classList.add('unassigned-teams-display');

        const unassignedTitle = document.createElement('h2');
        unassignedTitle.textContent = 'Nepriradené tímy';
        unassignedDiv.appendChild(unassignedTitle);

        // Zoradiť nepriradené tímy abecedne, prípadne podľa kategórie
        unassignedTeams.sort((a, b) => {
             const categoryA = a.categoryId ? (allCategories.find(cat => cat.id === a.categoryId)?.name || a.categoryId) : 'Z'; // Tímy bez kat na koniec
             const categoryB = b.categoryId ? (allCategories.find(cat => cat.id === b.categoryId)?.name || b.categoryId) : 'Z';
             const nameA = (a.name || a.id || '').toLowerCase();
             const nameB = (b.name || b.id || '').toLowerCase();

             if (categoryA !== categoryB) {
                  return categoryA.localeCompare(categoryB, 'sk-SK');
             }
             return nameA.localeCompare(nameB, 'sk-SK');
        });


        const unassignedList = document.createElement('ul');
        let currentCategory = null;

        unassignedTeams.forEach(team => {
             const teamCategory = team.categoryId ? (allCategories.find(cat => cat.id === team.categoryId)?.name || team.categoryId) : 'Bez kategórie';

             if (teamCategory !== currentCategory) {
                  const categoryHeader = document.createElement('li');
                  categoryHeader.style.fontWeight = 'bold';
                   categoryHeader.style.marginTop = '10px';
                   categoryHeader.style.backgroundColor = '#e0e0e0'; // Svetlejší podklad pre kategóriu
                   categoryHeader.style.color = '#333';
                   categoryHeader.textContent = `Kategória: ${teamCategory}`;
                   unassignedList.appendChild(categoryHeader);
                  currentCategory = teamCategory;
             }


            const teamItem = document.createElement('li');
            teamItem.textContent = team.name || 'Neznámy tím';
            unassignedList.appendChild(teamItem);
        });
        unassignedDiv.appendChild(unassignedList);
        groupsDisplayContent.appendChild(unassignedDiv);
    }

}

// Načítanie dát a zobrazenie po načítaní DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log("INFO: DOM plne načítaný pre zobrazenie skupín.");
    await loadAllTournamentData();
    displayGroups();
});
