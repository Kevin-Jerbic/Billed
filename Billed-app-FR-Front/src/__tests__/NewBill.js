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

jest.mock('../app/Store', () => mockStore);

beforeEach(() => {
  document.body.innerHTML = NewBillUI();
});

const onNavigate = pathname => {
  document.body.innerHTML = ROUTES({ pathname });
};

describe('Given I am connected as an employee', () => {
  describe('When I am on NewBill Page', () => {
    // test affichage page nouvelle note de frais
    test('Then the newBill should be render', () => {
      //to-do write assertion
      expect(screen.getAllByText('Envoyer une note de frais')).toBeTruthy();
    });
  });

  // test affichage message d'erreur lorsque l'utilisateur choisi un fichier avec la mauvaise extension
  describe('When I upload a file with invalid format', () => {
    test('Then it should display an error message', () => {
      // Instance NewBill
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      // Simulation chargement fichier
      const handleChangeFile = jest.fn(() => newBill.handleChangeFile);
      const inputFile = screen.getByTestId('file');

      inputFile.addEventListener('change', handleChangeFile);

      fireEvent.change(inputFile, {
        target: {
          files: [new File(['test.txt'], 'test.txt', { type: 'image/txt' })]
        }
      });

      // Message erreur
      const error = screen.getByTestId('fileErrorMessage');
      expect(error).toBeTruthy();
    });
  });

  // test lorque l'utilisateur choisit un fichier au format valide
  describe('When I upload a file with valid format', () => {
    test('then it fileErrorMessage is false', () => {
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          type: 'Employee',
          email: 'azerty@email.com'
        })
      );

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

      const handleChangeFile = jest.fn(() => newBill.handleChangeFile);
      const inputFile = screen.getByTestId('file');

      inputFile.addEventListener('change', handleChangeFile);

      fireEvent.change(inputFile, {
        target: {
          files: [new File(['test'], 'test.jpg', { type: 'image/jpg' })]
        }
      });

      const errorVisible = newBill.fileErrorMessage;
      expect(errorVisible).not.toHaveBeenCalled;
    });
  });

  // test lorsque le formulaire est correctement rempli
  describe('When I submit the form completed', () => {
    test('Then the bill is created', () => {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      });

      window.localStorage.setItem(
        'user',
        JSON.stringify({
          type: 'Employee',
          email: 'azerty@email.com'
        })
      );

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage
      });

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

      screen.getByTestId('expense-type').value = validBill.type;
      screen.getByTestId('expense-name').value = validBill.name;
      screen.getByTestId('datepicker').value = validBill.date;
      screen.getByTestId('amount').value = validBill.amount;
      screen.getByTestId('vat').value = validBill.vat;
      screen.getByTestId('pct').value = validBill.pct;
      screen.getByTestId('commentary').value = validBill.commentary;

      newBill.fileName = validBill.fileName;
      newBill.fileUrl = validBill.fileUrl;

      newBill.updateBill = jest.fn();
      const handleSubmit = jest.fn(e => newBill.handleSubmit(e));

      const form = screen.getByTestId('form-new-bill');
      form.addEventListener('submit', handleSubmit);
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
      expect(newBill.updateBill).toHaveBeenCalled();
    });
  });

  // test d'intégration POST new bill
  describe('Given I am a user connected as Employee', () => {
    beforeEach(() => {
      jest.spyOn(mockStore, 'bills');

      localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }));
      const root = document.createElement('div');
      root.setAttribute('id', 'root');
      document.body.append(root);
      router();
    });

    describe('When I navigate to newBill', () => {
      // Nouvelle facture
      test('promise from mock API POST returns object bills with correct values', async () => {
        window.onNavigate(ROUTES_PATH.NewBill);

        const bills = await mockStore.bills().create();
        expect(bills.key).toBe('1234');
        expect(bills.fileUrl).toBe('https://localhost:3456/images/test.jpg');
      });

      // Erreur 404
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
        expect(message).toBeTruthy();
      });

      // Erreur 500
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
        expect(message).toBeTruthy();
      });
    });
  });
});
