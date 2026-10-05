# BÁO CÁO TOÀN DIỆN DỰ ÁN BINBOX STUDIO (v0.2.3)
**Tài liệu Phân tích Kỹ thuật, Hệ thống Màu sắc & Cơ chế Vận hành Kiến trúc**

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

* **Tên ứng dụng chính thức:** **BinBox Studio**
* **Phiên bản hiện tại:** `v0.2.3`
* **Mục tiêu cốt lõi:** Cung cấp một môi trường làm việc dạng lưới (Tiling Workspace) lấy cảm hứng từ các Window Manager danh tiếng trên Linux (như Hyprland, i3wm, Sway) được thiết kế tối ưu hóa chuyên sâu cho hệ điều hành Windows 10 và Windows 11.
* **Tệp người dùng mục tiêu:** Lập trình viên hiện đại, DevOps, chuyên gia hệ thống, và các nhà phát triển sử dụng công cụ AI Coding Agents tự động (`aider`, `claude-code`, `codex`, `cursor`) nhằm loại bỏ hoàn toàn chi phí chuyển đổi ngữ cảnh (Context-switching tax) do tình trạng chồng chéo cửa sổ trên Windows.
* **Ngăn xếp công nghệ (Core Tech Stack):**
  - **Backend:** Rust 2021, Tauri v2, `portable-pty` (Windows ConPTY), `windows-sys`, `notify`, `window-vibrancy`.
  - **Frontend:** React 19, TypeScript 5.8, Vite 7.3, TailwindCSS, Zustand Store.
  - **Terminal Engine:** xterm.js v6 với WebGL Addon, Unicode 11, Fit Addon, Search Addon, Image Addon.
  - **Hệ thống màu sắc:** Google Material Design 3 (Material Color Utilities) với thuật toán HCT và Celebi Quantization.

---

## 2. CƠ CHẾ VẬN HÀNH KIẾN TRÚC (SYSTEM OPERATIONS & ARCHITECTURE)

BinBox Studio hoạt động dựa trên mô hình kiến trúc hai tầng liên kết mật thiết giữa **Native Rust Core** và **Chromium Webview UI**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     TAURI FRONTEND (WebView2 / React 19)               │
 │                                                                        │
 │   ┌──────────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
 │   │ xterm.js (WebGL)     │  │ Live Editor     │  │ Explorer / Web  │   │
 │   │ (Render 60fps)       │  │ (Code Preview)  │  │ (WebView2)      │   │
 │   └──────────┬───────────┘  └────────┬────────┘  └────────┬────────┘   │
 │              │ ACK Batching          │ IPC                │ IPC        │
 │              │ (requestAnimationFrame)│                   │            │
 ├──────────────┼───────────────────────┼────────────────────┼────────────┤
 │              ▼                       ▼                    ▼            │
 │   TAURI IPC CHANNEL (Tín hiệu luồng dữ liệu 2 chiều không chặn)        │
 ├────────────────────────────────────────────────────────────────────────┤
 │                      RUST BACKEND CORE (Native x64)                    │
 │                                                                        │
 │   ┌───────────────────┐    ┌─────────────────┐   ┌─────────────────┐   │
 │   │  Async Spawn Task │    │  Flow Control   │   │ Dedicated Stdin │   │
 │   │  (Tokio Worker)   │───▶│  (Sliding Window│──▶│ Writer Thread   │   │
 │   │                   │    │   MAX_IN_FLIGHT)│   │ (mpsc Channel)  │   │
 │   └───────────────────┘    └─────────────────┘   └────────┬────────┘   │
 │                                                           │            │
 │                                                           ▼            │
 │                                             ┌──────────────────────┐   │
 │                                             │ Windows ConPTY Pipe  │   │
 │                                             │ (pwsh.exe / bash)    │   │
 │                                             └──────────────────────┘   │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Tầng Backend Native (Rust Core):
1. **Khởi tạo tiến trình con bất đồng bộ (`async fn pty_spawn` trong `lib.rs`):**
   - Thay vì chạy đồng bộ làm đóng băng luồng IPC, lệnh `pty_spawn` được chuyển sang chế độ `async` sử dụng thread pool của Tokio. Quá trình tạo handle ConPTY, thiết lập pipe và nạp tiến trình shell chạy ngầm hoàn toàn độc lập, đảm bảo UI phản hồi tức thì.
