import * as XLSX from 'xlsx'

export interface KiotVietProduct {
    sku: string
    name: string
    costPrice: number
    stock: number
    weight: number
}

export const parseKiotVietExcel = async (file: File): Promise<KiotVietProduct[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                const products: KiotVietProduct[] = jsonData.map((row: any) => ({
                    sku: String(row['Mã hàng'] || '').trim(),
                    name: String(row['Tên hàng'] || '').trim(),
                    costPrice: Number(row['Giá vốn'] || 0),
                    stock: Number(row['Tồn kho'] || 0),
                    weight: Number(row['Trọng lượng'] || 0),
                })).filter(p => p.sku !== '')

                resolve(products)
            } catch (error) {
                reject(error)
            }
        }
        reader.onerror = (error) => reject(error)
        reader.readAsBinaryString(file)
    })
}
