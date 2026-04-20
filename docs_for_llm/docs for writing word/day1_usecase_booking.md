# ĐẶC TẢ USE CASE — MODULE QUẢN LÝ ĐẶT BÀN (BOOKING)

> **Hệ thống:** CF-M — Chương trình Quản lý quán Café  
> **Module:** Booking (`src/app/features/booking`)  
> **Phiên bản:** 2.0  
> **Ngày:** 18/04/2026

---

## PHẦN 1 — BẢNG ĐẶC TẢ USE CASE

---

### UC-DB01 — Tìm kiếm danh sách bàn và lọc theo tiêu chí

| Mã Use case | UC-DB01 | Tên Use case | Tìm kiếm danh sách bàn và lọc theo tiêu chí |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên tìm kiếm và lọc danh sách bàn theo nhiều tiêu chí: từ khóa (mã bàn, tên bàn), số chỗ ngồi (2, 4, 6, 8), trạng thái bàn (Bàn trống, Đang sử dụng, Đã đặt), tầng (Tầng 1, 2, 3). Kết quả hiển thị dạng lưới thẻ bàn (card grid) với phân trang. Hệ thống tự động lọc khi nhân viên thay đổi bất kỳ tiêu chí nào. |
| **Sự kiện kích hoạt chức năng** | Nhân viên truy cập vào màn hình "Quản lý đặt bàn", hoặc thay đổi giá trị bộ lọc (từ khóa, số chỗ, trạng thái, tầng), hoặc nhấn nút "Tìm kiếm". |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập vào hệ thống với quyền phù hợp (ROLE_ADMIN hoặc ROLE_QL). <br> 2. Hệ thống đang hiển thị màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhập từ khóa tìm kiếm (mã bàn, tên bàn) vào ô tìm kiếm và/hoặc chọn bộ lọc: Số chỗ (Tất cả / 2 / 4 / 6 / 8 chỗ), Trạng thái (Tất cả / Bàn trống / Đang sử dụng / Đã đặt), Tầng (Tất cả / Tầng 1 / Tầng 2 / Tầng 3). |
| | 2 | Hệ thống | Tự động phát hiện sự thay đổi bộ lọc, gửi điều kiện lọc đến Backend thông qua Facade. |
| | 3 | Hệ thống | Backend truy vấn cơ sở dữ liệu lấy danh sách bàn theo điều kiện lọc. |
| | 4 | Hệ thống | Cơ sở dữ liệu trả về kết quả danh sách bàn cho Backend. |
| | 5 | Hệ thống | Backend gửi kết quả về giao diện. |
| | 6 | Hệ thống | Giao diện hiển thị danh sách bàn dạng lưới thẻ (card grid). Mỗi thẻ bàn hiển thị: tên bàn, mã bàn, số chỗ ngồi (kèm icon nhóm/cá nhân), badge trạng thái bàn (màu sắc tương ứng), thông tin metadata (giờ đến, khách, SĐT...). Phần footer hiển thị tổng số bàn và thanh phân trang. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 6a | Hệ thống | Nếu không tìm thấy bàn phù hợp: hiển thị thông báo "Không tìm thấy bàn phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc để xem kết quả khác." |
| | 2a | Hệ thống | Nếu đang tải dữ liệu: hiển thị thông báo "Đang tải dữ liệu bàn. Vui lòng chờ trong giây lát." và vô hiệu hóa nút Tìm kiếm. |
| | 2b | Hệ thống | Nếu có lỗi kết nối hoặc lỗi server: hiển thị thông báo lỗi kèm nút "Tải lại danh sách" để nhân viên thử lại. |

| **Hậu điều kiện** | Danh sách bàn tương ứng với điều kiện lọc được hiển thị trên giao diện dạng lưới thẻ, kèm phân trang. |
|---|---|
| **Điểm mở rộng** | Nhấp chuột lên thẻ bàn → mở lịch sử đặt bàn của bàn đó (UC mở rộng). Nhấp đúp → mở chi tiết bàn (UC-DB05). Chuột phải → menu thao tác nhanh (Lịch sử, Đặt bàn, Walk-in, Làm trống, Xem chi tiết). Nhấn tab Tầng 1/2/3 → lọc nhanh theo tầng. Nhấn nút phân trang → chuyển trang danh sách. |