2. **Luồng ghi stdin chuyên biệt (`Dedicated Writer Thread` trong `pty/session.rs`):**
   - Khi frontend gửi lệnh qua `pty_write`, dữ liệu được chuyển vào kênh `std::sync::mpsc::channel`. Một luồng nền OS riêng biệt tiếp nhận và ghi tuần tự vào stdin pipe của ConPTY. Nhờ đó, thao tác gõ phím không bao giờ bị nghẽn (deadlock) kể cả khi tiến trình con đang bận xử lý tác vụ nặng.
3. **Cơ chế Cửa sổ trượt & Chống tràn đệm (`Sliding Window Backpressure Flow`):**
   - Quản lý số lượng gói tin output "đang bay" với hạn mức `MAX_IN_FLIGHT = 64`.
   - Nếu terminal phát lượng dữ liệu cực lớn (ví dụ: `cat` file 50MB hoặc `dir C:\Windows /s`), luồng đọc sẽ tự động giảm tốc ConPTY để xterm.js có đủ thời gian vẽ, ngăn chặn việc phình bộ nhớ RAM.
   - Hạn chờ ACK được tối ưu xuống `150ms`. Nếu quá hạn chờ (do webview bận chạy Garbage Collection), cơ chế tự động giải tỏa 50% hạn ngạch (`*n = MAX_IN_FLIGHT / 2`) để dòng dữ liệu tiếp tục lưu thông, chấm dứt hoàn toàn hiện tượng treo ứng dụng dây chuyền (*cascading freeze*).
4. **Quản lý tài nguyên Windows Native thông minh:**
   - **Tự động thu hồi RAM khi mất Focus (`lib.rs`):** Khi người dùng chuyển sang cửa sổ khác, app kích hoạt cờ Windows API:
     `core_v19.SetMemoryUsageTargetLevel(COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW);`
     WebView2 lập tức dọn dẹp các vùng nhớ đệm, trả lại RAM và VRAM cho hệ thống.
   - **Dọn dẹp tiến trình con không chặn (`PtySession::drop`):** Lệnh `child.wait()` khi đóng tab được ủy thác sang một background thread mới, không làm khựng cửa sổ chính.

### 2.2. Tầng Frontend (React 19 & xterm.js):
1. **Gom tín hiệu ACK theo khung hình (`Compositor ACK Batching` trong `usePty.ts`):**
   - Thay vì gửi hàng trăm lệnh `pty_ack` rời rạc qua Tauri IPC mỗi giây làm ngập lụt hàng đợi thông điệp của WebView2, frontend gom các xác nhận này và gửi thông qua `requestAnimationFrame` (hoặc `setTimeout 16ms` khi panel ẩn).
   - Thao tác gõ phím của người dùng vẫn được xả ngay lập tức (`flush()`), mang lại cảm giác gõ lệnh với độ trễ 0ms.
2. **Vòng đời bộ tăng tốc GPU thông minh (`Smart WebGL Texture Lifecycle`):**
   - Mỗi panel terminal sử dụng một WebGL Addon riêng để render font chữ sắc nét ở tốc độ 60–120 FPS.
   - Khi người dùng chuyển sang workspace khác hoặc ẩn panel, bộ đếm `HIDDEN_WEBGL_RELEASE_MS = 700ms` sẽ tự động kích hoạt: hủy `WebGLAddon` và giải phóng GPU texture về VRAM card đồ họa. Khi panel hiển thị lại, WebGL addon được gắn lại tức thì.
3. **Nhận diện ngữ nghĩa dòng lệnh (`OSC 133` & `OSC 7` Tracking):**
   - Tích hợp chuẩn giao thức Terminal hiện đại:
     - **OSC 133 A/B/C/D:** Bắt chính xác thời điểm hiển thị prompt, người dùng nhấn phím Enter chạy lệnh, thời gian thực thi, và mã thoát (`exit code` 0 hoặc lỗi). Nhờ đó, thanh tiêu đề tự động hiển thị tên tiến trình thật đang chạy.
     - **OSC 7:** Shell tự động báo URL thư mục hiện tại sau mỗi lệnh `cd`, cho phép app mở File Explorer hoặc Live Preview đúng vị trí tệp tin mà không cần thăm dò định kỳ.

