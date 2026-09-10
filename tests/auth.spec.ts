import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import testData from '../fixtures/testData.json';

test.describe('Autenticação e Sessão', () => {
  test('TC-001: Login com credenciais válidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    // Pré-condição: Usuário na tela de login
    await loginPage.goto();

    // Ação: Preencher usuário e senha e clicar em Login
    await loginPage.login(
      testData.users.standard.username,
      testData.users.standard.password
    );

    // Resultado esperado: Redireciona para "/inventory.html" e título "Products" é visível
    await expect(page).toHaveURL(/.*inventory\.html/);
    await expect(inventoryPage.title).toBeVisible();
    await expect(inventoryPage.title).toHaveText(testData.headers.productsTitle);
  });
});
