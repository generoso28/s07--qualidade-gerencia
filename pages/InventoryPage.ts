import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly logoutButton: Locator;
  readonly openMenuButton: Locator;
  readonly cartBadge: Locator;
  readonly cartLink: Locator;
  readonly sortDropdown: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.logoutButton = page.locator('[data-test="logout-sidebar-link"]');
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });

    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');

    this.sortDropdown = page.locator('[data-test="product-sort-container"]');

    this.itemNames = page.locator('[data-test="inventory-item-name"]');
    this.itemPrices = page.locator('[data-test="inventory-item-price"]');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async openMenu() {
    await this.openMenuButton.click();
  }


  private productContainer(productName: string): Locator {
    return this.page.locator('.inventory_item').filter({ hasText: productName });
  }

  getProductButton(productName: string): Locator {
    return this.productContainer(productName).getByRole('button', {
      name: /Add to cart|Remove/,
    });
  }

  async addProductToCart(productName: string) {
    await this.productContainer(productName)
      .getByRole('button', { name: 'Add to cart' })
      .click();
  }

  async removeProductFromCart(productName: string) {
    await this.productContainer(productName)
      .getByRole('button', { name: 'Remove' })
      .click();
  }

  async sortBy(optionValue: string) {
    await this.sortDropdown.selectOption(optionValue);
  }

  async getAllPricesAsNumbers(): Promise<number[]> {
    const texts = await this.itemPrices.allTextContents();
    return texts.map((text) => parseFloat(text.replace('$', '')));
  }

  async getAllProductNames(): Promise<string[]> {
    return this.itemNames.allTextContents();
  }
}