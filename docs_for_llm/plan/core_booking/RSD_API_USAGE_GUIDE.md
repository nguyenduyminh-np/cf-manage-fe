# RSD - HƯỚNG DẪN SỬ DỤNG CHI TIẾT API & BACKGROUND JOB MODULE BOOKING

> **Phiên bản:** 3.1 — Deep-Dive Edition  
> **Cập nhật:** 2026-04-18  
> **Base URL:** `/api/v1/table-booking`  
> **Tech stack:** Java 21 + Spring Boot 3.x | MySQL 8 | Redis + Redisson | WebSocket/STOMP  
> **Nguồn tài liệu gốc:** CORE_BUSINESS_BOOKING_MANAGE_STATE  
> **Đối chiếu:** Source code thực tế (`TableBookingController`, DTOs, Entity, Enums, GlobalExceptionHandler`)

---

## MỤC LỤC

**PHẦN A – CÁC API ENDPOINT**

- [A1. Tạo đơn đặt bàn (Create Booking)](#a1-tạo-đơn-đặt-bàn-create-booking)
- [A2. Xác nhận đơn đặt bàn (Confirm Booking)](#a2-xác-nhận-đơn-đặt-bàn-confirm-booking)
- [A3. Check-in (Nhận bàn cho khách)](#a3-check-in-nhận-bàn-cho-khách)
- [A4. Check-out (Khách thanh toán và rời đi)](#a4-check-out-khách-thanh-toán-và-rời-đi)
- [A5. Hủy đơn đặt bàn (Cancel Booking)](#a5-hủy-đơn-đặt-bàn-cancel-booking)
- [A6. Ghi nhận đặt cọc (Deposit)](#a6-ghi-nhận-đặt-cọc-deposit)
- [A7. Gia hạn thời gian sử dụng bàn (Extend)](#a7-gia-hạn-thời-gian-sử-dụng-bàn-extend)
- [A8. Tạo Walk-in (Legacy - Backward Compatibility)](#a8-tạo-walk-in-legacy---backward-compatibility)
- [A9. Tìm kiếm đơn đặt bàn (Search Booking)](#a9-tìm-kiếm-đơn-đặt-bàn-search-booking)
- [A10. Xem khung giờ trống (Available Slots)](#a10-xem-khung-giờ-trống-available-slots)
- [A11. Cập nhật đơn đặt bàn (Update Booking – Legacy)](#a11-cập-nhật-đơn-đặt-bàn-update-booking--legacy)
- [A12. Cập nhật trạng thái (Update Status – Legacy)](#a12-cập-nhật-trạng-thái-update-status--legacy)

**PHẦN B – CÁC BACKGROUND JOB (CHỨC NĂNG NỀN TỰ ĐỘNG)**

- [B1. Job A – Tự động chuyển bàn sang BOOKED trước 30 phút](#b1-job-a--tự-động-chuyển-bàn-sang-booked-trước-30-phút)
- [B2. Job B – Tự động hết hạn đơn no-show (EXPIRED)](#b2-job-b--tự-động-hết-hạn-đơn-no-show-expired)
- [B3. Job C – Cảnh báo đỏ kẹt bàn (Table Occupied Conflict)](#b3-job-c--cảnh-báo-đỏ-kẹt-bàn-table-occupied-conflict)
- [B4. Job D – Cảnh báo & tự động hủy khi không order món](#b4-job-d--cảnh-báo--tự-động-hủy-khi-không-order-món)
- [B5. Job E – Nhắc nhở sắp hết giờ sử dụng bàn](#b5-job-e--nhắc-nhở-sắp-hết-giờ-sử-dụng-bàn)

**PHẦN C – PHỤ LỤC**

- [C1. Quy ước chung & Response Contract](#c1-quy-ước-chung--response-contract)
- [C2. Trạng thái hệ thống (Status)](#c2-trạng-thái-hệ-thống-status)
- [C3. State Machine – Sơ đồ chuyển trạng thái](#c3-state-machine--sơ-đồ-chuyển-trạng-thái)
- [C4. Realtime Notification (WebSocket)](#c4-realtime-notification-websocket)
- [C5. Ma trận tổng hợp Rule 1–18](#c5-ma-trận-tổng-hợp-rule-118)

**PHẦN D – ĐỀ XUẤT THIẾT KẾ MÀN HÌNH FE**

- [D1. Tổng quan kiến trúc màn hình](#d1-tổng-quan-kiến-trúc-màn-hình)
- [D2. Màn hình Table Layout (Sơ đồ bàn)](#d2-màn-hình-table-layout-sơ-đồ-bàn)
- [D3. Màn hình Booking List (Danh sách đặt bàn)](#d3-màn-hình-booking-list-danh-sách-đặt-bàn)
- [D4. Dialog Create / Update Booking](#d4-dialog-create--update-booking)
- [D5. Dialog Booking Detail & Action Panel](#d5-dialog-booking-detail--action-panel)
- [D6. Notification Center (Trung tâm cảnh báo)](#d6-notification-center-trung-tâm-cảnh-báo)
- [D7. POS Integration – Walk-in Flow](#d7-pos-integration--walk-in-flow)

---

# PHẦN A – CÁC API ENDPOINT

---

## A1. Tạo đơn đặt bàn (Create Booking)

### Endpoint

```
POST /api/v1/table-booking/create
```

### Mục đích

Cho phép **khách hàng** (thông qua nhân viên hoặc hệ thống online) **đặt trước một bàn** tại nhà hàng vào một khung giờ cụ thể trong tương lai. Đây là bước khởi đầu của toàn bộ vòng đời một đơn đặt bàn.

### Chức năng

1. Tạo một bản ghi `table_booking` mới trong database với trạng thái `PENDING_CONFIRMATION`.
2. Validate toàn bộ rule nghiệp vụ trước khi lưu (thời gian đặt trước, xung đột khung giờ, thời lượng sử dụng).
3. **Không thay đổi trạng thái bàn** — bàn vẫn giữ `AVAILABLE` sau khi tạo đơn, cho phép khách walk-in vẫn sử dụng bàn đó nếu thời gian phù hợp.
4. Nếu khách thanh toán cọc ngay lập tức và thỏa mãn điều kiện: tự động chuyển booking sang `CONFIRMED`.
5. Sử dụng **distributed lock theo `tableId`** để chống race condition khi 2 nhân viên cùng đặt 1 bàn cùng lúc.

### Usecase thực tế chi tiết

| #   | Actor           | Tình huống thực tế                                                                                         | Kỳ vọng hệ thống                                                                                              |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Nhân viên       | Khách gọi điện đặt bàn 4 người cho tối nay 19:00. NV mở màn hình đặt bàn, chọn bàn 8, nhập thông tin khách | Tạo booking `PENDING_CONFIRMATION`. Bàn 8 vẫn `AVAILABLE`                                                     |
| 2   | Hệ thống online | Khách đặt bàn qua app/website lúc 14:00 cho buổi tối 19:00. Thanh toán cọc 200k qua MoMo ngay              | Tạo booking → auto-confirm sang `CONFIRMED` (vì đã cọc)                                                       |
| 3   | Nhân viên       | Khách VIP gọi đặt bàn riêng, NV nhập ghi chú "Bàn VIP, cần view cửa sổ"                                    | Tạo booking với `note`, NV sẽ confirm sau khi liên hệ lại                                                     |
| 4   | Nhân viên       | Khách đặt bàn lúc 17:30 cho 18:00 (chỉ trước 30 phút)                                                      | Bị từ chối: "Phải đặt trước ít nhất 2 tiếng"                                                                  |
| 5   | 2 NV đồng thời  | NV A và NV B cùng đặt bàn 8 cho khung 19:00-21:00                                                          | NV A thành công, NV B nhận lỗi `TABLE_LOCK_BUSY` hoặc `BOOKING_STATE_TRANSITION_INVALID` (xung đột khung giờ) |

### Flow Business chi tiết

```
1. Nhân viên / hệ thống gửi request tạo booking
       │
       ▼
2. Hệ thống acquire distributed lock trên tableId
   (Nếu lock fail → trả lỗi TABLE_LOCK_BUSY: "Bàn đang được thao tác bởi người khác")
       │
       ▼
3. Load thông tin bàn (dining_table) từ DB
   (Nếu bàn không tồn tại → trả lỗi INVALID_DATA)
       │
       ▼
4. Chạy Validator Chain: AdvanceBookingValidator → ExpectedArriveTimeWindowValidator → DurationValidator → NoConflictValidator
   │
   ├─ AdvanceBookingValidator (Rule 1):
   │    Kiểm tra expectedArriveTime >= NOW() + 2 tiếng
   │    → Nếu vi phạm: "Phải đặt trước ít nhất 2 tiếng"
   │
  ├─ ExpectedArriveTimeWindowValidator (Rule 1):
  │    Kiểm tra expectedArriveTime phải nằm trong khung 06:00 - 20:00 (giờ quán, UTC+7)
  │    → Nếu vi phạm: "Thời gian expectedArriveTime phải nằm trong khoảng 06:00 - 20:00"
  │
   ├─ DurationValidator (Rule 1):
   │    Kiểm tra expectedCheckOut = expectedArriveTime + 2h (mặc định)
   │    FE cho phép user điều chỉnh expectedCheckOut > 2h (tính phụ thu)
   │    → Nếu expectedCheckOut <= expectedArriveTime: "Thời gian checkout phải sau thời gian đến"
   │
   └─ NoConflictValidator (Rule 1, 15):
        Kiểm tra trên cùng bàn, không có booking (CONFIRMED/CHECKED_IN)
        nào mà khung giờ [expectedArriveTime, expectedCheckOut] bị overlap
        → Nếu xung đột: "Bàn đã có người đặt vào khung giờ này"
       │
       ▼
5. Tạo bản ghi table_booking:
   - booking_status = PENDING_CONFIRMATION
   - is_active = 1
   - expected_arrive_time = request.expectedArriveTime
   - expected_check_out = request.expectedCheckOut
   - check_in_at = NULL
   - check_out_at = NULL
   - deposit_amount = request.depositAmount (hoặc 0)
   - deposit_paid = false
       │
       ▼
6. Lưu vào DB, phát event BOOKING_CREATED qua WebSocket
       │
       ▼
7. [Tùy chọn] Nếu khách thanh toán cọc online ngay:
   → Gọi DepositService.processDeposit()
   → Nếu cọc thành công + đủ điều kiện: tự động chuyển CONFIRMED
       │
       ▼
8. Release lock, trả response cho FE
```

### Request Body — `TableBookingCreateRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingCreateRequestDTO.java`

```json
{
  "tableId": 8,
  "expectedArriveTime": "2026-04-10T19:00:00",
  "expectedCheckOut": "2026-04-10T21:00:00",
  "customerName": "Nguyen Van A",
  "phoneNumber": "0987654321",
  "depositAmount": 150000,
  "depositPaid": false,
  "depositPaidAt": null,
  "depositForfeited": null,
  "depositTxnRef": null,
  "bookingStatus": null,
  "note": "Bàn gần cửa sổ"
}
```

| Field                | Type            | Bắt buộc  | Validation                                           | Mô tả                                                                                                     |
| -------------------- | --------------- | --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tableId`            | `Integer`       | ✅ **Có** | `@NotNull`, `@Positive` (> 0)                        | ID bàn cần đặt                                                                                            |
| `expectedArriveTime` | `LocalDateTime` | ✅ **Có** | `@NotNull`, `@FutureOrPresent`. Alias: `bookingTime` | Thời gian khách dự kiến đến. BE enforce thêm: ≥ NOW() + 2h và trong khung 06:00 - 20:00 (giờ quán, UTC+7) |
| `expectedCheckOut`   | `LocalDateTime` | ✅ **Có** | `@NotNull`                                           | Thời gian dự kiến rời. FE mặc định = arriveTime + 2h                                                      |
| `customerName`       | `String`        | Không     | `@Size(max=255)`                                     | Tên khách đặt bàn                                                                                         |
| `phoneNumber`        | `String`        | Không     | `@Pattern(PHONE_NUMBER)`                             | SĐT khách. Regex: `^(0[1-9][0-9]{8})$` hoặc rỗng                                                          |
| `depositAmount`      | `BigDecimal`    | Không     | `@DecimalMin("0")`                                   | Số tiền đặt cọc. `0` hoặc `null` = không yêu cầu cọc                                                      |
| `depositPaid`        | `Boolean`       | Không     | —                                                    | Đánh dấu đã cọc chưa (dùng khi cọc ngay lúc tạo)                                                          |
| `depositPaidAt`      | `LocalDateTime` | Không     | —                                                    | Thời gian thanh toán cọc                                                                                  |
| `depositForfeited`   | `Boolean`       | Không     | —                                                    | Cọc đã bị tịch thu chưa (thường null khi tạo)                                                             |
| `depositTxnRef`      | `String`        | Không     | `@Size(max=255)`                                     | Mã giao dịch cọc (MOMO-xxx, VNPAY-xxx)                                                                    |
| `bookingStatus`      | `String`        | Không     | `@Pattern(BUSINESS_CODE)`                            | Thường null — BE tự set `PENDING_CONFIRMATION`                                                            |
| `note`               | `String`        | Không     | `@Size(max=255)`                                     | Ghi chú đặc biệt (VD: "Sinh nhật", "VIP")                                                                 |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "CREATE_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "tableId": 8,
    "tableCode": "T08",
    "tableName": "Ban 08",
    "expectedArriveTime": "2026-04-10T19:00:00",
    "checkInAt": null,
    "expectedCheckOut": "2026-04-10T21:00:00",
    "checkOutAt": null,
    "bookingStatus": "PENDING_CONFIRMATION",
    "bookingStatusName": "Chờ xác nhận",
    "customerName": "Nguyen Van A",
    "phoneNumber": "0987654321",
    "depositAmount": 150000,
    "depositPaid": false,
    "depositPaidAt": null,
    "depositForfeited": false,
    "depositTxnRef": null,
    "note": "Bàn gần cửa sổ",
    "accountId": 1,
    "accountUsername": "staff1",
    "accountFullName": "Nhân viên 1",
    "active": true,
    "createdAt": "2026-04-10T12:00:00"
  }
}
```

### Error Catalog — Toàn bộ nhánh lỗi có thể xảy ra

| #   | HTTP | Code                               | Message mẫu                                                                    | Nguyên nhân                                   | FE Action                                               |
| --- | ---- | ---------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| E1  | 400  | `INVALID_DATA`                     | `tableId is required`                                                          | Thiếu field bắt buộc                          | Highlight field lỗi trên form                           |
| E2  | 400  | `INVALID_DATA`                     | `tableId must be > 0`                                                          | Giá trị không hợp lệ                          | Highlight field                                         |
| E3  | 400  | `INVALID_DATA`                     | `invalid time range`                                                           | `expectedArriveTime` trong quá khứ            | Hiển thị toast, focus vào datetime picker               |
| E4  | 400  | `INVALID_DATA`                     | `Invalid phone number`                                                         | SĐT sai format                                | Highlight SĐT                                           |
| E5  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] must book at least 2 hours in advance`                       | Đặt trước < 2h (Rule 1)                       | Toast + gợi ý chọn giờ xa hơn                           |
| E5B | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] expectedArriveTime must be between 06:00 and 20:00`          | Giờ đến dự kiến ngoài khung giờ quán (Rule 1) | Toast + gợi ý chọn khung giờ hợp lệ                     |
| E6  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] expectedCheckOut must be after expectedArriveTime`           | Checkout ≤ arriveTime                         | Toast + focus form                                      |
| E7  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] time slot conflicts with existing booking on the same table` | Xung đột khung giờ (Rule 15)                  | Toast + hiển thị suggest available slots                |
| E8  | 409  | `TABLE_LOCK_BUSY`                  | `Table is being updated by another request (tableId=8)`                        | Race condition (Rule 15)                      | Toast: "Bàn đang thao tác, thử lại" + auto retry sau 2s |
| E9  | 500  | `INTERNAL_SERVER_ERROR`            | `An unexpected error occurred`                                                 | Lỗi hệ thống                                  | Toast lỗi chung, ghi log                                |

### Kết quả DB sau thành công

| Field                       | Giá trị                 |
| --------------------------- | ----------------------- |
| `booking_status`            | `PENDING_CONFIRMATION`  |
| `dining_table.table_status` | `AVAILABLE` (không đổi) |
| `check_in_at`               | `NULL`                  |
| `check_out_at`              | `NULL`                  |
| `is_active`                 | `1`                     |

### WebSocket Event sau thành công

```json
// Topic: /topic/booking-updates
{
  "event": "BOOKING_CREATED",
  "mutationType": "CREATE",
  "bookingId": 123,
  "tableId": 8,
  "tableCode": "T08",
  "bookingStatus": "PENDING_CONFIRMATION",
  "tableStatus": "AVAILABLE",
  "at": "2026-04-10T12:00:00",
  "message": "Booking mutation committed: BOOKING_CREATED",
  "source": "BOOKING_MUTATION_AFTER_COMMIT",
  "dedupKey": "booking:mutation:booking:CREATE:123:8:2026-04-10T12:00:00",
  "eventId": "uuid-v4"
}
```

### Các Rule áp dụng

| Rule    | Mô tả                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Rule 1  | `expectedArriveTime >= NOW() + 2h` và `expectedArriveTime` trong khung 06:00 - 20:00 (giờ quán, UTC+7). Checkout mặc định = arriveTime + 2h |
| Rule 15 | Lock theo tableId, giao dịch trùng sẽ bị từ chối                                                                                            |

### Cập nhật contract 2026-04-18: `isWalkIn` trên API `/create`

Từ phiên bản 3.1, API `POST /api/v1/table-booking/create` hỗ trợ thêm field `isWalkIn` để dùng chung một endpoint cho 2 nghiệp vụ.

| Mode                 | Điều kiện                      | Luồng BE        | Kết quả booking                                      | Kết quả bàn     |
| -------------------- | ------------------------------ | --------------- | ---------------------------------------------------- | --------------- |
| Booking thông thường | `isWalkIn = false` hoặc `null` | `createBooking` | `PENDING_CONFIRMATION` (hoặc theo flow xác nhận/cọc) | `AVAILABLE`     |
| Walk-in tạo mới      | `isWalkIn = true`              | `createWalkIn`  | `CHECKED_IN` ngay                                    | `OCCUPIED` ngay |

Field mới trong request:

| Field      | Type      | Bắt buộc | Mô tả                                                                    |
| ---------- | --------- | -------- | ------------------------------------------------------------------------ |
| `isWalkIn` | `Boolean` | Không    | `true`: khách vãng lai, ngồi ngay. `false/null`: đặt trước thông thường. |

Ví dụ request booking thông thường:

```json
{
  "tableId": 8,
  "expectedArriveTime": "2026-04-18T19:00:00.000Z",
  "expectedCheckOut": "2026-04-18T21:00:00.000Z",
  "customerName": "Nguyen Van A",
  "phoneNumber": "0987654321",
  "isWalkIn": false
}
```

Ví dụ request walk-in trên cùng API `/create`:

```json
{
  "tableId": 8,
  "expectedArriveTime": "2026-04-18T19:00:00.000Z",
  "expectedCheckOut": "2026-04-18T21:00:00.000Z",
  "customerName": "Khach vang lai",
  "phoneNumber": "0987654321",
  "isWalkIn": true
}
```

Chi tiết validate thời gian theo từng mode:

1. Booking thông thường (`isWalkIn=false/null`):
   - Dùng trực tiếp `expectedArriveTime` và `expectedCheckOut` từ request.
   - Validate theo rule booking đặt trước (khung giờ, xung đột, thứ tự thời gian).
2. Walk-in (`isWalkIn=true`):
   - BE chuẩn hóa `expectedArriveTime = NOW()` tại use-case walk-in.
   - `expectedCheckOut`:
     - không truyền: mặc định `NOW() + 2 giờ`.
     - có truyền: bắt buộc phải lớn hơn `NOW()`.
   - Bàn được chuyển `OCCUPIED` ngay sau khi lưu booking.

Lưu ý tương thích FE ở phiên bản hiện tại:

- Tại tầng DTO hiện vẫn đang có validate bắt buộc cho `expectedArriveTime` và `expectedCheckOut`.
- Do đó FE vẫn cần gửi đủ 2 field này khi gọi `/create`, kể cả `isWalkIn=true`.
- Trong nhánh walk-in, `expectedArriveTime` từ request sẽ được backend override về thời điểm hiện tại để đúng nghiệp vụ.

Khuyến nghị migration:

- Walk-in thuần: chuyển sang dùng `/create` + `isWalkIn=true`.
- Endpoint `/walk-in` chỉ giữ cho backward compatibility và case `lateBookingId`/`force`.

---

## A2. Xác nhận đơn đặt bàn (Confirm Booking)

### Endpoint

```
POST /api/v1/table-booking/{id}/confirm
```

### Mục đích

Cho phép **nhân viên** xác nhận một đơn đặt bàn đang chờ (`PENDING_CONFIRMATION`) sau khi đã liên hệ khách hoặc đã nhận được tiền đặt cọc. Đây là bước bắt buộc trước khi hệ thống bắt đầu giữ bàn (reserve) cho khách.

### Chức năng

1. Chuyển trạng thái booking từ `PENDING_CONFIRMATION` sang `CONFIRMED`.
2. Kiểm tra điều kiện đặt cọc: nếu đơn có `depositAmount > 0` thì bắt buộc `depositPaid = true` trước khi confirm.
3. Re-check xung đột thời gian tại thời điểm confirm (không dựa vào lúc tạo đơn vì có thể đã có booking khác chen vào).
4. Sau khi confirm, bàn **vẫn giữ AVAILABLE** — hệ thống chỉ tự động chuyển bàn sang `BOOKED` khi còn 30 phút trước giờ hẹn (do Job A xử lý).

### Usecase thực tế chi tiết

| #   | Actor     | Tình huống thực tế                                                                | Kỳ vọng hệ thống                                         |
| --- | --------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Nhân viên | Khách đặt bàn qua điện thoại. NV gọi lại xác nhận 30 phút sau, ấn Confirm         | Chuyển `CONFIRMED`, bàn vẫn `AVAILABLE`                  |
| 2   | Nhân viên | Khách chuyển khoản cọc 200k, NV kiểm tra tài khoản → ấn ghi nhận cọc → ấn Confirm | Cọc OK → Confirm pass                                    |
| 3   | Hệ thống  | API deposit nhận callback thanh toán cọc thành công → auto-confirm                | Tự động `CONFIRMED`                                      |
| 4   | Nhân viên | NV ấn Confirm nhưng khách chưa cọc (đơn yêu cầu cọc 300k)                         | Bị từ chối: "Cần thanh toán tiền cọc trước khi xác nhận" |
| 5   | Nhân viên | NV ấn Confirm nhưng trong lúc chờ, booking khác đã chen vào cùng khung giờ        | Bị từ chối: "Khung giờ này đã có booking khác xác nhận"  |

### Flow Business chi tiết

```
1. Nhân viên ấn nút "Xác nhận" trên giao diện chi tiết booking
       │
       ▼
