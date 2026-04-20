# Tài Liệu Tích Hợp API: Tìm Kiếm Lịch Sử Đặt Bàn (Table Booking Search)

Tài liệu này cung cấp hướng dẫn chi tiết cho đội ngũ Front-End (FE) để tích hợp API gọi danh sách hoặc tìm kiếm lịch sử đặt bàn từ hệ thống.

---

## 1. Thông Tin Chung

- **Mô tả:** API dùng để lấy danh sách lịch sử đặt bàn (Booking) có hỗ trợ phân trang (pagination), sắp xếp (sorting) và tìm kiếm/lọc nội dung (filtering) theo nhiều tiêu chí khác nhau.
- **Method:** `POST`
- **Endpoint:** `/api/v1/table-booking/search`

> [!TIP]
> Do API này nhận nhiều tham số phức tạp kết hợp (phân trang và bộ lọc), phương thức POST được sử dụng thay vì GET nhằm truyền Payload dưới dạng Body JSON giúp bảo mật tra cứu và cấu trúc gọn gàng hơn thay vì dùng query params trên URL.

---

## 2. Request Payload (Body)

API nhận vào một đối tượng JSON chuẩn xác định các điều kiện tìm kiếm. Toàn bộ các trường bộ lọc đều là **tùy chọn (optional)** (ngoại trừ cấu hình phân trang mặc định).

### Cấu trúc JSON Request Mẫu:

```json
{
  "page": 1,
  "limit": 10,
  "sortField": "createdTime",
  "sortDir": "desc",
  
  "tableId": 5,
  "bookingStatus": "PENDING",
  "customerName": "Nguyễn Văn A",
  "phoneNumber": "0987654321",
  "bookingFrom": "2024-04-01T00:00:00",
  "bookingTo": "2024-04-30T23:59:59",
  "active": true
}
```

### Chi tiết các tham số:

#### A. Tham số Phân trang & Sắp xếp (Kế thừa từ `PageFilterRequest`)
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả | Mặc định (nếu có base BE xử lý) |
| :--- | :--- | :--- | :--- | :--- |
| `page` | Integer | Không | Trang số mấy cần lấy (Ví dụ: 1 là trang đầu tiên) | Tùy config BE |
| `limit` | Integer | Không | Số lượng bản ghi trên một trang (Ví dụ: 10, 20) | Tùy config BE |
| `sortField` | String | Không | Tên trường muốn sắp xếp (vd: `createdTime`, `bookingTime`) | Thường là ID/Ngày rạo |
| `sortDir` | String | Không | Hướng sắp xếp (chấp nhận: `asc` hoặc `desc`) | `asc` |

#### B. Tham số Bộ lọc Tìm Kiếm (Tùy chọn)
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `tableId` | Integer | Không | Lọc các booking thuộc về một bàn cụ thể (ID của bàn). |
| `bookingStatus` | String | Không | Lọc theo mã trạng thái đặt bàn (vd: `PENDING`, `CONFIRMED`, `CANCELLED`). |
| `customerName` | String | Không | Tìm gần đúng (LIKE) theo tên khách hàng đặt bàn. |
| `phoneNumber` | String | Không | Tìm chính xác (hoặc LIKE tùy logic Service) theo SĐT. |
| `bookingFrom` | ISO Date Time | Không | Lọc ngày đặt bàn bắt đầu từ mốc thời gian này (Format: `YYYY-MM-DDTHH:mm:ss`). |
| `bookingTo` | ISO Date Time | Không | Lọc ngày đặt bàn kết thúc tại mốc thời gian này (Format: `YYYY-MM-DDTHH:mm:ss`). |
| `active` | Boolean | Không | Lọc trạng thái hoat động của bản ghi (true/false). Thường chỉ lấy `true`. |

---

## 3. Response Data

Kết quả trả về được bọc trong một đối tượng `ApiResponse` chứa status trả về, message và `data` là một đối tượng `PageResponse`.

### Cấu trúc JSON Response Mẫu (Thành công):