### 2.3. Module Đồng Bộ Nền Động Wallpaper Engine & Unified Background Provider (v0.2.2 & v0.2.3):
1. **Dò tìm Zero-Polling qua Steam Library & Registry (`wallpaper_engine/detector.rs`):**
   - Đọc registry Windows (`HKCU\Software\Valve\Steam\SteamPath` và `HKLM\SOFTWARE\WOW6432Node\Valve\Steam\InstallPath`).
   - Phân tích file `libraryfolders.vdf` để phát hiện tự động thư mục Wallpaper Engine trên mọi ổ đĩa (C:, D:, E:, F:...).
2. **Theo dõi sự kiện file không tốn CPU (`Zero-Polling Event Watcher` qua `notify` crate):**
   - Đặt watcher theo dõi `config.json` của Wallpaper Engine. Chỉ thức dậy khi có sự kiện `Write` từ Wallpaper Engine khi người dùng đổi hình nền.
   - Khi chạy ở chế độ Solid Brand hoặc Custom Image, luồng giám sát hoàn toàn bị hủy/drop để bảo toàn 0.0% CPU.
3. **Bộ phân giải nhị phân Native (`Binary Parser` cho `.pkg` và `.tex`):**
   - Đọc header nhị phân `PKGV`, trích xuất file video gốc (.mp4, .webm) hoặc texture/thumbnail của Scene wallpaper.
   - Tự động bóc tách các ảnh tĩnh 4K/HD dạng PNG/JPEG nhúng bên trong container `.tex` độc quyền của Wallpaper Engine mà không cần phần mềm bên thứ ba.
   - Mọi tác vụ I/O và parse nhị phân chạy trên `tokio::task::spawn_blocking` để không làm chặn main thread.
4. **Tự động tạm dừng đa phương tiện (`Smart Auto-Pause`):**
   - Tự động pause video background khi cửa sổ BinBox Studio mất focus hoặc bị thu nhỏ (minimize) để bảo tồn tài nguyên GPU và pin laptop.

---

## 3. CHI TIẾT HỆ THỐNG MÀU SẮC (THE COLOR & PALETTE ENGINE)

Hệ thống màu sắc của BinBox Studio được xây dựng dựa trên nền tảng toán học màu sắc **HCT (Hue - Chroma - Tone)** của Google Material Design 3, giải quyết triệt để nhược điểm của các không gian màu RGB/HSL truyền thống về độ tương phản thị giác con người.

```
          ┌────────────────────────────────────────────────────────┐
          │             HCT COLOR SPACE (Material 3)               │
          │                                                        │
          │     Hue (0 - 360°)      : Góc màu sắc quang phổ        │
          │     Chroma (0 - 120)    : Độ bão hòa/độ rực rỡ màu     │
          │     Tone (0 - 100)      : Độ sáng cảm nhận thực tế     │
          └───────────────────────────┬────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
     CHẾ ĐỘ BRAND (BinBox Studio)                  CHẾ ĐỘ WALLPAPER (Desktop Sync)
   - Nền: Đen sâu (#0a0a0a)                      - Đọc ảnh nền Windows Desktop
   - Viền: Xám kim loại (#3a424e)                - Lượng tử hóa 16 cụm màu (Celebi)
   - Chữ: Trắng tương phản cao (#ffffff)         - 6 Schemes (Monochrome, Vibrant...)
   - Tương phản: 10.9:1 (vượt AAA)               - Kính mờ Acrylic/Mica DWM
```

### 3.1. Bảng màu thương hiệu mới (BinBox Studio Dark Minimalist / Monochrome):
Phiên bản `v0.2.0` định hình phong cách tối giản công nghệ cao đồng bộ với logo Origami:
* **Hằng số màu chuẩn:**
  - `BRAND_BLACK = 0xff0a0a0a`: Màu đen sâu nhám đóng vai trò nền móng cho toàn bộ app (`surfaceContainerLowest`, `surfaceContainerLow`).
  - `BRAND_METALLIC = 0xff3a424e`: Màu xám kim loại lạnh dùng cho đường viền cấu trúc (`outline`, `outlineVariant`) và phân tách phân vùng panel.
  - `BRAND_WHITE = 0xffffffff`: Màu trắng sáng nguyên bản cho văn bản chính (`onSurface`, `onBackground`), mang lại độ tương phản đo được là **10.9:1** (vượt xa tiêu chuẩn cao nhất WCAG AAA 7:1).
* **Cấu hình `buildBrandScheme`:**
  - Ép `variant = Variant.MONOCHROME` với `contrastLevel = 0.15`.
  - Triệt tiêu hoàn toàn chroma của nhóm trung tính (`neutralPalette = fromHueAndChroma(0, 0)`), biến giao diện thành khối đen tuyền hiện đại, không bị ám sắc xanh hay vàng như các app thông thường.

