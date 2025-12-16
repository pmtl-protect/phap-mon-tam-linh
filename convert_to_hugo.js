const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const TurndownService = require('turndown');

// CẤU HÌNH
const INPUT_DIR = './khoi_phuc_data';
const OUTPUT_DIR = './content/posts'; 

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

// Hàm làm sạch tên file để làm tiêu đề
function cleanFilenameAsTitle(filename) {
    if (!filename) return "Khong Tieu De";
    // 1. Xóa phần đuôi .html
    let title = filename.replace(/\.html$/i, '');
    // 2. Xóa số thứ tự và dấu gạch dưới (VD: 0001_)
    title = title.replace(/^\d+_/g, '').trim();
    // 3. Thay dấu gạch dưới (_) bằng khoảng trắng
    title = title.replace(/_/g, ' ').trim();
    // 4. Xóa tên file mặc định (nếu có)
    title = title.replace(/^Khong Tieu De/i, '').trim();
    
    return title.substring(0, 150) || "Khong Tieu De - Can Sua";
}


// Hàm trích xuất tiêu đề AN TOÀN từ nội dung bài viết
function extractCleanTitle(contentHtml) {
    const $ = cheerio.load(contentHtml);
    const fullText = $('div[style="white-space: pre-wrap;"]').text();
    
    const startIndex = fullText.indexOf('Tiêu đề bài viết:');
    if (startIndex === -1) return "LỖI CHUỖI - KHÔNG TÌM THẤY"; 

    let titleSegment = fullText.substring(startIndex + 'Tiêu đề bài viết:'.length).trim();
    let parts = titleSegment.split('Nội dung chi tiết:');
    let title = parts[0].trim();
    
    if (title.length > 200) {
        title = title.split('\n')[0].trim();
    }
    
    title = title.replace(/^Trích\s*:\s*/i, '').trim();
    title = title.replace(/[:：\.\,;]$/, '').trim(); 

    return title.substring(0, 150) || "LỖI TRỐNG - XIN SỬA";
}


async function convert() {
    if (!fs.existsSync(INPUT_DIR)) {
        console.error("❌ Không tìm thấy thư mục khoi_phuc_data!");
        return;
    }
    
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const files = fs.readdirSync(INPUT_DIR).filter(file => file.endsWith('.html'));
    console.log(`🚀 Bắt đầu TÁI TẠO TIÊU ĐỀ cho ${files.length} bài viết (Bản Final)...`);

    let errorCount = 0;
    let count = 0;
    
    for (const file of files) {
        const filePath = path.join(INPUT_DIR, file);
        const contentHtml = fs.readFileSync(filePath, 'utf8');
        
        let realTitle = extractCleanTitle(contentHtml); 
        
        // --- LOGIC CỨU DỮ LIỆU LỖI ---
        if (realTitle.includes("LỖI CHUỖI")) {
            realTitle = cleanFilenameAsTitle(file); // Dùng tên file làm tiêu đề dự phòng
            console.log(`✅ Cứu tiêu đề: ${file} -> "${realTitle}"`);
            errorCount++; // Vẫn đếm lỗi để sau này bạn sửa thủ công nếu muốn
        }
        
        // --- BỎ QUA CÁC BÀI VIẾT PHỤ ĐÃ XÁC ĐỊNH LÀ RÁC ---
        if (realTitle.includes("Quý Phật tử thân mến") || realTitle.includes("♥️")) continue;
        if (realTitle.includes("LỖI TRỐNG - XIN SỬA")) continue;


        const $ = cheerio.load(contentHtml);
        const originalUrl = $('a').first().attr('href') || "";
        
        // Xử lý đường dẫn tương đối
        let relativePath = "";
        try {
            if (originalUrl.startsWith('http')) {
                const urlObj = new URL(originalUrl);
                relativePath = urlObj.pathname; 
            } else {
                relativePath = originalUrl;
            }
        } catch (e) {
            relativePath = "";
        }

        let bodyHtml = $('div[style="white-space: pre-wrap;"]').html() || "";
        const regexCleanup = /Tiêu đề bài viết:[\s\S]*?Nội dung chi tiết:[\s\S]*?/i;
        bodyHtml = bodyHtml.replace(regexCleanup, '').trim();

        let markdownBody = turndownService.turndown(bodyHtml);
        const date = new Date().toISOString(); 

        let urlField = "";
        if (relativePath && relativePath.length > 1) {
            urlField = `url: "${relativePath}"`;
        }

        const frontMatter = `---
title: "${realTitle.replace(/"/g, '\\"')}"
date: ${date}
draft: false
${urlField}
---
`; 

        const outputFilename = file.replace('.html', '.md');
        const finalContent = `${frontMatter}\n${markdownBody}`;

        fs.writeFileSync(path.join(OUTPUT_DIR, outputFilename), finalContent);
        
        count++;
    }

    console.log(`\n🎉 HOÀN TẤT! Đã tạo ${count} file Markdown.`);
    if (errorCount > 0) {
        console.log(`\n⚠️ CẢNH BÁO: Đã CỨU ${errorCount} tiêu đề từ tên file. Bạn có thể kiểm tra lại 167 bài đó.`);
    }
    console.log(`\n👉 Vui lòng COMMIT và PUSH code lên GitHub để cập nhật trang Admin.`);
}

convert();