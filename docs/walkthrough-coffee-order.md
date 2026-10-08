# Walkthrough: Contoh Task "Pesan Kopi di Kafe"

Dokumen ini adalah **contoh lengkap** yang menyentuh semua materi di README:
params, query, body (array + nested object), transformasi, validasi, error 400,
error 404, dan format response standar. Kodenya sudah ada dan bisa langsung
dijalankan. Baca sambil membuka file-filenya.

> Saran cara belajar: baca bagian 1–3 dulu (konsep), lalu ikuti bagian 4
> sambil membuka kodenya, lalu kerjakan **Case 1** dengan panduan di bagian 6.

---

## 1. Gambaran besar: perjalanan sebuah request di NestJS

```
Client (Postman / curl)
   │  POST /coffee/jakarta/tables/7/orders?member=true    + body JSON
   ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTER: cari controller + method yang cocok dengan URL       │
├──────────────────────────────────────────────────────────────┤
│ VALIDATION PIPE (global, dipasang di setup-app.ts)           │
│   untuk @Param(), @Query(), @Body() masing-masing:           │
│   1. class-transformer : JSON/string  ->  instance DTO       │
│   2. class-validator   : cek aturan @IsInt, @Min, dll.       │
│   gagal? -> lempar BadRequestException (400) ────────────┐   │
├──────────────────────────────────────────────────────────┼───┤
│ CONTROLLER: terima DTO yang sudah bersih, panggil service │   │
├──────────────────────────────────────────────────────────┼───┤
│ SERVICE: logika bisnis (hitung harga, diskon, pajak)      │   │
│   nilai tidak dikenal? -> NotFoundException (404) ────────┤   │
├──────────────────────────────────────────────────────────┼───┤
│ CONTROLLER: bungkus hasil dengan ok(message, data)        │   │
└──────────────────────────────────────────────────────────┼───┘
   │ 200 { success: true, ... }                           │
   ▼                                                      ▼
Client  ◄──────────  EXCEPTION FILTER: ubah error jadi
                     { success: false, message, errors }
```

Kunci pentingnya: **controller dan service tidak pernah menerima data
kotor**. Kalau kode sampai masuk ke controller, berarti data sudah lolos
validasi dan tipenya sudah benar (`tableNumber` sudah `number`, bukan `"7"`).

---

## 2. Anatomi file: apa, kenapa, dan isinya

Saat menjalankan `npx nest generate resource convertmeters`, Nest membuatkan
beberapa file. Ini peran masing-masing:

| File | Apa | Kenapa dipisah |
| --- | --- | --- |
| `*.module.ts` | "Kotak" yang mendaftarkan controller & service satu fitur | Nest hanya tahu fitur yang **didaftarkan**. Module wajib di-`import` di `app.module.ts` |
| `*.controller.ts` | Menentukan **URL** dan **dari mana data diambil** (`@Param`, `@Query`, `@Body`) | Controller = "resepsionis": menerima tamu, tidak memasak |
| `*.service.ts` | **Logika bisnis**: hitung, cek aturan | Bisa di-test tanpa HTTP, dan bisa dipakai ulang |
| `dto/*.dto.ts` | **Bentuk + aturan** data masuk | Validasi jadi deklaratif (cukup decorator), bukan `if` di mana-mana |
| `*.spec.ts` | Unit test | Opsional untuk modul ini |

Bagaimana controller mendapatkan service? Lewat **Dependency Injection**:

```ts
constructor(private readonly coffeeOrdersService: CoffeeOrdersService) {}
```

Kamu tidak pernah menulis `new CoffeeOrdersService()`. Nest melihat
`providers: [CoffeeOrdersService]` di module, membuat instance-nya, lalu
"menyuntikkannya" ke constructor.

---

## 3. Infrastruktur bersama (langkah 1 di "Suggested implementation order")

Langkah ini dikerjakan **sekali**, lalu dipakai semua case.

### 3.1 `src/setup-app.ts`: ValidationPipe + Exception Filter

```ts
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: validationExceptionFactory,   // <- baru
  }));
  app.useGlobalFilters(new HttpExceptionFilter());  // <- baru
}
```

- **Kenapa dipisah dari `main.ts`?** E2E test membuat app-nya sendiri
  (`createNestApplication()`) tanpa lewat `main.ts`. Kalau konfigurasinya hanya
  ada di `main.ts`, test akan berjalan **tanpa validasi** dan hasilnya
  menyesatkan. Dengan satu fungsi, `main.ts` dan test berperilaku sama.