2. Hệ thống kiểm tra booking tồn tại và is_active = 1
   (Nếu không tồn tại → trả lỗi)
       │
       ▼
3. Kiểm tra trạng thái hiện tại = PENDING_CONFIRMATION
   (Nếu khác → trả lỗi BOOKING_STATE_TRANSITION_INVALID)
       │
       ▼
4. Chạy Validator Chain: NoConflictValidator → DepositValidator
   │
   ├─ NoConflictValidator (Rule 2):
   │    Re-check xung đột khung giờ tại thời điểm confirm
   │    (Vì từ lúc tạo đơn đến lúc confirm, có thể đã có booking khác chen vào)
   │    → Nếu xung đột: "Khung giờ này đã có booking khác xác nhận"
   │
   └─ DepositValidator (Rule 2):
        Nếu depositAmount > 0 → kiểm tra depositPaid == true
        → Nếu chưa cọc: "Cần thanh toán tiền cọc trước khi xác nhận"
       │
       ▼
5. Chuyển booking_status → CONFIRMED qua State Machine
       │
       ▼
6. Lưu DB, phát event BOOKING_CONFIRMED qua WebSocket
       │
       ▼
7. Trả response thành công
```

### Request

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)
- **Body:** Không cần body.

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "CONFIRM_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "tableId": 8,
    "tableCode": "T08",
    "tableName": "Ban 08",
    "expectedArriveTime": "2026-04-10T19:00:00",
    "checkInAt": null,
    "expectedCheckOut": "2026-04-10T21:00:00",
    "checkOutAt": null,
    "bookingStatus": "CONFIRMED",
    "bookingStatusName": "Đã xác nhận",
    "customerName": "Nguyen Van A",
    "phoneNumber": "0987654321",
    "depositAmount": 200000,
    "depositPaid": true,
    "depositPaidAt": "2026-04-10T14:30:00",
    "depositForfeited": false,
    "depositTxnRef": "MOMO-20260410-001",
    "note": "",
    "accountId": 1,
    "accountUsername": "staff1",
    "accountFullName": "Nhân viên 1",
    "active": true,
    "createdAt": "2026-04-10T09:00:00"
  }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                     | Nguyên nhân                | FE Action                   |
| --- | ---- | ---------------------------------- | --------------------------------------------------------------- | -------------------------- | --------------------------- |
| E1  | 400  | `INVALID_DATA`                     | `bookingId must be > 0`                                         | Path variable không hợp lệ | Toast lỗi                   |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] transition CONFIRMED → CONFIRMED is not allowed` | Booking đã confirm rồi     | Refresh row, disable nút    |
| E3  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] deposit required before confirm`              | Chưa cọc (Rule 2)          | Mở dialog Deposit trước     |
| E4  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] time slot conflicts with existing booking`    | Xung đột sau khi tạo đơn   | Toast + suggest đổi giờ/bàn |
| E5  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[GUARD_FAILED] booking is not active`                          | Booking đã bị deactivate   | Refresh list                |
| E6  | 409  | `TABLE_LOCK_BUSY`                  | `Table is being updated...`                                     | Race condition             | Toast + retry               |

### Kết quả DB sau thành công

| Field                       | Giá trị                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `booking_status`            | `CONFIRMED`                                                   |
| `dining_table.table_status` | `AVAILABLE` (không đổi — chờ Job A chuyển BOOKED khi còn 30p) |

### Lưu ý nghiệp vụ quan trọng

> Khi nhân viên chọn bàn cho khách walk-in, nếu bàn đó **đã có booking `CONFIRMED`**, hệ thống sẽ hiển thị guard: thông báo còn bao nhiêu thời gian từ `NOW()` đến `expectedArriveTime` của đơn booking. Nhân viên nhìn vào thời gian AVAILABLE còn lại để quyết định có xếp walk-in vào hay không.

---

## A3. Check-in (Nhận bàn cho khách)

### Endpoint

```
POST /api/v1/table-booking/{id}/check-in
```

### Mục đích

Ghi nhận việc **khách hàng đã đến nhà hàng** và bắt đầu sử dụng bàn. Đây là thời điểm bàn chuyển từ trạng thái chờ (`BOOKED`) hoặc trống (`AVAILABLE`) sang đang sử dụng (`OCCUPIED`), cho phép POS bắt đầu nhận order món.

### Chức năng

1. Ghi nhận `check_in_at = NOW()` (hoặc thời gian FE truyền vào).
2. Chuyển booking từ `CONFIRMED` sang `CHECKED_IN`.
3. Chuyển bàn từ `AVAILABLE`/`BOOKED` sang `OCCUPIED`.
4. Xử lý nhiều tình huống check-in khác nhau: đúng giờ, sớm, muộn; bàn AVAILABLE, BOOKED.
5. Khi check-in sớm > 30p: tính lại `expectedCheckOut` và kiểm tra xung đột với booking kế tiếp.
6. Sử dụng lock theo `tableId`.

### Usecase thực tế chi tiết

| #   | Actor | Tình huống thực tế                                                            | Rule    | Kỳ vọng hệ thống                                                                |
| --- | ----- | ----------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| 1   | NV    | Khách đến đúng 19:00 (giờ hẹn), NV ấn check-in                                | Rule 4  | `CHECKED_IN`, giữ nguyên expectedCheckOut = 21:00                               |
| 2   | NV    | Khách đến sớm 15p (18:45), NV ấn check-in                                     | Rule 4  | `CHECKED_IN`, giữ nguyên expectedCheckOut = 21:00                               |
| 3   | NV    | Khách đến muộn 20p (19:20), NV check-in                                       | Rule 4  | `CHECKED_IN`, giữ nguyên expectedCheckOut = 21:00 (khách mất 20p)               |
| 4   | NV    | Khách đến sớm 1 tiếng (18:00), bàn AVAILABLE                                  | Rule 10 | `CHECKED_IN`, tính lại expectedCheckOut = 20:00. Check conflict booking kế tiếp |
| 5   | NV    | Khách đến sớm 1 tiếng, bàn AVAILABLE, nhưng checkout mới chạm booking kế tiếp | Rule 10 | Cảnh báo conflict → NV ấn `force=true` để override                              |
| 6   | NV    | Khách đến sớm, bàn đang BOOKED do chính booking này                           | Rule 11 | Verify ownership → cho phép, giữ nguyên expectedCheckOut gốc                    |
| 7   | NV    | Khách đến sớm, bàn đang BOOKED nhưng do booking KHÁC                          | Rule 11 | CHẶN: "Bàn đang giữ chỗ cho booking khác"                                       |
| 8   | NV    | Khách đến muộn 45 phút (19:45)                                                | Rule 12 | CHẶN: booking đã/sẽ EXPIRED. NV phải tạo walk-in mới                            |

### Flow Business chi tiết

```
1. Nhân viên ấn nút "Check-in" trên giao diện booking
       │
       ▼
