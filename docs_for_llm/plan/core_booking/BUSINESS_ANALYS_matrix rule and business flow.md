# core

# Convention

### Bảng table_booking: Bảng trong DB lưu bản ghi 1 đơn đặt bàn, có thể

1. booking_status: Quản lý trạng thái đơn đặt hàng: EXPIRED, COMPLETED, CANCELLED, PENDING_CONFIRMATION, CHECKED_IN
2. is_active: trạng thái hoạt động của đơn đặt hàng (0/1)
3. expected_arrive_time: thời gian khách check-in dự kiến
4. expected_check_out: thời gian khách check-out dự kiến
5. check_in_at: thời gian khách THỰC SỰ check-in
6. check_out_at: thời gian khách thực sự check out

### Bảng dining_table: Bảng trong DB đại diện cho 1 bàn

1. table_status: trạng thái bàn: AVAILABLE, BOOKED, OCCUPIED

### Thuật ngữ:

1. NOW(): hàm pseudo tượng trưng cho thời gian hiện tại

### Ma trận nghiệp vụ

| STT | **Thời điểm / Hành động**                    | **`booking_status`** | **`dining_table.table_status`** | RULE | **Giải thích Logic & Thao tác vật lý** |
| --- | -------------------------------------------- | -------------------- | ------------------------------- | ---- | -------------------------------------- |
|     | **🟢 HAPPY CASES (luồng chính, thường gặp)** |                      |                                 |      |                                        |
| 1   | Khách đặt bàn thành công:                    |

• Trước giờ đến ≥ 2 tiếng: Chỉ cho đặt trước 2 tiếng để đảm bảo thời gian cho khách walk-in, tránh trường hợp đặt quá sát giờ hẹn.
• Khung giờ nhận khách đặt trước: 06:00 - 20:00 (giờ quán, UTC+7).
• Chưa xác nhận | PENDING_CONFIRMATION | AVAILABLE | 1. `expected_arrive_time` ≥ NOW() + 2h 2. `expected_arrive_time` phải nằm trong khoảng 06:00 - 20:00 (giờ quán). 3. `expected_check_out` = `expected_arrive_time` + 2h:
• FE sẽ tự set khi nhập input ở đây, nhưng cho phép user gia hạn thêm , quá 2h thì thêm tiền.
• BE: chống race_condition: Không cho phép đặt bàn đã booked bởi 1 đơn booking khác. 4. `check_in_at` = `check_out_at` = NULL | Ghi nhận yêu cầu, chưa giữ bàn:
• Trạng thái bàn vẫn AVAILABLE cho khách vãng lai.
• Tạo bản ghi đặt bàn table_booking
• Nếu có đặt cọc và thỏa mãn các rule: Tự động chuyển sang CONFIRMED, tiền đặt cọc sẽ tự động khấu trừ vào hóa đơn invoice khi thanh toán. |
| 2 | Nhân viên xác nhận booking (Sau khi liên hệ / đặt cọc) | CONFIRMED | AVAILABLE | 1. Khi có khách walk-in cần đặt bàn, nhân viên ấn chọn bàn (danh sách các bàn AVAILABLE), hệ thống cần guard+hiển thị thông báo bàn đó còn bao nhiêu thời gian từ NOW() đến expected_arrive_time của đơn booking đang trỏ đến bàn này. Nhân viên sẽ nhìn vào số thời gian AVAILABLE còn lại để sắp xếp với khách. | • Bàn vẫn để trống để cho khách walk-in , đặt bàn miễn là không xung đột với thời gian đã được đặt trước. |
| 3 | Hệ thống AUTO quét mỗi 30 phút / Nhân viên ấn nút “Cập nhật trạng thái đơn đặt bàn” | CONFIRMED | BOOKED | Tự động chuyển trạng thái bàn sang trạng thái BOOKED. Hiển thị thông báo để nhân viên dọn bàn, cắm biển "Reserved", không cho khách walk-in , booking chọn vào bàn này. | • Yêu cầu chức năng:

1. Hiển thị thông báo TRƯỚC 30P với các bàn mà sắp đến giờ có lịch đặt bàn từ trước (để nhân viên dọn dẹp, sắp xếp). |
   | 4. | Khách đến đúng giờ / Trễ ≤ 30 phút | CHECKED_IN | OCCUPIED | 1. Ghi nhận check_in_at = NOW().
