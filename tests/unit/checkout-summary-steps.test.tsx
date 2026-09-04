import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import CheckoutStepsBar from '../../src/components/checkout/CheckoutStepsBar';
import CheckoutOrderSummary from '../../src/components/checkout/CheckoutOrderSummary';
import { CartItem } from '../../src/types';

describe('Checkout Component Suite & Regression Checks', () => {
  it('renders CheckoutStepsBar without broken /payment link', () => {
    const html = renderToString(
      <MemoryRouter>
        <CheckoutStepsBar currentStep={2} />
      </MemoryRouter>
    );
    expect(html).not.toContain('href="/payment"');
    expect(html).toContain('href="/cart"');
    expect(html).toContain('پرداخت');
  });

  it('renders CheckoutOrderSummary with applied coupon breakdown', () => {
    const dummyCart: CartItem[] = [
      {
        id: 1,
        title: 'کابل فست شارژ تایپ سی',
        price: 150000,
        category: 'کابل',
        brand: 'مک‌دودو',
        image: '/products/cbl-1.svg',
        quantity: 2,
      },
    ];

    const html = renderToString(
      <CheckoutOrderSummary
        cart={dummyCart}
        cartTotal={300000}
        shippingFee={0}
        finalPayable={240000}
        appliedDiscount={60000}
        couponCode="OFF20"
        couponLabel="تخفیف ۲۰ درصدی"
        submitting={false}
        isFreeShipping={true}
      />
    );

    expect(html).toContain('سود شما از تخفیف');
    expect(html).toContain('تخفیف ۲۰ درصدی');
    expect(html).toContain('۲۴۰٬۰۰۰ تومان');
  });
});
