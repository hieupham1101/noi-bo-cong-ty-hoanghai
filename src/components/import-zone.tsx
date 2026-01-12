'use client'

import { useState } from 'react'
import { parseKiotVietExcel } from '@/lib/excel-parser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react'

// ... imports

export function ImportZone() {
    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState<File | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!file) {
            toast.error('Vui lòng chọn file trước')
            return
        }

        setIsUploading(true)
        try {
            const products = await parseKiotVietExcel(file)

            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(products),
            })

            if (!response.ok) {
                throw new Error('Failed to import')
            }

            toast.success('Nhập dữ liệu thành công')
            setFile(null)
        } catch (error) {
            console.error(error)
            toast.error('Lỗi khi nhập dữ liệu. Hãy kiểm tra lại file.')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto mt-8 border-dashed border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Nhập dữ liệu từ KiotViet
                </CardTitle>
                <CardDescription>
                    Tải lên file Excel (.xlsx) từ KiotViet để cập nhật dữ liệu sản phẩm.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-12 bg-slate-50 relative">
                    <input
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                    />
                    <div className="text-center">
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileSpreadsheet className="w-12 h-12 text-green-500" />
                                <p className="font-medium text-slate-900">{file.name}</p>
                                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-slate-600" />
                                </div>
                                <p className="font-medium">Kéo thả hoặc nhấn để chọn file</p>
                                <p className="text-sm text-slate-500">Định dạng hỗ trợ: .xlsx</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    {file && !isUploading && (
                        <Button variant="outline" onClick={() => setFile(null)}>
                            Hủy
                        </Button>
                    )}
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full sm:w-auto"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            'Bắt đầu Import'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
