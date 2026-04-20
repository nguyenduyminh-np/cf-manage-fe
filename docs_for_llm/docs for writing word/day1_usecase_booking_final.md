# ĐẶC TẢ USE CASE — MODULE QUẢN LÝ ĐẶT BÀN

> **Hệ thống:** CF-M — Chương trình Quản lý quán Café  
> **Module:** Quản lý đặt bàn  
> **Phiên bản:** 2.0  
> **Ngày:** 18/04/2026

---

## PHẦN 1 — BẢNG ĐẶC TẢ USE CASE

---

### UC-DB01 — Tìm kiếm danh sách bàn và lọc theo tiêu chí

| Mã Use case | UC-DB01 | Tên Use case | Tìm kiếm danh sách bàn và lọc theo tiêu chí |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên tìm kiếm và lọc danh sách bàn theo nhiều tiêu chí: từ khóa (mã bàn, tên bàn), số chỗ ngồi (2, 4, 6, 8), trạng thái bàn (Bàn trống, Đang sử dụng, Đã đặt), tầng (Tầng 1, 2, 3). Kết quả hiển thị dạng lưới thẻ bàn với phân trang. Hệ thống tự động lọc khi nhân viên thay đổi bất kỳ tiêu chí nào. |
| **Sự kiện kích hoạt chức năng** | Nhân viên truy cập vào màn hình "Quản lý đặt bàn", hoặc thay đổi giá trị bộ lọc (từ khóa, số chỗ, trạng thái, tầng), hoặc nhấn nút "Tìm kiếm". |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập vào hệ thống với quyền phù hợp. <br> 2. Hệ thống đang hiển thị màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhập từ khóa tìm kiếm (mã bàn, tên bàn) vào ô tìm kiếm và/hoặc chọn bộ lọc: Số chỗ (Tất cả / 2 / 4 / 6 / 8 chỗ), Trạng thái (Tất cả / Bàn trống / Đang sử dụng / Đã đặt), Tầng (Tất cả / Tầng 1 / Tầng 2 / Tầng 3). |
| | 2 | Hệ thống | Tự động phát hiện sự thay đổi bộ lọc và gửi điều kiện lọc để xử lý. |
| | 3 | Hệ thống | Truy vấn cơ sở dữ liệu lấy danh sách bàn theo điều kiện lọc. |
| | 4 | Hệ thống | Nhận kết quả từ cơ sở dữ liệu. |
| | 5 | Hệ thống | Hiển thị danh sách bàn dạng lưới thẻ. Mỗi thẻ bàn hiển thị: tên bàn, mã bàn, số chỗ ngồi (kèm biểu tượng nhóm/cá nhân), nhãn trạng thái bàn (màu sắc tương ứng), thông tin bổ sung (giờ đến, khách, số điện thoại...). Phần chân trang hiển thị tổng số bàn và thanh phân trang. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 2a | Hệ thống | Nếu đang tải dữ liệu: hiển thị thông báo "Đang tải dữ liệu bàn. Vui lòng chờ trong giây lát." và vô hiệu hóa nút Tìm kiếm. |
| | 2b | Hệ thống | Nếu có lỗi kết nối hoặc lỗi máy chủ: hiển thị thông báo lỗi kèm nút "Tải lại danh sách" để nhân viên thử lại. |
| | 5a | Hệ thống | Nếu không tìm thấy bàn phù hợp: hiển thị thông báo "Không tìm thấy bàn phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc để xem kết quả khác." |

| **Hậu điều kiện** | Danh sách bàn tương ứng với điều kiện lọc được hiển thị trên giao diện dạng lưới thẻ, kèm phân trang. |
|---|---|
| **Điểm mở rộng** | Nhấp chuột lên thẻ bàn → mở lịch sử đặt bàn của bàn đó. Nhấp đúp → mở chi tiết bàn. Chuột phải → menu thao tác nhanh (Lịch sử, Đặt bàn, Khách vãng lai, Làm trống, Xem chi tiết). Nhấn tab Tầng 1/2/3 → lọc nhanh theo tầng. Nhấn nút phân trang → chuyển trang danh sách. |

---

### UC-DB02 — Đặt bàn

