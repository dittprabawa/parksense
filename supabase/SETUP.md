# Menyiapkan ParkSense di Supabase

## Status proyek ParkSense

Pada 23 November 2026 kedua migrasi sudah diterapkan ke **dittprabawa's Project** di Tokyo. Riwayat migrasi dapat diperiksa di Dashboard. Untuk proyek ini, lanjutkan dengan pengaturan URL login dan deployment. Langkah SQL di bawah tersedia untuk membuat lingkungan baru.

Konfigurasi lokal aplikasi sudah berisi URL proyek dan publishable key. Pengaturan Auth hosted menunjukkan pendaftaran email aktif dan konfirmasi email wajib. Uji SQL yang diakhiri dengan rollback lulus di proyek hosted. API hosted menerima publishable key dan menolak pembacaan riwayat oleh tamu. Uji Save Parking, foto privat, History, Find My Vehicle, impor, edit, dan hapus dijalankan menggunakan sesi browser terpisah pada emulator lokal. Uji dengan akun email terkonfirmasi di dua perangkat fisik masih perlu dilakukan.

## 1. Siapkan proyek dan login

1. Buka proyek Supabase tujuan atau buat proyek khusus ParkSense. Catat nama proyek dan region sebelum menjalankan SQL. Simpan kata sandi database di pengelola kata sandi.
2. Di **Authentication → Sign In / Providers**, aktifkan Email dan password serta konfirmasi email. Jika pengguna mendaftar sendiri, aktifkan pendaftaran. Untuk uji dengan konfirmasi email, pastikan pengiriman email proyek tersedia untuk alamat penguji. [Panduan Email Auth](https://supabase.com/docs/guides/auth/passwords)
3. Di **Authentication → URL Configuration**, set **Site URL** ke alamat aplikasi. Tambahkan URL pengalihan yang dipakai aplikasi, misalnya `http://localhost:3000/login` untuk pengembangan dan URL HTTPS aplikasi dengan akhiran `/login` untuk perangkat lain. [Panduan redirect](https://supabase.com/docs/guides/auth/redirect-urls)

## 2. Terapkan kedua migrasi

Di **SQL Editor → New query**, jalankan isi berkas berikut satu kali, berurutan. Tunggu hasil sukses sebelum menjalankan berkas berikutnya. Setiap berkas memakai satu transaksi. Bila menemukan konflik nama tabel, fungsi, kebijakan, atau bucket, periksa objek yang sudah ada sebelum mencoba lagi.

1. `migrations/20261123072403_parksense_parking.sql` membuat empat tabel, relasi, profil untuk pengguna lama dan baru, aturan akses per akun, tampilan baca, dan fungsi penyimpanan. Kendaraan dan zona berasal dari formulir pengguna. Satu akun memiliki paling banyak satu sesi aktif. Penyimpanan sesi baru mengakhiri sesi aktif sebelumnya dalam transaksi yang sama.
2. `migrations/20261123072448_parksense_private_photos.sql` membuat bucket privat `parking-photos` dan aturan akses berkas. Di **Storage**, periksa status **Private**, batas 5 MiB, dan tipe JPEG, PNG, WebP. Kebijakan tambahan yang sudah ada pada `storage.objects` harus ikut diperiksa karena kebijakan permisif dapat membuka akses lebih luas. [Panduan akses Storage](https://supabase.com/docs/guides/storage/security/access-control)

Di **Table Editor**, periksa bahwa `profiles`, `vehicles`, `parking_zones`, dan `parking_sessions` mengaktifkan RLS. Di pengaturan Data API, pastikan Data API aktif dengan skema `public` tersedia. Pada database pengujian, SQL pada `tests/parking_access.sql` memeriksa isolasi akun, penulisan ulang, dan pembatalan transaksi. Skrip uji memakai data sementara dan diakhiri dengan `rollback`.

## 3. Hubungkan aplikasi

Dari **Connect** atau **Settings → API Keys**, ambil Project URL dan **publishable key**. Isi dua variabel berikut di `.env.local` pada folder yang berisi `package.json`. Isi nilai hanya di IDE atau pengelola environment hosting. Kedua variabel ini masuk ke bundle browser. Akses parkir dibatasi oleh sesi Supabase Auth dan kebijakan database. [Panduan API keys](https://supabase.com/docs/guides/getting-started/api-keys)

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Biarkan konfigurasi Google Maps yang sudah ada di tempatnya. Kunci Routes API tetap memakai variabel server `GOOGLE_ROUTES_API_KEY`. Repo mengecualikan berkas kredensial dari Git.

Jalankan `npm install`, lalu `npm run dev` untuk pengembangan. Pemeriksaan rilis menggunakan `npm run lint` dan `npm run build`. Di Vercel, isi dua variabel Supabase untuk environment tujuan, lalu buat deployment baru agar Next.js menyertakan konfigurasi yang benar.

## 4. Pindahkan data lokal secara bertahap

1. Terapkan SQL sebelum merilis aplikasi. Saat konfigurasi Supabase kosong, halaman login menampilkan pesan setup.
2. Setelah login, Save Parking menulis ke database. History, Home, Vehicle Details, dan Find My Vehicle membaca dari akun tersebut. Data disegarkan ketika halaman dibuka, kembali aktif, atau secara berkala ketika terlihat. Konfirmasi temuan kendaraan tetap manual.
3. Buka aplikasi di browser dan alamat web yang dulu dipakai. Masuk ke akun tujuan. Di **History → Review old records on this device**, pilih catatan milik sendiri dan periksa email pada tombol impor. Data lokal versi lama tidak memiliki pemilik akun. Setiap konfirmasi hanya mengimpor satu catatan.
4. Lima ID contoh bawaan dilewati. Foto contoh bawaan juga dilewati. Koordinat kosong tetap kosong. Impor mempertahankan waktu sesi asli. Jika akun sudah memiliki parkir aktif, catatan lokal yang juga aktif masuk ke riwayat sebagai parkir lama.
5. Setelah impor dikonfirmasi database, browser menandai catatan tersebut selesai. Pengulangan juga diperiksa berdasarkan akun dan ID lama di database. Catatan asli tetap tersedia di penyimpanan browser. Pindah browser atau domain memerlukan akses ke browser atau domain asal untuk melakukan impor.

## 5. Uji penerimaan pada dua perangkat fisik

Gunakan URL HTTPS deployment yang sama dan akun uji yang sama di ponsel A dan perangkat B. Gunakan data uji yang penguji pilih sendiri.

| Tindakan | Hasil yang perlu diperiksa |
| --- | --- |
| Di A, simpan sesi dengan foto, plat, lantai, dan zona. Jika GPS diizinkan, rekam koordinat. | Pesan sukses muncul setelah sesi bisa dibaca kembali. |
| Buka History dan Find My Vehicle di B. | Plat, lokasi, foto, dan sesi aktif cocok. Untuk parkir tanpa GPS, petunjuk gedung/lantai tetap tersedia. |
| Ubah catatan di B. Buka kembali History di A. Akhiri sesi di A. | Perubahan terbaca di A dan sesi muncul sebagai Past di B setelah disegarkan. |
| Buka akun berbeda di browser terpisah. Coba riwayat serta tautan detail sesi dari akun pertama. | Riwayat akun kedua terpisah, detail sesi pertama tidak muncul, dan foto privat memerlukan akses pemilik. |
| Impor satu catatan asli dari browser lama, lalu buka ulang daftar impor. | Satu salinan muncul pada kedua perangkat. Catatan contoh dilewati dan salinan lokal tetap ada. |
| Matikan koneksi saat Save, lalu pulihkan dan coba kembali pada formulir yang sama. | Formulir melaporkan kegagalan atau meminta pemeriksaan ulang. Setelah tersambung, cek hanya ada satu sesi untuk permintaan tersebut. |

Ambang kedekatan navigasi adalah 5 meter. Uji navigasi fisik perlu memperhatikan akurasi yang dilaporkan perangkat. Pada backend yang sudah berisi data, bila upload foto terputus sebelum sesi tersimpan, foto privat yang tak terpakai bisa tertinggal. Periksa referensi `photo_path` sebelum membersihkan berkas lama melalui Storage.
