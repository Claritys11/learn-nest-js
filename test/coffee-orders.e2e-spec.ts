import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/setup-app.js';

describe('CoffeeOrders (e2e)', () => {
  let app: INestApplication<App>;

  const validBody = {
    customerName: '  Budi  ',
    items: [
      { menuCode: 'latte', size: 'M', qty: 2, extraShots: 1 },
      { menuCode: 'americano', size: 'S', qty: 1 },
    ],
    payment: { method: 'cash', paidAmount: 100000 },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('200 - menghitung pesanan (params + query + body)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jakarta/tables/7/orders?member=true&voucher=hemat15')
      .send(validBody)
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      message: 'Order created',
      data: {
        branch: 'jakarta',
        tableNumber: 7,
        customerName: 'Budi',
        member: true,
        voucher: 'HEMAT15',
        subtotal: 84000,
        discounts: { member: 8400, voucher: 12600, total: 21000 },
        serviceCharge: 3150,
        tax: 7277,
        total: 73427,
        payment: { method: 'cash', paidAmount: 100000, change: 26573 },
      },
    });
    expect(res.body.data.items[0]).toMatchObject({
      unitPrice: 33000,
      lineTotal: 66000,
    });
  });

  it('200 - member=false benar-benar dibaca sebagai false', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jogja/tables/1/orders?member=false')
      .send({ ...validBody, payment: { method: 'qris' } })
      .expect(200);

    expect(res.body.data.member).toBe(false);
    expect(res.body.data.discounts.member).toBe(0);
  });

  // Setiap @Param/@Query/@Body divalidasi terpisah; DTO pertama yang gagal
  // langsung menghentikan request. Karena itu tiap sumber dites sendiri-sendiri.
  const fieldsOf = (res: request.Response) =>
    res.body.errors.map((e: { field: string }) => e.field);

  it('400 - body: error berupa list field (termasuk nested)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jakarta/tables/7/orders')
      .send({
        customerName: 'B',
        items: [{ menuCode: 'latte', size: 'XL', qty: 0 }],
        payment: { method: 'cash' },
        hacker: true,
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(fieldsOf(res)).toEqual(
      expect.arrayContaining([
        'hacker',
        'customerName',
        'items.0.size',
        'items.0.qty',
        'payment.paidAmount',
      ]),
    );
  });

  it('400 - params: tableNumber bukan angka', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jakarta/tables/abc/orders')
      .send(validBody)
      .expect(400);
    expect(fieldsOf(res)).toContain('tableNumber');
  });

  it('400 - query: member bukan boolean', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jakarta/tables/7/orders?member=maybe')
      .send(validBody)
      .expect(400);
    expect(fieldsOf(res)).toContain('member');
  });

  it('400 - uang cash kurang dari total (aturan bisnis di service)', async () => {
    const res = await request(app.getHttpServer())
      .post('/coffee/jakarta/tables/7/orders')
      .send({ ...validBody, payment: { method: 'cash', paidAmount: 1000 } })
      .expect(400);

    expect(res.body.errors[0].field).toBe('payment.paidAmount');
  });

  it('404 - cabang / voucher / menu tidak dikenal', async () => {
    const server = app.getHttpServer();

    const branch = await request(server)
      .post('/coffee/atlantis/tables/7/orders')
      .send(validBody)
      .expect(404);
    expect(branch.body).toEqual({
      success: false,
      message: "Branch 'atlantis' is not supported",
      errors: [],
    });

    await request(server)
      .post('/coffee/jakarta/tables/7/orders?voucher=GRATIS')
      .send(validBody)
      .expect(404);

    await request(server)
      .post('/coffee/jakarta/tables/7/orders')
      .send({ ...validBody, items: [{ menuCode: 'teh', size: 'S', qty: 1 }] })
      .expect(404);
  });
});