### 3.2 `src/common/validation-exception.factory.ts`: bentuk error 400

Secara default, Nest mengembalikan error validasi seperti ini:

```json
{ "message": ["tableNumber must be an integer number"], "error": "Bad Request", "statusCode": 400 }
```

README meminta `errors: [{ field, message }]`. `exceptionFactory` adalah
"hook" dari ValidationPipe: Nest memberinya daftar `ValidationError`, dan kita
yang menentukan exception apa yang dilempar.

Error dari nested DTO berbentuk **pohon** (`children`), jadi kita ratakan
secara rekursif. Hasilnya nama field berupa path seperti `items.0.qty` atau
`payment.paidAmount`.

### 3.3 `src/common/http-exception.filter.ts`: bentuk semua error

`@Catch(HttpException)` menangkap **semua** error HTTP: 400 dari validasi, 404
dari service, bahkan 404 untuk route yang tidak ada. Semuanya diubah ke
`{ success: false, message, errors }`.

### 3.4 `src/common/api-response.ts`: bentuk sukses

```ts
return ok('Order created', data);
// -> { success: true, message: 'Order created', data }
```

Satu fungsi kecil, tapi menjamin ke-10 case punya bentuk yang sama persis.

---

## 4. Contoh task: spesifikasi

> Pelanggan memesan kopi dari meja tertentu di cabang tertentu. Hitung total
> yang harus dibayar.

| | |
| --- | --- |
| Method | `POST` |
| Endpoint | `/coffee/:branch/tables/:tableNumber/orders` |
| Input | **Params + Query + Body** (body berisi array **dan** nested object) |

**Kenapa pembagiannya seperti itu?** (ingat aturan README: *params
mengidentifikasi, query mengatur, body membawa muatan*)

| Data | Sumber | Alasan |
| --- | --- | --- |
| `branch`, `tableNumber` | Params | Mengidentifikasi "di mana" pesanan dibuat. Wajib, satu nilai |
| `member`, `voucher` | Query | Opsional, hanya **mengubah perhitungan** |
| `customerName`, `items[]`, `payment{}` | Body | Muatan berupa daftar & objek, tidak cocok ditaruh di URL |

**Params DTO**

| Field | Type | Aturan |
| --- | --- | --- |
| `branch` | string | wajib; cabang tidak dikenal → **404** |
| `tableNumber` | number | wajib, integer, 1–30 |

**Query DTO**

| Field | Type | Aturan |
| --- | --- | --- |
| `member` | boolean | opsional, default `false`; diskon 10% |
| `voucher` | string | opsional, tidak case-sensitive (`NGOPI5K` potong 5.000, `HEMAT15` potong 15%); tidak dikenal → **404** |

**Body DTO**

| Field | Type | Aturan |
| --- | --- | --- |
| `customerName` | string | wajib, di-trim, 2–50 karakter |
| `items` | array | wajib, 1–10 objek |
| `items[].menuCode` | string | wajib; menu tidak ada → **404** |
| `items[].size` | string | `S` / `M` / `L` (+0 / +3.000 / +6.000) |
| `items[].qty` | number | integer, 1–10 |
| `items[].extraShots` | number | opsional, integer 0–3, default 0 (+5.000 per shot) |
| `payment.method` | string | `cash` / `qris` |
| `payment.paidAmount` | number | **wajib hanya kalau `cash`**, harus ≥ total |

**Rumus**

```
unitPrice     = hargaMenu + extraUkuran + extraShots * 5000
subtotal      = Σ unitPrice * qty
diskon        = member 10% + voucher        (maksimal = subtotal)
afterDiscount = subtotal - diskon
serviceCharge = afterDiscount * rateCabang   (jakarta 5%, bandung 3%, jogja 0%)
tax           = (afterDiscount + serviceCharge) * 11%
total         = afterDiscount + serviceCharge + tax
```

**Contoh request**

```http
POST /coffee/jakarta/tables/7/orders?member=true&voucher=hemat15
Content-Type: application/json

{
  "customerName": "  Budi  ",
  "items": [
    { "menuCode": "latte", "size": "M", "qty": 2, "extraShots": 1 },
    { "menuCode": "americano", "size": "S", "qty": 1 }
  ],
  "payment": { "method": "cash", "paidAmount": 100000 }
}
```

**Response (200)**, dipotong sebagian:

```json
{
  "success": true,
  "message": "Order created",
  "data": {
    "branch": "jakarta",
    "tableNumber": 7,
    "customerName": "Budi",
    "member": true,
    "voucher": "HEMAT15",
    "items": [ { "menuCode": "latte", "unitPrice": 33000, "lineTotal": 66000, "...": "..." } ],
    "subtotal": 84000,
    "discounts": { "member": 8400, "voucher": 12600, "total": 21000 },
    "serviceCharge": 3150,
    "tax": 7277,
    "total": 73427,
    "payment": { "method": "cash", "paidAmount": 100000, "change": 26573 }
  }
}
```

Perhatikan: `"  Budi  "` menjadi `"Budi"` (trim), `hemat15` menjadi `HEMAT15`
(uppercase), dan `"7"` dari URL menjadi angka `7`. Semua itu kerja
**class-transformer**.

---

## 5. Walkthrough langkah demi langkah

### Langkah 1: Buat kerangka modul

```bash
npx nest generate module coffee-orders
npx nest generate controller coffee-orders --no-spec
npx nest generate service coffee-orders --no-spec
```

atau `npx nest g resource coffee-orders` (pilih *REST API*, lalu jawab **No**
untuk CRUD entry points). CLI otomatis menambahkan module ke `app.module.ts`.
Cek di sana: kalau module tidak terdaftar, endpoint-nya **404 terus**.

Lalu buat folder `dto/` secara manual.

### Langkah 2: DTO Params → `dto/coffee-order-params.dto.ts`

```ts
@Type(() => Number)
@IsInt() @Min(1) @Max(30)
tableNumber: number;
```

- **Kenapa `@Type(() => Number)`?** Semua yang datang dari URL adalah
  **string**. `/tables/7` memberi `"7"`. `@Type` menyuruh class-transformer
  mengubahnya ke `Number` **sebelum** validasi. `"abc"` menjadi `NaN`, lalu
  `@IsInt()` menolaknya → 400.
- `enableImplicitConversion` sebenarnya juga melakukan konversi ini (dari tipe
  TypeScript `number`). Tapi menulis `@Type` secara eksplisit membuat niatmu
  jelas, dan ini juga diminta checklist README.
- **Urutan decorator:** class-validator menjalankan **semua** decorator lalu
  mengumpulkan semua error, jadi urutannya tidak memengaruhi hasil. Konvensinya:
  transformasi di atas, aturan di bawah.

```ts
@Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
@IsString() @IsNotEmpty()
branch: string;
```

- **Kenapa `branch` tidak memakai `@IsIn(['jakarta', ...])`?** Lihat
  pembahasan **400 vs 404** di bawah.

### Langkah 3: DTO Query → `dto/coffee-order-query.dto.ts`

Ini bagian dengan **jebakan terbesar**:

```ts
@IsOptional()
@Transform(toBoolean)
@IsBoolean()
member: boolean = false;
```

> ⚠️ **Jebakan boolean.** Query `?member=false` datang sebagai string
> `"false"`. Dengan `enableImplicitConversion`, class-transformer menjalankan
> `Boolean("false")`, yang hasilnya **`true`**, karena semua string tidak
> kosong itu truthy di JavaScript. Kalau tidak ditangani, `member=false` justru
> mendapat diskon member!
>
> Solusinya, fungsi `toBoolean` membaca **nilai mentah** lewat `obj[key]`
> (bukan `value`, yang sudah terlanjur dikonversi), lalu mencocokkan teks
> `"true"` / `"false"` secara manual. Nilai lain seperti `"maybe"` dibiarkan
> apa adanya sehingga `@IsBoolean()` menolaknya → 400.
>
> Jebakan ini juga ada di **Case 2, 6, 9, 10** (`inclusive`, `member`,
> `weekend`, `express`, `insurance`). Ada test khusus untuk ini:
> `member=false benar-benar dibaca sebagai false`.

- **`= false` (default value):** kalau `member` tidak dikirim, class-transformer
  tidak menyentuh field itu, sehingga nilai default dari class yang dipakai.
- **`@IsOptional()`:** kalau nilainya `undefined`/`null`, semua validator lain
  dilewati.

### Langkah 4: DTO Body → `dto/create-coffee-order-body.dto.ts`

**Array berisi objek** (mirip Case 4, 6):

```ts
@IsArray()
@ArrayMinSize(1) @ArrayMaxSize(10)
@ValidateNested({ each: true })
@Type(() => OrderItemDto)
items: OrderItemDto[];
```