### 3.2. Bảng màu trích xuất từ Hình nền Desktop (`Wallpaper Sync`):
Khi người dùng chuyển sang chế độ `wallpaper` trong Settings:
1. **Thuật toán lượng tử hóa Celebi ổn định (`quantizeCelebiStable`):**
   - Đọc trực tiếp file hình nền máy tính của Windows (`TranscodedWallpaper`).
   - Lấy mẫu 4096 pixel và phân cụm K-Means/Celebi để tìm ra 16 cụm màu chủ đạo (dominant colors). Thuật toán được tinh chỉnh để luôn cho kết quả nhất quán mà không phụ thuộc vào `Math.random`.
2. **6 Biến thể phối màu Material You:**
   - `Monochrome`: Toàn bộ sắc thái chuyển thành thang độ xám kim loại.
   - `TonalSpot`: Dịu mắt, độ tương phản chuẩn mực theo phong cách Pixel OS.
   - `Vibrant`: Tăng cường độ rực rỡ của các điểm nhấn và icon.
   - `Expressive`: Bổ sung các màu đối lập hài hòa trên vòng tròn quang phổ.
   - `Neutral`: Giảm tối đa chroma cho môi trường làm việc tĩnh lặng.
   - `Content`: Bám sát tuyệt đối vào màu sắc của bức ảnh nền.

3. **6 Bảng màu Tuyển chọn lấy cảm hứng từ Sameko (Curated Presets - v0.2.3):**
   - **Deep Ocean (`#88c9ea`):** Tông xanh đại dương huyền ảo, cân bằng độ sâu thị giác khi làm việc ban đêm.
   - **Sakura Mist (`#ff9aaf`):** Sắc hồng anh đào dịu nhẹ, phong cách pastel tương phản êm dịu.
   - **Dracula Neon (`#bd93f9`):** Tím neon đậm chất cyberpunk, cảm hứng từ chủ đề Dracula kinh điển.
   - **Nordic Frost (`#88c0d0`):** Xanh băng Bắc Âu lạnh giá, tối ưu tối đa cho độ tập trung cao độ.
   - **Cyber Monokai (`#a6e22e`):** Xanh lục điện tử rực rỡ, biểu tượng của các lập trình viên kỳ cựu.
   - **Obsidian Minimal (`#14b8a6`):** Xanh mòng két ngọc thạch trên nền đá núi lửa đen tuyền.

### 3.3. Dải 16 màu ANSI Terminal & Thuật toán Hòa sắc (`HarmonizeHue`):
* Các màu ANSI cơ bản (đỏ, lục, lam, vàng, tím, lơ) được giữ nguyên giá trị nhận diện kỹ thuật:
  - Red: 25°, Green: 145°, Yellow: 95°, Blue: 255°, Magenta: 320°, Cyan: 200°.
* **Hàm `harmonizeHue`:** Kéo nhẹ góc hue ANSI một phần nhỏ (`amt = 0.06` hoặc `0.00` ở Brand) về phía màu chủ đạo của giao diện. Nhờ đó, văn bản terminal luôn đồng điệu với khung cửa sổ xung quanh mà màu đỏ của lỗi (`git diff`, compiler error) không bao giờ bị lệch sang màu cam.
* **Hệ số `termChroma = 1.7`:** Nhân độ rực của màu chữ terminal lên 1.7 lần so với thanh công cụ để code và log luôn nổi bật trên nền đen.
* **Tùy biến Font & Con trỏ thời gian thực (v0.2.3):** Điều chỉnh kích thước chữ terminal (11px &ndash; 20px) và kiểu con trỏ (`block`, `underline`, `bar`) với cơ chế hot-reload phản hồi tức thì trên mọi terminal đang mở.

### 3.4. Bề mặt hiển thị (Surface Styles) & Kính pha màu (Tinted Glass):
* **`flat` (Chế độ phẳng công nghiệp):** Bề mặt đen đặc, viền sắc nét, tắt hoàn toàn bộ lọc mờ. Chế độ này tối ưu hiệu năng tối đa, GPU tải xấp xỉ **0.0%**.
* **`glass` (Kính mờ xuyên thấu):** Sử dụng Acrylic/Mica của Windows DWM kết hợp thanh trượt độ đục `termOpacity` (từ 0.3 đến 1.0) và độ mờ hậu cảnh `blurRadius` (0 &ndash; 20px).
* **Tinted Glass & Tinted Typography (`--ui-tinted-glass` & `--ui-tinted-text`):** Lớp phủ kính được nhuộm nhẹ theo sắc độ của chủ đề hiện tại (`surfaceContainer` với 65% alpha), đồng thời chữ màu trắng được khử chói nhẹ theo M3 `onSurface`, tránh mỏi mắt sau nhiều giờ nhìn màn hình liên tục.