2. Nếu trễ: `check_in_at` > `expected_arrive_time` nhưng ≤ `expected_arrive_time` + 30p → giữ nguyên `expected_check_out`. → Cho phép đến muộn trong 30p nhưng vẫn phải giữ nguyên thời gian rời đi.
3. Nếu đúng giờ hoặc sớm (≤30p) → `expected_check_out` giữ nguyên. → Đến sớm, giữ nguyên thời gian rời đi.
   → Khách được phép đến sớm/muộn trong thời gian 30p xung quanh mốc expected_arrive_time, nhưng vẫn giữ nguyên thời gian dự định rời đi. | 1. Ghi nhận check_in_at = NOW().
4. Gỡ biển Reserved. Bàn có khách, POS cho phép order món.
   |
   | 5 | Khách thanh toán & rời đi | COMPLETED | AVAILABLE | 1. check_out_at = NOW()
5. check_out_at ≤ expected_check_out | 1. Giải phóng bàn.
6. Yêu cầu chức năng:
   • Trước giờ expected_check_out 15p: Hiển thị thông báo
   • Hiển thị thông báo “Đơn đặt Hoàn thành, Bàn XX đã được giải phóng. “ |
   | 6 | Khách chủ động hủy lịch (gọi điện trước giờ đến) | CANCELLED | AVAILABLE | 1. Chỉ cho phép hủy trước mốc expected_arrive_time | Cập nhật hủy đơn đặt, giải phóng bàn |
   | 7 | Quá expected_arrive_time 30 phút mà khách chưa đến, chưa có check-in | EXPIRED | AVAILABLE | 1. `expected_arrive_time` + 30p < NOW()
7. `check_in_at` IS NULL. | Tự động huỷ booking, giải phóng bàn. Tiền cọc mất.
   Hiển thị thông báo “Đơn đặt EXPIRED , bàn XX đã được giải phóng.” |
   | | **🟡 EDGE CASES (tình huống biên, ít gặp nhưng cần xử lý)** | | | | |
   | 8 | Hệ thống quét: còn 30 phút tới giờ nhưng bàn đang `OCCUPIED` (kẹt bàn) | `CONFIRMED` | `OCCUPIED` (giữ nguyên) | 1. `expected_arrive_time` BETWEEN NOW() AND NOW() + 30p; 
8. `dining_table.table_status` = `OCCUPIED`. Không chuyển sang `BOOKED`. | **Không** chuyển sang `BOOKED`. Bắn cảnh báo đỏ lên FE: "Bàn X sắp có khách đặt trong thời gian expected_arrive_time của đơn đặt có ID XX nhưng đang kẹt!". Nhân viên chủ động xử lý (đề nghị khách cũ rời sớm, hoặc xếp bàn thay thế cho khách sắp đến). |
   | 9 | Nhân viên cố tình xếp khách vãng lai vào bàn đang `BOOKED` | `CONFIRMED` | `BOOKED` | 1. Bàn có `table_status` = `BOOKED` và có booking `CONFIRMED` với `expected_arrive_time` ≤ NOW() + 30p | Hệ thống **chặn** thao tác trên POS, báo lỗi: "Bàn này đã giữ chỗ cho lịch hẹn". Ngăn cướp bàn. |
   | 10 | Khách đến sớm (>30 phút) và bàn đang `AVAILABLE` | `CHECKED_IN` | `OCCUPIED` | 1. `check_in_at` = NOW();
9. `check_in_at` < `expected_arrive_time` • 30p.
10. Tính lại `expected_check_out` = `check_in_at` • `max_duration` (VD: 2h).
11. Kiểm tra xung đột với booking kế tiếp: nếu `expected_check_out` mới ≤ `expected_arrive_time` của booking kế tiếp thì cập nhật; nếu không, cảnh báo và yêu cầu xác nhận. | Cho phép check‑in sớm. Kiểm tra xung đột với booking kế tiếp: nếu không ảnh hưởng thì cập nhật; nếu ảnh hưởng, cảnh báo nhân viên và yêu cầu xác nhận. |
    | 11 | Khách đến sớm nhưng bàn đang `BOOKED` (đã có biển Reserved) | `CHECKED_IN` | `OCCUPIED` | 1. `check_in_at` = NOW(); 
