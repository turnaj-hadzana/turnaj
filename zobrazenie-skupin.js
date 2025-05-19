import { db, categoriesCollectionRef, groupsCollectionRef, clubsCollectionRef, getDocs, query, where } from './spravca-turnaja-common.js';
let dynamicContentArea = null;
let backToCategoriesButton = null;
let backToGroupButtonsButton = null;
let categoryButtonsContainer = null;
let categoryTitleDisplay = null;
let groupSelectionButtons = null;
let allGroupsContent = null;
let singleGroupContent = null;
let allGroupsContainer = null;
let allGroupsUnassignedDisplay = null;
let singleGroupDisplayBlock = null;
let singleGroupUnassignedDisplay = null;
let allCategories = [];
let allGroups = [];
let allTeams = [];
let currentCategoryId = null;
let currentGroupId = null;
function getHTMLElements() {
     dynamicContentArea = document.getElementById('dynamicContentArea');
     backToCategoriesButton = document.getElementById('backToCategoriesButton');
     backToGroupButtonsButton = document.getElementById('backToGroupButtonsButton');
     categoryButtonsContainer = document.getElementById('categoryButtonsContainer');
     categoryTitleDisplay = document.getElementById('categoryTitleDisplay');
     groupSelectionButtons = document.getElementById('groupSelectionButtons');
     allGroupsContent = document.getElementById('allGroupsContent');
     singleGroupContent = document.getElementById('singleGroupContent');
     allGroupsContainer = allGroupsContent ? allGroupsContent.querySelector('.groups-container') : null;
     allGroupsUnassignedDisplay = allGroupsContent ? allGroupsContent.querySelector('.unassigned-teams-display') : null;
     singleGroupDisplayBlock = singleGroupContent ? singleGroupContent.querySelector('.group-display') : null;
     singleGroupUnassignedDisplay = singleGroupContent ? singleGroupContent.querySelector('.unassigned-teams-display') : null;
     const elementsFound = dynamicContentArea && backToCategoriesButton && backToGroupButtonsButton &&
                           categoryButtonsContainer && categoryTitleDisplay && groupSelectionButtons &&
                           allGroupsContent && singleGroupContent &&
                           allGroupsContainer && allGroupsUnassignedDisplay &&
                           singleGroupDisplayBlock && singleGroupUnassignedDisplay;
    if (!elementsFound) {
         if (dynamicContentArea) dynamicContentArea.innerHTML = '<p>FATAL ERROR: Chyba pri inicializácii aplikácie. Chýbajú potrebné HTML elementy. Skontrolujte konzolu pre detaily.</p>';
         if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
         if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         if (allGroupsContent) allGroupsContent.style.display = 'none';
         if (singleGroupContent) singleGroupContent.style.display = 'none';
         if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
         if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
         return false;
     }
      return true;
}
async function loadAllTournamentData() {
    try {
        const categoriesSnapshot = await getDocs(categoriesCollectionRef);
        allCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allCategories.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        allGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         allGroups = allGroups.map(group => {
              if (!group.categoryId) {
                 const categoryFromId = allCategories.find(cat => group.id.startsWith(`${cat.id} - `));
                 if (categoryFromId) {
                      group.categoryId = categoryFromId.id;
                 }
              }
              return group;
         }).filter(group => group.categoryId);
        allGroups.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));
        const teamsSnapshot = await getDocs(clubsCollectionRef);
        allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        if (dynamicContentArea && categoryButtonsContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
            categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
        } else if (dynamicContentArea) {
             dynamicContentArea.innerHTML = '<p>Nepodarilo sa načítať dáta turnaja. Prosím, skúste znova.</p>';
        }
        if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'none';
        if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
        if (allGroupsContent) allGroupsContent.style.display = 'none';
        if (singleGroupContent) singleGroupContent.style.display = 'none';
        if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
        if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
        alert("Nepodarilo sa načítať dáta turnaja.");
    }
}
function showOnly(containerIdToShow) {
    if (allGroupsContent) allGroupsContent.style.display = 'none';
    if (singleGroupContent) singleGroupContent.style.display = 'none';
    if (dynamicContentArea) {
        if (containerIdToShow === 'singleGroupContent') {
            dynamicContentArea.classList.add('single-group-active');
        } else {
            dynamicContentArea.classList.remove('single-group-active');
        }
    }
    switch (containerIdToShow) {
        case 'allGroupsContent':
            if (allGroupsContent) allGroupsContent.style.display = 'block';
            break;
        case 'singleGroupContent':
            if (singleGroupContent) singleGroupContent.style.display = 'block';
            break;
        default:
             if (allGroupsContent) allGroupsContent.style.display = 'none';
             if (singleGroupContent) singleGroupContent.style.display = 'none';
            break;
    }
     if (containerIdToShow === 'allGroupsContent' && allGroupsContainer && window.getComputedStyle(allGroupsContent).display !== 'none') {
         const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
          if (uniformWidth > 0) {
             setUniformTableWidth(uniformWidth, allGroupsContainer);
          }
     } else if (containerIdToShow === 'singleGroupContent' && singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none') {
           const uniformWidth = findMaxTableContentWidth(singleGroupContent);
            if (uniformWidth > 0) {
               setUniformTableWidth(uniformWidth, singleGroupContent);
            }
     }
}
function clearActiveCategoryButtons() {
    const categoryButtons = categoryButtonsContainer ? categoryButtonsContainer.querySelectorAll('.display-button') : [];
    categoryButtons.forEach(button => button.classList.remove('active'));
}
function setActiveCategoryButton(categoryId) {
    clearActiveCategoryButtons();
    const categoryButton = categoryButtonsContainer ? categoryButtonsContainer.querySelector(`.display-button[data-category-id="${categoryId}"]`) : null;
    if (categoryButton) {
        categoryButton.classList.add('active');
    }
}
function clearActiveGroupButtons() {
     const groupButtons = groupSelectionButtons ? groupSelectionButtons.querySelectorAll('.display-button') : [];
     groupButtons.forEach(button => button.classList.remove('active'));
     const groupTitlesInAllView = allGroupsContainer ? allGroupsContainer.querySelectorAll('.group-display h3') : [];
     groupTitlesInAllView.forEach(title => title.classList.remove('active-title'));
function setActiveGroupButton(groupId) {
    clearActiveGroupButtons();
    const groupButton = groupSelectionButtons ? groupSelectionButtons.querySelector(`.display-button[data-group-id="${groupId}"]`) : null;
    if (groupButton) {
        groupButton.classList.add('active');
    }
     const groupTitleInAllView = allGroupsContainer ? allGroupsContainer.querySelector(`.group-display h3`) : null;
     if (allGroupsContainer) {
         const groupDisplays = allGroupsContainer.querySelectorAll('.group-display');
         groupDisplays.forEach(groupDiv => {
             const h3Title = groupDiv.querySelector('h3');
              const group = allGroups.find(g => g.id === groupId);
              if (group && h3Title && h3Title.textContent === (group.name || group.id)) {
                   h3Title.classList.add('active-title');
              }
         });
     }
}
function displayCategoriesAsButtons() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    showOnly(null);
    if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '';
    clearActiveCategoryButtons();
    clearActiveGroupButtons();
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }
    if (allCategories.length === 0) {
        if (categoryButtonsContainer) categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
        return;
    }
    const chlapciCategories = [];
    const dievcataCategories = [];
    const ostatneCategories = [];
    const sortedCategories = [...allCategories].sort((a, b) => (a.name || a.id || '').localeCompare((b.name || b.id || ''), 'sk-SK'));
    sortedCategories.forEach(category => {
        const categoryName = category.name || category.id;
        if (categoryName.endsWith(' CH')) {
            chlapciCategories.push(category);
        } else if (categoryName.endsWith(' D')) {
            dievcataCategories.push(category);
        } else {
            ostatneCategories.push(category);
        }
    });
    const createCategoryGroupDisplay = (title, categories) => {
        if (categories.length === 0) return null;
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('category-group');
        const heading = document.createElement('h3');
        heading.textContent = title;
        groupDiv.appendChild(heading);
        const buttonsDiv = document.createElement('div');
        buttonsDiv.classList.add('category-buttons');
        groupDiv.appendChild(buttonsDiv);
        categories.forEach(category => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = category.name || category.id;
            button.dataset.categoryId = category.id;
            button.addEventListener('click', () => {
                const categoryId = button.dataset.categoryId;
                displayGroupsForCategory(categoryId);
            });
            buttonsDiv.appendChild(button);
        });
        return groupDiv;
    };
    if (categoryButtonsContainer) {
         const chlapciGroup = createCategoryGroupDisplay('Chlapci', chlapciCategories);
         if (chlapciGroup) {
              categoryButtonsContainer.appendChild(chlapciGroup);
         }
         const dievcataGroup = createCategoryGroupDisplay('Dievčatá', dievcataCategories);
         if (dievcataGroup) {
              categoryButtonsContainer.appendChild(dievcataGroup);
         }
         const ostatneGroup = createCategoryGroupDisplay('Ostatné kategórie', ostatneCategories);
          if (ostatneGroup) {
              categoryButtonsContainer.appendChild(ostatneGroup);
         }

         if (categoryButtonsContainer.children.length === 0) {
              categoryButtonsContainer.innerHTML = '<p>Zatiaľ nie sú pridané žiadne kategórie.</p>';
         }
    }
}
function displayGroupsForCategory(categoryId) {
    currentCategoryId = categoryId;
    currentGroupId = null;
     if (!getHTMLElements()) {
         goBackToCategories();
         return;
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
    showOnly('allGroupsContent');
    setActiveCategoryButton(categoryId);
    clearActiveGroupButtons();
    window.location.hash = 'category-' + encodeURIComponent(categoryId);
    const selectedCategory = allCategories.find(cat => cat.id === categoryId);
    if (!selectedCategory) {
         if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         showOnly(null);
         if (dynamicContentArea && categoryButtonsContainer) {
             const errorDiv = document.createElement('div');
             errorDiv.innerHTML = `<p>Chyba: Kategória "${categoryId}" sa nenašla. Prosím, skúste znova alebo kontaktujte administrátora.</p>`;
             categoryButtonsContainer.parentNode.insertBefore(errorDiv, categoryButtonsContainer.nextSibling);
         }
        return;
    }
    if (categoryTitleDisplay) categoryTitleDisplay.textContent = selectedCategory.name || selectedCategory.id;
    const groupsInCategory = allGroups.filter(group => group.categoryId === categoryId);
     if (allGroupsContainer) {
         if (groupsInCategory.length === 5) {
              allGroupsContainer.classList.add('force-3-plus-2-layout');
         } else {
              allGroupsContainer.classList.remove('force-3-plus-2-layout');
         }
     }
    groupsInCategory.sort((a, b) => (a.name || a.id || '').localeCompare((b.name || a.id || ''), 'sk-SK'));
    if (groupsInCategory.length === 0) {
         if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
         if (allGroupsContainer) allGroupsContainer.innerHTML = `<p>V kategórii "${selectedCategory.name || selectedCategory.id}" zatiaľ nie sú vytvorené žiadne skupiny.</p>`;
    } else {
        if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
        groupsInCategory.forEach(group => {
            const button = document.createElement('button');
            button.classList.add('display-button');
            button.textContent = group.name || group.id;
            button.dataset.groupId = group.id;
            button.addEventListener('click', () => {
                 const groupIdToDisplay = button.dataset.groupId;
                 displaySingleGroup(groupIdToDisplay);
            });
            if (groupSelectionButtons) groupSelectionButtons.appendChild(button);
        });
        groupsInCategory.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('group-display');
            groupDiv.dataset.groupId = group.id;
            const groupTitle = document.createElement('h3');
            groupTitle.textContent = group.name || group.id;
            groupDiv.appendChild(groupTitle);
            groupTitle.style.cursor = 'pointer';
            groupTitle.addEventListener('click', () => {
                  const groupIdToDisplay = group.id;
                  displaySingleGroup(groupIdToDisplay);
            });
            const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
            if (teamsInGroup.length === 0) {
                const noTeamsPara = document.createElement('p');
                noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
                 noTeamsPara.style.padding = '10px';
                groupDiv.appendChild(noTeamsPara);
            } else {
                teamsInGroup.sort((a, b) => {
                    const orderA = a.orderInGroup || Infinity;
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
                    teamNameSpan.classList.add('team-name');
                    teamNameSpan.textContent = team.name || 'Neznámy tím';
                    teamItem.appendChild(teamNameSpan);
                    teamList.appendChild(teamItem);
                });
                groupDiv.appendChild(teamList);
            }
            if (allGroupsContainer) allGroupsContainer.appendChild(groupDiv);
        });
    }
    const unassignedTeamsInCategory = allTeams.filter(team =>
        (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
        team.categoryId === categoryId
    );
     if (unassignedTeamsInCategory.length > 0) {
         if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
         const unassignedDivContent = document.createElement('div');
         unassignedDivContent.classList.add('unassigned-teams-display');
         const unassignedTitle = document.createElement('h2');
         unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
         unassignedDivContent.appendChild(unassignedTitle);
         unassignedTeamsInCategory.sort((a, b) => {
              const nameA = (a.name || a.id || '').toLowerCase();
              const nameB = (b.name || b.id || '').toLowerCase();
              return nameA.localeCompare(nameB, 'sk-SK');
         });
         const unassignedList = document.createElement('ul');
         unassignedTeamsInCategory.forEach(team => {
              const teamItem = document.createElement('li');
              teamItem.textContent = team.name || 'Neznámy tím';
              unassignedList.appendChild(teamItem);
         });
         unassignedDivContent.appendChild(unassignedList);
         if (allGroupsUnassignedDisplay) {
              allGroupsUnassignedDisplay.appendChild(unassignedDivContent);
         }
     } else {
          if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
     }
}
function displaySingleGroup(groupId) {
     const group = allGroups.find(g => g.id === groupId);
     if (!group) {
           const hash = window.location.hash;
           const categoryPrefix = '#category-';
           const hashParts = hash.startsWith(categoryPrefix) ? hash.substring(categoryPrefix.length).split('/')[0] : null;
           const categoryIdFromHash = hashParts ? decodeURIComponent(hashParts) : null;

           if (categoryIdFromHash && allCategories.some(cat => cat.id === categoryIdFromHash)) {
                displayGroupsForCategory(categoryIdFromHash);
           } else {
                goBackToCategories();
           }
          return;
     }
     currentCategoryId = group.categoryId;
     currentGroupId = groupId;
     if (!getHTMLElements()) {
         goBackToCategories();
         return;
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'block';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    showOnly('singleGroupContent');
    setActiveCategoryButton(currentCategoryId);
    setActiveGroupButton(groupId);
     window.location.hash = `category-${encodeURIComponent(currentCategoryId)}/group-${encodeURIComponent(groupId)}`;
      const category = allCategories.find(cat => cat.id === currentCategoryId);
      if (category && categoryTitleDisplay) {
           categoryTitleDisplay.textContent = category.name || category.id;
      }
     if (singleGroupDisplayBlock) {
         const groupTitle = document.createElement('h3');
         groupTitle.textContent = group.name || group.id;
         groupTitle.style.cursor = 'default';
         groupTitle.style.pointerEvents = 'none';
         singleGroupDisplayBlock.appendChild(groupTitle);
         const teamsInGroup = allTeams.filter(team => team.groupId === group.id);
         if (teamsInGroup.length === 0) {
              const noTeamsPara = document.createElement('p');
              noTeamsPara.textContent = 'V tejto skupine zatiaľ nie sú žiadne tímy.';
              noTeamsPara.style.padding = '10px';
              singleGroupDisplayBlock.appendChild(noTeamsPara);
         } else {
              teamsInGroup.sort((a, b) => {
                   const orderA = a.orderInGroup || Infinity;
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
                   teamNameSpan.classList.add('team-name');
                   teamNameSpan.textContent = team.name || 'Neznámy tím';
                   teamItem.appendChild(teamNameSpan);
                   teamList.appendChild(teamItem);
              });
              singleGroupDisplayBlock.appendChild(teamList);
         }
     }
     const unassignedTeamsInCategory = allTeams.filter(team =>
         (!team.groupId || (typeof team.groupId === 'string' && team.groupId.trim() === '')) &&
         team.categoryId === currentCategoryId
     );
     if (unassignedTeamsInCategory.length > 0) {
         if (singleGroupUnassignedDisplay) {
             singleGroupUnassignedDisplay.innerHTML = '';
             const unassignedDivContent = document.createElement('div');
             unassignedDivContent.classList.add('unassigned-teams-display');
             const unassignedTitle = document.createElement('h2');
             unassignedTitle.textContent = 'Nepriradené tímy v tejto kategórii';
             unassignedDivContent.appendChild(unassignedTitle);
             unassignedTeamsInCategory.sort((a, b) => {
                  const nameA = (a.name || a.id || '').toLowerCase();
                  const nameB = (b.name || b.id || '').toLowerCase();
                  return nameA.localeCompare(nameB, 'sk-SK');
             });
             const unassignedList = document.createElement('ul');
             unassignedTeamsInCategory.forEach(team => {
                  const teamItem = document.createElement('li');
                  teamItem.textContent = team.name || 'Neznámy tím';
                  unassignedList.appendChild(teamItem);
             });
             unassignedDivContent.appendChild(unassignedList);
             if (singleGroupUnassignedDisplay) {
                  singleGroupUnassignedDisplay.appendChild(unassignedDivContent);
             }
          }
     } else {
          if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
     }
}
function goBackToCategories() {
    currentCategoryId = null;
    currentGroupId = null;
     if (!getHTMLElements()) {
         return;
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'none';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'none';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    if (allGroupsContainer) allGroupsContainer.innerHTML = '';
    if (allGroupsUnassignedDisplay) allGroupsUnassignedDisplay.innerHTML = '';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    if (groupSelectionButtons) groupSelectionButtons.innerHTML = '';
    showOnly(null);
    clearActiveCategoryButtons();
    clearActiveGroupButtons();
    if (window.location.hash) {
        history.replaceState({}, document.title, window.location.pathname);
    }
    displayCategoriesAsButtons();
}
function goBackToGroupView() {
     const categoryIdToReturnTo = currentCategoryId;
     currentGroupId = null;
     if (!getHTMLElements()) {
          goBackToCategories();
         return;
     }
     if (!categoryIdToReturnTo) {
         goBackToCategories();
         return;
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    if (categoryTitleDisplay) categoryTitleDisplay.style.display = 'block';
    if (groupSelectionButtons) groupSelectionButtons.style.display = 'flex';
    if (backToCategoriesButton) backToCategoriesButton.style.display = 'none';
    if (backToGroupButtonsButton) backToGroupButtonsButton.style.display = 'none';
    if (singleGroupDisplayBlock) singleGroupDisplayBlock.innerHTML = '';
    if (singleGroupUnassignedDisplay) singleGroupUnassignedDisplay.innerHTML = '';
    showOnly('allGroupsContent');
    setActiveCategoryButton(categoryIdToReturnTo);
    clearActiveGroupButtons();
    window.location.hash = 'category-' + encodeURIComponent(categoryIdToReturnTo);
    displayGroupsForCategory(categoryIdToReturnTo);
}
function findMaxTableContentWidth(containerElement) {
    let maxWidth = 0;
     if (!containerElement) {
         return 0;
     }
    const groupTables = containerElement.querySelectorAll('.group-display');
     if (groupTables.length === 0) {
         return 0;
     }
    groupTables.forEach(table => {
        const originalStyles = {
            flexBasis: table.style.flexBasis,
            width: table.style.width,
            minWidth: table.style.minWidth,
            maxWidth: table.style.maxWidth,
            flexShrink: table.style.flexShrink,
            flexGrow: table.style.flexGrow,
            display: table.style.display
        };
         let tempDisplay = originalStyles.display;
         if (window.getComputedStyle(table).display === 'none') {
              table.style.display = 'block';
         }
        table.style.flexBasis = 'max-content';
        table.style.width = 'auto';
        table.style.minWidth = 'auto';
        table.style.maxWidth = 'none';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
        const requiredWidth = table.offsetWidth;
        table.style.flexBasis = originalStyles.flexBasis;
        table.style.width = originalStyles.width;
        table.style.minWidth = originalStyles.minWidth;
        table.style.maxWidth = originalStyles.maxWidth;
        table.style.flexShrink = originalStyles.flexShrink;
        table.style.flexGrow = originalStyles.flexGrow;
         if (window.getComputedStyle(table).display === 'block' && tempDisplay === 'none') {
             table.style.display = originalStyles.display;
         }
        if (requiredWidth > maxWidth) {
            maxWidth = requiredWidth;
        }
    });
    const safetyPadding = 20;
    return maxWidth > 0 ? maxWidth + safetyPadding : 0;
}
function setUniformTableWidth(width, containerElement) {
    if (width <= 0 || !containerElement) {
        return;
    }
    const groupTables = containerElement.querySelectorAll('.group-display');
     if (groupTables.length === 0) {
         return;
     }
    groupTables.forEach(table => {
        table.style.width = `${width}px`;
        table.style.minWidth = `${width}px`;
        table.style.maxWidth = `${width}px`;
        table.style.flexBasis = 'auto';
        table.style.flexShrink = '0';
        table.style.flexGrow = '0';
    });
}
document.addEventListener('DOMContentLoaded', async () => {
     if (!getHTMLElements()) {
         return;
     }
    await loadAllTournamentData();
    if (backToCategoriesButton) backToCategoriesButton.addEventListener('click', goBackToCategories);
    if (backToGroupButtonsButton) backToGroupButtonsButton.addEventListener('click', goBackToGroupView);
    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';
    if (allCategories.length > 0) {
        displayCategoriesAsButtons();
        if (hash && hash.startsWith(categoryPrefix)) {
            const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
            const urlCategoryId = hashParts[0];
            const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
            const decodedCategoryId = decodeURIComponent(urlCategoryId);
            const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;
            const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);
            if (categoryExists) {
                displayGroupsForCategory(decodedCategoryId);
                if (decodedGroupId) {
                     const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                     if (groupExists) {
                          displaySingleGroup(decodedGroupId);
                     }
                }
            }
        } 
    }
});
window.addEventListener('hashchange', () => {
    if (!getHTMLElements()) {
         return; 
     }
    if (categoryButtonsContainer) categoryButtonsContainer.style.display = 'flex';
    const hash = window.location.hash;
    const categoryPrefix = '#category-';
    const groupPrefix = '/group-';
     if (hash && hash.startsWith(categoryPrefix)) {
        const hashParts = hash.substring(categoryPrefix.length).split(groupPrefix);
        const urlCategoryId = hashParts[0];
        const urlGroupId = hashParts.length > 1 ? hashParts[1] : null;
        const decodedCategoryId = decodeURIComponent(urlCategoryId);
        const decodedGroupId = urlGroupId ? decodeURIComponent(urlGroupId) : null;
        const categoryExists = allCategories.some(cat => cat.id === decodedCategoryId);
        if (categoryExists) {
             const alreadyInTargetState = (currentCategoryId === decodedCategoryId) &&
                                          (currentGroupId === decodedGroupId);
             if (alreadyInTargetState) {
                 return;
             }
            currentCategoryId = decodedCategoryId;
            currentGroupId = decodedGroupId;

            if (decodedGroupId) {
                 const groupExists = allGroups.some(group => group.id === decodedGroupId && group.categoryId === decodedCategoryId);
                 if (groupExists) {
                      displayGroupsForCategory(decodedCategoryId);
                      displaySingleGroup(decodedGroupId);
                 } else {
                      displayGroupsForCategory(decodedCategoryId);
                 }
            } else {
                displayGroupsForCategory(decodedCategoryId);
            }
        } else {
             goBackToCategories();
        }
    } else {
         goBackToCategories();
    }
});
window.addEventListener('resize', () => {
    if (!getHTMLElements()) {
         return;
     }
    if (currentCategoryId !== null) {
         const isAllGroupsVisible = allGroupsContent && window.getComputedStyle(allGroupsContent).display !== 'none';
         const isSingleGroupVisible = singleGroupContent && window.getComputedStyle(singleGroupContent).display !== 'none';
         if (isAllGroupsVisible && allGroupsContainer) {
             const uniformWidth = findMaxTableContentWidth(allGroupsContainer);
              if (uniformWidth > 0) {
                 setUniformTableWidth(uniformWidth, allGroupsContainer);
              }
         } else if (isSingleGroupVisible && singleGroupContent) {
              const uniformWidth = findMaxTableContentWidth(singleGroupContent);
               if (uniformWidth > 0) {
                   setUniformTableWidth(uniformWidth, singleGroupContent);
               }
         }
    }
 });
