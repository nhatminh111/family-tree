# 🌳 Cây Gia Phả - Family Tree App

Ứng dụng Next.js để quản lý và hiển thị cây gia phả gia đình.

## Tính năng

- ✅ Thêm người mới với thông tin: tên, giới tính, ảnh đại diện
- ✅ Kết nối mối quan hệ giữa các thành viên (cha/mẹ, con, vợ/chồng, anh/chị/em, v.v.)
- ✅ Hiển thị rõ ràng các mối quan hệ trên UI
- ✅ Upload và hiển thị ảnh đại diện
- ✅ UI hiện đại và đẹp mắt với Tailwind CSS
- ✅ Lưu trữ dữ liệu trong localStorage

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## Deploy lên Vercel

1. Push code lên GitHub
2. Import project vào Vercel
3. Vercel sẽ tự động detect Next.js và deploy

Hoặc sử dụng Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Cấu trúc dự án

```
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Trang chính
│   └── globals.css     # Global styles
├── components/
│   ├── PersonCard.tsx  # Card hiển thị thông tin người
│   ├── PersonForm.tsx  # Form thêm/sửa người
│   └── FamilyTree.tsx  # Component hiển thị cây gia phả
├── types/
│   └── family.ts       # TypeScript types
└── package.json
```

## Công nghệ sử dụng

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- UUID (để tạo ID duy nhất)


