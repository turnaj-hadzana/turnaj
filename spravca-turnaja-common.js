import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, addDoc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
const firebaseConfig = {
    apiKey: "AIzaSyD0h0rQZiIGi0-UDb4-YU_JihRGpIlfz40",
    authDomain: "turnaj-a28c5.firebaseapp.com",
    projectId: "turnaj-a28c5",
    storageBucket: "turnaj-a28c5.firebaseapp.com",
    messagingSenderId: "13732191148",
    appId: "1:13732191148:web:5ad78eaef2ad452a10f809"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const categoriesCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'categories');
export const groupsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'groups');
export const clubsCollectionRef = collection(db, 'tournamentData', 'mainTournamentData', 'clubs');
let openModalCount = 0;
export function openModal(modalElement) {
    if (!modalElement) {
        console.error("Attempted to open a null modal element.");
        return;
    }
    modalElement.style.display = 'block';
    openModalCount++;
    if (openModalCount === 1) {
        document.body.classList.add('modal-open');
    }
}
export function closeModal(modalElement) {
    if (!modalElement) {
         console.error("Attempted to close a null modal element.");
         return;
    }
    modalElement.style.display = 'none';
    openModalCount--;
    if (openModalCount < 0) {
        openModalCount = 0;
    }
    if (openModalCount === 0) {
        document.body.classList.remove('modal-open');
    }
}
window.addEventListener('click', (e) => {
    const visibleModals = Array.from(document.querySelectorAll('.modal')).filter(modal => modal.style.display === 'block');
    visibleModals.forEach(modal => {
        if (e.target === modal && modal.style.display === 'block') {
            closeModal(modal);
        }
    });
});
export async function populateCategorySelect(selectElement, selectedCategoryId = null) {
     const currentSelected = selectElement.disabled ? null : selectElement.value;
     selectElement.innerHTML = '<option value="">-- Vyberte kategóriu --</option>';
     selectElement.disabled = true;
     try {
         const querySnapshot = await getDocs(categoriesCollectionRef);
         if (querySnapshot.empty) {
              const option = document.createElement('option');
              option.value = '';
              option.textContent = '-- Žiadne kategórie --';
              option.disabled = true;
              selectElement.appendChild(option);
         } else {
              selectElement.disabled = false;
              const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
              sortedDocs.forEach((doc) => {
                   const categoryName = doc.id;
                   const option = document.createElement('option');
                   option.value = categoryName;
                   option.textContent = categoryName;
                   selectElement.appendChild(option);
              });
              if (selectedCategoryId && selectElement.querySelector(`option[value="${selectedCategoryId}"]`)) {
                  selectElement.value = selectedCategoryId;
              } else if (currentSelected && selectElement.querySelector(`option[value="${currentSelected}"]`)) {
                   selectElement.value = currentSelected;
              } else {
                   selectElement.value = "";
              }
           }
        } catch (error) {
            console.error('Chyba pri načítaní kategórií pre select:', error);
             const option = document.createElement('option');
             option.value = '';
             option.textContent = '-- Chyba pri načítaní --';
             option.disabled = true;
             selectElement.appendChild(option);
             selectElement.disabled = true;
        }
   }
   export async function populateGroupSelect(selectedCategoryId, selectElement, selectedGroupId = null) {
         const currentSelected = selectElement.disabled ? null : selectElement.value;
         selectElement.innerHTML = '<option value="">-- Vyberte skupinu --</option>';
         selectElement.disabled = true;
         if (!selectedCategoryId || selectedCategoryId === '' || selectedCategoryId.startsWith('--')) {
               const option = document.createElement('option');
               option.value = '';
               option.textContent = '-- Najprv vyberte kategóriu --';
               option.disabled = true;
               selectElement.appendChild(option);
             return;
         }
         try {
              const groupsQuery = query(groupsCollectionRef, where('categoryId', '==', selectedCategoryId));
             const querySnapshot = await getDocs(groupsQuery);
             if (querySnapshot.empty) {
                  const option = document.createElement('option');
                  option.value = '';
                  option.textContent = '-- Žiadne skupiny v kategórii --';
                  option.disabled = true;
                  selectElement.appendChild(option);
             } else {
                  selectElement.disabled = false;
                  const sortedDocs = querySnapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
                  sortedDocs.forEach((doc) => {
                       const groupId = doc.id;
                       const groupData = doc.data();
                       const groupName = groupData.name || groupId;
                       const option = document.createElement('option');
                       option.value = groupId;
                       option.textContent = groupName;
                       selectElement.appendChild(option);
                  });
                  if (selectedGroupId && selectElement.querySelector(`option[value="${selectedGroupId}"]`)) {
                      selectElement.value = selectedGroupId;
                  } else if (currentSelected && selectElement.querySelector(`option[value="${currentSelected}"]`)) {
                       selectElement.value = currentSelected;
                  } else {
                       selectElement.value = "";
                  }
               }
            } catch (error) {
                console.error(`Chyba pri načítaní skupín pre kategóriu ${selectedCategoryId}: `, error);
                 const option = document.createElement('option');
                 option.value = '';
                 option.textContent = '-- Chyba pri načítaní --';
                 option.disabled = true;
                 selectElement.appendChild(option);
                 selectElement.disabled = true;
            }
    }
export { db, query, where, getDocs, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, addDoc, doc };
