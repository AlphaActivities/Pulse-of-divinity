import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/collectorApi';

const labels = {
  reserved: 'Reserved — ask Darcy about this work',
  sold: 'Sold — ask Darcy about a commission',
  available: 'Available',
};
const artworkCard = (page: Page) => page.locator('#works article').filter({
  has: page.getByRole('heading', { name: 'Cosmic Energy', exact: true }),
});

test('committed admin availability reaches the gallery and concierge in another open tab', async ({page, context, collector}) => {
  await collector.setup(context);
  await page.goto('/admin/artwork');
  const gallery = await context.newPage();
  await gallery.goto('/');
  await expect(artworkCard(gallery).getByText('Available', {exact:true})).toBeVisible();
  await gallery.getByRole('button', {name:'Collector Concierge',exact:true}).click();
  for (const state of ['reserved','sold','available'] as const) {
    await page.getByLabel('Cosmic Energy availability').selectOption(state);
    await expect(page.getByRole('status').filter({hasText:`Availability saved: ${state}.`})).toBeVisible();
    await expect(artworkCard(gallery).getByText(labels[state], {exact:true})).toBeVisible();
    await expect(gallery.locator('.pod-concierge li').filter({hasText:'Cosmic Energy'})).toContainText(state);
    const stored = (await collector.db.query<{inventory_status:string}>(
      'SELECT inventory_status FROM artwork_inventory WHERE artwork_id=$1', ['for-sale-cosmic-energy'],
    )).rows[0];
    expect(stored.inventory_status).toBe(state);
    await gallery.reload();
    await expect(artworkCard(gallery).getByText(labels[state], {exact:true})).toBeVisible();
    // Reopen the concierge on the reloaded document for the next transition.
    await gallery.getByRole('button', {name:'Collector Concierge',exact:true}).click();
  }
  collector.failPublicReads = true;
  await gallery.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(artworkCard(gallery).getByText('Availability unverified — inquire with Darcy')).toBeVisible();
  await expect(artworkCard(gallery).getByText('Available', {exact:true})).toHaveCount(0);
});

test('an ambiguous availability response never confirms a save or leaves the gallery stale', async ({page, context, collector}) => {
  await collector.setup(context);
  await page.goto('/admin/artwork');
  const gallery = await context.newPage();
  await gallery.goto('/');
  await expect(artworkCard(gallery).getByText('Available', {exact:true})).toBeVisible();
  collector.malformedWriteReply = true;
  await page.getByLabel('Cosmic Energy availability').selectOption('sold');
  await expect(page.getByRole('alert')).toContainText('could not be verified');
  await expect(page.getByText('Availability unverified', {exact:true}).first()).toBeVisible();
  await expect(page.getByText('Availability saved: sold.')).toHaveCount(0);
  // The database did commit, so other tabs must re-read rather than assume failure.
  await expect(artworkCard(gallery).getByText(labels.sold, {exact:true})).toBeVisible();
  collector.malformedWriteReply = false;
  await page.getByRole('button', {name:'Refresh availability'}).click();
  await expect(page.getByLabel('Cosmic Energy availability')).toHaveValue('sold');
});

for (const kind of ['available_work','commission'] as const) {
  test(`${kind}: confirmation requires the committed row after failure and a lost response`, async ({page, context, collector}) => {
    await collector.setup(context);
    await page.goto('/');
    await page.evaluate(() => {
      const target = window as Window & {fixtureEvents: unknown[][]};
      target.fixtureEvents=[];
      target.gtag=(...args:unknown[]) => {target.fixtureEvents.push(args);};
    });
    if (kind === 'commission') {
      await page.getByRole('button', {name:'Begin a Commission Conversation'}).click();
    } else {
      await artworkCard(page).getByRole('button', {name:'Inquire About This Piece'}).click();
    }
    await page.getByLabel('Your Name', {exact:true}).fill('Disposable Browser Collector');
    await page.getByLabel('Email Address', {exact:true}).fill('browser-fixture@example.test');
    await page.locator('#contact').getByRole('button', {name:'Email',exact:true}).click();
    await page.getByLabel('Your Message', {exact:true}).fill('A personal artwork inquiry from a disposable test.');
    const submit = page.getByRole('button', {name:'Send Inquiry',exact:true});
    const count = async () => (await collector.db.query<{count:number}>('SELECT count(*)::int count FROM leads')).rows[0].count;
    const conversions = async () => page.evaluate(() => {
      return (window as Window & {fixtureEvents:unknown[][]}).fixtureEvents
        .filter(args => args[0]==='event' && (args[1]==='artwork_inquiry_submit' || args[1]==='commission_inquiry_submit')).length;
    });
    collector.failNextIntake = true;
    const release = collector.holdNextIntake();
    await submit.evaluate((button: HTMLButtonElement) => {button.click();button.click();});
    await expect.poll(() => collector.requests.intake).toBe(1);
    await expect(page.getByLabel('Your Name', {exact:true})).toBeDisabled();
    release();
    await expect(page.getByRole('alert').filter({hasText:'not been confirmed'})).toBeVisible();
    expect(await count()).toBe(0);
    expect(await conversions()).toBe(0);
    await expect(page.getByLabel('Your Name', {exact:true})).toHaveValue('Disposable Browser Collector');

    collector.loseNextIntakeReply = true;
    await submit.click();
    await expect.poll(count).toBe(1);
    await expect(page.getByRole('alert').filter({hasText:'not been confirmed'})).toBeVisible();
    expect(await conversions()).toBe(0);
    await expect(page.getByText('Your message has arrived.')).toHaveCount(0);
    await submit.click();
    await expect(page.getByText('Your message has arrived.')).toBeVisible();
    expect(await count()).toBe(1);
    expect(await conversions()).toBe(1);
    expect(new Set(collector.intakeKeys).size).toBe(1);
    const lead = (await collector.db.query<{id:string;inquiry_type:string;artwork_id:string|null;artwork_title:string|null}>(
      'SELECT id,inquiry_type,artwork_id,artwork_title FROM leads',
    )).rows[0];
    expect(lead.inquiry_type).toBe(kind);
    const commissions = (await collector.db.query<{count:number}>('SELECT count(*)::int count FROM commissions WHERE lead_id=$1',[lead.id])).rows[0].count;
    expect(commissions).toBe(kind==='commission'?1:0);
    if (kind==='available_work') {
      expect(lead.artwork_id).toBe('for-sale-cosmic-energy');
      expect(lead.artwork_title).toBe('Cosmic Energy');
    }
    await page.goto('/admin/leads?lead='+lead.id);
    await expect(page.getByRole('dialog', {name:'Lead detail'})).toContainText('Disposable Browser Collector');
  });
}
