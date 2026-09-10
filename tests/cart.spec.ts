import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import testData from '../fixtures/testData.json';


// --------------- Válidos (Caminho Feliz)

test.describe('Domínio de Catálogo e Carrinho', () => {
  test.beforeEach(async ({ page }) => {
    // Condição: usuário na rota "/inventory.html"
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      testData.users.standard.username,
      testData.users.standard.password
    );
    await expect(page).toHaveURL(/.*inventory\.html/);
  });

  test('TC-004: Adicionar um único item ao carrinho a partir da vitrine', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const productName = testData.products.backpack;

    // Ação: clicar no botão "Add to cart" do card do produto na vitrine
    await inventoryPage.addProductToCart(productName);

    // Resultado esperado: o botão muda para "Remove" e o ícone do carrinho exibe o número 1
    await expect(inventoryPage.getProductButton(productName)).toHaveText('Remove');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('TC-005: Adicionar múltiplos itens diferentes ao carrinho', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const products = [
      testData.products.backpack,
      testData.products.bikeLight,
      testData.products.boltTShirt,
    ];

    // Ação: Adicionar cada produto da lista ao carrinho
    for (const productName of products) {
      await inventoryPage.addProductToCart(productName);
    }

    // Resultado esperado: os botões mudam para "Remove" e o ícone do carrinho exibe o número 3
    for (const productName of products) {
      await expect(inventoryPage.getProductButton(productName)).toHaveText('Remove');
    }
    await expect(inventoryPage.cartBadge).toHaveText(String(products.length));
  });

  test('TC-006: Remover um item que já estava no carrinho clicando no botão da própria vitrine', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const productName = testData.products.backpack;

    // Condição: item já adicionado
    await inventoryPage.addProductToCart(productName);
    await expect(inventoryPage.cartBadge).toBeVisible();

    // Ação: Clicar no botão "Remove" do card do produto na vitrine
    await inventoryPage.removeProductFromCart(productName);

    // Resultado esperado: o botão volta a exibir "Add to cart"; o badge de contagem desaparece
    await expect(inventoryPage.getProductButton(productName)).toHaveText('Add to cart');
    await expect(inventoryPage.cartBadge).toHaveCount(0);
  });

  test('TC-007: Ordenar produtos por Preço (Menor para Maior) e validar a lista', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Ação: Clicar no "filtro" e selecionar "Price (low to high)"
    await inventoryPage.sortBy(testData.sortOptions.priceLowToHigh);

    // Resultado esperado: a lista de preços é exibida em ordem crescente numérica
    const prices = await inventoryPage.getAllPricesAsNumbers();
    const sortedAscending = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedAscending);
  });

  test('TC-008: Ordenar produtos por Nome (Z para A) e validar a lista', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    // Ação: Clicar no "filtro" e selecionar "Name (Z to A)"
    await inventoryPage.sortBy(testData.sortOptions.nameZToA);

    // Resultado esperado: os títulos são exibidos em ordem alfabética decrescente
    const names = await inventoryPage.getAllProductNames();
    const sortedDescending = [...names].sort((a, b) => b.localeCompare(a));
    expect(names).toEqual(sortedDescending);
  });
});


// --------------- Inválidos / Inoportunos

test.describe('Bypass de URL', () => {
  test('TC-015: Bypass de URL – tentar acessar a rota /inventory.html diretamente pela barra de endereços sem estar logado', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Ação: Tentar navegar diretamente ao catálogo, sem login
    await page.goto(testData.routes.inventory);

    // Resultado esperado: redireciona para home "/" e exibe mensagem de erro de acesso negado
    await expect(page).toHaveURL(new RegExp(`${testData.routes.login}$`));
    await expect(loginPage.errorMessage).toHaveText(
      testData.errorMessages.unauthorizedInventory
    );
  });

  test('TC-016: Bypass de URL – tentar acessar a rota /cart.html diretamente sem estar logado', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Ação: Tentar navegar diretamente ao carrinho, sem login
    await page.goto(testData.routes.cart);

    // Resultado esperado: redireciona para home "/" e exibe mensagem de erro de acesso negado
    await expect(page).toHaveURL(new RegExp(`${testData.routes.login}$`));
    await expect(loginPage.errorMessage).toHaveText(
      testData.errorMessages.unauthorizedCart
    );
  });
});