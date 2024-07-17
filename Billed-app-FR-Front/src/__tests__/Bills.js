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

jest.mock('../app/Store', () => mockStore);

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);
  router();

  window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
});

describe('Given I am connected as an employee', () => {
  describe('When I am on Bills Page', () => {
    // test affichage aside bar
    test('Then bill icon in vertical layout should be highlighted', async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      //to-do write expect expression
      expect(windowIcon).toHaveClass('active-icon');
    });

    // test affichage facture par date décroissante
    test('Then bills should be ordered from earliest to latest', () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono).reverse();
      expect(dates).toEqual(datesSorted);
    });
  });

  // test affichage modale
  describe('When I click on a eye icon', () => {
    test('Then a modal should be display', () => {
      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = pathname => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      const bill = new Bills({
        document,
        onNavigate,
        localStorage: localStorageMock,
        store: null
      });

      $.fn.modal = jest.fn();

      const handleClickIconEye = jest.fn(() => {
        bill.handleClickIconEye;
      });
      const eyeIcons = screen.getAllByTestId('icon-eye');

      for (let eyeIcon of eyeIcons) {
        handleClickIconEye(eyeIcon);
        userEvent.click(eyeIcon);
      }

      expect(handleClickIconEye).toHaveBeenCalledTimes(eyeIcons.length);
      expect($.fn.modal).toHaveBeenCalled();
    });
  });

  // test quand l'utilisateur clique 'nouvelle note de frais'
  describe('When I click on New Bill button', () => {
    test('Then it should navigate to New Bill page', async () => {
      window.onNavigate(ROUTES_PATH.Bills);

      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage
      });

      await waitFor(() => screen.getByTestId('btn-new-bill'));
      const newBillBtn = screen.getByTestId('btn-new-bill');

      const handleClickNewBill = jest.fn(() => billsContainer.handleClickNewBill());

      newBillBtn.addEventListener('click', handleClickNewBill);

      userEvent.click(newBillBtn);

      expect(handleClickNewBill).toHaveBeenCalled();
      expect(screen.getByTestId('form-new-bill')).toBeTruthy();
    });
  });

  // Lorsque la page de Bills charge
  describe('When I went on Bills page and it is loading', () => {
    test('Then, Loading page should be rendered', () => {
      document.body.innerHTML = BillsUI({ loading: true });

      expect(screen.getByText('Loading...')).toBeVisible();

      document.body.innerHTML = '';
    });
  });
});

// test d'intégration GET
describe('Given I am a user connected as Employee', () => {
  describe('When I navigate to Bills', () => {
    beforeEach(() => {
      jest.spyOn(mockStore, 'bills');
    });

    test('fetches bills from mock API GET', async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      const bills = await mockStore.bills().list();
      expect(await waitFor(() => screen.getByTestId('tbody'))).toBeTruthy();
      expect(bills.length).toBe(4);
    });

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
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

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
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