---

### UC-DB02 — Đặt bàn

| Mã Use case | UC-DB02 | Tên Use case | Đặt bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên tạo đơn đặt bàn mới cho khách hàng (qua điện thoại hoặc trực tiếp). Hệ thống mở hộp thoại đặt bàn (POS Table Booking Dialog) để nhân viên nhập thông tin: bàn, giờ đến dự kiến, giờ rời (tự động tính = giờ đến + 2 tiếng), tên khách, SĐT, ghi chú, thông tin đặt cọc. Hệ thống validate nghiệp vụ (thời gian đặt trước ≥ 2 tiếng, giờ đến trong khung 06:00-20:00, xung đột khung giờ) và lưu đơn với trạng thái "Chờ xác nhận" (PENDING_CONFIRMATION). Trạng thái bàn vẫn giữ nguyên "Bàn trống" (AVAILABLE). |
| **Sự kiện kích hoạt chức năng** | Nhân viên nhấn nút "Đặt bàn mới" trên thanh công cụ, hoặc chọn "Đặt bàn" từ menu chuột phải trên thẻ bàn. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống với quyền phù hợp. <br> 2. Hệ thống đang hiển thị màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhấn nút "Đặt bàn mới" trên thanh công cụ, hoặc chuột phải trên thẻ bàn → chọn "Đặt bàn". |
| | 2 | Hệ thống | Mở hộp thoại "Tạo đơn đặt bàn" (POS Table Booking Dialog). Nếu nhân viên chọn bàn cụ thể từ menu chuột phải, trường bàn sẽ được tự động điền sẵn (tableId). Hiển thị form nhập thông tin: Bàn, Giờ đến, Giờ rời, Tên khách, SĐT, Ghi chú, Thông tin đặt cọc, kèm danh sách khung giờ trống (available slots). |
| | 3 | Nhân viên | Chọn bàn (nếu chưa chọn), nhập giờ đến dự kiến. Hệ thống tự tính giờ rời = giờ đến + 2 tiếng (nhân viên có thể điều chỉnh). Nhập tên khách, SĐT, ghi chú nếu cần. Nhấn nút "Lưu đơn đặt bàn". |
| | 4 | Hệ thống | Gửi thông tin đơn đặt bàn đến Backend (POST /api/v1/table-booking/create). |
| | 5 | Hệ thống | Backend khóa bàn (distributed lock theo tableId) để chống xung đột đồng thời. Kiểm tra: thời gian đặt trước ≥ 2 tiếng, giờ đến trong khung 06:00-20:00, giờ rời > giờ đến, khung giờ không xung đột với đơn đặt bàn khác trên cùng bàn. Tạo bản ghi đơn đặt bàn với trạng thái PENDING_CONFIRMATION, lưu vào cơ sở dữ liệu. Phát thông báo realtime (WebSocket). Giải phóng khóa bàn. |
| | 6 | Hệ thống | Backend trả về kết quả thành công kèm thông tin đơn vừa tạo. |
| | 7 | Hệ thống | Giao diện đóng hộp thoại, tự động tải lại danh sách bàn để cập nhật trạng thái mới nhất. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 5a | Hệ thống | Nếu thời gian đặt trước < 2 tiếng: Backend trả lỗi, giao diện hiển thị thông báo "Phải đặt trước ít nhất 2 tiếng". Quay lại bước 3. |
| | 5b | Hệ thống | Nếu giờ đến dự kiến ngoài khung 06:00-20:00: hiển thị thông báo "Thời gian đến phải nằm trong khoảng 06:00 - 20:00". Quay lại bước 3. |
| | 5c | Hệ thống | Nếu khung giờ xung đột với đơn đặt bàn khác: hiển thị "Bàn đã có người đặt vào khung giờ này" kèm gợi ý khung giờ trống. Quay lại bước 3. |
| | 5d | Hệ thống | Nếu bàn đang bị khóa bởi thao tác khác (race condition): hiển thị "Bàn đang được thao tác bởi người khác, vui lòng thử lại". |
| | 3a | Nhân viên | Nếu khách thanh toán tiền cọc ngay lập tức: nhân viên nhập thông tin cọc trong hộp thoại. Backend sau khi tạo đơn sẽ tự động chuyển sang trạng thái "Đã xác nhận" (CONFIRMED). |