2. Acquire distributed lock trên tableId
       │
       ▼
3. Load booking + dining_table từ DB
   Kiểm tra booking_status = CONFIRMED
   (Nếu khác → BOOKING_STATE_TRANSITION_INVALID)
       │
       ▼
4. Xác định loại check-in dựa trên thời gian hiện tại:
   │
   ├─ CASE A: Đúng giờ hoặc ±30 phút (Rule 4)
   │    Điều kiện: expectedArriveTime - 30p ≤ NOW() ≤ expectedArriveTime + 30p
   │    Xử lý:
   │    • check_in_at = NOW()
   │    • expectedCheckOut giữ nguyên (không tính lại)
   │    • Nếu đến muộn (check_in_at > expectedArriveTime):
   │      khách vẫn phải trả bàn đúng giờ expectedCheckOut ban đầu
   │
   ├─ CASE B: Sớm > 30 phút, bàn đang AVAILABLE (Rule 10)
   │    Điều kiện: NOW() < expectedArriveTime - 30p, bàn AVAILABLE
   │    Xử lý:
   │    • check_in_at = NOW()
   │    • Tính lại expectedCheckOut = NOW() + maxDuration (2h)
   │    • Kiểm tra xung đột: expectedCheckOut mới vs expectedArriveTime booking kế tiếp
   │      ├─ Nếu không xung đột → cho phép check-in
   │      └─ Nếu xung đột → cảnh báo, yêu cầu force=true
   │         (FE hiển thị dialog xác nhận cho nhân viên)
   │
   └─ CASE C: Sớm, bàn đang BOOKED (Rule 11)
        Điều kiện: bàn BOOKED
        Xử lý:
        • Xác minh bàn đang BOOKED là do CHÍNH booking này reserve
          (BookingOwnershipValidator)
        • Nếu đúng owner → cho phép check-in, giữ nguyên expectedCheckOut gốc
        • Nếu không phải owner → CHẶN: "Bàn đang giữ chỗ cho booking khác"
       │
       ▼
5. State Machine transition: CONFIRMED → CHECKED_IN
       │
       ▼
6. Cập nhật:
   - booking: check_in_at = NOW(), booking_status = CHECKED_IN
   - dining_table: table_status = OCCUPIED
       │
       ▼
7. Lưu DB, phát event BOOKING_CHECKED_IN qua WebSocket
       │
       ▼
8. POS bắt đầu cho phép order món cho bàn này
       │
       ▼
9. Release lock, trả response
```

### Request — `TableBookingCheckInRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingCheckInRequestDTO.java`

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)
- **Body:** Optional

```json
{
  "checkInAt": "2026-04-10T17:50:00",
  "force": false
}
```

| Field       | Type            | Bắt buộc | Mô tả                                                                          |
| ----------- | --------------- | -------- | ------------------------------------------------------------------------------ |
| `checkInAt` | `LocalDateTime` | Không    | Thời gian check-in thực tế. Nếu null → BE dùng `NOW()`                         |
| `force`     | `Boolean`       | Không    | `true` = bỏ qua cảnh báo xung đột khi check-in sớm (Rule 10). Mặc định `false` |

### Bảng tổng hợp các trường hợp check-in

| Trường hợp               | Điều kiện thời gian                          | Trạng thái bàn   | `expectedCheckOut`                            | Rule |
| ------------------------ | -------------------------------------------- | ---------------- | --------------------------------------------- | ---- |
| Đúng giờ                 | NOW ≈ arriveTime (±30p)                      | AVAILABLE/BOOKED | Giữ nguyên                                    | 4    |
| Sớm ≤ 30p                | arriveTime - 30p ≤ NOW < arriveTime          | AVAILABLE/BOOKED | Giữ nguyên                                    | 4    |
| Muộn ≤ 30p               | arriveTime < NOW ≤ arriveTime + 30p          | AVAILABLE/BOOKED | Giữ nguyên                                    | 4    |
| Sớm > 30p, bàn AVAILABLE | NOW < arriveTime - 30p, bàn AVAILABLE        | AVAILABLE        | Tính lại = NOW + 2h                           | 10   |
| Sớm, bàn BOOKED do mình  | NOW < arriveTime, bàn BOOKED by this booking | BOOKED           | Giữ nguyên gốc                                | 11   |
| Muộn > 30p               | NOW > arriveTime + 30p                       | —                | KHÔNG cho check-in, phải qua flow walk-in mới | 12   |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "CHECK_IN_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "bookingStatus": "CHECKED_IN",
    "bookingStatusName": "Đã nhận bàn",
    "checkInAt": "2026-04-10T18:55:00",
    "expectedCheckOut": "2026-04-10T21:00:00",
    "..."
  }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                                   | Nguyên nhân                                          | FE Action                                                                         |
| --- | ---- | ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| E1  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] transition PENDING → CHECKED_IN is not allowed`                | Booking chưa confirm                                 | Toast + suggest confirm trước                                                     |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] arrival too late (>30min), booking expired. Use walk-in`    | Muộn > 30p (Rule 12)                                 | Mở dialog Walk-in, truyền `lateBookingId`                                         |
| E3  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] early check-in conflicts with next booking. Use force=true` | Sớm > 30p + conflict (Rule 10)                       | Hiện dialog xác nhận, button "Xác nhận check-in sớm" gọi lại API với `force=true` |
| E4  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] table is BOOKED by another booking`                         | Bàn BOOKED nhưng không phải do booking này (Rule 11) | Toast, suggest đổi bàn                                                            |
| E5  | 409  | `TABLE_LOCK_BUSY`                  | `Table is being updated...`                                                   | Race condition                                       | Toast + retry                                                                     |

---

## A4. Check-out (Khách thanh toán và rời đi)

### Endpoint

```
POST /api/v1/table-booking/{id}/check-out
```

### Mục đích

Ghi nhận việc **khách hàng đã thanh toán xong và rời khỏi bàn**. Bàn được giải phóng để sẵn sàng cho khách tiếp theo. Tiền cọc (nếu có) được khấu trừ vào hóa đơn.

### Chức năng

1. Ghi nhận `check_out_at = NOW()`.
2. Chuyển booking từ `CHECKED_IN` sang `COMPLETED`.
3. Chuyển bàn từ `OCCUPIED` sang `AVAILABLE` (giải phóng bàn).
4. Khấu trừ tiền cọc vào invoice nếu đã đặt cọc.
5. Tính phụ thu nếu khách ở quá thời gian `maxDuration`.

### Usecase thực tế chi tiết

| #   | Actor | Tình huống thực tế                                           | Kỳ vọng                                                             |
| --- | ----- | ------------------------------------------------------------ | ------------------------------------------------------------------- | --- |
| 1   | NV    | Khách gọi thanh toán, NV in hóa đơn, ấn check-out (đúng giờ) | `COMPLETED`, bàn `AVAILABLE`, cọc khấu trừ invoice                  |
| 2   | NV    | Khách rời sớm 30p so với expectedCheckOut                    | `COMPLETED` bình thường, không phụ thu                              |
| 3   | NV    | Khách ở quá giờ 45 phút                                      | `COMPLETED` + tính phụ thu quá giờ (50k/30p)                        | for |
| 4   | NV    | Khách check-out đúng lúc có booking kế tiếp sắp bắt đầu      | `COMPLETED`, bàn `AVAILABLE`, booking kế tiếp sẽ được Job A reserve |

### Request — `TableBookingCheckOutRequestDTO`

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)
- **Body:** Optional

```json
{
  "checkOutAt": "2026-04-10T20:05:00"
}
```

| Field        | Type            | Bắt buộc | Mô tả                                                  |
| ------------ | --------------- | -------- | ------------------------------------------------------ |
| `checkOutAt` | `LocalDateTime` | Không    | Thời gian checkout thực tế. Nếu null → BE dùng `NOW()` |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "CHECK_OUT_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "bookingStatus": "COMPLETED",
    "bookingStatusName": "Hoàn thành",
    "checkInAt": "2026-04-10T18:55:00",
    "checkOutAt": "2026-04-10T20:05:00",
    "expectedCheckOut": "2026-04-10T21:00:00",
    "..."
  }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                     | Nguyên nhân              | FE Action                        |
| --- | ---- | ---------------------------------- | --------------------------------------------------------------- | ------------------------ | -------------------------------- |
| E1  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] transition CONFIRMED → COMPLETED is not allowed` | Booking chưa check-in    | Toast, suggest check-in trước    |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[GUARD_FAILED] checkOutAt is required for COMPLETED`           | Thiếu thông tin checkout | BE auto-resolve, hiếm khi xảy ra |
| E3  | 409  | `TABLE_LOCK_BUSY`                  | `Table is being updated...`                                     | Race condition           | Toast + retry                    |

### Kết quả DB sau thành công

| Field                       | Giá trị                     |
| --------------------------- | --------------------------- |
| `booking_status`            | `COMPLETED`                 |
| `dining_table.table_status` | `AVAILABLE`                 |
| `check_out_at`              | Thời gian check-out thực tế |

---

## A5. Hủy đơn đặt bàn (Cancel Booking)

### Endpoint

```
POST /api/v1/table-booking/{id}/cancel
```

### Mục đích

Cho phép **khách hàng chủ động hủy** hoặc **nhân viên hủy** đơn đặt bàn chưa diễn ra. Giải phóng bàn (nếu đang BOOKED) và xử lý hoàn cọc theo chính sách.

### Chức năng

1. Chuyển booking sang `CANCELLED`.
2. Chỉ cho phép hủy khi booking đang ở `PENDING_CONFIRMATION` hoặc `CONFIRMED`.
3. Chỉ cho phép hủy **trước** mốc `expectedArriveTime` (không hủy được sau giờ hẹn).
4. Nếu bàn đang `BOOKED` (đã reserve) → chuyển bàn về `AVAILABLE`.
5. Nếu đã đặt cọc → hoàn cọc theo policy.

### Usecase thực tế chi tiết

| #   | Actor | Tình huống thực tế                                              | Kỳ vọng                                          |
| --- | ----- | --------------------------------------------------------------- | ------------------------------------------------ |
| 1   | Khách | Khách gọi hủy lịch vì thay đổi kế hoạch (trước giờ hẹn 3 tiếng) | `CANCELLED`, hoàn cọc, bàn `AVAILABLE`           |
| 2   | NV    | Khách không liên lạc được, NV quyết định hủy đơn PENDING        | `CANCELLED`, không có cọc nên không xử lý        |
| 3   | NV    | Booking đã CONFIRMED + BOOKED (30p trước giờ), khách gọi hủy    | `CANCELLED`, bàn chuyển về `AVAILABLE`, hoàn cọc |
| 4   | NV    | Cố hủy booking đã CHECKED_IN (khách đang ngồi)                  | Bị từ chối: state transition invalid             |
| 5   | NV    | Cố hủy booking nhưng đã qua giờ hẹn                             | Bị từ chối: "Không thể hủy sau giờ đến"          |

### Request

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)
- **Body:** Không cần body.

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "CANCEL_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "bookingStatus": "CANCELLED",
    "bookingStatusName": "Đã huỷ",
    "..."
  }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                      | Nguyên nhân                                      | FE Action                                    |
| --- | ---- | ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| E1  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] transition CHECKED_IN → CANCELLED is not allowed` | Booking đang CHECKED_IN, không hủy bằng tay được | Toast (Job D sẽ auto-cancel nếu không order) |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] cannot cancel after expected arrival time`     | Đã qua giờ hẹn (Rule 6)                          | Toast + suggest chờ EXPIRED hoặc tạo walk-in |
| E3  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] terminal state`                                   | Booking đã COMPLETED/EXPIRED/CANCELLED           | Disable nút Cancel                           |

