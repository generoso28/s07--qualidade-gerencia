import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly logoutButton: Locator;
  readonly openMenuButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.logoutButton = page.locator('[data-test="logout-sidebar-link"]');
    this.openMenuButton = page.getByRole('button', { name: 'Open Menu' });
  }
  async logout() {
    await this.logoutButton.click();
  }
  async openMenu() {
    await this.openMenuButton.click();
  }
}