| **Hậu điều kiện** | Đơn đặt bàn mới được tạo với trạng thái "Chờ xác nhận" (PENDING_CONFIRMATION). Trạng thái bàn vẫn là "Bàn trống" (AVAILABLE). Danh sách bàn trên giao diện được cập nhật. |
|---|---|
| **Điểm mở rộng** | Nếu khách đặt cọc ngay → đơn tự động chuyển sang "Đã xác nhận". |

---

### UC-DB03 — Xếp khách vãng lai (Walk-in)

| Mã Use case | UC-DB03 | Tên Use case | Xếp khách vãng lai (Walk-in) |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Phục vụ khách đến trực tiếp quán mà không đặt trước (walk-in). Nhân viên chọn bàn trống và tạo đơn đặt bàn dạng check-in ngay lập tức. Hệ thống mở hộp thoại đặt bàn ở chế độ Walk-in, nhân viên nhập thông tin khách (không bắt buộc). Đơn được tạo với trạng thái "Đã nhận bàn" (CHECKED_IN) và bàn chuyển sang "Đang sử dụng" (OCCUPIED). POS cho phép gọi món ngay. Thời gian sử dụng mặc định là 2 tiếng. |
| **Sự kiện kích hoạt chức năng** | Nhân viên chuột phải trên thẻ bàn → chọn "Khách vãng lai" từ menu ngữ cảnh. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Bàn được chọn đang ở trạng thái "Bàn trống" (AVAILABLE), không bị "Đã đặt" (BOOKED). |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Chuột phải trên thẻ bàn trống, chọn "Khách vãng lai" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Mở hộp thoại đặt bàn (POS Table Booking Dialog) ở chế độ Walk-in, trường bàn được tự động điền sẵn (tableId) và đánh dấu chế độ walkIn = true. Hiển thị form nhập thông tin khách: Tên khách, SĐT, Ghi chú (tất cả không bắt buộc). |
| | 3 | Nhân viên | Nhập thông tin khách nếu cần (không bắt buộc). Nhấn nút xác nhận xếp khách Walk-in. |
| | 4 | Hệ thống | Gửi yêu cầu tạo Walk-in đến Backend (POST /api/v1/table-booking/walk-in). |
| | 5 | Hệ thống | Backend khóa bàn (pessimistic lock). Kiểm tra bàn không đang BOOKED hoặc OCCUPIED. Kiểm tra xung đột giờ rời dự kiến (= hiện tại + 2 tiếng) với đơn đặt bàn kế tiếp cùng ngày. Tạo đơn mới: booking_status = CHECKED_IN, check_in_at = NOW(), expectedCheckOut = NOW() + 2h. Chuyển table_status → OCCUPIED. Lưu vào cơ sở dữ liệu. Phát thông báo realtime (WebSocket). Giải phóng khóa bàn. |
| | 6 | Hệ thống | Backend trả về kết quả thành công. |
| | 7 | Hệ thống | Giao diện đóng hộp thoại, tự động tải lại danh sách bàn. Trạng thái bàn cập nhật sang "Đang sử dụng". POS cho phép gọi món. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 5a | Hệ thống | Nếu bàn đang "Đã đặt" (BOOKED): Backend trả lỗi, giao diện hiển thị "Bàn đã giữ chỗ cho lịch hẹn". Nhân viên cần chọn bàn khác. |
| | 5b | Hệ thống | Nếu bàn có đơn "Đã xác nhận" (CONFIRMED) trong tương lai gần: Backend trả cảnh báo "Bàn có lịch đặt trước sau X phút". Nhân viên xác nhận tiếp tục (force=true) hoặc chọn bàn khác. |
| | 5c | Hệ thống | Nếu bàn có đơn "Chờ xác nhận" chưa cọc: hiển thị cảnh báo, gợi ý nhân viên gọi xác nhận khách trước khi xếp walk-in vào bàn đó. |
| | 5d | Hệ thống | Nếu 2 nhân viên cùng xếp walk-in vào 1 bàn (race condition): nhân viên thứ hai nhận lỗi "Bàn vừa có người đặt, vui lòng chọn bàn khác". |

