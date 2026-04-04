import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";
import { swalError } from "./useSwal";

export function useExportExcel() {
  const exportToExcel = async (idToko: string, filters: { mode: string; date?: string; month?: string; year?: string }) => {
    try {
      // 1. Build Query based on filters
      let query = supabase
        .from("pesanan")
        .select(`
          id,
          nomor_pesanan,
          created_at,
          nama_pelanggan,
          tipe_pesanan,
          total_harga,
          metode_pembayaran,
          status,
          id_kasir,
          user_profiles:id_kasir(nama),
          meja:id_meja(nomor_meja),
          detail_pesanan(
            jumlah,
            harga_satuan,
            subtotal,
            menu:id_menu(nama)
          )
        `)
        .eq("id_toko", idToko)
        .order("created_at", { ascending: false });

      if (filters.mode === "day" && filters.date) {
        query = query.gte("created_at", `${filters.date}T00:00:00Z`).lte("created_at", `${filters.date}T23:59:59Z`);
      } else if (filters.mode === "month" && filters.month) {
        const [year, month] = filters.month.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      } else if (filters.mode === "year" && filters.year) {
        const startDate = `${filters.year}-01-01T00:00:00Z`;
        const endDate = `${filters.year}-12-31T23:59:59Z`;
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Tidak ada data untuk diekspor pada periode ini.");
      }

      // 2. Flatten Data for Excel
      const rows: any[] = [];
      data.forEach((order: any) => {
        const orderDate = new Date(order.created_at);
        const dateStr = orderDate.toLocaleDateString("id-ID");
        const timeStr = orderDate.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
        
        // If no items (should not happen), add one row for order summary
        if (!order.detail_pesanan || order.detail_pesanan.length === 0) {
          rows.push({
            "No. Nota": order.nomor_pesanan,
            "Tanggal": dateStr,
            "Jam": timeStr,
            "Pelanggan": order.nama_pelanggan,
            "Tipe": order.tipe_pesanan,
            "Meja": order.meja?.nomor_meja || "-",
            "Menu": "-",
            "Qty": 0,
            "Harga": 0,
            "Subtotal Item": 0,
            "Total Nota": order.total_harga,
            "Pembayaran": order.metode_pembayaran || "-",
            "Kasir": order.user_profiles?.nama || "-",
            "Status": order.status
          });
        } else {
          order.detail_pesanan.forEach((item: any) => {
            rows.push({
              "No. Nota": order.nomor_pesanan,
              "Tanggal": dateStr,
              "Jam": timeStr,
              "Pelanggan": order.nama_pelanggan,
              "Tipe": order.tipe_pesanan,
              "Meja": order.meja?.nomor_meja || "-",
              "Menu": item.menu?.nama || "Menu Terhapus",
              "Qty": item.jumlah,
              "Harga": item.harga_satuan,
              "Subtotal Item": item.subtotal,
              "Total Nota": order.total_harga,
              "Pembayaran": order.metode_pembayaran || "-",
              "Kasir": order.user_profiles?.nama || "-",
              "Status": order.status
            });
          });
        }
      });

      // 3. Create Workbook
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Transaksi");

      // Set column widths
      const wscols = [
        { wch: 20 }, // No Nota
        { wch: 12 }, // Tanggal
        { wch: 10 }, // Jam
        { wch: 15 }, // Pelanggan
        { wch: 10 }, // Tipe
        { wch: 8 },  // Meja
        { wch: 25 }, // Menu
        { wch: 5 },  // Qty
        { wch: 12 }, // Harga
        { wch: 12 }, // Subtotal Item
        { wch: 15 }, // Total Nota
        { wch: 12 }, // Pembayaran
        { wch: 15 }, // Kasir
        { wch: 10 }  // Status
      ];
      worksheet["!cols"] = wscols;

      // 4. Download
      const fileName = `Laporan_Transaksi_${filters.mode}_${new Date().getTime()}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      return true;
    } catch (err: any) {
      swalError("Gagal Ekspor Excel", err.message);
      return false;
    }
  };

  return { exportToExcel };
}