| Mã Use case | UC-DB02 | Tên Use case | Đặt bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên tạo đơn đặt bàn mới cho khách hàng (qua điện thoại hoặc trực tiếp). Hệ thống mở hộp thoại đặt bàn để nhân viên nhập thông tin: bàn, giờ đến dự kiến, giờ rời (tự động tính bằng giờ đến cộng 2 tiếng), tên khách, số điện thoại, ghi chú, thông tin đặt cọc. Hệ thống kiểm tra các điều kiện hợp lệ (thời gian đặt trước tối thiểu 2 tiếng, giờ đến trong khung 06:00-20:00, không trùng khung giờ) và lưu đơn với trạng thái "Chờ xác nhận". Trạng thái bàn vẫn giữ nguyên là "Bàn trống". |
| **Sự kiện kích hoạt chức năng** | Nhân viên nhấn nút "Đặt bàn mới" trên thanh công cụ, hoặc chọn "Đặt bàn" từ menu chuột phải trên thẻ bàn. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống với quyền phù hợp. <br> 2. Hệ thống đang hiển thị màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhấn nút "Đặt bàn mới" trên thanh công cụ, hoặc chuột phải trên thẻ bàn → chọn "Đặt bàn". |
| | 2 | Hệ thống | Mở hộp thoại "Tạo đơn đặt bàn". Nếu nhân viên chọn bàn cụ thể từ menu chuột phải, trường bàn sẽ được tự động điền sẵn. Hiển thị mẫu nhập thông tin: Bàn, Giờ đến, Giờ rời, Tên khách, Số điện thoại, Ghi chú, Thông tin đặt cọc, kèm danh sách khung giờ trống gợi ý. |
| | 3 | Nhân viên | Chọn bàn (nếu chưa chọn), nhập giờ đến dự kiến. Hệ thống tự tính giờ rời bằng giờ đến cộng 2 tiếng (nhân viên có thể điều chỉnh). Nhập tên khách, số điện thoại, ghi chú nếu cần. Nhấn nút "Lưu đơn đặt bàn". |
| | 4 | Hệ thống | Tiếp nhận thông tin và tiến hành xử lý. Hệ thống tạm khóa bàn để tránh xung đột đồng thời. Kiểm tra: thời gian đặt trước tối thiểu 2 tiếng, giờ đến trong khung 06:00-20:00, giờ rời lớn hơn giờ đến, khung giờ không trùng với đơn đặt bàn khác trên cùng bàn. Tạo bản ghi đơn đặt bàn với trạng thái "Chờ xác nhận", lưu vào cơ sở dữ liệu. Gửi thông báo cập nhật tức thời đến các nhân viên khác. Giải phóng khóa bàn. |
| | 5 | Hệ thống | Đóng hộp thoại, tự động làm mới danh sách bàn để cập nhật trạng thái mới nhất. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 4a | Hệ thống | Nếu thời gian đặt trước ít hơn 2 tiếng: hiển thị thông báo "Phải đặt trước ít nhất 2 tiếng". Quay lại bước 3. |
| | 4b | Hệ thống | Nếu giờ đến dự kiến nằm ngoài khung 06:00-20:00: hiển thị thông báo "Thời gian đến phải nằm trong khoảng 06:00 - 20:00". Quay lại bước 3. |
| | 4c | Hệ thống | Nếu khung giờ trùng với đơn đặt bàn khác: hiển thị "Bàn đã có người đặt vào khung giờ này" kèm gợi ý khung giờ trống. Quay lại bước 3. |
| | 4d | Hệ thống | Nếu bàn đang bị khóa bởi thao tác khác (xung đột đồng thời): hiển thị "Bàn đang được thao tác bởi người khác, vui lòng thử lại". |
| | 3a | Nhân viên | Nếu khách thanh toán tiền cọc ngay lập tức: nhân viên nhập thông tin cọc trong hộp thoại. Hệ thống sau khi tạo đơn sẽ tự động chuyển sang trạng thái "Đã xác nhận". |

| **Hậu điều kiện** | Đơn đặt bàn mới được tạo với trạng thái "Chờ xác nhận". Trạng thái bàn vẫn là "Bàn trống". Danh sách bàn trên giao diện được cập nhật. |
|---|---|
| **Điểm mở rộng** | Nếu khách đặt cọc ngay → đơn tự động chuyển sang "Đã xác nhận". |

---

### UC-DB03 — Đặt bàn cho khách không đặt trước

