import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import testData from '../fixtures/testData.json';

test.describe('Fluxo de Checkout', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginPage.goto();
    await loginPage.login(
      testData.users.standard.username,
      testData.users.standard.password
    );
    await inventoryPage.addProductToCart(testData.products.backpack);
    await inventoryPage.cartBadge.click();
  });

  test('TC-009: Fluxo completo de checkout com sucesso', async ({ page }) => {
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await expect(page).toHaveURL(/.*cart\.html/);
    await cartPage.clickCheckout();

    await checkoutPage.fillInformation("Lucas", "Silva", "37540-000");
    await checkoutPage.clickContinue();

    await expect(page).toHaveURL(/.*checkout-step-two\.html/);
    await checkoutPage.clickFinish();

    await expect(page).toHaveURL(/.*checkout-complete\.html/);
    await expect(checkoutPage.completeHeader).toBeVisible();
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
  });
});

test.describe('Validações de Formulário - Checkout Step 1', () => {

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const cartPage = new CartPage(page);

    await loginPage.goto();
    await loginPage.login(
      testData.users.standard.username,
      testData.users.standard.password
    );
    await inventoryPage.addProductToCart(testData.products.backpack);
    await inventoryPage.cartBadge.click();
    await cartPage.clickCheckout();
    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
  });

  test('TC-017: Checkout Step 1 sem informar First Name', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.fillInformation("", "Silva", "37540-000");
    await checkoutPage.clickContinue();

    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
    await expect(checkoutPage.errorMessage).toHaveText('Error: First Name is required');
  });

  test('TC-018: Checkout Step 1 sem informar Last Name', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.fillInformation("Lucas", "", "37540-000");
    await checkoutPage.clickContinue();

    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
    await expect(checkoutPage.errorMessage).toHaveText('Error: Last Name is required');
  });

  test('TC-019: Checkout Step 1 sem informar Postal Code', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.fillInformation("Lucas", "Silva", "");
    await checkoutPage.clickContinue();

    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
    await expect(checkoutPage.errorMessage).toHaveText('Error: Postal Code is required');
  });

  test('TC-020: Validação de campos obrigatórios com espaços em branco', async ({ page }) => {
    // DEFEITO CONHECIDO DO SUT: o SauceDemo não aplica trim nos campos do checkout.
    // Valores compostos apenas por espaços são aceitos e o fluxo avança indevidamente
    // para o Step 2. O caso é mantido como evidência do defeito e marcado como
    // "expected failure" para não derrubar a pipeline por um bug de terceiro.
    // Se o SauceDemo corrigir o comportamento, este caso passa a falhar como
    // "unexpected pass", sinalizando a mudança.
    test.fail(true, 'SauceDemo aceita campos compostos apenas por espaços');

    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.fillInformation("   ", "   ", "   ");
    await checkoutPage.clickContinue();

    // Resultado esperado: permanecer no Step 1 com mensagem de campo obrigatório.
    await expect(page).toHaveURL(/.*checkout-step-one\.html/);
    await expect(checkoutPage.errorMessage).toBeVisible();
  });
});