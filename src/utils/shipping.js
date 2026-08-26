/**
 * Calculate shipping cost based on total weight (in KG)
 * Tier Rules:
 * - Up to 1 KG: PKR 350
 * - 1 KG to 3 KG: PKR 650
 * - 3 KG to 5 KG: PKR 1250
 * - Above 5 KG: PKR 1500
 */
export const calculateShippingCost = (weightInKg) => {
  const weight = Math.max(0, Number(weightInKg) || 0);

  if (weight === 0) return 0;
  if (weight <= 1) return 350;
  if (weight <= 3) return 650;
  if (weight <= 5) return 1250;
  return 1500;
};

/**
 * Calculate total cart weight in KG from product documents & quantities
 */
export const calculateCartWeight = (productDocs) => {
  if (!Array.isArray(productDocs) || productDocs.length === 0) return 0;

  return productDocs.reduce((totalWeight, { product, quantity }) => {
    const itemWeight = Number(product?.weight) || 1; // Default 1kg fallback
    return totalWeight + itemWeight * (quantity || 1);
  }, 0);
};

/**
 * Calculate shipping cost directly from product documents & quantities
 */
export const calculateOrderShipping = (productDocs) => {
  const totalWeight = calculateCartWeight(productDocs);
  const shippingCost = calculateShippingCost(totalWeight);

  return {
    totalWeight,
    shippingCost,
  };
};