| Mã Use case | UC-DB03 | Tên Use case | Đặt bàn cho khách không đặt trước |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Phục vụ khách đến trực tiếp quán mà không đặt trước. Nhân viên chọn bàn trống và tạo đơn đặt bàn dạng check-in ngay lập tức. Hệ thống mở hộp thoại đặt bàn ở chế độ khách vãng lai, nhân viên nhập thông tin khách (không bắt buộc). Đơn được tạo với trạng thái "Đã nhận bàn" và bàn chuyển sang "Đang sử dụng". POS cho phép gọi món ngay. Thời gian sử dụng mặc định là 2 tiếng. |
| **Sự kiện kích hoạt chức năng** | Nhân viên chuột phải trên thẻ bàn → chọn "Khách vãng lai" từ menu ngữ cảnh. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Bàn được chọn đang ở trạng thái "Bàn trống", không bị "Đã đặt". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Chuột phải trên thẻ bàn trống, chọn "Khách vãng lai" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Mở hộp thoại đặt bàn ở chế độ khách vãng lai. Hiển thị mẫu nhập thông tin khách: Tên khách, Số điện thoại (không bắt buộc). Các thông tin về bàn, trạng thái đơn được tự động thiết lập nhanh chóng. |
| | 3 | Nhân viên | Nhập thông tin khách (nếu có) và nhấn nút xác nhận xếp khách. |
| | 4 | Hệ thống | Tạo yêu cầu đặt bàn cho khách vãng lai. Hệ thống tạm khóa bàn, kiểm tra bàn không ở trạng thái "Đã đặt" hoặc "Đang sử dụng". Kiểm tra thời gian dự kiến rời đi (hiện tại cộng 2 tiếng) không xung đột với đơn đặt bàn kế tiếp cùng ngày. Tạo đơn mới với trạng thái "Đã nhận bàn", giờ nhận bàn là hiện tại, giờ dự kiến rời là hiện tại cộng 2 tiếng. Chuyển trạng thái bàn sang "Đang sử dụng". Lưu vào cơ sở dữ liệu và gửi thông báo cập nhật tức thời. Giải phóng khóa bàn. |
| | 5 | Hệ thống | Đóng hộp thoại, tự động làm mới danh sách bàn. Trạng thái bàn cập nhật sang "Đang sử dụng". POS cho phép gọi món. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 4a | Hệ thống | Nếu bàn đang "Đã đặt": hiển thị thông báo "Bàn đã giữ chỗ cho lịch hẹn". Nhân viên cần chọn bàn khác. |
| | 4b | Hệ thống | Nếu bàn có đơn "Đã xác nhận" trong tương lai gần: hiển thị cảnh báo "Bàn có lịch đặt trước sau X phút". Nhân viên có thể xác nhận tiếp tục hoặc chọn bàn khác. |
| | 4c | Hệ thống | Nếu bàn có đơn "Chờ xác nhận" chưa cọc: hiển thị cảnh báo, gợi ý nhân viên gọi xác nhận khách trước khi xếp khách vãng lai vào bàn đó. |
| | 4d | Hệ thống | Nếu hai nhân viên cùng xếp khách vào một bàn cùng lúc (xung đột đồng thời): nhân viên thứ hai nhận lỗi "Bàn vừa có người đặt, vui lòng chọn bàn khác". |

| **Hậu điều kiện** | Đơn đặt bàn mới được tạo với trạng thái "Đã nhận bàn". Bàn chuyển sang "Đang sử dụng". POS cho phép gọi món. Danh sách bàn trên giao diện được cập nhật. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

### UC-DB04 — Làm trống bàn

| Mã Use case | UC-DB04 | Tên Use case | Làm trống bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên giải phóng bàn đang ở trạng thái "Đang sử dụng". Hệ thống tìm đơn đặt bàn đang hoạt động trên bàn đó (ưu tiên đơn "Đã nhận bàn" chưa kết thúc), tiến hành hoàn thành đơn. Bàn được chuyển về trạng thái "Bàn trống". Sau khi thành công, giao diện mở hộp thoại chi tiết đơn vừa hoàn thành để nhân viên xem lại. |
| **Sự kiện kích hoạt chức năng** | Nhân viên chuột phải trên thẻ bàn → chọn "Làm trống" từ menu ngữ cảnh. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Bàn đang ở trạng thái "Đang sử dụng". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Chuột phải trên thẻ bàn đang ở trạng thái "Đang sử dụng", chọn "Làm trống" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Xác nhận bàn đang ở trạng thái "Đang sử dụng". Hiển thị trạng thái "Đang làm trống..." trên menu. |
| | 3 | Hệ thống | Tìm đơn đặt bàn đang hoạt động trên bàn. Ưu tiên đơn có trạng thái "Đã nhận bàn" và chưa có thời gian kết thúc. |
| | 4 | Hệ thống | Tiến hành hoàn thành đơn: ghi nhận thời gian kết thúc là hiện tại. Chuyển trạng thái đơn sang "Hoàn thành". Chuyển trạng thái bàn về "Bàn trống". Khấu trừ tiền cọc vào hóa đơn (nếu có). Lưu thay đổi vào cơ sở dữ liệu. Gửi thông báo cập nhật tức thời. |
| | 5 | Hệ thống | Làm mới danh sách bàn. Mở hộp thoại chi tiết đơn đặt bàn vừa hoàn thành để nhân viên xem lại thông tin. |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 2a | Hệ thống | Nếu bàn không ở trạng thái "Đang sử dụng": hiển thị thông báo lỗi "Chỉ có thể làm trống bàn đang sử dụng." |
| | 3a | Hệ thống | Nếu không tìm thấy đơn đặt bàn đang hoạt động: hiển thị "Không tìm thấy đơn đặt bàn đang hoạt động để kết thúc cho bàn này." |
| | 4a | Hệ thống | Nếu đơn không ở trạng thái cho phép kết thúc: hiển thị "Đơn đặt bàn hiện tại không ở trạng thái cho phép kết thúc." |
| | 4b | Hệ thống | Nếu bàn đang bị khóa bởi thao tác khác: hiển thị "Bàn đang được xử lý bởi người khác. Vui lòng thử lại sau ít giây." |
| | 4c | Hệ thống | Nếu nhân viên không có quyền thực hiện: hiển thị "Bạn không có quyền kết thúc bàn này." |

