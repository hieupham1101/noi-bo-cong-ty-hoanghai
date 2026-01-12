import { ImportZone } from "@/components/import-zone"

export default function ImportPage() {
    return (
        <div className="container py-10">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Nhập sản phẩm</h1>
                <p className="text-muted-foreground mt-2">
                    Đồng bộ kho hàng và giá vốn từ KiotViet.
                </p>
            </div>
            <ImportZone />

            <div className="mt-12 max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold mb-4">Hướng dẫn</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>Xuất danh sách sản phẩm từ KiotViet dưới dạng file Excel.</li>
                    <li>Đảm bảo file có các cột: <strong>Mã hàng</strong>, <strong>Tên hàng</strong>, <strong>Giá vốn</strong>, <strong>Tồn kho</strong>, và <strong>Trọng lượng</strong>.</li>
                    <li>Các dòng có Mã hàng (SKU) trống sẽ bị bỏ qua.</li>
                    <li>Sản phẩm hiện có sẽ được cập nhật dựa trên Mã hàng; sản phẩm mới sẽ được tạo thêm.</li>
                    <li>Sau khi nhập, bạn cần cập nhật thủ công kích thước (Dài, Rộng, Cao) để tính phí vận chuyển chính xác.</li>
                </ul>
            </div>
        </div>
    )
}