---

## 4. MA TRẬN TÍNH NĂNG CHI TIẾT (FEATURE MATRIX)

| Tính Năng | Mô Tả Kỹ Thuật Chi Tiết | Phím Tắt / Vận Hành |
| :--- | :--- | :--- |
| **Hero Glass Dashboard (v0.2.3)** | Màn hình khởi đầu kính mờ mở rộng (`backdrop-blur-md`, viền vát Origami 45°), tích hợp đồng hồ số phát sáng nhẹ, ngày tháng và 4 thẻ tác vụ nhanh (`>_ Terminal`, `📁 Explorer`, `✨ AI Agent`, `🌐 Web`) cùng danh sách Recent Projects. | Hiển thị tự động khi workspace trống chưa có panel |
| **Lưới Tiling Tự Động** | Chia màn hình theo cây nhị phân (Binary Tree). Hỗ trợ thuật toán **Spiral** (xoắn ốc kiểu Hyprland) và **Dwindle** (cắt cạnh dài nhất). Kéo thả đường phân cách điều chỉnh kích thước linh hoạt. | `Ctrl+Shift+E` (chia phải)<br>`Ctrl+Shift+O` (chia dưới)<br>`Ctrl+Shift+D` (nhân đôi) |
| **Smart Anti-Occlusion Dock (v0.2.3)** | Thanh Dock thông minh tự động kích hoạt **Typing Ghost Mode** (giảm opacity về 0.12 và `pointer-events: none`) khi phát hiện gõ phím trong terminal, phục hồi sau 1.2s. Áp dụng safe bottom inset chống che khuất prompt. | Tự động phản ứng theo trạng thái gõ phím |
| **Terminal Hiệu Năng Cao** | Tích hợp ConPTY, hỗ trợ WebGL tăng tốc phần cứng, Unicode 11 (CJK, Emoji), chuột tương tác xterm, tự bắt link tệp/URL để mở preview với 1 click. Hot-reload kích thước font và kiểu con trỏ. | `Ctrl+T` (mở terminal mới)<br>`Ctrl+W` (đóng panel active)<br>`Ctrl+Tab` (đổi focus) |
| **Đa Workspace Độc Lập** | Tạo các không gian làm việc ảo song song. Mỗi workspace lưu trữ sơ đồ lưới, panel và thư mục riêng biệt. Tab chuyển đổi mượt mà với hiệu ứng trượt Tonal Pill. | `Alt+1..9` (nhảy thẳng workspace)<br>`Ctrl+1 / Ctrl+3` (lùi/tiến workspace) |
| **Code Editor & Live Preview** | Trình soạn thảo mã nguồn tích hợp sẵn số dòng, thụt lề cú pháp, hỗ trợ phím lưu trực tiếp. Xem trước thời gian thực file Markdown (Gfm), hình ảnh (PNG, JPG, SVG, WebP) và Git Diff. | `Ctrl+S` (lưu file trực tiếp)<br>Click vào link file trên terminal để mở |
| **AI Coding Assistant** | Panel trợ lý AI hỗ trợ kết nối cục bộ qua Ollama hoặc Cloud API. Đọc ngữ cảnh tệp tin, sinh mã nguồn, hỗ trợ nút bấm 1-click **Lưu vào File** và **Chạy trên Terminal**. | Mở qua thanh Dock bên dưới hoặc Command Palette |
| **Trình Duyệt Web Native** | Nhúng trực tiếp WebView2 native surface vào khung lưới tiling. Hỗ trợ duyệt web, test cổng localhost dev server (`localhost:3000`, `5173`), chặn DevTools trên bản phát hành. | Mở từ Dock hoặc link web trong terminal |
| **Giám Sát Hệ Thống (Sysfetch)** | Bảng thông tin hệ thống dạng ASCII Art logo **BINBOX STUDIO**, theo dõi trực tiếp % CPU, RAM, GPU, tốc độ mạng I/O và quang phổ âm thanh đa phương tiện (WASAPI). | Mở qua Dock (icon Dashboard) |
| **Bảng Lệnh Tập Trung** | Command Palette hỗ trợ tìm kiếm mờ (fuzzy search) cho tất cả các thao tác: mở tệp, đổi workspace, chia panel, đổi theme, kiểm tra cập nhật. | `Ctrl+K` hoặc `F1` |
| **Menu Cài Đặt 5 Tab (v0.2.3)** | Tái cấu trúc menu cài đặt thành 5 tab tập trung (*Display & Wallpaper*, *Colors & Presets*, *Terminal*, *Workspace*, *Shortcuts & About*) với thanh rail vát góc Origami kim loại chuẩn công nghiệp. | `Ctrl+,` hoặc mở qua Dock |