| **Hậu điều kiện** | Đơn đặt bàn chuyển sang trạng thái "Hoàn thành". Bàn chuyển về trạng thái "Bàn trống", sẵn sàng cho khách tiếp theo. Hộp thoại chi tiết đơn vừa hoàn thành được hiển thị. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

### UC-DB05 — Xem chi tiết bàn

| Mã Use case | UC-DB05 | Tên Use case | Xem chi tiết bàn |
|---|---|---|---|
| **Tác nhân** | Nhân viên |
| **Mô tả** | Cho phép nhân viên xem thông tin chi tiết của một bàn cụ thể, bao gồm: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại và các thông tin liên quan. Hệ thống mở hộp thoại chi tiết bàn hiển thị đầy đủ thông tin. |
| **Sự kiện kích hoạt chức năng** | Nhân viên nhấp đúp chuột trên thẻ bàn, hoặc chọn "Xem chi tiết" từ menu chuột phải trên thẻ bàn. |
| **Tiền điều kiện** | 1. Nhân viên đã đăng nhập hệ thống. <br> 2. Hệ thống đang hiển thị danh sách bàn trên màn hình "Quản lý đặt bàn". |

| Luồng sự kiện chính | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 1 | Nhân viên | Nhấp đúp chuột trên thẻ bàn, hoặc chuột phải → chọn "Xem chi tiết" từ menu ngữ cảnh. |
| | 2 | Hệ thống | Gửi yêu cầu lấy thông tin chi tiết bàn với mã bàn tương ứng. |
| | 3 | Hệ thống | Truy vấn cơ sở dữ liệu lấy thông tin chi tiết bàn. |
| | 4 | Hệ thống | Nhận kết quả từ cơ sở dữ liệu. |
| | 5 | Hệ thống | Mở hộp thoại "Chi tiết bàn". Hiển thị đầy đủ thông tin bàn: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại và thông tin đơn đặt bàn liên quan (nếu có). |

| Luồng sự kiện rẽ nhánh | TT | Thực hiện bởi | Hành động |
|---|---|---|---|
| | 3a | Hệ thống | Nếu bàn không tồn tại hoặc có lỗi kết nối: hiển thị thông báo lỗi trong hộp thoại. |

| **Hậu điều kiện** | Hộp thoại chi tiết bàn được hiển thị với đầy đủ thông tin. Nhân viên có thể đóng hộp thoại để quay lại danh sách bàn. |
|---|---|
| **Điểm mở rộng** | Không có. |

---

## PHẦN 2 — MÔ TẢ LUỒNG HOẠT ĐỘNG CHÍNH

---

### UC-DB01 — Tìm kiếm danh sách bàn và lọc theo tiêu chí

1. Nhân viên nhập từ khóa (mã bàn, tên bàn) vào ô tìm kiếm và/hoặc chọn bộ lọc (Số chỗ, Trạng thái, Tầng) trên giao diện "Quản lý đặt bàn".
2. Hệ thống tự động phát hiện sự thay đổi bộ lọc và gửi điều kiện lọc để xử lý.
3. Hệ thống truy vấn cơ sở dữ liệu lấy danh sách bàn theo điều kiện lọc, có phân trang.
4. Hệ thống nhận kết quả từ cơ sở dữ liệu.
5. Hệ thống hiển thị danh sách bàn dạng lưới thẻ, mỗi thẻ bàn hiển thị: tên bàn, mã bàn, số chỗ (kèm biểu tượng), nhãn trạng thái (màu sắc), thông tin bổ sung. Chân trang hiển thị tổng số bàn và phân trang.