---

## A6. Ghi nhận đặt cọc (Deposit)

### Endpoint

```
POST /api/v1/table-booking/{id}/deposit
```

### Mục đích

Ghi nhận việc **khách hàng đã thanh toán tiền đặt cọc** cho đơn đặt bàn. Tiền cọc là điều kiện bắt buộc để xác nhận booking (nếu đơn yêu cầu cọc). Cọc cũng là công cụ ràng buộc khách đến đúng hẹn (mất cọc nếu no-show).

### Chức năng

1. Cập nhật thông tin cọc vào booking: `depositPaid = true`, `depositPaidAt`, `depositTxnRef`.
2. Nếu booking đang `PENDING_CONFIRMATION` và đủ điều kiện → tự động chuyển sang `CONFIRMED`.
3. Phát event thông báo qua topic `/topic/deposit-events`.

### Usecase thực tế chi tiết

| #   | Actor    | Tình huống thực tế                                          | Kỳ vọng                                                        |
| --- | -------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | NV       | Khách chuyển khoản 200k, NV nhập mã giao dịch MOMO-xxx      | `depositPaid=true`, sẵn sàng confirm                           |
| 2   | Hệ thống | Callback từ MoMo thành công, API gọi deposit + auto-confirm | Booking chuyển thẳng `CONFIRMED`                               |
| 3   | NV       | Khách cọc tiền mặt 300k tại quầy                            | NV nhập `depositAmount=300000`, `depositTxnRef="CASH-xxx"`     |
| 4   | NV       | Gọi deposit cho booking đã CANCELLED                        | Vẫn ghi nhận được (deposit là nghiệp vụ tách biệt khỏi status) |

### Request — `TableBookingDepositRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingDepositRequestDTO.java`

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)

```json
{
  "depositAmount": 300000,
  "depositPaidAt": "2026-04-10T14:30:00",
  "depositTxnRef": "MOMO-20260410-001"
}
```

| Field           | Type            | Bắt buộc | Validation                                     | Mô tả                                          |
| --------------- | --------------- | -------- | ---------------------------------------------- | ---------------------------------------------- |
| `depositAmount` | `BigDecimal`    | Có\*     | `@DecimalMin("0", inclusive=false)` → phải > 0 | Số tiền cọc                                    |
| `depositPaidAt` | `LocalDateTime` | Không    | —                                              | Thời gian thanh toán. Nếu null → BE dùng NOW() |
| `depositTxnRef` | `String`        | Không    | `@Size(max=255)`                               | Mã giao dịch (MOMO-xxx, VNPAY-xxx, CASH-xxx)   |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "DEPOSIT_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "bookingStatus": "CONFIRMED",
    "depositPaid": true,
    "depositPaidAt": "2026-04-10T14:30:00",
    "depositTxnRef": "MOMO-20260410-001",
    "depositAmount": 300000,
    "depositForfeited": false,
    "..."
  }
}
```

### Error Catalog

| #   | HTTP | Code           | Message mẫu                               | Nguyên nhân          | FE Action             |
| --- | ---- | -------------- | ----------------------------------------- | -------------------- | --------------------- |
| E1  | 400  | `INVALID_DATA` | `depositAmount must be > 0`               | Số tiền ≤ 0          | Highlight field       |
| E2  | 400  | `INVALID_DATA` | `depositTxnRef must be <= 255 characters` | Mã giao dịch quá dài | Truncate hoặc báo lỗi |

### Chính sách xử lý cọc theo vòng đời booking

| Trạng thái kết thúc         | Xử lý cọc                | Mô tả                                                               |
| --------------------------- | ------------------------ | ------------------------------------------------------------------- |
| `COMPLETED`                 | **Khấu trừ vào invoice** | Khách check-out bình thường, cọc trừ vào hóa đơn                    |
| `CANCELLED` (hủy trước giờ) | **Hoàn cọc**             | Khách chủ động hủy trước expectedArriveTime                         |
| `EXPIRED` (no-show)         | **Mất cọc** (forfeit)    | Khách không đến sau 30p → cọc bị tịch thu                           |
| `CANCELLED` (auto, Rule 14) | **Hoàn cọc**             | Khách check-in nhưng không order 20p → hoàn cọc để tránh tranh chấp |

### Các field deposit trong database (TableBooking entity)

| Field DB               | Type                   | DTO field          | Mô tả                         |
| ---------------------- | ---------------------- | ------------------ | ----------------------------- |
| `deposit_amount`       | `BigDecimal(18,0)`     | `depositAmount`    | Số tiền cọc                   |
| `deposit_paid`         | `tinyint(1)` default 0 | `depositPaid`      | Đã thanh toán cọc chưa        |
| `deposit_paid_at`      | `datetime`             | `depositPaidAt`    | Thời gian thanh toán cọc      |
| `is_deposit_forfeited` | `tinyint(1)` default 0 | `depositForfeited` | Cọc đã bị tịch thu (mất) chưa |
| `deposit_txn_ref`      | `varchar(255)`         | `depositTxnRef`    | Mã giao dịch thanh toán cọc   |

---

## A7. Gia hạn thời gian sử dụng bàn (Extend)

### Endpoint

```
POST /api/v1/table-booking/{id}/extend
```

### Mục đích

Cho phép **gia hạn thời gian sử dụng bàn** khi khách đang ngồi (`CHECKED_IN`) muốn ở thêm. Hệ thống kiểm tra xung đột với booking kế tiếp trên cùng bàn trước khi cho phép gia hạn.

### Usecase thực tế chi tiết

| #   | Actor | Tình huống thực tế                                        | Kỳ vọng                                               |
| --- | ----- | --------------------------------------------------------- | ----------------------------------------------------- |
| 1   | NV    | Khách muốn ngồi thêm 1 tiếng, bàn trống sau đó            | Gia hạn OK, tính phụ thu                              |
| 2   | NV    | Khách muốn gia hạn nhưng booking kế tiếp cùng bàn sau 20p | Bị từ chối (safe mode): conflict < 30p                |
| 3   | NV    | Khách muốn gia hạn 30p, không có booking kế tiếp          | Gia hạn OK, phụ thu = 50.000đ                         |
| 4   | NV    | Booking đang PENDING chứ chưa CHECKED_IN, NV ấn gia hạn   | Bị từ chối: "Chỉ gia hạn cho booking đang CHECKED_IN" |

### Request — `TableBookingExtendRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingExtendRequestDTO.java`

- **Path Variable:** `{id}` — ID booking (Integer, `@Positive`)

```json
{
  "expectedCheckOut": "2026-04-10T22:00:00",
  "force": false
}
```

| Field              | Type            | Bắt buộc  | Validation | Mô tả                                                 |
| ------------------ | --------------- | --------- | ---------- | ----------------------------------------------------- |
| `expectedCheckOut` | `LocalDateTime` | ✅ **Có** | `@NotNull` | Thời gian checkout mới (phải xa hơn giá trị hiện tại) |
| `force`            | `Boolean`       | Không     | —          | `true` = bỏ qua cảnh báo conflict. Mặc định `false`   |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "EXTEND_TABLE_BOOKING_SUCCESS",
  "data": {
    "bookingId": 123,
    "bookingStatus": "CHECKED_IN",
    "expectedCheckOut": "2026-04-10T22:00:00",
    "..."
  }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                         | Nguyên nhân                        | FE Action                                  |
| --- | ---- | ---------------------------------- | ------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| E1  | 400  | `INVALID_DATA`                     | `expectedCheckOut is required`                                      | Thiếu thời gian mới                | Highlight field                            |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] cannot extend, next booking arrives in X minutes` | Conflict booking kế tiếp (Rule 13) | Toast + hiển thị thông tin booking kế tiếp |
| E3  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[NOT_ALLOWED] can only extend CHECKED_IN booking`                  | Booking chưa CHECKED_IN            | Disable nút Extend                         |

---

## A8. Tạo Walk-in (Legacy - Backward Compatibility)

### Endpoint

```
POST /api/v1/table-booking/walk-in?force=false&lateBookingId=null
```

> ⚠️ Legacy: Endpoint này được giữ để tương thích ngược.
>
> - Luồng walk-in tạo mới chuẩn hiện tại: dùng `POST /api/v1/table-booking/create` với `isWalkIn=true`.
> - Endpoint `/walk-in` vẫn hữu ích cho các case cũ cần `lateBookingId`/`force`.

### Mục đích

Phục vụ tương thích ngược cho luồng **khách đến trực tiếp nhà hàng mà không đặt trước** (walk-in) và case **khách đến muộn > 30p** cần truyền `lateBookingId` để tạo lại booking.

### Chức năng

1. Tạo booking mới với trạng thái `CHECKED_IN` (check-in ngay, không qua PENDING/CONFIRMED).
2. Chuyển bàn sang `OCCUPIED`.
3. Kiểm tra bàn không đang bị BOOKED (Rule 9).
4. Cảnh báo nếu bàn có booking CONFIRMED trong tương lai gần (Rule 16).
5. Cảnh báo nếu bàn có booking PENDING_CONFIRMATION chưa cọc (Rule 18).
6. Kiểm tra xung đột `expectedCheckOut` với booking kế tiếp cùng ngày.
7. Sử dụng pessimistic lock chống race condition 2 walk-in cùng 1 bàn (Rule 17).

### 2 Mode hoạt động

| Mode                     | Điều kiện                     | Behavior                                                                                |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------- |
| **Walk-in thuần**        | `lateBookingId = null`        | Tạo booking mới hoàn toàn cho khách vãng lai                                            |
| **Late-arrival walk-in** | `lateBookingId = {bookingId}` | Expire booking cũ (nếu chưa) + tạo walk-in mới. Dùng cho khách đến muộn > 30p (Rule 12) |

### Usecase thực tế chi tiết

| #   | Actor | Tình huống thực tế                                                  | Rule    | Kỳ vọng                                                         |
| --- | ----- | ------------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| 1   | NV    | Khách 2 người vào nhà hàng, chọn bàn 5 trống                        | Cơ bản  | Walk-in OK, bàn OCCUPIED, checkout = NOW + 2h                   |
| 2   | NV    | Walk-in chọn bàn có booking CONFIRMED sau 1 tiếng                   | Rule 16 | Cho phép nhưng BẮT BUỘC cảnh báo NV: "Bàn có booking sau 60p"   |
| 3   | NV    | Walk-in chọn bàn đang BOOKED (Reserved)                             | Rule 9  | CHẶN: "Bàn đã giữ chỗ cho lịch hẹn"                             |
| 4   | NV    | Khách đặt trước đến muộn 45p, booking cũ EXPIRED, muốn vào bàn khác | Rule 12 | Gọi API với `lateBookingId=123`, tạo walk-in mới                |
| 5   | NV    | Walk-in chọn bàn có booking PENDING chưa cọc                        | Rule 18 | Cảnh báo: "Bàn có booking chưa xác nhận. NV gọi xác nhận khách" |
| 6   | 2 NV  | Cùng xếp 2 khách walk-in vào bàn 3                                  | Rule 17 | NV sau nhận lỗi TABLE_LOCK_BUSY                                 |

### Request — `TableBookingWalkInRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingWalkInRequestDTO.java`

**Query Params:**

| Param           | Type      | Bắt buộc | Mô tả                                                                            |
| --------------- | --------- | -------- | -------------------------------------------------------------------------------- |
| `force`         | `boolean` | Không    | `true` = bỏ qua cảnh báo walk-in. Default `false`                                |
| `lateBookingId` | `Integer` | Không    | ID booking cũ đã muộn (Rule 12). Nếu có → gọi flow `createWalkInFromLateArrival` |

**Body:**

```json
{
  "tableId": 5,
  "customerName": "Khach vang lai",
  "phoneNumber": "0901111222",
  "note": "2 nguoi",
  "expectedArriveTime": null,
  "expectedCheckOut": null,
  "depositAmount": 0,
  "depositPaid": null,
  "bookingStatus": null
}
```

| Field                | Type            | Bắt buộc | Validation               | Mô tả                                |
| -------------------- | --------------- | -------- | ------------------------ | ------------------------------------ |
| `tableId`            | `Integer`       | Có\*     | `@Positive`              | Bàn cần xếp walk-in                  |
| `customerName`       | `String`        | Không    | `@Size(max=255)`         | Tên khách (nếu biết)                 |
| `phoneNumber`        | `String`        | Không    | `@Pattern(PHONE_NUMBER)` | SĐT khách                            |
| `note`               | `String`        | Không    | `@Size(max=255)`         | Ghi chú                              |
| `expectedArriveTime` | `LocalDateTime` | Không    | —                        | BE auto-set = NOW() cho walk-in      |
| `expectedCheckOut`   | `LocalDateTime` | Không    | —                        | BE auto-set = NOW() + 2h             |
| Các field khác       | —               | Không    | —                        | Ít dùng cho walk-in (deposit fields) |

### Success Response — HTTP 200

**Walk-in thuần:**

```json
{
  "status": 200,
  "message": "CREATE_WALK_IN_BOOKING_SUCCESS",
  "data": {
    "bookingId": 456,
    "bookingStatus": "CHECKED_IN",
    "checkInAt": "2026-04-10T18:30:00",
    "expectedCheckOut": "2026-04-10T20:30:00",
    "..."
  }
}
```

**Late-arrival walk-in:**

```json
{
  "status": 200,
  "message": "CREATE_LATE_ARRIVAL_WALK_IN_SUCCESS",
  "data": { "..." }
}
```

### Error Catalog

| #   | HTTP | Code                               | Message mẫu                                                             | Nguyên nhân                     | FE Action                     |
| --- | ---- | ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ----------------------------- |
| E1  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] table is BOOKED for upcoming reservation`             | Bàn đang BOOKED (Rule 9)        | Toast + suggest bàn khác      |
| E2  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] table is OCCUPIED`                                    | Bàn đang có khách               | Toast + suggest bàn khác      |
| E3  | 400  | `BOOKING_STATE_TRANSITION_INVALID` | `[RULE_VIOLATION] booking CONFIRMED within 30 minutes, walk-in blocked` | Booking sắp đến < 30p (Rule 16) | Toast + hiển thị booking info |
| E4  | 409  | `TABLE_LOCK_BUSY`                  | `Table is being updated...`                                             | 2 walk-in cùng lúc (Rule 17)    | Toast: "Bàn vừa có người đặt" |

---

## A9. Tìm kiếm đơn đặt bàn (Search Booking)

### Endpoint

```
POST /api/v1/table-booking/search
```

### Mục đích

Cho phép **nhân viên tìm kiếm và lọc danh sách đơn đặt bàn** theo nhiều tiêu chí: theo bàn, theo trạng thái, theo tên/SĐT khách, theo thời gian. Hỗ trợ phân trang và sắp xếp.

### Usecase thực tế chi tiết

| #   | Actor   | Tình huống thực tế                       | Params sử dụng                                             |
| --- | ------- | ---------------------------------------- | ---------------------------------------------------------- |
| 1   | NV      | Xem tất cả booking hôm nay               | `active=true`                                              |
| 2   | NV      | Tìm booking theo SĐT khách               | `phoneNumber="0901234567"`                                 |
| 3   | NV      | Lọc booking theo bàn 8 để xem lịch sử    | `tableId=8`                                                |
| 4   | Quản lý | Thống kê no-show trong tháng             | `bookingStatus="EXPIRED"`, sort `desc`                     |
| 5   | NV      | Xem tất cả booking CONFIRMED để chuẩn bị | `bookingStatus="CONFIRMED"`, sort `expectedArriveTime asc` |
| 6   | NV      | Tìm booking của khách "Nguyen"           | `customerName="Nguyen"` (LIKE search)                      |

### Request — `TableBookingSearchRequestDTO`

> **Source:** `dto/request/table_booking/TableBookingSearchRequestDTO.java` kế thừa `PageFilterRequest`

```json
{
  "page": 1,
  "limit": 20,
  "sortField": "expectedArriveTime",
  "sortDir": "desc",
  "tableId": 8,
  "bookingStatus": "CONFIRMED",
  "customerName": "Nguyen",
  "phoneNumber": "0901234567",
  "checkInAt": null,
  "checkOutAt": null,
  "active": true
}
```

| Field           | Type            | Bắt buộc | Mô tả                                                     |
| --------------- | --------------- | -------- | --------------------------------------------------------- |
| `page`          | `Integer`       | Không    | Trang hiện tại (default 1)                                |
| `limit`         | `Integer`       | Không    | Số record/trang (default 20)                              |
| `sortField`     | `String`        | Không    | Tên field sắp xếp                                         |
| `sortDir`       | `String`        | Không    | `asc` hoặc `desc`                                         |
| `tableId`       | `Integer`       | Không    | Lọc theo bàn cụ thể                                       |
| `bookingStatus` | `String`        | Không    | Lọc theo trạng thái. Alias JSON: `check_in_at`            |
| `customerName`  | `String`        | Không    | Tìm kiếm LIKE theo tên khách                              |
| `phoneNumber`   | `String`        | Không    | Tìm theo SĐT                                              |
| `checkInAt`     | `LocalDateTime` | Không    | Lọc theo thời gian check-in (JSON alias: `check_in_at`)   |
| `checkOutAt`    | `LocalDateTime` | Không    | Lọc theo thời gian check-out (JSON alias: `check_out_at`) |
| `active`        | `Boolean`       | Không    | `true` = chỉ lấy booking active                           |

> **Tất cả field filter đều optional** — nếu không truyền thì không lọc theo tiêu chí đó.

### Success Response — HTTP 200

> **Lưu ý:** Response data nằm trong key `rows` (theo `PageResponse.java`), không phải `data`.

```json
{
  "status": 200,
  "message": "SEARCH_TABLE_BOOKING_SUCCESS",
  "data": {
    "rows": [
      {
        "bookingId": 123,
        "tableId": 8,
        "tableCode": "T08",
        "tableName": "Ban 08",
        "expectedArriveTime": "2026-04-10T18:00:00",
        "checkInAt": null,
        "expectedCheckOut": "2026-04-10T20:00:00",
        "checkOutAt": null,
        "bookingStatus": "CONFIRMED",
        "bookingStatusName": "Đã xác nhận",
        "customerName": "A",
        "phoneNumber": "0901234567",
        "depositAmount": 200000,
        "depositPaid": true,
        "depositPaidAt": "2026-04-10T10:30:00",
        "depositForfeited": false,
        "depositTxnRef": "TXN001",
        "note": "",
        "accountId": 1,
        "accountUsername": "staff1",
        "accountFullName": "Staff 1",
        "active": true,
        "createdAt": "2026-04-10T09:00:00"
      }
    ],
    "pageNo": 1,
    "pageSize": 20,
    "totalElements": 10,
    "totalPages": 1
  }
}
```

### Response DTO Field Reference — `TableBookingResponseDTO`

> **Source:** `dto/response/table_booking/TableBookingResponseDTO.java`

| Field                | Type            | Mô tả                                                                                                   |
| -------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `bookingId`          | `Integer`       | PK booking                                                                                              |
| `tableId`            | `Integer`       | FK bàn                                                                                                  |
| `tableCode`          | `String`        | Mã bàn (VD: "T08")                                                                                      |
| `tableName`          | `String`        | Tên bàn (VD: "Ban 08")                                                                                  |
| `expectedArriveTime` | `LocalDateTime` | Giờ hẹn đến                                                                                             |
| `checkInAt`          | `LocalDateTime` | Giờ check-in thực tế (null nếu chưa)                                                                    |
| `expectedCheckOut`   | `LocalDateTime` | Giờ dự kiến rời                                                                                         |
| `checkOutAt`         | `LocalDateTime` | Giờ check-out thực tế (null nếu chưa)                                                                   |
| `bookingStatus`      | `String`        | Code trạng thái: `PENDING_CONFIRMATION`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `EXPIRED` |
| `bookingStatusName`  | `String`        | Label hiển thị: "Chờ xác nhận", "Đã xác nhận", "Đã nhận bàn", "Hoàn thành", "Đã huỷ", "Đã hết hạn"      |
| `customerName`       | `String`        | Tên khách                                                                                               |
| `phoneNumber`        | `String`        | SĐT khách                                                                                               |
| `depositAmount`      | `BigDecimal`    | Số tiền cọc                                                                                             |
| `depositPaid`        | `Boolean`       | Đã thanh toán cọc                                                                                       |
| `depositPaidAt`      | `LocalDateTime` | Thời gian cọc                                                                                           |
| `depositForfeited`   | `Boolean`       | Cọc đã bị tịch thu                                                                                      |
| `depositTxnRef`      | `String`        | Mã giao dịch cọc                                                                                        |
| `note`               | `String`        | Ghi chú                                                                                                 |
| `accountId`          | `Integer`       | ID nhân viên tạo                                                                                        |
| `accountUsername`    | `String`        | Username nhân viên                                                                                      |
| `accountFullName`    | `String`        | Tên đầy đủ nhân viên                                                                                    |
| `active`             | `Boolean`       | Trạng thái hoạt động                                                                                    |
| `createdAt`          | `LocalDateTime` | Thời gian tạo                                                                                           |

---

## A10. Xem khung giờ trống (Available Slots)

### Endpoint

```
GET /api/v1/table-booking/tables/{tableId}/available-slots?date=2026-04-10
```

### Mục đích

Cho phép nhân viên hoặc khách hàng **xem các khung giờ còn trống** trên một bàn cụ thể trong ngày. Hỗ trợ việc chọn giờ đặt bàn hợp lý, tránh xung đột.

### Usecase thực tế chi tiết

| #   | Actor    | Tình huống thực tế                                          |
| --- | -------- | ----------------------------------------------------------- |
| 1   | NV       | Khách hỏi "Bàn 8 tối nay còn giờ nào trống?", NV tra cứu    |
| 2   | Hệ thống | Hiển thị cho khách chọn khung giờ khi đặt bàn online        |
| 3   | NV       | Kiểm tra bàn có trống trước khi gia hạn cho khách đang ngồi |
| 4   | FE       | Render timeline view trên calendar/gantt chart cho bàn      |

### Request

- **Path Variable:** `{tableId}` — ID bàn (Integer, `@Positive`)
- **Query Param:** `date` — Ngày cần xem (`LocalDate`, format `yyyy-MM-dd`)
- **Body:** Không cần.

### Success Response — HTTP 200

> **Source:** `TableBookingAvailableSlotResponseDTO.java`

```json
{
  "status": 200,
  "message": "GET_AVAILABLE_SLOTS_SUCCESS",
  "data": [
    {
      "slotStart": "2026-04-10T08:00:00",
      "slotEnd": "2026-04-10T11:00:00"
    },
    {
      "slotStart": "2026-04-10T13:00:00",
      "slotEnd": "2026-04-10T17:30:00"
    },
    {
      "slotStart": "2026-04-10T21:00:00",
      "slotEnd": "2026-04-10T23:59:59"
    }
  ]
}
```

| Field       | Type            | Mô tả                |
| ----------- | --------------- | -------------------- |
| `slotStart` | `LocalDateTime` | Đầu khung giờ trống  |
| `slotEnd`   | `LocalDateTime` | Cuối khung giờ trống |

---

## A11. Cập nhật đơn đặt bàn (Update Booking – Legacy)

### Endpoint

```
POST /api/v1/table-booking/update
```

### Mục đích

**Endpoint cũ** cho phép chỉnh sửa thông tin booking đã tồn tại (thay đổi bàn, thời gian, ghi chú, ...). Giữ backward compatibility cho FE cũ.

### Request — `TableBookingUpdateRequestDTO`

```json
{
  "bookingId": 123,
  "tableId": 8,
  "expectedArriveTime": "2026-04-10T19:00:00",
  "expectedCheckOut": "2026-04-10T21:00:00",
  "customerName": "Nguyen Van B",
  "phoneNumber": "0912345678",
  "depositAmount": 200000,
  "depositPaid": true,
  "depositPaidAt": "2026-04-10T14:30:00",
  "depositForfeited": false,
  "depositTxnRef": "MOMO-xxx",
  "bookingStatus": null,
  "note": "Đổi sang bàn VIP"
}
```

| Field                | Type            | Bắt buộc  | Validation                       |
| -------------------- | --------------- | --------- | -------------------------------- |
| `bookingId`          | `Integer`       | ✅ **Có** | `@NotNull`, `@Positive`          |
| `tableId`            | `Integer`       | ✅ **Có** | `@NotNull`, `@Positive`          |
| `expectedArriveTime` | `LocalDateTime` | ✅ **Có** | `@NotNull`. Alias: `bookingTime` |
| `expectedCheckOut`   | `LocalDateTime` | ✅ **Có** | `@NotNull`                       |
| Các field khác       | —               | Không     | Tương tự Create DTO              |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "UPDATE_TABLE_BOOKING_SUCCESS",
  "data": { "...TableBookingResponseDTO..." }
}
```