```json
{
  "status": 200,
  "message": "SEARCH_TABLE_BOOKING_SUCCESS",
  "data": {
    "pageNo": 1,
    "pageSize": 10,
    "totalElements": 25,
    "totalPages": 3,
    "data": [
      {
        "bookingId": 101,
        "tableId": 5,
        "tableCode": "TB-05",
        "tableName": "Bàn VIP 5",
        "bookingTime": "2024-04-05T19:00:00",
        "checkInTime": null,
        "bookingStatus": "PENDING",
        "bookingStatusName": "Chờ xác nhận",
        "customerName": "Nguyễn Văn A",
        "phoneNumber": "0987654321",
        "deposit": 500000.00,
        "note": "Khách cần chuẩn bị ghế hoa",
        "accountId": 12,
        "accountUsername": "nhanvien1",
        "accountFullName": "Trần Nhân Viên",
        "active": true,
        "createdTime": "2024-04-02T10:30:00"
      }
      // ... các object booking khác ...
    ]
  }
}
```

### Chi tiết các trường Response:

#### A. Base ApiResponse
| Trường | Kiểu DL | Mô tả |
| :--- | :--- | :--- |
| `status` | Integer | HTTP Status / Mã tự định nghĩa của ứng dụng (200 = Success). |
| `message` | String | Thông điệp phản hồi (vd: `SEARCH_TABLE_BOOKING_SUCCESS`). |
| `data` | Object | Trả về thông tin phân trang `PageResponse`. |

#### B. PageResponse (nằm trong `data`)
| Trường | Kiểu DL | Mô tả |
| :--- | :--- | :--- |
| `pageNo` | Integer | Trang hiện tại. |
| `pageSize` | Integer | Kích thước trên 1 trang (limit ban đầu đưa xuống). |
| `totalElements`| Integer | Tổng số bản ghi tìm thấy trong CSDL. (Dùng để FE render phân trang). |
| `totalPages` | Integer | Tổng số trang tìm thấy. |
| `data` | Array | Mảng danh sách thông tin chi tiết các booking (`TableBookingResponseDTO`). |

#### C. Chi tiết 1 đối tượng Booking (Item nằm trong mảng `data`)
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `bookingId` | Integer | ID (khóa chính) của lượt booking. |
| `tableId` | Integer | ID của bàn được đặt. |
| `tableCode` | String | Mã bàn (hiển thị). |
| `tableName` | String | Tên bàn. |
| `bookingTime` | ISO Date Time | Thời gian dự kiến khách đến sử dụng bàn. |
| `checkInTime` | ISO Date Time | Thời gian khách thực tế check-in vào bàn (Nếu có). |
| `bookingStatus` | String | Mã trạng thái booking hệ thống (vd: PENDING). |
| `bookingStatusName`| String | Tên trạng thái booking dùng để hiển thị cho người dùng. |
| `customerName` | String | Tên khách hàng. |
| `phoneNumber` | String | Số điện thoại của khách đại diện đặt. |
| `deposit` | BigDecimal/Number| Tiền cọc bàn (Nếu null nghĩa là khách không phải cọc). |
| `note` | String | Ghi chú của khách hoặc nhân viên. |
| `accountId` | Integer | ID tài khoản nhân viên thao tác. |
| `accountUsername` | String | Tên đăng nhập của nhân viên thao tác. |
| `accountFullName` | String | Tên đầy đủ của nhân viên thao tác. |
| `active` | Boolean | Cờ đánh dấu bản ghi đang có hiệu lực hay đã bị xóa mềm. |
| `createdTime` | ISO Date Time | Thời gian dữ liệu booking này được tạo trên hệ thống. |

---

> [!NOTE]
> **FE Cần Lưu Ý:**
> - Các khoảng thời gian (`bookingFrom`, `bookingTo`, `bookingTime`, `createdTime`, ...) đều được định dạng theo chuẩn ISO 8601 (`YYYY-MM-DDTHH:mm:ss`), FE cần đảm bảo chuyển đổi đúng múi giờ (Timezone) khi đẩy về cho BE và hiển thị cho End-user.
> - Tham số lọc đều có thể null/undefined/empty string. FE không cần phải thêm các tham số này vào body payload nếu người dùng không có nhu cầu chọn điều kiện lọc.