| **Hậu điều kiện** | Đơn walk-in mới được tạo với trạng thái "Đã nhận bàn" (CHECKED_IN). Bàn chuyển sang "Đang sử dụng" (OCCUPIED). POS cho phép gọi món. Danh sách bàn trên giao diện được cập nhật. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

### UC-DB04 — Làm trống bàn

| Mã Use case | UC-DB04 | Tên Use case | Làm trống bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên giải phóng bàn đang ở trạng thái "Đang sử dụng" (OCCUPIED). Hệ thống tìm đơn đặt bàn đang hoạt động trên bàn đó (ưu tiên đơn CHECKED_IN chưa checkout), gọi API check-out để hoàn thành đơn. Bàn được chuyển về trạng thái "Bàn trống" (AVAILABLE). Sau khi thành công, giao diện mở hộp thoại chi tiết đơn vừa hoàn thành. |
| **Sự kiện kích hoạt chức năng** | Nhân viên chuột phải trên thẻ bàn → chọn "Làm trống" từ menu ngữ cảnh. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Bàn đang ở trạng thái "Đang sử dụng" (OCCUPIED). |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Chuột phải trên thẻ bàn đang ở trạng thái "Đang sử dụng", chọn "Làm trống" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Kiểm tra bàn có đang ở trạng thái "Đang sử dụng" (OCCUPIED). Hiển thị trạng thái "Đang làm trống..." trên menu. |
| | 3 | Hệ thống | Tìm đơn đặt bàn đang hoạt động trên bàn: gửi yêu cầu tìm kiếm đến Backend (POST /api/v1/table-booking/search) với điều kiện tableId và active=true. Ưu tiên đơn có trạng thái CHECKED_IN, chưa có checkOutAt. |
| | 4 | Hệ thống | Backend trả về danh sách đơn. Giao diện chọn đơn phù hợp nhất (ưu tiên CHECKED_IN > CONFIRMED > PENDING_CONFIRMATION, ưu tiên đơn chưa checkout). |
| | 5 | Hệ thống | Gửi yêu cầu check-out đến Backend (POST /api/v1/table-booking/{bookingId}/check-out). |
| | 6 | Hệ thống | Backend ghi nhận check_out_at = NOW(). Chuyển booking_status → COMPLETED. Chuyển table_status → AVAILABLE. Khấu trừ cọc vào hóa đơn (nếu có). Lưu vào cơ sở dữ liệu. Phát thông báo realtime (WebSocket). |
| | 7 | Hệ thống | Backend trả về kết quả thành công kèm bookingId đơn vừa hoàn thành. |
| | 8 | Hệ thống | Giao diện tự động tải lại danh sách bàn. Mở hộp thoại chi tiết đơn đặt bàn vừa hoàn thành (Booking Detail Dialog) để nhân viên xem lại thông tin. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 2a | Hệ thống | Nếu bàn không ở trạng thái "Đang sử dụng": hiển thị thông báo lỗi "Chỉ có thể làm trống bàn đang sử dụng." |
| | 4a | Hệ thống | Nếu không tìm thấy đơn đặt bàn đang hoạt động: hiển thị "Không tìm thấy booking đang hoạt động để checkout cho bàn này." |
| | 5a | Hệ thống | Nếu đơn chưa ở trạng thái cho phép checkout (CHECKED_IN): hiển thị "Booking hiện tại không ở trạng thái cho phép checkout." |
| | 5b | Hệ thống | Nếu bàn đang bị khóa bởi thao tác khác: hiển thị "Bàn đang được xử lý bởi người khác. Vui lòng thử lại sau ít giây." |
| | 5c | Hệ thống | Nếu nhân viên không có quyền: hiển thị "Bạn không có quyền checkout bàn này." |
| | 7a | Hệ thống | Nếu checkout thành công nhưng không nhận được bookingId hợp lệ: hiển thị cảnh báo, chỉ tải lại danh sách bàn mà không mở chi tiết đơn. |