### Lưu ý quan trọng

> **FE mới nên migrate sang action endpoints riêng** (`/{id}/confirm`, `/{id}/check-in`, ...) thay vì dùng endpoint này cho thay đổi trạng thái. Endpoint `/update` chỉ nên dùng cho thay đổi **thông tin phi trạng thái** (đổi bàn, đổi giờ, sửa tên/SĐT).

---

## A12. Cập nhật trạng thái (Update Status – Legacy)

### Endpoint

```
POST /api/v1/table-booking/update-status
```

### Mục đích

**Endpoint tương thích ngược** để đổi trạng thái booking. Nội bộ BE sẽ **route qua State Machine** tương ứng.

### Request — `TableBookingStatusUpdateRequestDTO`

```json
{
  "bookingId": 123,
  "bookingStatus": "CONFIRMED",
  "checkInAt": null,
  "checkOutAt": null
}
```

| Field           | Type            | Bắt buộc  | Validation                |
| --------------- | --------------- | --------- | ------------------------- |
| `bookingId`     | `Integer`       | ✅ **Có** | `@NotNull`, `@Positive`   |
| `bookingStatus` | `String`        | Không     | `@Pattern(BUSINESS_CODE)` |
| `checkInAt`     | `LocalDateTime` | Không     | —                         |
| `checkOutAt`    | `LocalDateTime` | Không     | —                         |

### Success Response — HTTP 200

```json
{
  "status": 200,
  "message": "UPDATE_TABLE_BOOKING_STATUS_SUCCESS",
  "data": true
}
```

> ⚠️ **Lưu ý:** Response trả `Boolean` (không phải DTO). FE cần refresh data sau khi gọi thành công.

---

# PHẦN B – CÁC BACKGROUND JOB (CHỨC NĂNG NỀN TỰ ĐỘNG)

> **Quy ước chung cho tất cả Job:**
>
> - Chạy bằng Spring `@Scheduled` + `ShedLock` (chỉ 1 instance chạy trên multi-instance deployment).
> - **Idempotent:** chạy lại nhiều lần cho cùng dữ liệu không gây side-effect.
> - **De-duplicate notification:** mỗi booking/event chỉ gửi thông báo 1 lần, tránh spam.
> - Mọi thay đổi trạng thái đều đi qua State Machine.
> - Thông báo realtime gửi qua WebSocket sau khi transaction commit.
> - **Cron mặc định:** `0 * * * * *` (mỗi phút). Có thể thay đổi qua config `booking.scheduler.cron`.
> - **Có thể tắt:** `booking.scheduler.enabled=false` (dùng trong test).

---

## B1. Job A – Tự động chuyển bàn sang BOOKED trước 30 phút

### Mục đích