---

### UC-DB02 — Đặt bàn

1. Nhân viên nhấn nút "Đặt bàn mới" trên thanh công cụ (hoặc chuột phải trên thẻ bàn → chọn "Đặt bàn").
2. Hệ thống mở hộp thoại "Tạo đơn đặt bàn". Nếu chọn từ thẻ bàn, trường bàn được điền sẵn.
3. Nhân viên chọn bàn, nhập giờ đến (hệ thống tự tính giờ rời bằng giờ đến cộng 2 tiếng), nhập tên khách, số điện thoại, ghi chú. Nhấn "Lưu đơn đặt bàn".
4. Hệ thống tiếp nhận thông tin và tiến hành xử lý. Hệ thống tạm khóa bàn để tránh xung đột đồng thời.
5. Hệ thống kiểm tra: thời gian đặt trước tối thiểu 2 tiếng, giờ đến trong khung 06:00-20:00, giờ rời lớn hơn giờ đến, không trùng khung giờ với đơn khác trên cùng bàn.
6. Hệ thống tạo bản ghi đơn đặt bàn với trạng thái "Chờ xác nhận", lưu vào cơ sở dữ liệu.
7. Hệ thống gửi thông báo cập nhật tức thời đến các nhân viên khác và giải phóng khóa bàn.
8. Hệ thống đóng hộp thoại và tự động làm mới danh sách bàn để cập nhật trạng thái.

---

### UC-DB03 — Đặt bàn cho khách không đặt trước

1. Khách vãng lai đến quán. Nhân viên chuột phải trên thẻ bàn trống, chọn "Khách vãng lai".
2. Hệ thống mở hộp thoại đặt bàn ở chế độ khách vãng lai, các trường thông tin bàn được tự động điền sẵn.
3. Nhân viên nhập thông tin khách (nếu có) và nhấn xác nhận xếp khách.
4. Hệ thống tạo yêu cầu đặt bàn cho khách vãng lai. Hệ thống tạm khóa bàn.
5. Hệ thống kiểm tra bàn không ở trạng thái "Đã đặt" hoặc "Đang sử dụng". Kiểm tra thời gian dự kiến rời đi không xung đột với đơn đặt bàn kế tiếp cùng ngày.
6. Hệ thống tạo đơn mới với trạng thái "Đã nhận bàn", giờ nhận bàn là hiện tại, giờ dự kiến rời là hiện tại cộng 2 tiếng. Chuyển trạng thái bàn sang "Đang sử dụng". Lưu vào cơ sở dữ liệu.
7. Hệ thống gửi thông báo cập nhật tức thời và giải phóng khóa bàn.
8. Hệ thống đóng hộp thoại và tự động làm mới danh sách bàn. Trạng thái bàn cập nhật sang "Đang sử dụng". POS cho phép gọi món.

---

### UC-DB04 — Làm trống bàn

1. Nhân viên chuột phải trên thẻ bàn đang ở trạng thái "Đang sử dụng", chọn "Làm trống" từ menu ngữ cảnh.
2. Hệ thống xác nhận bàn đang ở trạng thái "Đang sử dụng" và hiển thị trạng thái "Đang làm trống...".
3. Hệ thống tìm đơn đặt bàn đang hoạt động trên bàn (ưu tiên đơn "Đã nhận bàn" chưa kết thúc).
4. Hệ thống tiến hành hoàn thành đơn: ghi nhận thời gian kết thúc là hiện tại. Chuyển trạng thái đơn sang "Hoàn thành". Chuyển trạng thái bàn về "Bàn trống". Lưu vào cơ sở dữ liệu.
5. Hệ thống gửi thông báo cập nhật tức thời.
6. Hệ thống làm mới danh sách bàn và mở hộp thoại chi tiết đơn vừa hoàn thành để nhân viên xem lại.

---

### UC-DB05 — Xem chi tiết bàn

1. Nhân viên nhấp đúp chuột trên thẻ bàn (hoặc chuột phải → chọn "Xem chi tiết").
2. Hệ thống gửi yêu cầu lấy thông tin chi tiết bàn với mã bàn tương ứng.
3. Hệ thống truy vấn thông tin chi tiết bàn từ cơ sở dữ liệu.
4. Hệ thống nhận kết quả.
5. Hệ thống mở hộp thoại "Chi tiết bàn", hiển thị đầy đủ thông tin bàn: mã bàn, tên bàn, số chỗ ngồi, tầng, trạng thái hiện tại và thông tin đơn đặt bàn liên quan (nếu có).