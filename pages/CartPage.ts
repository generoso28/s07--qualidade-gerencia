import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItem: Locator;
  readonly cartBadge: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Seletores da página de carrinho
    this.cartItem = page.locator('.cart_item');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  /**
   * Clica no botão de checkout para iniciar o processo de compra
   */
  async clickCheckout() {
    await this.checkoutButton.click();
  }

  /**
   * Localiza o bloco do produto pelo nome e clica no botão "Remove" correspondente
   * @param productName Nome exato do produto conforme exibido na tela
   */
  async removeProduct(productName: string) {
    // Filtra o item do carrinho que contém o texto do produto
    const itemBlock = this.cartItem.filter({ hasText: productName });
    // Localiza e clica no botão de remover apenas dentro desse bloco específico
    const removeButton = itemBlock.locator('button:has-text("Remove")');
    
    await removeButton.click();
  }
}