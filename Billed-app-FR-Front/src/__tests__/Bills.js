/**
 * @jest-environment jsdom
 */
import { screen, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import BillsUI from '../views/BillsUI.js';
import { bills } from '../fixtures/bills.js';
import { ROUTES_PATH, ROUTES } from '../constants/routes.js';
import { localStorageMock } from '../__mocks__/localStorage.js';
import mockStore from '../__mocks__/store';
import router from '../app/Router.js';
import Bills from '../containers/Bills';

// Simule le module Store en utilisant une BDD simulée
jest.mock('../app/Store', () => mockStore);

// Avant chaque test, on prépapre le DOm pour les tests
beforeEach(() => {
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);
  router();

  // Définit l'utilisateur connecté
  window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
});

// Suite de tests
describe('Given I am connected as an employee', () => {
  describe('When I am on Bills Page', () => {
    // Test pour vérifier si l'icône de facture est mise en évidence
    test('Then bill icon in vertical layout should be highlighted', async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      // Attend que l'icône de facture soit visible
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');

      // Vérifie si l'icône de facture a la classe 'active-icon'
      expect(windowIcon).toHaveClass('active-icon'); 
    });

    // Test pour vérifier l'ordre des factures
    test('Then bills should be ordered from earliest to latest', () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono).reverse();
      
      // Vérifie si les dates sont triées du plus récent au plus ancien
      expect(dates).toEqual(datesSorted); 
    });
  });

  // Test pour l'affichage de la modale pour voir le justificatif
  describe('When I click on a eye icon', () => {
    test('Then a modal should be display', () => {
      document.body.innerHTML = BillsUI({ data: bills });

      // Définit la méthode onNavigate qui permet de simuler le changement de page
      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      // Crée une instance Bills
      const bill = new Bills({
        document,
        onNavigate,
        localStorage: localStorageMock,
        store: null
      });

      // Simule la fonction modal en jQuery
      $.fn.modal = jest.fn();

      // Déclare une fonction handleClickIconEye qui est une fonction simulée utilisant jest.fn()
      const handleClickIconEye = jest.fn(() => {
        bill.handleClickIconEye;
      });

      // Récupère tous les éléments avec l'attribut de test 'icon-eye' et les stocke dans eyeIcons
      const eyeIcons = screen.getAllByTestId('icon-eye');

      for (let eyeIcon of eyeIcons) {
        handleClickIconEye(eyeIcon);
        userEvent.click(eyeIcon);
      }

      // Vérifie si la fonction handleClickIconEye a été appelée le bon nombre de fois
      expect(handleClickIconEye).toHaveBeenCalledTimes(eyeIcons.length); 
      // Vérifie si la fonction modal de jQuery a été appelée
      expect($.fn.modal).toHaveBeenCalled(); 
    });
  });

  // Test pour le bouton 'nouvelle note de frais'
  describe('When I click on the "Nouvelle note de frais" button', () => {
    test('Then it should navigate to the "Nouvelle note de frais" page', async () => {
      window.onNavigate(ROUTES_PATH.Bills);

      // Crée une instance de la classe Bills
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage
      });

      // Attend que le bouton "Nouvelle note de frais" soit visible
      await waitFor(() => screen.getByTestId('btn-new-bill'));
      const newBillBtn = screen.getByTestId('btn-new-bill');

      // Définit la fonction de gestion de l'événement de clic pour le bouton "Nouvelle note de frais"
      const handleClickNewBill = jest.fn(() => billsContainer.handleClickNewBill());

      // Ajoute l'écouteur d'événement de clic au bouton "Nouvelle note de frais"
      newBillBtn.addEventListener('click', handleClickNewBill);

      // Simule un clic sur le bouton "Nouvelle note de frais"
      userEvent.click(newBillBtn);

      // Vérifie si la fonction handleClickNewBill a été appelée
      expect(handleClickNewBill).toHaveBeenCalled(); 
      // Vérifie si le formulaire de nouvelle note de frais est visible
      expect(screen.getByTestId('form-new-bill')).toBeTruthy(); 
    });
  });

  // Test pour le chargement de la page
  describe('When I went on Bills page and it is loading', () => {
    test('Then, Loading page should be rendered', () => {
      document.body.innerHTML = BillsUI({ loading: true });

      // Vérifie si le texte 'Loading...' est visible
      expect(screen.getByText('Loading...')).toBeVisible(); 

      document.body.innerHTML = '';
    });
  });
});

// Tests d'intégration pour GET les factures
describe('Given I am a user connected as Employee', () => {
  describe('When I navigate to Bills', () => {
    beforeEach(() => {
      jest.spyOn(mockStore, 'bills');
    });

    // Test pour récupérer les factures via l'API
    test('fetches bills from mock API GET', async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      const bills = await mockStore.bills().list();

      // Vérifie si le tableau contenant les factures est présent dans le DOM
      expect(await waitFor(() => screen.getByTestId('tbody'))).toBeTruthy();
      // Vérifie si le nombre de factures récupérées est égal à 4
      expect(bills.length).toBe(4);
    });

    // Test pour simuler une erreur 404
    // Code erreur HTTP qui indique que la ressource demandée n'a pas été trouvée sur le serveur...
    test('Then, fetches bills from an API and fails with 404 message error', async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error('Erreur 404'));
          }
        };
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = screen.getByText(/Erreur 404/);

      // Vérifie si le message d'erreur 404 est affiché à l'écran
      expect(message).toBeTruthy();
    });

    // Test pour simuler une erreur 500
    // Code erreur HTTP qui indique qu'une erreur s'est produite du côté du serveur lors du traitement de la requête...
    test('Then, fetches messages from an API and fails with 500 message error', async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error('Erreur 500'));
          }
        };
      });
      window.onNavigate(ROUTES_PATH.Bills);
      await new Promise(process.nextTick);
      const message = screen.getByText(/Erreur 500/);
      
      // Vérifie si le message d'erreur 500 est affiché à l'écran
      expect(message).toBeTruthy();
    });
  });
});