**Tự động "giữ bàn" (reserve)** cho các booking đã xác nhận khi sắp đến giờ hẹn. Khi bàn chuyển `BOOKED`, nhân viên biết cần dọn dẹp và cắm biển "Reserved", không để khách walk-in sử dụng bàn đó.

### Query điều kiện

```sql
SELECT * FROM table_booking WHERE
  booking_status = 'CONFIRMED'
  AND expected_arrive_time > NOW()
  AND expected_arrive_time <= NOW() + 30 minutes
  AND is_active = 1
  AND check_in_at IS NULL
```

### Logic xử lý

| Trạng thái bàn hiện tại | Hành động                                    | WebSocket Event                            |
| ----------------------- | -------------------------------------------- | ------------------------------------------ |
| `AVAILABLE`             | → Chuyển `BOOKED`, push thông báo NV dọn bàn | `TABLE_RESERVED` via `/topic/table-status` |
| `OCCUPIED`              | → **KHÔNG chuyển**, để Job C cảnh báo        | Không push (Job C sẽ push)                 |
| `BOOKED`                | → **SKIP** (đã xử lý ở cycle trước)          | Không push                                 |

### WebSocket Event

```json
{
  "event": "TABLE_RESERVED",
  "bookingId": 123,
  "tableId": 8,
  "tableCode": "T08",
  "tableStatus": "BOOKED",
  "expectedArriveTime": "2026-04-10T19:00:00",
  "at": "2026-04-10T18:31:00",
  "message": "Bàn T08 đã được đặt trước (Reserved). Dọn bàn và cắm biển."
}
```

### Rule: 3, 8

---

## B2. Job B – Tự động hết hạn đơn no-show (EXPIRED)

### Mục đích

**Tự động hủy các booking mà khách không đến** sau 30 phút kể từ giờ hẹn. Giải phóng bàn và tịch thu tiền cọc (nếu có).

### Query điều kiện

```sql
SELECT * FROM table_booking WHERE
  booking_status = 'CONFIRMED'
  AND expected_arrive_time + 30 minutes < NOW()
  AND check_in_at IS NULL
  AND is_active = 1
```

### Logic xử lý

1. State Machine: `CONFIRMED → EXPIRED`
2. Forfeit cọc: `is_deposit_forfeited = true` (nếu `deposit_paid = true`)
3. Bàn: nếu `BOOKED` → chuyển `AVAILABLE`

### WebSocket Events

```json
// Topic: /topic/booking-updates
{
  "event": "BOOKING_EXPIRED_NO_SHOW",
  "bookingId": 123,
  "tableId": 8,
  "tableCode": "T08",
  "tableStatus": "AVAILABLE",
  "bookingStatus": "EXPIRED",
  "at": "2026-04-10T19:35:00",
  "message": "Booking 123 đã EXPIRED do no-show. Bàn T08 đã được giải phóng."
}
```

### Liên kết với API

> Sau khi booking EXPIRED do no-show, nếu khách vẫn đến muộn và muốn vào: Nhân viên sử dụng **API Walk-in (A8)** với `lateBookingId` để tạo booking mới. Khách mất cọc cũ.

### Rule: 7

---

## B3. Job C – Cảnh báo đỏ kẹt bàn (Table Occupied Conflict)

### Mục đích

**Phát cảnh báo đỏ (red alert)** khi bàn đang bị chiếm dụng (`OCCUPIED`) nhưng sắp có booking `CONFIRMED` đến trong 30 phút.

### Query: Giống Job A, nhưng lọc thêm `table_status = 'OCCUPIED'`

### Logic: KHÔNG thay đổi trạng thái. Chỉ push cảnh báo (de-dup).

### WebSocket Event

```json
{
  "event": "TABLE_OCCUPIED_CONFLICT",
  "bookingId": 123,
  "tableId": 8,
  "tableCode": "T08",
  "tableStatus": "OCCUPIED",
  "expectedArriveTime": "2026-04-10T19:00:00",
  "minutesUntilArrival": 20,
  "at": "2026-04-10T18:40:00",
  "message": "CẢNH BÁO ĐỎ: Bàn T08 đang có khách nhưng 20 phút nữa có booking #123!"
}
```

### Hành động kỳ vọng từ nhân viên

1. Đề nghị khách đang ngồi rời sớm.
2. **HOẶC** sắp xếp bàn thay thế cho khách sắp đến.
3. **HOẶC** liên hệ khách sắp đến thông báo tình huống.

### Rule: 8, 16

---

## B4. Job D – Cảnh báo & tự động hủy khi không order món

### Mục đích

Xử lý tình huống **khách check-in nhưng không gọi món**.

### Logic 2 pha

| Thời gian từ check-in | Hành động                                   | Event                                               |
| --------------------- | ------------------------------------------- | --------------------------------------------------- |
| 10p ≤ elapsed < 20p   | Gửi cảnh báo lần 1 (de-dup)                 | `NO_ORDER_WARNING` via `/topic/table-alerts`        |
| elapsed ≥ 20p         | Auto `CANCELLED`, bàn `AVAILABLE`, hoàn cọc | `NO_ORDER_AUTO_CANCELLED` via `/topic/table-alerts` |

### WebSocket Events

**Cảnh báo 10p:**

```json
{
  "event": "NO_ORDER_WARNING",
  "bookingId": 456,
  "tableId": 3,
  "tableCode": "T03",
  "checkInAt": "2026-04-10T18:00:00",
  "at": "2026-04-10T18:10:00",
  "message": "Bàn T03 đã check-in 10p nhưng chưa gọi món. Tự động hủy sau 10p nữa."
}
```

**Auto cancel 20p:**

```json
{
  "event": "NO_ORDER_AUTO_CANCELLED",
  "bookingId": 456,
  "tableId": 3,
  "tableCode": "T03",
  "tableStatus": "AVAILABLE",
  "bookingStatus": "CANCELLED",
  "at": "2026-04-10T18:20:00",
  "message": "Bàn T03 đã giải phóng. Khách không order sau 20p. Cọc đã được hoàn."
}
```

### Rule: 14

---

## B5. Job E – Nhắc nhở sắp hết giờ sử dụng bàn

### Mục đích

**Nhắc nhở nhân viên** khi booking đang sử dụng sắp hết thời gian dự kiến, còn 15 phút.

### Query: booking `CHECKED_IN`, `expectedCheckOut` trong `(NOW, NOW + 15p]`

### WebSocket Event

```json
{
  "event": "CHECKOUT_REMINDER",
  "bookingId": 789,
  "tableId": 8,
  "tableCode": "T08",
  "expectedCheckOut": "2026-04-10T20:00:00",
  "minutesRemaining": 15,
  "at": "2026-04-10T19:45:00",
  "message": "Bàn T08 sắp hết giờ sau 15 phút. Chuẩn bị thanh toán."
}
```

### Hành động kỳ vọng

1. Nhắc khách thanh toán.
2. **HOẶC** nếu khách muốn ở thêm → sử dụng **API Gia hạn (A7)** để extend.

### Rule: 5

---

# PHẦN C – PHỤ LỤC

---

## C1. Quy ước chung & Response Contract

### Success Response Wrapper — `ApiResponse<T>`

> **Source:** `dto/base/ApiResponse.java`

```json
{
  "status": 200,
  "message": "SOME_SUCCESS_CODE",
  "data": { "..." }
}
```

| Field     | Type     | Mô tả                                                                              |
| --------- | -------- | ---------------------------------------------------------------------------------- |
| `status`  | `int`    | HTTP status code (luôn 200 cho success)                                            |
| `message` | `String` | Success code: `CREATE_TABLE_BOOKING_SUCCESS`, `CONFIRM_TABLE_BOOKING_SUCCESS`, ... |
| `data`    | `T`      | Payload. `null` nếu không có data (`@JsonInclude(NON_NULL)`)                       |

### Bảng Success Code theo API

| API                        | Success Code                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `POST /search`             | `SEARCH_TABLE_BOOKING_SUCCESS`                                              |
| `POST /create`             | `CREATE_TABLE_BOOKING_SUCCESS`                                              |
| `POST /update`             | `UPDATE_TABLE_BOOKING_SUCCESS`                                              |
| `POST /update-status`      | `UPDATE_TABLE_BOOKING_STATUS_SUCCESS`                                       |
| `POST /{id}/confirm`       | `CONFIRM_TABLE_BOOKING_SUCCESS`                                             |
| `POST /{id}/check-in`      | `CHECK_IN_TABLE_BOOKING_SUCCESS`                                            |
| `POST /{id}/check-out`     | `CHECK_OUT_TABLE_BOOKING_SUCCESS`                                           |
| `POST /{id}/cancel`        | `CANCEL_TABLE_BOOKING_SUCCESS`                                              |
| `POST /{id}/deposit`       | `DEPOSIT_TABLE_BOOKING_SUCCESS`                                             |
| `POST /{id}/extend`        | `EXTEND_TABLE_BOOKING_SUCCESS`                                              |
| `POST /walk-in` (legacy)   | `CREATE_WALK_IN_BOOKING_SUCCESS` hoặc `CREATE_LATE_ARRIVAL_WALK_IN_SUCCESS` |
| `GET /.../available-slots` | `GET_AVAILABLE_SLOTS_SUCCESS`                                               |

### Error Response Wrapper — `ErrorResponse`

> **Source:** `dto/base/ErrorResponse.java`

```json
{
  "timestamp": "2026-04-10T15:00:00+07:00",
  "status": 400,
  "error": "Bad Request",
  "code": "INVALID_DATA",
  "message": "Mô tả lỗi cụ thể",
  "details": null,
  "path": "/api/v1/table-booking/..."
}
```

| Field       | Type             | Mô tả                                                                                      |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `timestamp` | `OffsetDateTime` | Thời điểm lỗi (ISO-8601 with timezone)                                                     |
| `status`    | `int`            | HTTP status code                                                                           |
| `error`     | `String`         | HTTP status phrase: "Bad Request", "Conflict", ...                                         |
| `code`      | `String`         | Machine-readable error code                                                                |
| `message`   | `String`         | Human-readable mô tả lỗi. Có prefix: `[RULE_VIOLATION]`, `[NOT_ALLOWED]`, `[GUARD_FAILED]` |
| `details`   | `Object`         | Chi tiết bổ sung (thường null, trả `ex.getMessage()` cho 500)                              |
| `path`      | `String`         | Request URI                                                                                |

### Bảng mã lỗi tổng quát — Exception Hierarchy

> **Source:** `exceptions/GlobalExceptionHandler.java`

| Exception Class                          | HTTP    | Code                               | Khi nào xảy ra                                                 | FE Action                                 |
| ---------------------------------------- | ------- | ---------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `BookingStateTransitionException`        | **400** | `BOOKING_STATE_TRANSITION_INVALID` | Chuyển trạng thái không hợp lệ, rule vi phạm, guard fail       | Parse `message` prefix → hiển thị phù hợp |
| `BookingLockException`                   | **409** | `TABLE_LOCK_BUSY`                  | Bàn đang bị lock bởi request khác (race condition)             | Toast + auto retry sau 1-2s               |
| `InvalidDataException`                   | **400** | `INVALID_DATA`                     | Dữ liệu request không hợp lệ (null, range, format)             | Highlight field lỗi                       |
| `ConstraintViolationException` (Jakarta) | **400** | —                                  | Validation annotation thất bại (@NotNull, @Positive, @Size...) | Parse validation messages                 |
| `Exception` (catch-all)                  | **500** | `INTERNAL_SERVER_ERROR`            | Lỗi không dự kiến                                              | Toast lỗi chung, report bug               |

### Message Prefix Convention

| Prefix             | Ý nghĩa                                                     | Ví dụ                                                         |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| `[RULE_VIOLATION]` | Rule nghiệp vụ vi phạm (conflict, quá hạn, chưa cọc...)     | `[RULE_VIOLATION] must book at least 2 hours in advance`      |
| `[NOT_ALLOWED]`    | Transition không hợp lệ trong state machine                 | `[NOT_ALLOWED] transition PENDING → COMPLETED is not allowed` |
| `[GUARD_FAILED]`   | Thiếu dữ liệu bắt buộc (booking null, table null, inactive) | `[GUARD_FAILED] booking is not active`                        |

### Cơ chế Lock

- **Key lock:** `lock:table:{tableId}` (Redis Distributed Lock via Redisson)
- **Wait time:** Configurable (mặc định ~5 giây)
- **Lease time:** Configurable (auto-release)
- **Mọi thao tác mutate** đều lock theo `tableId`
- **Đổi bàn:** Lock cả bàn cũ + bàn mới, **theo thứ tự `id` tăng dần** (tránh deadlock)

### Transaction Boundary

```
1. Acquire lock (Redis Distributed Lock)
2. Load booking/table mới nhất từ DB
3. Validate (validator chain) + Transition (state machine)
4. Save booking/table
5. Publish domain event (trong transaction — ApplicationEventPublisher)
6. Commit transaction
7. Gửi WebSocket notify (sau commit, qua @TransactionalEventListener AFTER_COMMIT)
8. Release lock
```

> ⚠️ **Quan trọng:** Không push notify trước khi commit. Tránh FE nhận event "thành công" nhưng DB rollback.

---

## C2. Trạng thái hệ thống (Status)

### Booking Status — `BookingStatusEnum`

> **Source:** `enums/BookingStatusEnum.java`