- **Kenapa butuh `@Type` DAN `@ValidateNested`?** Dari JSON, `items[0]` hanya
  *plain object* `{ menuCode: ... }`, bukan instance `OrderItemDto`, jadi
  decorator di `OrderItemDto` tidak "menempel" padanya. `@Type` mengubahnya
  menjadi instance, lalu `@ValidateNested` menyuruh class-validator masuk ke
  dalamnya. **Lupa salah satu = validasi di dalam array diam-diam tidak jalan.**
- `{ each: true }` artinya "terapkan ke setiap elemen array".

**Nested object tunggal** (mirip Case 8, 10):

```ts
@IsObject()
@ValidateNested()
@Type(() => PaymentDto)
payment: PaymentDto;
```

**Validasi bersyarat** dengan `@ValidateIf`:

```ts
@ValidateIf((payment: PaymentDto) => payment.method === 'cash')
@IsNumber() @Min(0)
paidAmount?: number;
```

Kalau fungsinya mengembalikan `false` (bayar qris), semua validator di field
ini dilewati.

**Array angka biasa** (Case 3) tidak ada di contoh ini, tapi polanya:

```ts
@IsArray()
@ArrayMinSize(1) @ArrayMaxSize(20)
@IsNumber({}, { each: true })
@Min(0, { each: true }) @Max(100, { each: true })
scores: number[];
```

### Langkah 5: Controller → `coffee-orders.controller.ts`

```ts
@Controller('coffee')
export class CoffeeOrdersController {
  @Post(':branch/tables/:tableNumber/orders')
  @HttpCode(200)
  createOrder(
    @Param() params: CoffeeOrderParamsDto,
    @Query() query: CoffeeOrderQueryDto,
    @Body() body: CreateCoffeeOrderBodyDto,
  ) {
    const data = this.coffeeOrdersService.createOrder(params, query, body);
    return ok('Order created', data);
  }
}
```

- **URL = prefix controller + path method:** `'coffee'` + `':branch/tables/:tableNumber/orders'`.
  Tanda `:` berarti "bagian ini variabel".
- **`@Param()` tanpa argumen** mengambil *semua* params sebagai satu objek,
  lalu ValidationPipe memvalidasinya dengan DTO. (`@Param('branch')` hanya
  mengambil satu string dan **tidak** divalidasi oleh DTO.)
- **Satu DTO per sumber** (aturan README). Setiap `@Param/@Query/@Body`
  divalidasi **terpisah**: kalau body salah, kamu hanya melihat error body.
  Error params baru muncul setelah body diperbaiki.
- **`@HttpCode(200)`:** default `@Post()` di Nest adalah **201 Created**.
  README meminta 200, karena kita *menghitung* sesuatu, bukan membuat resource.
- **Controller tetap tipis:** tidak ada perhitungan di sini.

### Langkah 6: Service → `coffee-orders.service.ts`

Urutan di dalam `createOrder` sengaja dibuat seperti ini:

1. **Cek nilai bernama → 404** (`branch`, `voucher`, `menuCode`)
2. **Hitung per item** (`unitPrice`, `lineTotal`)
3. **Hitung total** (subtotal → diskon → service → pajak)
4. **Aturan bisnis yang butuh hasil hitungan → 400** (`paidAmount < total`)

Poin penting:

- **Lempar exception, jangan return error.** `throw new NotFoundException('...')`
  langsung menghentikan eksekusi. Filter global yang mengubahnya menjadi format
  JSON, jadi service tidak perlu tahu bentuk response.
- **Data "katalog" disimpan sebagai konstanta `Record<string, ...>`.**
  `MENU[item.menuCode]` mengembalikan `undefined` kalau tidak ada, yang
  langsung jadi tanda untuk 404. Ini pola yang sama untuk kota (Case 10),
  kupon (Case 6), dan kendaraan (Case 9).
- **Pembulatan:** `Math.round` untuk uang. Untuk N desimal (Case 1 miles 3
  desimal): `Math.round(x * 1000) / 1000`.

### Langkah 7: Coba jalankan

```bash
npm run start:dev
```