| **Hậu điều kiện** | Đơn đặt bàn chuyển sang "Hoàn thành" (COMPLETED). Bàn chuyển về "Bàn trống" (AVAILABLE), sẵn sàng cho khách tiếp theo. Hộp thoại chi tiết đơn vừa hoàn thành được hiển thị. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

### UC-DB05 — Xem chi tiết bàn

| Mã Use case | UC-DB05 | Tên Use case | Xem chi tiết bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên xem thông tin chi tiết của một bàn cụ thể, bao gồm: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại, và các thông tin liên quan. Hệ thống mở hộp thoại chi tiết bàn (Table Detail Dialog) hiển thị đầy đủ thông tin. |
| **Sự kiện kích hoạt chức năng** | Nhân viên nhấp đúp chuột trên thẻ bàn, hoặc chọn "Xem chi tiết" từ menu chuột phải trên thẻ bàn. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Hệ thống đang hiển thị danh sách bàn trên màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhấp đúp chuột trên thẻ bàn, hoặc chuột phải → chọn "Xem chi tiết" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Gửi yêu cầu lấy thông tin chi tiết bàn đến Backend với tableId tương ứng. |
| | 3 | Hệ thống | Backend truy vấn cơ sở dữ liệu lấy thông tin chi tiết bàn. |
| | 4 | Hệ thống | Cơ sở dữ liệu trả về kết quả cho Backend. |
| | 5 | Hệ thống | Backend gửi kết quả về giao diện. |
| | 6 | Hệ thống | Giao diện mở hộp thoại "Chi tiết bàn" (Table Detail Dialog). Hiển thị đầy đủ thông tin bàn: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại, và thông tin đơn đặt bàn liên quan (nếu có). |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 3a | Hệ thống | Nếu bàn không tồn tại hoặc có lỗi kết nối: hiển thị thông báo lỗi trong hộp thoại. |

| **Hậu điều kiện** | Hộp thoại chi tiết bàn được hiển thị với đầy đủ thông tin. Nhân viên có thể đóng hộp thoại để quay lại danh sách bàn. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

## PHẦN 2 — MÔ TẢ SEQUENCE (HAPPY PATH)

---

### UC-DB01 — Tìm kiếm danh sách bàn và lọc theo tiêu chí (Happy Path)

1. Nhân viên nhập từ khóa (mã bàn, tên bàn) vào ô tìm kiếm và/hoặc chọn bộ lọc (Số chỗ, Trạng thái, Tầng) trên giao diện "Quản lý đặt bàn".
2. Giao diện tự động phát hiện sự thay đổi bộ lọc, gửi điều kiện lọc đến Backend.
3. Backend truy vấn cơ sở dữ liệu lấy danh sách bàn theo điều kiện lọc, phân trang.
4. Cơ sở dữ liệu trả về kết quả cho Backend.
5. Backend gửi kết quả về giao diện.
6. Giao diện hiển thị danh sách bàn dạng lưới thẻ (card grid), mỗi thẻ bàn hiển thị: tên bàn, mã bàn, số chỗ (kèm icon), badge trạng thái (màu sắc), thông tin metadata. Footer hiển thị tổng số bàn và phân trang.

---

### UC-DB02 — Đặt bàn (Happy Path)

1. Nhân viên nhấn nút "Đặt bàn mới" trên thanh công cụ (hoặc chuột phải trên thẻ bàn → chọn "Đặt bàn").
2. Giao diện mở hộp thoại "Tạo đơn đặt bàn" (POS Table Booking Dialog). Nếu chọn từ thẻ bàn, trường bàn được điền sẵn.
3. Nhân viên chọn bàn, nhập giờ đến (hệ thống tự tính giờ rời = giờ đến + 2 tiếng), nhập tên khách, SĐT, ghi chú. Nhấn "Lưu đơn đặt bàn".
4. Giao diện gửi thông tin đơn đặt bàn đến Backend (POST /api/v1/table-booking/create).
5. Backend khóa bàn (distributed lock theo tableId), load thông tin bàn từ cơ sở dữ liệu.
6. Backend validate: đặt trước ≥ 2h, giờ đến trong khung 06:00-20:00, giờ rời > giờ đến, không xung đột khung giờ.
7. Backend tạo bản ghi đơn đặt bàn (booking_status = PENDING_CONFIRMATION, is_active = 1), lưu vào cơ sở dữ liệu.
8. Cơ sở dữ liệu xác nhận lưu thành công.
9. Backend phát event BOOKING_CREATED qua WebSocket, giải phóng khóa bàn.
10. Backend trả kết quả thành công kèm thông tin đơn cho giao diện.
11. Giao diện đóng hộp thoại, tự động tải lại danh sách bàn để cập nhật trạng thái.