| Enum         | Code (DB)              | Label (hiển thị) | Ý nghĩa                                               | Terminal? |
| ------------ | ---------------------- | ---------------- | ----------------------------------------------------- | --------- |
| `PENDING`    | `PENDING_CONFIRMATION` | Chờ xác nhận     | Đơn mới tạo, chưa liên hệ/chưa cọc                    | Không     |
| `CONFIRMED`  | `CONFIRMED`            | Đã xác nhận      | Đã liên hệ + cọc. Bàn vẫn AVAILABLE cho đến 30p trước | Không     |
| `CHECKED_IN` | `CHECKED_IN`           | Đã nhận bàn      | Khách đã đến, bàn OCCUPIED, POS cho phép order        | Không     |
| `COMPLETED`  | `COMPLETED`            | Hoàn thành       | Khách đã thanh toán và rời. Bàn AVAILABLE             | ✅ Có     |
| `CANCELLED`  | `CANCELLED`            | Đã huỷ           | Hủy chủ động/auto. Bàn AVAILABLE                      | ✅ Có     |
| `EXPIRED`    | `EXPIRED`              | Đã hết hạn       | Khách không đến sau 30p. Mất cọc. Bàn AVAILABLE       | ✅ Có     |

### Table Status — `TableStatusEnum`

> **Source:** `enums/TableStatusEnum.java`

| Enum        | Code (DB)   | Label        | Ý nghĩa                                   | Cho phép walk-in?                   |
| ----------- | ----------- | ------------ | ----------------------------------------- | ----------------------------------- |
| `AVAILABLE` | `AVAILABLE` | Bàn trống    | Bàn có thể đặt hoặc xếp walk-in           | ✅ Có (kèm cảnh báo nếu có booking) |
| `BOOKED`    | `BOOKED`    | Đã đặt       | Cắm biển "Reserved". Còn ≤30p đến giờ hẹn | ❌ Không (Rule 9)                   |
| `OCCUPIED`  | `OCCUPIED`  | Đang sử dụng | Có khách ngồi, POS đang phục vụ           | ❌ Không                            |

---

## C3. State Machine – Sơ đồ chuyển trạng thái

### Transition hợp lệ (ALLOWED_TRANSITIONS)

```
PENDING_CONFIRMATION  →  CONFIRMED              (confirm / auto-confirm khi cọc)
PENDING_CONFIRMATION  →  CANCELLED               (cancel trước giờ)
CONFIRMED             →  CHECKED_IN              (check-in ±30p)
CONFIRMED             →  CANCELLED               (cancel trước giờ)
CONFIRMED             →  EXPIRED                 (no-show 30p, tự động — Job B)
CHECKED_IN            →  COMPLETED               (check-out)
CHECKED_IN            →  CANCELLED               (no order 20p, tự động — Job D)
```

> **Terminal states:** `COMPLETED`, `CANCELLED`, `EXPIRED` — không thể chuyển tiếp.

### Sơ đồ trực quan

```
                    ┌──────────────────────────────────┐
                    │                                  │
                    ▼                                  │
            ┌───────────────┐                          │
    ┌──────▶│   PENDING     │──────────┐               │
    │       │ CONFIRMATION  │          │               │
    │       └───────┬───────┘          │               │
    │               │                  │               │
    │          Confirm              Cancel              │
    │          (Rule 2)            (Rule 6)             │
    │               │                  │               │
    │               ▼                  │               │
    │       ┌───────────────┐          │               │
    │       │   CONFIRMED   │──────────┼───────┐       │
    │       └───────┬───────┘          │       │       │
    │               │                  │    Expire     │
    │          Check-in              Cancel  (Rule 7)  │
    │          (Rule 4/10/11)        (Rule 6) │       │
    │               │                  │       │       │
    │               ▼                  │       │       │
    │       ┌───────────────┐          │       │       │
    │       │  CHECKED_IN   │────────┐ │       │       │
    │       └───────┬───────┘ No-order │       │       │
    │               │         (Rule14) │       │       │
    │          Check-out               │       │       │
    │          (Rule 5)                │       │       │
    │               │                  │       │       │
    │               ▼                  ▼       ▼       ▼
    │       ┌───────────┐      ┌──────────┐ ┌─────────┐
    │       │ COMPLETED │      │CANCELLED │ │ EXPIRED │
    │       └───────────┘      └──────────┘ └─────────┘
    │                                             │
    │            Walk-in mới (Rule 12)            │
    └─────────────────────────────────────────────┘
```

---

## C4. Realtime Notification (WebSocket)

### Kết nối

| Thông số       | Giá trị                                          |
| -------------- | ------------------------------------------------ |
| STOMP Endpoint | `/ws`                                            |
| Protocol       | SockJS + STOMP                                   |
| Client lib     | `@stomp/stompjs` + `sockjs-client`               |
| CORS           | `http://localhost:4200` (cấu hình thêm nếu khác) |

### Code kết nối FE

```typescript
const socket = new SockJS("http://<host>/ws");
const client = Stomp.over(socket);
client.connect({}, () => {
  client.subscribe("/topic/booking-updates", onBookingEvent);
  client.subscribe("/topic/table-status", onTableStatusEvent);
  client.subscribe("/topic/table-alerts", onTableAlertEvent);
  client.subscribe("/topic/deposit-events", onDepositEvent);
});
```

### 4 Topics

| Topic                    | Mô tả                                       | Nguồn                          |
| ------------------------ | ------------------------------------------- | ------------------------------ |
| `/topic/booking-updates` | Tạo/cập nhật/đổi trạng thái booking         | After-commit event (service)   |
| `/topic/table-status`    | Thay đổi trạng thái bàn                     | After-commit event + scheduler |
| `/topic/table-alerts`    | Cảnh báo: kẹt bàn, sắp hết giờ, không order | Scheduler                      |
| `/topic/deposit-events`  | Sự kiện thanh toán / tịch thu cọc           | After-commit event             |

### Payload chuẩn (envelope)

```json
{
  "event": "BOOKING_CHECKED_IN",
  "mutationType": "CHECK_IN",
  "bookingId": 101,
  "tableId": 7,
  "tableCode": "T07",
  "tableStatus": "OCCUPIED",
  "bookingStatus": "CHECKED_IN",
  "expectedArriveTime": "2026-04-10T18:00:00",
  "expectedCheckOut": "2026-04-10T20:00:00",
  "at": "2026-04-10T14:53:17.240",
  "message": "Booking mutation committed: BOOKING_CHECKED_IN",
  "source": "BOOKING_MUTATION_AFTER_COMMIT",
  "topic": "/topic/booking-updates",
  "dedupKey": "booking:mutation:booking:CHECK_IN:101:7:...",
  "eventId": "9f3b8f95-c57e-4f53-8a11-6f8ccf2d9d16"
}
```

### Tổng hợp Event Name

**Từ Service (after commit):**

| Event                                  | Trigger                             | Topic           |
| -------------------------------------- | ----------------------------------- | --------------- |
| `BOOKING_CREATED`                      | Tạo booking mới                     | booking-updates |
| `BOOKING_UPDATED`                      | Cập nhật thông tin booking          | booking-updates |
| `BOOKING_STATUS_UPDATED`               | Đổi trạng thái legacy               | booking-updates |
| `BOOKING_CONFIRMED`                    | Xác nhận booking                    | booking-updates |
| `BOOKING_CHECKED_IN`                   | Khách check-in                      | booking-updates |
| `BOOKING_CHECKED_OUT`                  | Khách check-out                     | booking-updates |
| `BOOKING_CANCELLED`                    | Hủy booking                         | booking-updates |
| `BOOKING_EXPIRED`                      | Booking hết hạn                     | booking-updates |
| `BOOKING_EXTENDED`                     | Gia hạn thời gian                   | booking-updates |
| `BOOKING_WALK_IN_CREATED`              | Tạo walk-in mới                     | booking-updates |
| `BOOKING_LATE_ARRIVAL_WALK_IN_CREATED` | Walk-in từ khách đến muộn (Rule 12) | booking-updates |
| `BOOKING_AUTO_CANCELLED_NO_ORDER`      | Auto hủy do không order (Rule 14)   | booking-updates |
| `BOOKING_DEPOSIT_UPDATED`              | Cập nhật thông tin cọc              | booking-updates |
| `TABLE_STATUS_SYNC`                    | Đồng bộ trạng thái bàn              | table-status    |
| `BOOKING_DEPOSIT_PAID`                 | Đã thanh toán cọc                   | deposit-events  |

**Từ Scheduler:**

| Event                     | Trigger                                  | Topic           |
| ------------------------- | ---------------------------------------- | --------------- |
| `TABLE_RESERVED`          | Job A: bàn AVAILABLE → BOOKED 30p trước  | table-status    |
| `BOOKING_EXPIRED_NO_SHOW` | Job B: no-show 30p                       | booking-updates |
| `TABLE_OCCUPIED_CONFLICT` | Job C: bàn OCCUPIED + booking sắp đến    | table-alerts    |
| `NO_ORDER_WARNING`        | Job D: cảnh báo 10p chưa order           | table-alerts    |
| `NO_ORDER_AUTO_CANCELLED` | Job D: auto hủy 20p không order          | table-alerts    |
| `CHECKOUT_REMINDER`       | Job E: nhắc thanh toán 15p trước hết giờ | table-alerts    |

### De-duplication phía FE

- Dùng `dedupKey` làm key idempotent trong cache (TTL 2-5 phút)
- Nếu `dedupKey` đã xử lý → bỏ qua event trùng
- `eventId` là unique mỗi lần push (dùng cho trace/log)

---

## C5. Ma trận tổng hợp Rule 1–18

| Rule | Tên                          | Tóm tắt                                                                                | Trigger             | API/Job                                 |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------- | ------------------- | --------------------------------------- |
| 1    | Tạo booking                  | Đặt trước ≥2h, giờ đến trong 06:00-20:00 (giờ quán), checkout mặc định +2h, chống race | Create booking      | `POST /create`                          |
| 2    | Confirm                      | Xác nhận, yêu cầu cọc, re-check xung đột                                               | NV ấn confirm       | `POST /{id}/confirm`                    |
| 3    | Reserve bàn 30p trước        | Bàn AVAILABLE → BOOKED, push thông báo NV dọn bàn                                      | Scheduler           | Job A                                   |
| 4    | Check-in ±30p                | CHECKED_IN, bàn OCCUPIED, giữ nguyên checkout                                          | NV check-in         | `POST /{id}/check-in`                   |
| 5    | Check-out                    | COMPLETED, bàn AVAILABLE, cọc khấu trừ invoice                                         | NV check-out        | `POST /{id}/check-out`                  |
| 6    | Hủy booking                  | CANCELLED trước giờ hẹn, hoàn cọc                                                      | Khách/NV hủy        | `POST /{id}/cancel`                     |
| 7    | No-show                      | EXPIRED sau 30p không đến, forfeit cọc                                                 | Scheduler           | Job B                                   |
| 8    | Kẹt bàn                      | Bàn OCCUPIED + booking sắp đến → cảnh báo đỏ                                           | Scheduler           | Job C                                   |
| 9    | Chặn walk-in bàn BOOKED      | Báo lỗi "Bàn đã giữ chỗ cho lịch hẹn"                                                  | NV xếp walk-in      | `POST /create (isWalkIn=true)`          |
| 10   | Check-in sớm >30p            | Cho phép, tính lại checkout, check conflict                                            | NV check-in sớm     | `POST /{id}/check-in`                   |
| 11   | Check-in sớm bàn BOOKED      | Verify ownership, giữ nguyên checkout gốc                                              | NV check-in         | `POST /{id}/check-in`                   |
| 12   | Đến muộn >30p                | Booking cũ EXPIRED → tạo walk-in mới                                                   | NV tạo walk-in      | `POST /walk-in?lateBookingId=` (legacy) |
| 13   | Gia hạn                      | Kiểm tra xung đột booking kế tiếp, tính phụ thu                                        | NV gia hạn          | `POST /{id}/extend`                     |
| 14   | Không order 20p              | 10p: cảnh báo. 20p: auto CANCELLED, hoàn cọc                                           | Scheduler           | Job D                                   |
| 15   | Race condition đặt bàn       | Lock tableId, giao dịch sau fail                                                       | 2 NV đặt cùng lúc   | Lock strategy                           |
| 16   | Walk-in gần giờ booking      | Cảnh báo đỏ NV. Guard khi xếp walk-in                                                  | Scheduler + Service | Job C + `POST /create (isWalkIn=true)`  |
| 17   | Race condition walk-in       | Pessimistic lock, giao dịch sau fail                                                   | 2 NV xếp cùng bàn   | Lock strategy                           |
| 18   | Walk-in gặp PENDING chưa cọc | Không auto BOOKED, cảnh báo NV xác nhận                                                | NV xếp walk-in      | `POST /create (isWalkIn=true)`          |

### Ma trận hiển thị button UI theo trạng thái

| Booking Status         | Buttons khả dụng                                                 |
| ---------------------- | ---------------------------------------------------------------- |
| `PENDING_CONFIRMATION` | **Confirm** · Update · Cancel · Deposit                          |
| `CONFIRMED`            | **Check-in** · Update · Cancel · Deposit                         |
| `CHECKED_IN`           | **Check-out** · **Extend**                                       |
| `COMPLETED`            | Chỉ xem chi tiết                                                 |
| `CANCELLED`            | Chỉ xem chi tiết                                                 |
| `EXPIRED`              | Chỉ xem chi tiết · Có thể tạo walk-in mới (button "Tạo Walk-in") |

---

# PHẦN D – ĐỀ XUẤT THIẾT KẾ MÀN HÌNH FE

---

## D1. Tổng quan kiến trúc màn hình

