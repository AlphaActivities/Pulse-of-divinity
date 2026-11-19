import { test, expect } from '../fixtures/collectorApi';
import { people } from '../fixtures/collectorDatabase';

test('preview summary revision refreshes counts and recent status after save, then closes on archive', async ({page, context, collector}) => {
  await collector.setup(context);
  const id = await collector.createInquiry();
  await page.goto('/admin/');
  await expect(page.locator('.admin-recent-item')).toContainText('New');
  await page.locator('.admin-recent-item').click();
  await page.getByRole('button', {name:'Lead status',exact:true}).click();
  await page.getByRole('option', {name:'Contacted',exact:true}).click();
  await page.getByRole('button', {name:'Save Changes',exact:true}).click();
  await expect.poll(() => collector.requests.summary).toBe(2);
  await expect(page.locator('.admin-recent-item')).toContainText('Contacted');
  expect((await collector.db.query<{status:string}>('SELECT status FROM leads WHERE id=$1',[id])).rows[0].status).toBe('CONTACTED');
  await page.getByRole('button', {name:'Archive',exact:true}).click();
  await page.getByRole('button', {name:'Archive Lead',exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Lead detail'})).toHaveCount(0);
  await expect.poll(() => collector.requests.summary).toBe(3);
  await expect(page.locator('.admin-recent-item')).toHaveCount(0);
  expect((await collector.db.query<{archived:boolean}>('SELECT archived FROM leads WHERE id=$1',[id])).rows[0].archived).toBe(true);
});

test('restore refreshes the dashboard without closing its drawer', async ({page, context, collector}) => {
  await collector.setup(context);
  const id = await collector.createInquiry();
  await page.goto('/admin/');
  await expect(page.locator('.admin-recent-item')).toBeVisible();
  // Simulate an archived record opened from a stale recent-activity link.
  await collector.asRole('staff','SELECT pod_update_lead($1,$2)',[id,{archived:true}]);
  await page.locator('.admin-recent-item').click();
  await page.getByRole('button', {name:'Restore',exact:true}).click();
  await expect.poll(() => collector.requests.summary).toBe(2);
  await expect(page.getByRole('dialog', {name:'Lead detail'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Archive',exact:true})).toBeVisible();
  expect((await collector.db.query<{archived:boolean}>('SELECT archived FROM leads WHERE id=$1',[id])).rows[0].archived).toBe(false);
});

test('a staff note is saved once with a valid parent and author and survives reopening', async ({page, context, collector}) => {
  await collector.setup(context,'staff');
  const id = await collector.createInquiry('commission');
  await page.goto('/admin/leads?lead='+id);
  await page.getByLabel('New note').fill('Disposable fixture note; no customer record.');
  await page.getByRole('button', {name:'Add Note',exact:true}).click();
  await expect(page.getByText('Disposable fixture note; no customer record.',{exact:true})).toBeVisible();
  const rows=(await collector.db.query<{lead_id:string;author_admin_id:string}>('SELECT lead_id,author_admin_id FROM lead_notes')).rows;
  expect(rows).toEqual([{lead_id:id,author_admin_id:people.staff.admin}]);
  await page.reload();
  await expect(page.getByText('Disposable fixture note; no customer record.',{exact:true})).toBeVisible();
});