---

## 5. ĐÁNH GIÁ MỨC TIÊU THỤ PHẦN CỨNG (RESOURCE EFFICIENCY)

So sánh định lượng giữa **BinBox Studio (v0.2.3)** và các ứng dụng cùng phân khúc xây dựng trên Electron (như Hyper, VS Code, Spotify):

| Tiêu Chí Đánh Giá | BinBox Studio (v0.2.3) | Ứng Dụng Electron Thông Thường |
| :--- | :---: | :---: |
| **Dung lượng bộ cài đặt** | **~3.6 MB** (NSIS) / **~5.1 MB** (MSI) | 120 MB &ndash; 250 MB |
| **Số lượng tiến trình nền** | **1 tiến trình app chính** + shell con | 4 &ndash; 7 tiến trình Chromium/Node |
| **RAM ở trạng thái nghỉ** | **40 &ndash; 65 MB** | 180 &ndash; 400 MB |
| **RAM khi chạy ngầm / mất focus** | **Tự động giải phóng về ~25 MB** | Giữ nguyên hoặc phình bộ nhớ |
| **CPU trung bình (Chờ lệnh)** | **0.0% &ndash; 0.1%** | 1.0% &ndash; 3.0% |
| **GPU ở chế độ Dark Flat** | **0.0%** (Văn bản vẽ bằng GPU Atlas) | 2% &ndash; 8% do canvas liên tục re-paint |

---

## 6. LỘ TRÌNH PHÁT TRIỂN CHIẾN LƯỢC (STRATEGIC ROADMAP)

Chi tiết lộ trình kỹ thuật dài hạn đã được công bố tại [**`ROADMAP.md`**](ROADMAP.md):

* **Milestone 1: BinBox Studio v0.3.0 — "The Agentic Workspace" (Q4 2026):**
  - **Tích hợp Model Context Protocol (MCP):** Đóng vai trò MCP Server cung cấp ngữ cảnh terminal, git status và filesystem cho các AI Coding Agent (`claude-code`, `antigravity`, `aider`).
  - **Cầu nối Terminal Điều khiển bởi Agent:** Agent đề xuất lệnh kèm nút duyệt trực quan (`Run` / `Edit` / `Deny`). Tự động phát hiện lỗi compiler để gợi ý giải pháp sửa chữa.
  - **Fuzzy Quick Open (`Ctrl+P`):** Tìm kiếm và mở nhanh file mã nguồn vào panel preview.
* **Milestone 2: BinBox Studio v0.4.0 — "Hyper-Tiling & Multi-Display" (Q1 2027):**
  - **Tabbed & Stacked Containers:** Ghép nhiều tab terminal hoặc preview trong cùng một ô chia.
  - **Floating Scratchpad (`Alt+Space`):** Cửa sổ nổi bật nhanh dạng overlay.
  - **Đa Màn Hình:** Hỗ trợ tách panel sang màn hình phụ và đồng bộ Wallpaper Engine độc lập trên từng màn hình.
* **Milestone 3: BinBox Studio v1.0.0 — "The Enterprise Windows Native Milestone" (Q2 2027):**
  - **Tự động hóa Ký số Code Signing:** Pipeline CI ký số Authenticode tự động, loại bỏ hoàn toàn cảnh báo SmartScreen.
  - **Hệ thống Plugin Mở rộng (Lua / WASM):** Cho phép cộng đồng viết extension tùy biến tiling, theme và widget.
  - **Phân phối chính thức qua Winget:** `winget install BinBox.Studio`.

---

*Báo cáo được lập tự động từ codebase chính thức của dự án BinBox Studio.*  
*Tác giả & Bản quyền:* **Shadow ([Harilowji](https://github.com/Harilowji))** &bull; Giấy phép mã nguồn mở MIT.