```bash
# sukses
curl -X POST 'localhost:3000/coffee/jakarta/tables/7/orders?member=true&voucher=hemat15' \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"Budi","items":[{"menuCode":"latte","size":"M","qty":2,"extraShots":1}],"payment":{"method":"qris"}}'

# 400: tableNumber bukan angka
curl -X POST 'localhost:3000/coffee/jakarta/tables/abc/orders' -H 'Content-Type: application/json' -d '{...}'

# 404: cabang tidak ada
curl -X POST 'localhost:3000/coffee/atlantis/tables/7/orders' -H 'Content-Type: application/json' -d '{...}'
```

(Di Postman: pilih method POST, isi URL, lalu tab **Body → raw → JSON**.)

Atau jalankan test otomatisnya: `npm run test:e2e`. Buka
`test/coffee-orders.e2e-spec.ts`, karena setiap test di sana adalah contoh
skenario sukses / 400 / 404.

---

## 6. Konsep penting: 400 vs 404

| Situasi | Status | Di mana dicek | Contoh |
| --- | --- | --- | --- |
| Bentuk/tipe data salah | **400** | DTO (class-validator) | `qty: 0`, `tableNumber: "abc"` |
| Pilihan tetap yang jadi bagian kontrak API | **400** | DTO (`@IsIn`) | `size: "XL"`, `method: "debit"` |
| Nama yang dicari di "katalog" tidak ditemukan | **404** | Service | cabang `atlantis`, voucher `GRATIS` |
| Aturan bisnis yang butuh hasil hitungan | **400** | Service | uang cash kurang dari total |

**Kenapa cabang tidak divalidasi dengan `@IsIn`?** Karena `@IsIn` gagal → 400,
padahal README meminta "unsupported city/coupon/unit → **404**". Jadi DTO
cukup memastikan *bentuknya* string, lalu service yang mencarinya di katalog.

---

## 7. Daftar jebakan (simpan baik-baik)

1. **Module lupa didaftarkan** di `app.module.ts` → semua request 404 "Cannot POST ...".
2. **`?flag=false` menjadi `true`** → pakai transform `toBoolean` (Langkah 3).
3. **Lupa `@Type(() => ChildDto)`** pada nested → validasi anak tidak jalan, tanpa error.
4. **POST mengembalikan 201** → tambahkan `@HttpCode(200)`.
5. **Mengirim field tambahan** → 400 `property x should not exist` (efek `forbidNonWhitelisted`). Ini disengaja.
6. **Nama route tidak cocok dengan README.** Generator membuat
   `@Controller('convertmeters')`, padahal Case 1 meminta `/convert/length/:meters`.
7. **Import harus berakhiran `.js`** (`'./dto/x.dto.js'`), karena project ini memakai ES Module (`"type": "module"`), walaupun file aslinya `.ts`.

---

## 8. Giliran kamu: Case 1 dengan pola yang sama

Kamu sudah punya `src/convertmeters/`. Petakan contoh di atas ke Case 1:

| Contoh kopi | Case 1 |
| --- | --- |
| `CoffeeOrderParamsDto` (branch, tableNumber) | `ConvertLengthParamsDto` (`meters`) |
| `CoffeeOrderQueryDto`, `CreateCoffeeOrderBodyDto` | **tidak ada**, karena Case 1 hanya memakai params |
| `@Controller('coffee')` + `@Post(':branch/...')` | `@Controller('convert')` + `@Get('length/:meters')` |
| `@HttpCode(200)` | tidak perlu, karena `@Get` default-nya sudah 200 |
| `ok('Order created', data)` | `ok('Length converted', data)` |
| 404 untuk cabang | tidak ada; Case 1 hanya punya 400 |

Langkah:

1. **DTO:** di `convertmeters.dto.ts`, ganti `convertmetersdto` (nama class
   sebaiknya PascalCase) dengan `ConvertLengthParamsDto`. Isinya satu field
   `meters` dengan `@Type(() => Number)`, `@IsNumber()`, `@Min(0)`,
   `@Max(1_000_000)`.
2. **Controller:** ubah prefix ke `'convert'`, tambahkan method `@Get('length/:meters')`
   yang menerima `@Param() params: ConvertLengthParamsDto`.
3. **Service:** buat method `convert(meters: number)` yang mengembalikan
   `{ meters, kilometers, centimeters, miles }`. Gunakan 1 mile = 1609.344 m,
   lalu bulatkan miles ke 3 desimal.
4. **Uji:** `/convert/length/1500` → 200; `/convert/length/abc` dan
   `/convert/length/-2` → 400 dengan `errors[].field = "meters"`.

Bonus: tulis e2e test-nya meniru `test/coffee-orders.e2e-spec.ts`.