12. `check_in_at` < `expected_arrive_time`.
13. Bàn đang `BOOKED` → Giữ nguyên `expected_check_out` (theo `expected_arrive_time` gốc) | Vẫn cho check‑in, gỡ biển Reserved. Thời gian kết thúc dự kiến giữ nguyên theo `expected_arrive_time` gốc (khách đến sớm được ngồi thêm nhưng phải trả bàn đúng giờ cho booking sau). |
    | 12 | Khách đến muộn >30 phút (no‑show) nhưng vẫn muốn vào, còn bàn trống | `EXPIRED` (booking cũ), tạo booking mới dạng walk‑in | `AVAILABLE` → `OCCUPIED` | 1. Booking cũ: `expected_arrive_time` + 30p < NOW() → chuyển thành `EXPIRED`.
14. Tạo booking mới dạng walk‑in với `booking_status` = `CONFIRMED` hoặc `CHECKED_IN` ngay; `check_in_at` = NOW(); `expected_check_out` = NOW() + `max_duration`.
15. `max_duration` : có thể linh hoạt , miễn là không chạm vào expected_arrive_time của order kế tiếp . Khi tạo mới booking (lúc này là dạng walk-in): Cần kiểm tra thời gian check_out_at có xung đột với expected_arrive_time của đơn booking nào kế tiếp không ? (Chỉ kiểm tra trong cùng ngày: do đây là dạng walk-in, tức thời gian hiện tại, không phải order nên không cần kiểm tra các order của ngày khác). | 1. Hệ thống tự động huỷ booking cũ (no‑show). Nếu còn bàn khác, nhân viên tạo booking mới với `booking_status = CONFIRMED` (hoặc `CHECKED_IN` ngay). Khách mất cọc cũ, có thể yêu cầu đặt cọc lại nếu chính sách quy định.
16. Khi tạo mới booking (lúc này là dạng walk-in): Cần kiểm tra thời gian check_out_at có xung đột với expected_arrive_time của đơn booking nào kế tiếp không ? (Chỉ kiểm tra trong cùng ngày: do đây là dạng walk-in, tức thời gian hiện tại, không phải order nên không cần kiểm tra các order của ngày khác). |
    | 13 | Khách đang ngồi (`OCCUPIED`) muốn gia hạn thêm giờ | `CHECKED_IN` | `OCCUPIED` | 1. Kiểm tra nếu có booking kế tiếp trên cùng bàn với `expected_arrive_time` ≤ NOW() + 30p → từ chối gia hạn (hoặc đề xuất đổi bàn).
17. Nếu không có xung đột → cho phép gia hạn và cập nhật `expected_check_out`. | Nhân viên chọn xem lịch sử đặt bàn của bàn đó, nếu sắp tới không có đơn booking nào thì cho gia hạn (không cần cập nhật lên hệ thống, chỉ cần nói với khách).
    Nếu có đơn booking cho bàn đó trong vòng 30p sắp tới, sẽ có thông báo ra FE để nhân viên biết mà sắp xếp bàn. |
    | 14 | Khách check‑in nhưng không order món và rời đi sau vài phút | `CHECKED_IN` | `OCCUPIED` → `AVAILABLE` | | 1. Nếu sau 20 phút không có `dish_order` nào được tạo và chưa thanh toán, hệ thống tự động hủy trạng thái `OCCUPIED`, chuyển bàn về `AVAILABLE`, booking chuyển thành `CANCELLED` (hoặc `COMPLETED` với doanh thu = 0). Có thể ghi log để kiểm tra.
18. Tuy nhiên cần thông báo trước thời gian tự động hủy 10p. |
    | 15 | Hai nhân viên cùng lúc đặt cùng một bàn cho cùng khung giờ (race condition) | `PENDING_CONFIRMATION` / `CONFIRMED` | `AVAILABLE` | | Ứng dụng phải dùng **lock** (pessimistic hoặc optimistic) khi tạo/cập nhật booking. Nếu phát hiện trùng, giao dịch thứ hai bị từ chối với thông báo "Bàn đã có người đặt vào khung giờ này". |
    | 16 | Khách walk-in đã được xếp vào bàn có booking CONFIRMED. (lúc khách walk-in được xếp vào bàn này thì thời gian AVAILABLE của bàn vẫn còn đủ để pass rule thời gian booking tối thiểu là 2 tiếng, thế nhưng khách ngồi lâu gần đến giờ expected_arrive_time của đơn booking cho bàn đó (còn 30p).) | | | 1. Khi còn 30 **phút** trước `expected_arrive_time` của booking, hệ thống quét thấy bàn đang `OCCUPIED` do walk‑in → bắn **cảnh báo đỏ** lên POS. Nhân viên nhắc khách walk‑in rời đi, sắp xếp chỗ khác.