---

### UC-DB03 — Xếp khách vãng lai - Walk-in (Happy Path)

1. Khách vãng lai đến quán. Nhân viên chuột phải trên thẻ bàn trống, chọn "Khách vãng lai".
2. Giao diện mở hộp thoại đặt bàn ở chế độ Walk-in (POS Table Booking Dialog, walkIn=true), trường bàn được tự động điền sẵn.
3. Nhân viên nhập thông tin khách (không bắt buộc). Nhấn xác nhận xếp khách.
4. Giao diện gửi yêu cầu đến Backend (POST /api/v1/table-booking/walk-in).
5. Backend khóa bàn (pessimistic lock), kiểm tra bàn không đang BOOKED/OCCUPIED, kiểm tra xung đột giờ rời với đơn kế tiếp cùng ngày.
6. Backend tạo đơn mới: booking_status = CHECKED_IN, check_in_at = NOW(), expectedCheckOut = NOW() + 2h. Chuyển table_status → OCCUPIED. Lưu vào cơ sở dữ liệu.
7. Cơ sở dữ liệu xác nhận lưu thành công.
8. Backend phát event BOOKING_WALK_IN_CREATED qua WebSocket, giải phóng khóa bàn.
9. Backend trả kết quả thành công cho giao diện.
10. Giao diện đóng hộp thoại, tự động tải lại danh sách bàn. Trạng thái bàn cập nhật sang "Đang sử dụng". POS cho phép gọi món.

---

### UC-DB04 — Làm trống bàn (Happy Path)

1. Nhân viên chuột phải trên thẻ bàn đang ở trạng thái "Đang sử dụng", chọn "Làm trống" từ menu ngữ cảnh.
2. Giao diện kiểm tra bàn đang OCCUPIED. Hiển thị trạng thái "Đang làm trống...".
3. Giao diện gửi yêu cầu tìm kiếm đơn đặt bàn đang hoạt động trên bàn đến Backend (POST /api/v1/table-booking/search với tableId, active=true, sortField=checkInAt, sortDir=desc).
4. Backend trả về danh sách đơn. Giao diện chọn đơn ưu tiên CHECKED_IN chưa checkout.
5. Giao diện gửi yêu cầu check-out đến Backend (POST /api/v1/table-booking/{bookingId}/check-out).
6. Backend ghi nhận check_out_at = NOW(), chuyển booking_status → COMPLETED, chuyển table_status → AVAILABLE. Lưu vào cơ sở dữ liệu.
7. Cơ sở dữ liệu xác nhận cập nhật thành công.
8. Backend phát event BOOKING_CHECKED_OUT qua WebSocket.
9. Backend trả kết quả thành công kèm bookingId cho giao diện.
10. Giao diện tự động tải lại danh sách bàn. Mở hộp thoại chi tiết đơn vừa hoàn thành (Booking Detail Dialog) để nhân viên xem lại thông tin.

---

### UC-DB05 — Xem chi tiết bàn (Happy Path)

1. Nhân viên nhấp đúp chuột trên thẻ bàn (hoặc chuột phải → chọn "Xem chi tiết").
2. Giao diện gửi yêu cầu lấy thông tin chi tiết bàn đến Backend với tableId.
3. Backend truy vấn thông tin chi tiết bàn từ cơ sở dữ liệu.
4. Cơ sở dữ liệu trả về kết quả cho Backend.
5. Backend gửi kết quả về giao diện.
6. Giao diện mở hộp thoại "Chi tiết bàn" (Table Detail Dialog), hiển thị đầy đủ thông tin bàn: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại, và thông tin đơn đặt bàn liên quan (nếu có).
