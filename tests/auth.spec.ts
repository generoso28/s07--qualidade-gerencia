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
  test('TC-002: Login com usuário com delay', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    // Pré-condição: Usuário na tela de login
    await loginPage.goto();

    // Ação: Preencher usuário e senha e clicar em Login
    await loginPage.login(
      testData.users.performanceGlitch.username,
      testData.users.performanceGlitch.password
    );

    // Resultado esperado: O sistema aguarda o carregamento assíncrono sem estourar timeout. Redireciona para "/inventory.html" e título "Products" é visível
    await expect(page).toHaveURL(/.*inventory\.html/);
    await expect(inventoryPage.title).toBeVisible();
    await expect(inventoryPage.title).toHaveText(testData.headers.productsTitle);
  });
  test('TC-003: Logout', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    // Pré-condição: Usuário autenticado na rota “/inventory.html”
    await loginPage.goto();
    await loginPage.login(
      testData.users.standard.username,
      testData.users.standard.password
    );

    // Ação: Clicar no menu lateral. Clicar em Logout"
    await inventoryPage.openMenu();
    await inventoryPage.logout();

    // Resultado esperado: Sessão finalizada; redireciona para a tela de login (`/`)
    await expect(page).toHaveURL(/.*/);
    await expect(loginPage.loginButton).toBeVisible();
  });
});