19. Trước khi sắp xếp khách vào bàn đã có booking CONFIRMED, hệ thống phải đưa ra cảnh báo để nhân viên biết và báo cho khách walk-in trước khi sắp bàn cho khách. | Đảm bảo quyền lợi cho khách đặt trước. |
    | 17 | Hai walk-in cùng được 2 nhân viên chọn 1 màn trống (race-condition) | | | 1. Sử dụng **pessimistic lock** trên bàn khi bắt đầu tạo booking walk‑in. Giao dịch sau sẽ nhận được thông báo "Bàn vừa có người đặt, vui lòng chọn bàn khác". Thời gian lock tối đa 5 giây. | |
    | 18 | Walk-in đến khi bàn đang có PENDING_CONFIRMATION (chưa cọc) và chưa được xác nhận | PENDING_CONFIRMATION | AVAILABLE | **1. Quy định:** `PENDING_CONFIRMATION` không cọc **không được phép chuyển sang `BOOKED` .**
    | 1. Nhân viên kiểm tra danh sách booking của bàn, nếu chưa có cọc thì gọi điện xác nhận , nếu khách hủy cọc thì hủy booking, cho phép walk-in vào bàn đó. Nếu khách xác nhận / cọc thì đổi trạng thái booking sang CONFIRMED và sắp xếp khách walk-in cho bàn khác |

## Chuẩn hóa message exception nghiệp vụ (validator / rule / state_machine)

### Mục tiêu

- Mọi lỗi business phải trả về đúng nguồn gây lỗi để phục vụ báo cáo nghiệp vụ, trace log và hiển thị FE.
- Message phải phản ánh rõ: rule nào vi phạm + validator/state-machine nào phát hiện.

### Format chuẩn

- Validator fail:
  - `BOOKING_TRANSITION_RULE_VIOLATION: [RULE_TAG][ValidatorClass] <chi tiết lỗi>`
- State machine guard fail:
  - `BOOKING_TRANSITION_GUARD_FAILED: [STATE_MACHINE_GUARD][BookingStateMachineImpl] <chi tiết lỗi>`
- State machine transition not allowed:
  - `BOOKING_TRANSITION_NOT_ALLOWED: [STATE_MACHINE_TRANSITION][BookingStateMachineImpl] <chi tiết lỗi>`
- State machine rule violation:
  - `BOOKING_TRANSITION_RULE_VIOLATION: [RULE_TAG][BookingStateMachineImpl] <chi tiết lỗi>`

### Mapping validator -> rule tag

- `AdvanceBookingValidator` -> `RULE_01_ADVANCE_BOOKING`
- `ExpectedArriveTimeWindowValidator` -> `RULE_01_EXPECTED_ARRIVE_WINDOW`
- `DurationValidator` -> `RULE_01_DURATION`
- `NoConflictValidator` -> `RULE_01_02_12_NO_CONFLICT`
- `DepositValidator` -> `RULE_02_DEPOSIT_REQUIRED`
- `EarlyArrivalValidator` -> `RULE_10_EARLY_ARRIVAL`
- `LateArrivalValidator` -> `RULE_04_12_LATE_ARRIVAL`
- `BookingOwnershipValidator` -> `RULE_11_BOOKING_OWNERSHIP`
- `ExtensionValidator` -> `RULE_13_EXTENSION`
- `WalkInGuardValidator` -> `RULE_09_16_WALK_IN_GUARD`
- `WalkInPreAssignWarningValidator` -> `RULE_16_WALK_IN_PRE_ASSIGN_WARNING`
- `PendingConfirmationAdvisoryValidator` -> `RULE_18_PENDING_CONFIRMATION_ADVISORY`

