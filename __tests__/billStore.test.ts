import { useBillStore } from '../store/bill.store';
import { Customer, Product } from '../types';

const makeProduct = (id: string, pricePaise = 2500): Product => ({
  id,
  businessId: 'biz-1',
  name: `Product ${id}`,
  sellingPricePaise: pricePaise,
  unit: 'item',
  taxRate: 5,
  isTaxInclusive: true,
  stockQuantity: 50,
  lowStockThreshold: 5,
  isFavourite: false,
  isActive: true,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
});

describe('useBillStore', () => {
  beforeEach(() => {
    useBillStore.getState().clearBill();
  });

  test('adding same product twice produces one line with quantity 2 without mutating old CartItem object', () => {
    const product = makeProduct('p1', 1500);
    useBillStore.getState().addToCart(product, 1);

    const firstSnapshot = useBillStore.getState().cart[0];
    expect(firstSnapshot.quantity).toBe(1);

    useBillStore.getState().addToCart(product, 1);
    const state = useBillStore.getState();

    expect(state.cart).toHaveLength(1);
    expect(state.cart[0].quantity).toBe(2);
    expect(state.cart[0]).not.toBe(firstSnapshot);
    expect(firstSnapshot.quantity).toBe(1); // old object remains unmutated
  });

  test('updateQuantity to 0 or negative removes the line, and removeFromCart removes item', () => {
    const p1 = makeProduct('p1');
    const p2 = makeProduct('p2');
    useBillStore.getState().addToCart(p1, 2);
    useBillStore.getState().addToCart(p2, 1);

    const [item1, item2] = useBillStore.getState().cart;
    useBillStore.getState().updateQuantity(item1.id, 3);
    expect(useBillStore.getState().cart[0].quantity).toBe(3);

    useBillStore.getState().updateQuantity(item1.id, 0);
    expect(useBillStore.getState().cart.map((c) => c.id)).toEqual([item2.id]);

    useBillStore.getState().removeFromCart(item2.id);
    expect(useBillStore.getState().cart).toEqual([]);
  });

  test('addCustomItem assigns unique ids even when added in the same millisecond tick', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    try {
      for (let i = 0; i < 10; i++) {
        useBillStore.getState().addCustomItem(`Custom ${i}`, 1000 + i, 5, 'item');
      }
      const ids = useBillStore.getState().cart.map((c) => c.id);
      expect(ids).toHaveLength(10);
      expect(new Set(ids).size).toBe(10);
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('clearBill resets cart, customer, discounts, inter-state flag, and notes', () => {
    const cust: Customer = {
      id: 'c1',
      businessId: 'biz-1',
      name: 'Ramesh',
      outstandingBalancePaise: 0,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };

    const store = useBillStore.getState();
    store.addToCart(makeProduct('p1'), 2);
    store.setCustomer(cust);
    store.setDiscount('percentage', 10);
    store.setIsInterState(true);
    store.setNotes('Urgent order');

    useBillStore.getState().clearBill();

    const cleared = useBillStore.getState();
    expect(cleared.cart).toEqual([]);
    expect(cleared.customer).toBeNull();
    expect(cleared.discountType).toBe('none');
    expect(cleared.discountValue).toBe(0);
    expect(cleared.isInterState).toBe(false);
    expect(cleared.notes).toBe('');
  });

  test('getCalculation memoizes result by reference equality and invalidates on any calculation input change', () => {
    const p1 = makeProduct('p1', 10000);
    useBillStore.getState().addToCart(p1, 1);

    const calcInitial = useBillStore.getState().getCalculation();
    expect(useBillStore.getState().getCalculation()).toBe(calcInitial);

    // Changing discountType/value returns a fresh calculation reference
    useBillStore.getState().setDiscount('fixed', 10);
    const calcAfterDisc = useBillStore.getState().getCalculation();
    expect(calcAfterDisc).not.toBe(calcInitial);
    expect(useBillStore.getState().getCalculation()).toBe(calcAfterDisc);

    // Changing isInterState returns a fresh calculation reference
    useBillStore.getState().setIsInterState(true);
    const calcAfterIgst = useBillStore.getState().getCalculation();
    expect(calcAfterIgst).not.toBe(calcAfterDisc);
    expect(useBillStore.getState().getCalculation()).toBe(calcAfterIgst);

    // Changing cart quantity returns a fresh calculation reference
    useBillStore.getState().addToCart(p1, 1);
    const calcAfterQty = useBillStore.getState().getCalculation();
    expect(calcAfterQty).not.toBe(calcAfterIgst);
  });
});
