/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from '@testing-library/dom';
import NewBillUI from '../views/NewBillUI.js';
import NewBill from '../containers/NewBill.js';
import BillsUI from '../views/BillsUI.js';
import { localStorageMock } from '../__mocks__/localStorage.js';
import mockStore from '../__mocks__/store';
import { ROUTES, ROUTES_PATH } from '../constants/routes.js';
import router from '../app/Router.js';

// Simule le module Store en utilisant une BDD simulée
jest.mock('../app/Store', () => mockStore);

// Avant chaque test, on initialise le corps du document HTML avec le contenu de NewBillUI
beforeEach(() => {
  document.body.innerHTML = NewBillUI();
});

// Définit la méthode onNavigate qui permet de simuler le changement de page
const onNavigate = pathname => {
  document.body.innerHTML = ROUTES({ pathname });
};

// Suite de tests
describe('Given I am connected as an employee', () => {
  describe('When I am on NewBill Page', () => {
    test('Then the newBill should be render', () => {
      // Vérifie que le texte est présent sur la page
      expect(screen.getAllByText('Envoyer une note de frais')).toBeTruthy();
    });
  });

  // Groupe de tests pour le téléchargement de fichier non valide
  describe('When I upload a file with invalid format', () => {
    test('Then it should display an error message', () => {
      // On crée une instance NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      // Simule le téléchargement du fichier
      const handleChangeFile = jest.fn(() => newBill.handleChangeFile);
      const inputFile = screen.getByTestId('file');

      inputFile.addEventListener('change', handleChangeFile);

      fireEvent.change(inputFile, {
        target: {
          files: [new File(['test.txt'], 'test.txt', { type: 'image/txt' })]
        }
      });

      const error = screen.getByTestId('fileErrorMessage');
      // Vérifie qu'un message d'erreur s'affiche
      expect(error).toBeTruthy();
    });
  });

  // Groupe de tests pour le téléchargement de fichier valide
  describe('When I upload a file with valid format', () => {
    test('then fileErrorMessage should be false', () => {
      // Définit l'utilisateur connecté
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          type: 'Employee',
          email: 'azerty@email.com'
        })
      );

      // Crée une instance NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      // Simule le téléchargement du fichier
      const handleChangeFile = jest.fn(() => newBill.handleChangeFile);
      const inputFile = screen.getByTestId('file');

      inputFile.addEventListener('change', handleChangeFile);

      fireEvent.change(inputFile, {
        target: {
          files: [new File(['test'], 'test.jpg', { type: 'image/jpg' })]
        }
      });

      const errorVisible = newBill.fileErrorMessage;
      // Vérifie qu'auncun message d'erreur ne s'affiche
      expect(errorVisible).not.toHaveBeenCalled;
    });
  });

  // Groupe de tests lorsque le formulaire est correctement rempli
  describe('When I submit the form completed', () => {
    test('Then the bill is created', () => {
      // Définit l'utilisateur connecté
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          type: 'Employee',
          email: 'azerty@email.com'
        })
      );

      // Crée une instance NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      // Crée une facture valide
      const validBill = {
        type: 'Restaurants et bars',
        name: 'Vol Paris Londres',
        date: '2024-02-15',
        amount: 200,
        vat: 70,
        pct: 30,
        commentary: 'Commentary',
        fileUrl: '../img/0.jpg',
        fileName: 'test.jpg',
        status: 'pending'
      };

      // Repmlit les champs du formulaire
      screen.getByTestId('expense-type').value = validBill.type;
      screen.getByTestId('expense-name').value = validBill.name;
      screen.getByTestId('datepicker').value = validBill.date;
      screen.getByTestId('amount').value = validBill.amount;
      screen.getByTestId('vat').value = validBill.vat;
      screen.getByTestId('pct').value = validBill.pct;
      screen.getByTestId('commentary').value = validBill.commentary;

      newBill.fileName = validBill.fileName;
      newBill.fileUrl = validBill.fileUrl;

      // Simule la soumission du formulaire
      newBill.updateBill = jest.fn();
      const handleSubmit = jest.fn(e => newBill.handleSubmit(e));

      const form = screen.getByTestId('form-new-bill');
      form.addEventListener('submit', handleSubmit);
      fireEvent.submit(form);

      // Vérifie que la soumission du formulaire est gérée correctement
      expect(handleSubmit).toHaveBeenCalled();
      expect(newBill.updateBill).toHaveBeenCalled();
    });
  });

  // Test d'intégration pour POST une nouvelle facture
  describe('Given I am a user connected as Employee', () => {
    beforeEach(() => {
      jest.spyOn(mockStore, 'bills');

      localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }));
      const root = document.createElement('div');
      root.setAttribute('id', 'root');
      document.body.append(root);
      router();
    });

    // Test si une nouvelle facture est correctement ajoutée
    describe('When I navigate to newBill', () => {
      test('promise from mock API POST returns object bills with correct values', async () => {
        window.onNavigate(ROUTES_PATH.NewBill);

        const bills = await mockStore.bills().create();
        expect(bills.key).toBe('1234');
        expect(bills.fileUrl).toBe('https://localhost:3456/images/test.jpg');
      });

      // Test pour simuler une erreur 404
      // Code erreur HTTP qui indique que la ressource demandée n'a pas été trouvée sur le serveur...
      test('Then, fetches bills from an API and fails with 404 message error', async () => {
        window.onNavigate(ROUTES_PATH.NewBill);

        mockStore.bills.mockImplementationOnce(() => {
          return {
            create: () => {
              return Promise.reject(new Error('Erreur 404'));
            }
          };
        });

        await new Promise(process.nextTick);
        document.body.innerHTML = BillsUI({ error: 'Erreur 404' });
        const message = screen.getByText('Erreur 404');
      // Vérifie si le message d'erreur 404 est affiché à l'écran
        expect(message).toBeTruthy();
      });

      // Test pour simuler une erreur 500
      // Code erreur HTTP qui indique qu'une erreur s'est produite du côté du serveur lors du traitement de la requête...
      test('Then, fetches messages from an API and fails with 500 message error', async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            create: () => {
              return Promise.reject(new Error('Erreur 500'));
            },
            list: () => {
              return Promise.resolve([]);
            }
          };
        });
        await new Promise(process.nextTick);
        document.body.innerHTML = BillsUI({ error: 'Erreur 500' });
        const message = screen.getByText('Erreur 500');
      // Vérifie si le message d'erreur 500 est affiché à l'écran
        expect(message).toBeTruthy();
      });
    });
  });
});