### Mapping state_machine internal rule tag

- Cancel sau giờ đến không hợp lệ -> `RULE_06_CANCEL_BEFORE_ARRIVE`
- Quá hạn no-show 30 phút -> `RULE_07_NO_SHOW_EXPIRE`
- Hoàn tất thiếu check-in/check-out -> `RULE_05_COMPLETED_REQUIRE_CHECKIN`, `RULE_05_COMPLETED_REQUIRE_CHECKOUT`

### Ví dụ response business error

```json
{
  "code": "BOOKING_STATE_TRANSITION_INVALID",
  "message": "BOOKING_TRANSITION_RULE_VIOLATION: [RULE_01_ADVANCE_BOOKING][AdvanceBookingValidator] Thời gian đặt bàn phải sớm hơn thời điểm hiện tại ít nhất 2 tiếng"
}
```

## Cập nhật contract API /create với isWalkIn (2026-04-18)

### Mục tiêu

- Dùng một API duy nhất `POST /api/v1/table-booking/create` cho 2 nghiệp vụ:
  - Booking đặt trước thông thường.
  - Booking khách vãng lai (walk-in).
- Đánh dấu `POST /api/v1/table-booking/walk-in` là **legacy** để tương thích ngược.

### Quy ước request mới

- Bổ sung field `isWalkIn` vào `TableBookingCreateRequestDTO`.
- Ý nghĩa:
  - `isWalkIn = true`: tạo booking theo luồng walk-in (khách đến trực tiếp, ngồi ngay).
  - `isWalkIn = false` hoặc `null`: tạo booking thông thường.

### Hành vi nghiệp vụ theo isWalkIn

| Trường hợp | Luồng xử lý nội bộ | booking_status sau khi tạo | dining_table.table_status | Ghi chú |
| --- | --- | --- | --- | --- |
| `isWalkIn = false/null` | `createBooking` | `PENDING_CONFIRMATION` (hoặc theo logic cọc/xác nhận) | `AVAILABLE` | Luồng đặt trước truyền thống |
| `isWalkIn = true` | `createWalkIn` | `CHECKED_IN` ngay | `OCCUPIED` ngay | Khách đến trực tiếp và ngồi luôn |

### Validate thời gian cho 2 nghiệp vụ trên cùng API

#### 1) Booking thông thường (`isWalkIn = false/null`)

- Dữ liệu thời gian lấy trực tiếp từ request:
  - `expectedArriveTime`
  - `expectedCheckOut`
- Rule validate chính:
  - `expectedArriveTime` phải hợp lệ theo luồng booking đặt trước.
  - `expectedCheckOut` phải lớn hơn `expectedArriveTime`.
  - Kiểm tra xung đột khung giờ với booking khác trên cùng bàn.

#### 2) Walk-in (`isWalkIn = true`)

- Khi vào use-case walk-in, backend chuẩn hóa thời gian như sau:
  - `expectedArriveTime` được set lại bằng `NOW()`.
  - `expectedCheckOut`:
    - nếu request không truyền: tự set `NOW() + 2 giờ`.
    - nếu request có truyền: bắt buộc phải lớn hơn `NOW()`.
- Rule validate chính:
  - Chặn xếp walk-in vào bàn không hợp lệ (`BOOKED`/xung đột gần giờ booking).
  - Cảnh báo các trường hợp có booking gần kề cần nhân viên xác nhận thao tác.

### Lưu ý implementation hiện tại

- Ở tầng DTO, `expectedArriveTime` và `expectedCheckOut` vẫn có validate bắt buộc.
- Vì vậy FE vẫn cần gửi đủ 2 field này khi gọi `/create`, kể cả khi `isWalkIn = true`.
- Tuy nhiên trong nhánh walk-in, backend sẽ override `expectedArriveTime` về `NOW()` để đảm bảo đúng nghiệp vụ khách đến trực tiếp.

### Trạng thái API /walk-in sau thay đổi

- `POST /api/v1/table-booking/walk-in` được đánh dấu **legacy**.
- Hướng dùng mới:
  - Walk-in thuần: dùng `/create` + `isWalkIn=true`.
  - Các case cần `lateBookingId`/`force` chuyên biệt vẫn tương thích qua endpoint legacy trong giai đoạn chuyển đổi.