### Sitemap Module Booking

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN LAYOUT                               │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐ │
│  │  SIDEBAR      │  │  CONTENT AREA                            │ │
│  │               │  │                                          │ │
│  │  📋 Booking   │  │  ┌────────────────────────────────────┐  │ │
│  │     List      │  │  │  TABLE LAYOUT VIEW                 │  │ │
│  │               │  │  │  (Sơ đồ bàn nhà hàng)             │  │ │
│  │  🍽️ Sơ đồ     │  │  │                                    │  │ │
│  │     bàn       │  │  │  Mỗi bàn = 1 card với:            │  │ │
│  │               │  │  │  - Mã bàn + Tên                   │  │ │
│  │  📊 Báo cáo   │  │  │  - Status badge (màu sắc)         │  │ │
│  │               │  │  │  - Booking info (nếu có)           │  │ │
│  │               │  │  │  - Quick actions                   │  │ │
│  │               │  │  └────────────────────────────────────┘  │ │
│  │               │  │                                          │ │
│  │               │  │  ┌────────────────────────────────────┐  │ │
│  │               │  │  │  BOOKING LIST VIEW (AG-Grid)       │  │ │
│  │               │  │  │  (Danh sách đặt bàn + filter)     │  │ │
│  │               │  │  └────────────────────────────────────┘  │ │
│  └──────────────┘  └──────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  NOTIFICATION CENTER (slide-in panel hoặc toast stack)     │   │
│  │  - Realtime alerts từ WebSocket                           │   │
│  │  - Cảnh báo đỏ kẹt bàn (Job C)                          │   │
│  │  - Nhắc checkout (Job E)                                  │   │
│  │  - Cảnh báo không order (Job D)                          │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## D2. Màn hình Table Layout (Sơ đồ bàn)

### Mô tả

Hiển thị sơ đồ nhà hàng dạng grid/floor plan. Mỗi bàn là 1 **card** với màu sắc phản ánh trạng thái realtime.

### Màu sắc theo trạng thái bàn

| Table Status | Màu nền card           | Màu border        | Icon/Badge      |
| ------------ | ---------------------- | ----------------- | --------------- |
| `AVAILABLE`  | Xanh lá nhạt (#e8f5e9) | Xanh lá (#4caf50) | ✅ Trống        |
| `BOOKED`     | Vàng nhạt (#fff8e1)    | Vàng (#ff9800)    | 🔖 Reserved     |
| `OCCUPIED`   | Đỏ nhạt (#ffebee)      | Đỏ (#f44336)      | 🍽️ Đang phục vụ |

### Thông tin hiển thị trên mỗi card bàn

```
┌──────────────────────────┐
│  T08 · Bàn 08            │  ← tableCode + tableName
│  ────────────────────    │
│  🔖 BOOKED (Reserved)    │  ← status badge
│                          │
│  📅 19:00 – 21:00        │  ← expectedArriveTime – expectedCheckOut
│  👤 Nguyen Van A         │  ← customerName
│  📱 0987654321           │  ← phoneNumber
│  ⏱️ Còn 25 phút          │  ← countdown đến expectedArriveTime
│                          │
│  [Check-in] [Chi tiết]   │  ← quick actions theo status
└──────────────────────────┘
```

### Interaction

- **Click card bàn AVAILABLE:** Mở dialog chọn action: "Tạo booking" hoặc "Walk-in"
- **Click card bàn BOOKED:** Mở dialog booking detail + nút Check-in
- **Click card bàn OCCUPIED:** Mở dialog booking detail + nút Check-out / Extend
- **Realtime update:** Khi nhận WebSocket event `TABLE_STATUS_SYNC` → animate card thay đổi màu

### Guard hiển thị (Rule 2, 16)

Khi bàn `AVAILABLE` nhưng có booking `CONFIRMED` trong tương lai:

```
┌──────────────────────────┐
│  T08 · Bàn 08            │
│  ────────────────────    │
│  ✅ AVAILABLE             │
│                          │
│  ⚠️ Booking CONFIRMED    │  ← warning badge
│  trong 45 phút nữa      │
│  (19:00 – 21:00)         │
│                          │
│  [Walk-in] [Đặt bàn]    │
└──────────────────────────┘
```

---

## D3. Màn hình Booking List (Danh sách đặt bàn)

### Mô tả

AG-Grid / table view hiển thị danh sách đơn đặt bàn, hỗ trợ filter + sort + pagination.

### Toolbar Filter

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 Tìm kiếm: [_______________]  Bàn: [Tất cả ▼]              │
│  Trạng thái: [Tất cả ▼]  Ngày: [📅 Hôm nay]  [🔄 Làm mới]    │
└──────────────────────────────────────────────────────────────────┘
```

### Grid Columns

| Column     | Field source                    | Width | Sortable | Mô tả                     |
| ---------- | ------------------------------- | ----- | -------- | ------------------------- |
| ID         | `bookingId`                     | 60px  | ✅       | ID đơn                    |
| Bàn        | `tableCode` + `tableName`       | 120px | ✅       | VD: "T08 - Bàn 08"        |
| Khách      | `customerName`                  | 150px | ✅       | Tên khách                 |
| SĐT        | `phoneNumber`                   | 120px | —        | SĐT                       |
| Giờ đến    | `expectedArriveTime`            | 140px | ✅       | Format: HH:mm dd/MM       |
| Check-in   | `checkInAt`                     | 140px | ✅       | Null = "—"                |
| Giờ rời    | `expectedCheckOut`              | 140px | ✅       | Format: HH:mm dd/MM       |
| Check-out  | `checkOutAt`                    | 140px | ✅       | Null = "—"                |
| Trạng thái | `bookingStatus`                 | 150px | ✅       | Badge màu (xem bảng dưới) |
| Cọc        | `depositAmount` + `depositPaid` | 120px | ✅       | "200k ✅" hoặc "300k ❌"  |
| NV tạo     | `accountFullName`               | 120px | —        | Nhân viên                 |
| Actions    | —                               | 200px | —        | Buttons theo status       |

### Status Badge colors

| Status                 | Badge text   | Background | Text color |
| ---------------------- | ------------ | ---------- | ---------- |
| `PENDING_CONFIRMATION` | Chờ xác nhận | #fff3e0    | #e65100    |
| `CONFIRMED`            | Đã xác nhận  | #e3f2fd    | #1565c0    |
| `CHECKED_IN`           | Đã nhận bàn  | #e8f5e9    | #2e7d32    |
| `COMPLETED`            | Hoàn thành   | #f3e5f5    | #6a1b9a    |
| `CANCELLED`            | Đã huỷ       | #fafafa    | #757575    |
| `EXPIRED`              | Đã hết hạn   | #ffebee    | #c62828    |

---

## D4. Dialog Create / Update Booking

### Layout Form (2 cột)

```
┌──────────────────── TẠO ĐƠN ĐẶT BÀN ────────────────────┐
│                                                            │
│  Cột trái:                    Cột phải:                   │
│  ┌─────────────────────┐     ┌─────────────────────┐     │
│  │ Bàn *        [▼ T08]│     │ Giờ đến *   [📅___] │     │
│  │ Giờ rời *    [📅___]│     │ Thời lượng  [2h ▼]  │     │
│  │ Tên khách    [_____]│     │ SĐT        [______] │     │
│  │ Ghi chú      [_____]│     │                      │     │
│  └─────────────────────┘     └─────────────────────┘     │
│                                                            │
│  ┌──────────── THÔNG TIN ĐẶT CỌC (accordion) ──────────┐ │
│  │ Số tiền cọc  [______]đ   Đã cọc [☐]                 │ │
│  │ Thời gian cọc [📅___]    Mã GD  [____________]      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──── KHUNG GIỜ TRỐNG (auto-load khi chọn bàn+ngày) ──┐ │
│  │ ✅ 08:00 – 11:00  |  ✅ 13:00 – 17:30  |  ✅ 21:00+  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│                        [Hủy]  [Lưu đơn đặt bàn]          │
└────────────────────────────────────────────────────────────┘
```

### Smart behaviors

1. **Khi chọn bàn + ngày → auto-load available slots** (API A10) và hiển thị timeline
2. **Khi chọn giờ đến → auto-compute giờ rời** = giờ đến + 2h (có thể điều chỉnh)
3. **Khi giờ đến < NOW + 2h → disable nút Lưu** + hiển thị warning
4. **Khi chọn giờ rời overlap slot đã đặt → highlight đỏ** + disable nút Lưu

---

## D5. Dialog Booking Detail & Action Panel

### Layout

```
┌──────────────────── CHI TIẾT ĐƠN #123 ───────────────────┐
│                                                            │
│  Trạng thái: [🔵 CONFIRMED - Đã xác nhận]                │
│                                                            │
│  ┌─── Thông tin ─────────┐  ┌─── Thời gian ────────────┐ │
│  │ Bàn: T08 - Bàn 08    │  │ Giờ đến:   19:00 10/04  │ │
│  │ Khách: Nguyen Van A   │  │ Check-in:  —            │ │
│  │ SĐT: 0987654321      │  │ Giờ rời:   21:00 10/04  │ │
│  │ NV tạo: Staff 1      │  │ Check-out: —             │ │
│  │ Tạo lúc: 09:00       │  │                          │ │
│  └───────────────────────┘  └──────────────────────────┘ │
│                                                            │
│  ┌─── Đặt cọc ──────────────────────────────────────────┐ │
│  │ Số tiền: 200.000đ    Đã cọc: ✅ Có                  │ │
│  │ Thời gian: 14:30     Mã GD: MOMO-20260410-001       │ │
│  │ Tịch thu: ❌ Chưa                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Ghi chú: Bàn gần cửa sổ                                 │
│                                                            │
│  ┌─── Actions ──────────────────────────────────────────┐ │
│  │ [✅ Check-in]  [✏️ Sửa]  [❌ Hủy]  [💰 Ghi cọc]     │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Bảng quy tắc hiển thị button

| Button      | PENDING | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED | EXPIRED |
| ----------- | ------- | --------- | ---------- | --------- | --------- | ------- |
| Confirm     | ✅      | ❌        | ❌         | ❌        | ❌        | ❌      |
| Check-in    | ❌      | ✅        | ❌         | ❌        | ❌        | ❌      |
| Check-out   | ❌      | ❌        | ✅         | ❌        | ❌        | ❌      |
| Extend      | ❌      | ❌        | ✅         | ❌        | ❌        | ❌      |
| Cancel      | ✅      | ✅        | ❌         | ❌        | ❌        | ❌      |
| Deposit     | ✅      | ✅        | ❌         | ❌        | ❌        | ❌      |
| Update      | ✅      | ✅        | ❌         | ❌        | ❌        | ❌      |
| Walk-in mới | ❌      | ❌        | ❌         | ❌        | ❌        | ✅      |

---

## D6. Notification Center (Trung tâm cảnh báo)

### Mô tả

Panel slide-in hoặc toast stack hiển thị các cảnh báo realtime từ WebSocket.

### Phân loại cảnh báo

| Type          | Icon | Màu               | Source                         | Ví dụ                                             |
| ------------- | ---- | ----------------- | ------------------------------ | ------------------------------------------------- |
| **Red Alert** | 🔴   | Đỏ (#f44336)      | Job C: TABLE_OCCUPIED_CONFLICT | "Bàn T08 đang có khách nhưng 20p nữa có booking!" |
| **Warning**   | 🟡   | Vàng (#ff9800)    | Job D: NO_ORDER_WARNING        | "Bàn T03 chưa gọi món sau 10p"                    |
| **Info**      | 🔵   | Xanh (#2196f3)    | Job A: TABLE_RESERVED          | "Bàn T08 đã Reserved, dọn bàn"                    |
| **Reminder**  | ⏰   | Tím (#9c27b0)     | Job E: CHECKOUT_REMINDER       | "Bàn T08 sắp hết giờ 15p"                         |
| **Success**   | ✅   | Xanh lá (#4caf50) | API success events             | "Booking #123 đã check-in"                        |

### UX Rules

1. **Red Alert → toast + sound notification** (nổi bật nhất)
2. **Warning → toast persistent** (không auto-dismiss, NV phải ấn dismiss)
3. **Info/Reminder → toast auto-dismiss 10s**
4. **Click notification → navigate đến booking/bàn liên quan**
5. **Badge counter trên icon bell** hiển thị số thông báo chưa đọc

---

## D7. POS Integration – Walk-in Flow

### Màn hình xếp Walk-in

```
┌──────────────── XẾP KHÁCH WALK-IN ────────────────────────┐
│                                                            │
│  1. Chọn bàn trống:                                       │
│  ┌───────────────────────────────────────────────────────┐│
│  │  [T01 ✅]  [T02 ✅]  [T03 🍽️]  [T04 🔖]  [T05 ✅]  ││
│  │  [T06 ✅]  [T07 ✅]  [T08 🔖]  [T09 ✅]  [T10 🍽️]  ││
│  └───────────────────────────────────────────────────────┘│
│                                                            │
│  2. ⚠️ CẢNH BÁO (nếu có):                                │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Bàn T05 có booking CONFIRMED tối 19:00 (sau 45p).    ││
│  │ Khách walk-in cần rời trước 18:45.                   ││
│  │                          [Đã hiểu, tiếp tục]         ││
│  └───────────────────────────────────────────────────────┘│
│                                                            │
│  3. Thông tin khách (optional):                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Tên: [____________]  SĐT: [____________]          │   │
│  │ Ghi chú: [________________]                        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│                        [Hủy]   [Xếp khách Walk-in]        │
└────────────────────────────────────────────────────────────┘
```

### Late-arrival Flow (Rule 12)

Khi NV mở booking EXPIRED → thấy nút "Tạo Walk-in mới":

1. FE gọi `POST /walk-in?lateBookingId={bookingId cũ}`
2. BE auto-expire booking cũ (nếu chưa) + tạo walk-in mới
3. FE update cả 2 row: booking cũ → EXPIRED, booking mới → CHECKED_IN

---

> **Ghi chú cuối:**
>
> - Security hiện tại: `@AdminOrManagerAccess` trên controller (ROLE_ADMIN hoặc ROLE_QL-\*). Development có thể permit all.
> - CORS allow origin: `http://localhost:4200`.
> - FE chỉ hiển thị/ẩn button theo trạng thái. **BE là nơi enforce rule cuối cùng**.
> - Mọi notify realtime gửi **sau commit** (`@TransactionalEventListener(phase = AFTER_COMMIT)`).
> - Mọi thay đổi trạng thái đi qua **State Machine trung tâm**, không set trực tiếp.
> - Response Search dùng key `rows` (không phải `data`) theo `PageResponse.java`.
