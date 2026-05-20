import { createContext, useContext, useMemo, useState, useCallback } from 'react';

const BulkCartContext = createContext(null);

export function BulkCartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const key = `${item.mealId}-${item.categoryId ?? ''}`;
      const idx = prev.findIndex((i) => `${i.mealId}-${i.categoryId ?? ''}` === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + (item.quantity || 1) };
        return next;
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  }, []);

  const updateQty = useCallback((mealId, categoryId, quantity) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.mealId === mealId && (i.categoryId ?? '') === (categoryId ?? '')
            ? { ...i, quantity: Math.max(0, quantity) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((mealId, categoryId) => {
    setItems((prev) => prev.filter((i) => !(i.mealId === mealId && (i.categoryId ?? '') === (categoryId ?? ''))));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalQuantity = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, clearCart, totalQuantity }),
    [items, addItem, updateQty, removeItem, clearCart, totalQuantity]
  );

  return <BulkCartContext.Provider value={value}>{children}</BulkCartContext.Provider>;
}

export function useBulkCart() {
  const ctx = useContext(BulkCartContext);
  if (!ctx) throw new Error('useBulkCart must be used within BulkCartProvider');
  return ctx;
}
